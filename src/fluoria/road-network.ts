// The road network: every road runs from one settlement to another, so roads only ever meet at settlements. A road
// keeps to land, off mountains and out of forest, never crosses another road, and is at most ROAD_MAX cells long
import { findPath } from "@/utils/pathUtils";
import { mainCell } from "./one-grid";
import { blocksRoads } from "./woods";

export const ROAD_MAX = 14;

const living = (id: number) => (id && pack.burgs[id] && !pack.burgs[id].removed ? pack.burgs[id] : null);
const burgAt = (cell: number) => living(pack.cells.burg[mainCell(cell)]);

/** Cells a road runs through between its two settlements: no other road may use them */
function usedCells(except?: number): Uint8Array {
  const used = new Uint8Array(pack.cells.i.length);
  for (const route of pack.routes ?? []) {
    if (route.group === "searoutes" || route.i === except) continue;
    for (const [, , cell] of route.points) if (!burgAt(cell)) used[cell] = 1;
  }
  return used;
}

/** The best way by land from one settlement to another, or why there is none */
export function roadPath(from: number, to: number, used = usedCells()): number[] | string {
  const a = living(from);
  const b = living(to);
  if (!a || !b || a === b) return "Pick two settlements";
  const { cells } = pack;
  if (cells.f[a.cell] !== cells.f[b.cell]) return "They are on different land";
  const cost = (current: number, next: number) => {
    if (cells.h[next] < 20 || blocksRoads(cells, next) || used[next]) return Infinity;
    if (next !== b.cell && burgAt(next)) return Infinity; // a road ends at the first settlement it reaches
    const [x0, y0] = cells.p[current];
    const [x1, y1] = cells.p[next];
    return Math.hypot(x1 - x0, y1 - y0) * (1 + Math.max(0, cells.h[next] - 30) / 25);
  };
  const path = findPath(a.cell, cell => cell === b.cell, cost, pack);
  if (!path) return "No way by land: mountains, forest, water or another road are in the way";
  const full = path[0] === a.cell ? path : [a.cell, ...path];
  if (full.length > ROAD_MAX) return `Too long: ${full.length} cells, ${ROAD_MAX} at most`;
  return full;
}

/** Lay a road between two settlements; its id, or why it can't be laid */
export function layRoad(from: number, to: number, group: string, used?: Uint8Array): number | string {
  const path = roadPath(from, to, used);
  if (typeof path === "string") return path;
  const points = path.map((cell, k) => {
    const burg = k === 0 ? living(from) : k === path.length - 1 ? living(to) : null;
    return burg ? [burg.x, burg.y] : pack.cells.p[cell];
  });
  const id = Routes.create(points, group);
  const route = pack.routes.find(r => r.i === id);
  if (route) route.name = Routes.generateName(route) ?? `${living(to)?.name} road`;
  if (used) for (const cell of path) if (!burgAt(cell)) used[cell] = 1;
  return id;
}

/** The generated network: main roads tie each nation's capital to its province seats, then the shortest roads that
 * join every other settlement up, each at most ROAD_MAX cells, none crossing another */
export function buildRoadNetwork(): number {
  pack.routes = (pack.routes ?? []).filter(r => r.group === "searoutes" || r.lock);
  pack.cells.routes = Routes.buildLinks(pack.routes);
  const used = usedCells();
  const burgs = pack.burgs.filter(b => b?.i && !b.removed);
  const seats = new Set<number>();
  for (const p of pack.provinces ?? []) if (p?.i && !p.removed && p.burg) seats.add(p.burg);
  for (const s of pack.states ?? []) if (s?.i && !s.removed && s.capital) seats.add(s.capital);

  // candidate links: each settlement to its nearest few on the same land
  const near = 6;
  const edges: [number, number, number, boolean][] = [];
  for (const b of burgs) {
    const others = burgs
      .filter(o => o !== b && pack.cells.f[o.cell] === pack.cells.f[b.cell])
      .map(o => [o, (o.x - b.x) ** 2 + (o.y - b.y) ** 2] as const)
      .sort((p, q) => p[1] - q[1])
      .slice(0, near);
    for (const [o, d] of others) edges.push([b.i, o.i, d, seats.has(b.i) && seats.has(o.i) && b.state === o.state]);
    // seats reach further, to the nearest seats of their own nation
    if (seats.has(b.i))
      for (const [o, d] of burgs
        .filter(o => o !== b && seats.has(o.i) && o.state === b.state && pack.cells.f[o.cell] === pack.cells.f[b.cell])
        .map(o => [o, (o.x - b.x) ** 2 + (o.y - b.y) ** 2] as const)
        .sort((p, q) => p[1] - q[1])
        .slice(0, 3))
        edges.push([b.i, o.i, d, true]);
  }
  const seen = new Set<string>();
  const unique = edges.filter(([a, b]) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // join up with as few roads as can do it, main roads first
  const root = new Map<number, number>();
  const find = (x: number): number => {
    const r = root.get(x) ?? x;
    if (r === x) return x;
    const top = find(r);
    root.set(x, top);
    return top;
  };
  let made = 0;
  const pass = (main: boolean) => {
    for (const [a, b, , isMain] of unique
      .filter(e => (main ? e[3] : true))
      .sort((p, q) => Number(q[3]) - Number(p[3]) || p[2] - q[2])) {
      if (find(a) === find(b)) continue;
      const id = layRoad(a, b, main || isMain ? "roads" : "trails", used);
      if (typeof id === "string") continue;
      root.set(find(a), find(b));
      made++;
    }
  };
  pass(true);
  pass(false);
  pack.cells.routes = Routes.buildLinks(pack.routes);
  return made;
}
