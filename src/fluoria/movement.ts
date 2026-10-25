// How far a regiment can go in one move, counted in cells so every map plays the same whatever its scale.
// Off road: its slowest unit's steps (cavalry 2, the rest 1). Along roads: up to 4 (main road), 3 (road) or 2 (path)
// cells, armour at most 2, mixed routes costing each step by the road it's on; never both in one move.
// At sea, on the even grid: 3 cells, or 12 along the cells of a sea lane.
// In the air: 6–8 cells over anything, ending within range of a settlement of its own nation or an ally
import type { Regiment } from "@/generators/military-generator";
import { domainOf, kitOf } from "./forces/forces";
import { AIR_RANGE, movePerTurn } from "./forces/kit";
import { standing } from "./nation";
import { foldCells, isPort, mainCell, neighbours } from "./one-grid";
import { routeCells } from "./road-geometry";

export const CELLS_PER_MOVE: Record<string, number> = { roads: 4, trails: 3, paths: 2 };
const OTHER_ROUTE = 2;
export const SEA_CELLS = 3;
export const LANE_CELLS = 12;

const isWaterCell = (cell: number) => pack.cells.h[cell] < 20;

type Mover = Pick<Regiment, "n" | "cell"> & Partial<Pick<Regiment, "u" | "state">>;

type Stander = Pick<Regiment, "n"> & Partial<Pick<Regiment, "u">>;

const isAir = (regiment: Stander) => Boolean(regiment.u) && domainOf(regiment as Pick<Regiment, "u" | "n">) === "air";

/** Whether a regiment may stand in a cell at all: fleets on water or in a port, airships anywhere, armies on land */
export function canStand(regiment: Stander, cell: number): boolean {
  if (isAir(regiment)) return true;
  return regiment.n ? isWaterCell(cell) || isPort(cell) : !isWaterCell(cell);
}

/** Off-road steps a move allows: the slowest unit's, from Azgaar's unit settings or the kit */
export function stepsOf(regiment: Mover): number {
  let steps = Infinity;
  for (const [name, n] of Object.entries(regiment.u ?? {})) {
    if (!n) continue;
    const unit = options.map.military.units.find(u => u.name === name);
    const kit = kitOf(name);
    steps = Math.min(steps, unit?.move ?? (kit ? movePerTurn(kit) : 1));
  }
  return Number.isFinite(steps) ? steps : 1;
}

/** Cells within `limit` steps of `from` that `ok` lets through, with their distance */
function spread(from: number[], limit: number, ok: (cell: number) => boolean): Map<number, number> {
  const seen = new Map(from.map(cell => [cell, 0]));
  let frontier = from;
  for (let d = 1; d <= limit && frontier.length; d++) {
    const next: number[] = [];
    for (const cell of frontier)
      for (const n of neighbours(cell))
        if (!seen.has(n) && ok(n)) {
          seen.set(n, d);
          next.push(n);
        }
    frontier = next;
  }
  return seen;
}

/** Cells within an airship's range of a settlement of its nation or one friendly to it */
export function airCover(state: number, range = airRange()): Set<number> {
  const friendly = (owner: number) => ["self", "ally", "vassal", "overlord"].includes(standing(state, owner));
  const bases = (pack.burgs ?? [])
    .filter(b => b?.i && !b.removed && b.state && friendly(b.state))
    .map(b => mainCell(b.cell));
  return new Set(spread(bases, range, () => true).keys());
}

const airRange = () =>
  Math.max(...options.map.military.units.filter(u => u.range).map(u => u.range ?? 0), 0) || AIR_RANGE;

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

/** Cells along any road a regiment's slowest unit allows in one move: armour 2, the rest no limit */
function roadCap(regiment: Mover): number {
  return Object.entries(regiment.u ?? {}).some(([name, n]) => n && kitOf(name)?.role === "armour")
    ? ARMOUR_ROAD
    : Infinity;
}
const ARMOUR_ROAD = 2;

/** Every cell the regiment can reach this move, with the share of the move it costs */
export function reachable(regiment: Mover): Map<number, number> {
  const start = startCell(regiment);
  const steps = stepsOf(regiment);
  if (isAir(regiment)) {
    const cover = airCover(regiment.state ?? 0);
    const reach = new Map<number, number>();
    for (const [cell, d] of spread([start], steps, () => true)) if (cover.has(cell)) reach.set(cell, d / steps);
    return reach;
  }
  const edges = roadEdges();
  const cap = roadCap(regiment);
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
      const total = cost + 1 / Math.min(CELLS_PER_MOVE[road] ?? OTHER_ROUTE, cap);
      if (total > 1 + 1e-9 || total >= (onRoad.get(next) ?? Infinity)) continue;
      onRoad.set(next, total);
      queue.push([total, next]);
    }
  }
  // or its off-road steps over open ground; the two never combine
  const reach = new Map(onRoad);
  for (const [cell, d] of spread([start], steps, next => canStand(regiment, next)))
    if (d && !reach.has(cell)) reach.set(cell, d / steps);
  return reach;
}

/** A fleet moored at a port counts from its harbour; anyone stranded counts from the nearest cell they may use */
function startCell(regiment: Mover): number {
  const cell = mainCell(regiment.cell);
  if (canStand(regiment, cell)) return cell;
  const haven = pack.cells.haven?.[cell];
  if (haven && canStand(regiment, haven)) return mainCell(haven);
  return neighbours(cell).find(next => canStand(regiment, next)) ?? cell;
}
