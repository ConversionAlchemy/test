// Armies, fleets, air groups and transports as Azgaar regiments, measured in slots. Units stay Azgaar's counts by
// type (`u`); a transport carries land units in `cargo`; `full` is the power the regiment had when last whole
import type { Regiment } from "@/generators/military-generator";
import type { MilitaryUnit } from "@/types/Military";
import { type Domain, type KitUnit, kitUnit, kitUnits, SLOT_SIZE, slotSize } from "./kit";

export const MAX_SLOTS = 12;
export const CARGO_SLOTS = [0, 4, 8, 12];

export type Units = Record<string, number>;

const unitType = (name: string): MilitaryUnit | undefined => options.map.military.units.find(u => u.name === name);
export const kitOf = (name: string): KitUnit | undefined => kitUnit(unitType(name)?.fl);

export function domainOfUnit(name: string): Domain {
  const kit = kitOf(name);
  if (kit) return kit.domain;
  const type = unitType(name)?.type;
  return type === "naval" ? "naval" : type === "aviation" ? "air" : "land";
}

export function perSlot(name: string): number {
  const kit = kitOf(name);
  return unitType(name)?.slot ?? (kit ? slotSize(kit) : (SLOT_SIZE.infantry ?? 500));
}

const present = (units: Units | undefined) => Object.entries(units ?? {}).filter(([, n]) => n > 0);

export function domainOf(regiment: Pick<Regiment, "u" | "n">): Domain {
  const first = present(regiment.u)[0];
  return first ? domainOfUnit(first[0]) : regiment.n ? "naval" : "land";
}

export const transportUnit = (regiment: Pick<Regiment, "u">) =>
  present(regiment.u).find(([name]) => kitOf(name)?.role === "transport")?.[0];
export const isTransport = (regiment: Pick<Regiment, "u">) => transportUnit(regiment) !== undefined;

export const slotsOf = (units: Units | undefined) =>
  present(units).reduce((sum, [name, n]) => sum + Math.ceil(n / perSlot(name)), 0);

/** One row per slot: full slots, then what is left */
export function rows(units: Units | undefined): { unit: string; count: number }[] {
  const out: { unit: string; count: number }[] = [];
  for (const [unit, n] of present(units)) {
    const size = perSlot(unit);
    for (let left = n; left > 0; left -= size) out.push({ unit, count: Math.min(size, left) });
  }
  return out;
}

export function cargoSlots(regiment: Pick<Regiment, "u">): number {
  const name = transportUnit(regiment);
  return name ? (CARGO_SLOTS[kitOf(name)?.tier ?? 1] ?? 4) : 0;
}

/** Slots a regiment's own list may hold: 12, or one transport */
export const capacityOf = (regiment: Pick<Regiment, "u">) => (isTransport(regiment) ? 1 : MAX_SLOTS);

const adjuster = () => Math.max((options.map.units.population.scale ?? 1000) / 10, 10);

/** Azgaar's battle power, before the phase factors: count × unit power, over the population adjuster */
export const powerOf = (units: Units | undefined) =>
  present(units).reduce((sum, [name, n]) => sum + n * (unitType(name)?.power ?? 1), 0) / adjuster();

export const cardPower = (regiment: Pick<Regiment, "u">) => {
  const power = powerOf(regiment.u);
  return power > 0 ? Math.max(1, Math.round(power)) : 0;
};

/** Share of full strength left, 0–1 */
export function strength(regiment: Pick<Regiment, "u" | "full">): number {
  const power = powerOf(regiment.u);
  if (!regiment.full || regiment.full <= power) return 1;
  return Math.max(0, power / regiment.full);
}

/** The unit a card shows: the transport, else the highest tier, then the most slots */
export function flagship(regiment: Pick<Regiment, "u">): string | undefined {
  const transport = transportUnit(regiment);
  if (transport) return transport;
  let best: [string, number] | undefined;
  for (const [name, n] of present(regiment.u)) {
    const score = (kitOf(name)?.tier ?? 1) * 1000 + Math.ceil(n / perSlot(name));
    if (!best || score > best[1]) best = [name, score];
  }
  return best?.[0];
}

export const troopsOf = (regiment: Pick<Regiment, "u">) => present(regiment.u).reduce((sum, [, n]) => sum + n, 0);

/** A regiment of more than one slot, or a transport: a full card; one slot on its own is pale */
export const isGroup = (regiment: Pick<Regiment, "u" | "cargo">) => slotsOf(regiment.u) > 1 || isTransport(regiment);

// --- moving troops between regiments, keeping each one's strength

const add = (units: Units, unit: string, n: number) => {
  units[unit] = (units[unit] ?? 0) + n;
};
const take = (units: Units, unit: string, n: number) => {
  units[unit] = (units[unit] ?? 0) - n;
  if (units[unit] <= 0) delete units[unit];
};

function settle(regiment: Regiment): void {
  regiment.a = troopsOf(regiment);
  regiment.n = domainOf(regiment) === "naval" ? 1 : 0;
}

/** Full-strength power that travels with `n` of a unit: their power at the strength of the regiment they leave */
const fullShare = (from: Regiment, unit: string, n: number) => powerOf({ [unit]: n }) / (strength(from) || 1);

export type List = "u" | "cargo";

/** Why `n` of `unit` can't go into a regiment's list, or "" */
export function refusal(to: Regiment, list: List, unit: string, n: number): string {
  const domain = domainOfUnit(unit);
  if (list === "cargo") {
    if (!isTransport(to)) return "Only a transport carries cargo";
    if (domain !== "land") return "Only land units can be cargo";
    const after = { ...to.cargo };
    add(after, unit, n);
    const room = cargoSlots(to);
    return slotsOf(after) > room ? `Won't fit: needs ${slotsOf(after)} of ${room} slots` : "";
  }
  if (isTransport(to)) return "A transport carries land units as cargo";
  if (kitOf(unit)?.role === "transport" && troopsOf(to)) return "A transport stands alone";
  if (troopsOf(to) && domain !== domainOf(to)) return `${capitalise(domain)} units can't join a ${domainOf(to)} group`;
  const after = { ...to.u };
  add(after, unit, n);
  return slotsOf(after) > MAX_SLOTS ? `Won't fit: ${slotsOf(after)} slots, the cap is ${MAX_SLOTS}` : "";
}

const capitalise = (text: string) => text[0].toUpperCase() + text.slice(1);

/** Move troops between two regiments' lists; returns why not, or "" */
export function shift(from: Regiment, fromList: List, unit: string, n: number, to: Regiment, toList: List): string {
  if (from === to && fromList === toList) return "";
  const have = (fromList === "u" ? from.u : from.cargo)?.[unit] ?? 0;
  const count = Math.min(n, have);
  if (count <= 0) return "Nothing to move";
  const why = refusal(to, toList, unit, count);
  if (why) return why;
  const share = fromList === "u" ? fullShare(from, unit, count) : powerOf({ [unit]: count });
  const fromFull = from.full ?? powerOf(from.u);
  const toFull = to.full ?? powerOf(to.u);
  if (fromList === "u") take(from.u, unit, count);
  else if (from.cargo) take(from.cargo, unit, count);
  if (toList === "u") add(to.u, unit, count);
  else {
    to.cargo ??= {};
    add(to.cargo, unit, count);
  }
  if (fromList === "u") from.full = Math.max(0, fromFull - share);
  if (toList === "u") to.full = toFull + share;
  settle(from);
  settle(to);
  return "";
}

/** Why `from` can't merge into `into`, or "" */
export function mergeRefusal(from: Regiment, into: Regiment): string {
  if (from === into) return "A group can't merge with itself";
  if (from.state !== into.state) return "Only a nation's own groups merge";
  if (isTransport(from) || isTransport(into)) return "Transports don't merge: load the army instead";
  if (troopsOf(from) && troopsOf(into) && domainOf(from) !== domainOf(into))
    return `A ${domainOf(from)} group can't merge with a ${domainOf(into)} group`;
  const after = { ...into.u };
  for (const [unit, n] of present(from.u)) add(after, unit, n);
  return slotsOf(after) > MAX_SLOTS ? `Too big: ${slotsOf(after)} slots, the cap is ${MAX_SLOTS}` : "";
}

/** Move everything from one regiment into another; the emptied one is for the caller to remove */
export function mergeInto(from: Regiment, into: Regiment): string {
  const why = mergeRefusal(from, into);
  if (why) return why;
  into.full = (into.full ?? powerOf(into.u)) + (from.full ?? powerOf(from.u));
  for (const [unit, n] of present(from.u)) add(into.u, unit, n);
  from.u = {};
  settle(from);
  settle(into);
  return "";
}

/** Encamping restores the bar: full strength becomes what is left */
export function encamp(regiment: Regiment): void {
  regiment.full = powerOf(regiment.u);
}

// --- one-time conversion of Azgaar's unit types, and keeping every map within the rules

const RENAMED: Record<string, string> = {
  militia: "land_infantry_t1",
  guard: "land_infantry_t2",
  elite: "land_infantry_t3",
  defences: "land_infantry_t1",
  navy: "naval_combat_t1",
  fleet: "naval_combat_t1",
  "air-fleet": "air_combat_t1",
  dreadnought: "air_combat_t3"
};
const BY_TYPE: Record<string, string> = {
  melee: "land_assault_t1",
  ranged: "land_infantry_t2",
  mounted: "land_cavalry_t1",
  machinery: "land_armour_t1",
  armored: "land_armour_t1",
  naval: "naval_combat_t1",
  aviation: "air_combat_t1"
};

/** Old Azgaar unit types become kit types, troops and all. Returns whether anything changed */
export function convertUnitTypes(glyph: (emoji: string) => string): boolean {
  const old = options.map.military.units;
  if (old.length && old.every(u => kitUnit(u.fl))) return false;
  const kit = kitUnits(glyph);
  const nameOf = (id: string) => kit.find(u => u.fl === id)?.name ?? kit[0].name;
  const target = new Map<string, string>();
  for (const unit of old)
    target.set(
      unit.name,
      unit.fl && kitUnit(unit.fl)
        ? nameOf(unit.fl)
        : nameOf(RENAMED[unit.name.toLowerCase()] ?? BY_TYPE[unit.type] ?? "land_infantry_t1")
    );
  const convert = (units: Units | undefined) => {
    const out: Units = {};
    for (const [name, n] of present(units)) add(out, target.get(name) ?? nameOf("land_infantry_t1"), Math.round(n));
    return out;
  };
  options.map.military.units = kit;
  for (const state of pack.states ?? [])
    for (const regiment of state?.military ?? []) {
      regiment.u = convert(regiment.u);
      if (regiment.cargo) regiment.cargo = convert(regiment.cargo);
      regiment.a = troopsOf(regiment);
    }
  return true;
}

const ROMAN = ["", "", " II", " III", " IV", " V", " VI", " VII", " VIII", " IX", " X"];

/**
 * Every regiment within the rules: one domain, a transport on its own, at most 12 slots, a full strength.
 * New regiments are made through `raise`, which returns the new one. Returns how many were split off
 */
export function normalise(raise: (like: Regiment, units: Units, name: string) => Regiment): number {
  let added = 0;
  for (const state of pack.states ?? []) {
    if (!state?.i || state.removed) continue;
    for (const regiment of [...(state.military ?? [])]) {
      if (regiment.carrier) {
        regiment.carrier = undefined; // the old boarding: troops step ashore where their fleet is
        regiment.hidden = false;
      }
      const parts = partsOf(regiment.u);
      const base = regiment.name.replace(/ (II|III|IV|V|VI|VII|VIII|IX|X)$/, "");
      const power = powerOf(regiment.u);
      const strengthLeft = regiment.full && regiment.full > power ? power / regiment.full : 1;
      regiment.u = parts[0] ?? {};
      regiment.full = powerOf(regiment.u) / strengthLeft;
      settle(regiment);
      parts.slice(1).forEach((units, k) => {
        const made = raise(regiment, units, `${base}${ROMAN[k + 2] ?? ` ${k + 2}`}`);
        made.full = powerOf(units) / strengthLeft;
        settle(made);
        added++;
      });
    }
  }
  return added;
}

/** Split units into groups that each obey the rules */
function partsOf(units: Units): Units[] {
  const parts: Units[] = [];
  const byDomain = new Map<Domain, Units>();
  for (const [name, n] of present(units)) {
    if (kitOf(name)?.role === "transport") {
      for (let k = 0; k < n; k++) parts.push({ [name]: 1 });
      continue;
    }
    const domain = domainOfUnit(name);
    const list = byDomain.get(domain) ?? {};
    list[name] = n;
    byDomain.set(domain, list);
  }
  const grouped: Units[] = [];
  for (const list of byDomain.values()) {
    let current: Units = {};
    for (const row of rows(list)) {
      if (slotsOf(current) >= MAX_SLOTS) {
        grouped.push(current);
        current = {};
      }
      add(current, row.unit, row.count);
    }
    if (present(current).length) grouped.push(current);
  }
  return [...grouped, ...parts];
}

// --- base names: "1st Army", "2nd Fleet", "1st Air Wing", "3rd Riflemen", "1st Troopship"

const ORDINAL = (n: number) => {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
  return `${n}${suffix}`;
};

/** What a regiment is called by kind: its transport or single unit by name, else Army, Fleet or Air Wing */
export function kindOf(regiment: Pick<Regiment, "u" | "n">): string {
  const transport = transportUnit(regiment);
  if (transport) return transport;
  const units = present(regiment.u);
  if (units.length === 1 && slotsOf(regiment.u) === 1) return units[0][0];
  const domain = domainOf(regiment);
  return domain === "naval" ? "Fleet" : domain === "air" ? "Air Wing" : "Army";
}

/** Every regiment not named by the user gets its base name, numbered from the lowest free number of its kind */
export function refreshNames(): number {
  let changed = 0;
  const pattern = /^(\d+)(?:st|nd|rd|th) (.+)$/;
  for (const state of pack.states ?? []) {
    if (!state?.i || state.removed) continue;
    const taken = new Map<string, Set<number>>();
    const keep = new Set<Regiment>();
    const take = (kind: string, n: number) => taken.set(kind, (taken.get(kind) ?? new Set()).add(n));
    for (const r of state.military ?? []) {
      const match = r.name.match(pattern);
      if (!match) continue;
      const [n, kind] = [Number(match[1]), match[2]];
      if (r.named) take(kind, n);
      else if (kind === kindOf(r) && !taken.get(kind)?.has(n) && r.name === `${ORDINAL(n)} ${kind}`) {
        take(kind, n);
        keep.add(r);
      }
    }
    for (const r of state.military ?? []) {
      if (r.named || keep.has(r)) continue;
      const kind = kindOf(r);
      let n = 1;
      while (taken.get(kind)?.has(n)) n++;
      take(kind, n);
      r.name = `${ORDINAL(n)} ${kind}`;
      changed++;
    }
  }
  return changed;
}
