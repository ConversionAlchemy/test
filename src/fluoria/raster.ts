import { fbm, hash2, valueNoise } from "./noise";
import { Palette, packRGB, type Swatch } from "./palette";
import { isWater, Overlay, Terrain } from "./terrain";

/** Side of one texture chunk in game pixels; a power of two so mipmaps work below 1× */
export const CHUNK = 256;

const C = Object.fromEntries(Object.entries(Palette).map(([k, v]) => [k, packRGB(v)])) as Record<Swatch, number>;

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
  readonly cols: number;
  readonly rows: number;
  private dirty = new Set<number>();

  constructor(
    readonly width: number,
    readonly height: number,
    readonly seed = 1
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

  terrainAt(x: number, y: number): number {
    const cx = x < 0 ? 0 : x >= this.width ? this.width - 1 : x;
    const cy = y < 0 ? 0 : y >= this.height ? this.height - 1 : y;
    return this.terrain[cy * this.width + cx];
  }

  elevationAt(x: number, y: number): number {
    const cx = x < 0 ? 0 : x >= this.width ? this.width - 1 : x;
    const cy = y < 0 ? 0 : y >= this.height ? this.height - 1 : y;
    return this.elevation[cy * this.width + cx];
  }

  /** Light from the north-west: slopes facing it brighten, slopes away darken, in hard steps */
  relief(x: number, y: number): number {
    const e = (dx: number, dy: number) => this.elevationAt(x + dx, y + dy);
    const slope = (e(-2, -2) + e(-2, 0) + e(0, -2) - e(2, 2) - e(2, 0) - e(0, 2)) / 3;
    const f = Math.max(0.6, Math.min(1.32, 1 - slope * 0.022));
    return 1 + Math.round((f - 1) / 0.08) * 0.08;
  }

  /** Flag every chunk touching the rectangle, padded for edge effects that read neighbours */
  markDirty(x0: number, y0: number, x1: number, y1: number): void {
    const pad = 4;
    const c0 = Math.max(0, Math.floor((x0 - pad) / CHUNK));
    const c1 = Math.min(this.cols - 1, Math.floor((x1 + pad) / CHUNK));
    const r0 = Math.max(0, Math.floor((y0 - pad) / CHUNK));
    const r1 = Math.min(this.rows - 1, Math.floor((y1 + pad) / CHUNK));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.dirty.add(r * this.cols + c);
  }

  /** Recolour the dirty chunks and hand back their ids */
  flush(): number[] {
    const ids = [...this.dirty];
    this.dirty.clear();
    for (const id of ids) {
      const { x, y, w, h } = this.chunkRect(id);
      this.render(x, y, w, h);
    }
    return ids;
  }

  chunkRect(id: number): { x: number; y: number; w: number; h: number } {
    const x = (id % this.cols) * CHUNK;
    const y = Math.floor(id / this.cols) * CHUNK;
    return { x, y, w: Math.min(CHUNK, this.width - x), h: Math.min(CHUNK, this.height - y) };
  }

  render(x0: number, y0: number, w: number, h: number): void {
    for (let y = y0; y < y0 + h; y++) {
      const row = y * this.width;
      for (let x = x0; x < x0 + w; x++) this.pixels[row + x] = this.colorAt(x, y);
    }
  }

  colorAt(x: number, y: number): number {
    const s = this.seed;
    const own = this.terrainAt(x, y);
    // ragged, coherent edges: borrow the terrain a pixel or two away, but never across the shoreline
    const jx = Math.floor(valueNoise(x, y, 2.5, s + 11) * 5) - 2;
    const jy = Math.floor(valueNoise(x, y, 2.5, s + 12) * 5) - 2;
    let t = this.terrainAt(x + jx, y + jy);
    if (isWater(t) !== isWater(own)) t = own;

    let color = isWater(t) ? this.water(x, y, t) : this.land(x, y, t);
    const i = y * this.width + x;
    if (this.overlay[i]) color = this.applyOverlay(x, y, color, this.overlay[i], this.amount[i]);
    return color;
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
    if (t !== Terrain.Sand && this.distanceTo(x, y, true, 1) === 1) {
      if (t === Terrain.Mountains || t === Terrain.Cobbles) return shadeP(C.stone2, macro);
      return hash2(x, y, s + 2) < 0.6 ? C.sand : C.sand2;
    }
    const relief = this.relief(x, y);
    if (this.elevationAt(x, y) > SNOW_LINE + (valueNoise(x, y, 6, s + 4) - 0.5) * 40)
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

  private forest(x: number, y: number): number {
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
        if (this.terrainAt(tx, ty) !== Terrain.Forest) continue;
        const dx = x - tx;
        const dy = y - ty;
        const canopy = dx >= -1 && dx <= 1 && dy >= -1 && dy <= 1 ? TREE[(dy + 1) * 3 + dx + 1] : 0;
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

  /** 1 or 2 if a pixel of the other kind (land/water) lies that close, else 0 */
  private distanceTo(x: number, y: number, water: boolean, max: number): number {
    for (let d = 1; d <= max; d++)
      for (let oy = -d; oy <= d; oy++)
        for (let ox = -d; ox <= d; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== d) continue;
          if (isWater(this.terrainAt(x + ox, y + oy)) === water) return d;
        }
    return 0;
  }
}

// a 2×2 crown lit from the top-left, with a dark lower-right pixel; 3×3 around the trunk, 0 = no canopy
const TREE = [0, C.tree3, 0, C.tree3, C.tree, C.tree, 0, C.tree, C.tree2];

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
