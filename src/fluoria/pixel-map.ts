// The map drawn in pixels, under Azgaar's own SVG. The SVG keeps everything you click (labels, settlements,
// markers, routes, rivers) and every editor; this canvas replaces only what the base layers used to paint.
// Loaded on demand by pixel-map-hook so PixiJS stays out of the main bundle
import { Application, Container, Graphics } from "pixi.js";
import { type LayerId, Layers } from "@/components/layers";
import { viewport } from "@/components/viewport";
import { ensureEl } from "@/utils/nodeUtils";
import { css, Palette } from "./palette";
import { RasterSprites } from "./raster-sprites";
import {
  applyPolitics,
  buildTerrain,
  iceStamps,
  lineStamps,
  type MapArea,
  type TerrainBuild,
  TILE,
  tileBuilder,
  WORLD_SCALE,
  type WorldFields,
  wholeMap
} from "./world";

// close-up levels: game pixels per map pixel, and the Azgaar zoom from which each takes over
const LEVELS = [
  { scale: 4, from: 1.6 },
  { scale: 8, from: 4.5 }
];
const KEEP_TILES = 36; // per level; the least recently seen go first
const FRAME_MS = 10; // building and colouring share this much of each frame

const TERRAIN: LayerId[] = ["ocean", "landmass", "heightmap", "lakes", "biomes", "coastline", "relief"];
const POLITICS: LayerId[] = ["states", "borders"];
const LINES: LayerId[] = ["rivers", "routes", "ice"];

const STYLE = `
body.fluoria-pixel #map { background-color: transparent; }
body.fluoria-pixel :is(#ocean, #landmass, #texture, #biomes, #terrain, #coastline) { display: none; }
body.fluoria-pixel :is(#lakes, #rivers, #routes, #regions, #borders, #ice) { opacity: 0; }
#pixelMap { position: absolute; z-index: -1; pointer-events: none; image-rendering: pixelated; }
#pixelMap canvas { display: block; image-rendering: pixelated; }
`;

interface Piece {
  build: TerrainBuild;
  sprites: RasterSprites;
  seen: number; // frame it was last on screen
}

interface Pending {
  key: string;
  level: number;
  step: (rows: number) => boolean;
  finish: () => Piece;
}

class PixelMap {
  private app = new Application();
  private host = document.createElement("div");
  private world: (Piece & { fields: WorldFields }) | null = null;
  private layers = LEVELS.map(() => new Container());
  private tiles = LEVELS.map(() => new Map<string, Piece>());
  private pending: Pending | null = null;
  private shade = new Graphics();
  private ready: Promise<void>;
  private rebuildTimer = 0;
  private frame = 0;
  private active = true;

  constructor() {
    this.ready = this.mount();
  }

  private async mount(): Promise<void> {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.append(style);
    this.host.id = "pixelMap";
    ensureEl("map").before(this.host);
    await this.app.init({ width: 1, height: 1, background: css(Palette.deep), antialias: false, resolution: 1 });
    this.host.append(this.app.canvas);
    for (const layer of this.layers) this.app.stage.addChild(layer);
    this.app.stage.addChild(this.shade);
    document.body.classList.add("fluoria-pixel");
    this.app.ticker.add(() => this.tick());
  }

  /** Layers were asked to redraw: rebuild what their data feeds */
  async drawn(ids: readonly LayerId[]): Promise<void> {
    await this.ready;
    if (!pack?.cells?.i?.length) return;
    if (!this.world || ids.some(id => TERRAIN.includes(id))) return this.scheduleRebuild();
    const politics = ids.some(id => POLITICS.includes(id));
    const lines = ids.some(id => LINES.includes(id));
    for (const piece of this.pieces()) this.decorate(piece, politics, lines);
  }

  /** A layer was switched on or off */
  async toggled(): Promise<void> {
    await this.ready;
    for (const piece of this.pieces()) this.decorate(piece, true, true);
  }

  /** Follow Azgaar's zoom and pan, and keep the canvas over the SVG */
  sync(): void {
    if (!this.world) return;
    const rect = this.mapRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (this.app.renderer.width !== width || this.app.renderer.height !== height)
      this.app.renderer.resize(width, height);
    Object.assign(this.host.style, { left: `${rect.left + window.scrollX}px`, top: `${rect.top + window.scrollY}px` });
    const level = this.level();
    this.layers.forEach((layer, index) => {
      layer.visible = index <= level;
    });
    for (const piece of this.pieces()) this.place(piece);
    this.shade.position.set(viewport.x, viewport.y);
    this.shade.scale.set(viewport.scale);
  }

  /** Darken every cell outside `bright`, drawn in map units so it follows zoom for free */
  dim(bright: ReadonlySet<number> | null): void {
    this.shade.clear();
    if (!bright) return;
    const { cells, vertices } = pack;
    for (let cell = 0; cell < cells.i.length; cell++) {
      if (bright.has(cell)) continue;
      const points = cells.v[cell].flatMap(v => vertices.p[v]);
      if (points.length >= 6) this.shade.poly(points);
    }
    this.shade.fill({ color: 0x0c0c10, alpha: 0.42 });
  }

  // measuring forces a layout, so only when the window changed size
  private rect: DOMRect | null = null;
  private rectFor = "";
  private mapRect(): DOMRect {
    const key = `${window.innerWidth}x${window.innerHeight}x${viewport.width}x${viewport.height}`;
    if (!this.rect || key !== this.rectFor) {
      this.rect = ensureEl("map").getBoundingClientRect();
      this.rectFor = key;
    }
    return this.rect;
  }

  private scheduleRebuild(): void {
    clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => this.rebuild(), 250);
  }

  private rebuild(): void {
    TIME && console.time("pixelMap");
    if (this.world) this.drop(this.world);
    for (const tiles of this.tiles) {
      for (const piece of tiles.values()) this.drop(piece);
      tiles.clear();
    }
    this.pending = null;
    const build = buildTerrain(WORLD_SCALE, wholeMap());
    const sprites = new RasterSprites(build.raster);
    this.world = { build, sprites, seen: 0, fields: build.fields };
    this.decorate(this.world, true, true);
    this.app.stage.addChildAt(sprites.container, 0);
    TIME && console.timeEnd("pixelMap");
    this.sync();
  }

  /** The highest close-up level the zoom calls for, or -1 for the world alone */
  private level(): number {
    let level = -1;
    LEVELS.forEach(({ from }, index) => {
      if (viewport.scale >= from) level = index;
    });
    return level;
  }

  private decorate(piece: Piece, politics: boolean, lines: boolean): void {
    const { build } = piece;
    if (politics) applyPolitics(build, Layers.isOn("states"), Layers.isOn("borders"));
    if (lines) {
      const old = build.raster.stamps;
      build.raster.stamps = [
        ...(Layers.isOn("ice") ? iceStamps(build) : []),
        ...lineStamps(build, Layers.isOn("rivers"), Layers.isOn("routes"))
      ];
      for (const stamp of [...old, ...build.raster.stamps])
        build.raster.markDirty(stamp.x0, stamp.y0, stamp.x1, stamp.y1);
    }
  }

  private place({ build, sprites }: Piece): void {
    const zoom = viewport.scale / build.scale;
    sprites.container.position.set(
      Math.round(viewport.x + build.area.x * viewport.scale),
      Math.round(viewport.y + build.area.y * viewport.scale)
    );
    sprites.container.scale.set(zoom);
    sprites.setSmooth(zoom < 1);
  }

  private tick(): void {
    this.frame++;
    const editingHeights = Boolean(window.customization);
    if (editingHeights === this.active) {
      this.active = !editingHeights; // Azgaar's heightmap editor draws its own preview
      document.body.classList.toggle("fluoria-pixel", this.active);
      this.host.style.display = this.active ? "" : "none";
    }
    if (!this.world || !this.active) return;
    const start = performance.now();
    const left = () => FRAME_MS - (performance.now() - start);

    const level = this.level();
    const view = this.viewArea();
    if (level >= 0) {
      this.queueTiles(level, view);
      while (this.pending && left() > 0) {
        const pending = this.pending;
        if (pending.step(48)) {
          const piece = pending.finish();
          this.tiles[pending.level].set(pending.key, piece);
          this.layers[pending.level].addChild(piece.sprites.container);
          this.place(piece);
          this.pending = null;
          this.queueTiles(level, view);
        }
      }
    }

    // colour what is on screen: the closest level first, the world last
    const shown = [...this.visibleTiles(level, view), this.world];
    for (const piece of shown) {
      if (left() <= 0) break;
      if (!piece.build.raster.pending) continue;
      const { scale, area } = piece.build;
      const visible = piece.sprites.chunksIn(
        (view.x - area.x) * scale,
        (view.y - area.y) * scale,
        (view.x + view.width - area.x) * scale,
        (view.y + view.height - area.y) * scale
      );
      piece.sprites.refresh(id => visible.has(id), Math.max(1, left()));
    }
  }

  /** Start building the missing tile nearest the middle of the screen */
  private queueTiles(level: number, view: MapArea): void {
    if (this.pending) return;
    const { scale } = LEVELS[level];
    const tiles = this.tiles[level];
    const cx = view.x + view.width / 2;
    const cy = view.y + view.height / 2;
    let best: { col: number; row: number; d: number } | null = null;
    for (const { col, row } of this.tilesIn(scale, view)) {
      if (tiles.has(`${col},${row}`)) continue;
      const d = Math.hypot(((col + 0.5) * TILE) / scale - cx, ((row + 0.5) * TILE) / scale - cy);
      if (!best || d < best.d) best = { col, row, d };
    }
    if (!best || !this.world) return;
    const { col, row } = best;
    const tile = tileBuilder(this.world.fields, scale, col, row);
    this.pending = {
      key: `${col},${row}`,
      level,
      step: tile.step,
      finish: () => {
        const piece = { build: tile.build, sprites: new RasterSprites(tile.build.raster, tile.crop), seen: this.frame };
        this.decorate(piece, true, true);
        this.evict(level);
        return piece;
      }
    };
  }

  private tilesIn(scale: number, view: MapArea): { col: number; row: number }[] {
    const map = wholeMap();
    const c0 = Math.max(0, Math.floor((view.x * scale) / TILE));
    const r0 = Math.max(0, Math.floor((view.y * scale) / TILE));
    const c1 = Math.min(Math.ceil((map.width * scale) / TILE) - 1, Math.floor(((view.x + view.width) * scale) / TILE));
    const r1 = Math.min(
      Math.ceil((map.height * scale) / TILE) - 1,
      Math.floor(((view.y + view.height) * scale) / TILE)
    );
    const out: { col: number; row: number }[] = [];
    for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) out.push({ col, row });
    return out;
  }

  /** Tiles on screen at this level and the ones under it, nearest level first; marks them seen */
  private visibleTiles(level: number, view: MapArea): Piece[] {
    const out: Piece[] = [];
    for (let index = level; index >= 0; index--) {
      const { scale } = LEVELS[index];
      for (const { col, row } of this.tilesIn(scale, view)) {
        const piece = this.tiles[index].get(`${col},${row}`);
        if (!piece) continue;
        piece.seen = this.frame;
        out.push(piece);
      }
    }
    return out;
  }

  private evict(level: number): void {
    const tiles = this.tiles[level];
    if (tiles.size < KEEP_TILES) return;
    const oldest = [...tiles.entries()].sort((a, b) => a[1].seen - b[1].seen)[0];
    if (!oldest) return;
    this.layers[level].removeChild(oldest[1].sprites.container);
    oldest[1].sprites.destroy();
    tiles.delete(oldest[0]);
  }

  private viewArea(): MapArea {
    const { x, y, scale, width, height } = viewport;
    return { x: -x / scale, y: -y / scale, width: width / scale, height: height / scale };
  }

  private pieces(): Piece[] {
    const out: Piece[] = this.world ? [this.world] : [];
    for (const tiles of this.tiles) out.push(...tiles.values());
    return out;
  }

  private drop(piece: Piece): void {
    piece.sprites.container.parent?.removeChild(piece.sprites.container);
    piece.sprites.destroy();
  }
}

let instance: PixelMap | null = null;

export const PixelMapLayer = {
  drawn: (ids: readonly LayerId[]) => {
    instance ??= new PixelMap();
    void instance.drawn(ids);
  },
  toggled: () => void instance?.toggled(),
  dim: (bright: ReadonlySet<number> | null) => instance?.dim(bright),
  sync: () => instance?.sync()
};
