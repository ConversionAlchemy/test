// How far a regiment can go in one move, counted in cells so every map plays the same whatever its scale.
// Off road: one step to any neighbour. Along roads: up to 4 (main road), 3 (road) or 2 (path) cells, mixed routes
// costing each step by the road it's on; or one step to any neighbour, never both in one move.
// At sea, on the even grid: 3 cells, or 12 along the cells of a sea lane
import type { Regiment } from "@/generators/military-generator";
import { foldCells, isPort, mainCell, neighbours } from "./one-grid";
import { routeCells } from "./road-geometry";

export const CELLS_PER_MOVE: Record<string, number> = { roads: 4, trails: 3, paths: 2 };
const OTHER_ROUTE = 2;
export const SEA_CELLS = 3;
export const LANE_CELLS = 12;

const isWaterCell = (cell: number) => pack.cells.h[cell] < 20;

/** Whether a regiment may stand in a cell at all: fleets on water or in a port, everyone else on land */
export function canStand(regiment: Pick<Regiment, "n">, cell: number): boolean {
  return regiment.n ? isWaterCell(cell) || isPort(cell) : !isWaterCell(cell);
}

/** Land road steps between neighbouring cells, "a-b" both ways, each with the best road group on it */
function roadEdges(): Map<string, string> {
  const edges = new Map<string, string>();
  for (const route of pack.routes ?? []) {
    if (route.group === "searoutes") continue;
    const cells = foldCells(routeCells(route));
    for (let k = 1; k < cells.length; k++)
      for (const key of [`${cells[k - 1]}-${cells[k]}`, `${cells[k]}-${cells[k - 1]}`]) {
        const had = edges.get(key);
        if (!had || (CELLS_PER_MOVE[route.group] ?? OTHER_ROUTE) > (CELLS_PER_MOVE[had] ?? OTHER_ROUTE))
          edges.set(key, route.group);
      }
  }
  return edges;
}

/** How a cell moves: the best road through it, or open ground (one cell a move) */
export function cellPace(cell: number): { cells: number; road: string | null } {
  const edges = roadEdges();
  const at = mainCell(cell);
  let best: { cells: number; road: string | null } = { cells: 1, road: null };
  for (const next of neighbours(at)) {
    const road = edges.get(`${at}-${next}`) ?? null;
    const cells = road ? (CELLS_PER_MOVE[road] ?? OTHER_ROUTE) : 1;
    if (cells > best.cells) best = { cells, road };
  }
  return best;
}

/** Every land cell the regiment can reach this move, with the share of the move it costs */
export function reachable(regiment: Pick<Regiment, "n" | "cell">): Map<number, number> {
  const edges = roadEdges();
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
    for (const next of neighbours(cell)) {
      if (!canStand(regiment, next)) continue;
      const road = edges.get(`${cell}-${next}`);
      if (!road) continue;
      const total = cost + 1 / (CELLS_PER_MOVE[road] ?? OTHER_ROUTE);
      if (total > 1 + 1e-9 || total >= (onRoad.get(next) ?? Infinity)) continue;
      onRoad.set(next, total);
      queue.push([total, next]);
    }
  }
  // or one ordinary step to any neighbour of where it stands; the two never combine
  const reach = new Map(onRoad);
  for (const next of neighbours(start)) if (canStand(regiment, next) && !reach.has(next)) reach.set(next, 1);
  return reach;
}

/** A fleet moored at a port counts from its harbour; anyone stranded counts from the nearest cell they may use */
function startCell(regiment: Pick<Regiment, "n" | "cell">): number {
  const cell = mainCell(regiment.cell);
  if (canStand(regiment, cell)) return cell;
  const haven = pack.cells.haven?.[cell];
  if (haven && canStand(regiment, haven)) return mainCell(haven);
  return neighbours(cell).find(next => canStand(regiment, next)) ?? cell;
}
