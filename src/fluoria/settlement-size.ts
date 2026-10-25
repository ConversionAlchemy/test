// A settlement's size in Fluoria: capital, city (a city or a province seat), town; hamlets and villages have none.
// Size sets the garrison's slots and the highest tier it can raise
export type Size = "capital" | "city" | "town";

export const GARRISON_SLOTS: Record<Size, number> = { town: 4, city: 8, capital: 12 };
export const MAX_TIER: Record<Size, 1 | 2 | 3> = { town: 1, city: 2, capital: 3 };

export function sizeOf(burg: { i: number; capital?: number | boolean; group?: string } | undefined): Size | null {
  if (!burg?.i) return null;
  if (burg.capital) return "capital";
  if (burg.group === "city" || pack.provinces?.some(p => p && "burg" in p && p.burg === burg.i && !p.removed))
    return "city";
  return burg.group === "town" ? "town" : null;
}

export const garrisonSlots = (burgId: number) => {
  const size = sizeOf(pack.burgs[burgId]);
  return size ? GARRISON_SLOTS[size] : 0;
};
