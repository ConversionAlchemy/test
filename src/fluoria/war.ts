// War on the map: occupation of enemy cells, pushing back the loser of a battle, surrender, and annexing.
// A cell keeps its rightful owner (`pack.cells.state`); an occupier lists it in its `occupied`
import type { Regiment } from "@/generators/military-generator";
import { domainOf, isTransport, kitOf, slotsOf, troopsOf } from "./forces/forces";
import { canStand } from "./movement";
import { standing } from "./nation";
import { cellCentre, mainCell, neighbours } from "./one-grid";

const living = () => pack.states.filter(s => s?.i && !s.removed);
export const atWar = (a: number, b: number) => Boolean(a && b && a !== b && standing(a, b) === "enemy");

/** The state holding a cell in war, or 0 */
export function occupierOf(cell: number): number {
  const at = mainCell(cell);
  return living().find(s => s.occupied?.includes(at))?.i ?? 0;
}

export function occupiedBy(state: number): number[] {
  return [...(pack.states[state]?.occupied ?? [])];
}

function release(cell: number): void {
  for (const s of living()) if (s.occupied?.includes(cell)) s.occupied = s.occupied.filter(c => c !== cell);
}

export function occupy(state: number, cell: number): void {
  const at = mainCell(cell);
  release(at);
  if (pack.cells.state[at] === state) return;
  const occupier = pack.states[state];
  occupier.occupied = [...(occupier.occupied ?? []), at];
}

/** Regiments in a cell belonging to anyone at war with `state` */
export function enemiesIn(state: number, cell: number): Regiment[] {
  const at = mainCell(cell);
  return living().flatMap(s =>
    atWar(state, s.i) ? (s.military ?? []).filter(r => !r.hidden && mainCell(r.cell) === at && troopsOf(r)) : []
  );
}

/** Who a land cell answers to now: its occupier, or its owner */
export const holderOf = (cell: number) => occupierOf(cell) || pack.cells.state[mainCell(cell)];

/** A land army ending its move on enemy ground takes it; on its own ground it frees it */
export function afterMove(regiment: Regiment): boolean {
  if (domainOf(regiment) !== "land" || !troopsOf(regiment)) return false;
  const at = mainCell(regiment.cell);
  if (pack.cells.h[at] < 20 || enemiesIn(regiment.state, at).length) return false;
  const owner = pack.cells.state[at];
  const occupier = occupierOf(at);
  if (owner === regiment.state) {
    if (!occupier) return false;
    release(at);
    return true;
  }
  if (occupier === regiment.state) return false;
  if (atWar(regiment.state, occupier || owner)) {
    occupy(regiment.state, at);
    return true;
  }
  return false;
}

/** Cells a regiment may not end a move in: any held by an enemy army */
export function blocked(regiment: Regiment): Set<number> {
  const out = new Set<number>();
  for (const s of living())
    if (atWar(regiment.state, s.i))
      for (const r of s.military ?? []) if (!r.hidden && troopsOf(r)) out.add(mainCell(r.cell));
  return out;
}

/** Where a beaten regiment falls back to: a free cell beside it, away from the winner, on friendly ground first */
export function fallBack(loser: Regiment, from: [number, number]): number | null {
  const at = mainCell(loser.cell);
  const friendly = (cell: number) =>
    ["self", "ally", "vassal", "overlord"].includes(standing(loser.state, holderOf(cell)));
  const options = neighbours(at).filter(
    cell =>
      canStand(loser, cell) && !enemiesIn(loser.state, cell).length && hasRoom(loser.state, cell, slotsOf(loser.u))
  );
  if (!options.length) return null;
  const away = (cell: number) => {
    const [x, y] = cellCentre(cell);
    return Math.hypot(x - from[0], y - from[1]) + (friendly(cell) ? 1e6 : 0);
  };
  return options.reduce((best, cell) => (away(cell) > away(best) ? cell : best));
}

export function moveToCell(regiment: Regiment, cell: number): void {
  const [x, y] = cellCentre(cell);
  regiment.cell = cell;
  Military.move(regiment.state, regiment.i, x, y);
}

/** A regiment that lost its last troops, or its transport, is gone; cargo goes down with the ship */
export function clearLosses(regiments: Regiment[]): void {
  for (const r of regiments) {
    const hadTransport = Object.keys(r.u).some(name => kitOf(name)?.role === "transport") || r.cargo;
    if (!troopsOf(r) || (hadTransport && !isTransport(r))) Military.remove(r.state, r.i);
  }
}

export type Surrender = "eliminate" | "capture" | "release";

/** A regiment with nowhere to fall back gives up: removed, taken over by the winner, or sent home */
export function surrender(regiment: Regiment, how: Surrender, winner: number): void {
  if (how === "eliminate") {
    Military.remove(regiment.state, regiment.i);
    return;
  }
  if (how === "capture") {
    const taker = pack.states[winner];
    taker.military ??= [];
    const i = Math.max(-1, ...taker.military.map(r => r.i)) + 1;
    Military.remove(regiment.state, regiment.i);
    taker.military.push({ ...regiment, i, state: winner, name: `${regiment.name} (captured)` });
    return;
  }
  const home = nearestHome(regiment);
  if (home === null) Military.remove(regiment.state, regiment.i);
  else moveToCell(regiment, home);
}

function nearestHome(regiment: Regiment): number | null {
  const start = mainCell(regiment.cell);
  const seen = new Set([start]);
  let frontier = [start];
  while (frontier.length) {
    const next: number[] = [];
    for (const cell of frontier)
      for (const n of neighbours(cell)) {
        if (seen.has(n)) continue;
        seen.add(n);
        if (
          canStand(regiment, n) &&
          holderOf(n) === regiment.state &&
          !enemiesIn(regiment.state, n).length &&
          hasRoom(regiment.state, n, slotsOf(regiment.u))
        )
          return n;
        next.push(n);
      }
    frontier = next;
  }
  return null;
}

/** The occupier takes a cell for good: it becomes theirs, settlement and all */
export function annexCell(cell: number): boolean {
  const at = mainCell(cell);
  const occupier = occupierOf(at);
  if (!occupier) return false;
  release(at);
  States.setCells(occupier, [at]);
  return true;
}

/** Every cell a state occupies becomes its own */
export function integrate(state: number): number {
  const cells = occupiedBy(state);
  if (!cells.length) return 0;
  for (const cell of cells) release(cell);
  States.setCells(state, cells);
  return cells.length;
}

/** Give an occupied cell back to its owner */
export function returnCell(cell: number): void {
  release(mainCell(cell));
}

/** Occupations of a state that's gone, or of cells that became the occupier's own, are dropped */
export function tidyOccupations(): void {
  for (const s of living())
    if (s.occupied) s.occupied = s.occupied.filter(cell => pack.cells.state[cell] !== s.i && pack.cells.h[cell] >= 20);
}

/** Slots a cell holds at most, counting a nation's units with its allies', vassals' and overlord's */
export const CELL_SLOTS = 12;

const friendly = (a: number, b: number) => ["self", "ally", "vassal", "overlord"].includes(standing(a, b));

/** Slots friendly to `state` already standing in a cell; a transport is 1, its cargo nothing */
export function cellLoad(state: number, cell: number, leaving?: Regiment): number {
  const at = mainCell(cell);
  let load = 0;
  for (const s of living())
    if (friendly(state, s.i))
      for (const r of s.military ?? []) if (r !== leaving && !r.hidden && mainCell(r.cell) === at) load += slotsOf(r.u);
  return load;
}

/** Whether `slots` more fit in a cell for `state` */
export const hasRoom = (state: number, cell: number, slots: number, leaving?: Regiment) =>
  cellLoad(state, cell, leaving) + slots <= CELL_SLOTS;
