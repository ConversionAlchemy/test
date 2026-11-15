// Forests on a small world: kept to patches instead of whole climate zones; the heart of each patch is dense woods,
// where no road runs and no settlement stands. Dense is worked out from the biomes, so saved maps need nothing new.
import { fbm } from "./noise";

/** Forest biomes and what each becomes where the forest is thinned: tropical to savanna, temperate to grassland, taiga to tundra */
const THIN_TO: Record<number, number> = { 5: 3, 6: 4, 7: 3, 8: 4, 9: 10 };
export const isForestBiome = (b: number): boolean => b in THIN_TO;

interface Cells {
  biome: { length: number; [i: number]: number };
  h: { [i: number]: number };
  p: [number, number][];
  c: number[][];
}

/** Keep about a third of the forest, in clumps */
export function thinForests(cells: Cells, seed: number, keep = 0.35): void {
  const forest: number[] = [];
  for (let i = 0; i < cells.biome.length; i++) if (cells.h[i] >= 20 && isForestBiome(cells.biome[i])) forest.push(i);
  if (!forest.length) return;
  const score = (i: number) => fbm(cells.p[i][0], cells.p[i][1], 70, 3, seed);
  const sorted = forest.map(score).sort((a, b) => b - a);
  const cut = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * keep))];
  for (const i of forest) if (score(i) < cut) cells.biome[i] = THIN_TO[cells.biome[i]];
}

/** Dense woods: a forest cell with forest on every land side */
export function isDenseWood(cells: Pick<Cells, "biome" | "h" | "c">, i: number): boolean {
  if (cells.h[i] < 20 || !isForestBiome(cells.biome[i])) return false;
  for (const j of cells.c[i]) if (cells.h[j] >= 20 && !isForestBiome(cells.biome[j])) return false;
  return true;
}
