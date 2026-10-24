import { fbm, hash2, valueNoise } from "./noise";
import { Palette, packRGB, type Swatch } from "./palette";
import { isLine, isOpenWater, isWater, Overlay, Terrain } from "./terrain";

/** Side of one texture chunk in game pixels; a power of two so mipmaps work below 1× */
export const CHUNK = 256;

const C = Object.fromEntries(Object.entries(Palette).map(([k, v]) => [k, packRGB(v)])) as Record<Swatch, number>;

/** Something drawn on top of the ground after colouring, such as a town's roofs, clipped to whatever is rendering */
export interface Stamp {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** `clip` is the area being rendered; a stamp may skip work outside it */
  paint: (put: (x: number, y: number, color: number) => void, clip: Rect) => void;
}

export interface Rect {
  x: number;
  y: number;
  x1: number;
  y1: number;
}

/** Elevation (0–255) above which land is snow-covered; jittered so the line is ragged */
const SNOW_LINE = 205;

/**
 * A grid of game pixels seen from straight above: terrain, elevation and overlay per pixel, and the colour each
 * renders to. Colours are derived, never stored by hand, so painting only changes the data layers.
 */
export class PixelRaster {
  readonly terrain: Uint8Array;
  readonly elevation: Uint8Array; // 0 lowland … 255 highest peak; drives relief shading and snow
  readonly overlay: Uint8Array;
  readonly amount: Uint8Array;
  readonly pixels: Uint32Array;
  /** Optional political layer: region id per pixel, tinted by `regionColors` and outlined with dashed borders */
  region: Uint16Array | null = null;
  /** Optional per-pixel snow line (0–255), so cold places snow lower than warm ones */
  snowLine: Uint8Array | null = null;
  regionColors: number[] = [];
  borders = true;
  /** State border width in game pixels */
  borderPx = 1;
  /** Optional second level of regions (provinces), outlined with a thin dashed line */
  subregion: Uint16Array | null = null;
  stamps: Stamp[] = [];
  readonly cols: number;
  readonly rows: number;
  private dirty = new Map<number, Rect>(); // chunk id → the part of it that needs recolouring

  /** `ox`, `oy`: where this raster sits among all game pixels at its scale, so tiles share one texture */
  constructor(
    readonly width: number,
    readonly height: number,
    readonly seed = 1,
    readonly ox = 0,
    readonly oy = 0
  ) {
    const size = width * height;
    this.terrain = new Uint8Array(size).fill(Terrain.Grass);
    this.elevation = new Uint8Array(size);
    this.overlay = new Uint8Array(size);
    this.amount = new Uint8Array(size);
    this.pixels = new Uint32Array(size);
    this.cols = Math.ceil(width / CHUNK);
    this.rows = Math.ceil(height / CHUNK);
    this.markDirty(0, 0, width, height);
  }

  /** Index of a global pixel, clamped to this raster */
  private at(x: number, y: number): number {
    const lx = x - this.ox;
    const ly = y - this.oy;
    const cx = lx < 0 ? 0 : lx >= this.width ? this.width - 1 : lx;
    const cy = ly < 0 ? 0 : ly >= this.height ? this.height - 1 : ly;
    return cy * this.width + cx;
  }

  /** Terrain at a global pixel */
  terrainAt(x: number, y: number): number {
    return this.terrain[this.at(x, y)];
  }

  /** Elevation at a global pixel */
  elevationAt(x: number, y: number): number {
    return this.elevation[this.at(x, y)];
  }

  /** Light from the north-west: slopes facing it brighten, slopes away darken, in hard steps */
  relief(x: number, y: number): number {
    const e = (dx: number, dy: number) => this.elevationAt(x + dx, y + dy);
    const slope = (e(-2, -2) + e(-2, 0) + e(0, -2) - e(2, 2) - e(2, 0) - e(0, 2)) / 3;
    const f = Math.max(0.6, Math.min(1.32, 1 - slope * 0.022));
    return 1 + Math.round((f - 1) / 0.08) * 0.08;
  }

  /** Flag the rectangle (padded for edge effects that read neighbours) as needing recolour, chunk by chunk */
  markDirty(x0: number, y0: number, x1: number, y1: number): void {
    const pad = 4;
    const ax = Math.max(0, Math.floor(x0 - pad));
    const ay = Math.max(0, Math.floor(y0 - pad));
    const bx = Math.min(this.width, Math.ceil(x1 + pad));
    const by = Math.min(this.height, Math.ceil(y1 + pad));
    for (let r = Math.floor(ay / CHUNK); r <= Math.floor((by - 1) / CHUNK); r++)
      for (let c = Math.floor(ax / CHUNK); c <= Math.floor((bx - 1) / CHUNK); c++) {
        const id = r * this.cols + c;
        const area = {
          x: Math.max(ax, c * CHUNK),
          y: Math.max(ay, r * CHUNK),
          x1: Math.min(bx, (c + 1) * CHUNK),
          y1: Math.min(by, (r + 1) * CHUNK)
        };
        const old = this.dirty.get(id);
        this.dirty.set(
          id,
          old
            ? {
                x: Math.min(old.x, area.x),
                y: Math.min(old.y, area.y),
                x1: Math.max(old.x1, area.x1),
                y1: Math.max(old.y1, area.y1)
              }
            : area
        );
      }
  }

  /** Recolour dirty chunks (only those `wanted` picks, at most `limit`), handing back what changed */
  flush(wanted?: (id: number) => boolean, limit = Infinity): { id: number; rect: Rect }[] {
    const done: { id: number; rect: Rect }[] = [];
    for (const [id, rect] of this.dirty) {
      if (done.length >= limit) break;
      if (wanted && !wanted(id)) continue;
      this.dirty.delete(id);
      this.render(rect.x, rect.y, rect.x1 - rect.x, rect.y1 - rect.y);
      done.push({ id, rect });
    }
    return done;
  }

  chunkRect(id: number): { x: number; y: number; w: number; h: number } {
    const x = (id % this.cols) * CHUNK;
    const y = Math.floor(id / this.cols) * CHUNK;
    return { x, y, w: Math.min(CHUNK, this.width - x), h: Math.min(CHUNK, this.height - y) };
  }

  get pending(): number {
    return this.dirty.size;
  }

  render(x0: number, y0: number, w: number, h: number): void {
    for (let y = y0; y < y0 + h; y++) {
      const row = y * this.width;
      for (let x = x0; x < x0 + w; x++) this.pixels[row + x] = this.colorAt(x + this.ox, y + this.oy);
    }
    const x1 = x0 + w;
    const y1 = y0 + h;
    const put = (x: number, y: number, color: number) => {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) this.pixels[y * this.width + x] = color;
    };
    for (const stamp of this.stamps)
      if (stamp.x1 >= x0 && stamp.x0 < x1 && stamp.y1 >= y0 && stamp.y0 < y1)
        stamp.paint(put, { x: x0, y: y0, x1, y1 });
  }

  /** Colour of a global pixel */
  colorAt(x: number, y: number): number {
    const s = this.seed;
    const own = this.terrainAt(x, y);
    // ragged, coherent edges: borrow the terrain a pixel or two away, but never across the shoreline
    const jx = Math.floor(valueNoise(x, y, 2.5, s + 11) * 5) - 2;
    const jy = Math.floor(valueNoise(x, y, 2.5, s + 12) * 5) - 2;
    let t = this.terrainAt(x + jx, y + jy);
    if (isWater(t) !== isWater(own) || isLine(t) || isLine(own)) t = own;

    let color = t === Terrain.River ? this.river(x, y) : isWater(t) ? this.water(x, y, t) : this.land(x, y, t);
    const i = this.at(x, y);
    if (this.region && !isOpenWater(own)) color = this.political(x, y, color);
    if (this.overlay[i]) color = this.applyOverlay(x, y, color, this.overlay[i], this.amount[i]);
    return color;
  }

  /** State tint, and a dashed border wherever the region changes */
  private political(x: number, y: number, color: number): number {
    const region = this.region as Uint16Array;
    const i = this.at(x, y);
    const lx = x - this.ox;
    const ly = y - this.oy;
    const id = region[i];
    if (this.borders) {
      const other = (dx: number, dy: number) => {
        if (lx + dx >= this.width || ly + dy >= this.height) return false;
        const j = i + dy * this.width + dx;
        return !isOpenWater(this.terrain[j]) && region[j] !== id;
      };
      for (let d = 1; d <= this.borderPx; d++) if (other(d, 0) || other(0, d)) return mixP(color, C.ink, 0.75);
      const sub = this.subregion;
      if (sub && (x + y) % 4 < 2) {
        const right = lx + 1 < this.width && !isOpenWater(this.terrain[i + 1]) && sub[i + 1] !== sub[i];
        const down =
          ly + 1 < this.height && !isOpenWater(this.terrain[i + this.width]) && sub[i + this.width] !== sub[i];
        if (right || down) return mixP(color, C.ink, 0.55);
      }
    }
    const tint = this.regionColors[id];
    if (!tint) return color;
    const high = Math.min(1, this.elevation[i] / 190); // lighter on high ground, so relief shows through
    return mixP(color, tint, 0.22 * (1 - high * 0.65));
  }

  private river(x: number, y: number): number {
    return hash2(x, y, this.seed + 9) < 0.3 ? C.water2 : C.water;
  }

  private water(x: number, y: number, t: number): number {
    const s = this.seed;
    const shore = this.distanceTo(x, y, false, 3);
    if (shore === 1) return (x + y) % 2 ? C.foam : C.water2;
    const n = fbm(x, y, 14, 2, s + 1);
    const checker = (x + y) % 2 === 0;
    if (shore === 2 && checker) return C.water2;
    if (t === Terrain.DeepWater) return n > 0.62 && checker ? C.water : C.deep;
    if (n > 0.6 && checker) return C.water2;
    if (n < 0.38 && checker) return C.deep;
    return C.water;
  }

  private land(x: number, y: number, t: number): number {
    const s = this.seed;
    const macro = 0.94 + (fbm(x, y, 48, 2, s + 5) - 0.5) * 0.24;
    if (t !== Terrain.Sand && t !== Terrain.Snow && this.distanceTo(x, y, true, 1) === 1) {
      if (t === Terrain.Mountains || t === Terrain.Cobbles) return shadeP(C.stone2, macro);
      return hash2(x, y, s + 2) < 0.6 ? C.sand : C.sand2;
    }
    const relief = this.relief(x, y);
    const line = this.snowLine ? this.snowLine[this.at(x, y)] : SNOW_LINE;
    if (this.elevationAt(x, y) > line + (valueNoise(x, y, 6, s + 4) - 0.5) * 40)
      return shadeP(hash2(x, y, s + 6) < 0.12 ? packRGB([210, 214, 222]) : C.snow, relief);
    let c: number;
    switch (t) {
      case Terrain.Sand:
        c = hash2(x, y, s + 3) < 0.65 ? C.sand : C.sand2;
        break;
      case Terrain.Forest:
        c = this.forest(x, y);
        break;
      case Terrain.Hills:
        c = this.hills(x, y);
        break;
      case Terrain.Mountains:
        c = this.mountains(x, y);
        break;
      case Terrain.Farmland:
        c = this.farmland(x, y);
        break;
      case Terrain.Marsh:
        c = this.marsh(x, y);
        break;
      case Terrain.Dirt:
        c = this.dirt(x, y);
        break;
      case Terrain.Cobbles:
        c = this.cobbles(x, y);
        break;
      case Terrain.DryGrass:
        c = mixP(this.grass(x, y), C.field1, 0.45);
        break;
      case Terrain.Desert:
        c = this.desert(x, y);
        break;
      case Terrain.Taiga:
        c = this.forest(x, y, TAIGA);
        break;
      case Terrain.Jungle:
        c = this.forest(x, y, JUNGLE);
        break;
      case Terrain.Tundra:
        c = this.tundra(x, y);
        break;
      case Terrain.Snow:
        c = hash2(x, y, s + 6) < 0.12 ? packRGB([210, 214, 222]) : C.snow;
        break;
      default:
        c = this.grass(x, y);
    }
    return shadeP(c, macro * relief);
  }

  private grass(x: number, y: number): number {
    const s = this.seed;
    const n = valueNoise(x, y, 6, s + 20);
    const r = hash2(x, y, s + 21);
    if (r > 0.9985) return r > 0.9993 ? packRGB([206, 200, 182]) : packRGB([188, 178, 116]);
    if (r < 0.05) return C.g4;
    return n > 0.56 ? C.g2 : n > 0.42 ? C.g1 : C.g3;
  }

  private desert(x: number, y: number): number {
    const s = this.seed;
    const ripple = (x + Math.floor(y * 0.5) + Math.floor(valueNoise(x, y, 7, s + 85) * 8)) % 5 === 0;
    if (ripple) return C.sand2;
    return hash2(x, y, s + 86) < 0.08 ? shadeP(C.sand, 1.06) : C.sand;
  }

  private tundra(x: number, y: number): number {
    const s = this.seed;
    const r = hash2(x, y, s + 87);
    if (r < 0.06) return C.snow;
    if (r < 0.12) return C.stone;
    return mixP(this.grass(x, y), C.stone3, 0.42);
  }

  private forest(x: number, y: number, crown: readonly number[] = TREE): number {
    const s = this.seed;
    const cx = Math.floor(x / 3);
    const cy = Math.floor(y / 3);
    let hit = -1;
    let shadow = false;
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) {
        const gx = cx + ox;
        const gy = cy + oy;
        if (hash2(gx, gy, s + 30) < 0.12) continue;
        const tx = gx * 3 + Math.floor(hash2(gx, gy, s + 31) * 3);
        const ty = gy * 3 + Math.floor(hash2(gx, gy, s + 32) * 3);
        if (this.terrainAt(tx, ty) !== this.terrainAt(x, y)) continue;
        const dx = x - tx;
        const dy = y - ty;
        const canopy = dx >= -1 && dx <= 1 && dy >= -1 && dy <= 1 ? crown[(dy + 1) * 3 + dx + 1] : 0;
        if (canopy) hit = canopy;
        else if ((dx === 2 && dy === 1) || (dx === 1 && dy === 2) || (dx === 2 && dy === 2)) shadow = true;
      }
    if (hit >= 0) return hit;
    const ground = valueNoise(x, y, 5, s + 33) > 0.5 ? C.g3 : C.g1;
    return shadow ? shadeP(ground, 0.62) : shadeP(ground, 0.86);
  }

  /** Rough upland grass: the shape comes from elevation shading, the texture from scattered rock and bare earth */
  private hills(x: number, y: number): number {
    const r = hash2(x, y, this.seed + 40);
    if (r < 0.04) return C.stone;
    if (r < 0.08) return C.dirt2;
    return this.grass(x, y);
  }

  /** Bare rock from above: mottled stone, scree, dark cracks, and moss creeping in lower down */
  private mountains(x: number, y: number): number {
    const s = this.seed;
    const n = valueNoise(x, y, 4, s + 50);
    const r = hash2(x, y, s + 51);
    const moss = Math.max(0, 1 - this.elevationAt(x, y) / 170);
    if (r < 0.05) return C.stone3;
    if (valueNoise(x, y, 2, s + 52) > 0.82) return shadeP(C.stone2, 0.78);
    const rock = n > 0.55 ? C.stone : n > 0.35 ? C.stone2 : mixP(C.stone2, C.dirt2, 0.4);
    return moss > 0 && hash2(x, y, s + 53) < moss * 0.8 ? mixP(rock, C.g3, 0.55) : rock;
  }

  private fieldCell(x: number, y: number): number {
    const s = this.seed;
    const wx = x + (valueNoise(x, y, 9, s + 60) - 0.5) * 7;
    const wy = y + (valueNoise(x, y, 9, s + 61) - 0.5) * 7;
    return Math.floor(wx / 11) * 7919 + Math.floor(wy / 8);
  }

  private farmland(x: number, y: number): number {
    const s = this.seed;
    const cell = this.fieldCell(x, y);
    const h = hash2(cell, 0, s + 62);
    const crop = h < 0.3 ? C.field1 : h < 0.55 ? C.field2 : h < 0.8 ? C.field3 : C.dirt;
    if (cell !== this.fieldCell(x + 1, y) || cell !== this.fieldCell(x, y + 1)) return shadeP(crop, 0.7);
    const across = hash2(cell, 1, s + 63) < 0.5;
    return (across ? x : y) % 2 === 0 ? shadeP(crop, 0.86) : crop;
  }

  private marsh(x: number, y: number): number {
    const s = this.seed;
    if (valueNoise(x, y, 4, s + 70) > 0.62) return (x + y) % 3 ? C.water : C.water2;
    if (hash2(x, y, s + 71) < 0.07) return C.tree2;
    if (hash2(x, y + 1, s + 71) < 0.07) return C.g4;
    return valueNoise(x, y, 5, s + 72) > 0.5 ? C.g3 : C.g1;
  }

  private dirt(x: number, y: number): number {
    const s = this.seed;
    const r = hash2(x, y, s + 80);
    if (r > 0.985) return C.stone;
    if (r < 0.08) return C.dirt3;
    return valueNoise(x, y, 4, s + 81) > 0.45 ? C.dirt : C.dirt2;
  }

  private cobbles(x: number, y: number): number {
    const row = Math.floor(y / 4);
    const shift = (row % 2) * 2;
    const col = Math.floor((x + shift) / 4);
    const lx = (x + shift) % 4;
    const ly = y % 4;
    if (lx === 3 || ly === 3) return C.gap;
    const h = hash2(col, row, this.seed + 90);
    const stone = h < 0.4 ? C.cob1 : h < 0.75 ? C.cob2 : C.cob3;
    return lx === 0 && ly === 0 ? shadeP(stone, 1.1) : stone;
  }

  private applyOverlay(x: number, y: number, color: number, kind: number, amount: number): number {
    const s = this.seed;
    const a = amount / 255;
    const r = hash2(x, y, s + 100);
    switch (kind) {
      case Overlay.Scorch:
        return r < a * 0.95 ? mixP(color, C.scorch, 0.4 + a * 0.3) : color;
      case Overlay.Blood:
        return r < a ? (hash2(x, y, s + 101) < 0.3 ? C.blood2 : C.blood) : color;
      case Overlay.Rubble: {
        if (r > a * 0.45) return mixP(color, C.scorch, a * 0.25);
        const pick = hash2(x, y, s + 102);
        return pick < 0.33 ? C.cob3 : pick < 0.66 ? C.cob1 : C.stone2;
      }
      case Overlay.Crater:
        if (a < 0.14) return r < 0.5 ? C.dirt3 : C.dirt;
        return mixP(packRGB([78, 64, 50]), packRGB([30, 25, 23]), Math.min(1, (a - 0.14) * 1.3));
      default:
        return color;
    }
  }

  /** Distance (1…max) to the nearest open water (`water`) or land (`!water`), else 0 */
  private distanceTo(x: number, y: number, water: boolean, max: number): number {
    for (let d = 1; d <= max; d++)
      for (let oy = -d; oy <= d; oy++)
        for (let ox = -d; ox <= d; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== d) continue;
          const other = this.terrainAt(x + ox, y + oy);
          if (water ? isOpenWater(other) : !isWater(other)) return d;
        }
    return 0;
  }
}

// a 2×2 crown lit from the top-left, with a dark lower-right pixel; 3×3 around the trunk, 0 = no canopy
const TREE = [0, C.tree3, 0, C.tree3, C.tree, C.tree, 0, C.tree, C.tree2];
// pointed conifers: dark, blue-green, lit tip only
const TAIGA = [
  0,
  packRGB([70, 104, 80]),
  0,
  0,
  packRGB([40, 70, 56]),
  packRGB([34, 58, 48]),
  0,
  packRGB([34, 58, 48]),
  C.ink
];
// broad wet canopy, brighter and denser
const JUNGLE = [C.tree3, packRGB([96, 140, 58]), C.tree3, C.tree3, C.tree3, C.tree, C.tree, C.tree, C.tree2];

function shadeP(p: number, f: number): number {
  const r = Math.min(255, Math.round((p & 255) * f));
  const g = Math.min(255, Math.round(((p >>> 8) & 255) * f));
  const b = Math.min(255, Math.round(((p >>> 16) & 255) * f));
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function mixP(p: number, q: number, t: number): number {
  const r = Math.round((p & 255) + ((q & 255) - (p & 255)) * t);
  const g = Math.round(((p >>> 8) & 255) + (((q >>> 8) & 255) - ((p >>> 8) & 255)) * t);
  const b = Math.round(((p >>> 16) & 255) + (((q >>> 16) & 255) - ((p >>> 16) & 255)) * t);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
