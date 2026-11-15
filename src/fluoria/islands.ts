// Islands are provinces: a province whose every piece of land is a whole island of its own is named for it, with
// "Isle" (small), "Island" or "Isles" (several) after its name
const SMALL = 6;

let cache: { of: unknown; at: number; nouns: Map<number, string> } = { of: null, at: 0, nouns: new Map() };

/** "Isle", "Island" or "Isles" for an island province, "" for any other */
export function islandNoun(province: number): string {
  const { cells, features } = pack;
  // provinces change in place (gifts, merges), so the answer is kept only briefly
  if (cache.of !== cells.province || performance.now() - cache.at > 500) {
    const nouns = new Map<number, string>();
    const byProvince = new Map<number, Map<number, number>>(); // province -> feature -> its cells in the province
    for (let i = 0; i < cells.i.length; i++) {
      const p = cells.province[i];
      if (!p || cells.h[i] < 20) continue;
      const own = byProvince.get(p) ?? byProvince.set(p, new Map()).get(p)!;
      own.set(cells.f[i], (own.get(cells.f[i]) ?? 0) + 1);
    }
    for (const [p, own] of byProvince) {
      const whole = [...own].every(([f, n]) => features[f]?.type === "island" && (features[f].cells ?? n) === n);
      if (!whole) continue;
      const size = [...own.values()].reduce((a, b) => a + b, 0);
      nouns.set(p, own.size > 1 ? "Isles" : size <= SMALL ? "Isle" : "Island");
    }
    cache = { of: cells.province, at: performance.now(), nouns };
  }
  return cache.nouns.get(province) ?? "";
}

/** The name an island province is shown by */
export function islandName(province: number): string | null {
  const noun = islandNoun(province);
  const p = pack.provinces[province];
  return noun && p ? `${bareIsland(p.name)} ${noun}` : null;
}

export const bareIsland = (name: string) => name.replace(/\s+(Isle|Island|Isles)$/i, "");
