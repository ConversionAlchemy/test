// Turns the loaded Azgaar map into pixel layers. Nothing here invents the world: terrain follows biomes and heights,
// relief follows elevation, snow follows temperature, and rivers, roads, states and towns come from the map itself
import { fbm, valueNoise } from "./noise";
import { Palette, packRGB } from "./palette";
import { PixelRaster, type Stamp } from "./raster";
import { Terrain, type TerrainId } from "./terrain";

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

/** The whole map's smooth fields, kept from the world build so close-up tiles sample them instead of blurring */
export interface WorldFields {
  width: number;
  height: number;
  scale: number;
  landness: Float32Array;
  depth: Float32Array;
  elevation: Float32Array;
  snowLine: Uint8Array;
}

export const wholeMap = (): MapArea => ({
  x: 0,
  y: 0,
  width: options.map.graph.width,
  height: options.map.graph.height
});

const mapSeed = () => Number.parseInt(String(options.map.seed), 10) % 100000 || 1;
const isLand = (cell: number) => Boolean(pack.features[pack.cells.f[cell]]?.land);

/** The whole map at world scale: everything that comes from heights, biomes and temperature */
export function buildTerrain(scale = WORLD_SCALE, area: MapArea = wholeMap()): TerrainBuild & { fields: WorldFields } {
  const { cells, vertices } = pack;
  const width = Math.ceil(area.width * scale);
  const height = Math.ceil(area.height * scale);
  const seed = mapSeed();
  const ox = Math.round(area.x * scale);
  const oy = Math.round(area.y * scale);
  const raster = new PixelRaster(width, height, seed, ox, oy);

  const cellOf = rasterizeCells(cells.v, vertices.p, width, height, scale, area);
  const elevation = new Float32Array(width * height);
  const snowLine = new Uint8Array(width * height);
  const landness = new Float32Array(width * height);
  const depth = new Float32Array(width * height);
  for (let i = 0; i < cellOf.length; i++) {
    const cell = cellOf[i];
    landness[i] = isLand(cell) ? 1 : 0;
    depth[i] = Math.min(20, cells.h[cell]);
    if (isLand(cell)) elevation[i] = Math.max(0, (cells.h[cell] - 20) / 80);
    const temp = grid.cells.temp[cells.g[cell]] ?? 10;
    snowLine[i] = Math.max(30, Math.min(255, Math.round(175 + temp * 11)));
  }
  // Voronoi edges are straight: blur land and depth so coasts and deeps come out rounded, as Azgaar draws them
  const cellPixels = Math.max(1, Math.round(grid.spacing * scale * 0.45));
  smooth(landness, width, height, cellPixels);
  smooth(depth, width, height, cellPixels * 2);
  smooth(elevation, width, height, Math.max(2, Math.round(grid.spacing * scale * 0.6)));
  smooth(snowLine, width, height, 3);

  const fields = { width, height, scale, landness, depth, elevation, snowLine };
  const build = { raster, cellOf, scale, area };
  fillTerrain(build, fields, 0, height);
  raster.snowLine = snowLine;
  return { ...build, fields };
}

/** Tile side in game pixels, and the apron around it that edge effects read but nothing shows */
export const TILE = 512;
export const APRON = 8;

/** One square of the map at a close-up scale, built a few rows at a time: step it until it returns true */
export function tileBuilder(
  fields: WorldFields,
  scale: number,
  col: number,
  row: number
): { build: TerrainBuild; crop: { x: number; y: number; x1: number; y1: number }; step: (rows: number) => boolean } {
  const map = wholeMap();
  const ox = col * TILE - APRON;
  const oy = row * TILE - APRON;
  const core = {
    x1: Math.min(TILE, Math.ceil(map.width * scale) - col * TILE),
    y1: Math.min(TILE, Math.ceil(map.height * scale) - row * TILE)
  };
  const width = core.x1 + 2 * APRON;
  const height = core.y1 + 2 * APRON;
  const area = { x: ox / scale, y: oy / scale, width: width / scale, height: height / scale };
  const raster = new PixelRaster(width, height, mapSeed(), ox, oy);
  const cellOf = rasterizeCells(pack.cells.v, pack.vertices.p, width, height, scale, area);
  const build = { raster, cellOf, scale, area };
  const snowLine = new Uint8Array(width * height);
  raster.snowLine = snowLine;
  let done = 0;
  return {
    build,
    crop: { x: APRON, y: APRON, x1: APRON + core.x1, y1: APRON + core.y1 },
    step: rows => {
      const next = Math.min(height, done + rows);
      fillTerrain(build, fields, done, next, snowLine);
      done = next;
      return done >= height;
    }
  };
}

/** Terrain and elevation for rows y0…y1, from the world fields sampled at this build's scale */
function fillTerrain(build: TerrainBuild, fields: WorldFields, y0: number, y1: number, snowOut?: Uint8Array): void {
  const { raster, cellOf, scale } = build;
  const { cells, features } = pack;
  const seed = raster.seed;
  const unit = scale / WORLD_SCALE;
  const same = fields.scale === scale && fields.width === raster.width && raster.ox === 0 && raster.oy === 0;
  const k = fields.scale / scale;
  const sample = (field: Float32Array | Uint8Array, gx: number, gy: number, i: number) =>
    same ? field[i] : bilinear(field, fields.width, fields.height, (gx + 0.5) * k - 0.5, (gy + 0.5) * k - 0.5);

  for (let y = y0; y < y1; y++)
    for (let x = 0; x < raster.width; x++) {
      const i = y * raster.width + x;
      const gx = x + raster.ox;
      const gy = y + raster.oy;
      let cell = cellOf[i];
      if (snowOut) snowOut[i] = sample(fields.snowLine, gx, gy, i);
      const fine = unit > 1 ? (valueNoise(gx, gy, 3, seed + 7) - 0.5) * 0.14 : 0; // close up, coasts get finer bays
      const land =
        sample(fields.landness, gx, gy, i) > 0.5 + (valueNoise(gx, gy, 5 * unit, seed + 3) - 0.5) * 0.3 + fine;
      if (land && !isLand(cell)) cell = cells.c[cell].find(isLand) ?? cell; // coast pushed out: borrow the shore cell
      cellOf[i] = cell;
      if (!land || !isLand(cell)) {
        const lake = features[cells.f[cell]]?.type === "lake";
        const depth = sample(fields.depth, gx, gy, i);
        raster.terrain[i] =
          !lake && depth < 12 + (valueNoise(gx, gy, 9 * unit, seed + 2) - 0.5) * 3 ? Terrain.DeepWater : Terrain.Water;
        raster.elevation[i] = 0;
        continue;
      }
      raster.terrain[i] = landTerrain(gx, gy, cells.biome[cell], cells.h[cell], seed, scale);
      const e = sample(fields.elevation, gx, gy, i);
      const ridge = 1 - Math.abs(2 * fbm(gx, gy, 14 * unit, 3, seed + 21) - 1);
      const upland = Math.max(0, Math.min(1, (e - 0.3) / 0.3));
      raster.elevation[i] = Math.round(Math.min(255, e * 200 + ridge * upland * 70 + fbm(gx, gy, 8, 2, seed + 22) * 8));
    }
}

function bilinear(field: Float32Array | Uint8Array, width: number, height: number, fx: number, fy: number): number {
  const x = Math.max(0, Math.min(width - 1.001, fx));
  const y = Math.max(0, Math.min(height - 1.001, fy));
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const tx = x - ix;
  const ty = y - iy;
  const i = iy * width + ix;
  const a = field[i];
  const b = field[i + 1];
  const c = field[i + width];
  const d = field[i + width + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** State tint and solid state borders, with dashed province borders from region scale on; either can be off */
export function applyPolitics(build: TerrainBuild, tint: boolean, borders: boolean): void {
  const { raster, cellOf, scale } = build;
  const region = raster.region ?? new Uint16Array(cellOf.length);
  for (let i = 0; i < cellOf.length; i++) region[i] = pack.cells.state[cellOf[i]];
  raster.region = tint || borders ? region : null;
  raster.regionColors = tint ? pack.states.map((state, i) => (i && !state.removed ? stateColor(state.color) : 0)) : [];
  raster.borders = borders;
  raster.borderPx = scale >= 8 ? 2 : 3; // thick when zoomed out, never hairline
  const provinces = borders && scale > WORLD_SCALE && pack.cells.province;
  if (provinces) {
    const sub = raster.subregion ?? new Uint16Array(cellOf.length);
    for (let i = 0; i < cellOf.length; i++) sub[i] = provinces[cellOf[i]] ?? 0;
    raster.subregion = sub;
  } else raster.subregion = null;
  raster.markDirty(0, 0, raster.width, raster.height);
}

/** Rivers and routes as fixed-width lines over the ground; returns stamps tagged with what they draw */
export function lineStamps(build: TerrainBuild, rivers: boolean, routes: boolean): Stamp[] {
  const stamps: Stamp[] = [];
  const { area } = build;
  const near = (points: number[][] | undefined) => {
    if (!points?.length) return false;
    const pad = 4;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of points) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return (
      x1 >= area.x - pad && y1 >= area.y - pad && x0 <= area.x + area.width + pad && y0 <= area.y + area.height + pad
    );
  };
  if (rivers)
    for (const river of pack.rivers)
      if (near(river.cells?.filter(cell => cell >= 0).map(cell => pack.cells.p[cell])))
        stamps.push(...riverStamp(river, build));
  if (routes) for (const route of pack.routes) if (near(route.points)) stamps.push(...routeStamp(route, build));
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

const ICE = [packRGB([232, 238, 242]), packRGB([214, 226, 236]), packRGB([196, 214, 228]), packRGB([168, 190, 210])];

/** Azgaar's glaciers and icebergs as pixel ice with ragged edges; the SVG shapes stay only for clicking */
export function iceStamps(build: TerrainBuild): Stamp[] {
  const { scale, area, raster } = build;
  const seed = raster.seed;
  const stamps: Stamp[] = [];
  for (const ice of pack.ice ?? []) {
    const [dx, dy] = ice.offset ?? [0, 0];
    const poly = ice.points.map(([x, y]) => [(x + dx - area.x) * scale, (y + dy - area.y) * scale] as [number, number]);
    if (poly.length < 3) continue;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of poly) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    if (x1 < 0 || y1 < 0 || x0 > raster.width || y0 > raster.height) continue;
    const pad = 3;
    const box = {
      x0: Math.floor(x0) - pad,
      y0: Math.floor(y0) - pad,
      x1: Math.ceil(x1) + pad,
      y1: Math.ceil(y1) + pad
    };
    const berg = ice.type === "iceberg";
    // ragged edge: test a point nudged by noise, so the outline wobbles instead of following straight polygon sides
    const inside = (x: number, y: number) => {
      const gx = x + raster.ox;
      const gy = y + raster.oy;
      const r = berg ? 0.8 : 2.2;
      const jx = (valueNoise(gx, gy, 3, seed + 41) - 0.5) * 2 * r;
      const jy = (valueNoise(gx, gy, 3, seed + 42) - 0.5) * 2 * r;
      return pointInPolygon(x + 0.5 + jx, y + 0.5 + jy, poly);
    };
    // the mask is worked out once, the first time any part of the shape is drawn
    const mx = Math.max(0, box.x0 - 1);
    const my = Math.max(0, box.y0 - 1);
    const mw = Math.min(raster.width, box.x1 + 1) - mx;
    const mh = Math.min(raster.height, box.y1 + 1) - my;
    let mask: Uint8Array | null = null;
    const solid = (x: number, y: number) => {
      if (!mask) {
        mask = new Uint8Array(mw * mh);
        for (let yy = 0; yy < mh; yy++)
          for (let xx = 0; xx < mw; xx++) mask[yy * mw + xx] = inside(xx + mx, yy + my) ? 1 : 0;
      }
      const lx = x - mx;
      const ly = y - my;
      return lx >= 0 && ly >= 0 && lx < mw && ly < mh && mask[ly * mw + lx] === 1;
    };
    stamps.push({
      ...box,
      paint: (put, clip) => {
        for (let y = Math.max(clip.y, box.y0); y < Math.min(clip.y1, box.y1); y++)
          for (let x = Math.max(clip.x, box.x0); x < Math.min(clip.x1, box.x1); x++) {
            if (!solid(x, y)) continue;
            const gx = x + raster.ox;
            const gy = y + raster.oy;
            const edge = !solid(x + 1, y) || !solid(x, y + 1) || !solid(x - 1, y) || !solid(x, y - 1);
            const lit = !solid(x - 1, y - 1); // light from the north-west
            const n = valueNoise(gx, gy, berg ? 2 : 6, seed + 43);
            let c = n > 0.62 ? ICE[0] : n > 0.38 ? ICE[1] : ICE[2];
            if (!berg && valueNoise(gx, gy, 2, seed + 44) > 0.86) c = ICE[3]; // crevasses
            if (edge) c = lit ? ICE[0] : ICE[3];
            put(x, y, c);
          }
      }
    });
  }
  return stamps;
}

function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
