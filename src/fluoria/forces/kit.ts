// The 39 approved unit types: 13 families (land, air, naval) in three tiers, with their 17×17 pixel icons
import type { MilitaryUnit } from "@/types/Military";
import data from "./kit.json";

export type Domain = "land" | "naval" | "air";
export type Role =
  | "infantry"
  | "assault"
  | "cavalry"
  | "armour"
  | "trade"
  | "scout"
  | "combat"
  | "bomber"
  | "transport";

export interface KitUnit {
  id: string;
  name: string;
  nickname: string | null;
  domain: Domain;
  role: Role;
  tier: 1 | 2 | 3;
  pixels: string[]; // 17 rows: . transparent, # black, R nation colour, W white
}

export const KIT = data as KitUnit[];
const byId = new Map(KIT.map(unit => [unit.id, unit]));
export const kitUnit = (id: string | undefined) => (id ? byId.get(id) : undefined);

/** Troops one chip holds by tier: fewer but stronger as the tier rises; vehicles; one ship or airship */
export const SLOT_SIZE: Partial<Record<Role, [number, number, number]>> = {
  infantry: [80, 60, 40],
  assault: [50, 40, 25],
  cavalry: [40, 30, 20],
  armour: [4, 2, 1]
};

/** Power of one full chip by tier, transports the weakest; a unit's Azgaar power is this over the chip, ×100 */
const SLOT_POWER: Record<Domain, Partial<Record<Role, [number, number, number]>>> = {
  land: { infantry: [100, 160, 260], assault: [120, 200, 340], cavalry: [120, 200, 340], armour: [180, 300, 500] },
  naval: { trade: [60, 100, 160], scout: [80, 140, 220], combat: [200, 340, 560], transport: [60, 100, 160] },
  air: {
    trade: [60, 100, 160],
    scout: [80, 140, 220],
    combat: [220, 370, 600],
    bomber: [250, 420, 680],
    transport: [60, 100, 160]
  }
};

const AZGAAR_TYPE: Partial<Record<Role, string>> = {
  infantry: "ranged",
  assault: "melee",
  cavalry: "mounted",
  armour: "armored"
};

const CREW: Partial<Record<Role, number>> = { infantry: 1, assault: 1, cavalry: 2, armour: 6, scout: 30, trade: 20 };

// who a new map raises: share of rural and urban population, as Azgaar's own defaults
const RAISED: Record<string, [number, number]> = {
  land_infantry_t1: [0.25, 0.1],
  land_infantry_t2: [0.08, 0.15],
  land_assault_t1: [0, 0.03],
  land_cavalry_t1: [0.06, 0.01],
  land_armour_t1: [0, 0.0015],
  naval_combat_t1: [0, 0.01],
  naval_transport_t1: [0, 0.002],
  air_combat_t1: [0, 0.003]
};

/** Airships end a move within this many cells of a settlement of their own nation or an ally */
export const AIR_RANGE = 10;

export const slotSize = (unit: KitUnit) => SLOT_SIZE[unit.role]?.[unit.tier - 1] ?? 1;

/** Troops a slot held before chips, any tier: maps saved then are converted slot for slot */
export const OLD_SLOT_SIZE: Partial<Record<Role, number>> = { infantry: 500, assault: 500, cavalry: 250, armour: 10 };
export const oldSlotSize = (unit: KitUnit) => OLD_SLOT_SIZE[unit.role] ?? 1;

export function movePerTurn(unit: KitUnit): number {
  if (unit.domain === "air") return 5 + unit.tier;
  if (unit.domain === "naval") return 3;
  return unit.role === "cavalry" ? 2 : 1;
}

/** Names are unique: air and naval share a few, told apart by nickname */
export function unitName(unit: KitUnit): string {
  const shared = KIT.some(other => other !== unit && other.name === unit.name);
  return shared && unit.nickname ? `${unit.name} (${unit.nickname})` : unit.name;
}

/** The kit as Azgaar military unit types */
export function kitUnits(glyph: (emoji: string) => string): MilitaryUnit[] {
  const icon = { land: "⚔️", naval: "🌊", air: "🎈" };
  return KIT.map(unit => {
    const size = slotSize(unit);
    const [rural, urban] = (RAISED[unit.id] ?? [0, 0]).map(share => (share * size) / oldSlotSize(unit)); // as many chips as slots before
    return {
      icon: glyph(icon[unit.domain]),
      name: unitName(unit),
      rural,
      urban,
      crew: CREW[unit.role] ?? (unit.role === "transport" ? 50 : 100),
      power: ((SLOT_POWER[unit.domain][unit.role]?.[unit.tier - 1] ?? 5) * 100) / size,
      type: unit.domain === "land" ? (AZGAAR_TYPE[unit.role] ?? "melee") : unit.domain === "air" ? "aviation" : "naval",
      separate: 1,
      fl: unit.id,
      slot: size,
      move: movePerTurn(unit),
      ...(unit.domain === "air" ? { range: AIR_RANGE } : {})
    };
  });
}
