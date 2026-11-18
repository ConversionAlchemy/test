// Fills a city's blocks with terraced buildings and paints it twice: the pixel terrain view in the region map's grounds
// and palette, and a flat map view of pale streets, plain blocks and buildings coloured by what they are
import { COAST, ditherAt, groundPixel } from "../ground-tiles";
import { Palette as P, type RGB } from "../palette";
import type { Building, City, P2 } from "./city-gen";

type C3 = readonly [number, number, number];
const sh = (c: C3, f: number): C3 => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
const hex = (h: string): C3 => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16)
];
const WOODS = ["#3c4524", "#566131", "#68733a", "#7a8644", "#8d984f"].map(hex);
const inPoly = (poly: P2[], x: number, y: number) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c;
  }
  return c;
};
const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// building tiers: frontage and depth ranges in pixels (about 1.3 m each)
const TIER: Record<string, [number, number, number, number]> = {
  hut: [3, 4, 3, 4],
  house: [5, 7, 7, 9],
  shop: [6, 8, 8, 10],
  hall: [9, 12, 11, 14],
  store: [10, 14, 12, 16],
  mark: [15, 15, 21, 21]
};
const MIX: Record<string, [string, string, number][]> = {
  centre: [
    ["Counting house", "shop", 3],
    ["Guild hall", "hall", 1],
    ["Shop", "shop", 3],
    ["Townhouse", "house", 3]
  ],
  wealthy: [
    ["Mansion", "hall", 3],
    ["Townhouse", "shop", 2]
  ],
  old: [
    ["Residence", "house", 8],
    ["Workshop", "shop", 2],
    ["Shop", "shop", 2],
    ["Residence", "house", 4]
  ],
  docks: [
    ["Warehouse", "store", 4],
    ["Shed", "shop", 3],
    ["Chandlery", "shop", 1],
    ["Residence", "house", 2]
  ],
  shanty: [["Hut", "hut", 1]]
};
const ROOFS: Record<string, string[]> = {
  centre: ["slate", "slate", "stone", "clay"],
  wealthy: ["slate", "slate", "clay"],
  old: ["clay", "clay", "clay", "slate", "thatch"],
  docks: ["timber", "timber", "slate", "thatch"],
  shanty: ["thatch", "timber", "thatch", "clay"]
};
export const TYPE_INK: Record<string, string> = {
  Bank: "#d6ac3c",
  Guardhouse: "#b8423a",
  Chapel: "#5f9a62",
  "Guild hall": "#4f7fb4",
  Tavern: "#d07a3a",
  Warehouse: "#8a6a4a",
  Office: "#7b6aa8",
  Market: "#c9a04a"
};

export interface Painted {
  terrain: ImageData;
  map: ImageData;
  CID: Int32Array;
  BID: Int32Array;
}

export function furnish(city: City): void {
  const { W, H, pack, kind, use, district } = city;
  const { cells, vertices } = pack;
  const pts: P2[] = cells.p;
  const n = pts.length;
  let s = 977;
  const R = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const pick = <T>(L: T[]) => L[Math.floor(R() * L.length)];
  const weighted = (L: [string, string, number][]) => {
    const tot = L.reduce((a, x) => a + x[2], 0);
    let r = R() * tot;
    for (const x of L) {
      r -= x[2];
      if (r < 0) return x;
    }
    return L[0];
  };
  const { CID, RD } = rasterPlan(city);
  const OCC = new Int32Array(W * H);
  const B: Building[] = [];
  const free = (poly: P2[], cid: number, strict = true) => {
    let a = Infinity;
    let b = Infinity;
    let e = -Infinity;
    let f = -Infinity;
    for (const [x, y] of poly) {
      a = Math.min(a, x);
      b = Math.min(b, y);
      e = Math.max(e, x);
      f = Math.max(f, y);
    }
    if (a < 0 || b < 0 || e >= W || f >= H) return null;
    const out: number[] = [];
    for (let y = Math.floor(b); y <= f; y++)
      for (let x = Math.floor(a); x <= e; x++) {
        if (!inPoly(poly, x + 0.5, y + 0.5)) continue;
        const j = y * W + x;
        if (CID[j] !== cid || RD[j] || OCC[j]) {
          if (strict) return null;
          continue;
        }
        out.push(j);
      }
    return out.length > 5 ? out : null;
  };
  const place = (b: Omit<Building, "id">, cl: number[]) => {
    const id = B.length + 1;
    B.push({ ...b, id });
    for (const j of cl) OCC[j] = id;
  };
  const rect = (o: P2, tx: number, ty: number, nx: number, ny: number, f: number, d: number): P2[] => [
    [o[0], o[1]],
    [o[0] + tx * f, o[1] + ty * f],
    [o[0] + tx * f + nx * d, o[1] + ty * f + ny * d],
    [o[0] + nx * d, o[1] + ny * d]
  ];
  const poly = (i: number): P2[] => cells.v[i].map((v: number) => vertices.p[v] as P2);
  const roadNear = (p: P2, r: number) => {
    for (let v = -r; v <= r; v++)
      for (let u = -r; u <= r; u++) {
        const x = Math.round(p[0] + u);
        const y = Math.round(p[1] + v);
        if (x >= 0 && y >= 0 && x < W && y < H && RD[y * W + x] && RD[y * W + x] !== 5) return true;
      }
    return false;
  };
  const streetOf = (p: P2) => {
    let best: string | undefined;
    let bd = 12;
    for (const r of city.roads)
      if (r.name)
        for (let k = 0; k < r.pts.length; k += 2) {
          const d = dist(p, r.pts[k]);
          if (d < bd) {
            bd = d;
            best = r.name;
          }
        }
    return best;
  };
  const numbers = new Map<string, number>();
  const addrOf = (p: P2, fallback: string) => {
    const st = streetOf(p);
    if (!st) return fallback;
    const k = (numbers.get(st) ?? 0) + 1;
    numbers.set(st, k);
    return `${k} ${st}`;
  };
  const dname = (i: number) => (district[i] >= 0 ? city.districts[district[i]].name : "");

  // the Aurum: a landmark on the square's edge, gold roof
  {
    const sq = city.squareCell;
    const cand = cells.c[sq].filter((j: number) => kind[j] === "centre");
    for (const j of cand) {
      const shv = cells.v[sq].filter((v: number) => cells.v[j].includes(v));
      if (shv.length < 2) continue;
      const a = vertices.p[shv[0]] as P2;
      const b = vertices.p[shv[1]] as P2;
      const L = dist(a, b);
      if (L < 12) continue;
      const tx = (b[0] - a[0]) / L;
      const ty = (b[1] - a[1]) / L;
      let nx = -ty;
      let ny = tx;
      const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (!inPoly(poly(j), m[0] + nx * 4, m[1] + ny * 4)) {
        nx = -nx;
        ny = -ny;
      }
      let done = false;
      for (const st of [2, 3, 4])
        for (const [f, d] of [
          [15, 21],
          [14, 19],
          [13, 17]
        ]) {
          if (done) break;
          const pl = rect([m[0] - (tx * f) / 2 + nx * st, m[1] - (ty * f) / 2 + ny * st], tx, ty, nx, ny, f, d);
          const cl = free(pl, j);
          if (cl) {
            place(
              {
                cell: j,
                poly: pl,
                type: "Bank",
                roof: "gold",
                name: "The Aurum",
                addr: "Coin Square",
                district: district[j],
                landmark: true,
                enter: "Aurum halls · counting house · vault"
              },
              cl
            );
            done = true;
          }
        }
      if (done) break;
    }
  }

  // street fronts: terraces along every edge of a block that has a road, both sides of a main road through it
  for (let i = 0; i < n; i++) {
    const k = kind[i];
    if (!k || k === "square" || k === "park" || k === "pond") continue;
    const q = poly(i);
    const mix = MIX[k];
    const wealthy = k === "wealthy";
    const shanty = k === "shanty";
    if (shanty) continue;
    const fronts: { a: P2; b: P2; set: number }[] = [];
    for (let e = 0; e < q.length; e++) {
      const a = q[e];
      const b = q[(e + 1) % q.length];
      if (dist(a, b) < 6) continue;
      const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (roadNear(m, 2) || k === "old" || k === "centre" || k === "docks") fronts.push({ a, b, set: 0 });
    }
    for (const r of city.roads)
      if (r.type === "main" && r.cells?.includes(i))
        for (let t = 0; t < r.pts.length - 1; t++) {
          const a = r.pts[t];
          const b = r.pts[t + 1];
          const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          if (!inPoly(q, m[0], m[1])) continue;
          fronts.push({ a, b, set: 2.6 }, { a: b, b: a, set: 2.6 });
        }
    for (const fr of fronts) {
      const { a, b } = fr;
      const L = dist(a, b);
      const tx = (b[0] - a[0]) / L;
      const ty = (b[1] - a[1]) / L;
      const nx = -ty;
      const ny = tx;
      const sgn = inPoly(q, (a[0] + b[0]) / 2 + nx * 3, (a[1] + b[1]) / 2 + ny * 3) ? 1 : -1;
      const nX = nx * sgn;
      const nY = ny * sgn;
      const set = fr.set + (wealthy ? 4 : 1.5);
      let t = 0.5;
      while (t < L - 2) {
        const [tn, tt] = weighted(mix);
        const tr = TIER[tt];
        const f = tr[0] + R() * (tr[1] - tr[0]);
        const d = tr[2] + R() * (tr[3] - tr[2]);
        const fl = Math.min(f, L - t);
        if (fl < 3.5) break;
        const pl = rect([a[0] + tx * t + nX * set, a[1] + ty * t + nY * set], tx, ty, nX, nY, fl, d);
        const cl = free(pl, i, false);
        if (!cl || cl.length < fl * d * 0.6) {
          t += 1;
          continue;
        }
        if (!wealthy || R() < 0.85)
          place(
            {
              cell: i,
              poly: pl,
              type: tn,
              roof: pick(ROOFS[k]),
              addr: addrOf([a[0] + tx * t, a[1] + ty * t], dname(i)),
              district: district[i]
            },
            cl
          );
        t += fl + (wealthy ? 5 + R() * 6 : 0);
      }
    }
    // back rows in the dense districts, leaving a yard
    if (k === "old" || k === "centre" || k === "docks") {
      let bl = 0;
      let best: [P2, P2] = [q[0], q[1]];
      for (let e = 0; e < q.length; e++) {
        const l = dist(q[e], q[(e + 1) % q.length]);
        if (l > bl) {
          bl = l;
          best = [q[e], q[(e + 1) % q.length]];
        }
      }
      const tx = (best[1][0] - best[0][0]) / bl;
      const ty = (best[1][1] - best[0][1]) / bl;
      for (let y = 0; y < H; y += 4)
        for (let x = 0; x < W; x += 4) {
          const j = y * W + x;
          if (CID[j] !== i || OCC[j] || RD[j] || R() < (k === "centre" ? 0.1 : 0.3)) continue;
          const tt = k === "docks" && R() < 0.5 ? "store" : "house";
          const tr = TIER[tt];
          const f = tr[0] + R() * 2;
          const d = tr[2] + R() * 2;
          const pl = rect([x - (tx * f) / 2 + (ty * d) / 2, y - (ty * f) / 2 - (tx * d) / 2], tx, ty, -ty, tx, f, d);
          const cl = free(pl, i);
          if (cl)
            place(
              {
                cell: i,
                poly: pl,
                type: k === "docks" ? (tt === "store" ? "Warehouse" : "Shed") : "Residence",
                roof: pick(ROOFS[k]),
                addr: `Court off ${dname(i)}`,
                district: district[i]
              },
              cl
            );
        }
    }
  }
  // the shanty: huts packed against each other at odd angles
  for (let i = 0; i < n; i++)
    if (kind[i] === "shanty")
      for (let y = 0; y < H; y += 3)
        for (let x = 0; x < W; x += 3) {
          const j = y * W + x;
          if (CID[j] !== i || OCC[j] || RD[j] || R() < 0.15) continue;
          const a = R() * 0.6 - 0.3 + city.ang[i];
          const tx = Math.cos(a);
          const ty = Math.sin(a);
          const f = 3 + R() * 2.5;
          const d = 3 + R() * 2;
          const pl = rect([x, y], tx, ty, -ty, tx, f, d);
          const cl = free(pl, i);
          if (cl)
            place(
              { cell: i, poly: pl, type: "Hut", roof: pick(ROOFS.shanty), addr: "The Rookery", district: district[i] },
              cl
            );
        }
  // farms on the roads outside
  for (const r of city.roads) {
    if (r.type !== "main") continue;
    for (let t = 6; t < r.pts.length - 1; t += 3) {
      const a = r.pts[t];
      const b = r.pts[t + 1];
      const c = CID[Math.round(a[1]) * W + Math.round(a[0])];
      if (c < 0 || use[c] === "town" || use[c] === "water" || use[c] === "shanty" || R() < 0.82) continue;
      const L = dist(a, b) || 1;
      const tx = (b[0] - a[0]) / L;
      const ty = (b[1] - a[1]) / L;
      const sg = R() < 0.5 ? 1 : -1;
      const pl = rect([a[0] - ty * sg * 3, a[1] + tx * sg * 3], tx, ty, -ty * sg, tx * sg, 6, 8);
      const cl = free(pl, c);
      if (cl) place({ cell: c, poly: pl, type: "Farmhouse", roof: "thatch", addr: r.name ?? "", district: -1 }, cl);
    }
  }
  // notables
  const nb = (type: string, name: string, f: (b: Building) => boolean) => {
    const L = B.filter(b => !b.name && f(b));
    if (!L.length) return;
    const b = L[Math.floor(R() * L.length)];
    b.type = type;
    b.name = name;
  };
  const gate0 = city.gates[0];
  nb("Guardhouse", "The Watch House", b => !!gate0 && dist(b.poly[0], gate0) < 40 && b.type !== "Hut");
  nb("Guardhouse", "Harbour Watch", b => kind[b.cell] === "docks");
  nb("Chapel", "Chapel of the Ledger", b => kind[b.cell] === "wealthy");
  nb("Tavern", "The Gilded Anchor", b => kind[b.cell] === "docks" && b.type !== "Warehouse");
  nb("Tavern", "The Brass Scale", b => kind[b.cell] === "old");
  nb("Tavern", "The Sleeping Clerk", b => kind[b.cell] === "old");
  nb("Guild hall", "Hall of the Weigh-Masters", b => kind[b.cell] === "centre");
  nb("Office", "Harbourmaster", b => b.type === "Warehouse");
  city.buildings = B;

  // trees: woods and parks thick, gardens light, along hedges
  const T: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const k = kind[i] ?? use[i];
    const dens = use[i] === "woods" ? 0.95 : k === "park" ? 0.8 : k === "wealthy" ? 0.25 : k === "old" ? 0.04 : 0;
    if (!dens) continue;
    const sp = use[i] === "woods" || k === "park" ? 5 : 6;
    for (let y = 0; y < H; y += sp)
      for (let x = 0; x < W; x += sp) {
        const jx = Math.round(x + (R() - 0.5) * sp);
        const jy = Math.round(y + (R() - 0.5) * sp);
        if (jx < 0 || jy < 0 || jx >= W || jy >= H) continue;
        const j = jy * W + jx;
        if (CID[j] !== i || OCC[j] || RD[j] || R() > dens) continue;
        T.push([jx, jy, use[i] === "woods" ? (R() < 0.4 ? 4 : 3) : 3]);
      }
  }
  const hedge = hedgeEdges(city);
  for (const [a, b] of hedge) {
    const L = dist(a, b);
    for (let t = 3; t < L - 2; t += 5 + R() * 6)
      if (R() < 0.65)
        T.push([Math.round(a[0] + ((b[0] - a[0]) * t) / L), Math.round(a[1] + ((b[1] - a[1]) * t) / L), 2]);
  }
  city.trees = T;
}

/** Edges between two farm cells of different crops */
function hedgeEdges(city: City): [P2, P2][] {
  const { pack, use } = city;
  const { cells, vertices } = pack;
  const out: [P2, P2][] = [];
  const farm = (u: string) => u === "wheat" || u === "tilled" || u === "pasture";
  for (let i = 0; i < cells.p.length; i++)
    for (const j of cells.c[i]) {
      if (j <= i || j >= cells.p.length || !farm(use[i]) || !farm(use[j])) continue;
      const shv = cells.v[i].filter((v: number) => cells.v[j].includes(v));
      if (shv.length >= 2) out.push([vertices.p[shv[0]], vertices.p[shv[1]]]);
    }
  return out;
}

const WIDTH = { main: 2, street: 1.4, lane: 0.9, path: 0.7, pier: 1.4 } as const;
const CODE = { path: 1, lane: 2, street: 3, main: 4, pier: 6 } as const;

/** Cell ids and the road plan (1 path, 2 lane, 3 street, 4 main, 5 wall, 6 pier, 7 square) as pixel grids */
export function rasterPlan(city: City) {
  const { W, H, pack, kind } = city;
  const { cells, vertices } = pack;
  const N = W * H;
  const CID = new Int32Array(N).fill(-1);
  const RD = new Uint8Array(N);
  for (let i = 0; i < cells.p.length; i++) {
    const q: P2[] = cells.v[i].map((v: number) => vertices.p[v]);
    let a = Infinity;
    let b = Infinity;
    let e = -Infinity;
    let f = -Infinity;
    for (const [x, y] of q) {
      a = Math.min(a, x);
      b = Math.min(b, y);
      e = Math.max(e, x);
      f = Math.max(f, y);
    }
    for (let y = Math.max(0, Math.floor(b)); y <= Math.min(H - 1, f); y++)
      for (let x = Math.max(0, Math.floor(a)); x <= Math.min(W - 1, e); x++)
        if (inPoly(q, x + 0.5, y + 0.5)) CID[y * W + x] = i;
  }
  const isWater = (j: number) => CID[j] < 0 || city.use[CID[j]] === "water";
  for (let j = 0; j < N; j++) if (CID[j] >= 0 && kind[CID[j]] === "square") RD[j] = 7;
  const line = (pts: P2[], w: number, fn: (x: number, y: number) => void) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [a, b] = [pts[k], pts[k + 1]];
      const steps = Math.ceil(dist(a, b) * 2) + 1;
      for (let s = 0; s <= steps; s++) {
        const x = a[0] + ((b[0] - a[0]) * s) / steps;
        const y = a[1] + ((b[1] - a[1]) * s) / steps;
        const r = Math.ceil(w);
        for (let v = -r; v <= r; v++)
          for (let u = -r; u <= r; u++)
            if (u * u + v * v <= w * w + 0.3) {
              const X = Math.round(x + u);
              const Y = Math.round(y + v);
              if (X >= 0 && Y >= 0 && X < W && Y < H) fn(X, Y);
            }
      }
    }
  };
  for (const r of city.roads) {
    const code = CODE[r.type];
    if (r.edges && r.type !== "pier")
      for (const [a, b] of r.edges)
        line([vertices.p[a], vertices.p[b]], WIDTH[r.type], (x, y) => {
          const j = y * W + x;
          if (!isWater(j) && RD[j] < code) RD[j] = code;
        });
  }
  for (const r of city.roads)
    if (r.type === "main")
      line(r.pts, WIDTH.main, (x, y) => {
        const j = y * W + x;
        if (RD[j] !== 7) RD[j] = isWater(j) ? 8 : 4; // 8: a bridge
      });
  for (const r of city.roads)
    if (r.type === "pier")
      line(r.pts, WIDTH.pier, (x, y) => {
        const j = y * W + x;
        if (!RD[j] || isWater(j)) RD[j] = 6;
      });
  for (const w of city.walls)
    line(w, 1.5, (x, y) => {
      const j = y * W + x;
      if (city.gates.some(g => Math.hypot(g[0] - x, g[1] - y) < 4.5)) return;
      if (!isWater(j)) RD[j] = 5;
    });
  return { CID, RD };
}

export function paint(city: City): Painted {
  const { W, H, pack, kind, use, home } = city;
  const N = W * H;
  const { CID, RD } = rasterPlan(city);
  const BID = new Int32Array(N);
  for (const b of city.buildings) {
    let a = Infinity;
    let bb = Infinity;
    let e = -Infinity;
    let f = -Infinity;
    for (const [x, y] of b.poly) {
      a = Math.min(a, x);
      bb = Math.min(bb, y);
      e = Math.max(e, x);
      f = Math.max(f, y);
    }
    for (let y = Math.max(0, Math.floor(bb)); y <= Math.min(H - 1, f); y++)
      for (let x = Math.max(0, Math.floor(a)); x <= Math.min(W - 1, e); x++)
        if (inPoly(b.poly, x + 0.5, y + 0.5) && CID[y * W + x] === b.cell && !RD[y * W + x]) BID[y * W + x] = b.id;
  }
  const water = (j: number) => CID[j] < 0 || use[CID[j]] === "water" || kind[CID[j]] === "pond";
  const WD = new Uint16Array(N).fill(999);
  {
    const q: number[] = [];
    for (let j = 0; j < N; j++)
      if (!water(j)) {
        WD[j] = 0;
        q.push(j);
      }
    for (let i = 0; i < q.length; i++) {
      const j = q[i];
      const x = j % W;
      const y = (j / W) | 0;
      for (const [u, v] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const X = x + u;
        const Y = y + v;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const k = Y * W + X;
        if (WD[k] > WD[j] + 1) {
          WD[k] = WD[j] + 1;
          q.push(k);
        }
      }
    }
  }
  const HD = new Uint16Array(N).fill(999); // distance from the home cell, for the fade
  {
    const q: number[] = [];
    for (let j = 0; j < N; j++)
      if (CID[j] >= 0 && home[CID[j]]) {
        HD[j] = 0;
        q.push(j);
      }
    for (let i = 0; i < q.length; i++) {
      const j = q[i];
      const x = j % W;
      const y = (j / W) | 0;
      for (const [u, v] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const X = x + u;
        const Y = y + v;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const k = Y * W + X;
        if (HD[k] > HD[j] + 1) {
          HD[k] = HD[j] + 1;
          q.push(k);
        }
      }
    }
  }
  const terrain = new ImageData(W, H);
  const map = new ImageData(W, H);
  const T = terrain.data;
  const Mp = map.data;
  const put = (D: Uint8ClampedArray, j: number, c: C3) => {
    D[j * 4] = c[0];
    D[j * 4 + 1] = c[1];
    D[j * 4 + 2] = c[2];
    D[j * 4 + 3] = 255;
  };
  const dq = ditherAt;
  const slab = (x: number, y: number): C3 => {
    // smooth stone: large slabs with faint joints
    const row = Math.floor(y / 5);
    const xo = x + (row & 1) * 3;
    if (y % 5 === 0 || xo % 6 === 0) return sh(P.stone3, 0.93);
    return dq(x, y) < 0.2 ? sh(P.stone3, 1.04) : P.stone3;
  };
  const street = (x: number, y: number): C3 => (dq(x, y) < 0.3 ? sh(P.cob3, 1.12) : sh(P.cob3, 1.18));
  const lane = (x: number, y: number): C3 => (dq(x, y) < 0.5 ? sh(P.dirt3, 1.25) : sh(P.dirt3, 1.18));
  const plank = (x: number, y: number): C3 => {
    const bd = Math.floor(y / 3);
    if (y % 3 === 0) return P.wood2;
    if ((x + bd * 7) % 11 === 0) return P.wood2;
    return bd & 1 ? P.wood : sh(P.wood, 1.12);
  };
  const MAPC = {
    paper: hex("#ece3cb"),
    block: hex("#ddd0b2"),
    street: hex("#f8f2e2"),
    kerb: hex("#a69676"),
    water: hex("#9fc4cc"),
    shore: hex("#6f97a1"),
    hatch: hex("#cdbf98"),
    wood: hex("#bfc694"),
    house: hex("#a99d8a"),
    edge: hex("#4a4036"),
    wall: hex("#4b433a"),
    pier: hex("#a98a62"),
    green: hex("#c7cf9f")
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const j = y * W + x;
      const ci = CID[j];
      const k = ci >= 0 ? (kind[ci] ?? use[ci]) : "water";
      let t: C3;
      let m: C3;
      if (water(j) || k === "pond") {
        const d = WD[j];
        t =
          d <= 1
            ? COAST.foam
            : d <= 3
              ? COAST.band
              : d < 12 || k === "pond"
                ? groundPixel("shallow", x, y)
                : groundPixel("sea", x, y);
        m = d <= 1 ? MAPC.shore : MAPC.water;
      } else {
        const a = city.ang[ci];
        const st = (((x * Math.cos(a) + y * Math.sin(a)) % 4) + 4) % 4;
        switch (k) {
          case "wheat":
            t = st < 2 ? P.field1 : P.field2;
            m = st < 1 ? MAPC.hatch : MAPC.paper;
            break;
          case "tilled":
            t = st < 2 ? P.dirt3 : P.dirt;
            m = st < 1 ? MAPC.hatch : MAPC.paper;
            break;
          case "pasture":
            t = st < 1 ? P.field3 : groundPixel("plains", x, y);
            m = MAPC.paper;
            break;
          case "woods":
            t = sh(WOODS[0], 1.1);
            m = MAPC.wood;
            break;
          case "centre":
          case "square":
            t = slab(x, y);
            m = k === "square" ? MAPC.street : MAPC.block;
            break;
          case "docks":
            t = plank(x, y);
            m = MAPC.block;
            break;
          case "shanty":
            t = dq(x, y) < 0.5 ? P.dirt3 : P.dirt;
            m = MAPC.block;
            break;
          case "wealthy":
          case "park":
            t = groundPixel("plains", x, y);
            m = MAPC.green;
            break;
          default:
            t = dq(x, y) < 0.35 ? sh(P.dirt3, 1.05) : groundPixel("plains", x, y);
            m = MAPC.block;
        }
      }
      const r = RD[j];
      if (r) {
        const kerb = [1, -1, W, -W].some(o => {
          const q = j + o;
          return q >= 0 && q < N && !RD[q] && !water(q);
        });
        if (r === 4 || r === 3 || r === 7) {
          t = r === 7 ? slab(x, y) : street(x, y);
          m = MAPC.street;
        } else if (r === 2 || r === 1) {
          t = lane(x, y);
          m = MAPC.street;
        } else if (r === 6 || r === 8) {
          t = plank(x, y);
          m = MAPC.pier;
        } else if (r === 5) {
          t = P.stone;
          m = MAPC.wall;
        }
        if (kerb && r !== 5 && r !== 6 && r !== 8 && r !== 7) {
          t = sh(t, 0.78);
          m = MAPC.kerb;
        }
      }
      put(T, j, t);
      put(Mp, j, m);
    }
  // shadows to the lower right, roofs lit from the upper left
  const castsShadow = (j: number) => BID[j] > 0 || RD[j] === 5;
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const j = y * W + x;
      if (castsShadow(j)) continue;
      for (let k2 = 1; k2 <= 2; k2++) {
        const X = x - k2;
        const Y = y - k2;
        if (X < 0 || Y < 0) break;
        if (castsShadow(Y * W + X)) {
          T[j * 4] *= 0.72;
          T[j * 4 + 1] *= 0.72;
          T[j * 4 + 2] *= 0.76;
          break;
        }
      }
    }
  const ROOF: Record<string, [RGB | C3, RGB | C3, RGB | C3]> = {
    slate: [P.slate3, P.slate, P.slate2],
    clay: [P.clay3, P.clay, P.clay2],
    thatch: [P.thatch3, P.thatch, P.thatch2],
    gold: [P.gold, P.gold2, sh(P.gold2, 0.7)],
    stone: [P.stone3, P.stone, P.stone2],
    timber: [sh(P.wood, 1.3), P.wood, P.wood2]
  };
  for (const b of city.buildings) {
    const pal = ROOF[b.roof] ?? ROOF.clay;
    const p = b.poly;
    const ux = p[1][0] - p[0][0];
    const uy = p[1][1] - p[0][1];
    const vx = p[3][0] - p[0][0];
    const vy = p[3][1] - p[0][1];
    const lu = Math.hypot(ux, uy);
    const lv = Math.hypot(vx, vy);
    const ink = TYPE_INK[b.type];
    let a = Infinity;
    let bb = Infinity;
    let e = -Infinity;
    let f = -Infinity;
    for (const [x, y] of p) {
      a = Math.min(a, x);
      bb = Math.min(bb, y);
      e = Math.max(e, x);
      f = Math.max(f, y);
    }
    for (let y = Math.max(0, Math.floor(bb)); y <= Math.min(H - 1, f); y++)
      for (let x = Math.max(0, Math.floor(a)); x <= Math.min(W - 1, e); x++) {
        const j = y * W + x;
        if (BID[j] !== b.id) continue;
        const px = x + 0.5 - p[0][0];
        const py = y + 0.5 - p[0][1];
        const u = (px * ux + py * uy) / lu;
        const v = (px * vx + py * vy) / lv;
        const along = lu >= lv;
        const tt = along ? v / lv : u / lu;
        const edge = [1, -1, W, -W].some(o => BID[j + o] !== b.id);
        const nX = along ? vx : ux;
        const nY = along ? vy : uy;
        const lit = tt < 0.5 === nX + nY > 0;
        let c = lit ? pal[0] : pal[1];
        if (!lit && dq(x, y) > 0.8) c = pal[2];
        if (b.roof === "timber" && Math.floor(along ? u : v) % 3 === 0) c = pal[2];
        if (Math.abs(tt - 0.5) < 0.5 / (along ? lv : lu) + 0.04) c = sh(pal[0] as C3, 1.06);
        if (edge) c = pal[2];
        put(T, j, c as C3);
        put(Mp, j, edge ? MAPC.edge : ink ? hex(ink) : MAPC.house);
      }
  }
  // towers
  for (const [tx, ty] of city.towers)
    for (let v = -3; v <= 3; v++)
      for (let u = -3; u <= 3; u++) {
        const r = u * u + v * v;
        if (r > 10) continue;
        const X = Math.round(tx + u);
        const Y = Math.round(ty + v);
        if (X < 0 || Y < 0 || X >= W || Y >= H || water(Y * W + X)) continue;
        put(T, Y * W + X, r > 6 ? P.stone2 : u + v < -1 ? P.stone3 : P.stone);
        put(Mp, Y * W + X, r > 6 ? MAPC.edge : MAPC.wall);
      }
  // trees: round crowns lit from the upper left with a dark rim and a shadow
  const trees = city.trees.slice().sort((a, b) => a[1] - b[1]);
  for (const [tx, ty, r] of trees) {
    for (let v = -r; v <= r; v++)
      for (let u = -r; u <= r; u++) {
        if (u * u + v * v > r * r + r * 0.6) continue;
        const X = tx + u + 2;
        const Y = ty + v + 2;
        if (X >= 0 && Y >= 0 && X < W && Y < H) {
          const k = (Y * W + X) * 4;
          T[k] *= 0.7;
          T[k + 1] *= 0.7;
          T[k + 2] *= 0.7;
        }
      }
    for (let v = -r; v <= r; v++)
      for (let u = -r; u <= r; u++) {
        const d2 = u * u + v * v;
        if (d2 > r * r + r * 0.6) continue;
        const X = tx + u;
        const Y = ty + v;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const rim = d2 > (r - 1) * (r - 1) + r * 0.6;
        let c = u + v < -r * 0.6 ? WOODS[4] : u + v < 0 ? WOODS[3] : u + v < r * 0.7 ? WOODS[2] : WOODS[1];
        if (rim && u + v >= 0) c = WOODS[0];
        put(T, Y * W + X, c);
        if (rim) put(Mp, Y * W + X, hex("#7d8a5a"));
        else put(Mp, Y * W + X, hex("#a9b67e"));
      }
  }
  // outside the home cell: land darker than water, deepening toward the view's edge
  for (let j = 0; j < N; j++) {
    if (!HD[j]) continue;
    const x = j % W;
    const y = (j / W) | 0;
    const ed = Math.min(x, y, W - 1 - x, H - 1 - y);
    const t = Math.min(0.78, 0.3 + HD[j] / 260 + Math.max(0, (24 - ed) / 24) * 0.35) * (water(j) ? 0.45 : 1);
    for (const D of [T, Mp]) {
      const k = j * 4;
      for (let i = 0; i < 3; i++) D[k + i] = D[k + i] * (1 - t) + 20 * t;
    }
  }
  void pack;
  return { terrain, map, CID, BID };
}
