// A settlement's city map, built as its own small Azgaar-format graph (cells, vertices, features) so the map's own
// path, outline and label code runs on it. Cells are seeded on a loose grid in planned districts and at random elsewhere;
// main roads run cell to cell through the centres, streets and lanes along cell edges
import { calculateVoronoi } from "@/generators/voronoi";
import { connectVertices, findPath } from "@/utils/pathUtils";

export type P2 = [number, number];
export type Kind = "centre" | "wealthy" | "old" | "docks" | "shanty" | "square" | "park" | "pond";
export type Use = "town" | "water" | "wheat" | "tilled" | "pasture" | "woods" | "shanty";

export interface RegionCell {
  p: P2[];
  c: P2;
  h: number;
  b?: number;
}
export interface Region {
  cells: RegionCell[];
  rivers?: { pts?: P2[]; p?: P2[] }[];
  routes: { g: string; pts: P2[] }[];
  burgs: { n: string; x: number; y: number; port?: number; walls?: number }[];
}

export interface District {
  id: number;
  name: string;
  kind: Kind;
  cells: number[];
}
export interface Road {
  type: "main" | "street" | "lane" | "pier" | "path";
  name?: string;
  cells?: number[]; // a route through cell centres
  edges?: [number, number][]; // vertex pairs along cell edges
  pts: P2[]; // drawn line
}
export interface Building {
  id: number;
  cell: number;
  poly: P2[];
  type: string;
  roof: string;
  name?: string;
  addr: string;
  district?: number;
  landmark?: boolean;
  enter?: string;
}

export interface City {
  W: number;
  H: number;
  pack: any;
  home: Uint8Array;
  use: Use[];
  kind: (Kind | null)[];
  district: Int16Array;
  districts: District[];
  roads: Road[];
  walls: P2[][];
  towers: P2[];
  gates: P2[];
  buildings: Building[];
  trees: [number, number, number][];
  squareCell: number;
  ang: Float32Array;
}

const rngOf = (seed: number) => {
  let v = ((seed * 2654435761) >>> 0) % 2147483646 || 1;
  return () => {
    v = (v * 16807) % 2147483647;
    return v / 2147483647;
  };
};
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
const segDist = (p: P2, a: P2, b: P2) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
};
const polyDist = (p: P2, line: P2[]) => {
  let d = Infinity;
  for (let i = 0; i < line.length - 1; i++) d = Math.min(d, segDist(p, line[i], line[i + 1]));
  return d;
};

const STREETS = [
  "Ledger Street",
  "Mint Street",
  "Brass Lane",
  "Coin Row",
  "Gilt Way",
  "Tallow Lane",
  "Chandler Row",
  "Counting Lane",
  "Vault Street",
  "Scale Street",
  "Silver Street",
  "Bell Street",
  "Seal Street",
  "Cask Lane",
  "Penny Lane",
  "Rope Walk",
  "Cooper Street",
  "Lantern Lane",
  "Weigh House Lane",
  "Candle Row",
  "Anchor Street",
  "Salt Lane",
  "Tar Walk",
  "Net Row"
];

export function buildCity(region: Region, burgName: string, opts: { scale?: number; margin?: number } = {}): City {
  const U = opts.scale ?? 14;
  const M = opts.margin ?? 6;
  const B = region.burgs.find(b => b.n === burgName);
  if (!B) throw new Error(`No settlement ${burgName}`);
  const homeR = region.cells.find(c => inPoly(c.p, B.x, B.y)) as RegionCell;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of homeR.p) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const ox = x0 - M;
  const oy = y0 - M;
  const W = Math.ceil((x1 - x0 + 2 * M) * U);
  const H = Math.ceil((y1 - y0 + 2 * M) * U);
  const toP = ([rx, ry]: P2): P2 => [(rx - ox) * U, (ry - oy) * U];
  const R = rngOf(Math.round(B.x * 31 + B.y * 977));
  const RC = region.cells
    .filter(c => c.p.some(([x, y]) => x > ox - 4 && x < ox + W / U + 4 && y > oy - 4 && y < oy + H / U + 4))
    .map(c => ({ rc: c, poly: c.p.map(toP), water: c.h < 20, home: c === homeR }));
  const regionAt = (x: number, y: number) => RC.find(r => inPoly(r.poly, x, y));
  const homeP = homeR.p.map(toP);
  const rivers = (region.rivers ?? []).map(r => (r.pts ?? r.p ?? []).map(toP)).filter(l => l.length > 1);

  // the town's place: the settlement point pulled toward the shore
  const C = toP([B.x, B.y]);
  const waterAt = (x: number, y: number) => {
    const r = regionAt(x, y);
    return !r || r.water;
  };
  let shore: P2 | null = null;
  for (let d = 4; d < 400 && !shore; d += 3)
    for (let a = 0; a < 6.28 && !shore; a += 0.2) {
      const p: P2 = [C[0] + Math.cos(a) * d, C[1] + Math.sin(a) * d];
      if (waterAt(p[0], p[1])) shore = p;
    }
  let hx0 = Infinity;
  let hx1 = -Infinity;
  let hy0 = Infinity;
  let hy1 = -Infinity;
  for (const [x, y] of homeP) {
    hx0 = Math.min(hx0, x);
    hx1 = Math.max(hx1, x);
    hy0 = Math.min(hy0, y);
    hy1 = Math.max(hy1, y);
  }
  const TR = Math.min(hx1 - hx0, hy1 - hy0) * 0.47;
  // a port's town reaches the water: its middle sits back from the shore by most of its reach
  const T: P2 = (() => {
    if (!shore) return C;
    const L = dist(C, shore) || 1;
    const k = Math.min(1, (TR * 0.72) / L);
    return [shore[0] + (C[0] - shore[0]) * k, shore[1] + (C[1] - shore[1]) * k];
  })();
  const seaDir = shore ? Math.atan2(shore[1] - T[1], shore[0] - T[0]) : 0;
  const hillDir = seaDir + Math.PI * 0.75; // away from the water, to one side

  // where the town is planned: the centre, the hill and the waterfront take a loose grid; the rest is organic
  const coastD = (x: number, y: number) => {
    let d = Infinity;
    for (let a = 0; a < 6.28; a += 0.4)
      for (let s = 3; s < 40; s += 3) {
        if (waterAt(x + Math.cos(a) * s, y + Math.sin(a) * s)) {
          d = Math.min(d, s);
          break;
        }
      }
    return d;
  };
  const planned = (x: number, y: number) => {
    const d = dist([x, y], T);
    if (d > TR * 1.02) return false;
    if (d < TR * 0.36) return true;
    const a = Math.atan2(y - T[1], x - T[0]);
    const off = Math.abs(((a - hillDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (off < 0.7) return true;
    return coastD(x, y) < 20;
  };
  const SP = 25;
  const axis = seaDir + Math.PI / 2;
  const ca = Math.cos(axis);
  const sa = Math.sin(axis);
  const pts: P2[] = [];
  const kindOfSeed: number[] = []; // 1 grid
  for (let i = -40; i < 40; i++)
    for (let j = -40; j < 40; j++) {
      const gx = T[0] + (i * ca - j * sa) * SP * 0.95 + (R() - 0.5) * 3;
      const gy = T[1] + (i * sa + j * ca) * SP * 0.95 + (R() - 0.5) * 3;
      if (gx < 2 || gy < 2 || gx > W - 2 || gy > H - 2) continue;
      if (!planned(gx, gy) || waterAt(gx, gy)) continue;
      pts.push([gx, gy]);
      kindOfSeed.push(1);
    }
  for (let t = 0; t < 40000; t++) {
    const x = R() * W;
    const y = R() * H;
    if (planned(x, y) && !waterAt(x, y)) continue;
    if (pts.some(p => Math.abs(p[0] - x) < SP * 0.8 && Math.abs(p[1] - y) < SP * 0.8 && dist(p, [x, y]) < SP * 0.8))
      continue;
    pts.push([x, y]);
    kindOfSeed.push(0);
  }
  const boundary: P2[] = [];
  for (let x = -SP; x <= W + SP; x += SP) boundary.push([x, -SP], [x, H + SP]);
  for (let y = 0; y <= H; y += SP) boundary.push([-SP, y], [W + SP, y]);
  let vor = calculateVoronoi(pts, boundary);
  // relax the organic cells only, so the grid stays square
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < pts.length; i++) {
      if (kindOfSeed[i]) continue;
      const vs = vor.cells.v[i].map(v => vor.vertices.p[v]).filter(Boolean);
      if (vs.length < 3) continue;
      const cx = vs.reduce((s, p) => s + p[0], 0) / vs.length;
      const cy = vs.reduce((s, p) => s + p[1], 0) / vs.length;
      if (cx > 0 && cy > 0 && cx < W && cy < H) pts[i] = [cx, cy];
    }
    vor = calculateVoronoi(pts, boundary);
  }
  const { cells, vertices } = vor;
  const n = pts.length;

  // the graph in Azgaar's shape: cells.p, cells.h, cells.f, features
  const homeMask = new Uint8Array(n);
  const use: Use[] = new Array(n);
  const ang = new Float32Array(n);
  const isWater = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const r = regionAt(x, y);
    homeMask[i] = r?.home ? 1 : 0;
    if (!r || r.water || rivers.some(l => polyDist([x, y], l) < 9)) isWater[i] = 1;
    ang[i] = R() * Math.PI;
  }
  const h = Uint8Array.from({ length: n }, (_, i) => (isWater[i] ? 10 : 30));
  const f = Uint16Array.from({ length: n }, (_, i) => (isWater[i] ? 2 : 1));
  const pack: any = {
    cells: { ...cells, p: pts, h, f },
    vertices,
    features: [0, { i: 1, type: "island", land: true }, { i: 2, type: "ocean", land: false }]
  };

  // uses: the town disc in the home cell, farmland and woods round it
  const dT = (i: number) => dist(pts[i], T);
  for (let i = 0; i < n; i++) {
    if (isWater[i]) {
      use[i] = "water";
      continue;
    }
    if (homeMask[i] && dT(i) < TR) {
      use[i] = "town";
      continue;
    }
    const r = R();
    use[i] = r < 0.2 ? "woods" : r < 0.45 ? "wheat" : r < 0.65 ? "tilled" : "pasture";
  }
  for (let i = 0; i < n; i++)
    if (use[i] !== "town" && use[i] !== "water" && use[i] !== "woods") {
      const wn = cells.c[i].filter(j => use[j] === "woods").length;
      if (wn >= 3 && R() < 0.4) use[i] = "woods";
    }
  const town = [...Array(n).keys()].filter(i => use[i] === "town");

  // districts, by place: the centre round the square, the planned hill, the waterfront, two old quarters
  const kind: (Kind | null)[] = new Array(n).fill(null);
  const district = new Int16Array(n).fill(-1);
  const squareCell = town.slice().sort((a, b) => dT(a) - dT(b))[0];
  const coastC = new Float32Array(n);
  for (const i of town) coastC[i] = cells.c[i].some(j => isWater[j]) ? 0 : 99;
  const sideOfAxis = (i: number) => (pts[i][0] - T[0]) * Math.cos(seaDir) + (pts[i][1] - T[1]) * Math.sin(seaDir);
  for (const i of town) {
    const [x, y] = pts[i];
    const d = dT(i);
    const a = Math.atan2(y - T[1], x - T[0]);
    const off = Math.abs(((a - hillDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (coastC[i] === 0) kind[i] = "docks";
    else if (d < TR * 0.36) kind[i] = "centre";
    else if (off < 0.7) kind[i] = "wealthy";
    else kind[i] = "old";
  }
  kind[squareCell] = "square";
  const DIST: District[] = [
    { id: 0, name: "The Exchange", kind: "centre", cells: [] },
    { id: 1, name: "Gilt Hill", kind: "wealthy", cells: [] },
    { id: 2, name: "Bankside", kind: "docks", cells: [] },
    { id: 3, name: "Old Town", kind: "old", cells: [] },
    { id: 4, name: "Saltgate", kind: "old", cells: [] },
    { id: 5, name: "The Rookery", kind: "shanty", cells: [] }
  ];
  for (const i of town) {
    const k = kind[i];
    district[i] = k === "centre" || k === "square" ? 0 : k === "wealthy" ? 1 : k === "docks" ? 2 : 0;
    if (k === "old") {
      const s =
        (pts[i][0] - T[0]) * Math.cos(hillDir + Math.PI / 2) + (pts[i][1] - T[1]) * Math.sin(hillDir + Math.PI / 2);
      district[i] = s > 0 ? 3 : 4;
    }
  }
  void sideOfAxis;
  // a park and a pond in the hill, a market square in the old town
  {
    const hill = town.filter(
      i => kind[i] === "wealthy" && cells.c[i].every(j => use[j] === "town" && kind[j] !== "docks")
    );
    hill.sort((a, b) => dT(b) - dT(a));
    if (hill.length > 4) {
      kind[hill[1]] = "park";
      const pond = hill.find(i => i !== hill[1] && !cells.c[i].includes(hill[1]));
      if (pond !== undefined) kind[pond] = "pond";
    }
    const old = town.filter(i => kind[i] === "old" && cells.c[i].every(j => use[j] === "town"));
    if (old.length) kind[old[Math.floor(old.length / 2)]] = "square";
  }
  // the shanty: farmland just outside the town, on the side away from the hill
  {
    const away: P2 = [T[0] - Math.cos(hillDir) * TR, T[1] - Math.sin(hillDir) * TR];
    const out = [...Array(n).keys()]
      .filter(i => homeMask[i] && use[i] !== "town" && use[i] !== "water" && cells.c[i].some(j => use[j] === "town"))
      .sort((a, b) => dist(pts[a], away) - dist(pts[b], away));
    for (const i of out.slice(0, 4)) {
      use[i] = "shanty";
      kind[i] = "shanty";
      district[i] = 5;
    }
  }
  for (let i = 0; i < n; i++) if (district[i] >= 0) DIST[district[i]].cells.push(i);

  // ---- roads
  const roads: Road[] = [];
  const onMain = new Uint8Array(n);
  const blocked = (i: number) => kind[i] === "pond" || kind[i] === "park" || i === undefined;
  const mid = (a: number, b: number): P2 => {
    const sh = cells.v[a].filter(v => cells.v[b].includes(v));
    if (sh.length >= 2) {
      const [p, q] = [vertices.p[sh[0]], vertices.p[sh[1]]];
      return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    }
    return [(pts[a][0] + pts[b][0]) / 2, (pts[a][1] + pts[b][1]) / 2];
  };
  // a route's drawn line: through each shared edge's middle, bending at the centres
  const lineOf = (route: number[]): P2[] => {
    const out: P2[] = [pts[route[0]]];
    for (let k = 1; k < route.length; k++) {
      const m = mid(route[k - 1], route[k]);
      const c = pts[route[k]];
      const prev = out[out.length - 1];
      for (let s = 1; s <= 4; s++) {
        const t = s / 4;
        out.push([prev[0] + (m[0] - prev[0]) * t, prev[1] + (m[1] - prev[1]) * t]);
      }
      if (k < route.length - 1) {
        // to the next edge middle with the centre as a pull point
        const m2 = mid(route[k], route[k + 1]);
        for (let s = 1; s <= 6; s++) {
          const t = s / 6;
          const a: P2 = [m[0] + (c[0] - m[0]) * t, m[1] + (c[1] - m[1]) * t];
          const b: P2 = [c[0] + (m2[0] - c[0]) * t, c[1] + (m2[1] - c[1]) * t];
          out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      } else out.push(c);
    }
    return out;
  };
  // the turn rule: from the cell we came from, a main road may go on or bend a step, never double back
  const prevOf = new Int32Array(n).fill(-1);
  const mainRoute = (from: number, to: number) => {
    const goal = pts[to];
    prevOf.fill(-1);
    const path = findPath(
      from,
      id => id === to,
      (cur, next) => {
        if (blocked(next) || isWater[next]) return Infinity;
        const step = dist(pts[cur], pts[next]);
        const d0 = Math.atan2(pts[next][1] - pts[cur][1], pts[next][0] - pts[cur][0]);
        const g = Math.atan2(goal[1] - pts[cur][1], goal[0] - pts[cur][0]);
        const off = 1 - Math.cos(d0 - g);
        let turn = 0;
        const p = prevOf[cur];
        if (p >= 0) {
          const d1 = Math.atan2(pts[cur][1] - pts[p][1], pts[cur][0] - pts[p][0]);
          const tr = 1 - Math.cos(d0 - d1);
          turn = tr > 1.1 ? Infinity : tr * 2.5;
        }
        if (prevOf[next] < 0) prevOf[next] = cur;
        const base = onMain[next] ? 0.45 : use[next] === "town" ? 1 : use[next] === "woods" ? 2.2 : 1.3;
        return step * (base + off * 1.4 + turn);
      },
      pack
    );
    return path ? (path[0] === from ? path : [from, ...path]) : null;
  };
  // exits: where the region's roads leave the cell, plus a road toward the nearest neighbouring settlement
  const exits: { cell: number; name: string; out: P2 }[] = [];
  const nearestCell = (p: P2, ok: (i: number) => boolean) => {
    let b = -1;
    let bd = Infinity;
    for (let i = 0; i < n; i++)
      if (ok(i)) {
        const d = dist(pts[i], p);
        if (d < bd) {
          bd = d;
          b = i;
        }
      }
    return b;
  };
  const edgeCell = (dir: number) => {
    // the far land cell in a direction, near the view edge
    let p: P2 = [...T];
    let last = -1;
    for (let s = 0; s < 900; s += 6) {
      p = [T[0] + Math.cos(dir) * s, T[1] + Math.sin(dir) * s];
      if (p[0] < 6 || p[1] < 6 || p[0] > W - 6 || p[1] > H - 6) break;
      const c = nearestCell(p, i => !isWater[i]);
      if (c >= 0 && !isWater[c]) last = c;
    }
    return last;
  };
  const routes = region.routes.filter(r => r.pts.some(([x, y]) => Math.hypot(x - B.x, y - B.y) < 1.5));
  for (const r of routes) {
    const far = r.pts.map(toP).sort((a, b) => dist(b, C) - dist(a, C))[0];
    exits.push({ cell: edgeCell(Math.atan2(far[1] - T[1], far[0] - T[0])), name: "Carnival Road", out: far });
  }
  for (const nb of region.burgs) {
    if (nb.n === burgName || exits.length >= 3 || exits.some(e => e.name.startsWith(nb.n))) continue;
    const p = toP([nb.x, nb.y]);
    if (dist(p, C) > 900) continue;
    const dir = Math.atan2(p[1] - T[1], p[0] - T[0]);
    if (exits.some(e => Math.abs(Math.atan2(e.out[1] - T[1], e.out[0] - T[0]) - dir) < 0.6)) continue;
    if (waterAt(T[0] + Math.cos(dir) * TR * 1.4, T[1] + Math.sin(dir) * TR * 1.4)) continue;
    exits.push({ cell: edgeCell(dir), name: `${nb.n} Road`, out: p });
  }
  for (const e of exits) {
    if (e.cell < 0) continue;
    const route = mainRoute(squareCell, e.cell);
    if (!route) continue;
    for (const c of route) onMain[c] = 1;
    roads.push({ type: "main", name: e.name, cells: route, pts: lineOf(route) });
  }
  // the dock road: from the square to the waterfront
  {
    const docks = town.filter(i => kind[i] === "docks");
    const far = docks.sort((a, b) => dT(b) - dT(a))[0];
    if (far !== undefined) {
      const route = mainRoute(squareCell, far);
      if (route) {
        for (const c of route) onMain[c] = 1;
        roads.push({ type: "main", name: "Bankside", cells: route, pts: lineOf(route) });
      }
    }
  }

  // streets and lanes along the cell edges: most edges in planned districts, half in the old town, few in the shanty
  const edgeKey = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const edgeSeen = new Set<string>();
  const streetEdges: { a: number; b: number; c1: number; c2: number; type: Road["type"] }[] = [];
  const hasRoad = new Uint8Array(n);
  for (const i of town) if (onMain[i]) hasRoad[i] = 1;
  const isTownish = (i: number) => use[i] === "town" || use[i] === "shanty";
  for (let i = 0; i < n; i++) {
    if (!isTownish(i)) continue;
    for (const j of cells.c[i]) {
      if (j >= n || !isTownish(j)) continue;
      const sh = cells.v[i].filter(v => cells.v[j].includes(v));
      if (sh.length < 2) continue;
      const k = edgeKey(sh[0], sh[1]);
      if (edgeSeen.has(k)) continue;
      edgeSeen.add(k);
      if (blocked(i) && blocked(j)) continue;
      const ki = kind[i];
      const kj = kind[j];
      const ks = [ki, kj];
      const shanty = ks.includes("shanty");
      const plannedE = ks.every(x => x === "centre" || x === "docks" || x === "square" || x === "wealthy");
      const p = shanty ? 0.45 : ks.includes("wealthy") && !ks.includes("old") ? 0.55 : plannedE ? 0.9 : 0.55;
      const sq = ks.includes("square");
      if (sq || R() < p) {
        streetEdges.push({
          a: sh[0],
          b: sh[1],
          c1: i,
          c2: j,
          type: shanty ? "path" : plannedE || sq ? "street" : "lane"
        });
        hasRoad[i] = 1;
        hasRoad[j] = 1;
      }
    }
  }
  // every block reaches a road
  for (const i of town) {
    if (hasRoad[i] || blocked(i)) continue;
    const j = cells.c[i].find(x => isTownish(x));
    if (j === undefined) continue;
    const sh = cells.v[i].filter(v => cells.v[j].includes(v));
    if (sh.length >= 2) {
      streetEdges.push({ a: sh[0], b: sh[1], c1: i, c2: j, type: "lane" });
      hasRoad[i] = 1;
    }
  }
  // chains of street edges become named streets
  {
    const adj = new Map<number, number[]>();
    streetEdges.forEach((e, k) => {
      for (const v of [e.a, e.b]) {
        if (!adj.has(v)) adj.set(v, []);
        adj.get(v)?.push(k);
      }
    });
    const used = new Uint8Array(streetEdges.length);
    let sn = 0;
    for (let k = 0; k < streetEdges.length; k++) {
      if (used[k]) continue;
      const chain = [k];
      used[k] = 1;
      const grow = (v: number, front: boolean) => {
        let cur = v;
        for (;;) {
          const list = (adj.get(cur) ?? []).filter(x => !used[x] && streetEdges[x].type === streetEdges[k].type);
          if (list.length !== 1 && (adj.get(cur) ?? []).length > 2 && list.length === 0) break;
          const nx = list[0];
          if (nx === undefined) break;
          used[nx] = 1;
          if (front) chain.unshift(nx);
          else chain.push(nx);
          cur = streetEdges[nx].a === cur ? streetEdges[nx].b : streetEdges[nx].a;
          if (chain.length > 8) break;
        }
      };
      grow(streetEdges[k].b, false);
      grow(streetEdges[k].a, true);
      const edges = chain.map(x => [streetEdges[x].a, streetEdges[x].b] as [number, number]);
      const linePts: P2[] = [];
      for (const [a, b] of edges) linePts.push(vertices.p[a] as P2, vertices.p[b] as P2);
      let len = 0;
      for (const [a, b] of edges) len += dist(vertices.p[a] as P2, vertices.p[b] as P2);
      const type = streetEdges[k].type;
      roads.push({
        type,
        edges,
        pts: linePts,
        name: type === "street" && len > 45 ? STREETS[sn++ % STREETS.length] : undefined
      });
    }
  }
  // piers: a boardwalk along every dock edge that meets the water, spurs out from it
  for (const i of town) {
    if (kind[i] !== "docks") continue;
    for (const j of cells.c[i]) {
      if (!isWater[j]) continue;
      const sh = cells.v[i].filter(v => cells.v[j].includes(v));
      if (sh.length < 2) continue;
      const a = vertices.p[sh[0]] as P2;
      const b = vertices.p[sh[1]] as P2;
      roads.push({ type: "pier", edges: [[sh[0], sh[1]]], pts: [a, b] });
      const L = dist(a, b);
      const nx = -(b[1] - a[1]) / L;
      const ny = (b[0] - a[0]) / L;
      const sgn = isWater[nearestCell([(a[0] + b[0]) / 2 + nx * 6, (a[1] + b[1]) / 2 + ny * 6], () => true)] ? 1 : -1;
      for (let t = 4 + R() * 4; t < L - 3; t += 8 + R() * 9) {
        const s: P2 = [a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L];
        const len = 8 + R() * 16;
        const e: P2 = [s[0] + nx * sgn * len, s[1] + ny * sgn * len];
        roads.push({ type: "pier", pts: [s, e] });
        const r = R();
        if (r < 0.35) {
          const w = 4 + R() * 5;
          const tx = (b[0] - a[0]) / L;
          const ty = (b[1] - a[1]) / L;
          const lSide = r < 0.2 ? -1 : 0;
          roads.push({
            type: "pier",
            pts: [
              [e[0] + tx * w * lSide, e[1] + ty * w * lSide],
              [e[0] + tx * w, e[1] + ty * w]
            ]
          });
        }
      }
    }
  }

  // walls: the town's outline from the map's own vertex walk; gates where main roads cross it
  const townSet = new Set(town);
  const walls: P2[][] = [];
  const checked = new Uint8Array(n);
  for (const i of town) {
    if (checked[i] || !cells.c[i].some(j => !townSet.has(j))) continue;
    const start = cells.v[i].find(v => vertices.c[v].some(c => !townSet.has(c)));
    if (start === undefined) continue;
    const chain = connectVertices({
      vertices,
      startingVertex: start,
      ofSameType: c => townSet.has(c),
      addToChecked: c => {
        checked[c] = 1;
      },
      closeRing: true
    });
    if (chain.length < 4) continue;
    // the seafront stays open: break the wall wherever it touches water
    let run: P2[] = [];
    for (const v of chain) {
      if (vertices.c[v].some(c => isWater[c])) {
        if (run.length > 1) walls.push(run);
        run = [];
      } else run.push(vertices.p[v] as P2);
    }
    if (run.length > 1) walls.push(run);
  }
  const gates: P2[] = [];
  for (const r of roads)
    if (r.type === "main" && r.cells)
      for (let k = 1; k < r.cells.length; k++)
        if (townSet.has(r.cells[k - 1]) !== townSet.has(r.cells[k])) gates.push(mid(r.cells[k - 1], r.cells[k]));
  // towers at the wall's turns, kept apart
  const towers: P2[] = [];
  for (const w of walls)
    for (let k = 0; k < w.length - 1; k++) {
      const p = w[k];
      if (gates.some(g => dist(g, p) < 10) || towers.some(t => dist(t, p) < 22)) continue;
      towers.push(p);
    }
  for (const g of gates) towers.push(g);

  return {
    W,
    H,
    pack,
    home: homeMask,
    use,
    kind,
    district,
    districts: DIST,
    roads,
    walls,
    towers,
    gates,
    buildings: [],
    trees: [],
    squareCell,
    ang
  };
}
