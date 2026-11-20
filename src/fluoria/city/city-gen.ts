// A settlement's city map, built as its own small Azgaar-format graph (cells, vertices, features) so the map's own
// path, outline and label code runs on it. Cells are seeded on a loose grid in planned districts and at random elsewhere;
// main roads run cell to cell through the centres, streets and lanes along cell edges
import { calculateVoronoi } from "@/generators/voronoi";
import { findPath } from "@/utils/pathUtils";
import { type Lore, namer } from "./city-names";

export type P2 = [number, number];
export type Kind = "centre" | "wealthy" | "old" | "docks" | "shanty" | "square" | "park" | "pond";
export type Use = "town" | "water" | "wheat" | "tilled" | "pasture" | "grass" | "woods" | "shanty";

export interface RegionCell {
  p: P2[];
  c: P2;
  h: number;
  b?: number;
  s?: number; // the state that holds it
}
export interface Region {
  cells: RegionCell[];
  rivers?: { pts?: P2[]; p?: P2[] }[];
  routes: { g: string; n?: string; pts: P2[] }[];
  burgs: { n: string; x: number; y: number; port?: number; walls?: number; pop?: number }[];
  lore?: Lore;
  states?: { n?: string; c?: string }[];
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
  trade?: boolean; // fronts a main road or square: a shop, inn or workshop
  cells?: number[]; // a landmark's cells: it stands on all of them
  owner?: number;
  cap?: number; // how many live or work here
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
  r: number; // the opening's half-width
  key: string; // its name's key in the edits
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
  keyOrder?: string[]; // the key's order, as the GM dragged it
  colors?: Record<string, string>;
  wealth?: Record<number, number>;
}
/** A generated settlement's shape, for places with no hand-made plan */
export interface Spec {
  size: "hamlet" | "village" | "town" | "city";
  walled: boolean;
  fort: boolean;
  hill: boolean;
  shanty: boolean;
  plaza?: boolean;
  temple?: boolean;
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
  wallEdges: string[];
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
  yards: P2[][]; // closed yards, grassed
  height: Float32Array; // ground height per cell, Azgaar's scale (20 is the shore)
  borders: { a: P2; b: P2; out: P2; state: string; col: string }[]; // where the cell meets another nation
  notables?: Record<string, string>; // names for the town's notable buildings
  population: number; // everyone the region cell holds, town and country; 0 when unknown
  port: boolean; // its stores quarter stands on the quays
  places: Record<number, string>; // names of squares, greens, ponds and open places, by cell
  fields: { kind: string; cells: number[]; name: string; key: string }[]; // the country named: meadows, fields, woods, water
  spare: { yard: string[]; opening: string[]; square: string[] }; // names for places found empty when built
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
  opts: { scale?: number; margin?: number; edits?: Edits; spec?: Spec } = {}
): City {
  const ed: Edits = opts.edits ?? {};
  const S = opts.spec;
  const big = !S || S.size === "town" || S.size === "city";
  const hillOn = !S || S.hill;
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
  // names in the culture's voice wherever the region says who lives here
  const NM = S || region.lore ? namer(region.lore, ed.seed ?? Math.round(B.x * 31 + B.y * 977)) : null;
  const RC = region.cells
    .filter(c => {
      // any cell whose box overlaps the view, however large the cell
      const xs = c.p.map(p => p[0]);
      const ys = c.p.map(p => p[1]);
      return (
        Math.max(...xs) > ox - 4 &&
        Math.min(...xs) < ox + W / U + 4 &&
        Math.max(...ys) > oy - 4 &&
        Math.min(...ys) < oy + H / U + 4
      );
    })
    .map(c => ({ rc: c, poly: c.p.map(toP), water: c.h < 20, home: c === homeR }));
  const regionAt = (x: number, y: number) => RC.find(r => inPoly(r.poly, x, y));
  const homeP = homeR.p.map(toP);
  const rivers = (region.rivers ?? []).map(r => (r.pts ?? r.p ?? []).map(toP)).filter(l => l.length > 1);

  // the town's place: the settlement point pulled toward the shore
  const C = toP([B.x, B.y]);
  const waterAt = (x: number, y: number) => {
    const r = regionAt(x, y);
    return !!r?.water;
  };
  let shore: P2 | null = null;
  // only water near the settlement's own cell pulls the town toward it
  const reach = Math.max(...homeP.map(p => dist(p, C))) * 1.15;
  for (let d = 4; d < reach && !shore; d += 3)
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
  const TR =
    Math.min(hx1 - hx0, hy1 - hy0) * (S ? { hamlet: 0.15, village: 0.23, town: 0.35, city: 0.47 }[S.size] : 0.47);
  // a port's town reaches the water: its middle sits back from the shore by most of its reach
  const T: P2 = (() => {
    if (!shore) return C;
    const L = dist(C, shore) || 1;
    const k = Math.min(1, (TR * 0.72) / L);
    return [shore[0] + (C[0] - shore[0]) * k, shore[1] + (C[1] - shore[1]) * k];
  })();
  const seaDir = shore ? Math.atan2(shore[1] - T[1], shore[0] - T[0]) : 0;
  // the rich side: up the slope where the land rises, else away from the water, to one side
  const hillDir = (() => {
    if (S) {
      const hh = homeR.h;
      let gx = 0;
      let gy = 0;
      for (const r of RC) {
        if (r.water || r.home) continue;
        const [x, y] = toP(r.rc.c);
        const d = Math.hypot(x - C[0], y - C[1]) || 1;
        gx += ((r.rc.h - hh) * (x - C[0])) / d / d;
        gy += ((r.rc.h - hh) * (y - C[1])) / d / d;
      }
      if (Math.hypot(gx, gy) > 0.004) return Math.atan2(gy, gx);
    }
    return seaDir + Math.PI * 0.75;
  })();

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
    if (!big || d > TR * 1.02) return false;
    if (d < TR * 0.36) return true;
    const a = Math.atan2(y - T[1], x - T[0]);
    const off = Math.abs(((a - hillDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (hillOn && off < 0.7) return true;
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
  for (const nb of S ? [] : region.burgs) {
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
  const river = new Uint8Array(n);
  const forest = new Uint8Array(n);
  const meadow = (i: number) => kindOfSeed[i] === 3;
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const r = regionAt(x, y);
    homeMask[i] = r?.home ? 1 : 0;
    forest[i] = r && [5, 6, 7, 8, 9].includes(r.rc.b ?? 0) ? 1 : 0;
    if (!r || r.water) isWater[i] = 1;
    else if (rivers.some(l => polyDist([x, y], l) < 9)) isWater[i] = river[i] = 1;
    ang[i] = seedAng[i] ?? R() * Math.PI;
  }
  // every cell the river's line passes through is water too, so a river never breaks into ponds
  for (const l of rivers)
    for (let k = 1; k < l.length; k++) {
      const L = dist(l[k - 1], l[k]);
      for (let t = 0; t <= L; t += 2) {
        const x = l[k - 1][0] + ((l[k][0] - l[k - 1][0]) * t) / (L || 1);
        const y = l[k - 1][1] + ((l[k][1] - l[k - 1][1]) * t) / (L || 1);
        if (x < 0 || y < 0 || x > W || y > H) continue;
        let bi = -1;
        let bd = Infinity;
        for (let i = 0; i < n; i++) {
          const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2;
          if (d < bd) {
            bd = d;
            bi = i;
          }
        }
        if (bi >= 0 && !isWater[bi]) isWater[bi] = river[bi] = 1;
      }
    }
  const h = Uint8Array.from({ length: n }, (_, i) => (isWater[i] ? 10 : 30));
  const f = Uint16Array.from({ length: n }, (_, i) => (isWater[i] ? 2 : 1));
  const pack: any = {
    cells: { ...cells, p: pts, h, f },
    vertices,
    features: [0, { i: 1, type: "island", land: true }, { i: 2, type: "ocean", land: false }]
  };

  // ground height: the region cells' heights blended across the small cells, nearest counting most
  const height = new Float32Array(n);
  {
    const src = RC.map(r => ({ p: toP(r.rc.c), h: r.rc.h }));
    for (let i = 0; i < n; i++) {
      let sw = 0;
      let sh = 0;
      for (const q of src) {
        const d2 = (q.p[0] - pts[i][0]) ** 2 + (q.p[1] - pts[i][1]) ** 2 + 400;
        const w = 1 / (d2 * d2);
        sw += w;
        sh += w * q.h;
      }
      height[i] = sw ? sh / sw : 30;
    }
  }
  // the home cell's sides that face another nation's land
  const borders: City["borders"] = [];
  {
    const near = (p: P2, q: P2) => Math.abs(p[0] - q[0]) < 0.3 && Math.abs(p[1] - q[1]) < 0.3;
    const L = homeR.p.length;
    for (let k = 0; k < L; k++) {
      const a = homeR.p[k];
      const b = homeR.p[(k + 1) % L];
      const o = RC.find(r => !r.home && r.rc.p.some(p => near(p, a)) && r.rc.p.some(p => near(p, b)));
      const st = o?.rc.s;
      if (!o || o.water || !st || st === homeR.s) continue;
      const A = toP(a);
      const Bp = toP(b);
      const len = dist(A, Bp) || 1;
      let out: P2 = [-(Bp[1] - A[1]) / len, (Bp[0] - A[0]) / len];
      const oc = toP(o.rc.c);
      if ((oc[0] - A[0]) * out[0] + (oc[1] - A[1]) * out[1] < 0) out = [-out[0], -out[1]];
      const S0 = region.states?.[st];
      borders.push({ a: A, b: Bp, out, state: S0?.n ?? "", col: S0?.c ?? "#8a6a5a" });
    }
  }
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
  // the ring of the home cell that meets other land stays open country, so a marker can always land on it;
  // only the shore may be built to its edge
  const rim = (i: number) => !!homeMask[i] && cells.c[i].some(j => j < n && !homeMask[j] && !isWater[j]);
  for (let i = 0; i < n; i++) {
    if (isWater[i]) {
      use[i] = "water";
      continue;
    }
    if (homeMask[i] && dT(i) < TR && !rim(i)) {
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
  // a town squeezed by the shore grows along the dry land of its cell, nearest first, until it is its size
  if (S) {
    const want = { hamlet: 3, village: 12, town: 30, city: 60 }[S.size];
    if (town.length < want) {
      const room = [...Array(n).keys()]
        .filter(i => homeMask[i] && !isWater[i] && use[i] !== "town" && !rim(i))
        .sort((a, b) => dT(a) - dT(b));
      for (const i of room.slice(0, want - town.length)) use[i] = "town";
      town = [...Array(n).keys()].filter(i => use[i] === "town");
    }
  }
  // a cramped site (a spit, an islet) still gets a few houses: the dry cells nearest the town's place
  if (town.length < 3) {
    const dry = [...Array(n).keys()]
      .filter(i => !isWater[i] && use[i] !== "town")
      .sort((a, b) => +rim(a) - +rim(b) || dT(a) - dT(b));
    for (const i of dry.slice(0, 3 - town.length)) use[i] = "town";
    town = [...Array(n).keys()].filter(i => use[i] === "town");
  }

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
    else if (big && d < TR * 0.36) kind[i] = "centre";
    else if (hillOn && big && off < 0.7) kind[i] = "wealthy";
    else kind[i] = "old";
  }
  kind[squareCell] = "square";
  // every town keeps its goods in a stores quarter: on the quays in a port, else on the town's edge by the main road
  const port = town.some(i => kind[i] === "docks");
  if (!port) {
    const want = S ? { hamlet: 0, village: 1, town: 2, city: 3 }[S.size] : 2;
    const edge = town
      .filter(i => kind[i] === "old" && cells.c[i].some(j => j < n && use[j] !== "town"))
      .sort((a, b) => {
        const off = (i: number) =>
          Math.abs(
            ((Math.atan2(pts[i][1] - T[1], pts[i][0] - T[0]) - hillDir + Math.PI * 4) % (Math.PI * 2)) - Math.PI
          );
        return off(b) - off(a);
      });
    for (const i of edge.slice(0, want)) kind[i] = "docks";
  }
  const DIST: District[] = [
    { id: 0, name: NM ? NM.district("centre") : "The Exchange", kind: "centre", cells: [], wealth: 4 },
    { id: 1, name: NM ? NM.district("wealthy") : "Gilt Hill", kind: "wealthy", cells: [], wealth: 5 },
    {
      id: 2,
      name: NM ? NM.district(port ? "docks" : "stores") : port ? "Bankside" : "The Stores",
      kind: "docks",
      cells: [],
      wealth: 3
    },
    {
      id: 3,
      name: S && !big ? burgName : NM ? NM.district("old", 0) : "Old Town",
      kind: "old",
      cells: [],
      wealth: S && !big ? 5 : 2
    },
    { id: 4, name: NM ? NM.district("old", 1) : "Saltgate", kind: "old", cells: [], wealth: 2 },
    { id: 5, name: NM ? NM.district("shanty") : "The Rookery", kind: "shanty", cells: [], wealth: 1 }
  ];
  for (const i of town) {
    const k = kind[i];
    district[i] = k === "centre" || k === "square" ? (big ? 0 : 3) : k === "wealthy" ? 1 : k === "docks" ? 2 : 0;
    if (k === "old") {
      const s =
        (pts[i][0] - T[0]) * Math.cos(hillDir + Math.PI / 2) + (pts[i][1] - T[1]) * Math.sin(hillDir + Math.PI / 2);
      district[i] = s > 0 || (S && S.size !== "city") ? 3 : 4;
    }
  }
  void sideOfAxis;
  // a park and a pond in the hill, a market square in the old town
  {
    const hill = town.filter(
      i => kind[i] === "wealthy" && cells.c[i].every(j => use[j] === "town" && kind[j] !== "docks")
    );
    hill.sort((a, b) => dT(b) - dT(a));
    if (hill.length > 4 && big) {
      kind[hill[1]] = "park";
      const pond = hill.find(i => i !== hill[1] && !cells.c[i].includes(hill[1]));
      if (pond !== undefined) kind[pond] = "pond";
    }
    const old = town.filter(i => kind[i] === "old" && cells.c[i].every(j => use[j] === "town"));
    if (old.length && (!S || (S.plaza && big))) kind[old[Math.floor(old.length / 2)]] = "square";
  }
  // the shanty: farmland just outside the town, on the side away from the hill
  {
    const away: P2 = [T[0] - Math.cos(hillDir) * TR, T[1] - Math.sin(hillDir) * TR];
    const out = [...Array(n).keys()]
      .filter(
        i =>
          homeMask[i] && !rim(i) && use[i] !== "town" && use[i] !== "water" && cells.c[i].some(j => use[j] === "town")
      )
      .sort((a, b) => dist(pts[a], away) - dist(pts[b], away));
    for (const i of out.slice(0, S ? (S.shanty ? (S.size === "city" ? 4 : 2) : 0) : 4)) {
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
      if (rim(i)) continue;
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

  // how long a side two cells share: zero where they only meet at a corner
  const sideLen = (i: number, j: number) => {
    const sh = (cells.v[i] as number[]).filter(v => (cells.v[j] as number[]).includes(v));
    return sh.length >= 2 ? dist(vertices.p[sh[0]] as P2, vertices.p[sh[1]] as P2) : 0;
  };
  // landmarks: a set of cells standing as one building; the Aurum is one grid cell on the square, nearest the water
  let landmarks: Landmark[] = ed.landmarks ?? [];
  if (!ed.landmarks) {
    const c = cells.c[squareCell]
      .filter(j => kind[j] === "centre")
      .sort(
        (a, b) => (cells.v[a].length === 4 ? 0 : 9) + coastDist(a) - (cells.v[b].length === 4 ? 0 : 9) - coastDist(b)
      )[0];
    if (S) {
      if (c !== undefined && big)
        landmarks.push({
          id: 1,
          cells: [c],
          name: NM?.hall(burgName, S.size) ?? `${burgName} Hall`,
          type: "Hall",
          roof: "slate"
        });
      const ch = cells.c[squareCell].find(j => use[j] === "town" && kind[j] !== "square" && j !== c);
      if (!big && ch !== undefined)
        landmarks.push({ id: 2, cells: [ch], name: NM?.chapel() ?? "The Chapel", type: "Chapel", roof: "slate" });
      // a temple on the square's far side, or in the old town
      if (S.temple && big) {
        const taken = new Set(landmarks.flatMap(l => l.cells));
        const tc =
          cells.c[squareCell].find(j => use[j] === "town" && kind[j] !== "square" && !taken.has(j)) ??
          town.find(j => kind[j] === "old" && !taken.has(j));
        if (tc !== undefined)
          landmarks.push({ id: 4, cells: [tc], name: NM?.temple() ?? "The Temple", type: "Temple", roof: "slate" });
      }
      if (S.fort) {
        // a citadel most often stands well inside the walls, toward the high ground; now and then it holds the edge
        const along = (i: number) => (pts[i][0] - T[0]) * Math.cos(hillDir) + (pts[i][1] - T[1]) * Math.sin(hillDir);
        const taken = new Set(landmarks.flatMap(l => l.cells));
        const ok = (i: number) =>
          use[i] === "town" && kind[i] !== "square" && kind[i] !== "park" && kind[i] !== "pond" && !taken.has(i);
        const inner = (i: number) => cells.c[i].every(j => j < n && (use[j] === "town" || use[j] === "shanty"));
        const cand = town.filter(ok);
        const far = Math.max(1, ...cand.map(i => dist(pts[i], T)));
        const reach = Math.max(1, ...cand.map(i => Math.abs(along(i))));
        const score = new Map(
          cand.map(i => [i, 1 - dist(pts[i], T) / far + 0.5 * (along(i) / reach) + (inner(i) ? 0.4 : 0) + R() * 0.9])
        );
        const sc = (i: number) => score.get(i) ?? -9;
        const first = cand.sort((a, b) => sc(b) - sc(a))[0];
        const edgeFort = first !== undefined && !inner(first);
        if (first !== undefined) {
          const fc = [first];
          const more = S.size === "city" ? 2 : S.size === "town" ? 1 : 0;
          for (let k = 0; k < more; k++) {
            // a fort's cells join side to side, never at a corner
            const nx = fc
              .flatMap(i => cells.c[i].filter(j => sideLen(i, j) >= 8))
              .filter(j => ok(j) && !fc.includes(j) && (edgeFort || inner(j)))
              .sort((a, b) => sc(b) - sc(a))[0];
            if (nx !== undefined) fc.push(nx);
          }
          landmarks.push({
            id: 3,
            cells: fc,
            name: NM?.keep(fc.length) ?? "The Keep",
            type: "Fort",
            roof: "slate"
          });
        }
      }
    } else if (c !== undefined)
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
  // a landmark is one joined building: its cells are kept to the largest joined group on town ground
  const joined = (cs: number[]) => {
    const set = new Set(cs);
    let best: number[] = [];
    const seen = new Set<number>();
    for (const c of cs) {
      if (seen.has(c)) continue;
      const g = [c];
      seen.add(c);
      for (let k = 0; k < g.length; k++)
        for (const j of cells.c[g[k]])
          if (set.has(j) && !seen.has(j) && sideLen(g[k], j) >= 8) {
            seen.add(j);
            g.push(j);
          }
      if (g.length > best.length) best = g;
    }
    return best;
  };
  landmarks = landmarks
    .map(l => ({
      ...l,
      cells: joined(l.cells.filter(i => i >= 0 && i < n && use[i] === "town" && kind[i] !== "square"))
    }))
    .filter(l => l.cells.length);
  const isLandmark = new Uint8Array(n);
  for (const l of landmarks) for (const i of l.cells) isLandmark[i] = 1;
  const lmOf = (i: number) => landmarks.findIndex(l => l.cells.includes(i));

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

  // the turn rule: from the cell we came from, a main road may go on or bend a step, never double back
  const prevOf = new Int32Array(n).fill(-1);
  const mainRoute = (from: number, to: number, strict = true) => {
    const goal = pts[to];
    prevOf.fill(-1);
    const path = findPath(
      from,
      id => id === to,
      (cur, next) => {
        if (blocked(next) || (isWater[next] && !river[next])) return Infinity;
        const step = dist(pts[cur], pts[next]);
        const d0 = Math.atan2(pts[next][1] - pts[cur][1], pts[next][0] - pts[cur][0]);
        const g = Math.atan2(goal[1] - pts[cur][1], goal[0] - pts[cur][0]);
        const off = 1 - Math.cos(d0 - g);
        let turn = 0;
        const p = prevOf[cur];
        if (p >= 0) {
          const d1 = Math.atan2(pts[cur][1] - pts[p][1], pts[cur][0] - pts[p][0]);
          const tr = 1 - Math.cos(d0 - d1);
          turn = tr > 1.1 && strict ? Infinity : tr * 2.5;
        }
        if (prevOf[next] < 0) prevOf[next] = cur;
        const base = river[next]
          ? 3
          : onMain[next]
            ? 0.45
            : use[next] === "town"
              ? 1
              : use[next] === "woods"
                ? 2.2
                : 1.3;
        return step * (base + off * 1.4 + turn);
      },
      pack
    );
    return path ? (path[0] === from ? path : [from, ...path]) : null;
  };
  // ---- roads. One graph for the whole map: every cell edge with land on both sides. Every road is a run of
  // those edges, so no road ever crosses a cell. Main roads pay for each turn, so they keep a line
  const edgeKey = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const urban = (c: number) => c < n && (use[c] === "town" || use[c] === "shanty");
  const sharedCells = (a: number, b: number): number[] =>
    (vertices.c[a] ?? []).filter((c: number) => (vertices.c[b] ?? []).includes(c));
  const landEdge = (a: number, b: number, bridge = false) => {
    const cs = sharedCells(a, b);
    if (cs.length < 2) return false;
    if (cs.every((c: number) => c < n && (!isWater[c] || (bridge && river[c])))) return true;
    // a main road may run along the shore where the land is one cell wide
    return bridge && cs.some((c: number) => c < n && !isWater[c]);
  };
  const mainEdges = new Set<string>();
  const edgePath = (starts: number[], goal: Set<number>, maxTurn: number, bridge = false): number[] | null => {
    const ang = (a: number, b: number) =>
      Math.atan2(vertices.p[b][1] - vertices.p[a][1], vertices.p[b][0] - vertices.p[a][0]);
    const best = new Map<string, number>();
    const back = new Map<string, string | null>();
    const open: { k: string; v: number; pv: number; c: number }[] = [];
    for (const v of starts) {
      const k = `${v}|-1`;
      best.set(k, 0);
      back.set(k, null);
      open.push({ k, v, pv: -1, c: 0 });
    }
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].c < open[bi].c) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur.c > (best.get(cur.k) ?? Infinity)) continue;
      if (goal.has(cur.v) && cur.pv >= 0) {
        const out: number[] = [];
        for (let k: string | null = cur.k; k; k = back.get(k) ?? null) out.unshift(+k.split("|")[0]);
        return out;
      }
      for (const nv of vertices.v[cur.v] ?? []) {
        if (nv === cur.pv || !vertices.c[nv] || !landEdge(cur.v, nv, bridge)) continue;
        // never through a landmark: an edge with the same landmark on both sides is closed
        const sides = vertices.c[cur.v].filter((c: number) => vertices.c[nv].includes(c));
        if (
          sides.length === 2 &&
          sides.every((c: number) => c < n && isLandmark[c]) &&
          lmOf(sides[0]) === lmOf(sides[1])
        )
          continue;
        let turn = 0;
        if (cur.pv >= 0) {
          const d = ang(cur.v, nv) - ang(cur.pv, cur.v);
          turn = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * (180 / Math.PI);
          if (turn > maxTurn) continue;
        }
        // roads already laid are cheaper to share, so roads join rather than run side by side
        const wet = bridge && !landEdge(cur.v, nv) ? 4 : 1;
        const share = (mainEdges.has(edgeKey(cur.v, nv)) ? 0.6 : 1) * wet;
        const c = cur.c + dist(vertices.p[cur.v], vertices.p[nv]) * (1 + 3 * (turn / 90) ** 2) * share;
        const k = `${nv}|${cur.v}`;
        if (c < (best.get(k) ?? Infinity)) {
          best.set(k, c);
          back.set(k, cur.k);
          open.push({ k, v: nv, pv: cur.v, c });
        }
      }
    }
    return null;
  };
  // a road from one cell to another, along edges; none at all if the map has no such way
  const onEdges = (type: Road["type"], key: string, name: string | undefined, route: number[]): Road | null => {
    const from = cells.v[route[0]] as number[];
    const goal = new Set<number>(cells.v[route[route.length - 1]] as number[]);
    const br = type === "main";
    const vs = edgePath(from, goal, 80, br) ?? edgePath(from, goal, 150, br);
    if (!vs || vs.length < 2) return null;
    const edges = vs.slice(1).map((v, i) => [vs[i], v] as [number, number]);
    for (const [a, b] of edges) mainEdges.add(edgeKey(a, b));
    return {
      type,
      key,
      name,
      cells: route,
      edges,
      ekeys: edges.map(([a, b]) => edgeKey(a, b)),
      pts: vs.map(v => vertices.p[v] as P2)
    };
  };
  const pushRoad = (r: Road | null) => {
    if (r) roads.push(r);
    return r;
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
      // the road ends at the shore rather than leaping a strait
      const here = nearestCell(p, () => true);
      if (here >= 0 && isWater[here] && !river[here] && s > TR * 1.1 && last >= 0) break;
      const c = nearestCell(p, i => !isWater[i]);
      if (c >= 0 && !isWater[c]) last = c;
    }
    return last;
  };
  const routes = region.routes.filter(r => r.pts.some(([x, y]) => Math.hypot(x - B.x, y - B.y) < 1.5));
  for (const r of routes) {
    const far = r.pts.map(toP).sort((a, b) => dist(b, C) - dist(a, C))[0];
    exits.push({
      cell: edgeCell(Math.atan2(far[1] - T[1], far[0] - T[0])),
      name: S ? (r.n ?? r.g) : "Carnival Road",
      out: far
    });
  }
  for (const nb of S ? [] : region.burgs) {
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
    const route = mainRoute(squareCell, e.cell) ?? mainRoute(squareCell, e.cell, false);
    if (!route) continue;
    for (const c of route) onMain[c] = 1;
    pushRoad(onEdges("main", `m:${e.name}`, named(`m:${e.name}`, e.name), route));
  }
  // the dock road: from the square to the waterfront
  {
    const docks = town.filter(i => kind[i] === "docks");
    const far = docks.sort((a, b) => dT(b) - dT(a))[0];
    if (far !== undefined) {
      const route = erased.has("m:Bankside") ? null : mainRoute(squareCell, far);
      if (route) {
        for (const c of route) onMain[c] = 1;
        pushRoad(onEdges("main", "m:Bankside", named("m:Bankside", NM ? "Quay Street" : "Bankside"), route));
      }
    }
  }
  // roads the DM drew, cell to cell
  for (const [k, r] of (ed.roads ?? []).entries()) {
    const route = r.cells.filter(i => i >= 0 && i < n);
    if (route.length < 2) continue;
    if (r.type === "main") for (const c of route) onMain[c] = 1;
    pushRoad(onEdges(r.type, `u:${k}`, named(`u:${k}`, r.name), route));
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
      if (!erased.has(`t:${i}`)) pushRoad(onEdges("track", `t:${i}`, undefined, route.reverse()));
    }
  }

  // ---- walls stand on the cells' own edges: where the town meets open dry land (never the shanty's outside, never
  // the water), and round each fort's cells. An edge a main road already runs on stays a road
  const wallKeys = new Set<string>();
  const wallVtx = new Map<number, number>(); // corner -> -1 the town wall, else the fort's landmark id
  const wallAdj = new Map<number, number[]>();
  const fortCell = new Map<number, number>();
  for (const l of landmarks) if (l.type === "Fort") for (const c of l.cells) fortCell.set(c, l.id);
  const walls: P2[][] = [];
  {
    const townSet = new Set(town);
    const pairs: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const fort = fortCell.get(i);
      if (!townSet.has(i) && fort === undefined) continue;
      const vs = cells.v[i] as number[];
      for (let e = 0; e < vs.length; e++) {
        const a = vs[e];
        const b = vs[(e + 1) % vs.length];
        const k = edgeKey(a, b);
        if (wallKeys.has(k) || mainEdges.has(k) || dist(vertices.p[a], vertices.p[b]) < 0.5) continue;
        const o = sharedCells(a, b).find(c => c !== i);
        if (o === undefined) continue;
        let tag: number | null = null;
        if (fort !== undefined && fortCell.get(o) !== fort) tag = fort;
        else if ((!S || S.walled) && townSet.has(i) && o < n && !urban(o) && !isWater[o]) tag = -1;
        if (tag === null) continue;
        wallKeys.add(k);
        pairs.push([a, b, tag]);
      }
    }
    for (const [a, b, tag] of pairs) {
      for (const [u, v] of [
        [a, b],
        [b, a]
      ]) {
        wallAdj.set(u, [...(wallAdj.get(u) ?? []), v]);
        if (!wallVtx.has(u) || tag >= 0) wallVtx.set(u, tag);
      }
    }
    // the edges as unbroken runs, closed rings included
    const used = new Set<string>();
    const starts = [...wallAdj.keys()].sort(
      (a, b) => ((wallAdj.get(a)?.length ?? 0) === 2 ? 1 : 0) - ((wallAdj.get(b)?.length ?? 0) === 2 ? 1 : 0)
    );
    for (const s0 of starts)
      for (const n0 of wallAdj.get(s0) ?? []) {
        if (used.has(edgeKey(s0, n0))) continue;
        const ch = [s0, n0];
        used.add(edgeKey(s0, n0));
        for (let cur = n0; wallAdj.get(cur)?.length === 2; ) {
          const nx = (wallAdj.get(cur) as number[]).find(x => !used.has(edgeKey(cur, x)));
          if (nx === undefined) break;
          used.add(edgeKey(cur, nx));
          ch.push(nx);
          cur = nx;
        }
        walls.push(ch.map(v => vertices.p[v] as P2));
      }
  }

  // every urban cell is its own block
  const block = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) if (urban(i)) block[i] = i;

  // every edge of an urban cell with land beyond it is a road: between two urban cells, and round the urban edge
  // (the wall street). So every cell is ringed by roads and the town's network is whole by construction.
  // Streets are the shortest ways from the square to each district, landmark, square, pond and park; lanes the rest
  const streetEdges: { a: number; b: number; c1: number; c2: number; type: Road["type"] }[] = [];
  {
    const seen = new Set<string>();
    const lane = new Map<string, { a: number; b: number; c1: number; c2: number }>();
    for (let i = 0; i < n; i++) {
      if (!urban(i)) continue;
      const vs = cells.v[i] as number[];
      for (let e = 0; e < vs.length; e++) {
        const a = vs[e];
        const b = vs[(e + 1) % vs.length];
        const k = edgeKey(a, b);
        if (seen.has(k) || mainEdges.has(k) || wallKeys.has(k) || erased.has(`e:${k}`)) continue;
        seen.add(k);
        if (!landEdge(a, b) || dist(vertices.p[a], vertices.p[b]) < 1) continue;
        const [c1, c2] = sharedCells(a, b);
        // inside one landmark there is no road
        if (isLandmark[c1] && isLandmark[c2]) continue;
        lane.set(k, { a, b, c1, c2 });
      }
    }
    // streets: a shortest-way tree out from the square over the roads
    const adj = new Map<number, number[]>();
    const add = (a: number, b: number) => {
      adj.set(a, [...(adj.get(a) ?? []), b]);
      adj.set(b, [...(adj.get(b) ?? []), a]);
    };
    for (const e of lane.values()) add(e.a, e.b);
    for (const k of mainEdges) {
      const [a, b] = k.split("|").map(Number);
      add(a, b);
    }
    const distTo = new Map<number, number>();
    const prev = new Map<number, number>();
    const open: [number, number][] = [];
    for (const v of cells.v[squareCell] as number[]) {
      distTo.set(v, 0);
      open.push([0, v]);
    }
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [c, v] = open.splice(bi, 1)[0];
      if (c > (distTo.get(v) ?? Infinity)) continue;
      for (const w of adj.get(v) ?? []) {
        const nc = c + dist(vertices.p[v], vertices.p[w]) * (mainEdges.has(edgeKey(v, w)) ? 0.5 : 1);
        if (nc < (distTo.get(w) ?? Infinity)) {
          distTo.set(w, nc);
          prev.set(w, v);
          open.push([nc, w]);
        }
      }
    }
    const streetKeys = new Set<string>();
    const reach = (cell: number) => {
      const vs = (cells.v[cell] as number[]).filter(v => distTo.has(v));
      if (!vs.length) return;
      let v = vs.sort((a, b) => (distTo.get(a) ?? 0) - (distTo.get(b) ?? 0))[0];
      while (prev.has(v)) {
        const u = prev.get(v) as number;
        streetKeys.add(edgeKey(u, v));
        v = u;
      }
    };
    const targets = new Set<number>();
    for (let i = 0; i < n; i++)
      if (isLandmark[i] || kind[i] === "square" || kind[i] === "pond" || kind[i] === "park") targets.add(i);
    for (const D of DIST) {
      const cs = D.cells.length ? D.cells : [...Array(n).keys()].filter(i => district[i] === D.id);
      if (!cs.length) continue;
      const cx = cs.reduce((q, i) => q + pts[i][0], 0) / cs.length;
      const cy = cs.reduce((q, i) => q + pts[i][1], 0) / cs.length;
      targets.add(cs.sort((a, b) => dist(pts[a], [cx, cy]) - dist(pts[b], [cx, cy]))[0]);
    }
    for (const t of targets) reach(t);
    for (const [k, e] of lane) streetEdges.push({ ...e, type: streetKeys.has(k) ? "street" : "lane" });
  }
  // chains of street edges become named streets
  const LANE_END = ["Lane", "Alley", "Row", "Court", "Passage", "Yard", "Walk", "Close"];
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
    const streetNames = new Set<string>();
    const uniqueStreet = () => {
      for (let k = 0; k < 8; k++) {
        const nm = NM?.street() as string;
        if (!streetNames.has(nm)) {
          streetNames.add(nm);
          return nm;
        }
      }
      return NM?.street() as string;
    };
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
        name: named(
          skey,
          // every street and lane has a name, so every house has an address on its own way
          type === "street" && len > 45
            ? NM
              ? uniqueStreet()
              : STREETS[sn++ % STREETS.length]
            : len > 10
              ? `${(NM ? uniqueStreet() : STREETS[sn++ % STREETS.length]).replace(/ \S+$/, "")} ${LANE_END[sn++ % LANE_END.length]}`
              : undefined
        )
      });
    }
  }
  // a quay along every town edge that meets the water, squares included; piers spur out from the docks
  const pierSegs: [P2, P2][] = [];
  for (const i of [...Array(n).keys()].filter(urban)) {
    if (isLandmark[i]) continue;
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
      for (let t = 5 + R() * 3; kind[i] === "docks" && t < L - 4; t += 10 + R() * 6) {
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

  // gates: wherever a road leaves town through the wall, at the cell corner it passes; a fort's on its way in
  const gates: Gate[] = [];
  {
    const HALF_W: Record<string, number> = { main: 2.3, street: 1.6, lane: 1.1, track: 1.1, path: 1 };
    const fortGate = new Set<number>();
    for (const r of roads) {
      if (r.type === "pier" || !r.edges) continue;
      for (const [a, b] of r.edges) {
        if (wallKeys.has(edgeKey(a, b))) continue;
        for (const v of [a, b]) {
          const f = wallVtx.get(v);
          if (f === undefined) continue;
          const out = sharedCells(a, b);
          if (f < 0) {
            // the town wall: only roads running on out of town
            if (!(r.type === "main" || r.type === "track" || r.type === "path")) continue;
            if (!out.some(c => c >= n || !urban(c))) continue;
          } else {
            // a fort: one gate, for a street or main road coming to it from outside
            if (fortGate.has(f) || !(r.type === "main" || r.type === "street")) continue;
            if (out.every(c => fortCell.get(c) === f)) continue;
            fortGate.add(f);
          }
          const p = vertices.p[v] as P2;
          if (gates.some(g => dist(g.p, p) < 6)) continue;
          const nb = (wallAdj.get(v) ?? []).map(w => vertices.p[w] as P2);
          const r0 = (HALF_W[r.type] ?? 1.2) + 1.2;
          const along = (q: P2): P2 => {
            const L = dist(p, q) || 1;
            return [p[0] + ((q[0] - p[0]) / L) * r0, p[1] + ((q[1] - p[1]) / L) * r0];
          };
          const base = (r.name ?? (f >= 0 ? "Keep" : "Postern"))
            .replace(/^The /, "")
            .replace(/ (Road|Street|Lane|Way)$/, "");
          gates.push({
            p,
            a: nb[0] ? along(nb[0]) : p,
            b: nb[1] ? along(nb[1]) : p,
            r: r0,
            key: `g:${r.key}:${v}`,
            road: r.key,
            name: named(`g:${r.key}:${v}`, f >= 0 ? `${base} Gate` : `${base} Gate`) as string
          });
        }
      }
    }
  }
  // turrets where the wall turns, clear of the gates
  const towers: P2[] = [];
  for (const w of walls)
    for (let k = 1; k < w.length - 1; k++) {
      const [a, p, b] = [w[k - 1], w[k], w[k + 1]];
      const d = Math.atan2(b[1] - p[1], b[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0]);
      if (Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.6) continue;
      if (gates.some(g => dist(g.p, p) < 7) || towers.some(t => dist(t, p) < 10)) continue;
      towers.push(p);
    }

  // names for the open places
  const places: Record<number, string> = {};
  for (let i = 0; i < n; i++) {
    const k = kind[i];
    if (i === squareCell) places[i] = NM ? NM.place("square") : "Coin Square";
    else if (k === "square") places[i] = NM ? NM.place("market") : "Fish Market";
    else if (k === "park") places[i] = NM ? NM.place("park") : "Ledger Gardens";
    else if (k === "pond") places[i] = NM ? NM.place("pond") : "Mint Pond";
  }
  // the country named as the old plans named it: each run of one ground, and the water
  const fields: City["fields"] = [];
  {
    const FB: Record<string, string[]> = {
      grass: ["Long Meadow", "Hay Meadow", "The Commons", "Lamb Close"],
      pasture: ["Cow Leaze", "Horse Close"],
      wheat: ["Mill Field", "North Field", "Barley Croft"],
      tilled: ["Plough Land", "Furrow Field", "Ridge Acre"],
      woods: ["Hart Wood", "Rook Copse", "Ash Holt"],
      water: ["The Gold Sound"]
    };
    const seen = new Uint8Array(n);
    const inHome = (i: number) =>
      !!homeMask[i] || (use[i] === "water" && cells.c[i].some(j => j < n && homeMask[j] && use[j] !== "water"));
    for (let i = 0; i < n; i++) {
      const u = use[i];
      if (seen[i] || !inHome(i) || !FB[u]) continue;
      const run = [i];
      seen[i] = 1;
      for (let k = 0; k < run.length; k++)
        for (const j of cells.c[run[k]])
          if (j < n && !seen[j] && inHome(j) && use[j] === u) {
            seen[j] = 1;
            run.push(j);
          }
      const key = `c:${Math.min(...run)}`;
      const base = NM
        ? NM.place(u === "water" ? "sea" : u)
        : FB[u][fields.filter(f => f.kind === u).length % FB[u].length];
      fields.push({ kind: u, cells: run, name: named(key, base) as string, key });
    }
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
              : S && !big
                ? 0
                : 4;
  }
  for (const g of gates)
    for (let i = 0; i < n; i++)
      if (use[i] === "town" && cells.v[i].some(v => dist(vertices.p[v], g.p) < 14) && kind[i] !== "square")
        faction[i] = 1;
  for (const [k, v] of Object.entries(ed.factionCells ?? {})) if (+k >= 0 && +k < n) faction[+k] = v;
  // a coastal town keeps one ring of its own water, so its quays and piers stand inside the map
  const coast = homeMask.slice();
  for (let i = 0; i < n; i++)
    if (!homeMask[i] && use[i] === "water" && cells.c[i].some(j => j < n && homeMask[j] && use[j] !== "water"))
      coast[i] = 1;

  return {
    W,
    H,
    pack,
    home: coast,
    use,
    kind,
    district,
    districts: DIST,
    roads,
    walls,
    wallEdges: [...wallKeys],
    towers,
    gates,
    landmarks,
    farms,
    block,
    factions: (NM ? NM.factions(burgName, S?.size ?? "city") : FACTIONS).map(f => ({
      ...f,
      name: named(`f:${f.id}`, f.name) as string
    })),
    notables: NM?.notables(),
    places,
    port,
    fields,
    population: B.pop ? Math.round(B.pop * 1000) : 0,
    spare: {
      yard: Array.from({ length: 12 }, () => NM?.place("yard") ?? "Tallow Yard"),
      opening: Array.from({ length: 8 }, () => NM?.place("opening") ?? "Cooper's Place"),
      square: Array.from({ length: 6 }, () => NM?.place("big") ?? "Lantern Square")
    },
    faction,
    edits: ed,
    buildings: [],
    trees: [],
    squareCell,
    ang,
    yards: [],
    height,
    borders
  };
}
