// Turns the loaded Azgaar map into pixel layers. Nothing here invents the world: terrain follows biomes and heights,
// relief follows elevation, snow follows temperature, and rivers, roads, states and towns come from the map itself
import { fbm, valueNoise } from "./noise";
import { Palette, packRGB } from "./palette";
import { PixelRaster, type Stamp } from "./raster";
import { isOpenWater, Terrain, type TerrainId } from "./terrain";

/** Game pixels per Azgaar map pixel */
export const WORLD_SCALE = 2;

// Azgaar's default biome ids, in order
const BIOME_TERRAIN: TerrainId[] = [
  Terrain.Water, // marine
  Terrain.Desert, // hot desert
  Terrain.Tundra, // cold desert
  Terrain.DryGrass, // savanna
  Terrain.Grass, // grassland
  Terrain.Forest, // tropical seasonal forest
  Terrain.Forest, // temperate deciduous forest
  Terrain.Jungle, // tropical rainforest
  Terrain.Forest, // temperate rainforest
  Terrain.Taiga, // taiga
  Terrain.Tundra, // tundra
  Terrain.Snow, // glacier
  Terrain.Marsh // wetland
];

const FORESTS: number[] = [Terrain.Forest, Terrain.Jungle, Terrain.Taiga];
const OPEN_LAND: number[] = [Terrain.Grass, Terrain.DryGrass, Terrain.Tundra];

/** A rectangle of the map in Azgaar map pixels */
export interface MapArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A raster of part (or all) of the map at `scale` game pixels per map pixel, with the cell under each pixel */
export interface TerrainBuild {
  raster: PixelRaster;
  cellOf: Int32Array;
  scale: number;
  area: MapArea;
}

export const wholeMap = (): MapArea => ({
  x: 0,
  y: 0,
  width: options.map.graph.width,
  height: options.map.graph.height
});

/** Land, water, relief and snow for an area: everything that comes from heights, biomes and temperature */
export function buildTerrain(scale = WORLD_SCALE, area: MapArea = wholeMap()): TerrainBuild {
  const { cells, vertices, features } = pack;
  const width = Math.ceil(area.width * scale);
  const height = Math.ceil(area.height * scale);
  const seed = Number.parseInt(String(options.map.seed), 10) % 100000 || 1;
  const raster = new PixelRaster(width, height, seed);

  const cellOf = rasterizeCells(cells.v, vertices.p, width, height, scale, area);
  const elevation = new Float32Array(width * height);
  const snowLine = new Uint8Array(width * height);
  const landness = new Float32Array(width * height);
  const depth = new Float32Array(width * height);
  const isLand = (cell: number) => Boolean(features[cells.f[cell]]?.land);
  for (let i = 0; i < cellOf.length; i++) {
    landness[i] = isLand(cellOf[i]) ? 1 : 0;
    depth[i] = Math.min(20, cells.h[cellOf[i]]);
  }
  // Voronoi edges are straight: blur land and depth so coasts and deeps come out rounded, as Azgaar draws them
  const cellPixels = Math.max(1, Math.round(grid.spacing * scale * 0.45));
  smooth(landness, width, height, cellPixels);
  smooth(depth, width, height, cellPixels * 2);

  for (let i = 0; i < cellOf.length; i++) {
    let cell = cellOf[i];
    const x = i % width;
    const y = (i - x) / width;
    const land = landness[i] > 0.5 + (valueNoise(x, y, 5 * (scale / WORLD_SCALE), seed + 3) - 0.5) * 0.3;
    if (land && !isLand(cell)) cell = cells.c[cell].find(isLand) ?? cell; // coast pushed out: borrow the shore cell
    cellOf[i] = cell;
    if (!land || !isLand(cell)) {
      const lake = features[cells.f[cell]]?.type === "lake";
      raster.terrain[i] =
        !lake && depth[i] < 12 + (valueNoise(x, y, 9, seed + 2) - 0.5) * 3 ? Terrain.DeepWater : Terrain.Water;
      continue;
    }
    const h = cells.h[cell];
    elevation[i] = Math.max(0, (h - 20) / 80);
    raster.terrain[i] = landTerrain(x, y, cells.biome[cell], h, seed, scale);
    const temp = grid.cells.temp[cells.g[cell]] ?? 10;
    snowLine[i] = Math.max(30, Math.min(255, Math.round(175 + temp * 11)));
  }

  smooth(elevation, width, height, Math.max(2, Math.round(grid.spacing * scale * 0.6)));
  const ridgeScale = 14 * (scale / WORLD_SCALE);
  for (let i = 0; i < elevation.length; i++) {
    if (isOpenWater(raster.terrain[i])) continue;
    const x = i % width;
    const y = (i - x) / width;
    const e = elevation[i];
    const ridge = 1 - Math.abs(2 * fbm(x, y, ridgeScale, 3, seed + 21) - 1);
    const upland = Math.max(0, Math.min(1, (e - 0.3) / 0.3));
    raster.elevation[i] = Math.round(Math.min(255, e * 200 + ridge * upland * 70 + fbm(x, y, 8, 2, seed + 22) * 8));
  }
  smooth(snowLine, width, height, 3);
  raster.snowLine = snowLine;
  return { raster, cellOf, scale, area };
}

/** State tint and dashed borders from the cell under each pixel; either can be switched off */
export function applyPolitics(build: TerrainBuild, tint: boolean, borders: boolean): void {
  const { raster, cellOf } = build;
  const region = raster.region ?? new Uint16Array(cellOf.length);
  for (let i = 0; i < cellOf.length; i++) region[i] = pack.cells.state[cellOf[i]];
  raster.region = tint || borders ? region : null;
  raster.regionColors = tint ? pack.states.map((state, i) => (i && !state.removed ? stateColor(state.color) : 0)) : [];
  raster.borders = borders;
  raster.markDirty(0, 0, raster.width, raster.height);
}

/** Rivers and routes as fixed-width lines over the ground; returns stamps tagged with what they draw */
export function lineStamps(build: TerrainBuild, rivers: boolean, routes: boolean): Stamp[] {
  const stamps: Stamp[] = [];
  if (rivers) for (const river of pack.rivers) stamps.push(...riverStamp(river, build));
  if (routes) for (const route of pack.routes) stamps.push(...routeStamp(route, build));
  return stamps;
}

function landTerrain(x: number, y: number, biome: number, h: number, seed: number, scale: number): TerrainId {
  let t = BIOME_TERRAIN[biome] ?? Terrain.Grass;
  if (t === Terrain.Water) t = Terrain.Grass;
  if (t === Terrain.Snow) return t;
  if (h >= 62) return Terrain.Mountains;
  const woods = fbm(x, y, 22 * (scale / WORLD_SCALE), 3, seed + 31);
  if (FORESTS.includes(t) && woods < 0.36)
    t = t === Terrain.Taiga ? Terrain.Tundra : Terrain.Grass; // clearings
  else if (t === Terrain.Grass && woods > 0.68) t = Terrain.Forest; // copses
  if (h >= 46 && OPEN_LAND.includes(t)) return Terrain.Hills;
  return t;
}

/** Fill each Voronoi cell's polygon with its index, sampling pixel centres so neighbours share no pixels */
function rasterizeCells(
  polygons: number[][],
  points: [number, number][],
  width: number,
  height: number,
  scale: number,
  area: MapArea
) {
  const cellOf = new Int32Array(width * height).fill(-1);
  const xs: number[] = [];
  for (let cell = 0; cell < polygons.length; cell++) {
    const poly = polygons[cell].map(v => [(points[v][0] - area.x) * scale, (points[v][1] - area.y) * scale]);
    if (poly.length < 3) continue;
    let minY = Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const [px, py] of poly) {
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
    }
    if (maxX < 0 || maxY < 0 || minX > width || minY > height) continue;
    const y0 = Math.max(0, Math.ceil(minY - 0.5));
    const y1 = Math.min(height - 1, Math.floor(maxY - 0.5));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      xs.length = 0;
      for (let k = 0; k < poly.length; k++) {
        const [ax, ay] = poly[k];
        const [bx, by] = poly[(k + 1) % poly.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k] - 0.5));
        const xb = Math.min(width - 1, Math.floor(xs[k + 1] - 0.5));
        for (let x = xa; x <= xb; x++) cellOf[y * width + x] = cell;
      }
    }
  }
  // stragglers on the map edge take their left or upper neighbour
  for (let i = 0; i < cellOf.length; i++)
    if (cellOf[i] < 0) cellOf[i] = i % width ? cellOf[i - 1] : i >= width ? cellOf[i - width] : 0;
  for (let i = cellOf.length - 1; i >= 0; i--) if (cellOf[i] < 0) cellOf[i] = cellOf[i + 1] ?? 0;
  return cellOf;
}

/** Two passes of a box blur in each direction, close to a gaussian */
function smooth(values: Float32Array | Uint8Array, width: number, height: number, radius: number): void {
  const temp = new Float32Array(values.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      const row = y * width;
      for (let x = -radius; x <= radius; x++) sum += values[row + Math.min(width - 1, Math.max(0, x))];
      for (let x = 0; x < width; x++) {
        temp[row + x] = sum / (2 * radius + 1);
        sum += values[row + Math.min(width - 1, x + radius + 1)] - values[row + Math.max(0, x - radius)];
      }
    }
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) sum += temp[Math.min(height - 1, Math.max(0, y)) * width + x];
      for (let y = 0; y < height; y++) {
        values[y * width + x] = sum / (2 * radius + 1);
        sum += temp[Math.min(height - 1, y + radius + 1) * width + x] - temp[Math.max(0, y - radius) * width + x];
      }
    }
  }
}

/** A river as a line of water pixels, widening downstream with its flow */
function riverStamp(river: (typeof pack.rivers)[number], build: TerrainBuild): Stamp[] {
  if (!river.cells || river.cells.length < 2) return [];
  const points = Rivers.addMeandering(river.cells, (river.points as [number, number][] | undefined) ?? null);
  const { scale, area } = build;
  const pixels: [number, number][] = [];
  for (let k = 1; k < points.length; k++) {
    const [x0, y0, flux] = points[k - 1];
    const [x1, y1] = points[k];
    const width = Math.max(1, Math.round((flux > 900 ? 1.2 : flux > 250 ? 0.8 : 0.4) * scale));
    linePixels(
      (x0 - area.x) * scale,
      (y0 - area.y) * scale,
      (x1 - area.x) * scale,
      (y1 - area.y) * scale,
      width,
      0,
      pixels
    );
  }
  return [pixelStamp(pixels, packRGB(Palette.water), packRGB(Palette.water2))];
}

// Azgaar's route groups, drawn as fixed-width lines: they are data, not paint
// widths in map pixels, as Azgaar's strokes are; never thinner than one game pixel
const ROUTE_STYLE: Record<string, { width: number; dash: number; color: number }> = {
  roads: { width: 0.8, dash: 0, color: packRGB([168, 52, 36]) },
  trails: { width: 0.4, dash: 0, color: packRGB([132, 92, 52]) },
  searoutes: { width: 0.4, dash: 3, color: packRGB(Palette.foam) },
  paths: { width: 0.4, dash: 2, color: packRGB([120, 92, 58]) }
};
const PATH_STYLE = { width: 0.4, dash: 2, color: packRGB([120, 96, 64]) };

/** One route as fixed-width pixels: chaikin-rounded, dashed for paths and sea lanes */
export function routeStamp(route: (typeof pack.routes)[number], build: TerrainBuild): (Stamp & { route: number })[] {
  if (!route.points || route.points.length < 2) return [];
  const { scale, area } = build;
  const style = ROUTE_STYLE[route.group] ?? PATH_STYLE;
  const unit = scale / WORLD_SCALE;
  const pts = chaikin(route.points.map(([x, y]) => [(x - area.x) * scale, (y - area.y) * scale] as [number, number]));
  const pixels: [number, number][] = [];
  const width = Math.max(1, Math.round(style.width * scale));
  const dash = Math.round(style.dash * unit);
  let step = 0;
  for (let k = 1; k < pts.length; k++)
    step = linePixels(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], width, dash, pixels, step);
  return [{ ...pixelStamp(pixels, style.color), route: route.i }];
}

/** Pixels along a segment, `width` thick, skipping alternate runs of `dash`; returns the running step count */
function linePixels(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  dash: number,
  out: [number, number][],
  step = 0
): number {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const half = Math.floor((width - 1) / 2);
  for (let j = 0; j < n; j++, step++) {
    if (dash && step % (dash * 2) >= dash) continue;
    const px = Math.round(x0 + ((x1 - x0) * j) / n);
    const py = Math.round(y0 + ((y1 - y0) * j) / n);
    for (let oy = -half; oy < width - half; oy++)
      for (let ox = -half; ox < width - half; ox++) out.push([px + ox, py + oy]);
  }
  return step;
}

function pixelStamp(pixels: [number, number][], color: number, alternate = color): Stamp {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pixels) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + 1);
    y1 = Math.max(y1, y + 1);
  }
  return {
    x0,
    y0,
    x1,
    y1,
    paint: put => {
      for (const [x, y] of pixels) put(x, y, (x * 7 + y * 13) % 5 ? color : alternate);
    }
  };
}

function stateColor(color: string | undefined): number {
  const hex = color?.match(/#([0-9a-f]{6})/i)?.[1];
  if (!hex) return packRGB([150, 150, 150]);
  return packRGB([
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ]);
}

/** Corner-cutting to round off the zigzag between cell centres */
function chaikin(points: [number, number][], passes = 2): [number, number][] {
  let pts = points;
  for (let p = 0; p < passes; p++) {
    const next: [number, number][] = [pts[0]];
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k];
      const [bx, by] = pts[k + 1];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}
