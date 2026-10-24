// Troops aboard ships. A fleet carries as many soldiers as its ships' crews; boarding troops leave the map and travel
// with the fleet, and land again on a land cell next to it. Aboard is a `carrier` on the regiment, saved with the map
import type { Regiment } from "@/generators/military-generator";

const isWater = (cell: number) => pack.cells.h[cell] < 20;

const regimentOf = ([state, id]: [number, number]) =>
  pack.states[state]?.removed ? undefined : pack.states[state]?.military?.find(r => r.i === id);

/** Soldiers a fleet can carry: ships times crew, from Azgaar's unit types */
export function capacity(fleet: Regiment): number {
  const types = options.map.military.units;
  let total = 0;
  for (const [name, count] of Object.entries(fleet.u)) {
    const type = types.find(unit => unit.name === name);
    if (type?.type === "naval") total += count * (type.crew || 0);
  }
  return total;
}

export function cargo(fleet: Regiment): Regiment[] {
  return pack.states.flatMap(state =>
    state.i && !state.removed
      ? (state.military ?? []).filter(r => r.carrier?.[0] === fleet.state && r.carrier?.[1] === fleet.i)
      : []
  );
}

export const load = (fleet: Regiment) => cargo(fleet).reduce((sum, r) => sum + r.a, 0);
export const space = (fleet: Regiment) => Math.max(0, capacity(fleet) - load(fleet));

/** A fleet is within reach of troops on the shore next to its water cell, or in the port it lies off */
export function canBoard(army: Regiment, fleet: Regiment): boolean {
  if (army.n || !fleet.n || army.carrier || army === fleet) return false;
  const { cells } = pack;
  const next = cells.c[army.cell].includes(fleet.cell) || cells.haven?.[army.cell] === fleet.cell;
  return next && isWater(fleet.cell) && space(fleet) > 0;
}

/** Fleets an army could board where it stands */
export function fleetsFor(army: Regiment): Regiment[] {
  return pack.states.flatMap(state =>
    state.i && !state.removed ? (state.military ?? []).filter(fleet => canBoard(army, fleet)) : []
  );
}

/** Put the army aboard, as much as fits; troops that don't fit stay ashore as their own regiment */
export function board(army: Regiment, fleet: Regiment): Regiment {
  const free = space(fleet);
  let boarding = army;
  if (army.a > free) {
    const share = free / army.a;
    const aboard = Object.fromEntries(Object.entries(army.u).map(([unit, n]) => [unit, Math.floor(n * share)]));
    const ashore = Object.fromEntries(Object.entries(army.u).map(([unit, n]) => [unit, n - aboard[unit]]));
    const id = Military.add(army.state, army.x, army.y);
    Military.setUnits(army.state, id, aboard);
    Military.setIcon(army.state, id, army.icon);
    Military.rename(army.state, id, army.name);
    Military.setUnits(army.state, army.i, ashore);
    boarding = pack.states[army.state].military!.find(r => r.i === id)!;
  }
  boarding.carrier = [fleet.state, fleet.i];
  boarding.hidden = true;
  follow(boarding, fleet);
  return boarding;
}

/** Land cells the fleet's troops may step onto */
export function landingCells(fleet: Regiment): number[] {
  return pack.cells.c[fleet.cell].filter(cell => !isWater(cell));
}

export function land(regiment: Regiment, cell: number): void {
  const [x, y] = pack.cells.p[cell];
  regiment.carrier = undefined;
  regiment.hidden = false;
  regiment.cell = cell;
  Military.move(regiment.state, regiment.i, x, y);
}

/** Troops aboard travel with their fleet */
export function carry(fleet: Regiment): void {
  for (const regiment of cargo(fleet)) follow(regiment, fleet);
}

function follow(regiment: Regiment, fleet: Regiment): void {
  regiment.cell = fleet.cell;
  regiment.x = fleet.x;
  regiment.y = fleet.y;
}

/** The fleet a regiment is aboard, if any */
export const carrierOf = (regiment: Regiment) => (regiment.carrier ? regimentOf(regiment.carrier) : undefined);
