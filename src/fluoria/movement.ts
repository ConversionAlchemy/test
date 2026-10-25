// How far a regiment can go in one move, counted in cells so every map plays the same whatever its scale.
// Off road: one step to any neighbour. Along roads: up to 4 (main road), 3 (road) or 2 (path) cells, mixed routes
// costing each step by the road it's on, with one step off the road allowed from any cell reached.
// At sea, on the even grid: 6 cells, or 10 along a sea lane
import type { Regiment } from "@/generators/military-generator";

export const CELLS_PER_MOVE: Record<string, number> = { roads: 4, trails: 3, paths: 2 };
const OTHER_ROUTE = 2;
export const SEA_CELLS = 6;
export const LANE_CELLS = 10;

const isWaterCell = (cell: number) => pack.cells.h[cell] < 20;

/** Whether a regiment may stand in a cell at all: fleets on water, everyone else on land */
export function canStand(regiment: Pick<Regiment, "n">, cell: number): boolean {
  return regiment.n ? isWaterCell(cell) : !isWaterCell(cell);
}

const routeById = () => new Map(pack.routes.map(route => [route.i, route]));

/** The road joining two neighbouring cells, if any */
function roadBetween(from: number, to: number, routes: Map<number, (typeof pack.routes)[number]>): string | null {
  const id = pack.cells.routes?.[from]?.[to];
  const route = id === undefined ? undefined : routes.get(id);
  return route && route.group !== "searoutes" ? route.group : null;
}

/** How a cell moves: the best road through it, or open ground (one cell a move) */
export function cellPace(cell: number): { cells: number; road: string | null } {
  const routes = routeById();
  let best: { cells: number; road: string | null } = { cells: 1, road: null };
  for (const next of Object.keys(pack.cells.routes?.[cell] ?? {})) {
    const road = roadBetween(cell, Number(next), routes);
    const cells = road ? (CELLS_PER_MOVE[road] ?? OTHER_ROUTE) : 1;
    if (cells > best.cells) best = { cells, road };
  }
  return best;
}

/** Every land cell the regiment can reach this move, with the share of the move it costs */
export function reachable(regiment: Pick<Regiment, "n" | "cell">): Map<number, number> {
  const { cells } = pack;
  const routes = routeById();
  const start = startCell(regiment);
  const onRoad = new Map<number, number>([[start, 0]]);
  const queue: [number, number][] = [[0, start]];
  while (queue.length) {
    let k = 0;
    for (let j = 1; j < queue.length; j++) if (queue[j][0] < queue[k][0]) k = j;
    const [cost, cell] = queue[k];
    queue[k] = queue[queue.length - 1];
    queue.pop();
    if (cost > (onRoad.get(cell) ?? Infinity)) continue;
    for (const next of cells.c[cell]) {
      if (!canStand(regiment, next)) continue;
      const road = roadBetween(cell, next, routes);
      if (!road) continue;
      const total = cost + 1 / (CELLS_PER_MOVE[road] ?? OTHER_ROUTE);
      if (total > 1 + 1e-9 || total >= (onRoad.get(next) ?? Infinity)) continue;
      onRoad.set(next, total);
      queue.push([total, next]);
    }
  }
  // from anywhere reached along the road, one step off it
  const reach = new Map(onRoad);
  for (const [cell, cost] of onRoad)
    for (const next of cells.c[cell])
      if (canStand(regiment, next) && !reach.has(next)) reach.set(next, Math.min(1, cost + 1));
  return reach;
}

/**
 * Whether a map point lies on a sea lane: within about one sea cell of a lane's line. Packed sea cells are huge
 * offshore, so asking which packed cell a lane crosses would put open water on the lane too
 */
export function laneTest(): (x: number, y: number) => boolean {
  const reach = grid.spacing * 0.75;
  const size = grid.spacing * 2;
  const buckets = new Map<string, [number, number, number, number][]>();
  const add = (bx: number, by: number, seg: [number, number, number, number]) => {
    const key = `${bx},${by}`;
    const list = buckets.get(key) ?? [];
    list.push(seg);
    buckets.set(key, list);
  };
  for (const route of pack.routes ?? []) {
    if (route.group !== "searoutes") continue;
    const pts = route.points ?? [];
    for (let k = 1; k < pts.length; k++) {
      const seg: [number, number, number, number] = [pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]];
      const x0 = Math.floor((Math.min(seg[0], seg[2]) - reach) / size);
      const x1 = Math.floor((Math.max(seg[0], seg[2]) + reach) / size);
      const y0 = Math.floor((Math.min(seg[1], seg[3]) - reach) / size);
      const y1 = Math.floor((Math.max(seg[1], seg[3]) + reach) / size);
      for (let bx = x0; bx <= x1; bx++) for (let by = y0; by <= y1; by++) add(bx, by, seg);
    }
  }
  return (x, y) => {
    for (const [ax, ay, bx, by] of buckets.get(`${Math.floor(x / size)},${Math.floor(y / size)}`) ?? []) {
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
      if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= reach) return true;
    }
    return false;
  };
}

/** A fleet moored at a port counts from its harbour; anyone stranded counts from the nearest cell they may use */
function startCell(regiment: Pick<Regiment, "n" | "cell">): number {
  const { cells } = pack;
  const cell = regiment.cell;
  if (canStand(regiment, cell)) return cell;
  const haven = cells.haven?.[cell];
  if (haven && canStand(regiment, haven)) return haven;
  return cells.c[cell].find(next => canStand(regiment, next)) ?? cell;
}
