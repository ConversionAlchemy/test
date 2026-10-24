// Everything a map tile needs, as plain typed arrays, and the painter that turns it into pixels. No globals here:
// the same code paints in a background worker or, where workers aren't available, on the main thread.
// One look per cell: each pixel takes its ground, snow and region from the Voronoi cell nearest to it, found through a
// slightly warped position so cell edges come out ragged instead of ruler-straight
import { fbm, valueNoise } from "./noise";
import { PixelRaster } from "./raster";
import { Terrain } from "./terrain";

/** Region colouring for a view: per-pixel region ids come from one of the per-cell id arrays */
export type ViewName = "terrain" | "political" | "provinces" | "cultures" | "religions";

export interface WorldModel {
  seed: number;
  width: number; // map pixels
  height: number;
  sites: Float32Array; // x, y per cell
  cellGrid: Int32Array; // the cell under each map pixel: where a lookup starts
  adjStarts: Int32Array; // cell → first index into `adj`; length cells + 1
  adj: Int32Array; // neighbouring cells
  terrain: Uint8Array; // per cell
  land: Uint8Array; // per cell: 1 land, 0 water
  lake: Uint8Array;
  state: Uint16Array;
  province: Uint16Array;
  culture: Uint16Array;
  religion: Uint16Array;
  colors: Record<"state" | "province" | "culture" | "religion", Uint32Array>; // packed colour by id
  elevation: Float32Array; // smoothed, one sample per map pixel, 0–1
  depth: Float32Array; // smoothed sea depth, one sample per map pixel, 0 deepest … 20 shore
}

export interface TileJob {
  scale: number; // game pixels per map pixel
  ox: number; // global game pixel of the raster's top-left, apron included
  oy: number;
  width: number;
  height: number;
  core: { x: number; y: number; w: number; h: number }; // what is returned, inside the raster
  detail: 0 | 1 | 2;
  view: ViewName;
  borders: boolean;
  borderPx: number;
  bandPx: number;
  provinces: boolean; // dashed province lines
  outline: boolean; // regions as borders only, no fill
  coastPx: number; // owner's colour along coasts
}

// warp of the lookup point, in map pixels: big enough to break up straight edges, small beside a cell (about 11)
const WARP = 1.4;
const WARP_FINE = 0.45;
const EDGE_REACH = 2; // map pixels: beyond the warp, so a pixel this far inside its cell can't change cell

/** The cell whose site is nearest to a map point: start from the cell under it and walk to nearer neighbours */
export function nearestCell(model: WorldModel, x: number, y: number): number {
  const { width, height, cellGrid, sites, adjStarts, adj } = model;
  const gx = Math.min(width - 1, Math.max(0, Math.floor(x)));
  const gy = Math.min(height - 1, Math.max(0, Math.floor(y)));
  let best = cellGrid[gy * width + gx];
  let dx = sites[best * 2] - x;
  let dy = sites[best * 2 + 1] - y;
  let bestD = dx * dx + dy * dy;
  for (let step = 0; step < 8; step++) {
    let moved = false;
    for (let k = adjStarts[best]; k < adjStarts[best + 1]; k++) {
      const cell = adj[k];
      dx = sites[cell * 2] - x;
      dy = sites[cell * 2 + 1] - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = cell;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return best;
}

/** The cell a map point shows: the nearest one to a slightly warped point. Inside a cell, far from any edge, the
 * answer is simply the cell under it, which is most pixels and costs one lookup */
export function cellAt(model: WorldModel, x: number, y: number): number {
  const { width, height, cellGrid } = model;
  const at = (px: number, py: number) =>
    cellGrid[Math.min(height - 1, Math.max(0, py)) * width + Math.min(width - 1, Math.max(0, px))];
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  const c = at(gx, gy);
  const r = EDGE_REACH;
  if (
    at(gx - r, gy - r) === c &&
    at(gx + r, gy - r) === c &&
    at(gx - r, gy + r) === c &&
    at(gx + r, gy + r) === c &&
    at(gx, gy - r) === c &&
    at(gx, gy + r) === c &&
    at(gx - r, gy) === c &&
    at(gx + r, gy) === c
  )
    return c;
  const s = model.seed;
  const wx = x + (fbm(x, y, 4, 2, s + 301) - 0.5) * 2 * WARP + (valueNoise(x, y, 1.2, s + 303) - 0.5) * 2 * WARP_FINE;
  const wy = y + (fbm(x, y, 4, 2, s + 302) - 0.5) * 2 * WARP + (valueNoise(x, y, 1.2, s + 304) - 0.5) * 2 * WARP_FINE;
  return nearestCell(model, wx, wy);
}

function sample(field: Float32Array, width: number, height: number, x: number, y: number): number {
  const fx = Math.max(0, Math.min(width - 1.001, x - 0.5));
  const fy = Math.max(0, Math.min(height - 1.001, y - 0.5));
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const i = iy * width + ix;
  const a = field[i];
  const b = field[i + 1];
  const c = field[i + width];
  const d = field[i + width + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** Paint one tile: returns the core's pixels, row by row */
export function paintTile(model: WorldModel, job: TileJob): Uint32Array {
  const { scale, ox, oy, width, height } = job;
  const raster = new PixelRaster(width, height, model.seed, ox, oy);
  raster.detail = job.detail;
  raster.snowByHeight = false;
  const region = new Uint16Array(width * height);
  const sub = job.provinces ? new Uint16Array(width * height) : null;
  const regionOf = regionSource(model, job.view);
  const unit = scale;

  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const mx = (x + ox + 0.5) / scale;
      const my = (y + oy + 0.5) / scale;
      const cell = cellAt(model, mx, my);
      if (!model.land[cell]) {
        const depth = sample(model.depth, model.width, model.height, mx, my);
        raster.terrain[i] =
          !model.lake[cell] && depth < 12 + (valueNoise(mx, my, 9, model.seed + 2) - 0.5) * 3
            ? Terrain.DeepWater
            : Terrain.Water;
        continue;
      }
      const t = model.terrain[cell];
      raster.terrain[i] = t;
      region[i] = regionOf[cell];
      if (sub) sub[i] = model.province[cell];
      const e = sample(model.elevation, model.width, model.height, mx, my);
      const gx = x + ox;
      const gy = y + oy;
      const rugged = t === Terrain.Mountains || t === Terrain.Snow ? 1 : t === Terrain.Hills ? 0.4 : 0;
      const ridge = rugged ? (1 - Math.abs(2 * fbm(gx, gy, 14 * (unit / 2), 3, model.seed + 21) - 1)) * rugged : 0;
      raster.elevation[i] = Math.round(Math.min(255, e * 200 + ridge * 70 + fbm(gx, gy, 8, 2, model.seed + 22) * 8));
    }

  const colors = viewColors(model, job.view);
  raster.region = region;
  raster.subregion = sub;
  raster.borders = job.borders;
  raster.borderPx = job.borderPx;
  raster.bandPx = job.bandPx;
  raster.coastPx = job.coastPx;
  raster.bandColors = Array.from(model.colors.state);
  if (job.view !== "terrain") raster.bandColors = Array.from(colors);
  raster.regionColors = Array.from(colors);
  const fill = job.view !== "terrain" && !job.outline;
  raster.tint = fill ? 0.62 : 0;
  raster.flatten = fill ? 0.55 : 0;

  const { x: cx, y: cy, w, h } = job.core;
  raster.render(cx, cy, w, h);
  const out = new Uint32Array(w * h);
  for (let row = 0; row < h; row++) {
    const from = (cy + row) * width + cx;
    out.set(raster.pixels.subarray(from, from + w), row * w);
  }
  return out;
}

function regionSource(model: WorldModel, view: ViewName): Uint16Array {
  if (view === "provinces") return model.province;
  if (view === "cultures") return model.culture;
  if (view === "religions") return model.religion;
  return model.state;
}

function viewColors(model: WorldModel, view: ViewName): Uint32Array {
  if (view === "provinces") return model.colors.province;
  if (view === "cultures") return model.colors.culture;
  if (view === "religions") return model.colors.religion;
  return model.colors.state;
}
