// Fills a city's blocks with lots and paints its ground: the plan washes the Terrain and Map views draw on,
// and the district and faction washes over it. Nothing here is tuned to one town: every cell paints by its kind
import { groundPixel } from "../ground-tiles";
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
    ["House", "house", 8],
    ["Shop", "shop", 2],
    ["House", "house", 4]
  ],
  docks: [
    ["Warehouse", "store", 5],
    ["Workshop", "shop", 3],
    ["Shed", "shop", 1],
    ["Chandlery", "shop", 1]
  ],
  stores: [
    ["Warehouse", "store", 5],
    ["Workshop", "shop", 3],
    ["Granary", "store", 2],
    ["Shed", "shop", 1]
  ],
  shanty: [
    ["Hut", "hut", 3],
    ["Shack", "hut", 2],
    ["House", "house", 1]
  ]
};
const ROOFS: Record<string, string[]> = {
  centre: ["slate", "slate", "stone", "clay"],
  wealthy: ["slate", "slate", "clay"],
  old: ["clay", "clay", "clay", "slate", "slate"],
  docks: ["slate", "slate", "timber", "clay"],
  shanty: ["timber", "clay", "timber", "slate"],
  farm: ["clay", "clay", "slate", "timber"]
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

// soft watercolour washes, one per district
export const DIST_COL = ["#e6b8a8", "#a9c4e4", "#b5d6b9", "#ead39c", "#c9b6e0", "#f0c2cf", "#a6d4d2", "#d9c3a5"];
export interface Painted {
  terrain: ImageData;
  map: ImageData;
  districts: ImageData;
  factions: ImageData;
  CID: Int32Array;
  BID: Int32Array;
  /** Flat ground colour per home land cell and view, drawn as vector shapes */
  cellCol: Record<"terrain" | "map" | "districts" | "factions", (C3 | null)[]>;
  /** Woods dots, drawn again over the vector ground */
  dots: P2[];
}

/** The road plan as pixel grids: 1 track/path, 2 lane, 3 street, 4 main, 5 wall, 6 pier, 7 square, 8 bridge, 9 gate */
const WIDTH: Record<string, number> = { main: 2, street: 1.4, lane: 1, path: 0.7, track: 0.8, pier: 1.4 };
const CODE: Record<string, number> = { path: 1, track: 1, lane: 2, street: 3, main: 4, pier: 6 };
function rasterPlan(city: City) {
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
  city.yards = [];
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
        // never over a road; loose only about the cell's edge and neighbours
        if (RD[j] && RD[j] !== 5) return null;
        if (CID[j] !== cid || RD[j] || OCC[j]) {
          if (strict) return null;
          continue;
        }
        out.push(j);
      }
    return out.length > 5 ? out : null;
  };
  const place = (b: Omit<Building, "id">, cl: number[]) => {
    if (!city.home[b.cell]) return;
    // the plan draws each outline whole, so one that would lie over a building already standing is not built
    if (b.poly.length > 2) {
      let hit = 0;
      const xs = b.poly.map(q => q[0]);
      const ys = b.poly.map(q => q[1]);
      for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.max(...ys)); y++)
        for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(W - 1, Math.max(...xs)); x++)
          if (OCC[y * W + x] && inPoly(b.poly, x + 0.5, y + 0.5)) hit++;
      if (hit > 1) return;
    }
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
  // the named street nearest the lot, measured to the road itself, not its corners
  const streetOf = (p: P2) => {
    let best: string | undefined;
    let bd = Infinity;
    for (const r of city.roads) {
      if (!r.name || r.type === "pier") continue;
      for (let k = 1; k < r.pts.length; k++) {
        const [a, b] = [r.pts[k - 1], r.pts[k]];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        const d = Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
        if (d < bd) {
          bd = d;
          best = r.name;
        }
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
  // ---- lots. Each urban cell, pulled in from the road on every side, holds one ring of lots round a yard:
  // side lots are true rectangles square to their side, the corners one building each (4-6 corners), and the
  // only gap is the middle lot of a long side, the way into the yard. Too small for a yard: built across in strips
  const area2 = (pl: P2[]) => {
    let A = 0;
    for (let k = 0; k < pl.length; k++) {
      const [a, b] = [pl[k], pl[(k + 1) % pl.length]];
      A += a[0] * b[1] - b[0] * a[1];
    }
    return A;
  };
  // the pixels a building covers, for hover and painting
  const pixelsOf = (pl: P2[]) => {
    let a = Infinity;
    let b = Infinity;
    let e = -Infinity;
    let f = -Infinity;
    for (const [x, y] of pl) {
      a = Math.min(a, x);
      b = Math.min(b, y);
      e = Math.max(e, x);
      f = Math.max(f, y);
    }
    const out: number[] = [];
    for (let y = Math.max(0, Math.floor(b)); y <= Math.min(H - 1, f); y++)
      for (let x = Math.max(0, Math.floor(a)); x <= Math.min(W - 1, e); x++)
        if (inPoly(pl, x + 0.5, y + 0.5) && !OCC[y * W + x]) out.push(y * W + x);
    return out;
  };
  const LOT_KINDS = new Set(["centre", "old", "docks", "wealthy", "shanty"]);
  const lotCell = (i: number) => i < n && city.home[i] === 1 && !landCell[i] && LOT_KINDS.has(kind[i] as string);
  const HALF: Record<string, number> = { main: 2.3, street: 1.6, lane: 1.1, path: 1, track: 1.1, wall: 2 };
  const ek = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const edgeType = new Map<string, string>();
  const RANK: Record<string, number> = { main: 4, street: 3, lane: 2, track: 1, path: 1 };
  for (const r of city.roads)
    for (const [a, b] of r.edges ?? []) {
      const k = ek(a, b);
      if ((RANK[r.type] ?? 0) > (RANK[edgeType.get(k) ?? ""] ?? 0)) edgeType.set(k, r.type);
    }
  for (const k of city.wallEdges ?? []) if (!edgeType.has(k)) edgeType.set(k, "wall");
  // a polygon pulled in by its own amount on each side (positive inward for area2 > 0)
  const offsetBy = (P: P2[], off: number[]): P2[] => {
    const m = P.length;
    const lines = P.map((a, e) => {
      const b = P[(e + 1) % m];
      const L = dist(a, b) || 1;
      const nx = -(b[1] - a[1]) / L;
      const ny = (b[0] - a[0]) / L;
      return { a: [a[0] + nx * off[e], a[1] + ny * off[e]] as P2, dx: (b[0] - a[0]) / L, dy: (b[1] - a[1]) / L };
    });
    return P.map((_, e) => {
      const l1 = lines[(e + m - 1) % m];
      const l2 = lines[e];
      const den = l1.dx * l2.dy - l1.dy * l2.dx;
      if (Math.abs(den) < 1e-3) return l2.a;
      const t = ((l2.a[0] - l1.a[0]) * l2.dy - (l2.a[1] - l1.a[1]) * l2.dx) / den;
      return [l1.a[0] + l1.dx * t, l1.a[1] + l1.dy * t] as P2;
    });
  };
  // an offset is good while every side keeps its direction and the shape keeps its area
  const sameWay = (P: P2[], Q: P2[]) =>
    area2(Q) > 0 &&
    P.every((a, e) => {
      const b = P[(e + 1) % P.length];
      const c = Q[e];
      const d = Q[(e + 1) % Q.length];
      return (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]) > 0;
    });
  // the part of a convex polygon on the inner side of a line through o with normal nv
  const keepSide = (P: P2[], o: P2, nv: P2): P2[] => {
    const sd = (p: P2) => (p[0] - o[0]) * nv[0] + (p[1] - o[1]) * nv[1];
    const out: P2[] = [];
    for (let k = 0; k < P.length; k++) {
      const S = P[k];
      const E = P[(k + 1) % P.length];
      const ds = sd(S);
      const de = sd(E);
      if (ds >= 0) out.push(S);
      if (ds >= 0 !== de >= 0) {
        const t = ds / (ds - de);
        out.push([S[0] + (E[0] - S[0]) * t, S[1] + (E[1] - S[1]) * t]);
      }
    }
    return out.length >= 3 ? out : [];
  };
  // a lot's shape: 4 corners for side lots, up to 6 for corner lots, none sharper than 50 or wider than 140 degrees
  const shapeOk = (P: P2[], maxCorners: number, lo = 50, hi = 140) => {
    const Q = P.filter((p, k) => dist(p, P[(k + 1) % P.length]) > 0.2);
    if (Q.length < 4 || Q.length > maxCorners || area2(Q) <= 0) return false;
    return Q.every((b, k) => {
      const a = Q[(k + Q.length - 1) % Q.length];
      const c = Q[(k + 1) % Q.length];
      const u = [a[0] - b[0], a[1] - b[1]];
      const v = [c[0] - b[0], c[1] - b[1]];
      const deg =
        (Math.acos(
          Math.max(
            -1,
            Math.min(1, (u[0] * v[0] + u[1] * v[1]) / ((Math.hypot(u[0], u[1]) || 1) * (Math.hypot(v[0], v[1]) || 1)))
          )
        ) *
          180) /
        Math.PI;
      return deg >= lo && deg <= hi;
    });
  };
  // wealth sets the lots: frontage width, depth, how often a long side opens into its yard, and the set-back
  const WEALTH: Record<number, { w: number; d: number; gapP: number; set: number }> = {
    1: { w: 3.4, d: 5.5, gapP: 0.5, set: 0 },
    2: { w: 5, d: 9, gapP: 0.35, set: 0 },
    3: { w: 6.5, d: 11, gapP: 0.3, set: 0 },
    4: { w: 7, d: 14, gapP: 0.1, set: 0 },
    5: { w: 10, d: 12, gapP: 0, set: 1 }
  };
  const COMMERCE = ["Shop", "Shop", "Inn", "Tavern", "Shop"];
  // what lies beyond a side: its road, or what the cell meets there
  const beyond = (i: number, va: number, vb: number) => {
    const t = edgeType.get(ek(va, vb));
    const o = vertices.c[va].find((c: number) => c !== i && vertices.c[vb].includes(c));
    const ok = o !== undefined && o < n;
    if (ok && kind[o] === "square") return { off: (t ? HALF[t] : 0) + 0.35, face: "square" };
    if (t) return { off: HALF[t] + 0.35, face: t };
    if (!ok || use[o] === "water") return { off: 1.7, face: "quay" };
    return { off: 0.6, face: "lane" };
  };
  for (let i = 0; i < n; i++) {
    if (!lotCell(i)) continue;
    let vs: number[] = (cells.v[i] as number[]).filter(
      (v, e, a) => dist(vertices.p[v], vertices.p[a[(e + 1) % a.length]]) > 0.4
    );
    if (vs.length < 3) continue;
    let P = vs.map(v => vertices.p[v] as P2);
    if (area2(P) < 0) {
      P = P.reverse();
      vs = vs.reverse();
    }
    // a corner within 30 degrees of straight is no corner: its two sides become one (the road beyond is the same)
    for (let pass = 0; pass < 3 && vs.length > 3; pass++) {
      const k = P.findIndex((b, q) => {
        const a = P[(q + P.length - 1) % P.length];
        const c = P[(q + 1) % P.length];
        const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        return Math.abs(Math.atan2(Math.sin(t2 - t1), Math.cos(t2 - t1))) < (30 * Math.PI) / 180;
      });
      if (k < 0) break;
      P.splice(k, 1);
      vs.splice(k, 1);
    }
    const sides = vs.map((v, e) => beyond(i, v, vs[(e + 1) % vs.length]));
    const Q = offsetBy(
      P,
      sides.map(sd => sd.off)
    );
    if (!sameWay(P, Q) || area2(Q) < 20) continue;
    const m = Q.length;
    const k = kind[i] as string;
    const wealth = city.districts.find(d => d.id === district[i])?.wealth ?? 2;
    const spec = WEALTH[wealth];
    const docks = k === "docks";
    const build = (pl: P2[], face: string, front?: [P2, P2], as?: string) => {
      let h = pl;
      if (as) {
        // drawn to measure by the caller
      } else if (spec.set && !front) {
        // a corner house stands in the middle of its garden
        const cx = pl.reduce((q, p) => q + p[0], 0) / pl.length;
        const cy = pl.reduce((q, p) => q + p[1], 0) / pl.length;
        h = pl.map(p => [cx + (p[0] - cx) * 0.55, cy + (p[1] - cy) * 0.55] as P2);
      } else if (spec.set && front) {
        // a house standing back in its garden, square to its road
        const [a, b] = front;
        const L = dist(a, b) || 1;
        const u: P2 = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
        const nv: P2 = [-u[1], u[0]];
        const w = Math.min(L * 0.7, 8);
        const d = Math.min(6, spec.d * 0.6);
        const o: P2 = [a[0] + u[0] * (L - w) * 0.5 + nv[0] * spec.set, a[1] + u[1] * (L - w) * 0.5 + nv[1] * spec.set];
        h = rect(o, u[0], u[1], nv[0], nv[1], w, d);
      }
      const cl = pixelsOf(h);
      // the plan draws the outline itself, so a house that would overlap one already standing is not built
      if (!cl.length || cl.length < (Math.abs(area2(h)) / 2) * 0.8) return;
      const shop = (face === "main" || face === "square") && wealth >= 2;
      const type =
        as && as !== "lot"
          ? as
          : shop
            ? pick(COMMERCE)
            : face === "quay" && docks
              ? "Warehouse"
              : weighted(MIX[docks && !city.port ? "stores" : k])[0];
      const at: P2 = [h.reduce((q, p) => q + p[0], 0) / h.length, h.reduce((q, p) => q + p[1], 0) / h.length];
      place(
        {
          cell: i,
          poly: h,
          type,
          trade: shop,
          roof: pick(ROOFS[k]),
          addr: addrOf(at, dname(i)),
          district: district[i]
        },
        cl
      );
    };
    // the inner line: the plot pulled in by the house depth, shallower if the cell is small
    // the house depth, never more than the cell can hold with a yard behind
    const cx = Q.reduce((q, p) => q + p[0], 0) / m;
    const cy = Q.reduce((q, p) => q + p[1], 0) / m;
    let inr = Infinity;
    for (let e = 0; e < m; e++) {
      const [a, b] = [Q[e], Q[(e + 1) % m]];
      inr = Math.min(inr, Math.abs((b[0] - a[0]) * (a[1] - cy) - (a[0] - cx) * (b[1] - a[1])) / (dist(a, b) || 1));
    }
    let I: P2[] | null = null;
    for (const f of [0.62, 0.5, 0.4]) {
      const d = Math.min(spec.d * (docks ? 1.25 : 1), spec.w * 2.2, inr * f);
      if (d < 3.2) break;
      const J = offsetBy(
        Q,
        Q.map(() => d)
      );
      if (sameWay(Q, J) && area2(J) / 2 > spec.w * spec.w * (spec.set ? 0.4 : 2)) {
        I = J;
        break;
      }
    }
    if (!I) {
      // no yard: strips straight across, square to the plot's longest side
      let lo = 0;
      let bi = 0;
      for (let e = 0; e < m; e++) {
        const L = dist(Q[e], Q[(e + 1) % m]);
        if (L > lo) {
          lo = L;
          bi = e;
        }
      }
      const a = Q[bi];
      const u: P2 = [(Q[(bi + 1) % m][0] - a[0]) / lo, (Q[(bi + 1) % m][1] - a[1]) / lo];
      let s0 = Infinity;
      let s1 = -Infinity;
      for (const p of Q) {
        const s = (p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1];
        s0 = Math.min(s0, s);
        s1 = Math.max(s1, s);
      }
      // back to back: rows from each long side meet at a shared wall down the middle
      const nv: P2 = [-u[1], u[0]];
      const mid: P2 = [Q.reduce((q, p) => q + p[0], 0) / m, Q.reduce((q, p) => q + p[1], 0) / m];
      const count = Math.max(1, Math.round((s1 - s0) / spec.w));
      const w = (s1 - s0) / count;
      for (let c = 0; c < count; c++) {
        let pc = keepSide(Q, [a[0] + u[0] * (s0 + c * w), a[1] + u[1] * (s0 + c * w)], u);
        pc = keepSide(pc, [a[0] + u[0] * (s0 + (c + 1) * w), a[1] + u[1] * (s0 + (c + 1) * w)], [-u[0], -u[1]]);
        for (const half of [keepSide(pc, mid, nv), keepSide(pc, mid, [-nv[0], -nv[1]])])
          if (half.length && shapeOk(half, 6, 35, 150))
            build(half, sides[bi].face, undefined, spec.set ? "lot" : undefined);
      }
      continue;
    }
    const inner = I;
    let open = !!spec.set || wealth === 1;
    // each side: where the inner corners fall on it
    const sideAt = Q.map((a, e) => {
      const b = Q[(e + 1) % m];
      const L = dist(a, b) || 1;
      const u: P2 = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
      const proj = (p: P2) => (p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1];
      return { a, u, s0: proj(inner[e]), s1: proj(inner[(e + 1) % m]) };
    });
    const on = (e: number, s: number): P2 => [sideAt[e].a[0] + sideAt[e].u[0] * s, sideAt[e].a[1] + sideAt[e].u[1] * s];
    const onIn = (e: number, s: number): P2 => [
      inner[e][0] + sideAt[e].u[0] * (s - sideAt[e].s0),
      inner[e][1] + sideAt[e].u[1] * (s - sideAt[e].s0)
    ];
    // a side too short for one lot joins the corner lot before it
    const short = sideAt.map(sa => sa.s1 - sa.s0 < spec.w * 0.75);
    for (let e = 0; e < m; e++) {
      const p = (e + m - 1) % m;
      if (short[p] && p !== e) continue; // this corner was taken by the corner before
      // corner lot at Q[e]: from the last foot on the side before, round the corner, to this side's first foot
      const ring: P2[] = [on(p, sideAt[p].s1), Q[e]];
      let end = e;
      ring.push(on(e, sideAt[e].s0));
      while (short[end] && ring.length < 6) {
        ring.push(Q[(end + 1) % m]);
        end = (end + 1) % m;
        ring.push(on(end, sideAt[end].s0));
        if (end === p) break;
      }
      ring.push(inner[end]);
      for (let q = end; q !== e; q = (q + m - 1) % m) ring.push(inner[q]);
      const face = sides[p].face === "main" || sides[e].face === "main" ? "main" : sides[e].face;
      let span = 0;
      for (const a of ring) for (const b of ring) span = Math.max(span, dist(a, b));
      const dd = dist(Q[e], inner[e]);
      if (!spec.set && shapeOk(ring, 6, 35, 150) && span <= Math.max(dd * 2.2, spec.w * 2.5)) build(ring, face);
      else open = true;
    }
    // the rich: plots of mixed width, the house hard on the street with its garden behind; now and then two plots
    // are one great house
    if (spec.set)
      for (let e = 0; e < m; e++) {
        // the whole street side is frontage; a house already at the corner keeps it
        const s0 = 0.3;
        const s1 = dist(Q[e], Q[(e + 1) % m]) - 0.3;
        const plots: [number, number][] = [];
        for (let t = s0; t < s1 - spec.w * 0.4; ) {
          let w = spec.w * (0.75 + R() * 0.6);
          if (s1 - (t + w) < spec.w * 0.5) w = s1 - t;
          plots.push([t, t + w]);
          t += w;
        }
        for (let c = 0; c < plots.length; c++) {
          let [t0, t1] = plots[c];
          let great = false;
          if (c + 1 < plots.length && R() < 0.28) {
            t1 = plots[++c][1];
            great = true;
          }
          const L = t1 - t0;
          const hw = L * (great ? 0.8 + R() * 0.15 : 0.66 + R() * 0.26);
          const a0 = t0 + (L - hw) * R();
          const f0 = on(e, a0);
          const f1 = on(e, a0 + hw);
          const nv: P2 = [-sideAt[e].u[1], sideAt[e].u[0]];
          // deep enough to read as a great house, never past the middle of the plot
          let hd = Math.min(inr * 0.75, great ? 8 + R() * 4 : 6 + R() * 4);
          for (let tries = 0; tries < 3 && hd >= 3.5; tries++, hd *= 0.75) {
            const house: P2[] = [
              f0,
              f1,
              [f1[0] + nv[0] * hd, f1[1] + nv[1] * hd],
              [f0[0] + nv[0] * hd, f0[1] + nv[1] * hd]
            ];
            if (
              !shapeOk(house, 4, 35, 150) ||
              !house.every(q => inPoly(Q, q[0], q[1]) || dist(q, f0) < 0.1 || dist(q, f1) < 0.1)
            )
              continue;
            // clear of the houses already standing
            if (pixelsOf(house).length < (Math.abs(area2(house)) / 2) * 0.85) continue;
            build(house, sides[e].face, [f0, f1], great ? "Mansion" : "lot");
            break;
          }
        }
      }
    for (let e = 0; e < m; e++) {
      if (short[e] || spec.set) continue;
      const { s0, s1 } = sideAt[e];
      const count = Math.max(1, Math.round((s1 - s0) / spec.w));
      const w = (s1 - s0) / count;
      // the way into the yard, always the middle lot
      const gap = count >= 3 && R() < spec.gapP ? Math.floor(count / 2) : -1;
      if (gap >= 0) open = true;
      for (let c = 0; c < count; c++) {
        if (c === gap) continue;
        // in the stores quarter, two to four lots in a row are now and then one factory
        let span = 1;
        if (docks && R() < 0.3) {
          span = 2 + Math.floor(R() * 3);
          while (span > 1 && (c + span > count || (gap >= c && gap < c + span))) span--;
        }
        const t0 = s0 + c * w;
        const t1 = t0 + w * span;
        const lot: P2[] = [on(e, t0), on(e, t1), onIn(e, t1), onIn(e, t0)];
        build(lot, sides[e].face, [lot[0], lot[1]], span > 1 ? "Factory" : undefined);
        c += span - 1;
      }
    }
    if (!open) city.yards.push(inner);
    // the poorest pack their yards with shacks in rows, square to the cell's first side
    if (wealth === 1) {
      const u = sideAt[0].u;
      const nv: P2 = [-u[1], u[0]];
      let u0 = Infinity;
      let u1 = -Infinity;
      let v0 = Infinity;
      let v1 = -Infinity;
      for (const q of inner) {
        const a = q[0] * u[0] + q[1] * u[1];
        const b = q[0] * nv[0] + q[1] * nv[1];
        u0 = Math.min(u0, a);
        u1 = Math.max(u1, a);
        v0 = Math.min(v0, b);
        v1 = Math.max(v1, b);
      }
      const at = (a: number, b: number): P2 => [u[0] * a + nv[0] * b, u[1] * a + nv[1] * b];
      for (let b = v0 + 0.8; b < v1 - 3; b += 4.4)
        for (let a = u0 + 0.8; a < u1 - 3; a += 4) {
          if (R() < 0.2) continue;
          const sq = [at(a, b), at(a + 3.2, b), at(a + 3.2, b + 3.6), at(a, b + 3.6)];
          if (sq.every(q => inPoly(inner, q[0], q[1]))) build(sq, "lane");
        }
    }
  }
  // houses strung out along the main roads beyond the town, thinning with distance
  {
    const townPx = (j: number) => CID[j] >= 0 && (use[CID[j]] === "town" || use[CID[j]] === "shanty");
    for (const r of city.roads) {
      if (r.type !== "main") continue;
      let out = 0;
      for (let t = 0; t < r.pts.length - 1; t++) {
        const a = r.pts[t];
        const b = r.pts[t + 1];
        const L = dist(a, b);
        if (L < 0.5) continue;
        const j = Math.round(a[1]) * W + Math.round(a[0]);
        if (townPx(j)) {
          out = 0;
          continue;
        }
        out += L;
        const tx = (b[0] - a[0]) / L;
        const ty = (b[1] - a[1]) / L;
        for (const sg of [1, -1]) {
          if (R() > Math.exp(-out / 120) * 0.55) continue;
          const nx = -ty * sg;
          const ny = tx * sg;
          const w = 4 + R() * 3;
          const d = 6 + R() * 3;
          const o: P2 = [a[0] + nx * 3.4, a[1] + ny * 3.4];
          const pl =
            sg > 0 ? rect(o, tx, ty, nx, ny, w, d) : rect([o[0] + tx * w, o[1] + ty * w], -tx, -ty, nx, ny, w, d);
          // clear of the town wall
          if (city.walls.some(wl => wl.some(q => pl.some(p => dist(p, q) < 7)))) continue;
          const cl = pixelsOf(pl);
          const fine = (j: number) =>
            !RD[j] &&
            CID[j] >= 0 &&
            city.home[CID[j]] === 1 &&
            use[CID[j]] !== "water" &&
            use[CID[j]] !== "town" &&
            use[CID[j]] !== "shanty";
          if (cl.length > 4 && cl.every(fine)) {
            const ci = CID[cl[0]];
            place(
              { cell: ci, poly: pl, type: "Cottage", roof: pick(ROOFS.farm), addr: r.name ?? "", district: -1 },
              cl
            );
          }
        }
      }
    }
  }
  // a town cell left with no house is an open place: a yard, a small place or, when large, a square of its own
  {
    const built = new Set<number>();
    for (const b of B) for (const c of b.cells ?? [b.cell]) built.add(c);
    const take = { yard: 0, opening: 0, square: 0 };
    for (let i = 0; i < n; i++) {
      if (!city.home[i] || built.has(i) || !(use[i] === "town" || use[i] === "shanty")) continue;
      if (kind[i] === "square" || kind[i] === "park" || kind[i] === "pond") continue;
      if (city.landmarks.some(l => l.cells.includes(i))) continue;
      const P = (cells.v[i] as number[]).map(v => vertices.p[v] as P2);
      const A = Math.abs(area2(P)) / 2;
      const size = A < 450 ? "yard" : A < 1100 ? "opening" : "square";
      const list = city.spare[size];
      kind[i] = "square";
      city.places[i] = list[take[size]++ % list.length];
    }
  }
  // the town's trade in proportion to its size: a hamlet keeps a shop or two, a city a high street and its stores;
  // shops gather toward the square, stores toward their quarter, and the rest are homes
  {
    const SHOP = new Set(["Shop", "Inn", "Tavern", "Counting house", "Office", "Chandlery"]);
    const STORE = new Set(["Warehouse", "Granary", "Shed", "Workshop", "Factory"]);
    const pop = city.population;
    const [shopT, storeT] =
      pop && pop < 300 ? [0.06, 0] : pop && pop < 2000 ? [0.12, 0.03] : pop && pop < 6000 ? [0.18, 0.05] : [0.24, 0.07];
    const L = B.filter(b => !b.landmark && !b.name && (use[b.cell] === "town" || use[b.cell] === "shanty"));
    const sq = cells.p[city.squareCell] as P2;
    const at = (b: Building): P2 => [
      b.poly.reduce((q, p) => q + p[0], 0) / b.poly.length,
      b.poly.reduce((q, p) => q + p[1], 0) / b.poly.length
    ];
    const near = (b: Building) => dist(at(b), sq);
    const homes = () => L.filter(b => b.type === "House" || b.type === "Townhouse");
    const shops = L.filter(b => SHOP.has(b.type));
    const wantShops = Math.round(L.length * shopT);
    if (shops.length > wantShops)
      for (const b of shops.sort((a, c) => near(c) - near(a)).slice(0, shops.length - wantShops)) {
        b.type = kind[b.cell] === "wealthy" ? "Townhouse" : "House";
        b.trade = false;
      }
    else
      for (const b of homes()
        .filter(b => kind[b.cell] !== "wealthy")
        .sort((a, c) => near(a) - near(c))
        .slice(0, wantShops - shops.length)) {
        b.type = R() < 0.7 ? "Shop" : R() < 0.6 ? "Tavern" : "Inn";
        b.trade = true;
      }
    const stores = L.filter(b => STORE.has(b.type));
    const wantStores = Math.max(pop && pop < 300 ? 0 : 1, Math.round(L.length * storeT));
    const quarter = L.filter(b => kind[b.cell] === "docks").map(at);
    const toQuarter = (b: Building) => (quarter.length ? Math.min(...quarter.map(q => dist(q, at(b)))) : -near(b));
    if (stores.length < wantStores)
      for (const b of homes()
        .filter(b => kind[b.cell] === "docks")
        .sort((a, c) => toQuarter(a) - toQuarter(c))
        .slice(0, wantStores - stores.length))
        b.type = R() < 0.75 ? "Warehouse" : "Granary";
  }
  // house numbers: low by the square, where the town began
  {
    const sq = cells.p[city.squareCell] as P2;
    const byStreet = new Map<string, { b: Building; s: number; left: boolean }[]>();
    // the street a lot fronts: the named way nearest any of its walls, not its middle
    const segs: { st: string; a: P2; b: P2 }[] = [];
    for (const r of city.roads)
      if (r.name && r.type !== "pier")
        for (let k = 1; k < r.pts.length; k++) segs.push({ st: r.name, a: r.pts[k - 1], b: r.pts[k] });
    const segDist = (p: P2, s0: P2, s1: P2) => {
      const dx = s1[0] - s0[0];
      const dy = s1[1] - s0[1];
      const t = Math.max(0, Math.min(1, ((p[0] - s0[0]) * dx + (p[1] - s0[1]) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(p[0] - s0[0] - dx * t, p[1] - s0[1] - dy * t);
    };
    const fronts = (b: Building) => {
      const P = b.poly;
      let best: string | undefined;
      let bd = Infinity;
      for (let k = 0; k < P.length; k++) {
        const m: P2 = [(P[k][0] + P[(k + 1) % P.length][0]) / 2, (P[k][1] + P[(k + 1) % P.length][1]) / 2];
        for (const sg of segs) {
          const d = segDist(m, sg.a, sg.b);
          if (d < bd) {
            bd = d;
            best = sg.st;
          }
        }
      }
      return best;
    };
    for (const b of B) {
      const m = /^\d+ (.+)$/.exec(b.addr ?? "");
      if (!m) continue;
      const st = (b.poly.length > 2 && fronts(b)) || m[1];
      const c: P2 = [
        b.poly.reduce((q, p) => q + p[0], 0) / (b.poly.length || 1),
        b.poly.reduce((q, p) => q + p[1], 0) / (b.poly.length || 1)
      ];
      if (!b.poly.length) {
        const cp = cells.p[b.cell] as P2;
        c[0] = cp[0];
        c[1] = cp[1];
      }
      let best = { d: Infinity, s: 0, left: true };
      for (const r of city.roads) {
        if (r.name !== st) continue;
        // walk the road from its end nearer the square
        const pts = dist(r.pts[0], sq) <= dist(r.pts[r.pts.length - 1], sq) ? r.pts : [...r.pts].reverse();
        let run = Math.min(dist(pts[0], sq), dist(pts[pts.length - 1], sq));
        for (let k = 1; k < pts.length; k++) {
          const [a0, a1] = [pts[k - 1], pts[k]];
          const dx = a1[0] - a0[0];
          const dy = a1[1] - a0[1];
          const L = Math.hypot(dx, dy) || 1;
          const t = Math.max(0, Math.min(1, ((c[0] - a0[0]) * dx + (c[1] - a0[1]) * dy) / (L * L)));
          const d = Math.hypot(c[0] - a0[0] - dx * t, c[1] - a0[1] - dy * t);
          if (d < best.d) best = { d, s: run + t * L, left: dx * (c[1] - a0[1]) - dy * (c[0] - a0[0]) < 0 };
          run += L;
        }
      }
      if (!byStreet.has(st)) byStreet.set(st, []);
      byStreet.get(st)?.push({ b, s: best.s, left: best.left });
    }
    // one count for the whole town, as the old conscription numbers ran: the streets nearest the square first,
    // each street's lots in order along it, so no two houses anywhere share a number
    let k = 0;
    const streets = [...byStreet.entries()].map(([st, L]) => ({ st, L: L.sort((p, q) => p.s - q.s) }));
    streets.sort((p, q) => p.L[0].s - q.L[0].s);
    for (const { st, L } of streets) for (const e of L) e.b.addr = `${++k} ${st}`;
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
  const N = city.notables ?? {};
  nb("Guardhouse", N.watch ?? "The Watch House", b => !!gate0 && dist(b.poly[0], gate0) < 40 && b.type !== "Hut");
  if (city.port) nb("Guardhouse", N.harbourWatch ?? "Harbour Watch", b => kind[b.cell] === "docks");
  nb("Chapel", N.chapel ?? "Chapel of the Ledger", b => kind[b.cell] === "wealthy");
  const dockTavern = N.dockTavern ?? "The Gilded Anchor";
  if (city.port) nb("Tavern", dockTavern, b => kind[b.cell] === "docks" && b.type !== "Warehouse");
  nb("Tavern", N.tavern1 ?? "The Brass Scale", b => kind[b.cell] === "old");
  nb("Tavern", N.tavern2 ?? "The Sleeping Clerk", b => kind[b.cell] === "old");
  nb("Guild hall", N.guildHall ?? "Hall of the Weigh-Masters", b => kind[b.cell] === "centre");
  nb("Office", N.harbourmaster ?? "Harbourmaster", b => b.type === "Warehouse");
  // who owns each building: its cell's holder, the Watch its guardhouses, the agents a quiet house in the old town
  for (const b of B) b.owner = city.faction[b.cell] >= 0 ? city.faction[b.cell] : undefined;
  for (const b of B) if (b.type === "Guardhouse") b.owner = 1;
  for (const b of B) if (b.landmark && b.type === "Bank") b.owner = 0;
  {
    const quiet = B.filter(b => !b.name && kind[b.cell] === "old" && b.type === "House");
    if (quiet.length) quiet[Math.floor(R() * quiet.length)].owner = 6;
    const tav = B.find(b => b.name === dockTavern);
    if (tav) tav.owner = 5;
  }
  for (const b of B) {
    const o = city.edits.owners?.[b.key ?? ""];
    if (o !== undefined) b.owner = o < 0 ? undefined : o;
  }
  // everyone the region cell holds, shared out by floor space and how crowded each kind of building is
  {
    // trade and stores house no one; landmarks and forts keep their own households and garrisons
    const DENS: Record<string, number> = {
      House: 1,
      Townhouse: 0.9,
      Mansion: 0.5,
      Hut: 1.7,
      Shack: 1.7,
      Cottage: 1.1,
      Farmhouse: 0.8,
      Guardhouse: 0.4,
      Chapel: 0.1,
      Fort: 0.35
    };
    const WEALTHY: Record<number, number> = { 1: 1.3, 2: 1, 3: 1, 4: 0.85, 5: 0.6 };
    const w = B.map(b => {
      // a landmark's floor is its whole set of cells
      const A = b.landmark
        ? (b.cells ?? [b.cell]).reduce(
            (q, c) => q + Math.abs(area2((cells.v[c] as number[]).map(v => vertices.p[v] as P2))) / 2,
            0
          )
        : Math.abs(area2(b.poly)) / 2;
      const d = DENS[b.type] ?? (b.landmark ? 0.25 : 0);
      const wl = city.districts.find(D => D.id === b.district)?.wealth ?? 2;
      return A * d * (WEALTHY[wl] ?? 1);
    });
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    const total = city.population || Math.round(sum * 0.45);
    const raw = w.map(x => (x / sum) * total);
    const caps = raw.map(Math.floor);
    let left = total - caps.reduce((a, b) => a + b, 0);
    const order = raw.map((r, k) => [r - Math.floor(r), k]).sort((a, b) => b[0] - a[0]);
    for (const [, k] of order) {
      if (left <= 0) break;
      caps[k]++;
      left--;
    }
    B.forEach((b, k) => {
      b.cap = caps[k];
    });
    if (!city.population) city.population = total;
  }
  city.buildings = B;

  // single trees: gardens, the park and along hedges; woods are ground, not trees
  const T: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const k = kind[i];
    const dens = k === "park" ? 0.75 : k === "wealthy" ? 0.2 : 0;
    if (!dens) continue;
    for (let y = 0; y < H; y += 5)
      for (let x = 0; x < W; x += 5) {
        const jx = Math.round(x + (R() - 0.5) * 4);
        const jy = Math.round(y + (R() - 0.5) * 4);
        if (jx < 0 || jy < 0 || jx >= W || jy >= H) continue;
        const j = jy * W + jx;
        if (CID[j] !== i || !city.home[i] || OCC[j] || RD[j] || R() > dens) continue;
        T.push([jx, jy, 2]);
      }
  }
  for (const [a, b] of hedgeEdges(city)) {
    const L = dist(a, b);
    for (let t = 3; t < L - 2; t += 5 + R() * 7)
      if (R() < 0.5) {
        const x = Math.round(a[0] + ((b[0] - a[0]) * t) / L);
        const y = Math.round(a[1] + ((b[1] - a[1]) * t) / L);
        const c = x >= 0 && y >= 0 && x < W && y < H ? CID[y * W + x] : -1;
        if (c >= 0 && city.home[c]) T.push([x, y, 1]);
      }
  }
  city.trees = T;
}

/** Edges between two farm cells of different crops */
export function hedgeEdges(city: City): [P2, P2][] {
  const { pack, use } = city;
  const { cells, vertices } = pack;
  const out: [P2, P2][] = [];
  const crop = (u: string) => u === "wheat" || u === "tilled" || u === "pasture";
  const farm = (u: string) => crop(u) || u === "grass";
  for (let i = 0; i < cells.p.length; i++)
    for (const j of cells.c[i]) {
      if (
        j <= i ||
        j >= cells.p.length ||
        !farm(use[i]) ||
        !farm(use[j]) ||
        use[i] === use[j] ||
        !(crop(use[i]) || crop(use[j]))
      )
        continue;
      const shv = cells.v[i].filter((v: number) => cells.v[j].includes(v));
      if (shv.length >= 2) out.push([vertices.p[shv[0]], vertices.p[shv[1]]]);
    }
  return out;
}

// ---- the shared city tiles: every cell kind paints from these, in either view
/** Ground outside the town: fields, meadow and woods */
export const OPEN_LAND = new Set(["grass", "pasture", "wheat", "tilled", "woods"]);
const WOODS_PALE: C3 = [228, 232, 214];
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// smooth value noise: tone that drifts across cell edges, so neighbours of one ground read as one
const vnoise = (x: number, y: number, sc: number) => {
  const fx = x / sc;
  const fy = y / sc;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
const tone = (x: number, y: number) => vnoise(x, y, 70) * 0.65 + vnoise(x + 999, y, 22) * 0.35;
const GRASS: [C3, C3] = [
  [128, 152, 76],
  [162, 176, 92]
];
const grass = (x: number, y: number, lift = 0): C3 => {
  const t = Math.min(1, Math.max(0, tone(x, y) + lift));
  const c = mix(GRASS[0], GRASS[1], t);
  const g = hash(x, y);
  return g < 0.06 ? sh(c, 0.94) : g > 0.95 ? sh(c, 1.05) : c;
};
const dirt = (x: number, y: number): C3 => {
  const c = mix([150, 124, 88], [172, 146, 106], tone(x + 300, y));
  return hash(x, y) < 0.08 ? sh(c, 0.94) : c;
};
// smooth stone: pale, with only a faint grain
const stone = (x: number, y: number): C3 => {
  const c = mix([196, 190, 176], [212, 206, 192], vnoise(x, y, 9) * 0.6 + vnoise(x, y, 40) * 0.4);
  const g = hash(x, y);
  return g < 0.05 ? sh(c, 0.97) : g > 0.96 ? sh(c, 1.02) : c;
};
// worn ground: grass going to dirt as it wears; more grass where people are richer
const worn = (x: number, y: number, keep: number): C3 => {
  const w = vnoise(x + 77, y, 14);
  return w < keep ? grass(x, y, -0.1) : w < keep + 0.06 ? mix(grass(x, y, -0.2), dirt(x, y), 0.5) : dirt(x, y);
};
const stripe = (x: number, y: number, a: number, every = 4) =>
  (((x * Math.cos(a) + y * Math.sin(a)) % every) + every) % every;
const calm = (c: C3, t = 0.3): C3 => {
  const l = (c[0] + c[1] + c[2]) / 3;
  return sh(mix(c, [l, l, l], t), 1.05);
};
const furrow = (x: number, y: number, a: number, c1: C3, c2: C3) => {
  const c = stripe(x, y, a) < 2 ? c1 : c2;
  return sh(c, 0.97 + tone(x, y) * 0.08);
};
export function terrainTile(kind: string, x: number, y: number, a: number): C3 {
  switch (kind) {
    case "wheat":
      return furrow(x, y, a, calm(P.field1, 0.1), calm(P.field2, 0.1));
    case "tilled":
      return furrow(x, y, a, calm(P.dirt3, 0.1), sh(calm(P.dirt3, 0.1), 0.92));
    case "pasture":
      return stripe(x, y, a, 7) < 1 ? sh(grass(x, y, 0.15), 0.95) : grass(x, y, 0.15);
    case "grass":
    case "park":
      return grass(x, y);
    case "woods":
      return calm(groundPixel("woods", x, y), 0.1);
    case "centre":
    case "square":
      return stone(x, y);
    case "docks":
    case "shanty":
      return dirt(x, y);
    case "wealthy":
      return grass(x, y, 0.1);
    case "old":
      return worn(x, y, 0.45);
    default:
      return grass(x, y);
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
  pier: hex("#9c7a52"),
  quay: hex("#eadcbc")
};
export function mapTile(kind: string, x = 0, y = 0): C3 {
  const w = tone(x, y) - 0.5;
  const soft = (c: C3) => sh(c, 1 + w * 0.06);
  switch (kind) {
    case "grass":
      return soft(MAPC.green);
    case "wheat":
      return soft(MAPC.wheat);
    case "tilled":
      return soft(MAPC.tilled);
    case "pasture":
      return soft(MAPC.pasture);
    case "woods":
      return MAPC.woods;
    case "wealthy":
    case "park":
      return MAPC.green;
    case "square":
      return MAPC.road;
    case "docks":
    case "shanty":
      return soft(MAPC.quay);
    case "centre":
      return MAPC.block;
    case "old":
      return soft(mix(MAPC.block, MAPC.green, 0.3));
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
  const water = (j: number) => CID[j] < 0 || use[CID[j]] === "water";
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
  const put = (D: Uint8ClampedArray, j: number, c: C3) => {
    D[j * 4] = c[0];
    D[j * 4 + 1] = c[1];
    D[j * 4 + 2] = c[2];
    D[j * 4 + 3] = 255;
  };
  const kindAt = (j: number) => (CID[j] >= 0 ? (kind[CID[j]] ?? use[CID[j]]) : "water");
  // each field its own flat wash, a shade apart from the same ground next door, as on a hand-coloured plan
  const nC = city.pack.cells.p.length;
  const shade = new Int8Array(nC);
  for (let i = 0; i < nC; i++) {
    const taken = new Set<number>();
    for (const o of city.pack.cells.c[i]) if (o < i && use[o] === use[i]) taken.add(shade[o]);
    const opts = [-2, -1, 0, 1, 2].filter(v => !taken.has(v));
    shade[i] = opts.length ? opts[(i * 7) % opts.length] : 0;
  }
  const OLIVE: C3 = [150, 156, 92];
  const FIELDS: Record<string, C3> = {
    grass: [178, 200, 112],
    pasture: [196, 210, 122],
    wheat: [222, 210, 136],
    tilled: [212, 190, 146],
    wealthy: [170, 200, 108],
    park: [160, 196, 100],
    pond: [160, 196, 100],
    woods: [140, 178, 92]
  };
  const grain = (x: number, y: number) => {
    const g = hash(x, y);
    return (g < 0.07 ? 0.97 : g > 0.95 ? 1.025 : 1) * (0.985 + vnoise(x + 41, y, 38) * 0.03);
  };
  const washOf = (k: string, ci: number, x: number, y: number, olive: number): C3 | null => {
    const c = FIELDS[k];
    if (!c) return null;
    const base = sh(mix(c, OLIVE, olive), 1 + shade[ci] * 0.03);
    return sh(base, grain(x, y));
  };
  // the plan: a hand-drawn town plan in ink and watercolour, after the 1830 plan of Dublin
  const plan = new ImageData(W, H);
  const Pl = plan.data;
  const PAPER: C3 = [246, 241, 228];
  const INK: C3 = [92, 80, 68];
  const wash = (x: number, y: number, c: C3): C3 => sh(c, grain(x, y));
  const planOf = (j: number, x: number, y: number): C3 => {
    const r = RD[j];
    // piers and bridges stand over the water in every view
    if (water(j)) return wash(x, y, WD[j] <= 2 ? [128, 176, 196] : [150, 194, 210]);
    const ci = CID[j];
    const k = kindAt(j);
    // roads are drawn as lines over the ground; only the squares are paved here
    if (r === 7) return wash(x, y, PAPER);
    // the richest quarters, and villages, keep their gardens green
    if (k === "old" && (city.districts.find(d => d.id === city.district[ci])?.wealth ?? 0) >= 5)
      return washOf("wealthy", ci, x, y, 0.2) as C3;
    switch (k) {
      case "centre":
      case "square":
      case "docks":
      case "shanty":
      case "old":
        return wash(x, y, k === "old" ? [212, 209, 196] : [208, 204, 193]);
      default:
        return washOf(k, ci, x, y, 0.2) ?? wash(x, y, [208, 204, 193]);
    }
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const j = y * W + x;
      put(Pl, j, planOf(j, x, y));
    }
  // ink along the shore; every other edge is drawn as a line over the plan
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const j = y * W + x;
      const k = j * 4;
      const wt = water(j);
      let ink = false;
      for (let q = 0; q < 8; q += 2) {
        const o = j + N4[q] + N4[q + 1] * W;
        if (!wt && water(o)) ink = true;
      }
      if (ink) for (let i = 0; i < 3; i++) Pl[k + i] = Pl[k + i] * 0.3 + INK[i] * 0.7;
    }
  // each home land cell's mean ground colour, away from roads and the shore ink
  const sum = new Float64Array(nC * 4);
  for (let j = 0; j < N; j++) {
    const ci = CID[j];
    if (ci < 0 || water(j) || RD[j] || home[ci] !== 1) continue;
    let shore = false;
    for (let q = 0; q < 8; q += 2) if (water(j + N4[q] + N4[q + 1] * W)) shore = true;
    if (shore) continue;
    for (let i = 0; i < 3; i++) sum[ci * 4 + i] += Pl[j * 4 + i];
    sum[ci * 4 + 3]++;
  }
  const terrainCol: (C3 | null)[] = [];
  for (let i = 0; i < nC; i++) {
    const n = sum[i * 4 + 3];
    terrainCol[i] =
      use[i] === "water" && home[i] === 1
        ? [150, 194, 210]
        : n
          ? [sum[i * 4] / n, sum[i * 4 + 1] / n, sum[i * 4 + 2] / n]
          : null;
  }
  const mapCol = terrainCol.map((c, i) =>
    c ? (OPEN_LAND.has(use[i]) ? (use[i] === "woods" ? WOODS_PALE : PAPER) : mix(c, PAPER, 0.4)) : null
  );
  const washed = (of: (ci: number) => number, col: (v: number) => C3 | null, t: number) =>
    mapCol.map((c, i) => {
      if (!c) return null;
      const v = of(i);
      const w = col(v);
      return w ? mix(c, w, t) : c;
    });
  const dots: P2[] = [];
  // trees as small inked dots, woods dotted all over
  const dot = (x: number, y: number) => {
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1]
    ]) {
      const X = x + u;
      const Y = y + v;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const q = (Y * W + X) * 4;
      const c: C3 = u + v === 2 ? [96, 120, 66] : [118, 150, 80];
      for (let i = 0; i < 3; i++) Pl[q + i] = Pl[q + i] * 0.45 + c[i] * 0.55;
    }
  };
  for (const [tx, ty] of city.trees) dot(tx, ty);
  for (let y = 2; y < H - 2; y += 5)
    for (let x = 2; x < W - 2; x += 5) {
      const X = x + Math.floor(hash(x, y) * 3);
      const Y = y + Math.floor(hash(y, x) * 3);
      if (kindAt(Y * W + X) === "woods" && !RD[Y * W + X]) {
        dot(X, Y);
        dots.push([X, Y]);
      }
    }
  // the reference map: the plan faded back toward the paper
  const faded = new ImageData(new Uint8ClampedArray(Pl), W, H);
  for (let j = 0; j < W * H; j++)
    for (let i = 0; i < 3; i++) faded.data[j * 4 + i] = faded.data[j * 4 + i] * 0.6 + PAPER[i] * 0.4;
  // as on the old town plans, the country round the town is left as bare paper; woods a pale wash
  for (let j = 0; j < W * H; j++) {
    const ci = CID[j];
    if (ci < 0 || water(j) || RD[j] || !OPEN_LAND.has(use[ci])) continue;
    put(faded.data, j, wash(j % W, (j / W) | 0, use[ci] === "woods" ? WOODS_PALE : PAPER));
  }
  // the district and faction views: the plain map with each area washed in its colour and edged where it ends
  const districts = new ImageData(new Uint8ClampedArray(faded.data), W, H);
  const factions = new ImageData(new Uint8ClampedArray(faded.data), W, H);
  const area = (D: Uint8ClampedArray, of: (ci: number) => number, col: (v: number) => C3 | null, wash: number) => {
    for (let j = 0; j < N; j++) {
      const ci = CID[j];
      if (ci < 0 || water(j)) continue;
      const v = of(ci);
      const c = col(v);
      if (!c) continue;
      const x = j % W;
      const y = (j / W) | 0;
      let rim = false;
      for (let q = 0; q < 8; q += 2) {
        const X = x + N4[q];
        const Y = y + N4[q + 1];
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const o = CID[Y * W + X];
        if (o < 0 || of(o) !== v) rim = true;
      }
      const k = j * 4;
      const t = rim ? 0.55 : RD[j] === 7 ? 0 : wash;
      const cc = rim ? sh(c, 0.75) : c;
      for (let i = 0; i < 3; i++) D[k + i] = D[k + i] * (1 - t) + cc[i] * t;
    }
  };
  area(
    districts.data,
    ci => city.district[ci],
    v => (v >= 0 ? hex(DIST_COL[v % DIST_COL.length]) : null),
    0.22
  );
  area(
    factions.data,
    ci => city.faction[ci],
    v => (v >= 0 ? mix(hex(city.factions[v]?.col ?? "#888888"), PAPER, 0.35) : null),
    0.3
  );
  // outside the home cell: terrain darkens, the map pales, both deepening toward the view's edge
  const fadeTo = hex("#d6cdb6");
  const MARGIN: C3 = [236, 231, 218];
  for (let j = 0; j < N; j++) {
    if (!HD[j]) continue;
    const x = j % W;
    const y = (j / W) | 0;
    const ed = Math.min(x, y, W - 1 - x, H - 1 - y);
    const t = Math.min(0.92, 0.55 + HD[j] / 220 + Math.max(0, (24 - ed) / 24) * 0.3);
    const k = j * 4;
    // washed toward one dull grey-green and darkened, so the eye stays inside the cell
    const lum = (Pl[k] + Pl[k + 1] + Pl[k + 2]) / 3;
    for (let i = 0; i < 3; i++)
      Pl[k + i] = (lum * 0.5 + Pl[k + i] * 0.5) * (1 - t * 0.45) * 0.62 + fadeTo[i] * t * 0.18;
    // the plan views just pale out toward the margin
    for (const D of [districts.data, factions.data, faded.data])
      for (let i = 0; i < 3; i++) D[k + i] = D[k + i] * (1 - t * 0.85) + MARGIN[i] * t * 0.85;
  }
  // the city's own edge: a soft band inside, a thin line on it
  const HI = bfs(j => CID[j] < 0 || home[CID[j]] !== 1);
  for (let j = 0; j < N; j++) {
    const d = HI[j];
    if (!d || d > 9) continue;
    const k = j * 4;
    const tt = d <= 2 ? 0.88 : 0.28 * (1 - (d - 3) / 7);
    const cm: C3 = d <= 2 ? [26, 22, 18] : [170, 110, 90];
    for (const D of [districts.data, factions.data, Pl, faded.data])
      for (let i = 0; i < 3; i++) D[k + i] = D[k + i] * (1 - tt) + cm[i] * tt;
  }
  const cellCol = {
    terrain: terrainCol,
    map: mapCol,
    districts: washed(
      ci => city.district[ci],
      v => (v >= 0 ? hex(DIST_COL[v % DIST_COL.length]) : null),
      0.22
    ),
    factions: washed(
      ci => city.faction[ci],
      v => (v >= 0 ? mix(hex(city.factions[v]?.col ?? "#888888"), PAPER, 0.35) : null),
      0.3
    )
  };
  return { terrain: plan, map: faded, districts, factions, CID, BID, cellCol, dots };
}
