// Fills a city's blocks with terraced buildings and paints it twice: the pixel terrain view from the shared city tiles,
// and a flat map view for finding the way. Nothing here is tuned to one town: every cell paints by its kind
import { COAST, groundPixel } from "../ground-tiles";
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
  hut: [4, 5, 4, 6],
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

export const DIST_COL = ["#d9a441", "#8e7cc3", "#5f9fc0", "#c9714f", "#7fae6a", "#9a7356", "#c27fa5", "#6fa8a0"];
export interface Painted {
  terrain: ImageData;
  map: ImageData;
  districts: ImageData;
  factions: ImageData;
  plan: ImageData;
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
    if (!k || k === "square" || k === "park" || k === "pond" || landCell[i]) continue;
    const q = poly(i);
    const mix0 = MIX[k];
    const wealthy = k === "wealthy";
    const fronts: { a: P2; b: P2; set: number }[] = [];
    for (let e = 0; e < q.length; e++) {
      const a = q[e];
      const b = q[(e + 1) % q.length];
      if (dist(a, b) < 6) continue;
      const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      // no front along an edge inside the block: the terrace runs on across it
      const across = cells.c[i].find(
        (j: number) =>
          j < n &&
          cells.v[j].some((v: number) => vertices.p[v] === a) &&
          cells.v[j].some((v: number) => vertices.p[v] === b)
      );
      if (across !== undefined && city.block[across] === city.block[i] && !roadNear(m, 1)) continue;
      if (roadNear(m, 2) || k === "old" || k === "centre" || k === "docks" || k === "shanty")
        fronts.push({ a, b, set: 0 });
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
        // set back off the street until clear of it
        let pl = rect([a[0] + tx * t + nX * set, a[1] + ty * t + nY * set], tx, ty, nX, nY, fl, d);
        let cl = free(pl, i, false);
        for (let back = 1; !cl && back <= 3; back++) {
          pl = rect([a[0] + tx * t + nX * (set + back), a[1] + ty * t + nY * (set + back)], tx, ty, nX, nY, fl, d);
          cl = free(pl, i, false);
        }
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
    if (k === "old" || k === "centre" || k === "docks" || k === "shanty") {
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
      if (c < 0 || !city.home[c] || use[c] === "town" || use[c] === "water" || use[c] === "shanty" || R() < 0.82)
        continue;
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
  const WOD = bfs(j => kindAt(j) !== "woods");
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
        const wsh = k !== "woods" && k !== "park" && k !== "wealthy" ? washOf(k, ci, x, y, 0.55) : null;
        if (wsh) {
          const tex = (groundPixel("plains", x, y)[1] - 136) / 136;
          t = sh(wsh, 1 + tex * 0.35);
          if (k === "wheat" || k === "tilled") t = sh(t, stripe(x, y, city.ang[ci], 4) < 2 ? 1.025 : 0.985);
        }
        m = mapTile(k, x, y);
        // woods meet other ground with an edge in the map view and a shadow on the terrain
        if (k === "woods") {
          for (let q = 0; q < 8; q += 2) {
            const o = j + N4[q] + N4[q + 1] * W;
            if (o >= 0 && o < N && kindAt(o) !== "woods") {
              m = MAPC.woodsEdge;
              break;
            }
          }
          if (!WOD[j + 1] || !WOD[j + W]) t = WOODS[1];
        }
      }
      const r = RD[j];
      if (r) {
        const edge = (o: number) => o >= 0 && o < N && !RD[o] && !water(o);
        const kerb = edge(j + 1) || edge(j - 1) || edge(j + W) || edge(j - W);
        const inTown = ci >= 0 && (use[ci] === "town" || use[ci] === "shanty");
        if (r === 4 || r === 3 || r === 2) {
          t = inTown || r >= 3 ? mix(stone(x, y), [226, 220, 204], 0.4) : mix(dirt(x, y), [214, 196, 160], 0.5);
          m = MAPC.road;
          if (kerb) {
            t = mix(t, sh(terrainTile(k, x, y, city.ang[ci] ?? 0), 0.9), 0.5);
            m = r >= 4 ? MAPC.roadEdge : MAPC.laneEdge;
          }
        } else if (r === 7) {
          t = stone(x, y);
          m = MAPC.road;
        } else if (r === 1) {
          t = mix(dirt(x, y), [214, 196, 160], kerb ? 0.25 : 0.55);
          m = kerb ? MAPC.laneEdge : MAPC.track;
        } else if (r === 6 || r === 8) {
          t = kerb || (x + y) % 4 === 0 ? P.wood2 : P.wood;
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
      if (X >= 0 && Y >= 0 && X < W && Y < H && !RD[Y * W + X]) {
        const q = (Y * W + X) * 4;
        for (let i = 0; i < 3; i++) Mp[q + i] = Mp[q + i] * 0.5 + MAPC.hedge[i] * 0.5;
      }
    }
  }
  for (const [a, b] of hedgeEdges(city)) {
    const L = dist(a, b);
    for (let s = 0; s <= L; s += 0.7) {
      const X = Math.round(a[0] + ((b[0] - a[0]) * s) / L);
      const Y = Math.round(a[1] + ((b[1] - a[1]) * s) / L);
      if (X < 0 || Y < 0 || X >= W || Y >= H || RD[Y * W + X]) continue;
      const q = (Y * W + X) * 4;
      for (let i = 0; i < 3; i++) T[q + i] = T[q + i] * 0.55 + WOODS[2][i] * 0.45;
    }
  }
  // shadows to the lower right
  const castsShadow = (j: number) => RD[j] === 5;
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
  // the plan: a hand-drawn town plan in ink and watercolour, after the 1830 plan of Dublin
  const plan = new ImageData(W, H);
  const Pl = plan.data;
  const PAPER: C3 = [246, 241, 228];
  const INK: C3 = [92, 80, 68];
  const wash = (x: number, y: number, c: C3): C3 => sh(c, grain(x, y));
  const planOf = (j: number, x: number, y: number): C3 => {
    if (water(j)) return wash(x, y, WD[j] <= 2 ? [128, 176, 196] : [150, 194, 210]);
    const ci = CID[j];
    const k = kindAt(j);
    const r = RD[j];
    if (r === 5) return [120, 108, 96];
    if (r === 9) return [150, 136, 120];
    if (r === 6 || r === 8) return [170, 146, 112];
    if (r) return PAPER;
    switch (k) {
      case "centre":
      case "square":
      case "docks":
      case "shanty":
      case "old":
        return wash(x, y, k === "old" ? [224, 222, 210] : [222, 218, 208]);
      default:
        return washOf(k, ci, x, y, 0.2) ?? wash(x, y, [222, 218, 208]);
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
        if (!r && RD[o] && RD[o] !== 5 && !wt) ink = true;
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
  // the district and faction views: the plain map with each area washed in its colour and edged where it ends
  const districts = new ImageData(new Uint8ClampedArray(Pl), W, H);
  const factions = new ImageData(new Uint8ClampedArray(Pl), W, H);
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
      const t = rim ? 0.85 : RD[j] && RD[j] !== 5 ? wash * 0.35 : wash;
      const cc = rim ? sh(c, 0.7) : c;
      for (let i = 0; i < 3; i++) D[k + i] = D[k + i] * (1 - t) + cc[i] * t;
    }
  };
  area(
    districts.data,
    ci => city.district[ci],
    v => (v >= 0 ? hex(DIST_COL[v % DIST_COL.length]) : null),
    0.38
  );
  area(
    factions.data,
    ci => city.faction[ci],
    v => (v >= 0 ? hex(city.factions[v]?.col ?? "#888888") : null),
    0.42
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
    const tw = t * (water(j) ? 0.45 : 1);
    for (let i = 0; i < 3; i++) T[k + i] = (T[k + i] * (1 - tw) + 20 * tw) * 0.8;
    for (const D of [Mp, districts.data, factions.data, Pl])
      for (let i = 0; i < 3; i++) D[k + i] = (D[k + i] * (1 - t * 0.7) + fadeTo[i] * t * 0.7) * 0.8;
  }
  // the city's own edge: a soft band inside, a thin line on it
  const HI = bfs(j => CID[j] < 0 || home[CID[j]] !== 1);
  for (let j = 0; j < N; j++) {
    const d = HI[j];
    if (!d || d > 9) continue;
    const k = j * 4;
    const tt = d <= 2 ? 0.88 : 0.28 * (1 - (d - 3) / 7);
    const ct: C3 = d <= 2 ? [14, 12, 10] : [60, 40, 30];
    const cm: C3 = d <= 2 ? [26, 22, 18] : [170, 110, 90];
    for (let i = 0; i < 3; i++) T[k + i] = T[k + i] * (1 - tt) + ct[i] * tt;
    for (const D of [Mp, districts.data, factions.data, Pl])
      for (let i = 0; i < 3; i++) D[k + i] = D[k + i] * (1 - tt) + cm[i] * tt;
  }
  return { terrain, map: plan, districts, factions, plan, CID, BID };
}
