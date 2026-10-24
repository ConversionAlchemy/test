import { paintTerrain } from "./brushes";
import type { MapLabel } from "./labels";
import { fbm, seededRandom } from "./noise";
import { PixelRaster } from "./raster";
import { isWater, Terrain, type TerrainId } from "./terrain";

const TOWNS = ["Havenport", "Goldbank", "Portsbridge", "Great Keys", "Willard's Pass", "Templewood", "Overbay"];

/** A made-up stretch of coast with every terrain on it, for judging the look until the world view lands */
export function buildSampleScene(seed: number, width = 640, height = 360): { raster: PixelRaster; labels: MapLabel[] } {
  const raster = new PixelRaster(width, height, seed);
  const elevation = new Float32Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const dx = (x - width / 2) / (width * 0.5);
      const dy = (y - height / 2) / (height * 0.5);
      const falloff = 1 - Math.min(1, Math.hypot(dx, dy));
      const e = fbm(x, y, 110, 5, seed) * 0.75 + falloff * 0.55 - 0.08;
      elevation[y * width + x] = e;
      raster.terrain[y * width + x] = terrainFor(x, y, e, seed);
      raster.elevation[y * width + x] = elevationFor(x, y, e, seed);
    }

  const random = seededRandom(seed);
  const towns: { name: string; x: number; y: number }[] = [];
  for (let attempt = 0; attempt < 4000 && towns.length < TOWNS.length; attempt++) {
    const x = Math.floor(random() * (width - 80)) + 40;
    const y = Math.floor(random() * (height - 60)) + 30;
    const e = elevation[y * width + x];
    if (e < 0.5 || e > 0.62 || towns.some(t => Math.hypot(t.x - x, t.y - y) < 95)) continue;
    towns.push({ name: TOWNS[towns.length], x, y });
  }

  for (const town of towns)
    for (let k = 0; k < 14; k++) {
      const fx = town.x + (random() - 0.5) * 70;
      const fy = town.y + (random() - 0.5) * 46;
      if (raster.terrainAt(Math.round(fx), Math.round(fy)) === Terrain.Grass)
        paintOnly(raster, fx, fy, 6 + random() * 6, Terrain.Farmland, [Terrain.Grass, Terrain.Forest]);
    }

  const linked = new Set<number>([0]);
  while (linked.size < towns.length) {
    let best = { a: -1, j: -1, d: Infinity };
    for (const a of linked)
      for (let j = 0; j < towns.length; j++) {
        const d = Math.hypot(towns[a].x - towns[j].x, towns[a].y - towns[j].y);
        if (!linked.has(j) && d < best.d) best = { a, j, d };
      }
    if (best.j < 0) break;
    const { a, j } = best;
    road(raster, towns[a], towns[j], seed + j);
    linked.add(j);
  }
  for (const town of towns) paintTerrain(raster, town.x, town.y, 4, Terrain.Cobbles);

  const labels: MapLabel[] = towns.map((town, i) => ({
    id: town.name,
    text: town.name,
    x: town.x,
    y: town.y - 9,
    priority: towns.length - i,
    size: i < 3 ? 18 : 14
  }));
  return { raster, labels };
}

/** Lowland rolls gently; uplands get sharp ridges so relief shading has something to catch */
function elevationFor(x: number, y: number, e: number, seed: number): number {
  const land = Math.max(0, (e - 0.47) / 0.45);
  const ridge = 1 - Math.abs(2 * fbm(x, y, 18, 3, seed + 21) - 1);
  const upland = Math.max(0, Math.min(1, (e - 0.66) / 0.14));
  return Math.round(Math.min(255, land * 125 + ridge * upland * 100 + fbm(x, y, 9, 2, seed + 22) * 8));
}

function terrainFor(x: number, y: number, e: number, seed: number): TerrainId {
  if (e < 0.36) return Terrain.DeepWater;
  if (e < 0.45) return Terrain.Water;
  if (e < 0.47) return Terrain.Sand;
  if (e > 0.78) return Terrain.Mountains;
  if (e > 0.7) return Terrain.Hills;
  const wet = fbm(x, y, 30, 2, seed + 3);
  if (e < 0.5 && wet > 0.6) return Terrain.Marsh;
  return fbm(x, y, 45, 3, seed + 9) > 0.56 ? Terrain.Forest : Terrain.Grass;
}

function paintOnly(raster: PixelRaster, cx: number, cy: number, r: number, t: TerrainId, over: TerrainId[]): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r * 1.4); x <= cx + r * 1.4; x++) {
      if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) continue;
      if (((x - cx) / 1.4) ** 2 + (y - cy) ** 2 > r * r) continue;
      const i = y * raster.width + x;
      if ((over as number[]).includes(raster.terrain[i])) raster.terrain[i] = t;
    }
}

function road(raster: PixelRaster, a: { x: number; y: number }, b: { x: number; y: number }, seed: number): void {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
  const nx = -(b.y - a.y) / steps;
  const ny = (b.x - a.x) / steps;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const bend = (fbm(k, 0, 40, 2, seed) - 0.5) * 30 * Math.sin(Math.PI * t);
    const x = Math.round(a.x + (b.x - a.x) * t + nx * bend);
    const y = Math.round(a.y + (b.y - a.y) * t + ny * bend);
    if (x < 0 || y < 0 || x >= raster.width || y >= raster.height || isWater(raster.terrainAt(x, y))) continue;
    raster.terrain[y * raster.width + x] = Terrain.Dirt;
    if (x + 1 < raster.width && !isWater(raster.terrainAt(x + 1, y)))
      raster.terrain[y * raster.width + x + 1] = Terrain.Dirt;
  }
}
