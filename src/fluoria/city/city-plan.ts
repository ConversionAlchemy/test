// The Terrain and Map views as one pixel plan: shapes drawn in key colours, each pixel snapped to its key,
// then laid in that material's drawn marks. Ground and buildings share one pixel grid.
import { connectVertices } from "@/utils/pathUtils";
import { drawRims } from "./city-build";
import type { Building, City, P2 } from "./city-gen";

type C3 = readonly [number, number, number];
type Tex = (x: number, y: number, d: number) => C3;
export type PlanStyle = "terrain" | "map";

const th = (a: number, b: number, s: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7 + s * 17.3) * 43758.5453;
  return v - Math.floor(v);
};
const hx = (h: string): C3 => [1, 3, 5].map(i => Number.parseInt(h.slice(i, i + 2), 16)) as unknown as C3;
const dk = (c: C3, d: number): C3 => [c[0] - d, c[1] - d, c[2] - d];
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const flat =
  (h: string): Tex =>
  () =>
    hx(h);

// roofs and landmarks: one way every fourth pixel, the other every eighth
const hatchRoof = (base: string, line: string, dot: string): Tex => {
  const B = hx(base);
  const L = hx(line);
  const O = hx(dot);
  const M: C3 = [(B[0] + L[0]) / 2, (B[1] + L[1]) / 2, (B[2] + L[2]) / 2];
  return (x, y) =>
    (x + y) % 4 === 0 ? L : (x - y + 4000) % 8 === 0 ? M : th(x, y, 31) > 0.95 ? L : th(x, y, 32) > 0.94 ? O : B;
};
const softHatch = (base: string, s: number, a: number, b: number): Tex => {
  const B = hx(base);
  const D1 = dk(B, a);
  const D2 = dk(B, b);
  return (x, y) => {
    const p = (x + y) % 5 === 0 && th(Math.floor((x - y + 9999) / 3), 0, s + 2) > 0.3;
    const q = (x - y + 9999) % 5 === 0 && th(Math.floor((x + y) / 3), 1, s + 3) > 0.3;
    return p && q ? D2 : p || q ? D1 : B;
  };
};
// single dots on a diagonal lattice, thick at the edge of other ground and thinning inward
const dots = (base: string, d: number): Tex => {
  const B = hx(base);
  const M = dk(B, d);
  return (x, y, dist) => {
    if (!((x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2))) return B;
    const r = B4[((y >> 1) & 3) * 4 + ((x >> 1) & 3)] / 16;
    return r < 0.1 + 0.75 * Math.exp(-dist / 12) ? M : B;
  };
};
// the sea: pale dots on the same lattice, thicker and thinner in slow drifts
const smooth = (x: number, y: number, s: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = th(xi, yi, s);
  const b = th(xi + 1, yi, s);
  const c = th(xi, yi + 1, s);
  const d = th(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const seaDots = (base: string): Tex => {
  const B = hx(base);
  const M: C3 = [Math.min(255, B[0] + 22), Math.min(255, B[1] + 18), Math.min(255, B[2] + 14)];
  return (x, y) => {
    if (!((x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2))) return B;
    const r = B4[((y >> 1) & 3) * 4 + ((x >> 1) & 3)] / 16;
    return r < 0.12 + smooth(x / 40, y / 40, 7) * 0.4 ? M : B;
  };
};
// one sketched mark per grid square, nudged and picked at random
const scatter = (base: string, cw: number, ch: number, shapes: string[][], d: number, jy = 0): Tex => {
  const B = hx(base);
  const M = dk(B, d);
  return (x, y) => {
    const i0 = Math.floor(x / cw);
    const j0 = Math.floor(y / ch);
    for (let j = j0 - 1; j <= j0; j++)
      for (let i = i0 - 1; i <= i0; i++) {
        const sh = shapes[Math.floor(th(i, j, 91) * shapes.length)];
        const ax = i * cw + Math.floor(th(i, j, 92) * (cw - 2));
        const ay = j * ch + Math.floor(th(i, j, 93) * (jy || ch - 2));
        if (sh[y - ay]?.[x - ax] === "X") return M;
      }
    return B;
  };
};
const CAPS = [
  [".XX.", "X..X"],
  [".XXX.", "X...X"],
  [".X.", "X.X"],
  ["..XX..", ".X..X.", "X....X"]
];
const TRI = [["..X..", ".X.X.", "X...X"]];

const KEYS = [
  "paper",
  "country",
  "park",
  "wheat",
  "tilled",
  "water",
  "wline",
  "wb0",
  "wb1",
  "wb2",
  "wb3",
  "wb4",
  "wb5",
  "shore",
  "hline",
  "yard",
  "road",
  "ink",
  "wall",
  "tower",
  "pier",
  "tsh",
  "tdark",
  "tlit"
] as const;
type Key = (typeof KEYS)[number];
// key colours: far apart so blends at shape edges snap cleanly
const KEYHEX: Record<Key, string> = {
  paper: "#404040",
  country: "#f00000",
  park: "#f000f0",
  wheat: "#00f000",
  tilled: "#0000f0",
  water: "#f0f000",
  wline: "#00f0f0",
  wb0: "#e0e0e0",
  wb1: "#202020",
  wb2: "#a0a0a0",
  wb3: "#606060",
  wb4: "#c0c0c0",
  wb5: "#808080",
  shore: "#602020",
  hline: "#206060",
  yard: "#800000",
  road: "#008000",
  ink: "#000080",
  wall: "#0040c0",
  tower: "#c00040",
  pier: "#c0c040",
  tsh: "#a0a000",
  tdark: "#40c0c0",
  tlit: "#c040c0"
};
const KEYCOL: C3[] = KEYS.map(k => hx(KEYHEX[k]));
const css = (c: C3) => `rgb(${c[0]},${c[1]},${c[2]})`;
const KC = (k: Key) => css(KEYCOL[KEYS.indexOf(k)]);

const texFor = (style: PlanStyle): Record<Key, Tex> => {
  const map = style === "map";
  return {
    paper: flat("#f3ecd9"),
    country: map ? dots("#f3ecd9", 16) : dots("#b6b886", 30),
    park: map ? dots("#e6ebcf", 16) : dots("#b1bb84", 30),
    wheat: map ? scatter("#f3e5bc", 7, 6, TRI, 18, 5) : scatter("#d8bc5c", 7, 6, TRI, 30, 5),
    tilled: map ? scatter("#ebdcc6", 9, 8, CAPS, 14) : scatter("#a98052", 9, 8, CAPS, 26),
    water: seaDots("#a3c3c9"),
    wline: flat("#98babe"),
    wb0: seaDots("#dcebea"),
    wb1: seaDots("#d0e3e3"),
    wb2: seaDots("#c4dbdc"),
    wb3: seaDots("#b8d2d5"),
    wb4: seaDots("#aecbcf"),
    wb5: seaDots("#a8c7cc"),
    shore: flat("#5d6236"),
    hline: flat("#87a39b"),
    yard: softHatch("#e7ddc3", 71, 7, 11),
    road: flat("#f3ecd9"),
    ink: flat("#3b2a1e"),
    wall: (x, y) => hx((x + y) % 3 === 0 ? "#7d7266" : "#a99c88"),
    tower: flat("#7d7266"),
    pier: hatchRoof("#b48f64", "#91704b", "#a5825a"),
    tsh: (x, y) => ((x + y) % 2 === 0 || (x - y + 9999) % 3 === 0 ? hx("#6f7350") : hx("#9a9d70")),
    tdark: (x, y) => hx(th(x, y, 5) > 0.85 ? "#55632f" : "#3f4d24"),
    tlit: (x, y) => hx(th(x, y, 6) > 0.8 ? "#9aa95c" : th(x, y, 7) > 0.5 ? "#82924a" : "#6a7a3a")
  };
};

const ROOFS: Record<string, Tex> = {
  r1: hatchRoof("#e6cdcc", "#c9a9a9", "#f0dcda"),
  r2: hatchRoof("#e8bcc6", "#c995a2", "#f2d2d8"),
  roof: hatchRoof("#e2aab8", "#bf7f91", "#efc7d1"),
  r3: hatchRoof("#d996aa", "#b0677f", "#e8b5c4"),
  r4: hatchRoof("#cc7f98", "#9c4e69", "#de9fb3"),
  shop: hatchRoof("#ddd4c2", "#b3a88f", "#e9e2d4"),
  ware: hatchRoof("#cdbfb0", "#a49482", "#ddd2c6"),
  lm: hatchRoof("#6b4128", "#3a2214", "#52311f"),
  lmg: hatchRoof("#5c6066", "#34373b", "#484b50")
};
const TIER: Record<string, string> = {
  Hut: "r1",
  Shack: "r1",
  Shed: "ware",
  Cottage: "r2",
  House: "roof",
  Townhouse: "r3",
  Mansion: "r4",
  "Counting house": "shop",
  Office: "shop",
  Workshop: "shop",
  Inn: "shop",
  Tavern: "shop",
  Chandlery: "shop",
  "Guild hall": "shop",
  Chapel: "r4",
  Guardhouse: "r3"
};
// church and garrison in slate grey; trade, guild and civic in brown
const GREY = /chapel|church|temple|shrine|abbey|priory|fort|castle|citadel|keep|guard|watch|barracks|garrison|tower/i;
const roofOf = (b: Building): string =>
  b.landmark
    ? GREY.test(b.type)
      ? "lmg"
      : "lm"
    : b.type === "Warehouse" || b.type === "Shed" || b.type === "Granary"
      ? "ware"
      : b.trade || b.type === "Shop"
        ? "shop"
        : (TIER[b.type] ?? "roof");

const RW: Record<string, number> = { main: 2.3, street: 1.6, lane: 1.1, track: 1.1, path: 1 };

/** A landmark's footprint: its cells' outline, flush to the streets round it; a fort's keep stays square inside */
function footprint(city: City, b: Building): P2[] {
  const { cells, vertices } = city.pack;
  const set = new Set(b.cells ?? [b.cell]);
  const i = [...set].find(c => cells.c[c].some((j: number) => !set.has(j)));
  if (i === undefined) return [];
  const start = cells.v[i].find((v: number) => vertices.c[v].some((c: number) => !set.has(c)));
  if (start === undefined) return [];
  return connectVertices({ vertices, startingVertex: start, ofSameType: c => set.has(c), closeRing: false }).map(
    v => vertices.p[v] as P2
  );
}

const pathOf = (g: CanvasRenderingContext2D, P: P2[], close = true) => {
  g.beginPath();
  for (const [k, p] of P.entries()) k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
  if (close) g.closePath();
};
const addPoly = (g: CanvasRenderingContext2D, P: P2[]) => {
  for (const [k, p] of P.entries()) k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
  g.closePath();
};
const bbox = (P: P2[]) => {
  let a = 1e9;
  let b = 1e9;
  let c = -1e9;
  let d = -1e9;
  for (const [x, y] of P) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  return [a, b, c, d];
};
// a whole crown fits: inside the cell and clear of its edges
const fits = (P: P2[], x: number, y: number, r: number) => {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [a, b] = P[i];
    const [c, d] = P[j];
    if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a) inside = !inside;
    const ex = c - a;
    const ey = d - b;
    const t = Math.max(0, Math.min(1, ((x - a) * ex + (y - b) * ey) / (ex * ex + ey * ey || 1)));
    if (Math.hypot(x - a - t * ex, y - b - t * ey) < r) return false;
  }
  return inside;
};
// the shadow side of a roof: a band inside each edge that faces down or right
const shadeIn = (g: CanvasRenderingContext2D, P: P2[], w: number) => {
  g.save();
  pathOf(g, P);
  g.clip();
  g.strokeStyle = "#5b2e1e";
  g.lineWidth = w * 2;
  g.lineCap = "square";
  g.beginPath();
  const area = P.reduce((a, p, i) => {
    const q = P[(i + 1) % P.length];
    return a + p[0] * q[1] - q[0] * p[1];
  }, 0);
  const sg = area > 0 ? 1 : -1;
  for (let i = 0; i < P.length; i++) {
    const a = P[i];
    const b = P[(i + 1) % P.length];
    const nx = (b[1] - a[1]) * sg;
    const ny = -(b[0] - a[0]) * sg;
    if (nx + ny > 0.15 * Math.hypot(nx, ny)) {
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
    }
  }
  g.stroke();
  g.restore();
};

/** The plan at s pixels to the world pixel */
export function renderPlan(city: City, style: PlanStyle, s: number): HTMLCanvasElement {
  const { cells, vertices } = city.pack;
  const n = cells.p.length;
  const poly = (i: number) => (cells.v[i] as number[]).map(v => vertices.p[v] as P2);
  const W = Math.ceil(city.W * s);
  const H = Math.ceil(city.H * s);
  const SS = s >= 3 ? 2 : 3;
  const big = document.createElement("canvas");
  big.width = W * SS;
  big.height = H * SS;
  const g = big.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  g.scale(s * SS, s * SS);
  const px = 1 / s;
  const wet = (i: number) => city.use[i] === "water" || city.kind[i] === "pond";
  const town = (i: number) => city.use[i] === "town" || city.use[i] === "shanty";

  // ---- the ground in key colours
  g.fillStyle = KC("country");
  g.fillRect(0, 0, city.W, city.H);
  for (let i = 0; i < n; i++) {
    const u = city.use[i];
    if (u === "wheat" || u === "tilled") {
      pathOf(g, poly(i));
      g.fillStyle = KC(u);
      g.fill();
    }
  }
  const water: number[] = [];
  const land: number[] = [];
  for (let i = 0; i < n; i++) (wet(i) ? water : land).push(i);
  const many = (L: number[]) => {
    g.beginPath();
    for (const i of L) addPoly(g, poly(i));
  };
  g.fillStyle = KC("water");
  many(water);
  g.fill();
  // bank lines: rings following the shore, the bands paling toward it
  g.save();
  many(water);
  g.clip();
  g.lineJoin = "round";
  const offs = [1.2, 2.6, 4.4, 6.8, 10, 14.5];
  for (let k = offs.length - 1; k >= 0; k--) {
    many(land);
    g.strokeStyle = KC("wline");
    g.lineWidth = offs[k] * 2 + 0.9 * px;
    g.stroke();
    g.strokeStyle = KC(`wb${k}` as Key);
    g.lineWidth = offs[k] * 2 - 0.9 * px;
    g.stroke();
  }
  g.restore();
  // height lines: for each level, just inside the ground that stands above it
  {
    const zs = land.map(i => city.height[i]);
    const z0 = Math.min(...zs);
    const z1 = Math.max(...zs);
    const STEP = Math.max(1, (z1 - z0) / 9);
    g.save();
    many(land);
    g.clip();
    for (let L = z0 + STEP; L < z1; L += STEP) {
      const up = land.filter(i => city.height[i] >= L);
      if (!up.length) continue;
      const set = new Set(up);
      g.save();
      many(up);
      g.clip();
      many([...Array(n).keys()].filter(i => !set.has(i)));
      g.lineJoin = "round";
      g.strokeStyle = KC("hline");
      g.lineWidth = 1.4 * px;
      g.stroke();
      g.restore();
    }
    g.restore();
  }
  // the dark edge where land meets water
  g.save();
  many(land);
  g.clip();
  many(water);
  g.lineJoin = "round";
  g.strokeStyle = KC("shore");
  g.lineWidth = 1.8 * px;
  g.stroke();
  g.restore();
  for (let i = 0; i < n; i++)
    if (city.kind[i] === "park") {
      pathOf(g, poly(i));
      g.fillStyle = KC("park");
      g.fill();
    }
  for (let i = 0; i < n; i++)
    if (city.home[i] === 1 && town(i) && !["square", "park", "pond"].includes(city.kind[i] ?? "")) {
      pathOf(g, poly(i));
      // the rich keep gardens behind their houses
      g.fillStyle = KC(city.kind[i] === "wealthy" ? "park" : "yard");
      g.fill();
    }
  g.fillStyle = KC("park");
  for (const y of city.yards) {
    pathOf(g, y);
    g.fill();
  }
  // walls first, so every road runs over them; ink all round, then the stone
  g.lineCap = "square";
  g.lineJoin = "miter";
  for (const pass of [0, 1])
    for (const w of city.walls) {
      pathOf(g, w, false);
      g.strokeStyle = KC(pass ? "wall" : "ink");
      g.lineWidth = pass ? 1.9 : 1.9 + 2.1 * px;
      g.stroke();
    }
  const roads = city.roads.filter(r => RW[r.type]);
  for (const pass of [0, 1])
    for (const r of roads) {
      pathOf(g, r.pts, false);
      g.strokeStyle = KC(pass ? "road" : "ink");
      g.lineWidth = pass ? RW[r.type] * 2 : RW[r.type] * 2 + 2.1 * px;
      g.stroke();
    }
  g.fillStyle = KC("road");
  for (let i = 0; i < n; i++)
    if (city.kind[i] === "square") {
      pathOf(g, poly(i));
      g.fill();
    }
  const piers = city.roads.filter(r => r.type === "pier");
  for (const pass of [0, 1])
    for (const r of piers) {
      pathOf(g, r.pts, false);
      g.strokeStyle = KC(pass ? "pier" : "ink");
      g.lineWidth = pass ? 2.4 : 2.4 + 2.1 * px;
      g.stroke();
    }
  // trees: whole crowns only, each with its hatched shadow
  const crown = (x: number, y: number, r: number) => {
    for (const [k, dx, dy, rr] of [
      ["tsh", r * 0.45, r * 0.55, r],
      ["tdark", 0, 0, r],
      ["tlit", -r * 0.28, -r * 0.3, r * 0.62]
    ] as [Key, number, number, number][]) {
      g.fillStyle = KC(k);
      g.beginPath();
      g.arc(x + dx, y + dy, rr, 0, 6.283);
      g.fill();
    }
  };
  for (let i = 0; i < n; i++) {
    const wood = city.use[i] === "woods";
    if (!wood && city.kind[i] !== "park") continue;
    const P = poly(i);
    const [x0, y0, x1, y1] = bbox(P);
    const st = wood ? 3.4 : 4.6;
    for (let y = y0, row = 0; y < y1; y += st * 0.87, row++)
      for (let x = x0 + (row % 2 ? st / 2 : 0); x < x1; x += st) {
        const jx = x + (th(x, y, 1) - 0.5) * 1.2;
        const jy = y + (th(x, y, 2) - 0.5) * 1.2;
        const r = 1.7 + th(x, y, 4) * 0.7;
        if ((wood || th(x, y, 3) < 0.5) && fits(P, jx, jy, r * 1.25)) crown(jx, jy, r);
      }
  }
  for (const [x, y] of city.trees) crown(x + 1, y + 1, 1.6);
  for (const [x, y] of city.towers) {
    g.fillStyle = KC("ink");
    g.fillRect(x - 1.9, y - 1.9, 3.8, 3.8);
    g.fillStyle = KC("tower");
    g.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
  }

  // ---- snap each sample to its key, and each pixel to its samples' majority
  const src = g.getImageData(0, 0, big.width, big.height).data;
  const BW = big.width;
  const cache = new Map<number, number>();
  const keyOf = (j: number) => {
    const c = (src[j] << 16) | (src[j + 1] << 8) | src[j + 2];
    let k = cache.get(c);
    if (k === undefined) {
      let bd = 1e9;
      k = 0;
      for (let q = 0; q < KEYCOL.length; q++) {
        const v = KEYCOL[q];
        const e = (src[j] - v[0]) ** 2 + (src[j + 1] - v[1]) ** 2 + (src[j + 2] - v[2]) ** 2;
        if (e < bd) {
          bd = e;
          k = q;
        }
      }
      cache.set(c, k);
    }
    return k;
  };
  const WT = KEYS.map(k => (k === "ink" || k === "wline" ? 1.25 : 1));
  const MAT = new Uint8Array(W * H);
  const cnt = new Float32Array(KEYS.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      cnt.fill(0);
      for (let j = 0; j < SS; j++)
        for (let i = 0; i < SS; i++) {
          const k = keyOf(((y * SS + j) * BW + x * SS + i) * 4);
          cnt[k] += WT[k];
        }
      let best = 0;
      for (let k = 1; k < cnt.length; k++) if (cnt[k] > cnt[best]) best = k;
      MAT[y * W + x] = best;
    }
  big.width = big.height = 1;

  // distance to the nearest ground of another kind, for grass and wheat each: their marks gather at the edge
  const ID = (k: Key) => KEYS.indexOf(k);
  const SEE = new Set([ID("hline"), ID("tsh"), ID("tdark"), ID("tlit")]);
  const FAM = new Int8Array(KEYS.length).fill(-1);
  FAM[ID("country")] = FAM[ID("park")] = 0;
  FAM[ID("wheat")] = 1;
  const DST = new Float32Array(W * H).fill(1e4);
  for (const fam of [0, 1]) {
    const Q = new Float32Array(W * H).fill(1e4);
    for (let p = 0; p < Q.length; p++) if (!SEE.has(MAT[p]) && FAM[MAT[p]] !== fam) Q[p] = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        let v = Q[p];
        if (x) v = Math.min(v, Q[p - 1] + 1);
        if (y) v = Math.min(v, Q[p - W] + 1);
        if (x && y) v = Math.min(v, Q[p - W - 1] + 1.41);
        if (y && x < W - 1) v = Math.min(v, Q[p - W + 1] + 1.41);
        Q[p] = v;
      }
    for (let y = H - 1; y >= 0; y--)
      for (let x = W - 1; x >= 0; x--) {
        const p = y * W + x;
        let v = Q[p];
        if (x < W - 1) v = Math.min(v, Q[p + 1] + 1);
        if (y < H - 1) v = Math.min(v, Q[p + W] + 1);
        if (x < W - 1 && y < H - 1) v = Math.min(v, Q[p + W + 1] + 1.41);
        if (y < H - 1 && x) v = Math.min(v, Q[p + W - 1] + 1.41);
        Q[p] = v;
      }
    for (let p = 0; p < Q.length; p++) if (FAM[MAT[p]] === fam) DST[p] = Q[p];
  }

  // the wall's shadow: a hatched band on the open ground outside it
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const o = out.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  o.save();
  o.scale(s, s);
  o.beginPath();
  o.rect(0, 0, city.W, city.H);
  for (let i = 0; i < n; i++) if (city.home[i] === 1 && town(i)) addPoly(o, poly(i));
  o.clip("evenodd");
  o.lineCap = o.lineJoin = "round";
  o.strokeStyle = "#000";
  o.lineWidth = 1.9 + 2 * 2.6;
  for (const w of city.walls) {
    pathOf(o, w, false);
    o.stroke();
  }
  o.restore();
  const SHM = o.getImageData(0, 0, W, H).data;
  const SHADE_ON = new Set([ID("country"), ID("park"), ID("wheat"), ID("tilled"), ID("hline")]);

  const T = texFor(style);
  const TL = KEYS.map(k => T[k]);
  const im = o.createImageData(W, H);
  const d = im.data;
  for (let p = 0; p < MAT.length; p++) {
    const x = p % W;
    const y = (p / W) | 0;
    let c = TL[MAT[p]](x, y, DST[p]);
    if (SHM[p * 4 + 3] > 100 && SHADE_ON.has(MAT[p]) && ((x + y) % 2 === 0 || (x - y + 9999) % 3 === 0))
      c = [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8];
    d[p * 4] = c[0];
    d[p * 4 + 1] = c[1];
    d[p * 4 + 2] = c[2];
    d[p * 4 + 3] = 255;
  }
  o.putImageData(im, 0, 0);
  // beyond the home cell: terrain darkens, the map pales; then the cell's edge and any nation's border
  o.save();
  o.scale(s, s);
  o.fillStyle = style === "terrain" ? "rgba(30,32,24,0.5)" : "rgba(236,231,218,0.72)";
  o.beginPath();
  for (let i = 0; i < n; i++) if (city.home[i] !== 1) addPoly(o, poly(i));
  o.fill();
  drawRims(o, city, null, style, false);
  o.restore();

  // ---- buildings: vectors on the same grid, each pixel hard
  const layer = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const k = document.createElement("canvas");
    k.width = W;
    k.height = H;
    const x = k.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    x.scale(s, s);
    return [k, x];
  };
  const hard = (k: HTMLCanvasElement) => {
    const x = k.getContext("2d") as CanvasRenderingContext2D;
    const im2 = x.getImageData(0, 0, W, H);
    const a = im2.data;
    for (let j = 3; j < a.length; j += 4) a[j] = a[j] >= 80 ? 255 : 0;
    x.putImageData(im2, 0, 0);
  };
  const pats = new Map<string, CanvasPattern>();
  const pat = (ctx: CanvasRenderingContext2D, kind: string) => {
    if (!pats.has(kind)) {
      const t = document.createElement("canvas");
      t.width = t.height = 48;
      const tx = t.getContext("2d") as CanvasRenderingContext2D;
      const ti = tx.createImageData(48, 48);
      for (let y = 0; y < 48; y++)
        for (let x = 0; x < 48; x++) {
          const c3 = ROOFS[kind](x, y, 0);
          const j = (y * 48 + x) * 4;
          ti.data[j] = c3[0];
          ti.data[j + 1] = c3[1];
          ti.data[j + 2] = c3[2];
          ti.data[j + 3] = 255;
        }
      tx.putImageData(ti, 0, 0);
      const p = ctx.createPattern(t, "repeat") as CanvasPattern;
      p.setTransform(new DOMMatrix().scale(1 / s));
      pats.set(kind, p);
    }
    return pats.get(kind) as CanvasPattern;
  };
  const shapes = city.buildings
    .map(b => ({ b, P: b.landmark ? footprint(city, b) : b.poly, kind: roofOf(b) }))
    .filter(q => q.P.length >= 3);
  // what strays onto a road is cut away, so the buildings stand flush to the road's ink
  const cut = (x: CanvasRenderingContext2D) => {
    x.save();
    x.globalCompositeOperation = "destination-out";
    x.lineJoin = "miter";
    x.lineCap = "square";
    x.strokeStyle = "#000";
    for (const r of roads) {
      pathOf(x, r.pts, false);
      x.lineWidth = RW[r.type] * 2 + 2.1 * px;
      x.stroke();
    }
    for (let i = 0; i < n; i++)
      if (city.kind[i] === "square" && !city.buildings.some(b => b.landmark && (b.cells ?? [b.cell]).includes(i))) {
        pathOf(x, poly(i));
        x.fill();
      }
    x.restore();
  };
  const [A, ga] = layer();
  for (const { P, kind } of shapes) {
    pathOf(ga, P);
    ga.fillStyle = pat(ga, kind);
    ga.fill();
    shadeIn(ga, P, 1.2 * px);
  }
  cut(ga);
  hard(A);
  const [Bk, gb] = layer();
  gb.strokeStyle = "#3b2a1e";
  gb.lineWidth = 1.3 * px;
  for (const { b, P } of shapes) {
    if (b.landmark) continue;
    pathOf(gb, P);
    gb.stroke();
  }
  cut(gb);
  hard(Bk);
  // landmarks: an ink edge just inside their footprint
  {
    const [Lk, gl] = layer();
    gl.fillStyle = "#000";
    for (const { b, P } of shapes)
      if (b.landmark) {
        pathOf(gl, P);
        gl.fill();
      }
    cut(gl);
    hard(Lk);
    const la = gl.getImageData(0, 0, W, H).data;
    const bi = gb.getImageData(0, 0, W, H);
    const bd = bi.data;
    const R = Math.max(1, Math.round(s * 0.45));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const j = (y * W + x) * 4;
        if (!la[j + 3]) continue;
        let edge = false;
        for (let dy = -R; dy <= R && !edge; dy++)
          for (let dx = -R; dx <= R; dx++) {
            if (dx * dx + dy * dy > R * R) continue;
            const X = x + dx;
            const Y = y + dy;
            if (X < 0 || Y < 0 || X >= W || Y >= H || !la[(Y * W + X) * 4 + 3]) {
              edge = true;
              break;
            }
          }
        if (edge) {
          bd[j] = 0x3b;
          bd[j + 1] = 0x2a;
          bd[j + 2] = 0x1e;
          bd[j + 3] = 255;
        }
      }
    gb.putImageData(bi, 0, 0);
  }
  o.drawImage(A, 0, 0);
  o.drawImage(Bk, 0, 0);
  return out;
}
