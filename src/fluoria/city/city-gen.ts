// A settlement's city map, built as its own small Azgaar-format graph (cells, vertices, features) so the map's own
// path, outline and label code runs on it. Cells are seeded on a loose grid in planned districts and at random elsewhere;
// main roads run cell to cell through the centres, streets and lanes along cell edges
import { calculateVoronoi } from "@/generators/voronoi";
import { connectVertices, findPath } from "@/utils/pathUtils";

export type P2 = [number, number];
export type Kind = "centre" | "wealthy" | "old" | "docks" | "shanty" | "square" | "park" | "pond";
export type Use = "town" | "water" | "wheat" | "tilled" | "pasture" | "grass" | "woods" | "shanty";

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
  wealth: number; // 1 the poorest to 5 the richest; sets lot size and how much is built
}
export interface Road {
  type: "main" | "street" | "lane" | "pier" | "path" | "track";
  key: string;
  name?: string;
  cells?: number[]; // a route through cell centres
  edges?: [number, number][]; // vertex pairs along cell edges
  ekeys?: string[];
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
  cells?: number[]; // a landmark's cells: it stands on all of them
  owner?: number;
  key?: string;
  enter?: string;
}

export interface Landmark {
  id: number;
  cells: number[];
  name: string;
  type: string;
  roof: string;
  enter?: string;
}
export interface Gate {
  p: P2;
  a: P2; // the wall edge's ends, where its towers stand
  b: P2;
  name: string;
  road: string;
}
export interface Faction {
  id: number;
  name: string;
  kind: string; // Rulers, Law, Guild, Underworld, Outsiders
  col: string;
}
export const FACTIONS: Faction[] = [
  { id: 0, name: "The Aurum", kind: "Rulers", col: "#c99a2e" },
  { id: 1, name: "City Watch", kind: "Law", col: "#b0453c" },
  { id: 2, name: "Weigh-Masters' Guild", kind: "Guild", col: "#4a78ad" },
  { id: 3, name: "Dockers' Guild", kind: "Guild", col: "#3a8a84" },
  { id: 4, name: "Chandlers' Guild", kind: "Guild", col: "#c27536" },
  { id: 5, name: "Rookery Crew", kind: "Underworld", col: "#6d4a80" },
  { id: 6, name: "Imperial Agents", kind: "Outsiders", col: "#2e3d66" }
];
export interface Farm {
  cell: number;
  houses: number;
}
/** Everything a DM changed, kept apart from the generated city and laid over it on every rebuild */
export interface Edits {
  seed?: number;
  cells?: Record<number, string>;
  districts?: Record<number, number>;
  newDistricts?: { id: number; name: string; kind: Kind }[];
  landmarks?: Landmark[];
  roads?: { type: Road["type"]; cells: number[]; name?: string }[];
  erase?: string[];
  names?: Record<string, string>;
  factionCells?: Record<number, number>;
  owners?: Record<string, number>;
  favs?: string[];
  colors?: Record<string, string>;
  wealth?: Record<number, number>;
}
export const TOWN_KINDS: Kind[] = ["centre", "wealthy", "old", "docks", "shanty", "square", "park", "pond"];

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
  gates: Gate[];
  landmarks: Landmark[];
  farms: Farm[];
  block: Int32Array;
  factions: Faction[];
  faction: Int16Array;
  edits: Edits;
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

export function buildCity(
  region: Region,
  burgName: string,
  opts: { scale?: number; margin?: number; edits?: Edits } = {}
): City {
  const ed: Edits = opts.edits ?? {};
  const erased = new Set(ed.erase ?? []);
  const named = (key: string, name?: string) => ed.names?.[key] ?? name;
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
  const R = rngOf(ed.seed ?? Math.round(B.x * 31 + B.y * 977));
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
  const kindOfSeed: number[] = []; // 0 old town, 1 grid, 2 field strip, 3 meadow
  const seedAng: number[] = [];
  // the ways out, known before the cells: rows of seeds along each so its cells, blocks and houses line the road
  const outDirs: number[] = [];
  for (const r of region.routes.filter(r => r.pts.some(([x, y]) => Math.hypot(x - B.x, y - B.y) < 1.5))) {
    const far = r.pts.map(toP).sort((a, b) => dist(b, C) - dist(a, C))[0];
    outDirs.push(Math.atan2(far[1] - T[1], far[0] - T[0]));
  }
  for (const nb of region.burgs) {
    if (nb.n === burgName || outDirs.length >= 3) continue;
    const p = toP([nb.x, nb.y]);
    if (dist(p, C) > 900) continue;
    const dir = Math.atan2(p[1] - T[1], p[0] - T[0]);
    if (outDirs.some(d => Math.abs(Math.atan2(Math.sin(d - dir), Math.cos(d - dir))) < 0.6)) continue;
    if (waterAt(T[0] + Math.cos(dir) * TR * 1.4, T[1] + Math.sin(dir) * TR * 1.4)) continue;
    outDirs.push(dir);
  }
  const roadSeeds: P2[] = [];
  for (const dir of outDirs) {
    const ux = Math.cos(dir);
    const uy = Math.sin(dir);
    for (let d = TR * 0.42; d < TR * 2.4; d += 21)
      for (const side of [-1, 0, 1]) {
        const x = T[0] + ux * d - uy * side * 19;
        const y = T[1] + uy * d + ux * side * 19;
        if (x < 2 || y < 2 || x > W - 2 || y > H - 2 || waterAt(x, y)) continue;
        if (roadSeeds.some(p => dist(p, [x, y]) < 14)) continue;
        roadSeeds.push([x, y]);
        pts.push([x, y]);
        kindOfSeed.push(1);
        seedAng.push(dir);
      }
  }
  const nearRoadSeed = (x: number, y: number) => roadSeeds.some(p => dist(p, [x, y]) < 15);
  // planned quarters: a loose grid, near exact in the centre so its cells are true rectangles
  for (let i = -40; i < 40; i++)
    for (let j = -40; j < 40; j++) {
      const ux = (i * ca - j * sa) * SP * 0.95;
      const uy = (i * sa + j * ca) * SP * 0.95;
      const core = Math.hypot(ux, uy) < TR * 0.4;
      const jit = core ? 0 : 3;
      const gx = T[0] + ux + (R() - 0.5) * jit;
      const gy = T[1] + uy + (R() - 0.5) * jit;
      if (gx < 2 || gy < 2 || gx > W - 2 || gy > H - 2) continue;
      if (!planned(gx, gy) || waterAt(gx, gy) || nearRoadSeed(gx, gy)) continue;
      pts.push([gx, gy]);
      kindOfSeed.push(1);
      seedAng.push(axis);
    }
  const townZone = (x: number, y: number) => dist([x, y], T) < TR * 1.12;
  // the old town: scattered seeds of mixed spacing
  for (let t = 0; t < 30000; t++) {
    const x = R() * W;
    const y = R() * H;
    if (!townZone(x, y) || planned(x, y) || waterAt(x, y)) continue;
    const sp = SP * (0.7 + R() * 0.55);
    if (pts.some(p => Math.abs(p[0] - x) < sp && Math.abs(p[1] - y) < sp && dist(p, [x, y]) < sp)) continue;
    pts.push([x, y]);
    kindOfSeed.push(0);
    seedAng.push(R() * Math.PI);
  }
  // farmland: patches of long strips, each patch its own direction and strip size, as Azgaar's cells vary
  {
    // only some patches are ploughed, most near the town; the rest is open meadow in larger, looser cells
    const patches: { c: P2; a: number; along: number; across: number; farmed: boolean }[] = [];
    for (let t = 0; t < 4000; t++) {
      const c: P2 = [R() * W, R() * H];
      if (townZone(c[0], c[1]) || patches.some(q => dist(q.c, c) < 95)) continue;
      const far = Math.min(1, Math.max(0, (dist(c, T) - TR * 1.3) / (TR * 2.5)));
      patches.push({ c, a: R() * Math.PI, along: 34 + R() * 34, across: 15 + R() * 12, farmed: R() < 0.7 - far * 0.5 });
    }
    const near = (x: number, y: number) => {
      let bi = -1;
      let bd = Infinity;
      patches.forEach((q, k) => {
        const d = dist(q.c, [x, y]);
        if (d < bd) {
          bd = d;
          bi = k;
        }
      });
      return bi;
    };
    for (let t = 0; t < 20000; t++) {
      const x = R() * W;
      const y = R() * H;
      const k = near(x, y);
      if (k < 0 || patches[k].farmed || townZone(x, y)) continue;
      const sp = 26 + R() * 22;
      if (pts.some(p => Math.abs(p[0] - x) < sp && Math.abs(p[1] - y) < sp && dist(p, [x, y]) < sp)) continue;
      pts.push([x, y]);
      kindOfSeed.push(3);
      seedAng.push(R() * Math.PI);
    }
    patches.forEach((q, k) => {
      if (!q.farmed) return;
      const ux = Math.cos(q.a);
      const uy = Math.sin(q.a);
      for (let i = -5; i <= 5; i++)
        for (let j = -9; j <= 9; j++) {
          const off = (j & 1) * q.along * 0.5 * (R() < 0.6 ? 1 : 0);
          const x = q.c[0] + ux * (i * q.along + off) - uy * j * q.across + (R() - 0.5) * 6;
          const y = q.c[1] + uy * (i * q.along + off) + ux * j * q.across + (R() - 0.5) * 6;
          if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
          if (townZone(x, y) || near(x, y) !== k) continue;
          if (pts.some(p => Math.abs(p[0] - x) < 9 && Math.abs(p[1] - y) < 9)) continue;
          pts.push([Math.max(1, Math.min(W - 1, x)), Math.max(1, Math.min(H - 1, y))]);
          kindOfSeed.push(2);
          seedAng.push(q.a + (R() < 0.3 ? Math.PI / 2 : 0));
        }
    });
  }
  const boundary: P2[] = [];
  for (let x = -SP; x <= W + SP; x += SP) boundary.push([x, -SP], [x, H + SP]);
  for (let y = 0; y <= H; y += SP) boundary.push([-SP, y], [W + SP, y]);
  let vor = calculateVoronoi(pts, boundary);
  // relax the old town once; the grid and the field strips stay as laid
  for (let i = 0; i < pts.length; i++) {
    if (kindOfSeed[i] !== 0) continue;
    const vs = vor.cells.v[i].map(v => vor.vertices.p[v]).filter(Boolean);
    if (vs.length < 3) continue;
    const cx = vs.reduce((q, p) => q + p[0], 0) / vs.length;
    const cy = vs.reduce((q, p) => q + p[1], 0) / vs.length;
    if (cx > 0 && cy > 0 && cx < W && cy < H) pts[i] = [cx, cy];
  }
  vor = calculateVoronoi(pts, boundary);
  const { cells, vertices } = vor;
  const n = pts.length;

  // the graph in Azgaar's shape: cells.p, cells.h, cells.f, features
  const homeMask = new Uint8Array(n);
  const use: Use[] = new Array(n);
  const ang = new Float32Array(n);
  const isWater = new Uint8Array(n);
  const forest = new Uint8Array(n);
  const meadow = (i: number) => kindOfSeed[i] === 3;
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const r = regionAt(x, y);
    homeMask[i] = r?.home ? 1 : 0;
    forest[i] = r && [5, 6, 7, 8, 9].includes(r.rc.b ?? 0) ? 1 : 0;
    if (!r || r.water || rivers.some(l => polyDist([x, y], l) < 9)) isWater[i] = 1;
    ang[i] = seedAng[i] ?? R() * Math.PI;
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
  const coastDist = (i: number) => {
    const d = 9;
    const seen = new Set([i]);
    let front = [i];
    for (let k = 0; k < 8 && front.length; k++) {
      if (front.some(j => isWater[j])) return k;
      const nx: number[] = [];
      for (const j of front)
        for (const q of cells.c[j])
          if (q < n && !seen.has(q)) {
            seen.add(q);
            nx.push(q);
          }
      front = nx;
    }
    return d;
  };
  // woods grow in large clumps on forest ground, not everywhere it is forest
  const clump = ([x, y]: P2) => {
    const h = (a: number, b: number) => {
      let v = (a * 374761393 + b * 668265263 + seedN * 97) | 0;
      v = Math.imul(v ^ (v >>> 13), 1274126177);
      return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
    };
    const fx = x / 60;
    const fy = y / 60;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const sx = (fx - ix) ** 2 * (3 - 2 * (fx - ix));
    const sy = (fy - iy) ** 2 * (3 - 2 * (fy - iy));
    const a = h(ix, iy);
    const b = h(ix + 1, iy);
    const c = h(ix, iy + 1);
    const d = h(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const seedN = Math.floor(R() * 1e6);
  for (let i = 0; i < n; i++) {
    if (isWater[i]) {
      use[i] = "water";
      continue;
    }
    if (homeMask[i] && dT(i) < TR) {
      use[i] = "town";
      continue;
    }
    // woods only where the region has forest; ploughed patches are crops, the rest meadow
    // copses, not a forest: only the peaks of the noise, on forest ground, away from town
    if (forest[i] && dT(i) > TR * 1.8 && clump(pts[i]) > 0.76) {
      use[i] = "woods";
      continue;
    }
    const r = R();
    use[i] = !meadow(i) && kindOfSeed[i] === 2 ? (r < 0.4 ? "wheat" : r < 0.7 ? "tilled" : "pasture") : "grass";
  }
  let town = [...Array(n).keys()].filter(i => use[i] === "town");

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
    { id: 0, name: "The Exchange", kind: "centre", cells: [], wealth: 4 },
    { id: 1, name: "Gilt Hill", kind: "wealthy", cells: [], wealth: 5 },
    { id: 2, name: "Bankside", kind: "docks", cells: [], wealth: 3 },
    { id: 3, name: "Old Town", kind: "old", cells: [], wealth: 2 },
    { id: 4, name: "Saltgate", kind: "old", cells: [], wealth: 2 },
    { id: 5, name: "The Rookery", kind: "shanty", cells: [], wealth: 1 }
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
  const KIND_WEALTH: Record<string, number> = { shanty: 1, old: 2, docks: 3, centre: 4, wealthy: 5 };
  for (const d of ed.newDistricts ?? [])
    DIST.push({ id: d.id, name: d.name, kind: d.kind, cells: [], wealth: KIND_WEALTH[d.kind] ?? 2 });
  for (const D of DIST) D.wealth = Math.max(1, Math.min(5, ed.wealth?.[D.id] ?? D.wealth));
  for (const D of DIST) D.name = named(`d:${D.id}`, D.name) as string;
  // the DM's painted cells and districts, over the generated ones
  const DEF: Record<string, number> = {
    centre: 0,
    square: 0,
    wealthy: 1,
    docks: 2,
    old: 3,
    park: 1,
    pond: 1,
    shanty: 5
  };
  for (const [k, v] of Object.entries(ed.cells ?? {})) {
    const i = +k;
    if (i < 0 || i >= n) continue;
    if ((TOWN_KINDS as string[]).includes(v)) {
      use[i] = v === "shanty" ? "shanty" : "town";
      kind[i] = v as Kind;
      if (district[i] < 0) {
        const nb = cells.c[i].find(j => district[j] >= 0);
        district[i] = nb !== undefined ? district[nb] : (DEF[v] ?? 3);
      }
    } else {
      use[i] = v as Use;
      kind[i] = null;
      district[i] = -1;
    }
    isWater[i] = v === "water" ? 1 : 0;
    h[i] = isWater[i] ? 10 : 30;
    f[i] = isWater[i] ? 2 : 1;
  }
  for (const [k, v] of Object.entries(ed.districts ?? {}))
    if (district[+k] >= 0 || use[+k] === "town") district[+k] = v;
  town = [...Array(n).keys()].filter(i => use[i] === "town");
  for (let i = 0; i < n; i++)
    if (district[i] >= 0 && DIST.find(d => d.id === district[i])) DIST.find(d => d.id === district[i])?.cells.push(i);

  // landmarks: a set of cells standing as one building; the Aurum is one grid cell on the square, nearest the water
  let landmarks: Landmark[] = ed.landmarks ?? [];
  if (!ed.landmarks) {
    const c = cells.c[squareCell]
      .filter(j => kind[j] === "centre")
      .sort(
        (a, b) => (cells.v[a].length === 4 ? 0 : 9) + coastDist(a) - (cells.v[b].length === 4 ? 0 : 9) - coastDist(b)
      )[0];
    if (c !== undefined)
      landmarks = [
        {
          id: 1,
          cells: [c],
          name: "The Aurum",
          type: "Bank",
          roof: "gold",
          enter: "Aurum halls · counting house · vault"
        }
      ];
  }
  landmarks = landmarks
    .map(l => ({ ...l, cells: l.cells.filter(i => i >= 0 && i < n && use[i] === "town") }))
    .filter(l => l.cells.length);
  const isLandmark = new Uint8Array(n);
  for (const l of landmarks) for (const i of l.cells) isLandmark[i] = 1;

  // a run of the same crop is one field: it shares its furrows
  const done = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (done[i] || !(use[i] === "wheat" || use[i] === "tilled" || use[i] === "pasture")) continue;
    const q = [i];
    done[i] = 1;
    for (let k = 0; k < q.length; k++)
      for (const j of cells.c[q[k]])
        if (j < n && !done[j] && use[j] === use[i] && Math.abs(Math.cos(ang[j] - ang[i])) > 0.7) {
          done[j] = 1;
          ang[j] = ang[i];
          q.push(j);
        }
  }

  // ---- roads
  const roads: Road[] = [];
  const onMain = new Uint8Array(n);
  const blocked = (i: number) => kind[i] === "pond" || kind[i] === "park" || isLandmark[i] === 1 || i === undefined;
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
  // a main road's cells give its corridor; the road itself runs along their edges, corner to corner,
  // paying for every turn so it keeps its line
  // the walled town: the shanty grows outside it
  const townish0 = (c: number) => use[c] === "town";
  const mainEdges = new Set<string>();
  const edgePath = (route: number[], maxTurn = 80, wide = false, global = false): number[] | null => {
    const corridor = new Set<number>();
    for (const c of route) {
      for (const v of cells.v[c]) corridor.add(v);
      if (wide) for (const j of cells.c[c]) if (j < n) for (const v of cells.v[j]) corridor.add(v);
    }
    const goal = new Set<number>(cells.v[route[route.length - 1]]);
    const ang = (a: number, b: number) =>
      Math.atan2(vertices.p[b][1] - vertices.p[a][1], vertices.p[b][0] - vertices.p[a][0]);
    // states are (vertex, the vertex before it)
    const best = new Map<string, number>();
    const back = new Map<string, string | null>();
    const open: { k: string; v: number; pv: number; c: number }[] = [];
    for (const v of cells.v[route[0]]) {
      const k = `${v}|-1`;
      best.set(k, 0);
      back.set(k, null);
      open.push({ k, v, pv: -1, c: 0 });
    }
    let end: string | null = null;
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].c < open[bi].c) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur.c > (best.get(cur.k) ?? Infinity)) continue;
      if (goal.has(cur.v) && cur.pv >= 0) {
        end = cur.k;
        break;
      }
      for (const nv of vertices.v[cur.v] ?? []) {
        if ((!global && !corridor.has(nv)) || nv === cur.pv) continue;
        if (!vertices.c[nv] || vertices.c[nv].every((c: number) => c >= n || isWater[c])) continue;
        // a rim edge is the wall: a road may take one, and that edge becomes its gate; it costs, so roads take few
        const cs = vertices.c[cur.v].filter((c: number) => vertices.c[nv].includes(c));
        if (cs.some((c: number) => c < n && isWater[c])) continue;
        const rim =
          cs.some((c: number) => c < n && townish0(c)) &&
          cs.some((c: number) => c >= n || (!townish0(c) && !isWater[c]));
        // a road only takes a wall edge on its way out from inside, never to skirt the town
        if (rim && cur.pv >= 0) {
          const ps = vertices.c[cur.pv].filter((c: number) => vertices.c[cur.v].includes(c));
          if (!ps.every((c: number) => c < n && townish0(c))) continue;
        }
        let turn = 0;
        if (cur.pv >= 0) {
          const d = ang(cur.v, nv) - ang(cur.pv, cur.v);
          turn = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * (180 / Math.PI);
          if (turn > maxTurn) continue;
        }
        // a road already laid is cheap to share, so main roads merge rather than run side by side
        const shared = mainEdges.has(cur.v < nv ? `${cur.v}|${nv}` : `${nv}|${cur.v}`) ? 0.65 : 1;
        const c = cur.c + dist(vertices.p[cur.v], vertices.p[nv]) * (1 + 3 * (turn / 90) ** 2) * shared * (rim ? 6 : 1);
        const k = `${nv}|${cur.v}`;
        if (c < (best.get(k) ?? Infinity)) {
          best.set(k, c);
          back.set(k, cur.k);
          open.push({ k, v: nv, pv: cur.v, c });
        }
      }
    }
    if (!end) return null;
    const out: number[] = [];
    for (let k: string | null = end; k; k = back.get(k) ?? null) out.unshift(+k.split("|")[0]);
    return out.length > 1 ? out : null;
  };
  const onEdges = (type: Road["type"], key: string, name: string | undefined, route: number[]): Road => {
    // never through a cell's middle: widen the corridor and allow sharper turns before giving up
    const vs = edgePath(route) ?? edgePath(route, 80, false, true) ?? edgePath(route, 125, false, true);
    const ek = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    if (!vs) return { type, key, name, cells: route, pts: lineOf(route) };
    const edges = vs.slice(1).map((v, i) => [vs[i], v] as [number, number]);
    for (const [a, b] of edges) mainEdges.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    return {
      type,
      key,
      name,
      cells: route,
      edges,
      ekeys: edges.map(([a, b]) => ek(a, b)),
      pts: vs.map(v => vertices.p[v] as P2)
    };
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
    if (e.cell < 0 || erased.has(`m:${e.name}`)) continue;
    const route = mainRoute(squareCell, e.cell);
    if (!route) continue;
    for (const c of route) onMain[c] = 1;
    roads.push(onEdges("main", `m:${e.name}`, named(`m:${e.name}`, e.name), route));
  }
  // the dock road: from the square to the waterfront
  {
    const docks = town.filter(i => kind[i] === "docks");
    const far = docks.sort((a, b) => dT(b) - dT(a))[0];
    if (far !== undefined) {
      const route = erased.has("m:Bankside") ? null : mainRoute(squareCell, far);
      if (route) {
        for (const c of route) onMain[c] = 1;
        roads.push(onEdges("main", "m:Bankside", named("m:Bankside", "Bankside"), route));
      }
    }
  }
  // roads the DM drew, cell to cell
  for (const [k, r] of (ed.roads ?? []).entries()) {
    const route = r.cells.filter(i => i >= 0 && i < n);
    if (route.length < 2) continue;
    if (r.type === "main") for (const c of route) onMain[c] = 1;
    roads.push(onEdges(r.type, `u:${k}`, named(`u:${k}`, r.name), route));
  }
  // farms and hamlets: a few field cells off the main roads, each reached by a track branching off the nearest road
  const farms: Farm[] = [];
  {
    const onTrack = new Uint8Array(n);
    const fieldy = (i: number) => use[i] === "wheat" || use[i] === "tilled" || use[i] === "pasture";
    const cand = [...Array(n).keys()].filter(
      i => fieldy(i) && homeMask[i] && !onMain[i] && !cells.c[i].some(j => use[j] === "town" || onMain[j]) && R() < 0.14
    );
    for (const i of cand) {
      if (farms.some(f => dist(pts[f.cell], pts[i]) < 60) || erased.has(`f:${i}`)) continue;
      const path = findPath(
        i,
        id => onMain[id] === 1 || onTrack[id] === 1,
        (_cur, next) =>
          isWater[next] || !homeMask[next] || use[next] === "town" || use[next] === "shanty"
            ? Infinity
            : use[next] === "woods"
              ? 3
              : 1,
        pack
      );
      if (!path || path.length > 9) continue;
      const route = [i, ...path];
      farms.push({ cell: i, houses: R() < 0.25 ? 3 + Math.floor(R() * 3) : 1 });
      for (const c of route) onTrack[c] = 1;
      onTrack[route[route.length - 1]] = 0;
      if (!erased.has(`t:${i}`)) roads.push(onEdges("track", `t:${i}`, undefined, route.reverse()));
    }
  }

  // blocks: neighbouring cells of one district join into a larger block that only roads round its outside
  const block = new Int32Array(n).fill(-1);
  {
    const SIZE: Record<string, [number, number]> = {
      centre: [1, 2],
      wealthy: [1, 2],
      docks: [1, 2],
      old: [1, 3],
      shanty: [2, 4]
    };
    const joinable = (i: number) => {
      const k = kind[i];
      return (use[i] === "town" || use[i] === "shanty") && !!k && k in SIZE && !isLandmark[i];
    };
    let id = 0;
    for (const i of [...Array(n).keys()].sort((a, b) => dT(a) - dT(b))) {
      if (!joinable(i) || block[i] >= 0) continue;
      const [lo, hi] = SIZE[kind[i] as string];
      const want = lo + Math.floor(R() * (hi - lo + 1));
      const members = [i];
      block[i] = id;
      while (members.length < want) {
        const cand = members
          .flatMap(m => cells.c[m])
          .filter(j => j < n && block[j] < 0 && joinable(j) && kind[j] === kind[i] && district[j] === district[i]);
        if (!cand.length) break;
        const j = cand[Math.floor(R() * cand.length)];
        block[j] = id;
        members.push(j);
      }
      id++;
    }
    for (let i = 0; i < n; i++) if (block[i] < 0 && (use[i] === "town" || use[i] === "shanty")) block[i] = id++;
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
      // no street along the wall: the town and the shanty meet only at the gates
      if (j >= n || !isTownish(j) || use[i] !== use[j]) continue;
      const sh = cells.v[i].filter(v => cells.v[j].includes(v));
      if (sh.length < 2) continue;
      const k = edgeKey(sh[0], sh[1]);
      if (edgeSeen.has(k)) continue;
      edgeSeen.add(k);
      if ((blocked(i) && blocked(j)) || erased.has(`e:${k}`)) continue;
      const ki = kind[i];
      const kj = kind[j];
      const ks = [ki, kj];
      const shanty = ks.includes("shanty");
      const plannedE = ks.every(x => x === "centre" || x === "docks" || x === "square" || x === "wealthy");
      // a road between every two blocks; none inside a block, whose cells build as one
      const same = district[i] === district[j] && !plannedE;
      if (block[i] >= 0 && block[i] === block[j]) continue;
      const sq = ks.includes("square");
      const open = (x: Kind | null) => x === "pond" || x === "park";
      if (dist(vertices.p[sh[0]], vertices.p[sh[1]]) >= 3.5 && !open(ki) && !open(kj)) {
        streetEdges.push({
          a: sh[0],
          b: sh[1],
          c1: i,
          c2: j,
          type: shanty ? "lane" : same ? "lane" : plannedE || sq ? "street" : "lane"
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
  // no stubs: a street that ends nowhere runs on along the straightest cell edge until it meets another road,
  // the wall or the water
  {
    const deg = new Map<number, number>();
    const bump = (v: number, d: number) => deg.set(v, (deg.get(v) ?? 0) + d);
    for (const r of roads) if (r.type === "main" && r.edges) for (const [a, b] of r.edges) bump(a, 2), bump(b, 2);
    for (const e of streetEdges) {
      bump(e.a, 1);
      bump(e.b, 1);
    }
    const anchored = (v: number) =>
      vertices.c[v].some(
        (c: number) =>
          c >= n || isWater[c] || !isTownish(c) || kind[c] === "square" || kind[c] === "park" || kind[c] === "pond"
      );
    const has = new Set(streetEdges.map(e => edgeKey(e.a, e.b)));
    for (const r of roads) if (r.type === "main" && r.edges) for (const [a, b] of r.edges) has.add(edgeKey(a, b));
    const loose0 = (v: number) => deg.get(v) === 1 && !anchored(v);
    for (const e0 of streetEdges.slice()) {
      for (const [from, start] of [
        [e0.a, e0.b],
        [e0.b, e0.a]
      ]) {
        let prev = from;
        let v = start;
        const added: typeof streetEdges = [];
        for (let step = 0; step < 4 && loose0(v); step++) {
          const dIn = Math.atan2(vertices.p[v][1] - vertices.p[prev][1], vertices.p[v][0] - vertices.p[prev][0]);
          let best = -1;
          let bt = 1.3;
          for (const nv of vertices.v[v] ?? []) {
            if (nv === prev || has.has(edgeKey(v, nv))) continue;
            const cs = vertices.c[v].filter((c: number) => vertices.c[nv].includes(c));
            if (cs.length < 2 || !cs.every((c: number) => c < n && isTownish(c) && !blocked(c))) continue;
            const dOut = Math.atan2(vertices.p[nv][1] - vertices.p[v][1], vertices.p[nv][0] - vertices.p[v][0]);
            const t = Math.abs(Math.atan2(Math.sin(dOut - dIn), Math.cos(dOut - dIn)));
            if (t < bt) {
              bt = t;
              best = nv;
            }
          }
          if (best < 0) break;
          const cs = vertices.c[v].filter((c: number) => vertices.c[best].includes(c));
          const e = { a: v, b: best, c1: cs[0], c2: cs[1], type: "lane" as Road["type"] };
          added.push(e);
          has.add(edgeKey(v, best));
          bump(v, 1);
          bump(best, 1);
          prev = v;
          v = best;
        }
        streetEdges.push(...added);
      }
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
      // the chain as one line, end to end
      const order: number[] = [];
      if (edges.length === 1) order.push(edges[0][0], edges[0][1]);
      else {
        const [a0, b0] = edges[0];
        const first = edges[1].includes(b0) ? a0 : b0;
        order.push(first);
        let cur = first;
        for (const [a, b] of edges) {
          cur = a === cur ? b : a;
          order.push(cur);
        }
      }
      const linePts: P2[] = order.map(v => vertices.p[v] as P2);
      const ekeys = edges.map(([a, b]) => edgeKey(a, b));
      const skey = `s:${ekeys.slice().sort()[0]}`;
      let len = 0;
      for (const [a, b] of edges) len += dist(vertices.p[a] as P2, vertices.p[b] as P2);
      const type = streetEdges[k].type;
      roads.push({
        type,
        key: skey,
        edges,
        ekeys,
        pts: linePts,
        name: named(skey, type === "street" && len > 45 ? STREETS[sn++ % STREETS.length] : undefined)
      });
    }
  }
  // streets bend gently: each corner along a street eases toward its neighbours, carrying the cells with it.
  // Junctions, the shore and the town's edge stay put
  {
    const nb = new Map<number, Set<number>>();
    for (const r of roads)
      if (r.edges)
        for (const [a, b] of r.edges) {
          if (!nb.has(a)) nb.set(a, new Set());
          if (!nb.has(b)) nb.set(b, new Set());
          nb.get(a)?.add(b);
          nb.get(b)?.add(a);
        }
    const free = [...nb.keys()].filter(
      v =>
        nb.get(v)?.size === 2 &&
        vertices.c[v].every((c: number) => c < n && !isWater[c] && !isLandmark[c] && kind[c] !== "square") &&
        (vertices.c[v].every((c: number) => isTownish(c)) || vertices.c[v].every((c: number) => !isTownish(c)))
    );
    for (let it = 0; it < 8; it++)
      for (const v of free) {
        const [a, b] = [...(nb.get(v) as Set<number>)];
        const p = vertices.p[v];
        const q = [(vertices.p[a][0] + vertices.p[b][0]) / 2, (vertices.p[a][1] + vertices.p[b][1]) / 2];
        p[0] += (q[0] - p[0]) * 0.5;
        p[1] += (q[1] - p[1]) * 0.5;
      }
  }
  // piers: a boardwalk along every dock edge that meets the water, spurs out from it
  const pierSegs: [P2, P2][] = [];
  for (const i of town) {
    if (kind[i] !== "docks") continue;
    for (const j of cells.c[i]) {
      if (!isWater[j]) continue;
      const sh = cells.v[i].filter(v => cells.v[j].includes(v));
      if (sh.length < 2) continue;
      const a = vertices.p[sh[0]] as P2;
      const b = vertices.p[sh[1]] as P2;
      const pk = `p:${edgeKey(sh[0], sh[1])}`;
      if (erased.has(pk)) continue;
      roads.push({ type: "pier", key: pk, edges: [[sh[0], sh[1]]], pts: [a, b] });
      const L = dist(a, b);
      const tx = (b[0] - a[0]) / L;
      const ty = (b[1] - a[1]) / L;
      let nx = -ty;
      let ny = tx;
      if (!isWater[nearestCell([(a[0] + b[0]) / 2 + nx * 6, (a[1] + b[1]) / 2 + ny * 6], () => true)]) {
        nx = -nx;
        ny = -ny;
      }
      // short piers, spaced, each only where its whole length is open water clear of the others
      for (let t = 5 + R() * 3; t < L - 4; t += 10 + R() * 6) {
        const st: P2 = [a[0] + tx * t, a[1] + ty * t];
        const len = 6 + R() * 6;
        const en: P2 = [st[0] + nx * len, st[1] + ny * len];
        let clear = true;
        for (let q = 2; q <= len + 3 && clear; q += 1.5) {
          const pt: P2 = [st[0] + nx * q, st[1] + ny * q];
          if (!isWater[nearestCell(pt, () => true)]) clear = false;
          for (const sg of pierSegs) if (segDist(pt, sg[0], sg[1]) < 5) clear = false;
        }
        if (!clear) continue;
        pierSegs.push([st, en]);
        roads.push({ type: "pier", key: pk, pts: [st, en] });
        if (R() < 0.3) {
          const w = 3 + R() * 2;
          const head: [P2, P2] = [
            [en[0] - tx * w, en[1] - ty * w],
            [en[0] + tx * w, en[1] + ty * w]
          ];
          if (
            !pierSegs.some(sg => segDist(head[0], sg[0], sg[1]) < 4 && sg[1] !== en) &&
            !pierSegs.some(sg => segDist(head[1], sg[0], sg[1]) < 4 && sg[1] !== en)
          ) {
            pierSegs.push(head);
            roads.push({ type: "pier", key: pk, pts: head });
          }
        }
      }
    }
  }

  // walls: the town's outline from the map's own vertex walk; gates where main roads cross it
  // the wall rings the town cells along their outer edges; the shanty lies outside it
  const townSet = new Set(town);
  const walls: P2[][] = [];
  const checked = new Uint8Array(n);
  for (const i of townSet) {
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
    // and wherever a main road passes along it: that edge is the gate
    let run: P2[] = [];
    for (const [k, v] of chain.entries()) {
      const pv = chain[k - 1];
      if (pv !== undefined && mainEdges.has(pv < v ? `${pv}|${v}` : `${v}|${pv}`)) {
        if (run.length > 1) walls.push(run);
        run = [];
      }
      if (vertices.c[v].some(c => isWater[c])) {
        if (run.length > 1) walls.push(run);
        run = [];
      } else run.push(vertices.p[v] as P2);
    }
    if (run.length > 1) walls.push(run);
  }
  // gates: where a main road crosses the wall; the crossed edge's two ends carry its towers
  const gates: Gate[] = [];
  const onWall = (v: number) =>
    vertices.c[v].some((c: number) => townSet.has(c)) &&
    vertices.c[v].some((c: number) => c < n && !townSet.has(c) && !isWater[c]);
  const wallEdge = (a: number, b: number) => {
    const cs = vertices.c[a].filter((c: number) => vertices.c[b].includes(c));
    return cs.some((c: number) => townSet.has(c)) && cs.some((c: number) => c >= n || (!townSet.has(c) && !isWater[c]));
  };
  for (const r of roads) {
    if (r.type !== "main") continue;
    const base = (r.name ?? "Town").replace(/ (Road|Street|Lane|Way)$/, "");
    const gk = `g:${r.key}`;
    // every wall edge a main road takes is a gate
    const rims = (r.edges ?? []).filter(([a, b]) => onWall(a) && onWall(b) && wallEdge(a, b));
    for (const [k, e] of rims.entries()) {
      const [a, b] = e.map(v => vertices.p[v] as P2);
      const p: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (gates.some(g => dist(g.p, p) < 1)) continue;
      gates.push({ p, a, b, road: r.key, name: named(`${gk}${k ? `:${k}` : ""}`, `${base} Gate`) as string });
    }
    if (rims.length) continue;
    if (!r.cells) continue;
    for (let k = 1; k < r.cells.length; k++) {
      const [p, q] = [r.cells[k - 1], r.cells[k]];
      if (townSet.has(p) === townSet.has(q) || isWater[p] || isWater[q]) continue;
      const shv = cells.v[p].filter(v => cells.v[q].includes(v));
      if (shv.length < 2) continue;
      gates.push({
        p: mid(p, q),
        a: vertices.p[shv[0]],
        b: vertices.p[shv[1]],
        road: r.key,
        name: named(gk, `${base} Gate`) as string
      });
    }
  }
  // towers at the gates and at the wall's turns, kept apart
  // turrets where the wall turns by more than 20 degrees, clear of the gates
  const towers: P2[] = [];
  for (const w of walls)
    for (let k = 1; k < w.length - 1; k++) {
      const [a, p, b] = [w[k - 1], w[k], w[k + 1]];
      const d = Math.atan2(b[1] - p[1], b[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0]);
      if (Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.6) continue;
      if (gates.some(g => dist(g.p, p) < 8) || towers.some(t => dist(t, p) < 12)) continue;
      towers.push(p);
    }

  // who holds each cell: the Aurum the centre and the hill, guilds their quarters, the crew the Rookery, the Watch the gates
  const faction = new Int16Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const kd = kind[i];
    if (!kd) continue;
    faction[i] =
      kd === "centre" || kd === "square" || kd === "wealthy" || kd === "park" || kd === "pond"
        ? 0
        : kd === "docks"
          ? 3
          : kd === "shanty"
            ? 5
            : district[i] === 4
              ? 2
              : 4;
  }
  for (const g of gates)
    for (let i = 0; i < n; i++)
      if (use[i] === "town" && cells.v[i].some(v => dist(vertices.p[v], g.p) < 14) && kind[i] !== "square")
        faction[i] = 1;
  for (const [k, v] of Object.entries(ed.factionCells ?? {})) if (+k >= 0 && +k < n) faction[+k] = v;

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
    landmarks,
    farms,
    block,
    factions: FACTIONS,
    faction,
    edits: ed,
    buildings: [],
    trees: [],
    squareCell,
    ang
  };
}
