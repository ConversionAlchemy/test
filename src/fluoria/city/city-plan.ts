// The Terrain and Map views as one pixel plan: shapes drawn in key colours, each pixel snapped to its key,
// then laid in that material's drawn marks. Ground and buildings share one pixel grid.
import { connectVertices } from "@/utils/pathUtils";
import { drawRims } from "./city-build";
import { tile, type Tex as Ground } from "./city-tex";
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
  "tlit",
  "under"
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
  tlit: "#c040c0",
  under: "#80f080"
};
const KEYCOL: C3[] = KEYS.map(k => hx(KEYHEX[k]));
const css = (c: C3) => `rgb(${c[0]},${c[1]},${c[2]})`;
const KC = (k: Key) => css(KEYCOL[KEYS.indexOf(k)]);

// the region's own ground, one texel to the screen pixel, as fine as the walls; slow mottling hides its repeat
const regionTex = (t: Ground, amp: number): Tex => {
  const c = tile(t);
  const N = c.width;
  const D = (c.getContext("2d") as CanvasRenderingContext2D).getImageData(0, 0, N, N).data;
  const mean = [0, 1, 2].map(k => {
    let a = 0;
    for (let j = k; j < D.length; j += 4) a += D[j];
    return a / (N * N);
  });
  // the tile's marks brought back up to the region map's own contrast
  return (x, y) => {
    const j = ((y % N) * N + (x % N)) * 4;
    const f = 1 + (smooth(x / 46, y / 46, 21) - 0.5) * amp + (smooth(x / 11, y / 11, 22) - 0.5) * amp * 0.5;
    return [0, 1, 2].map(k => Math.max(0, Math.min(255, (mean[k] + (D[j + k] - mean[k]) * 1.9) * f))) as unknown as C3;
  };
};
// a road's packed earth and setts: pale, with a soft grain and the odd stone
const roadTex = (base: string): Tex => {
  const B = hx(base);
  return (x, y) => {
    let f = 1 + (smooth(x / 7, y / 7, 31) - 0.5) * 0.07 + (smooth(x / 2.5, y / 2.5, 32) - 0.5) * 0.04;
    const t = th(x, y, 33);
    if (t < 0.035) f *= 0.93;
    else if (t > 0.985) f *= 1.03;
    return [Math.min(255, B[0] * f), Math.min(255, B[1] * f), Math.min(255, B[2] * f)];
  };
};
const texFor = (style: PlanStyle): Record<Key, Tex> => {
  const map = style === "map";
  return {
    paper: flat("#f3ecd9"),
    country: map ? dots("#f3ecd9", 16) : regionTex("meadow", 0.14),
    park: map ? dots("#e6ebcf", 16) : regionTex("garden", 0.14),
    wheat: map ? scatter("#f3e5bc", 7, 6, TRI, 18, 5) : regionTex("wheat", 0.1),
    tilled: map ? scatter("#ebdcc6", 9, 8, CAPS, 14) : regionTex("tilled", 0.1),
    under: map ? dots("#f3ecd9", 16) : regionTex("under", 0.14),
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
    road: map ? flat("#f3ecd9") : roadTex("#ebe1ca"),
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
  shop: hatchRoof("#ead9b8", "#c9b28a", "#f3e7cf"),
  work: hatchRoof("#d6d4cf", "#aeaaa2", "#e3e1dc"),
  wall: hatchRoof("#a99c88", "#7d7266", "#b5a994"),
  yard: softHatch("#e7ddc3", 71, 7, 11),
  ware: hatchRoof("#c9c3b8", "#9f978a", "#d9d4cb"),
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
  Workshop: "work",
  Factory: "work",
  Inn: "shop",
  Tavern: "shop",
  Chandlery: "shop",
  "Guild hall": "shop",
  Chapel: "r4",
  Guardhouse: "r3"
};
// church and garrison in slate grey; trade, guild and civic in brown
const GREY = /chapel|church|temple|shrine|abbey|priory|fort|castle|citadel|keep|guard|watch|barracks|garrison|tower/i;
// terrain roofs: plain clay and slate, a soft grain and no hatching; the courses are drawn with the roof's faces
const pn = (x: number, y: number, c: number, per: number, sd: number) => {
  const X = x / c;
  const Y = y / c;
  const xi = Math.floor(X);
  const yi = Math.floor(Y);
  const u = (X - xi) * (X - xi) * (3 - 2 * (X - xi));
  const v = (Y - yi) * (Y - yi) * (3 - 2 * (Y - yi));
  const w = (i: number) => ((i % per) + per) % per;
  const a = th(w(xi), w(yi), sd);
  const b = th(w(xi + 1), w(yi), sd);
  const cc = th(w(xi), w(yi + 1), sd);
  const d = th(w(xi + 1), w(yi + 1), sd);
  return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v;
};
const clay = (rgb: C3, amp = 0.09): Tex => {
  return (x, y) => {
    let f = 1 + (pn(x, y, 6, 8, 3) - 0.5) * amp * 2 + (pn(x, y, 2, 24, 4) - 0.5) * amp;
    const t = th(x % 48, y % 48, 9);
    if (t < 0.05) f *= 0.9;
    else if (t > 0.965) f *= 1.07;
    return [Math.min(255, rgb[0] * f), Math.min(255, rgb[1] * f), Math.min(255, rgb[2] * f)];
  };
};
const TROOF: Record<string, C3> = {
  "t-trade": [204, 112, 70],
  "t-shanty": [204, 146, 120],
  "t-rich": [176, 82, 58],
  "t-docks": [174, 110, 78],
  "t-farm": [200, 124, 88],
  "t-house": [194, 100, 68],
  "t-ware": [150, 132, 116],
  "t-work": [170, 142, 120],
  "t-gold": [196, 150, 60],
  "t-slate": [118, 112, 104],
  "t-brown": [110, 72, 52],
  "t-stone": [140, 133, 122]
};
for (const [k, c] of Object.entries(TROOF)) ROOFS[k] = clay(c, k === "t-stone" ? 0.06 : 0.09);
const roofT = (city: City, b: Building): string => {
  if (b.landmark) return b.type === "Bank" ? "t-gold" : GREY.test(b.type) ? "t-slate" : "t-brown";
  if (b.type === "Warehouse" || b.type === "Shed" || b.type === "Granary") return "t-ware";
  if (b.type === "Workshop" || b.type === "Factory") return "t-work";
  if (b.trade || b.type === "Shop") return "t-trade";
  const k = city.kind[b.cell] ?? "";
  if (k === "shanty") return "t-shanty";
  if (k === "wealthy" || k === "centre") return "t-rich";
  if (k === "docks") return "t-docks";
  return (b.district ?? -1) < 0 ? "t-farm" : "t-house";
};
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
  const R = connectVertices({ vertices, startingVertex: start, ofSameType: c => set.has(c), closeRing: false }).map(
    v => vertices.p[v] as P2
  );
  // a citadel's grid leaves hair-thin steps at its corners and seams: drop them, so it reads as the square it is
  const Q: P2[] = [];
  for (const p of R) if (!Q.length || Math.hypot(p[0] - Q[Q.length - 1][0], p[1] - Q[Q.length - 1][1]) > 1.2) Q.push(p);
  if (Q.length > 3 && Math.hypot(Q[0][0] - Q[Q.length - 1][0], Q[0][1] - Q[Q.length - 1][1]) <= 1.2) Q.pop();
  return Q.filter((p, i) => {
    const a = Q[(i + Q.length - 1) % Q.length];
    const c = Q[(i + 1) % Q.length];
    const t = Math.atan2(c[1] - p[1], c[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0]);
    return Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 0.12;
  });
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

// a hipped roof seen from above: a ridge down the long axis, four faces lit from the upper left
const hipRoof = (g: CanvasRenderingContext2D, P: P2[], px: number) => {
  let a = 0;
  let L = 0;
  for (let i = 0; i < P.length; i++) {
    const q = P[(i + 1) % P.length];
    const l = Math.hypot(q[0] - P[i][0], q[1] - P[i][1]);
    if (l > L) [L, a] = [l, Math.atan2(q[1] - P[i][1], q[0] - P[i][0])];
  }
  let u: P2 = [Math.cos(a), Math.sin(a)];
  let v: P2 = [-u[1], u[0]];
  const span = (d: P2) => {
    const t = P.map(p => p[0] * d[0] + p[1] * d[1]);
    return [Math.min(...t), Math.max(...t)];
  };
  let [a0, a1] = span(u);
  let [b0, b1] = span(v);
  if (a1 - a0 < b1 - b0) {
    [u, v] = [v, [-v[0], -v[1]]];
    [a0, a1] = span(u);
    [b0, b1] = span(v);
  }
  const h = (b1 - b0) / 2;
  const bm = (b0 + b1) / 2;
  const at = (s: number, t: number): P2 => [u[0] * s + v[0] * t, u[1] * s + v[1] * t];
  const r0 = Math.min(a0 + h, (a0 + a1) / 2);
  const r1 = Math.max(a1 - h, (a0 + a1) / 2);
  const R0 = at(r0, bm);
  const R1 = at(r1, bm);
  const faces: [P2[], P2][] = [
    [[at(a0, b0), at(a1, b0), R1, R0], [-v[0], -v[1]]],
    [[at(a0, b1), at(a1, b1), R1, R0], v],
    [[at(a0, b0), R0, at(a0, b1)], [-u[0], -u[1]]],
    [[at(a1, b0), R1, at(a1, b1)], u]
  ];
  g.save();
  pathOf(g, P);
  g.clip();
  for (const [F, nrm] of faces) {
    const lit = -(nrm[0] + nrm[1]) * 0.707;
    pathOf(g, F);
    g.fillStyle = lit > 0 ? `rgba(255,248,236,${(0.16 * lit).toFixed(3)})` : `rgba(40,18,10,${(-0.26 * lit).toFixed(3)})`;
    g.fill();
    // the courses of tiles, along the eave
    g.save();
    pathOf(g, F);
    g.clip();
    const e: P2 = [-nrm[1], nrm[0]];
    const [x0, y0, x1, y1] = bbox(F);
    const R = Math.hypot(x1 - x0, y1 - y0);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    g.strokeStyle = "rgba(60,26,14,0.16)";
    g.lineWidth = 0.9 * px;
    g.beginPath();
    for (let t = -R; t <= R; t += 1.1) {
      const cx = mx + nrm[0] * t;
      const cy = my + nrm[1] * t;
      g.moveTo(cx - e[0] * R, cy - e[1] * R);
      g.lineTo(cx + e[0] * R, cy + e[1] * R);
    }
    g.stroke();
    g.restore();
  }
  g.strokeStyle = "rgba(59,42,30,0.75)";
  g.lineWidth = 1.1 * px;
  g.beginPath();
  g.moveTo(R0[0], R0[1]);
  g.lineTo(R1[0], R1[1]);
  for (const [c, R] of [
    [at(a0, b0), R0],
    [at(a0, b1), R0],
    [at(a1, b0), R1],
    [at(a1, b1), R1]
  ]) {
    g.moveTo(c[0], c[1]);
    g.lineTo(R[0], R[1]);
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
    if (u === "wheat" || u === "tilled" || u === "woods") {
      pathOf(g, poly(i));
      g.fillStyle = KC(u === "woods" ? "under" : u);
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
  const piers = city.roads.filter(r => r.type === "pier");
  for (const pass of [0, 1])
    for (const r of piers) {
      pathOf(g, r.pts, false);
      g.strokeStyle = KC(pass ? "pier" : "ink");
      g.lineWidth = pass ? 2.4 : 2.4 + 2.1 * px;
      g.stroke();
    }
  // the roads and bridges run over the piers
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
  const inPoly = (P: P2[], x: number, y: number) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++)
      if (P[i][1] > y !== P[j][1] > y && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0])
        c = !c;
    return c;
  };
  const seg = (p: P2, q: P2, x: number, y: number) => {
    const ex = q[0] - p[0];
    const ey = q[1] - p[1];
    const t = Math.max(0, Math.min(1, ((x - p[0]) * ex + (y - p[1]) * ey) / (ex * ex + ey * ey || 1)));
    return Math.hypot(x - p[0] - t * ex, y - p[1] - t * ey);
  };
  const clearOf = (x: number, y: number, r: number) =>
    !city.buildings.some(
      b =>
        b.poly.length > 2 &&
        (inPoly(b.poly, x, y) || b.poly.some((p, k) => seg(p, b.poly[(k + 1) % b.poly.length], x, y) < r))
    );
  for (let i = 0; i < n; i++) {
    const wood = city.use[i] === "woods";
    if (!wood && city.kind[i] !== "park") continue;
    const P = poly(i);
    const [x0, y0, x1, y1] = bbox(P);
    const st = wood ? 2.9 : 4;
    for (let y = y0, row = 0; y < y1; y += st * 0.87, row++)
      for (let x = x0 + (row % 2 ? st / 2 : 0); x < x1; x += st) {
        const jx = x + (th(x, y, 1) - 0.5) * 1.2;
        const jy = y + (th(x, y, 2) - 0.5) * 1.2;
        const r = 1.25 + th(x, y, 4) * 0.5;
        // the crown and its shadow both stay inside the cell
        if ((wood || th(x, y, 3) < 0.5) && fits(P, jx + r * 0.2, jy + r * 0.25, r * 1.5)) crown(jx, jy, r);
      }
  }
  for (const [x, y] of city.trees) if (clearOf(x + 1.3, y + 1.4, 2.4)) crown(x + 1, y + 1, 1.3);
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
  const SHADE_ON = new Set([ID("country"), ID("park"), ID("wheat"), ID("tilled"), ID("under"), ID("hline")]);

  // terrain: each cell lit or shaded by its slope, facing the upper left, and a touch of its own
  const terrain = style === "terrain";
  let SL: Uint8ClampedArray | null = null;
  if (terrain) {
    const sc = document.createElement("canvas");
    sc.width = W;
    sc.height = H;
    const q = sc.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    q.scale(s, s);
    q.fillStyle = "rgb(128,128,128)";
    q.fillRect(0, 0, city.W, city.H);
    const Z = city.height;
    for (let i = 0; i < n; i++) {
      if (wet(i)) continue;
      let gx = 0;
      let gy = 0;
      for (const j of cells.c[i] as number[]) {
        if (j >= n || wet(j)) continue;
        const dx = cells.p[j][0] - cells.p[i][0];
        const dy = cells.p[j][1] - cells.p[i][1];
        const d2 = dx * dx + dy * dy || 1;
        gx += ((Z[j] - Z[i]) * dx) / d2;
        gy += ((Z[j] - Z[i]) * dy) / d2;
      }
      const f =
        Math.max(0.86, Math.min(1.12, 1 + (gx + gy) * 2.2)) * (0.97 + (((i * 2654435761) % 1000) / 1000) * 0.06);
      const v = Math.round(128 + (f - 1) * 500);
      pathOf(q, poly(i));
      // green: the field's furrow direction; blue: its own tone
      const a = Math.round(((((city.ang[i] % Math.PI) + Math.PI) % Math.PI) / Math.PI) * 255);
      q.fillStyle = q.strokeStyle = `rgb(${v},${a},${(i * 97) % 256})`;
      q.lineWidth = 0.6;
      q.fill();
      q.stroke();
    }
    SL = q.getImageData(0, 0, W, H).data;
  }
  const ID_WHEAT = ID("wheat");
  const ID_TILLED = ID("tilled");
  const TINT = new Set([ID("country"), ID("park"), ID("wheat"), ID("tilled"), ID("under"), ID("yard")]);

  const T = texFor(style);
  const TL = KEYS.map(k => T[k]);
  const im = o.createImageData(W, H);
  const d = im.data;
  for (let p = 0; p < MAT.length; p++) {
    const x = p % W;
    const y = (p / W) | 0;
    let c = TL[MAT[p]](x, y, DST[p]);
    if (SL && TINT.has(MAT[p])) {
      const f = 1 + (SL[p * 4] - 128) / 500;
      c = f < 1 ? [c[0] * f, c[1] * f, c[2] * f] : c.map(v => v + (255 - v) * (f - 1) * 0.8) as unknown as C3;
      // ploughland in furrows, wheat in drilled rows, each field its own way and its own shade
      const m = MAT[p];
      if (m === ID_WHEAT || m === ID_TILLED) {
        const a = (SL[p * 4 + 1] / 255) * Math.PI;
        const t = x * Math.cos(a) + y * Math.sin(a);
        const per = m === ID_TILLED ? 4.5 : 3.2;
        const ph = ((t % per) + per) % per / per;
        const wob = smooth(x / 9, y / 9, 41) * 0.25;
        const k = (ph + wob) % 1;
        const g0 = 1 + ((SL[p * 4 + 2] / 255) - 0.5) * 0.1;
        const g = m === ID_TILLED ? (k < 0.35 ? 0.84 : k < 0.5 ? 1.06 : 1) : k < 0.28 ? 0.9 : k > 0.8 ? 1.05 : 1;
        c = [c[0] * g * g0, c[1] * g * (m === ID_WHEAT ? 2 - g0 : g0), c[2] * g * g0];
      }
    }
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
    .map(b => ({ b, P: b.landmark ? footprint(city, b) : b.poly, kind: terrain ? roofT(city, b) : roofOf(b) }))
    .filter(q => q.P.length >= 3);
  // what strays onto a road is cut away, so the buildings stand flush to the road's ink
  const cut = (x: CanvasRenderingContext2D) => {
    x.save();
    x.globalCompositeOperation = "destination-out";
    x.lineJoin = "miter";
    x.lineCap = "square";
    x.strokeStyle = "#000";
    // a road between two of a fort's own cells runs under its gates: the fort is not cut there
    const fortCell = new Map<number, number>();
    city.buildings.forEach((b, k) => {
      if (b.landmark && /fort|castle|citadel|keep/i.test(`${b.type} ${b.name ?? ""}`))
        for (const c of b.cells ?? [b.cell]) fortCell.set(c, k);
    });
    const near = (px0: number, py0: number) => {
      let best = -1;
      let bd = Infinity;
      for (const c of fortCell.keys()) {
        const d = (cells.p[c][0] - px0) ** 2 + (cells.p[c][1] - py0) ** 2;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      return best;
    };
    const through = (a: P2, b: P2) => {
      if (!fortCell.size) return false;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = (-(b[1] - a[1]) / L) * 2.5;
      const ny = ((b[0] - a[0]) / L) * 2.5;
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const own = (qx: number, qy: number) => {
        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < n; i++) {
          const d = (cells.p[i][0] - qx) ** 2 + (cells.p[i][1] - qy) ** 2;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        return best;
      };
      if (near(mx, my) < 0) return false;
      const c1 = fortCell.get(own(mx + nx, my + ny));
      const c2 = fortCell.get(own(mx - nx, my - ny));
      return c1 !== undefined && c1 === c2;
    };
    for (const r of roads) {
      x.lineWidth = RW[r.type] * 2 + 2.1 * px;
      x.beginPath();
      for (let k = 1; k < r.pts.length; k++) {
        if (through(r.pts[k - 1], r.pts[k])) continue;
        x.moveTo(r.pts[k - 1][0], r.pts[k - 1][1]);
        x.lineTo(r.pts[k][0], r.pts[k][1]);
      }
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
  const FORT = /fort|castle|citadel|keep/i;
  const isFort = (b: Building) => !!b.landmark && FORT.test(`${b.type} ${b.name ?? ""}`);
  const CW = 1.9;
  const INK = 1.3 * px;
  // crenels: a dashed band inside an outline
  const battle = (P: P2[], w: number) => {
    ga.save();
    pathOf(ga, P);
    ga.clip();
    ga.setLineDash([0.7, 0.7]);
    ga.strokeStyle = "#3b2a1e";
    ga.lineWidth = 2 * w;
    pathOf(ga, P);
    ga.stroke();
    ga.restore();
  };
  for (const { b, P, kind } of shapes) {
    pathOf(ga, P);
    if (isFort(b)) {
      // the court, and the great tower in its middle
      ga.fillStyle = pat(ga, "yard");
      ga.fill();
      const cx = P.reduce((q, p) => q + p[0], 0) / P.length;
      const cy = P.reduce((q, p) => q + p[1], 0) / P.length;
      const D = P.map(p => [cx + (p[0] - cx) * 0.36, cy + (p[1] - cy) * 0.36] as P2);
      pathOf(ga, D);
      ga.fillStyle = pat(ga, terrain ? "t-stone" : "lmg");
      ga.fill();
      ga.save();
      pathOf(ga, D);
      ga.clip();
      pathOf(ga, D);
      ga.strokeStyle = "#3b2a1e";
      ga.lineWidth = 2 * INK;
      ga.stroke();
      ga.restore();
      battle(D, 0.5 + INK);
      continue;
    }
    ga.fillStyle = pat(ga, kind);
    ga.fill();
    if (terrain) hipRoof(ga, P, px);
    else shadeIn(ga, P, 1.2 * px);
  }
  // a fort: the great tower in its court, walled on every side at the town wall's width
  for (const { b, P } of shapes)
    if (isFort(b)) {
      ga.save();
      pathOf(ga, P);
      ga.clip();
      ga.lineJoin = "miter";
      ga.miterLimit = 4;
      // which sides face the town and which back onto the town wall: there the town wall is the fort's own
      const open = P.map((p, i) => {
        const q = P[(i + 1) % P.length];
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        const mx = (p[0] + q[0]) / 2;
        const my = (p[1] + q[1]) / 2;
        const ox = ((q[1] - p[1]) / L) * 4;
        const oy = (-(q[0] - p[0]) / L) * 4;
        const cx0 = P.reduce((a, r) => a + r[0], 0) / P.length;
        const cy0 = P.reduce((a, r) => a + r[1], 0) / P.length;
        const sg = (mx + ox - cx0) ** 2 + (my + oy - cy0) ** 2 > (mx - ox - cx0) ** 2 + (my - oy - cy0) ** 2 ? 1 : -1;
        let best = 0;
        let bd = Infinity;
        for (let c = 0; c < n; c++) {
          const d = (cells.p[c][0] - mx - ox * sg) ** 2 + (cells.p[c][1] - my - oy * sg) ** 2;
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        return town(best);
      });
      // each side's wall stands flush to what lies beyond it: the street's edge, or the cell border; where the
      // town wall runs, that wall is the fort's own, in its place and width
      const ccw = P.reduce((q, p, k) => q + p[0] * P[(k + 1) % P.length][1] - P[(k + 1) % P.length][0] * p[1], 0) > 0;
      const segD = (x: number, y: number, a: P2, b2: P2) => {
        const ex = b2[0] - a[0];
        const ey = b2[1] - a[1];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey || 1)));
        return Math.hypot(x - a[0] - t * ex, y - a[1] - t * ey);
      };
      const face = P.map((p, i) => {
        if (!open[i]) return -CW / 2;
        const q = P[(i + 1) % P.length];
        const mx = (p[0] + q[0]) / 2;
        const my = (p[1] + q[1]) / 2;
        let f = 0;
        for (const r of roads)
          for (let k = 1; k < r.pts.length; k++)
            if (
              segD(mx, my, r.pts[k - 1], r.pts[k]) < 1 &&
              Math.abs(
                ((r.pts[k][0] - r.pts[k - 1][0]) * (q[0] - p[0]) + (r.pts[k][1] - r.pts[k - 1][1]) * (q[1] - p[1])) /
                  ((Math.hypot(r.pts[k][0] - r.pts[k - 1][0], r.pts[k][1] - r.pts[k - 1][1]) || 1) *
                    (Math.hypot(q[0] - p[0], q[1] - p[1]) || 1))
              ) > 0.9
            )
              f = Math.max(f, RW[r.type] + 1.05 * px);
        return f;
      });
      // the outline moved in by each side's own distance plus d
      const ring = (d: number): P2[] => {
        const L = P.map((p, i) => {
          const q = P[(i + 1) % P.length];
          const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
          const ux = (q[0] - p[0]) / len;
          const uy = (q[1] - p[1]) / len;
          const nx = ccw ? -uy : uy;
          const ny = ccw ? ux : -ux;
          const o = face[i] + d;
          return { x: p[0] + nx * o, y: p[1] + ny * o, ux, uy };
        });
        return L.map((b2, i) => {
          const a = L[(i + L.length - 1) % L.length];
          const den = a.ux * b2.uy - a.uy * b2.ux;
          if (Math.abs(den) < 1e-6) return [b2.x, b2.y] as P2;
          const t = ((b2.x - a.x) * b2.uy - (b2.y - a.y) * b2.ux) / den;
          return [a.x + a.ux * t, a.y + a.uy * t] as P2;
        });
      };
      const band = (d0: number, d1: number, st: string | CanvasPattern) => {
        ga.beginPath();
        addPoly(ga, ring(d0));
        addPoly(ga, ring(d1));
        ga.fillStyle = st;
        ga.fill("evenodd");
      };
      ga.restore();
      band(-INK, CW + INK, "#3b2a1e");
      band(0, CW, pat(ga, "wall"));
      // crenels: a fine broken line along the parapet, inside the wall
      ga.save();
      ga.setLineDash([0.7, 0.7]);
      ga.strokeStyle = "#3b2a1e";
      ga.lineWidth = 0.5;
      ga.lineJoin = "miter";
      pathOf(ga, ring(0.55));
      ga.stroke();
      ga.restore();
      // towers on the wall's line, the town wall's size, turned to the fort
      const mid = ring(CW / 2);
      for (let i = 0; i < mid.length; i++) {
        const a = mid[(i + mid.length - 1) % mid.length];
        const p = mid[i];
        const c = mid[(i + 1) % mid.length];
        const t1 = Math.atan2(p[1] - a[1], p[0] - a[0]);
        const t2 = Math.atan2(c[1] - p[1], c[0] - p[0]);
        if (Math.abs(Math.atan2(Math.sin(t2 - t1), Math.cos(t2 - t1))) < 0.5) continue;
        ga.save();
        ga.translate(p[0], p[1]);
        ga.rotate(t2);
        ga.fillStyle = "#3b2a1e";
        ga.fillRect(-1.9, -1.9, 3.8, 3.8);
        ga.fillStyle = "#7d7266";
        ga.fillRect(-1.9 + INK, -1.9 + INK, 3.8 - 2 * INK, 3.8 - 2 * INK);
        ga.restore();
      }
      ga.save();
      ga.restore();
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
    let li = 0;
    for (const { b, P } of shapes)
      if (b.landmark && !isFort(b)) {
        li++;
        gl.fillStyle = `rgb(${((li * 37) % 251) + 4},${((li * 91) % 251) + 4},${((li * 53) % 251) + 4})`;
        gl.beginPath();
        addPoly(gl, P);
        gl.fill("nonzero");
      }
    cut(gl);
    hard(Lk);
    const la = gl.getImageData(0, 0, W, H).data;
    const same = (j: number, q: number) => la[j] === la[q] && la[j + 1] === la[q + 1] && la[j + 2] === la[q + 2];
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
            const q = (Y * W + X) * 4;
            if (X < 0 || Y < 0 || X >= W || Y >= H || !la[q + 3] || !same(j, q)) {
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
