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

/** Troops one slot holds: people for infantry, riders, vehicles; one ship or airship */
export const SLOT_SIZE: Partial<Record<Role, number>> = { infantry: 500, assault: 500, cavalry: 250, armour: 10 };

/** Card power of one full slot by tier, transports the weakest; a unit's Azgaar power is this over the slot, ×100 */
const SLOT_POWER: Record<Domain, Partial<Record<Role, [number, number, number]>>> = {
  land: { infantry: [8, 12, 16], assault: [10, 14, 20], cavalry: [9, 13, 18], armour: [15, 24, 36] },
  naval: { trade: [7, 11, 16], scout: [10, 16, 24], combat: [14, 22, 34], transport: [6, 10, 15] },
  air: { trade: [7, 11, 16], scout: [10, 16, 24], combat: [16, 25, 38], bomber: [18, 28, 42], transport: [6, 10, 15] }
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
export const AIR_RANGE = 6;

export const slotSize = (unit: KitUnit) => SLOT_SIZE[unit.role] ?? 1;

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
    const [rural, urban] = RAISED[unit.id] ?? [0, 0];
    const size = slotSize(unit);
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
