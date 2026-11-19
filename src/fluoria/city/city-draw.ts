// Fills a city's blocks with lots and paints its ground: the plan washes the Terrain and Map views draw on,
// and the district and faction washes over it. Nothing here is tuned to one town: every cell paints by its kind
import PC from "polygon-clipping";
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
  shanty: [
    ["Hut", "hut", 3],
    ["Shack", "hut", 2],
    ["Residence", "house", 1]
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
  // ---- lots, after the Dublin plans: each block (its cells as one shape) is cut back from its streets,
  // fronted by lots square to the street, each of its own depth; corners built whole, sharp points bevelled
  const area2 = (pl: P2[]) => {
    let A = 0;
    for (let k = 0; k < pl.length; k++) {
      const [a, b] = [pl[k], pl[(k + 1) % pl.length]];
      A += a[0] * b[1] - b[0] * a[1];
    }
    return A;
  };
  // pixels a building would take; a little over a street is trimmed when drawn,
  // but it must not land on a neighbour, another block, the water or open ground
  const claim = (pl: P2[], ok: (j: number) => boolean, slack = 0.15, roadMax = 0.3) => {
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
    let bad = 0;
    let road = 0;
    for (let y = Math.max(0, Math.floor(b)); y <= Math.min(H - 1, f); y++)
      for (let x = Math.max(0, Math.floor(a)); x <= Math.min(W - 1, e); x++) {
        if (!inPoly(pl, x + 0.5, y + 0.5)) continue;
        const j = y * W + x;
        if (RD[j] && RD[j] !== 5) road++;
        else if (OCC[j] || !ok(j)) bad++;
        else out.push(j);
      }
    const all = out.length + bad + road;
    return out.length >= 6 && bad <= all * slack && road <= all * roadMax ? out : null;
  };
  // plots are cells: every side is pulled in by what lies beyond it, so fronts sit flush along the street
  // and neighbours of one block share a party wall
  const LOT_KINDS = new Set(["centre", "old", "docks", "wealthy", "shanty"]);
  const lotCell = (i: number) => i < n && city.home[i] === 1 && !landCell[i] && LOT_KINDS.has(kind[i] as string);
  const HALF: Record<string, number> = { main: 2.3, street: 1.6, lane: 1.1, path: 1, track: 1.1, pier: 1.5 };
  const ek = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const edgeHalf = new Map<string, number>();
  for (const r of city.roads)
    if (r.edges && HALF[r.type])
      for (const [a, b] of r.edges) edgeHalf.set(ek(a, b), Math.max(edgeHalf.get(ek(a, b)) ?? 0, HALF[r.type]));
  const offsetBy = (P: P2[], off: number[]): P2[] => {
    const m = P.length;
    const lines = P.map((a, e) => {
      const b = P[(e + 1) % m];
      const L = dist(a, b) || 1;
      const nx = -(b[1] - a[1]) / L;
      const ny = (b[0] - a[0]) / L;
      return { a: [a[0] + nx * off[e], a[1] + ny * off[e]] as P2, dx: (b[0] - a[0]) / L, dy: (b[1] - a[1]) / L };
    });
    return P.map((p, e) => {
      const l1 = lines[(e + m - 1) % m];
      const l2 = lines[e];
      const den = l1.dx * l2.dy - l1.dy * l2.dx;
      if (Math.abs(den) < 1e-3) return l2.a;
      const t = ((l2.a[0] - l1.a[0]) * l2.dy - (l2.a[1] - l1.a[1]) * l2.dx) / den;
      const q: P2 = [l1.a[0] + l1.dx * t, l1.a[1] + l1.dy * t];
      return dist(q, p) > Math.max(off[e], off[(e + m - 1) % m]) * 3 ? l2.a : q;
    });
  };
  // wealth sets the lots: frontage width, depth from the street, the gap between houses, the set-back,
  // and how often a lot is left open
  const WEALTH: Record<number, { w: [number, number]; d: number; gap: number; set: number; open: number }> = {
    1: { w: [3, 4.2], d: 6, gap: 0, set: 0, open: 0.08 },
    2: { w: [4, 6], d: 9, gap: 0, set: 0, open: 0.05 },
    3: { w: [5, 8], d: 11, gap: 0, set: 0, open: 0.05 },
    4: { w: [6, 9], d: 14, gap: 0, set: 0, open: 0 },
    5: { w: [12, 17], d: 15, gap: 3, set: 2, open: 0.08 }
  };
  // what each side gives up: a road its half-width, the wall a clear strip, the water a quay edge
  const otherCell = (i: number, va: number, vb: number) =>
    vertices.c[va].find((c: number) => c !== i && vertices.c[vb].includes(c)) ?? -1;
  const sideOff = (i: number, va: number, vb: number) => {
    const rh = edgeHalf.get(ek(va, vb));
    if (rh) return rh + 0.35;
    const o = vertices.c[va].find((c: number) => c !== i && vertices.c[vb].includes(c));
    if (o === undefined || o >= n) return 1;
    if (use[o] === "water" || kind[o] === "pond") return 1;
    // the wall between the town and anything outside it, the shanty included
    if ((use[o] === "town") !== (use[i] === "town")) return city.walls.length ? 3 : 1;
    if (!(use[o] === "town" || use[o] === "shanty")) return 1;
    if (kind[o] === "square" || kind[o] === "park" || landCell[o]) return 0.6;
    return 0.3;
  };
  // ---- blocks and lots. A block is its cells, each pulled in from its streets, joined into one shape. Lots run
  // along every street frontage, square to it, each its own width and depth; each lot is the block less what is
  // already built, so lots fit the block exactly and never overlap. Behind them is the yard
  const asRing = (P: P2[]): PC.Ring => P.map(p => [p[0], p[1]] as PC.Pair);
  // the clipping library can trip on near-coincident edges: snap coarser and try again, else skip that step
  const snapG = (g: unknown, q: number): unknown =>
    Array.isArray(g) && typeof g[0] === "number"
      ? [Math.round((g[0] as number) * q) / q, Math.round((g[1] as number) * q) / q]
      : (g as unknown[]).map(x => snapG(x, q));
  const clip =
    (op: (a: PC.Geom, ...b: PC.Geom[]) => PC.MultiPolygon) =>
    (a: PC.Geom, ...b: PC.Geom[]): PC.MultiPolygon => {
      for (const q of [256, 32, 4])
        try {
          return op(snapG(a, q) as PC.Geom, ...b.map(x => snapG(x, q) as PC.Geom));
        } catch {}
      return [];
    };
  const pcUnion = clip(PC.union);
  const pcDiff = clip(PC.difference);
  const pcInter = clip(PC.intersection);
  const ringArea = (P: P2[]) => Math.abs(area2(P)) / 2;
  const cleanRing = (P: P2[]): P2[] => {
    let R0 = P.filter((p, k) => dist(p, P[(k + 1) % P.length]) > 0.25);
    for (let pass = 0; pass < 2 && R0.length > 3; pass++)
      R0 = R0.filter((p, k) => {
        const a = R0[(k + R0.length - 1) % R0.length];
        const b = R0[(k + 1) % R0.length];
        return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 0.08 * dist(a, b);
      });
    return R0;
  };
  const outerRings = (mp: PC.MultiPolygon): P2[][] =>
    mp.map(poly => cleanRing(poly[0].slice(0, -1).map(p => [p[0], p[1]] as P2))).filter(r => r.length >= 3);
  const crossings: { poly: P2[]; cells: number[] }[] = [];
  for (const r of city.roads)
    for (const [a, b] of r.edges ?? []) {
      if ((vertices.c[a] ?? []).filter((c: number) => (vertices.c[b] ?? []).includes(c)).length >= 2) continue;
      const [p, q] = [vertices.p[a] as P2, vertices.p[b] as P2];
      const L = dist(p, q) || 1;
      const h = (HALF[r.type] ?? 1) + 0.35;
      const nx = (-(q[1] - p[1]) / L) * h;
      const ny = ((q[0] - p[0]) / L) * h;
      const cs = [...new Set([...(vertices.c[a] ?? []), ...(vertices.c[b] ?? [])])] as number[];
      crossings.push({
        poly: [
          [p[0] + nx, p[1] + ny],
          [q[0] + nx, q[1] + ny],
          [q[0] - nx, q[1] - ny],
          [p[0] - nx, p[1] - ny]
        ],
        cells: cs
      });
    }
  const blockCells = new Map<number, number[]>();
  for (let i = 0; i < n; i++)
    if (lotCell(i)) {
      const b = city.block[i] >= 0 ? city.block[i] : -1 - i;
      blockCells.set(b, [...(blockCells.get(b) ?? []), i]);
    }
  const frontAt = (p: P2) => {
    const X = Math.round(p[0]);
    const Y = Math.round(p[1]);
    if (X < 0 || Y < 0 || X >= W || Y >= H) return true;
    const j = Y * W + X;
    // streets, the quay and the water front a lot; the town wall does not
    return (RD[j] !== 0 && RD[j] !== 5) || CID[j] < 0 || use[CID[j]] === "water";
  };
  // what a lot fronts decides what it is: shops on the main roads and squares, stores on the quay, homes elsewhere
  const FACE_RANK: Record<string, number> = { main: 4, square: 3, quay: 2, street: 1, lane: 0 };
  const faceOf = (p: P2): string => {
    const X = Math.round(p[0]);
    const Y = Math.round(p[1]);
    if (X < 0 || Y < 0 || X >= W || Y >= H) return "lane";
    const r = RD[Y * W + X];
    const c = CID[Y * W + X];
    if (r === 4 || r === 9) return "main";
    if (r === 7 || (c >= 0 && kind[c] === "square")) return "square";
    if (r === 6 || r === 8 || (c >= 0 && use[c] === "water")) return "quay";
    return r === 3 ? "street" : "lane";
  };
  const COMMERCE = ["Shop", "Shop", "Inn", "Tavern", "Workshop", "Shop"];
  for (const [, ids] of blockCells) {
    // the block shape
    const parts: PC.Polygon[] = [];
    for (const i of ids) {
      const vs: number[] = (cells.v[i] as number[]).filter(
        (v, e, a) => dist(vertices.p[v], vertices.p[a[(e + 1) % a.length]]) > 0.3
      );
      if (vs.length < 3) continue;
      let P = vs.map(v => vertices.p[v] as P2);
      if (area2(P) < 0) {
        P = P.reverse();
        vs.reverse();
      }
      const off = vs.map((v, e) =>
        ids.includes(otherCell(i, v, vs[(e + 1) % vs.length])) && !edgeHalf.has(ek(v, vs[(e + 1) % vs.length]))
          ? -0.3
          : sideOff(i, v, vs[(e + 1) % vs.length])
      );
      const Q = offsetBy(P, off);
      if (area2(Q) > 4) parts.push([asRing(Q)]);
    }
    if (!parts.length) continue;
    // if the shapes will not join cleanly, each cell builds as its own block
    const joined0 = pcUnion(parts[0], ...parts.slice(1));
    // a road crossing the cell rather than running round it cuts the block
    const cuts = crossings.filter(q => ids.some(i => q.cells.includes(i))).map(q => [asRing(q.poly)] as PC.Polygon);
    const joined = cuts.length && joined0.length ? pcDiff(joined0, ...cuts) : joined0;
    const blockMP = joined.length ? joined : parts;
    const i0 = ids[0];
    const k = kind[i0] as string;
    const wealth = city.districts.find(d => d.id === district[i0])?.wealth ?? 2;
    const spec = WEALTH[wealth];
    const docks = k === "docks";
    const baseD = spec.d * (docks ? 1.3 : 1);
    // every lot laid so far, kept apart: each new lot is cut against all of them
    const built: PC.Polygon[] = [];
    const build = (pl: P2[], at: P2, wide: boolean, as?: string) => {
      const ci = CID[Math.round(at[1]) * W + Math.round(at[0])];
      const cell = ids.includes(ci) ? ci : i0;
      const cl = claim(pl, () => true, 1);
      if (!cl) return;
      const [tn] = weighted(MIX[k]);
      place(
        {
          cell,
          poly: pl,
          type: wide ? (docks ? "Warehouse" : k === "centre" ? "Guild hall" : "Tavern") : (as ?? tn),
          trade: !!as && COMMERCE.includes(as),
          roof: pick(ROOFS[k]),
          addr: addrOf(at, dname(cell)),
          district: district[cell]
        },
        cl
      );
    };
    for (const ring0 of outerRings(blockMP)) {
      const ring = area2(ring0) < 0 ? ring0.slice().reverse() : ring0;
      const blockPoly: PC.Polygon = [asRing(ring)];
      const m = ring.length;
      // frontages: sides with a street, the quay or the wall beyond them, longest first
      const sides = ring
        .map((a, e) => {
          const b = ring[(e + 1) % m];
          const L = dist(a, b);
          const u: P2 = [(b[0] - a[0]) / (L || 1), (b[1] - a[1]) / (L || 1)];
          const mid: P2 = [(a[0] + b[0]) / 2 + u[1] * 1.3, (a[1] + b[1]) / 2 - u[0] * 1.3];
          return { a, b, L, u, front: L > 2 && frontAt(mid), face: faceOf(mid) };
        })
        .filter(sd => sd.front)
        // the most important street first, so corners face it
        .sort((x, y) => FACE_RANK[y.face] - FACE_RANK[x.face] || y.L - x.L);
      for (const sd of sides) {
        const n0: P2 = [-sd.u[1], sd.u[0]];
        const sideD = baseD * (0.85 + R() * 0.3);
        const shopFront = sd.face === "main" || sd.face === "square";
        let t = 0;
        while (t < sd.L - 1.5) {
          const wide = R() < (wealth >= 3 ? 0.07 : 0.03);
          let w = (spec.w[0] + R() * (spec.w[1] - spec.w[0])) * (wide ? 2.2 : 1);
          if (sd.L - t - w < spec.w[0] * 0.7) w = sd.L - t;
          // depths vary lot to lot, so the backs of a terrace step in and out
          // an even depth along the street, so the front is one wall and the yard sits behind it
          const d = sideD * (0.88 + R() * 0.24);
          // a lot that runs into a corner or a neighbour is narrowed to fit, not dropped: the street stays built
          let piece: P2[] | undefined;
          let p0: P2 = sd.a;
          let p1: P2 = sd.a;
          for (const wf of [1, 0.75, 0.55]) {
            const ww = wf === 1 ? w : Math.max(spec.w[0] * 0.6, w * wf);
            p0 = [sd.a[0] + sd.u[0] * t, sd.a[1] + sd.u[1] * t];
            p1 = [sd.a[0] + sd.u[0] * (t + ww), sd.a[1] + sd.u[1] * (t + ww)];
            const quad: P2[] = [p0, p1, [p1[0] + n0[0] * d, p1[1] + n0[1] * d], [p0[0] + n0[0] * d, p0[1] + n0[1] * d]];
            const inBlock = pcInter([asRing(quad)], blockPoly);
            const lot = built.length ? pcDiff(inBlock, ...built) : inBlock;
            const pc = outerRings(lot).sort((x, y) => ringArea(y) - ringArea(x))[0];
            let per = 0;
            if (pc) for (let q = 0; q < pc.length; q++) per += dist(pc[q], pc[(q + 1) % pc.length]);
            // no slivers: the mean width (twice the area over the perimeter) must reach a house's
            if (
              pc &&
              ringArea(pc) >= ww * d * 0.5 &&
              pc.length >= 4 &&
              pc.length <= 8 &&
              (2 * ringArea(pc)) / per >= 1.5
            ) {
              piece = pc;
              w = ww;
              break;
            }
          }
          if (!piece) {
            t += 0.6;
            continue;
          }
          t += w;
          built.push([asRing(piece)]);
          if (R() < spec.open) continue;
          let house = piece;
          if (spec.set) {
            // a house standing back in its garden
            const cx = piece.reduce((q, p) => q + p[0], 0) / piece.length;
            const cy = piece.reduce((q, p) => q + p[1], 0) / piece.length;
            house = piece.map(p => [cx + (p[0] - cx) * 0.8, cy + (p[1] - cy) * 0.8] as P2);
          } else if (R() < 0.06) {
            // the odd passage through to the yard
            const cut = pcDiff(
              [asRing(piece)],
              [
                asRing([
                  [p1[0] - sd.u[0] * 1.1, p1[1] - sd.u[1] * 1.1],
                  [p1[0] + sd.u[0] * 0.1, p1[1] + sd.u[1] * 0.1],
                  [p1[0] + sd.u[0] * 0.1 + n0[0] * 99, p1[1] + sd.u[1] * 0.1 + n0[1] * 99],
                  [p1[0] - sd.u[0] * 1.1 + n0[0] * 99, p1[1] - sd.u[1] * 1.1 + n0[1] * 99]
                ])
              ]
            );
            house = outerRings(cut).sort((x, y) => ringArea(y) - ringArea(x))[0] ?? piece;
          }
          const at: P2 = [(p0[0] + p1[0]) / 2 + n0[0], (p0[1] + p1[1]) / 2 + n0[1]];
          const use0 =
            wealth <= 1
              ? undefined
              : shopFront
                ? pick(COMMERCE)
                : sd.face === "quay" && docks
                  ? "Warehouse"
                  : undefined;
          if (ringArea(house) >= 6) build(house, at, wide, use0);
        }
      }
      // the densest quarters fill their yards too: a grid of small buildings, square to the block's main street
      if (wealth === 1 || wealth === 4) {
        const yard = outerRings(built.length ? pcDiff(blockPoly, ...built) : [blockPoly]);
        const ax = sides[0]?.u ?? [1, 0];
        const ay: P2 = [-ax[1], ax[0]];
        const [cw, cd, gap] = wealth === 1 ? [3.4, 3.6, 0.7] : [6, 7, 0.5];
        for (const y of yard) {
          if (ringArea(y) < cw * cd) continue;
          let u0 = Infinity;
          let u1 = -Infinity;
          let v0 = Infinity;
          let v1 = -Infinity;
          for (const p of y) {
            const u = p[0] * ax[0] + p[1] * ax[1];
            const v = p[0] * ay[0] + p[1] * ay[1];
            u0 = Math.min(u0, u);
            u1 = Math.max(u1, u);
            v0 = Math.min(v0, v);
            v1 = Math.max(v1, v);
          }
          const yp: PC.Polygon = [asRing(y)];
          for (let v = v0 + gap; v < v1 - cd * 0.6; v += cd + gap)
            for (let u = u0 + gap + (R() - 0.5); u < u1 - cw * 0.6; u += cw + gap) {
              if (R() < 0.22) continue;
              const at = (uu: number, vv: number): P2 => [ax[0] * uu + ay[0] * vv, ax[1] * uu + ay[1] * vv];
              const q = [at(u, v), at(u + cw, v), at(u + cw, v + cd), at(u, v + cd)];
              const h = outerRings(pcInter([asRing(q)], yp))[0];
              if (h && ringArea(h) > cw * cd * 0.7)
                build(h, at(u + cw / 2, v + cd / 2), false, wealth === 1 ? "Shack" : undefined);
            }
        }
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
          const cl = claim(
            pl,
            j => CID[j] >= 0 && city.home[CID[j]] === 1 && use[CID[j]] !== "water" && use[CID[j]] !== "town",
            0,
            0
          );
          if (cl) {
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
  // who owns each building: its cell's holder, the Watch its guardhouses, the agents a quiet house in the old town
  for (const b of B) b.owner = city.faction[b.cell] >= 0 ? city.faction[b.cell] : undefined;
  for (const b of B) if (b.type === "Guardhouse") b.owner = 1;
  for (const b of B) if (b.landmark && b.type === "Bank") b.owner = 0;
  {
    const quiet = B.filter(b => !b.name && kind[b.cell] === "old" && b.type === "Residence");
    if (quiet.length) quiet[Math.floor(R() * quiet.length)].owner = 6;
    const tav = B.find(b => b.name === "The Gilded Anchor");
    if (tav) tav.owner = 5;
  }
  for (const b of B) {
    const o = city.edits.owners?.[b.key ?? ""];
    if (o !== undefined) b.owner = o < 0 ? undefined : o;
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
function hedgeEdges(city: City): [P2, P2][] {
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
    if (r === 6 || r === 8) return [170, 146, 112];
    if (water(j)) return wash(x, y, WD[j] <= 2 ? [128, 176, 196] : [150, 194, 210]);
    const ci = CID[j];
    const k = kindAt(j);
    if (r === 9) return [150, 136, 120];
    if (r && r !== 5) return wash(x, y, PAPER);
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
  // ink: the shore, street edges, field hedges; watercolour pooling a little darker along each wash's edge
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const j = y * W + x;
      const k = j * 4;
      const r = RD[j];
      const wt = water(j);
      let ink = false;
      let pool = false;
      for (let q = 0; q < 8; q += 2) {
        const o = j + N4[q] + N4[q + 1] * W;
        if (!wt && water(o)) ink = true;
        if (!r && !RD[o] && CID[o] !== CID[j] && !water(o)) pool = true;
      }
      if (ink) for (let i = 0; i < 3; i++) Pl[k + i] = Pl[k + i] * 0.3 + INK[i] * 0.7;
      else if (pool) {
        const o = j + (CID[j + 1] !== CID[j] ? 1 : CID[j - 1] !== CID[j] ? -1 : CID[j + W] !== CID[j] ? W : -W);
        for (let i = 0; i < 3; i++) Pl[k + i] = Pl[k + i] * 0.6 + Pl[o * 4 + i] * 0.4;
      }
    }
  for (const [a, b] of hedgeEdges(city)) {
    const L = dist(a, b);
    for (let t = 0; t <= L; t += 0.5) {
      const X = Math.round(a[0] + ((b[0] - a[0]) * t) / L);
      const Y = Math.round(a[1] + ((b[1] - a[1]) * t) / L);
      if (X < 0 || Y < 0 || X >= W || Y >= H || RD[Y * W + X]) continue;
      const q = (Y * W + X) * 4;
      for (let i = 0; i < 3; i++) Pl[q + i] = Pl[q + i] * 0.62 + INK[i] * 0.38;
    }
  }
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
      if (kindAt(Y * W + X) === "woods" && !RD[Y * W + X]) dot(X, Y);
    }
  // the reference map: the plan faded back toward the paper
  const faded = new ImageData(new Uint8ClampedArray(Pl), W, H);
  for (let j = 0; j < W * H; j++)
    for (let i = 0; i < 3; i++) faded.data[j * 4 + i] = faded.data[j * 4 + i] * 0.6 + PAPER[i] * 0.4;
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
      const t = rim ? 0.55 : RD[j] && RD[j] !== 5 ? 0 : wash;
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
  for (let j = 0; j < N; j++) {
    if (!HD[j]) continue;
    const x = j % W;
    const y = (j / W) | 0;
    const ed = Math.min(x, y, W - 1 - x, H - 1 - y);
    const t = Math.min(0.78, 0.3 + HD[j] / 260 + Math.max(0, (24 - ed) / 24) * 0.35);
    const k = j * 4;
    for (const D of [districts.data, factions.data, Pl, faded.data])
      for (let i = 0; i < 3; i++) D[k + i] = (D[k + i] * (1 - t * 0.7) + fadeTo[i] * t * 0.7) * 0.8;
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
  return { terrain: plan, map: faded, districts, factions, CID, BID };
}
