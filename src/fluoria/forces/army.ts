// Changes to a nation's forces through Azgaar's Military module: raising, splitting off, disbanding, loading
import type { Regiment } from "@/generators/military-generator";
import { standing } from "../nation";
import { cellCentre, mainCell, neighbours } from "../one-grid";
import { type List, mergeInto, perSlot, powerOf, refusal, rows, shift, troopsOf, type Units } from "./forces";

export const regimentOf = (state: number, id: number) => pack.states[state]?.military?.find(r => r.i === id);

/** A new regiment of a state in a cell, holding the given units */
export function raise(state: number, cell: number, units: Units, name?: string): Regiment {
  const [x, y] = cellCentre(cell);
  const id = Military.add(state, x, y);
  const made = regimentOf(state, id)!;
  made.cell = cell;
  made.u = { ...units };
  made.a = troopsOf(made);
  made.n = pack.cells.h[cell] < 20 ? 1 : 0;
  if (name) made.name = name;
  return made;
}

/** Like `raise`, standing where another regiment stands */
export function raiseBeside(like: Regiment, units: Units, name: string): Regiment {
  const made = raise(like.state, like.cell, units, name);
  made.x = like.x;
  made.y = like.y;
  made.n = like.n;
  return made;
}

/** Move a slot's worth of troops out of a regiment into a new one of its own in a cell */
export function splitOff(from: Regiment, list: List, unit: string, count: number, cell: number): Regiment | string {
  const made = raise(from.state, cell, {});
  made.home = from.home ?? from.garrison;
  const why = shift(from, list, unit, count, made, "u");
  if (why) {
    Military.remove(made.state, made.i);
    return why;
  }
  dropIfEmpty(from);
  return made;
}

/** Every slot stands on its own in the regiment's cell; a transport's cargo goes ashore in `cell` */
export function disband(regiment: Regiment, cell = regiment.cell): Regiment[] {
  const made: Regiment[] = [];
  for (const row of rows(regiment.cargo)) {
    const unit = splitOff(regiment, "cargo", row.unit, row.count, cell);
    if (typeof unit !== "string") made.push(unit);
  }
  if (made.length || regiment.cargo) return made; // unloading keeps the transport
  for (const row of rows(regiment.u).slice(1)) {
    const unit = splitOff(regiment, "u", row.unit, row.count, regiment.cell);
    if (typeof unit === "string") continue;
    unit.x = regiment.x;
    unit.y = regiment.y;
    made.push(unit);
  }
  return made;
}

/** Merge one regiment into another; returns why not, or "" */
export function merge(from: Regiment, into: Regiment): string {
  const why = mergeInto(from, into);
  if (!why) Military.remove(from.state, from.i);
  return why;
}

/** Load a whole army into a transport; returns why not, or "" */
export function loadAll(army: Regiment, transport: Regiment): string {
  for (const row of rows(army.u)) {
    const why = shift(army, "u", row.unit, row.count, transport, "cargo");
    if (why) return why;
  }
  dropIfEmpty(army);
  return "";
}

export function dropIfEmpty(regiment: Regiment): void {
  if (!troopsOf(regiment) && regimentOf(regiment.state, regiment.i)) Military.remove(regiment.state, regiment.i);
}

/** Add a full slot of a unit to a list; returns why not, or "" */
export function addSlot(to: Regiment, list: List, unit: string): string {
  const n = perSlot(unit);
  const why = refusal(to, list, unit, n);
  if (why) return why;
  if (list === "cargo") to.cargo ??= {};
  const units = (list === "u" ? to.u : to.cargo) as Units;
  units[unit] = (units[unit] ?? 0) + n;
  if (list === "u") to.full = (to.full ?? powerOf(to.u) - powerOf({ [unit]: n })) + powerOf({ [unit]: n });
  to.a = troopsOf(to);
  return "";
}

/** Change how many troops one slot row holds; the unit's total follows */
export function setRow(regiment: Regiment, list: List, unit: string, from: number, to: number): string {
  const units = list === "u" ? regiment.u : regiment.cargo;
  if (!units) return "";
  const count = Math.max(0, Math.min(Math.round(to), perSlot(unit)));
  const total = (units[unit] ?? 0) - from + count;
  const rest = { ...units };
  delete rest[unit];
  const why = count > from ? refusal({ ...regiment, [list]: rest } as Regiment, list, unit, total) : "";
  if (why) return why;
  if (total > 0) units[unit] = total;
  else delete units[unit];
  if (list === "u" && regiment.full !== undefined) regiment.full += powerOf({ [unit]: count - from });
  regiment.a = troopsOf(regiment);
  return "";
}

const friendly = (state: number, owner: number) =>
  ["self", "ally", "vassal", "overlord"].includes(standing(state, owner));

/** Why a regiment can't encamp here, or "": only on its own or a friend's ground, with no enemy beside it */
export function encampRefusal(regiment: Regiment): string {
  const at = mainCell(regiment.cell);
  const ground = [at, ...neighbours(at)].map(cell => pack.cells.state[cell]);
  const owner = pack.cells.h[at] < 20 ? ground.find(state => state && friendly(regiment.state, state)) : ground[0];
  if (!owner || !friendly(regiment.state, owner)) return "Encamp on your own or an ally's ground";
  const close = new Set([at, ...neighbours(at)]);
  const enemy = pack.states.some(
    state =>
      state.i &&
      !state.removed &&
      standing(regiment.state, state.i) === "enemy" &&
      (state.military ?? []).some(other => close.has(mainCell(other.cell)))
  );
  return enemy ? "Can't encamp with an enemy beside you" : "";
}

/** Edit one slot row: another unit type (any tier) and how many; refused changes leave it as it was */
export function changeRow(
  regiment: Regiment,
  list: List,
  unit: string,
  count: number,
  next: string,
  nextCount: number
): string {
  if (next === unit) return setRow(regiment, list, unit, count, nextCount);
  const units = (list === "u" ? regiment.u : regiment.cargo) as Units | undefined;
  if (!units) return "";
  const before = { ...units };
  const fullBefore = regiment.full;
  setRow(regiment, list, unit, count, 0);
  const n = Math.max(1, Math.min(Math.round(nextCount), perSlot(next)));
  const why = refusal(regiment, list, next, n);
  if (why) {
    if (list === "u") regiment.u = before;
    else regiment.cargo = before;
    regiment.full = fullBefore;
    regiment.a = troopsOf(regiment);
    return why;
  }
  const into = (list === "u" ? regiment.u : regiment.cargo) as Units;
  into[next] = (into[next] ?? 0) + n;
  if (list === "u" && regiment.full !== undefined) regiment.full += powerOf({ [next]: n });
  regiment.a = troopsOf(regiment);
  return "";
}

/** Hand an army to another nation: it is theirs from now on, remembering where it came from */
export function assign(r: Regiment, to: number): string {
  const from = r.state;
  const target = pack.states[to];
  if (!target?.i || target.removed) return "Choose a nation";
  if (to === from) return "";
  if (r.garrison) return "A garrison stays with its settlement";
  const list = pack.states[from]?.military ?? [];
  list.splice(list.indexOf(r), 1);
  target.military ??= [];
  r.i = target.military.length ? Math.max(...target.military.map(m => m.i)) + 1 : 0;
  r.origin = (r.origin ?? from) === to ? undefined : (r.origin ?? from); // back home: no longer from elsewhere
  r.state = to;
  r.home = undefined;
  target.military.push(r);
  return "";
}
