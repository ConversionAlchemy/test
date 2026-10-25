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

/** Packed cells a sea lane runs through */
export function laneCells(): Set<number> {
  const lanes = new Set<number>();
  const routes = routeById();
  for (const [from, nexts] of Object.entries(pack.cells.routes ?? {}))
    for (const id of Object.values(nexts as Record<string, number>))
      if (routes.get(id)?.group === "searoutes") lanes.add(Number(from));
  return lanes;
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
