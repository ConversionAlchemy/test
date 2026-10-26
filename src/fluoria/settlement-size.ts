// A settlement's size in Fluoria: village, town, city or citadel; one citadel of a nation is its capital.
// Size sets the garrison's slots, the highest tier its class raises and the manpower it is first given
export type Size = "town" | "city" | "citadel"; // a village has none
export type Rank = "village" | Size;

export const RANKS: Rank[] = ["village", "town", "city", "citadel"];
export const RANK_NAME: Record<Rank, string> = { village: "Village", town: "Town", city: "City", citadel: "Citadel" };

export const GARRISON_SLOTS: Record<Size, number> = { town: 4, city: 8, citadel: 12 };
export const MAX_TIER: Record<Size, 1 | 2 | 3> = { town: 1, city: 2, citadel: 3 };
/** Manpower a settlement is topped up to the first time it reaches a size */
export const MANPOWER_LEVEL: Record<Rank, number> = { village: 50, town: 150, city: 400, citadel: 1000 };
/** What growing into a size costs, from the size below */
export const SIZE_COST: Record<Rank, number> = { village: 0, town: 300, city: 800, citadel: 2000 };

type SizedBurg = { i: number; capital?: number | boolean; group?: string; flSize?: Rank };

/** A settlement's rank as saved; older maps by Azgaar's group: capitals are citadels, province seats cities */
export function rankOf(burg: SizedBurg | undefined): Rank {
  if (!burg?.i) return "village";
  if (burg.flSize) return burg.capital && burg.flSize !== "citadel" ? "citadel" : burg.flSize;
  if (burg.capital) return "citadel";
  if (burg.group === "city" || pack.provinces?.some(p => p && "burg" in p && p.burg === burg.i && !p.removed))
    return "city";
  return burg.group === "town" ? "town" : "village";
}

export function sizeOf(burg: SizedBurg | undefined): Size | null {
  const rank = rankOf(burg);
  return rank === "village" ? null : rank;
}

/** What it costs to go from one rank to another: growing pays each step, shrinking gets half back */
export function resizeCost(from: Rank, to: Rank): number {
  const [a, b] = [RANKS.indexOf(from), RANKS.indexOf(to)];
  const steps = RANKS.slice(Math.min(a, b) + 1, Math.max(a, b) + 1).reduce((sum, r) => sum + SIZE_COST[r], 0);
  return b > a ? steps : -Math.round(steps / 2);
}

export const garrisonSlots = (burgId: number) => {
  const size = sizeOf(pack.burgs[burgId]);
  return size ? GARRISON_SLOTS[size] : 0;
};
