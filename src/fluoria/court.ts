// The court: a ruler at each capital and a governor at each province seat. A taken seat loses its governor; a taken
// capital fells the ruler and the nation gives up all its land to the taker
import type { Burg } from "@/generators/burgs-generator";
import { funds, isCapital, spend } from "./settlements";

export const APPOINT_PRICE = 200;

const personName = (cell: number) => {
  try {
    return Names.getCulture(pack.cells.culture[cell] || 1, 4, 8, "");
  } catch {
    return "Aldric";
  }
};

/** The province this settlement is the seat of, or 0 */
export function seatOf(burg: Burg): number {
  return pack.provinces.find(p => p?.i && !p.removed && p.burg === burg.i)?.i ?? 0;
}

/** The nation's ruler, named on first ask; null once fallen */
export function rulerOf(state: number): string | null {
  const s = pack.states[state];
  if (!s?.i || s.removed) return null;
  if (s.ruler === undefined) s.ruler = `Lord ${personName(pack.burgs[s.capital]?.cell ?? s.center)}`;
  return s.ruler;
}

/** The province's governor, named on first ask; null while the seat is vacant */
export function governorOf(province: number): string | null {
  const p = pack.provinces[province];
  if (!p?.i || p.removed) return null;
  if (p.governor === undefined) p.governor = `${personName(p.center)} of ${pack.burgs[p.burg]?.name ?? p.name}`;
  return p.governor;
}

export function vacate(province: number): void {
  const p = pack.provinces[province];
  if (p?.i) p.governor = null;
}

/** A new governor for a vacant seat, paid from the seat's treasury; "" or why not */
export function appoint(province: number): string {
  const p = pack.provinces[province];
  const burg = p ? pack.burgs[p.burg] : null;
  if (!p?.i || !burg?.i) return "No seat";
  if (governorOf(province)) return "The seat has a governor";
  if (funds(burg) < APPOINT_PRICE) return "Not enough money";
  spend(burg, APPOINT_PRICE);
  p.governor = `${personName(p.center)} of ${burg.name}`;
  return "";
}

/** Why a settlement's court stops it raising troops, or "" */
export function courtRefusal(burg: Burg): string {
  if (isCapital(burg)) return rulerOf(burg.state ?? 0) ? "" : "The ruler has fallen";
  const seat = seatOf(burg);
  return seat && !governorOf(seat) ? "No governor in the seat" : "";
}

/** The capital in this cell, if any: the state whose ruler sits there */
export function capitalAt(cell: number): number {
  const b = pack.burgs[pack.cells.burg[cell]];
  return b?.i && !b.removed && isCapital(b) ? (b.state ?? 0) : 0;
}

/** A ruler falls: the nation's land all goes to the taker, held as occupied ground */
export function fell(state: number, taker: number, occupy: (state: number, cell: number) => void): void {
  const s = pack.states[state];
  if (!s?.i) return;
  s.ruler = null;
  for (const p of s.provinces ?? []) vacate(p);
  for (let i = 0; i < pack.cells.i.length; i++)
    if (pack.cells.state[i] === state && pack.cells.h[i] >= 20) occupy(taker, i);
}
