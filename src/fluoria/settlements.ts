// Settlements as Fluoria uses them: a garrison kept off the map, buildings that unlock recruiting, and money.
// A garrison is a hidden regiment tied to its settlement; buildings are Azgaar's own feature toggles, renamed
import type { Burg } from "@/generators/burgs-generator";
import type { Regiment } from "@/generators/military-generator";
import { raise } from "./forces/army";
import { domainOfUnit, isTransport, slotsOf, troopsOf, type Units } from "./forces/forces";
import { KIT, type KitUnit, SLOT_SIZE } from "./forces/kit";
import { cellCentre, mainCell, neighbours } from "./one-grid";
import { garrisonSlots, MAX_TIER, type Size, sizeOf } from "./settlement-size";

export type Building = "barracks" | "harbour" | "depot" | "airbase" | "market";

interface BuildingInfo {
  name: string;
  field: "citadel" | "port" | "temple" | "shanty" | "plaza"; // the Azgaar toggle it lives in
  cost: number;
  unlocks: string;
  needs?: Size[]; // sizes allowed to build it
}

export const BUILDINGS: Record<Building, BuildingInfo> = {
  barracks: { name: "Barracks", field: "citadel", cost: 250, unlocks: "Infantry, Assault, Cavalry" },
  harbour: { name: "Harbour", field: "port", cost: 500, unlocks: "Ships" },
  depot: { name: "Armour Depot", field: "temple", cost: 450, unlocks: "Armour", needs: ["city", "capital"] },
  airbase: { name: "Airbase", field: "shanty", cost: 800, unlocks: "Airships", needs: ["city", "capital"] },
  market: { name: "Market", field: "plaza", cost: 150, unlocks: "+10% Income" }
};
export const BUILDING_ORDER: Building[] = ["barracks", "harbour", "depot", "airbase", "market"];

/** Price of one full slot by tier: land ×2.5, sea ×3, air ×4 of its card power, in steps of 5 */
const SLOT_PRICE: Record<string, [number, number, number]> = {
  "land:infantry": [20, 30, 40],
  "land:assault": [25, 35, 50],
  "land:cavalry": [25, 35, 45],
  "land:armour": [40, 60, 90],
  "naval:trade": [20, 35, 50],
  "naval:scout": [30, 50, 70],
  "naval:combat": [40, 65, 100],
  "naval:transport": [20, 30, 45],
  "air:trade": [30, 45, 65],
  "air:scout": [40, 65, 95],
  "air:combat": [65, 100, 150],
  "air:bomber": [70, 110, 170],
  "air:transport": [25, 40, 60]
};

const living = (burgId: number) => {
  const burg = pack.burgs[burgId];
  return burg?.i && !burg.removed ? burg : null;
};

export const perSlot = (kit: KitUnit) => SLOT_SIZE[kit.role] ?? 1;
export const unitName = (kit: KitUnit) => options.map.military.units.find(u => u.fl === kit.id)?.name ?? kit.name;

// --- buildings

export const hasBuilding = (burg: Burg, b: Building) => Boolean(burg[BUILDINGS[b].field]);

const coastal = (burg: Burg) => (pack.cells.haven?.[burg.cell] ?? 0) > 0 && pack.cells.t[burg.cell] === 1;

/** Why a building can't go up here, or "" */
export function buildRefusal(burg: Burg, b: Building): string {
  const size = sizeOf(burg);
  if (!size) return "Only towns, cities and capitals build";
  const info = BUILDINGS[b];
  if (hasBuilding(burg, b)) return "Already built";
  if (b === "harbour" && !coastal(burg)) return "Coastal Only";
  if (info.needs && !info.needs.includes(size)) return "City Or Larger";
  if (funds(burg) < info.cost) return `Needs §${info.cost}`;
  return "";
}

export function build(burg: Burg, b: Building): string {
  const why = buildRefusal(burg, b);
  if (why) return why;
  spend(burg, BUILDINGS[b].cost);
  setBuilding(burg, b, true);
  return "";
}

/** Tear a building down: half its cost comes back */
export function demolish(burg: Burg, b: Building): void {
  if (!hasBuilding(burg, b)) return;
  setBuilding(burg, b, false);
  burg.treasury = (burg.treasury ?? 0) + Math.round(BUILDINGS[b].cost / 2);
}

function setBuilding(burg: Burg, b: Building, on: boolean): void {
  if (b === "harbour") {
    const haven = pack.cells.haven?.[burg.cell];
    burg.port = on && haven ? pack.cells.f[haven] : 0;
    return;
  }
  burg[BUILDINGS[b].field] = on ? 1 : 0;
}

/** Older maps: Azgaar's toggles become buildings where they fit, once; capitals get barracks */
function fitBuildings(burg: Burg): void {
  const size = sizeOf(burg);
  if (size === "capital") burg.citadel = 1;
  for (const b of ["depot", "airbase"] as const)
    if (hasBuilding(burg, b) && (!size || !BUILDINGS[b].needs?.includes(size))) setBuilding(burg, b, false);
}

// --- money: a nation's treasury is held at its capital

const isCapital = (burg: Burg) => Boolean(burg.capital && pack.states[burg.state ?? 0]?.capital === burg.i);

/** What a settlement can spend: its own treasury, and at the capital the nation's too */
export function funds(burg: Burg): number {
  const own = Math.max(0, burg.treasury ?? 0);
  return isCapital(burg) ? own + Math.max(0, pack.states[burg.state ?? 0]?.treasury ?? 0) : own;
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

/** Move money from the nation's treasury to a settlement */
export function sendFunds(burg: Burg, amount: number): string {
  const state = pack.states[burg.state ?? 0];
  const sum = Math.round(amount);
  if (!state || sum <= 0) return "Enter an amount";
  if ((state.treasury ?? 0) < sum) return `The nation holds §${Math.floor(state.treasury ?? 0)}`;
  state.treasury -= sum;
  burg.treasury = (burg.treasury ?? 0) + sum;
  return "";
}

// --- people

const PEOPLE = () => options.map.units.population.scale * options.map.units.population.urbanization.rate;
export const peopleOf = (burg: Burg) => Math.round((burg.population ?? 0) * PEOPLE());
const crewOf = (unit: string) => options.map.military.units.find(u => u.name === unit)?.crew ?? 1;
export const peopleFor = (unit: string, count: number) => Math.round(count * crewOf(unit));

function takePeople(burg: Burg, people: number): void {
  burg.population = Math.max(0, (burg.population ?? 0) - people / PEOPLE());
}

/** Troops released go home: to the settlement they were raised in, else the nation's capital */
export function sendHome(regiment: Regiment, units: Units = regiment.u): void {
  const home = living(regiment.home ?? regiment.garrison ?? 0) ?? living(pack.states[regiment.state]?.capital ?? 0);
  if (!home) return;
  const people = Object.entries(units).reduce((sum, [unit, n]) => sum + peopleFor(unit, n), 0);
  home.population = (home.population ?? 0) + people / PEOPLE();
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

/** Units a settlement may raise: its buildings decide the kinds, its size the highest tier */
export function recruitable(burg: Burg): KitUnit[] {
  const size = sizeOf(burg);
  if (!size) return [];
  const tier = MAX_TIER[size];
  return KIT.filter(k => {
    if (k.tier > tier) return false;
    if (k.domain === "land") return k.role === "armour" ? hasBuilding(burg, "depot") : hasBuilding(burg, "barracks");
    if (k.domain === "naval") return hasBuilding(burg, "harbour");
    return hasBuilding(burg, "airbase");
  });
}

export function priceOf(kit: KitUnit, count: number): number {
  const per = SLOT_PRICE[`${kit.domain}:${kit.role}`]?.[kit.tier - 1] ?? 50;
  return Math.ceil((per * count) / perSlot(kit));
}

/** The most of a unit this settlement can raise now: its slots, people and money */
export function recruitLimit(burg: Burg, kit: KitUnit): number {
  const garrison = garrisonOf(burg);
  const used = garrison ? slotsOf(garrison.u) : 0;
  const free = Math.max(0, garrisonSlots(burg.i) - used) * perSlot(kit);
  const name = unitName(kit);
  const byPeople = Math.floor(peopleOf(burg) / Math.max(1, crewOf(name)));
  const per = priceOf(kit, perSlot(kit)) / perSlot(kit);
  const byMoney = per > 0 ? Math.floor(funds(burg) / per) : free;
  return Math.max(0, Math.min(free, byPeople, byMoney));
}

/** Raise `count` of a unit into the garrison: people from the settlement, money from its treasury */
export function recruit(burg: Burg, kit: KitUnit, count: number): string {
  if (!recruitable(burg).includes(kit)) return "This settlement can't raise that unit";
  const n = Math.round(count);
  if (n <= 0) return "Enter an amount";
  if (n > recruitLimit(burg, kit)) return "Not enough room, people or money";
  const garrison = ensureGarrison(burg);
  if (!garrison) return "No garrison here";
  const name = unitName(kit);
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
  for (const burg of pack.burgs) if (burg?.i && !burg.removed) fitBuildings(burg);
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
      if (!unit) continue;
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

/** Form an army from garrison units: they stand on the settlement's cell as a regiment of their own */
export function formArmy(burg: Burg, units: Units): Regiment | string {
  const garrison = garrisonOf(burg);
  if (!garrison) return "No garrison here";
  const domains = new Set(Object.keys(units).map(domainOfUnit));
  if (domains.size > 1) return "An army is one kind: land, sea or air";
  const [domain] = domains;
  if (domain === "naval" && !burg.port) return "Ships leave from a harbour";
  const made = raise(burg.state!, burg.cell, {});
  made.home = garrison.home ?? burg.i;
  for (const [u, n] of Object.entries(units)) {
    const take = Math.min(n, garrison.u[u] ?? 0);
    if (take <= 0) continue;
    garrison.u[u] -= take;
    if (!garrison.u[u]) delete garrison.u[u];
    made.u[u] = (made.u[u] ?? 0) + take;
  }
  garrison.a = troopsOf(garrison);
  made.a = troopsOf(made);
  made.n = domain === "naval" ? 1 : 0;
  if (domain === "naval" && pack.cells.haven?.[burg.cell]) {
    const [x, y] = cellCentre(pack.cells.haven[burg.cell]);
    made.x = (burg.x + x) / 2;
    made.y = (burg.y + y) / 2;
  } else {
    made.x = burg.x;
    made.y = burg.y;
  }
  return made;
}

export const regimentHome = (r: Regiment) => living(r.home ?? 0);

/** Station a regiment's troops in a settlement's garrison: one of its own nation's, with room; ships need a harbour */
export function station(r: Regiment, burg: Burg): string {
  if (burg.state !== r.state) return "Only your own settlements take your troops";
  if (!sizeOf(burg)) return "Only towns, cities and capitals keep a garrison";
  if (slotsOf(r.cargo)) return "Unload the cargo first";
  const units = Object.keys(r.u).filter(u => r.u[u] > 0);
  if (units.some(u => domainOfUnit(u) === "naval") && !burg.port) return "Ships need a harbour";
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
