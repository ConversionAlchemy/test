// Fills a city's blocks with terraced buildings and paints it twice: the pixel terrain view from the shared city tiles,
// and a flat map view for finding the way. Nothing here is tuned to one town: every cell paints by its kind
import { COAST, ditherAt, groundPixel } from "../ground-tiles";
import { Palette as P } from "../palette";
import type { Building, City, P2 } from "./city-gen";

type C3 = readonly [number, number, number];
const sh = (c: C3, f: number): C3 => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
const mix = (a: C3, b: C3, t: number): C3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];
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
const N4 = [1, 0, -1, 0, 0, 1, 0, -1];

// building tiers: frontage and depth ranges in pixels (about 1.3 m each)
const TIER: Record<string, [number, number, number, number]> = {
  hut: [3, 4, 3, 4],
  house: [5, 7, 7, 9],
  shop: [6, 8, 8, 10],
  hall: [9, 12, 11, 14],
  store: [10, 14, 12, 16]
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
  old: ["clay", "clay", "clay", "slate", "slate"],
  docks: ["timber", "timber", "slate", "clay"],
  shanty: ["thatch", "timber", "thatch", "clay"],
  farm: ["thatch", "thatch", "clay"]
};
export const TYPE_INK: Record<string, string> = {
  Bank: "#d6ac3c",
  Guardhouse: "#b8423a",
  Chapel: "#5f9a62",
  Temple: "#5f9a62",
  "Guild hall": "#4f7fb4",
  Tavern: "#d07a3a",
  Office: "#7b6aa8",
  Market: "#c9a04a",
  Landmark: "#8a6aa8"
};

export interface Painted {
  terrain: ImageData;
  map: ImageData;
  CID: Int32Array;
  BID: Int32Array;
}

/** The road plan as pixel grids: 1 track/path, 2 lane, 3 street, 4 main, 5 wall, 6 pier, 7 square, 8 bridge, 9 gate */
const WIDTH: Record<string, number> = { main: 2, street: 1.4, lane: 1, path: 0.7, track: 0.8, pier: 1.4 };
const CODE: Record<string, number> = { path: 1, track: 1, lane: 2, street: 3, main: 4, pier: 6 };
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
  const isWater = (j: number) => CID[j] < 0 || city.use[CID[j]] === "water" || kind[CID[j]] === "pond";
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
    if (r.type === "pier") continue;
    const code = CODE[r.type];
    const w = WIDTH[r.type];
    if (r.edges)
      for (const [a, b] of r.edges)
        line([vertices.p[a], vertices.p[b]], w, (x, y) => {
          const j = y * W + x;
          if (!isWater(j) && RD[j] < code) RD[j] = code;
        });
    else
      line(r.pts, w, (x, y) => {
        const j = y * W + x;
        if (RD[j] === 7) return;
        if (isWater(j)) RD[j] = code >= 3 ? 8 : RD[j];
        else if (RD[j] < code) RD[j] = code;
      });
  }
  for (const r of city.roads)
    if (r.type === "pier")
      line(r.pts, WIDTH.pier, (x, y) => {
        const j = y * W + x;
        if (!RD[j] || isWater(j)) RD[j] = 6;
      });
  for (const w of city.walls)
    line(w, 1.5, (x, y) => {
      const j = y * W + x;
      if (city.gates.some(g => Math.hypot(g.p[0] - x, g.p[1] - y) < 4.5)) return;
      if (!isWater(j)) RD[j] = 5;
    });
  // the road through each gate takes the gate's paving
  for (const g of city.gates)
    line([g.a, g.b], 2.2, (x, y) => {
      const j = y * W + x;
      if (RD[j] >= 2 && RD[j] <= 4 && Math.hypot(g.p[0] - x, g.p[1] - y) < 4.6) RD[j] = 9;
    });
  return { CID, RD };
}

export function furnish(city: City): void {
  const { W, H, pack, kind, use, district } = city;
  const { cells, vertices } = pack;
  const n = cells.p.length;
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
  const names = city.edits.names ?? {};
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
    const c = b.poly.length
      ? b.poly.reduce((q, p) => [q[0] + p[0] / b.poly.length, q[1] + p[1] / b.poly.length], [0, 0])
      : [0, 0];
    const key = b.key ?? `b:${b.cell}:${Math.round(c[0])}:${Math.round(c[1])}`;
    const nm = names[key];
    B.push({ ...b, id, key, name: nm ?? b.name });
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
        for (const q of r.pts) {
          const d = dist(p, q);
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
  const dname = (i: number) => city.districts.find(d => d.id === district[i])?.name ?? "";

  // landmarks: their cells less the streets round them, pulled in two pixels; they stand as one building
  const landCell = new Uint8Array(n);
  for (const l of city.landmarks) {
    const set = new Set(l.cells);
    for (const i of l.cells) landCell[i] = 1;
    const M = new Uint8Array(W * H);
    for (let j = 0; j < W * H; j++) if (set.has(CID[j]) && !RD[j]) M[j] = 1;
    for (let k = 0; k < 2; k++) {
      const drop: number[] = [];
      for (let j = 0; j < W * H; j++) {
        if (!M[j]) continue;
        const x = j % W;
        const y = (j / W) | 0;
        for (let q = 0; q < 8; q += 2) {
          const X = x + N4[q];
          const Y = y + N4[q + 1];
          if (X < 0 || Y < 0 || X >= W || Y >= H || !M[Y * W + X]) {
            drop.push(j);
            break;
          }
        }
      }
      for (const j of drop) M[j] = 0;
    }
    const px: number[] = [];
    for (let j = 0; j < W * H; j++) if (M[j]) px.push(j);
    if (px.length < 6) continue;
    const c0 = l.cells[0];
    place(
      {
        cell: c0,
        cells: l.cells,
        poly: [],
        type: l.type,
        roof: l.roof,
        name: l.name,
        addr: addrOf(cells.p[c0], dname(c0)),
        district: district[c0],
        landmark: true,
        key: `l:${l.id}`,
        enter: l.enter
      },
      px
    );
  }

  // street fronts: terraces along every edge of a block that has a road, both sides of a main road through it
  for (let i = 0; i < n; i++) {
    const k = kind[i];
    if (!k || k === "square" || k === "park" || k === "pond" || k === "shanty" || landCell[i]) continue;
    const q = poly(i);
    const mix0 = MIX[k];
    const wealthy = k === "wealthy";
    const fronts: { a: P2; b: P2; set: number }[] = [];
    for (let e = 0; e < q.length; e++) {
      const a = q[e];
      const b = q[(e + 1) % q.length];
      if (dist(a, b) < 6) continue;
      const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (roadNear(m, 2) || k === "old" || k === "centre" || k === "docks") fronts.push({ a, b, set: 0 });
    }
    for (const r of city.roads)
      if ((r.type === "main" || !r.edges) && r.cells?.includes(i))
        for (let t = 0; t < r.pts.length - 1; t++) {
          const a = r.pts[t];
          const b = r.pts[t + 1];
          const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          if (!inPoly(q, m[0], m[1])) continue;
          const st = (WIDTH[r.type] ?? 1) + 0.6;
          fronts.push({ a, b, set: st }, { a: b, b: a, set: st });
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
        const [tn, tt] = weighted(mix0);
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
              { cell: i, poly: pl, type: "Hut", roof: pick(ROOFS.shanty), addr: dname(i), district: district[i] },
              cl
            );
        }
  // farms: a farmhouse and barn at the end of each track, or a little hamlet round it
  for (const fm of city.farms) {
    const tr = city.roads.find(r => r.key === `t:${fm.cell}`);
    const c = cells.p[fm.cell] as P2;
    let a = city.ang[fm.cell];
    if (tr && tr.pts.length > 2) {
      const p = tr.pts[tr.pts.length - 3];
      a = Math.atan2(c[1] - p[1], c[0] - p[0]);
    }
    const tx = Math.cos(a);
    const ty = Math.sin(a);
    const spots: [number, number, number, number, string][] = [
      [3, -6, 6, 8, "Farmhouse"],
      [3, 4, 8, 5, "Barn"]
    ];
    for (let k = 1; k < fm.houses; k++) spots.push([-6 - k * 3, (k % 2 ? 1 : -1) * (5 + k), 5, 6, "Cottage"]);
    for (const [u, v, f, d, t] of spots) {
      const o: P2 = [c[0] + tx * u - ty * v, c[1] + ty * u + tx * v];
      const pl = rect(o, tx, ty, -ty, tx, f, d);
      const cl = free(pl, fm.cell);
      if (cl)
        place(
          {
            cell: fm.cell,
            poly: pl,
            type: t,
            roof: pick(ROOFS.farm),
            addr: fm.houses > 2 ? "Hamlet" : "Farmstead",
            district: -1
          },
          cl
        );
    }
  }
  // cottages along the main roads outside the walls
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
      const pl = rect([a[0] - ty * sg * 3.5, a[1] + tx * sg * 3.5], tx, ty, -ty * sg, tx * sg, 6, 8);
      const cl = free(pl, c);
      if (cl)
        place({ cell: c, poly: pl, type: "Cottage", roof: pick(ROOFS.farm), addr: r.name ?? "", district: -1 }, cl);
    }
  }
  // notables
  const nb = (type: string, name: string, f: (b: Building) => boolean) => {
    const L = B.filter(b => !b.name && !b.landmark && f(b));
    if (!L.length) return;
    const b = L[Math.floor(R() * L.length)];
    b.type = type;
    b.name = names[b.key ?? ""] ?? name;
  };
  const gate0 = city.gates[0]?.p;
  nb("Guardhouse", "The Watch House", b => !!gate0 && dist(b.poly[0], gate0) < 40 && b.type !== "Hut");
  nb("Guardhouse", "Harbour Watch", b => kind[b.cell] === "docks");
  nb("Chapel", "Chapel of the Ledger", b => kind[b.cell] === "wealthy");
  nb("Tavern", "The Gilded Anchor", b => kind[b.cell] === "docks" && b.type !== "Warehouse");
  nb("Tavern", "The Brass Scale", b => kind[b.cell] === "old");
  nb("Tavern", "The Sleeping Clerk", b => kind[b.cell] === "old");
  nb("Guild hall", "Hall of the Weigh-Masters", b => kind[b.cell] === "centre");
  nb("Office", "Harbourmaster", b => b.type === "Warehouse");
  city.buildings = B;

  // single trees: gardens, the park and along hedges; woods are ground, not trees
  const T: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const k = kind[i];
    const dens = k === "park" ? 0.75 : k === "wealthy" ? 0.22 : k === "old" ? 0.03 : 0;
    if (!dens) continue;
    for (let y = 0; y < H; y += 5)
      for (let x = 0; x < W; x += 5) {
        const jx = Math.round(x + (R() - 0.5) * 4);
        const jy = Math.round(y + (R() - 0.5) * 4);
        if (jx < 0 || jy < 0 || jx >= W || jy >= H) continue;
        const j = jy * W + jx;
        if (CID[j] !== i || OCC[j] || RD[j] || R() > dens) continue;
        T.push([jx, jy, 2]);
      }
  }
  for (const [a, b] of hedgeEdges(city)) {
    const L = dist(a, b);
    for (let t = 3; t < L - 2; t += 5 + R() * 7)
      if (R() < 0.55)
        T.push([Math.round(a[0] + ((b[0] - a[0]) * t) / L), Math.round(a[1] + ((b[1] - a[1]) * t) / L), 2]);
  }
  city.trees = T;
}

/** Edges between two farm cells of different crops */
export function hedgeEdges(city: City): [P2, P2][] {
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

// ---- the shared city tiles: every cell kind paints from these, in either view
const slab = (x: number, y: number): C3 => {
  const row = Math.floor(y / 5);
  const xo = x + (row & 1) * 3;
  if (y % 5 === 0 || xo % 6 === 0) return sh(P.stone3, 0.93);
  return ditherAt(x, y) < 0.2 ? sh(P.stone3, 1.04) : P.stone3;
};
const paving = (x: number, y: number): C3 => (ditherAt(x, y) < 0.3 ? sh(P.cob3, 1.12) : sh(P.cob3, 1.2));
const plank = (x: number, y: number): C3 => {
  const bd = Math.floor(y / 3);
  if (y % 3 === 0) return P.wood2;
  if ((x + bd * 7) % 11 === 0) return P.wood2;
  return bd & 1 ? P.wood : sh(P.wood, 1.12);
};
const stripe = (x: number, y: number, a: number, every = 4) =>
  (((x * Math.cos(a) + y * Math.sin(a)) % every) + every) % every;
const calm = (c: C3, t = 0.3): C3 => {
  const l = (c[0] + c[1] + c[2]) / 3;
  return sh(mix(c, [l, l, l], t), 1.05);
};
export function terrainTile(kind: string, x: number, y: number, a: number): C3 {
  switch (kind) {
    case "wheat":
      return calm(stripe(x, y, a) < 2 ? P.field1 : P.field2);
    case "tilled":
      return calm(stripe(x, y, a) < 2 ? P.dirt3 : sh(P.dirt3, 0.9));
    case "pasture":
      return calm(stripe(x, y, a, 6) < 1 ? P.field3 : groundPixel("plains", x, y));
    case "woods":
      return calm(groundPixel("woods", x, y), 0.15);
    case "centre":
    case "square":
      return slab(x, y);
    case "docks":
      return plank(x, y);
    case "shanty":
      return ditherAt(x, y) < 0.5 ? P.dirt3 : P.dirt;
    case "wealthy":
    case "park":
      return groundPixel("plains", x, y);
    case "old":
      return ditherAt(x, y) < 0.35 ? sh(P.dirt3, 1.08) : groundPixel("plains", x, y);
    default:
      return calm(groundPixel("plains", x, y));
  }
}
const MAPC = {
  paper: hex("#efe7d2"),
  block: hex("#e6dcc5"),
  green: hex("#d3dbb0"),
  wheat: hex("#ece0b4"),
  tilled: hex("#e0d1b0"),
  pasture: hex("#e3e6c7"),
  woods: hex("#bcc794"),
  woodsEdge: hex("#a2b07a"),
  hedge: hex("#a9b783"),
  road: hex("#fffaf0"),
  roadEdge: hex("#a39678"),
  laneEdge: hex("#cabd9f"),
  track: hex("#f3ead4"),
  water: hex("#a9cdd6"),
  shore: hex("#7aa5b0"),
  house: hex("#c27a54"),
  houseLine: hex("#a2603f"),
  houseEdge: hex("#7c4630"),
  wall: hex("#5a5046"),
  gate: hex("#c9a46a"),
  pier: hex("#b89670")
};
export function mapTile(kind: string): C3 {
  switch (kind) {
    case "wheat":
      return MAPC.wheat;
    case "tilled":
      return MAPC.tilled;
    case "pasture":
      return MAPC.pasture;
    case "woods":
      return MAPC.woods;
    case "wealthy":
    case "park":
      return MAPC.green;
    case "square":
      return MAPC.road;
    case "centre":
    case "old":
    case "docks":
    case "shanty":
      return MAPC.block;
    default:
      return MAPC.paper;
  }
}

export function paint(city: City): Painted {
  const { W, H, kind, use, home } = city;
  const N = W * H;
  const { CID, RD } = rasterPlan(city);
  const BID = new Int32Array(N);
  const landPx = new Map<number, number[]>();
  for (const b of city.buildings) {
    if (b.landmark) {
      // a landmark's pixels are kept by furnish in OCC order; rebuild them the same way
      continue;
    }
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
      for (let x = Math.max(0, Math.floor(a)); x <= Math.min(W - 1, e); x++) {
        const j = y * W + x;
        if (inPoly(b.poly, x + 0.5, y + 0.5) && CID[j] === b.cell && !RD[j] && !BID[j]) BID[j] = b.id;
      }
  }
  for (const b of city.buildings)
    if (b.landmark && b.cells) {
      const set = new Set(b.cells);
      const M = new Uint8Array(N);
      for (let j = 0; j < N; j++) if (set.has(CID[j]) && !RD[j]) M[j] = 1;
      for (let k = 0; k < 2; k++) {
        const drop: number[] = [];
        for (let j = 0; j < N; j++) {
          if (!M[j]) continue;
          const x = j % W;
          const y = (j / W) | 0;
          for (let q = 0; q < 8; q += 2) {
            const X = x + N4[q];
            const Y = y + N4[q + 1];
            if (X < 0 || Y < 0 || X >= W || Y >= H || !M[Y * W + X]) {
              drop.push(j);
              break;
            }
          }
        }
        for (const j of drop) M[j] = 0;
      }
      const px: number[] = [];
      for (let j = 0; j < N; j++)
        if (M[j]) {
          BID[j] = b.id;
          px.push(j);
        }
      landPx.set(b.id, px);
    }
  const water = (j: number) => CID[j] < 0 || use[CID[j]] === "water" || kind[CID[j]] === "pond";
  const bfs = (seed: (j: number) => boolean) => {
    const D = new Uint16Array(N).fill(999);
    const q: number[] = [];
    for (let j = 0; j < N; j++)
      if (seed(j)) {
        D[j] = 0;
        q.push(j);
      }
    for (let i = 0; i < q.length; i++) {
      const j = q[i];
      const x = j % W;
      const y = (j / W) | 0;
      for (let k = 0; k < 8; k += 2) {
        const X = x + N4[k];
        const Y = y + N4[k + 1];
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const o = Y * W + X;
        if (D[o] > D[j] + 1) {
          D[o] = D[j] + 1;
          q.push(o);
        }
      }
    }
    return D;
  };
  const WD = bfs(j => !water(j));
  const HD = bfs(j => CID[j] >= 0 && home[CID[j]] === 1);
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
  const kindAt = (j: number) => (CID[j] >= 0 ? (kind[CID[j]] ?? use[CID[j]]) : "water");
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const j = y * W + x;
      const ci = CID[j];
      const k = kindAt(j);
      let t: C3;
      let m: C3;
      if (water(j)) {
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
        t = terrainTile(k, x, y, city.ang[ci]);
        m = mapTile(k);
        // woods meet other ground with an edge in the map view and a shadow on the terrain
        if (k === "woods") {
          for (let q = 0; q < 8; q += 2) {
            const o = j + N4[q] + N4[q + 1] * W;
            if (o >= 0 && o < N && kindAt(o) !== "woods") {
              m = MAPC.woodsEdge;
              break;
            }
          }
        } else if (x > 1 && y > 1 && kindAt(j - W - 1) === "woods" && !water(j)) t = sh(t, 0.72);
        else if (x > 2 && y > 2 && kindAt(j - 2 * W - 2) === "woods" && !water(j)) t = sh(t, 0.85);
      }
      const r = RD[j];
      if (r) {
        const edge = (o: number) => o >= 0 && o < N && !RD[o] && !water(o);
        const kerb = edge(j + 1) || edge(j - 1) || edge(j + W) || edge(j - W);
        const inTown = ci >= 0 && (use[ci] === "town" || use[ci] === "shanty");
        if (r === 4 || r === 3 || r === 2) {
          t = inTown ? paving(x, y) : r >= 3 ? sh(P.cob3, 1.1) : sh(P.dirt3, 1.22);
          m = MAPC.road;
          if (kerb) {
            t = sh(t, 0.76);
            m = r >= 3 ? MAPC.roadEdge : MAPC.laneEdge;
          }
        } else if (r === 7) {
          t = slab(x, y);
          m = MAPC.road;
        } else if (r === 1) {
          t = ditherAt(x, y) < 0.5 ? sh(P.dirt3, 1.25) : sh(P.dirt3, 1.15);
          m = kerb ? MAPC.laneEdge : MAPC.track;
        } else if (r === 6 || r === 8) {
          t = plank(x, y);
          m = MAPC.pier;
        } else if (r === 5) {
          t = P.stone;
          m = MAPC.wall;
        } else if (r === 9) {
          t = (x + y) % 3 === 0 ? P.stone2 : P.stone;
          m = MAPC.gate;
        }
      }
      put(T, j, t);
      put(Mp, j, m);
    }
  // hedges in the map view
  for (const [a, b] of hedgeEdges(city)) {
    const L = dist(a, b);
    for (let s = 0; s <= L; s += 0.5) {
      const X = Math.round(a[0] + ((b[0] - a[0]) * s) / L);
      const Y = Math.round(a[1] + ((b[1] - a[1]) * s) / L);
      if (X >= 0 && Y >= 0 && X < W && Y < H && !RD[Y * W + X]) put(Mp, Y * W + X, MAPC.hedge);
    }
  }
  // shadows to the lower right
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
  // roofs lit from the upper left: a ridge along a block's length, a hip on a landmark of any shape
  const ROOF: Record<string, [C3, C3, C3]> = {
    slate: [P.slate3, P.slate, P.slate2],
    clay: [P.clay3, P.clay, P.clay2],
    thatch: [P.thatch3, P.thatch, P.thatch2],
    gold: [P.gold, P.gold2, sh(P.gold2, 0.7)],
    stone: [P.stone3, P.stone, P.stone2],
    timber: [sh(P.wood, 1.3), P.wood, P.wood2]
  };
  for (const b of city.buildings) {
    const pal = ROOF[b.roof] ?? ROOF.clay;
    const ink = TYPE_INK[b.type];
    const mapFill = ink ? hex(ink) : MAPC.house;
    const mapEdge = ink ? sh(hex(ink), 0.6) : MAPC.houseEdge;
    const paintPx = (j: number, c: C3) => {
      const x = j % W;
      const y = (j / W) | 0;
      let outer = false;
      let inner = false;
      for (let q = 0; q < 8; q += 2) {
        const X = x + N4[q];
        const Y = y + N4[q + 1];
        const o = X < 0 || Y < 0 || X >= W || Y >= H ? 0 : BID[Y * W + X];
        if (!o) outer = true;
        else if (o !== b.id) inner = true;
      }
      put(T, j, outer || inner ? pal[2] : c);
      // the map view joins a terrace into one block: a thin line between houses, a dark edge only round the block
      put(Mp, j, outer ? mapEdge : inner && !ink ? MAPC.houseLine : mapFill);
    };
    if (b.landmark) {
      const px = landPx.get(b.id) ?? [];
      const set = new Set(px);
      const D = new Map<number, number>();
      for (const j of px) {
        let d = 0;
        for (let r = 1; r < 12; r++) {
          const x = j % W;
          const y = (j / W) | 0;
          let hit = false;
          for (let v = -r; v <= r && !hit; v++)
            for (let u = -r; u <= r && !hit; u++)
              if (Math.max(Math.abs(u), Math.abs(v)) === r && !set.has((y + v) * W + x + u)) hit = true;
          if (hit) break;
          d = r;
        }
        D.set(j, d);
      }
      for (const j of px) {
        const d = D.get(j) ?? 0;
        const up = Math.min(D.get(j - W) ?? -1, D.get(j - 1) ?? -1);
        const dn = Math.min(D.get(j + W) ?? -1, D.get(j + 1) ?? -1);
        // a hip roof: the slopes facing up and left catch the light, the ridge runs where both sides meet
        let c = up < dn ? pal[0] : up > dn ? pal[1] : d > 0 ? sh(pal[0], 1.06) : pal[1];
        if (b.roof === "gold" && ditherAt(j % W, (j / W) | 0) > 0.88) c = pal[0];
        paintPx(j, c);
      }
      continue;
    }
    const p = b.poly;
    const ux = p[1][0] - p[0][0];
    const uy = p[1][1] - p[0][1];
    const vx = p[3][0] - p[0][0];
    const vy = p[3][1] - p[0][1];
    const lu = Math.hypot(ux, uy);
    const lv = Math.hypot(vx, vy);
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
        const nX = along ? vx : ux;
        const nY = along ? vy : uy;
        const lit = tt < 0.5 === nX + nY > 0;
        let c = lit ? pal[0] : pal[1];
        if (!lit && ditherAt(x, y) > 0.8) c = pal[2];
        if (b.roof === "timber" && Math.floor(along ? u : v) % 3 === 0) c = pal[2];
        if (Math.abs(tt - 0.5) < 0.5 / (along ? lv : lu) + 0.04) c = sh(pal[0], 1.06);
        paintPx(j, c);
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
        put(Mp, Y * W + X, r > 6 ? sh(MAPC.wall, 0.7) : MAPC.wall);
      }
  // single trees: small crowns with a shadow, terrain only
  const trees = city.trees.slice().sort((a, b) => a[1] - b[1]);
  for (const [tx, ty, r] of trees) {
    for (let v = -r; v <= r; v++)
      for (let u = -r; u <= r; u++) {
        if (u * u + v * v > r * r + r * 0.6) continue;
        const X = tx + u + 1;
        const Y = ty + v + 1;
        if (X >= 0 && Y >= 0 && X < W && Y < H) {
          const k = (Y * W + X) * 4;
          T[k] *= 0.72;
          T[k + 1] *= 0.72;
          T[k + 2] *= 0.72;
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
        let c = u + v < -r * 0.5 ? WOODS[4] : u + v < 0.5 ? WOODS[3] : WOODS[2];
        if (rim && u + v > 0) c = WOODS[1];
        put(T, Y * W + X, c);
      }
  }
  // outside the home cell: terrain darkens, the map pales, both deepening toward the view's edge
  const fadeTo = hex("#d6cdb6");
  for (let j = 0; j < N; j++) {
    if (!HD[j]) continue;
    const x = j % W;
    const y = (j / W) | 0;
    const ed = Math.min(x, y, W - 1 - x, H - 1 - y);
    const t = Math.min(0.78, 0.3 + HD[j] / 260 + Math.max(0, (24 - ed) / 24) * 0.35);
    const k = j * 4;
    const tw = t * (water(j) ? 0.45 : 1);
    for (let i = 0; i < 3; i++) T[k + i] = T[k + i] * (1 - tw) + 20 * tw;
    for (let i = 0; i < 3; i++) Mp[k + i] = Mp[k + i] * (1 - t * 0.7) + fadeTo[i] * t * 0.7;
  }
  return { terrain, map, CID, BID };
}
