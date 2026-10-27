// Every change to the forces runs as an order: all of it happens or none of it does, and the last few can be undone
// with Ctrl+Z. An order snapshots what moving units can touch: each nation's regiments and occupied cells, and
// settlements' manpower (troops sent home). Restoring keeps each regiment the same object, so nothing holding one
// goes stale
import type { Regiment } from "@/generators/military-generator";

interface Snapshot {
  label: string;
  states: { refs: Regiment[]; copies: Regiment[]; occupied?: number[] }[];
  manpower: (number | undefined)[];
}

const DEPTH = 20;
const history: Snapshot[] = [];

function snapshot(label: string): Snapshot {
  return {
    label,
    states: pack.states.map(s => ({
      refs: [...(s.military ?? [])],
      copies: structuredClone(s.military ?? []),
      occupied: s.occupied ? [...s.occupied] : undefined
    })),
    manpower: pack.burgs.map(b => b?.manpower)
  };
}

function restore(shot: Snapshot): void {
  shot.states.forEach((saved, i) => {
    const state = pack.states[i];
    if (!state) return;
    state.military = saved.refs.map((regiment, k) => {
      for (const key of Object.keys(regiment)) delete (regiment as unknown as Record<string, unknown>)[key];
      return Object.assign(regiment, structuredClone(saved.copies[k]));
    });
    state.occupied = saved.occupied ? [...saved.occupied] : undefined;
  });
  shot.manpower.forEach((n, i) => {
    const burg = pack.burgs[i];
    if (burg && n !== undefined) burg.manpower = n;
  });
}

/** Run a change; a refusal (a reason) undoes whatever it did. Returns the reason, or "" */
export function order(label: string, change: () => string): string {
  const shot = snapshot(label);
  let why: string;
  try {
    why = change();
  } catch (error) {
    restore(shot);
    throw error;
  }
  if (why) {
    restore(shot);
    return why;
  }
  history.push(shot);
  if (history.length > DEPTH) history.shift();
  return "";
}

/** Try a change and put everything back: what it would say, "" when it would go through */
export function rehearse(change: () => string): string {
  const shot = snapshot("");
  try {
    return change();
  } catch (error) {
    console.error("Fluoria: a rehearsed order failed", error);
    return "That can't be done";
  } finally {
    restore(shot);
  }
}

/** Undo the last order; returns what it was, or null when there is nothing to undo */
export function undoOrder(): string | null {
  const shot = history.pop();
  if (!shot) return null;
  restore(shot);
  return shot.label;
}

export const canUndo = () => history.length > 0;

/** A new or loaded map starts with nothing to undo */
export function forgetOrders(): void {
  history.length = 0;
}
