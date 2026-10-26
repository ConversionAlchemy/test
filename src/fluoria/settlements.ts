// Settlements as Fluoria uses them: a garrison kept off the map, one class that sets what it raises, money and
// manpower. A garrison is a hidden regiment tied to its settlement
import type { Burg } from "@/generators/burgs-generator";
import type { Regiment } from "@/generators/military-generator";
import { raise } from "./forces/army";
import { domainOfUnit, isTransport, kitOf, rows, slotsOf, troopsOf, type Units } from "./forces/forces";
import { KIT, type KitUnit, slotSize } from "./forces/kit";
import { cellCentre, mainCell, neighbours } from "./one-grid";
import {
  garrisonSlots,
  MANPOWER_LEVEL,
  MAX_TIER,
  RANKS,
  type Rank,
  rankOf,
  resizeCost,
  sizeOf
} from "./settlement-size";
import { hasRoom, placeOf } from "./war";

export type SettlementClass = "barracks" | "armoury" | "harbour" | "airbase" | "market";

interface ClassInfo {
  name: string;
  cost: number;
  unlocks: string;
}

export const CLASSES: Record<SettlementClass, ClassInfo> = {
  barracks: { name: "Barracks", cost: 250, unlocks: "Infantry, Assault, Cavalry" },
  armoury: { name: "Armoury", cost: 450, unlocks: "Armour" },
  harbour: { name: "Harbour", cost: 500, unlocks: "Ships" },
  airbase: { name: "Airbase", cost: 800, unlocks: "Airships" },
  market: { name: "Market", cost: 150, unlocks: "Trade" }
};
export const CLASS_ORDER: SettlementClass[] = ["barracks", "armoury", "harbour", "airbase", "market"];

/** Price of one chip by tier: elites cost far more than their numbers suggest */
const SLOT_PRICE: Record<string, [number, number, number]> = {
  "land:infantry": [20, 60, 150],
  "land:assault": [30, 80, 200],
  "land:cavalry": [30, 80, 200],
  "land:armour": [60, 160, 400],
  "naval:trade": [30, 80, 200],
  "naval:scout": [40, 100, 250],
  "naval:combat": [80, 200, 500],
  "naval:transport": [40, 100, 250],
  "air:trade": [40, 100, 250],
  "air:scout": [50, 130, 300],
  "air:combat": [100, 250, 600],
  "air:bomber": [120, 300, 700],
  "air:transport": [50, 120, 300]
};

const living = (burgId: number) => {
  const burg = pack.burgs[burgId];
  return burg?.i && !burg.removed ? burg : null;
};

export const perSlot = (kit: KitUnit) => slotSize(kit);
export const unitName = (kit: KitUnit) => options.map.military.units.find(u => u.fl === kit.id)?.name ?? kit.name;

// --- class: one per settlement, town or larger; changing it costs the new one's price, half the old one's back

export const classOf = (burg: Burg): SettlementClass | null => burg.flClass ?? null;

const coastal = (burg: Burg) => (pack.cells.haven?.[burg.cell] ?? 0) > 0 && pack.cells.t[burg.cell] === 1;

/** Why a settlement can't take a class, or "" */
export function classRefusal(burg: Burg, c: SettlementClass | null): string {
  if (classOf(burg) === c) return "";
  if (c && !sizeOf(burg)) return "Grow it into a town first";
  if (c === "harbour" && !coastal(burg)) return "Coastal Only";
  const cost = c ? CLASSES[c].cost : 0;
  const back = burg.flClass ? Math.round(CLASSES[burg.flClass].cost / 2) : 0;
  if (funds(burg) + back < cost) return `Needs §${cost}`;
  return "";
}

/** Give a settlement a class (or none) */
export function setClass(burg: Burg, c: SettlementClass | null): string {
  const why = classRefusal(burg, c);
  if (why || classOf(burg) === c) return why;
  if (burg.flClass) receive(burg, Math.round(CLASSES[burg.flClass].cost / 2));
  if (c) spend(burg, CLASSES[c].cost);
  if (c) burg.flClass = c;
  else delete burg.flClass;
  if (c === "harbour") {
    const haven = pack.cells.haven?.[burg.cell];
    if (haven && !burg.port) burg.port = pack.cells.f[haven];
  }
  return "";
}

/** Older maps: the class their old buildings point to, and their size made explicit; once */
function fitClass(burg: Burg): void {
  if (!burg.flSize) burg.flSize = rankOf(burg);
  if (burg.flClass !== undefined || !sizeOf(burg)) return;
  const c: SettlementClass | null = burg.shanty
    ? "airbase"
    : burg.temple
      ? "armoury"
      : burg.citadel
        ? "barracks"
        : burg.port
          ? "harbour"
          : burg.plaza
            ? "market"
            : null;
  if (c) burg.flClass = c;
}

// --- size: growing costs money and, the first time, tops up manpower; shrinking gives half back

/** Why a settlement can't be resized, or "" */
export function resizeRefusal(burg: Burg, to: Rank): string {
  const from = rankOf(burg);
  if (from === to) return "";
  if (isCapital(burg) && to !== "citadel") return "Move the capital first";
  const cost = resizeCost(from, to);
  if (cost > 0 && funds(burg) < cost) return `Needs §${cost}`;
  return "";
}

/** The manpower a resize would add: only the first time a settlement reaches a size */
export function manpowerGain(burg: Burg, to: Rank): number {
  const index = RANKS.indexOf(to);
  if (index <= (burg.flReached ?? RANKS.indexOf(rankOf(burg)))) return 0;
  return Math.max(0, MANPOWER_LEVEL[to] - manpowerOf(burg));
}

/** Resize a settlement; a village gives up its class (half its price back) */
export function resizeTo(burg: Burg, to: Rank): string {
  const why = resizeRefusal(burg, to);
  if (why) return why;
  const from = rankOf(burg);
  if (from === to) return "";
  const cost = resizeCost(from, to);
  const gain = manpowerGain(burg, to);
  if (cost > 0) spend(burg, cost);
  else receive(burg, -cost);
  burg.manpower = manpowerOf(burg) + gain;
  burg.flReached = Math.max(burg.flReached ?? 0, RANKS.indexOf(to));
  burg.flSize = to;
  const groups = options.map.burgs.groups.filter(g => !g.removed).map(g => g.name);
  const group = to === "citadel" ? "city" : to;
  if (!burg.capital && groups.includes(group)) Burgs.setGroup(burg.i, group);
  if (to === "village" && burg.flClass) {
    receive(burg, Math.round(CLASSES[burg.flClass].cost / 2));
    delete burg.flClass;
  }
  return "";
}

// --- manpower: the people a settlement raises troops from

export const manpowerOf = (burg: Burg) => Math.max(0, Math.round(burg.manpower ?? MANPOWER_LEVEL[rankOf(burg)]));

/** Once on load: every settlement gets its size's manpower and keeps a note of the size it has reached */
export function seedManpower(): void {
  for (const burg of pack.burgs ?? []) {
    if (!burg?.i || burg.removed) continue;
    fitClass(burg);
    if (burg.manpower === undefined) burg.manpower = MANPOWER_LEVEL[rankOf(burg)];
    if (burg.flReached === undefined) burg.flReached = RANKS.indexOf(rankOf(burg));
  }
}

/** Men from one settlement to another of the same nation, free */
export function moveManpower(from: Burg, to: Burg, men: number): string {
  const n = Math.round(men);
  if (n <= 0) return "";
  if (from.i === to.i) return "Choose another settlement";
  if (manpowerOf(from) < n) return "Not enough manpower";
  from.manpower = manpowerOf(from) - n;
  to.manpower = manpowerOf(to) + n;
  return "";
}

/** Mercenaries from the Goldbank, paid from the settlement's money */
export const MERCENARY_PRICE = 2;
export function hireMercenaries(burg: Burg, men: number): string {
  const n = Math.round(men);
  if (n <= 0) return "";
  if (funds(burg) < n * MERCENARY_PRICE) return `Needs §${n * MERCENARY_PRICE}`;
  spend(burg, n * MERCENARY_PRICE);
  burg.manpower = manpowerOf(burg) + n;
  return "";
}

/** Let men go: they leave the settlement */
export function releaseManpower(burg: Burg, men: number): void {
  burg.manpower = Math.max(0, manpowerOf(burg) - Math.round(men));
}

// --- the Goldbank: lends to any nation from what it has left

export const BANK_CAPITAL = 100000;
export const bankFunds = () =>
  BANK_CAPITAL - (pack.states ?? []).reduce((sum, s) => sum + (s.i && !s.removed ? (s.loan ?? 0) : 0), 0);

/** Borrow (positive) or repay (negative) through a settlement: the money comes to or goes from it */
export function borrow(burg: Burg, amount: number): string {
  const state = pack.states[burg.state ?? 0];
  if (!state?.i) return "Only a nation borrows";
  const n = Math.round(amount);
  if (n > 0 && bankFunds() < n) return "The Goldbank hasn't that much";
  if (n < 0 && (state.loan ?? 0) < -n) return "Nothing more to repay";
  if (n < 0 && funds(burg) < -n) return "Not enough funds";
  state.loan = (state.loan ?? 0) + n;
  if (n > 0) receive(burg, n);
  else spend(burg, -n);
  return "";
}

// --- money: a capital's money is its nation's treasury; other settlements keep their own

export const isCapital = (burg: Burg) => Boolean(burg.capital && pack.states[burg.state ?? 0]?.capital === burg.i);

/** What a settlement can spend; at the capital, the nation's treasury */
export function funds(burg: Burg): number {
  const own = Math.max(0, burg.treasury ?? 0);
  return isCapital(burg) ? own + Math.max(0, pack.states[burg.state ?? 0]?.treasury ?? 0) : own;
}

/** A nation's treasury, as one figure: what its capital holds */
export function nationMoney(stateId: number): number {
  const state = pack.states[stateId];
  const capital = state ? pack.burgs[state.capital] : undefined;
  return capital?.i && !capital.removed ? funds(capital) : Math.max(0, state?.treasury ?? 0);
}

export function setNationMoney(stateId: number, amount: number): void {
  const state = pack.states[stateId];
  if (!state) return;
  const capital = pack.burgs[state.capital];
  if (capital?.i) capital.treasury = 0;
  state.treasury = Math.max(0, Math.round(amount));
}

function spend(burg: Burg, amount: number): void {
  const state = pack.states[burg.state ?? 0];
  let left = amount;
  if (isCapital(burg) && state) {
    const fromNation = Math.min(left, Math.max(0, state.treasury ?? 0));
    state.treasury = Math.round((state.treasury - fromNation) * 100) / 100;
    left -= fromNation;
  }
  burg.treasury = Math.round(((burg.treasury ?? 0) - left) * 100) / 100;
}

function receive(burg: Burg, amount: number): void {
  const state = pack.states[burg.state ?? 0];
  if (isCapital(burg) && state) state.treasury = (state.treasury ?? 0) + amount;
  else burg.treasury = (burg.treasury ?? 0) + amount;
}

/** A nation's capital, if it stands */
export const capitalOf = (stateId: number): Burg | null => living(pack.states[stateId]?.capital ?? 0);

/** Money from one settlement to another; to a capital it joins that nation's treasury */
export function transfer(from: Burg, to: Burg, amount: number): string {
  const sum = Math.round(amount);
  if (!sum || sum < 1) return "Enter an amount";
  if (from.i === to.i) return "Choose another settlement";
  if (funds(from) < sum) return "Not enough funds";
  spend(from, sum);
  receive(to, sum);
  return "";
}

/** Move money from the nation's treasury to a settlement */
export function sendFunds(burg: Burg, amount: number): string {
  const capital = pack.burgs[pack.states[burg.state ?? 0]?.capital ?? 0];
  if (!capital?.i) return "The nation has no capital";
  return transfer(capital, burg, amount);
}

/** Once on load: a capital's own purse joins its nation's treasury, so there is one figure */
export function foldCapitalPurses(): void {
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    const capital = pack.burgs[state.capital];
    if (!capital?.i || !capital.treasury) continue;
    state.treasury = (state.treasury ?? 0) + capital.treasury;
    capital.treasury = 0;
  }
}

// --- people

const crewOf = (unit: string) => options.map.military.units.find(u => u.name === unit)?.crew ?? 1;
export const peopleFor = (unit: string, count: number) => Math.round(count * crewOf(unit));

function takePeople(burg: Burg, people: number): void {
  burg.manpower = Math.max(0, manpowerOf(burg) - people);
}

/** Troops released go home: to the settlement they were raised in, else the nation's capital */
export function sendHome(regiment: Regiment, units: Units = regiment.u): void {
  const home = living(regiment.home ?? regiment.garrison ?? 0) ?? living(pack.states[regiment.state]?.capital ?? 0);
  if (!home) return;
  const people = Object.entries(units).reduce((sum, [unit, n]) => sum + peopleFor(unit, n), 0);
  home.manpower = manpowerOf(home) + people;
}

// --- the garrison

export function garrisonOf(burg: Burg): Regiment | undefined {
  return pack.states[burg.state ?? 0]?.military?.find(r => r.garrison === burg.i);
}

export function ensureGarrison(burg: Burg): Regiment | null {
  if (!sizeOf(burg) || !burg.state) return null;
  const existing = garrisonOf(burg);
  if (existing) return existing;
  const made = raise(burg.state, burg.cell, {}, `${burg.name} Garrison`);
  made.garrison = burg.i;
  made.home = burg.i;
  made.hidden = true;
  made.named = true;
  made.n = 0;
  made.x = burg.x;
  made.y = burg.y;
  return made;
}

/** Whether a settlement's class raises a unit, at any tier */
const raises = (burg: Burg, k: KitUnit) => {
  switch (classOf(burg)) {
    case "barracks":
      return k.domain === "land" && k.role !== "armour";
    case "armoury":
      return k.domain === "land" && k.role === "armour";
    case "harbour":
      return k.domain === "naval";
    case "airbase":
      return k.domain === "air";
    default:
      return false;
  }
};

const HOMEGUARD = "land_infantry_t1";

/** Units a settlement may raise: its class's, up to its size's tier; Homeguard anywhere with manpower */
export function recruitable(burg: Burg): KitUnit[] {
  const size = sizeOf(burg);
  const top = size ? MAX_TIER[size] : 0;
  return KIT.filter(k => (k.tier <= top && raises(burg, k)) || k.id === HOMEGUARD);
}

/** The category a unit is listed under */
export function categoryOf(k: KitUnit): string {
  if (k.domain === "naval") return "Ships";
  if (k.domain === "air") return "Airships";
  const land: Record<string, string> = {
    infantry: "Infantry",
    assault: "Assault",
    cavalry: "Cavalry",
    armour: "Armour"
  };
  return land[k.role] ?? "Land";
}

/** The same unit one tier up, if there is one */
export const nextTier = (k: KitUnit) =>
  KIT.find(x => x.domain === k.domain && x.role === k.role && x.tier === k.tier + 1);

export function upgradeCost(k: KitUnit, count: number): number {
  const next = nextTier(k);
  return next ? Math.max(0, priceOf(next, count) - priceOf(k, count)) : 0;
}

/** Why `count` of a unit can't be upgraded at a settlement, or "" */
export function upgradeRefusal(burg: Burg, k: KitUnit, count: number): string {
  const next = nextTier(k);
  const size = sizeOf(burg);
  if (!next) return "Already the highest tier";
  if (!size) return "Upgrade in a town, city or citadel";
  if (next.tier > MAX_TIER[size]) return next.tier === 3 ? "Tier 3 needs a citadel" : "Tier 2 needs a city";
  if (!raises(burg, next)) return "Its class doesn't raise that";
  if (funds(burg) < upgradeCost(k, count)) return `Needs §${upgradeCost(k, count)}`;
  return "";
}

/** Upgrade one row of a regiment by a tier, paid for by the settlement it stands in */
export function upgrade(burg: Burg, r: Regiment, unit: string, count: number): string {
  const k = KIT.find(x => unitName(x) === unit);
  if (!k) return "Unknown unit";
  const why = upgradeRefusal(burg, k, count);
  if (why) return why;
  const next = nextTier(k)!;
  spend(burg, upgradeCost(k, count));
  const name = unitName(next);
  const n = Math.min(count, r.u[unit] ?? 0);
  r.u[unit] -= n;
  if (r.u[unit] <= 0) delete r.u[unit];
  r.u[name] = (r.u[name] ?? 0) + n;
  r.a = troopsOf(r);
  r.full = undefined;
  return "";
}

export function priceOf(kit: KitUnit, count: number): number {
  const per = SLOT_PRICE[`${kit.domain}:${kit.role}`]?.[kit.tier - 1] ?? 50;
  return Math.ceil((per * count) / perSlot(kit));
}

/** The most of a unit this settlement can raise now: its slots, manpower and money */
export function recruitLimit(burg: Burg, kit: KitUnit): number {
  const name = unitName(kit);
  const free = (garrisonable(name) && sizeOf(burg) ? room(burg) : mapRoom(burg, kit)) * perSlot(kit);
  const byPeople = Math.floor(manpowerOf(burg) / Math.max(1, crewOf(name)));
  const per = priceOf(kit, perSlot(kit)) / perSlot(kit);
  const byMoney = per > 0 ? Math.floor(funds(burg) / per) : free;
  return Math.max(0, Math.min(free, byPeople, byMoney));
}

/** Raise `count` of a unit into the garrison: people from the settlement, money from its treasury */
export function recruit(burg: Burg, kit: KitUnit, count: number): string {
  if (!recruitable(burg).includes(kit)) return "This settlement can't raise that unit";
  const n = Math.round(count);
  if (n <= 0) return "Enter an amount";
  if (n > recruitLimit(burg, kit)) return "Not enough room, manpower or money";
  const name = unitName(kit);
  if (!garrisonable(name) || !sizeOf(burg)) {
    // only infantry garrisons: anything else stands on the map at the settlement
    const made = standAt(burg, { [name]: n });
    if (typeof made === "string") return made;
    takePeople(burg, peopleFor(name, n));
    spend(burg, priceOf(kit, n));
    return "";
  }
  const garrison = ensureGarrison(burg);
  if (!garrison) return "No garrison here";
  takePeople(burg, peopleFor(name, n));
  spend(burg, priceOf(kit, n));
  garrison.u[name] = (garrison.u[name] ?? 0) + n;
  garrison.a = troopsOf(garrison);
  garrison.full = undefined;
  return "";
}

/** Older maps: lone units in or beside a town of their own nation go into its garrison, once */
export function garrisonLoners(): number {
  if (pack.states.some(s => s.military?.some(r => r.garrison))) return 0; // done before
  let moved = 0;
  const towns = pack.burgs.filter(b => b?.i && !b.removed && b.state && sizeOf(b));
  const near = new Map<number, Burg[]>();
  for (const burg of towns)
    for (const cell of [mainCell(burg.cell), ...neighbours(mainCell(burg.cell))])
      near.set(cell, [...(near.get(cell) ?? []), burg]);
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    for (const r of [...(state.military ?? [])]) {
      if (r.hidden || r.garrison || slotsOf(r.u) > 1 || (isTransport(r) && slotsOf(r.cargo))) continue;
      const unit = Object.keys(r.u).find(u => r.u[u] > 0);
      if (!unit || !garrisonable(unit)) continue;
      const sea = domainOfUnit(unit) === "naval";
      const burg = (near.get(mainCell(r.cell)) ?? []).find(
        b => b.state === r.state && (!sea || b.port) && room(b) >= slotsOf(r.u)
      );
      if (!burg) continue;
      const garrison = ensureGarrison(burg);
      if (!garrison) continue;
      for (const [u, n] of Object.entries(r.u)) garrison.u[u] = (garrison.u[u] ?? 0) + n;
      garrison.a = troopsOf(garrison);
      Military.remove(r.state, r.i);
      moved++;
    }
  }
  return moved;
}

const room = (burg: Burg) => garrisonSlots(burg.i) - slotsOf(garrisonOf(burg)?.u);

/** Only infantry is kept inside a settlement; everything else stands on the map */
export const garrisonable = (unit: string) => kitOf(unit)?.role === "infantry";

/** Where a settlement's units stand on the map: its centre, or for ships halfway to its harbour water */
function standPoint(burg: Burg, naval: boolean): [number, number] {
  const haven = pack.cells.haven?.[burg.cell];
  if (!naval || !haven) return [burg.x, burg.y];
  const [x, y] = cellCentre(haven);
  return [(burg.x + x) / 2, (burg.y + y) / 2];
}

/** Chips free on the map where a settlement's new units of this kind would stand */
function mapRoom(burg: Burg, kit: KitUnit): number {
  const naval = kit.domain === "naval";
  if (naval && !burg.port) return 0;
  const [x, y] = standPoint(burg, naval);
  const at = placeOf({ n: naval ? 1 : 0, cell: burg.cell, x, y });
  let free = 0;
  while (free < 4 && hasRoom(burg.state ?? 0, at, free + 1)) free++;
  return free;
}

/** Units standing on the map at a settlement, one chip each */
export function standAt(burg: Burg, units: Units): Regiment | string {
  const [first] = Object.keys(units);
  const naval = domainOfUnit(first) === "naval";
  if (naval && !burg.port) return "Ships need a harbour";
  const [x, y] = standPoint(burg, naval);
  const at = placeOf({ n: naval ? 1 : 0, cell: burg.cell, x, y });
  const chips = rows(units);
  if (!hasRoom(burg.state ?? 0, at, chips.length)) return "No room on the map there: 4 units a cell";
  const made = chips.map(row => {
    const r = raise(burg.state!, burg.cell, { [row.unit]: row.count });
    r.home = burg.i;
    r.n = naval ? 1 : 0;
    [r.x, r.y] = [x, y];
    return r;
  });
  return made[0];
}

/** Older maps kept ships, airships and other units in garrisons: they step out onto the map, once */
export function evictNonInfantry(): number {
  let moved = 0;
  for (const state of pack.states ?? []) {
    if (!state?.i || state.removed) continue;
    for (const g of [...(state.military ?? [])]) {
      const burg = g.garrison ? living(g.garrison) : null;
      if (!burg) continue;
      const out = Object.keys(g.u).filter(u => g.u[u] > 0 && !garrisonable(u));
      for (const u of out) {
        const n = g.u[u];
        delete g.u[u];
        for (const row of rows({ [u]: n })) {
          const made = raise(state.i, burg.cell, { [u]: row.count });
          made.home = burg.i;
          made.n = domainOfUnit(u) === "naval" ? 1 : 0;
          [made.x, made.y] = standPoint(burg, made.n === 1);
          moved++;
        }
      }
      g.a = troopsOf(g);
    }
  }
  return moved;
}

/** March garrison units out: each chip stands on the settlement's cell as a unit of its own */
export function formArmy(burg: Burg, units: Units): Regiment[] | string {
  const garrison = garrisonOf(burg);
  if (!garrison) return "No garrison here";
  const made: Regiment[] = [];
  for (const row of rows(units)) {
    const take = Math.min(row.count, garrison.u[row.unit] ?? 0);
    if (take <= 0) continue;
    garrison.u[row.unit] -= take;
    if (!garrison.u[row.unit]) delete garrison.u[row.unit];
    const r = raise(burg.state!, burg.cell, { [row.unit]: take });
    r.home = garrison.home ?? burg.i;
    r.n = 0;
    r.x = burg.x;
    r.y = burg.y;
    made.push(r);
  }
  garrison.a = troopsOf(garrison);
  return made.length ? made : "Nothing to march out";
}

export const regimentHome = (r: Regiment) => living(r.home ?? 0);

/** Station a regiment's troops in a settlement's garrison: one of its own nation's, with room; ships need a harbour */
export function station(r: Regiment, burg: Burg): string {
  if (burg.state !== r.state) return "Only your own settlements take your troops";
  if (!sizeOf(burg)) return "Only towns, cities and citadels keep a garrison";
  if (slotsOf(r.cargo)) return "Unload the cargo first";
  const units = Object.keys(r.u).filter(u => r.u[u] > 0);
  if (units.some(u => !garrisonable(u))) return "Only infantry garrisons a settlement";
  if (room(burg) < slotsOf(r.u)) return `The garrison has room for ${room(burg)} slots`;
  const garrison = ensureGarrison(burg);
  if (!garrison) return "No garrison here";
  for (const u of units) garrison.u[u] = (garrison.u[u] ?? 0) + r.u[u];
  garrison.a = troopsOf(garrison);
  Military.remove(r.state, r.i);
  return "";
}

/** The settlement a map element stands for: its garrison count, its symbol or its name */
export function burgOfElement(el: Element | null): Burg | null {
  const own = el?.closest<SVGElement>(".flSettle, #burgIcons use[data-id], #labels text[data-label-type='burg']");
  if (!own) return null;
  const id = Number(own.dataset.burg ?? own.dataset.id);
  return living(id);
}
