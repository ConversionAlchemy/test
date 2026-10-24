import { seededRandom, valueNoise } from "./noise";
import type { PixelRaster } from "./raster";
import { isWater, Overlay, type OverlayId, Terrain, type TerrainId } from "./terrain";

/**
 * Paint a round patch of terrain, with a slightly ragged rim so strokes don't look stamped.
 * Mountains and hills raise the ground (a dome, highest in the middle) so relief and snow follow; lowland flattens it
 */
export function paintTerrain(raster: PixelRaster, cx: number, cy: number, radius: number, terrain: TerrainId): void {
  const peak = terrain === Terrain.Mountains ? 240 : terrain === Terrain.Hills ? 120 : 0;
  forDisc(raster, cx, cy, radius + 1, (i, x, y, d) => {
    const rim = radius + (valueNoise(x, y, 2, raster.seed + 7) - 0.5) * Math.min(2, radius * 0.5);
    if (d > rim) return;
    raster.terrain[i] = terrain;
    if (peak) {
      const dome = peak * (0.45 + 0.55 * (1 - d / (radius + 1))) * (0.8 + valueNoise(x, y, 3, raster.seed + 8) * 0.4);
      raster.elevation[i] = Math.max(raster.elevation[i], Math.min(255, Math.round(dome)));
    } else raster.elevation[i] = isWater(terrain) ? 0 : Math.min(raster.elevation[i], 40);
  });
}

/** Wipe overlays back to clean ground */
export function clearOverlay(raster: PixelRaster, cx: number, cy: number, radius: number): void {
  forDisc(raster, cx, cy, radius, i => {
    raster.overlay[i] = Overlay.None;
    raster.amount[i] = 0;
  });
}

/** Battle damage and the like, layered over whatever ground is there */
export function stampOverlay(raster: PixelRaster, kind: OverlayId, cx: number, cy: number, radius: number): void {
  const random = seededRandom(Math.round(cx) * 7919 + Math.round(cy) * 104729 + kind);
  if (kind === Overlay.Crater) {
    scorch(raster, cx, cy, radius * 2.2, random);
    rubble(raster, cx, cy, radius * 1.9, random);
    forDisc(raster, cx, cy, radius, (i, _x, _y, d) => write(raster, i, Overlay.Crater, 255 * (1 - d / radius) + 18));
  } else if (kind === Overlay.Scorch) scorch(raster, cx, cy, radius, random);
  else if (kind === Overlay.Rubble) rubble(raster, cx, cy, radius, random);
  else if (kind === Overlay.Blood) blood(raster, cx, cy, radius, random);
}

function scorch(raster: PixelRaster, cx: number, cy: number, radius: number, random: () => number): void {
  forDisc(raster, cx, cy, radius, (i, _x, _y, d) => {
    if (raster.overlay[i] && raster.overlay[i] !== Overlay.Scorch) return;
    write(raster, i, Overlay.Scorch, 255 * (1 - d / radius) * (0.7 + random() * 0.3));
  });
}

function rubble(raster: PixelRaster, cx: number, cy: number, radius: number, random: () => number): void {
  forDisc(raster, cx, cy, radius, (i, _x, _y, d) => {
    if (raster.overlay[i] === Overlay.Crater || raster.overlay[i] === Overlay.Blood) return;
    if (random() < 0.5) write(raster, i, Overlay.Rubble, 255 * (1 - d / radius));
  });
}

function blood(raster: PixelRaster, cx: number, cy: number, radius: number, random: () => number): void {
  const splats = 2 + Math.floor(radius / 2);
  for (let k = 0; k < splats; k++) {
    const angle = random() * Math.PI * 2;
    const dist = random() * radius;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const size = 0.6 + random() * Math.max(1, radius / 4);
    forDisc(raster, x, y, size, i => write(raster, i, Overlay.Blood, 230));
    for (let drop = 0; drop < 3; drop++) {
      const dx = Math.round(x + (random() - 0.5) * size * 4);
      const dy = Math.round(y + (random() - 0.5) * size * 4);
      if (dx >= 0 && dy >= 0 && dx < raster.width && dy < raster.height)
        write(raster, dy * raster.width + dx, Overlay.Blood, 255);
    }
  }
}

function write(raster: PixelRaster, i: number, kind: OverlayId, amount: number): void {
  const value = Math.max(0, Math.min(255, Math.round(amount)));
  if (raster.overlay[i] === kind && raster.amount[i] >= value) return;
  raster.overlay[i] = kind;
  raster.amount[i] = value;
}

function forDisc(
  raster: PixelRaster,
  cx: number,
  cy: number,
  radius: number,
  visit: (index: number, x: number, y: number, distance: number) => void
): void {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(raster.width - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(raster.height - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= radius) visit(y * raster.width + x, x, y, d);
    }
  raster.markDirty(x0, y0, x1 + 1, y1 + 1);
}
