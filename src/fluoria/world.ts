// Turns the loaded Azgaar map into pixel layers. Nothing here invents the world: terrain follows biomes and heights,
// relief follows elevation, snow follows temperature, and rivers, roads, states and towns come from the map itself
import type { MapLabel } from "./labels";
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

export function buildWorld(scale = WORLD_SCALE): {
  raster: PixelRaster;
  labels: MapLabel[];
  markers: SettlementMarker[];
  title: string;
} {
  const { cells, vertices, features } = pack;
  const width = Math.ceil(options.map.graph.width * scale);
  const height = Math.ceil(options.map.graph.height * scale);
  const seed = Number.parseInt(String(options.map.seed), 10) % 100000 || 1;
  const raster = new PixelRaster(width, height, seed);

  const cellOf = rasterizeCells(cells.v, vertices.p, width, height, scale);
  const elevation = new Float32Array(width * height);
  const snowLine = new Uint8Array(width * height);
  const region = new Uint16Array(width * height);
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
    const land = landness[i] > 0.5 + (valueNoise(x, y, 5, seed + 3) - 0.5) * 0.3;
    if (land && !isLand(cell)) cell = cells.c[cell].find(isLand) ?? cell; // coast pushed out: borrow the shore cell
    region[i] = cells.state[cell];
    if (!land || !isLand(cell)) {
      const lake = features[cells.f[cellOf[i]]]?.type === "lake";
      raster.terrain[i] =
        !lake && depth[i] < 12 + (valueNoise(x, y, 9, seed + 2) - 0.5) * 3 ? Terrain.DeepWater : Terrain.Water;
      continue;
    }
    const h = cells.h[cell];
    elevation[i] = Math.max(0, (h - 20) / 80);
    raster.terrain[i] = landTerrain(x, y, cells.biome[cell], h, seed);
    const temp = grid.cells.temp[cells.g[cell]] ?? 10;
    snowLine[i] = Math.max(30, Math.min(255, Math.round(175 + temp * 11)));
  }

  smooth(elevation, width, height, Math.max(2, Math.round(grid.spacing * scale * 0.6)));
  for (let i = 0; i < elevation.length; i++) {
    if (isOpenWater(raster.terrain[i])) continue;
    const x = i % width;
    const y = (i - x) / width;
    const e = elevation[i];
    const ridge = 1 - Math.abs(2 * fbm(x, y, 14, 3, seed + 21) - 1);
    const upland = Math.max(0, Math.min(1, (e - 0.3) / 0.3));
    raster.elevation[i] = Math.round(Math.min(255, e * 200 + ridge * upland * 70 + fbm(x, y, 8, 2, seed + 22) * 8));
  }
  smooth(snowLine, width, height, 3);

  drawRivers(raster, scale);
  const towns = pack.burgs.filter(b => b?.i && !b.removed && b.name);

  raster.region = region;
  raster.regionColors = pack.states.map((state, i) => (i && !state.removed ? stateColor(state.color) : 0));
  raster.snowLine = snowLine;
  raster.stamps = pack.routes.flatMap(route => routeStamp(route, scale));
  const markers: SettlementMarker[] = towns.map(burg => ({
    id: burg.i,
    x: burg.x * scale,
    y: burg.y * scale,
    kind: burg.capital ? "capital" : settlementKind(burg.population ?? 0),
    minZoom: burg.capital ? 0 : (burg.population ?? 0) > 5 ? 0.5 : (burg.population ?? 0) > 1 ? 1 : 2
  }));

  const labels: MapLabel[] = [
    ...pack.states
      .filter(state => state.i && !state.removed && state.pole)
      .map(state => ({
        id: `state-${state.i}`,
        text: state.name,
        x: (state.pole as number[])[0] * scale,
        y: (state.pole as number[])[1] * scale,
        priority: 100000 + (state.cells ?? 0),
        size: 22,
        maxZoom: 1
      })),
    ...towns.map(burg => {
      const pop = burg.population ?? 0;
      return {
        id: `burg-${burg.i}`,
        text: burg.label?.text || burg.name || "",
        x: burg.x * scale,
        y: burg.y * scale - 10 / 2,
        priority: (burg.capital ? 50000 : 0) + pop,
        size: burg.capital ? 16 : 13,
        minZoom: burg.capital ? 1 : pop > 5 ? 2 : pop > 1 ? 3 : 4
      };
    })
  ];
  return { raster, labels, markers, title: options.map.lore?.name || "World" };
}

export interface SettlementMarker {
  id: number;
  x: number;
  y: number;
  kind: "capital" | "city" | "town" | "village";
  minZoom: number;
}

const settlementKind = (population: number): SettlementMarker["kind"] =>
  population > 5 ? "city" : population > 1 ? "town" : "village";

function landTerrain(x: number, y: number, biome: number, h: number, seed: number): TerrainId {
  let t = BIOME_TERRAIN[biome] ?? Terrain.Grass;
  if (t === Terrain.Water) t = Terrain.Grass;
  if (t === Terrain.Snow) return t;
  if (h >= 62) return Terrain.Mountains;
  const woods = fbm(x, y, 22, 3, seed + 31);
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
  scale: number
) {
  const cellOf = new Int32Array(width * height).fill(-1);
  const xs: number[] = [];
  for (let cell = 0; cell < polygons.length; cell++) {
    const poly = polygons[cell].map(v => points[v]);
    if (poly.length < 3) continue;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, py] of poly) {
      minY = Math.min(minY, py * scale);
      maxY = Math.max(maxY, py * scale);
    }
    const y0 = Math.max(0, Math.ceil(minY - 0.5));
    const y1 = Math.min(height - 1, Math.floor(maxY - 0.5));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      xs.length = 0;
      for (let k = 0; k < poly.length; k++) {
        const [ax, ay] = poly[k];
        const [bx, by] = poly[(k + 1) % poly.length];
        const y1s = ay * scale;
        const y2s = by * scale;
        if ((y1s <= yc && y2s > yc) || (y2s <= yc && y1s > yc))
          xs.push(ax * scale + ((yc - y1s) / (y2s - y1s)) * (bx - ax) * scale);
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

function drawRivers(raster: PixelRaster, scale: number): void {
  for (const river of pack.rivers) {
    if (!river.cells || river.cells.length < 2) continue;
    const points = Rivers.addMeandering(river.cells, (river.points as [number, number][] | undefined) ?? null);
    for (let k = 1; k < points.length; k++) {
      const [x0, y0, f0] = points[k - 1];
      const [x1, y1] = points[k];
      const width = f0 > 900 ? 3 : f0 > 250 ? 2 : 1;
      line(raster, x0 * scale, y0 * scale, x1 * scale, y1 * scale, width, Terrain.River, t => !isOpenWater(t));
    }
  }
}

// Azgaar's route groups, drawn as fixed-width lines: they are data, not paint
const ROUTE_STYLE: Record<string, { width: number; dash: number; color: number }> = {
  roads: { width: 2, dash: 0, color: packRGB([168, 52, 36]) },
  trails: { width: 1, dash: 0, color: packRGB([132, 92, 52]) },
  searoutes: { width: 1, dash: 3, color: packRGB(Palette.foam) }
};
const PATH_STYLE = { width: 1, dash: 2, color: packRGB([120, 96, 64]) };

/** One route as a stamp: a chaikin-rounded line of fixed width, dashed for paths and sea lanes */
function routeStamp(route: (typeof pack.routes)[number], scale: number): Stamp[] {
  if (!route.points || route.points.length < 2) return [];
  const style = ROUTE_STYLE[route.group] ?? PATH_STYLE;
  const pts = chaikin(route.points.map(([x, y]) => [x * scale, y * scale] as [number, number]));
  const pixels: [number, number][] = [];
  let step = 0;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1];
    const [x1, y1] = pts[k];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let j = 0; j < n; j++, step++) {
      if (style.dash && step % (style.dash * 2) >= style.dash) continue;
      const px = Math.round(x0 + ((x1 - x0) * j) / n);
      const py = Math.round(y0 + ((y1 - y0) * j) / n);
      pixels.push([px, py]);
      if (style.width === 2) pixels.push([px + 1, py], [px, py + 1]);
    }
  }
  const xs = pixels.map(p => p[0]);
  const ys = pixels.map(p => p[1]);
  return [
    {
      x0: Math.min(...xs),
      y0: Math.min(...ys),
      x1: Math.max(...xs) + 1,
      y1: Math.max(...ys) + 1,
      paint: put => {
        for (const [x, y] of pixels) put(x, y, style.color);
      }
    }
  ];
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

function line(
  raster: PixelRaster,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  terrain: TerrainId,
  allowed: (t: number) => boolean
): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const half = Math.floor((width - 1) / 2);
  for (let k = 0; k <= steps; k++) {
    const px = Math.round(x0 + ((x1 - x0) * k) / steps);
    const py = Math.round(y0 + ((y1 - y0) * k) / steps);
    for (let oy = -half; oy < width - half; oy++)
      for (let ox = -half; ox < width - half; ox++) {
        const x = px + ox;
        const y = py + oy;
        if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) continue;
        const i = y * raster.width + x;
        if (allowed(raster.terrain[i])) raster.terrain[i] = terrain;
      }
  }
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
