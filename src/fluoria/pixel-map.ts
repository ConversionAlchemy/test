// The map drawn in pixels, under Azgaar's own SVG. The SVG keeps everything you click (labels, settlements,
// markers, routes, rivers) and every editor; this canvas replaces only what the base layers used to paint.
// A pyramid of detail: the whole map at one game pixel per map pixel in a painted look, and close-up levels built
// only for the tiles on screen, painted by background workers. Loaded on demand by pixel-map-hook
import { Application, BufferImageSource, Container, Graphics, Sprite, Texture } from "pixi.js";
import { type LayerId, Layers } from "@/components/layers";
import { viewport } from "@/components/viewport";
import { ensureEl } from "@/utils/nodeUtils";
import { getMapView, isOutlineOnly } from "./map-view";
import { css, Palette } from "./palette";
import type { Stamp } from "./raster";
import { TilePool } from "./tile-pool";
import { collectWorld, iceStamps, lineStamps, type MapArea, regions, wholeMap } from "./world";
import type { TileJob, WorldModel } from "./world-model";

const TILE = 512; // core side in game pixels
const APRON = 6; // painted around each tile for edge effects, then dropped

interface Level {
  scale: number; // game pixels per map pixel
  from: number; // Azgaar zoom from which it shows
  detail: 0 | 1 | 2;
  borderPx: number;
  bandPx: number;
  keep: number; // tiles kept once built
}

const LEVELS: Level[] = [
  { scale: 0.25, from: 0, detail: 0, borderPx: 1, bandPx: 0, keep: Infinity }, // a quick first look while the rest paints
  { scale: 1, from: 0, detail: 0, borderPx: 2, bandPx: 2, keep: Infinity },
  { scale: 2, from: 1.5, detail: 1, borderPx: 2, bandPx: 3, keep: Infinity },
  { scale: 4, from: 3, detail: 2, borderPx: 2, bandPx: 4, keep: 28 },
  { scale: 8, from: 6, detail: 2, borderPx: 3, bandPx: 6, keep: 28 }
];
const FADE_MS = 220;
const CELL_LINES_FROM = 1.5;

const TERRAIN: LayerId[] = ["ocean", "landmass", "heightmap", "lakes", "biomes", "coastline", "relief"];
const LOOK: LayerId[] = ["states", "borders", "provinces", "cultures", "religions"];
const LINES: LayerId[] = ["rivers", "routes", "ice"];

const STYLE = `
body.fluoria-pixel #map { background-color: transparent; }
body.fluoria-pixel :is(#ocean, #landmass, #texture, #biomes, #terrain, #coastline, #cells) { display: none; }
body.fluoria-pixel :is(#lakes, #rivers, #routes, #regions, #borders, #ice, #provs) { opacity: 0; }
#pixelMap { position: absolute; z-index: -1; pointer-events: none; image-rendering: pixelated; }
#pixelMap canvas { display: block; image-rendering: pixelated; }
`;

interface Tile {
  level: number;
  col: number;
  row: number;
  width: number;
  height: number;
  sprite: Sprite;
  source: BufferImageSource;
  ground: Uint32Array | null; // as painted, before roads, rivers and ice
  look: number; // the look it was painted for
  wanted: number; // the look it has been asked for
  lines: number; // the roads and rivers stamped on it
  seen: number;
  born: number; // when it first showed, for the fade
}

class PixelMap {
  private app = new Application();
  private host = document.createElement("div");
  private pool: TilePool | null = null;
  private model: WorldModel | null = null;
  private layers = LEVELS.map(() => new Container());
  private tiles = LEVELS.map(() => new Map<string, Tile>());
  // everything drawn in map units follows the viewport through one container
  private overlay = new Container();
  private waterMask = new Graphics(); // the sea as drawn, so the even sea grid never crosses the coast
  private landMask = new Graphics();
  private cellLines = new Container();
  private landLines = new Graphics();
  private seaLines = new Graphics();
  private hover = new Graphics();
  private shade = new Graphics();
  private seaShade = new Graphics();
  private ready: Promise<void>;
  private rebuildTimer = 0;
  private frame = 0;
  private look = 0; // bumps when regions, view or borders change
  private lines = 0; // bumps when rivers, roads or ice change
  private active = true;
  private emphasis = false;

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
    this.landLines.mask = this.landMask;
    this.seaLines.mask = this.waterMask;
    this.seaShade.mask = this.waterMask;
    this.cellLines.addChild(this.landLines, this.seaLines);
    this.overlay.addChild(this.waterMask, this.landMask, this.cellLines, this.hover, this.shade, this.seaShade);
    this.app.stage.addChild(this.overlay);
    document.body.classList.add("fluoria-pixel");
    this.pool = new TilePool();
    this.app.ticker.add(() => this.tick());
  }

  /** Layers were asked to redraw: rebuild what their data feeds */
  async drawn(ids: readonly LayerId[]): Promise<void> {
    await this.ready;
    if (!pack?.cells?.i?.length) return;
    if (!this.model || ids.some(id => TERRAIN.includes(id))) return this.scheduleRebuild();
    if (ids.some(id => LOOK.includes(id))) {
      Object.assign(this.model, regions()); // states, provinces or colours may have been edited
      this.pool?.setModel(this.model);
      this.restyle();
    }
    if (ids.some(id => LINES.includes(id))) this.lines++;
  }

  /** A layer was switched on or off */
  async toggled(): Promise<void> {
    await this.ready;
    this.restyle();
    this.lines++;
  }

  /** The view changed: repaint every tile, keeping the old ones on screen until the new arrive */
  restyle(): void {
    this.look++;
  }

  /** Follow Azgaar's zoom and pan, and keep the canvas over the SVG */
  sync(): void {
    if (!this.model) return;
    const rect = this.mapRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (this.app.renderer.width !== width || this.app.renderer.height !== height)
      this.app.renderer.resize(width, height);
    Object.assign(this.host.style, { left: `${rect.left + window.scrollX}px`, top: `${rect.top + window.scrollY}px` });
    const level = this.level();
    LEVELS.forEach((spec, index) => {
      const layer = this.layers[index];
      layer.visible = index <= level;
      layer.position.set(Math.round(viewport.x), Math.round(viewport.y));
      layer.scale.set(viewport.scale / spec.scale);
      const smooth = viewport.scale / spec.scale < 1;
      for (const tile of this.tiles[index].values()) tile.source.scaleMode = smooth ? "linear" : "nearest";
    });
    this.overlay.position.set(viewport.x, viewport.y);
    this.overlay.scale.set(viewport.scale);
    this.cellLines.visible = viewport.scale >= CELL_LINES_FROM || this.emphasis;
  }

  /** Darken everything outside `bright`: packed cells for armies, the even sea grid for fleets (land all dark) */
  dim(bright: ReadonlySet<number> | null, kind: "land" | "sea" = "land"): void {
    this.shade.clear();
    this.seaShade.clear();
    this.emphasis = Boolean(bright);
    this.cellLines.alpha = bright ? 0.4 : 0.16;
    this.sync();
    if (!bright) return;
    const { cells, vertices } = pack;
    const sea = kind === "sea";
    for (let cell = 0; cell < cells.i.length; cell++) {
      if (sea ? cells.h[cell] < 20 : bright.has(cell)) continue;
      const points = cells.v[cell].flatMap(v => vertices.p[v]);
      if (points.length >= 6) this.shade.poly(points);
    }
    this.shade.fill({ color: 0x0c0c10, alpha: 0.42 });
    if (!sea) return;
    for (let g = 0; g < grid.cells.i.length; g++) {
      if (bright.has(g)) continue; // the water mask keeps this off the land
      const points = grid.cells.v[g].flatMap(v => grid.vertices.p[v]);
      if (points.length >= 6) this.seaShade.poly(points);
    }
    this.seaShade.fill({ color: 0x0c0c10, alpha: 0.42 });
  }

  /** Brighten one cell a little: a packed cell, or a sea grid cell as -1 - id; null for none */
  highlight(cell: number | null): void {
    this.hover.clear();
    if (cell === null) return;
    const points =
      cell < 0
        ? (grid.cells.v[-1 - cell] ?? []).flatMap(v => grid.vertices.p[v])
        : (pack.cells.v[cell] ?? []).flatMap(v => pack.vertices.p[v]);
    if (points.length >= 6) this.hover.poly(points).fill({ color: 0xffffff, alpha: 0.1 });
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
    this.rebuildTimer = window.setTimeout(() => this.rebuild(), 150);
  }

  /** New map data: gather the model once; tiles repaint from it, the old ones staying until replaced */
  private rebuild(): void {
    TIME && console.info(`pixelMap rebuild at ${Math.round(performance.now())}`);
    TIME && console.time("pixelMap model");
    const before = this.model;
    this.model = collectWorld();
    TIME && console.timeEnd("pixelMap model");
    this.pool?.setModel(this.model);
    const another = !before || before.seed !== this.model.seed || before.sites.length !== this.model.sites.length;
    LEVELS.forEach((_, index) => {
      for (const [key, tile] of this.tiles[index]) {
        tile.wanted = -1;
        if (!another) continue; // an edit: the old tiles stay until their repaint arrives
        this.layers[index].removeChild(tile.sprite);
        tile.sprite.destroy({ texture: true, textureSource: true });
        this.tiles[index].delete(key);
      }
    });
    this.look++;
    this.lines++;
    this.drawCellLines();
    this.sync();
  }

  /** Land cells as Azgaar packed them; the sea as the even grid, clipped to the water */
  private drawCellLines(): void {
    const { cells, vertices } = pack;
    const polygon = (cell: number) => cells.v[cell].flatMap(v => vertices.p[v]);
    for (const g of [this.landLines, this.seaLines, this.waterMask, this.landMask]) g.clear();
    for (let cell = 0; cell < cells.i.length; cell++) {
      const points = polygon(cell);
      if (points.length < 6) continue;
      const water = cells.h[cell] < 20;
      (water ? this.waterMask : this.landMask).poly(points);
      if (!water) this.landLines.poly(points);
    }
    this.waterMask.fill({ color: 0xffffff });
    this.landMask.fill({ color: 0xffffff });
    for (let g = 0; g < grid.cells.i.length; g++) {
      const points = grid.cells.v[g].flatMap(v => grid.vertices.p[v]);
      if (points.length >= 6) this.seaLines.poly(points);
    }
    const stroke = { color: 0xf2efe6, width: 1, pixelLine: true, alpha: 1 };
    this.landLines.stroke(stroke);
    this.seaLines.stroke(stroke);
    this.cellLines.alpha = this.emphasis ? 0.4 : 0.16;
  }

  /** The highest close-up level the zoom calls for */
  private level(): number {
    let level = 0;
    LEVELS.forEach(({ from }, index) => {
      if (viewport.scale >= from) level = index;
    });
    return level;
  }

  private tick(): void {
    this.frame++;
    const editingHeights = Boolean(window.customization);
    if (editingHeights === this.active) {
      this.active = !editingHeights; // Azgaar's heightmap editor draws its own preview
      document.body.classList.toggle("fluoria-pixel", this.active);
      this.host.style.display = this.active ? "" : "none";
    }
    if (!this.model || !this.active || !this.pool) return;

    const now = performance.now();
    for (const tiles of this.tiles)
      for (const tile of tiles.values()) {
        if (tile.sprite.visible && tile.sprite.alpha < 1) tile.sprite.alpha = Math.min(1, (now - tile.born) / FADE_MS);
        if (tile.ground && tile.lines !== this.lines) this.decorate(tile);
      }
    this.schedule();
  }

  /** Keep the workers busy with the most useful tiles: the world first, then what's on screen, then around it */
  private schedule(): void {
    const pool = this.pool as TilePool;
    const view = this.viewArea();
    const level = this.level();
    const wanted: [number, number, number][] = []; // level, col, row in priority order
    const add = (index: number, area: MapArea, ring = 0) => {
      const scale = LEVELS[index].scale;
      const cx = area.x + area.width / 2;
      const cy = area.y + area.height / 2;
      const far = ([col, row]: [number, number]) =>
        Math.hypot(((col + 0.5) * TILE) / scale - cx, ((row + 0.5) * TILE) / scale - cy);
      const near = this.tilesIn(index, area, ring).sort((a, b) => far(a) - far(b));
      for (const [col, row] of near) wanted.push([index, col, row]);
    };
    add(0, wholeMap());
    add(1, view);
    add(1, wholeMap());
    if (level > 1) {
      add(level, view);
      add(level, view, 1);
    }
    add(2, view, 2); // the region level fills in around the view, then everywhere, while idle
    add(2, wholeMap());

    const visible = new Set<string>();
    for (const [index, col, row] of wanted) {
      const key = `${col},${row}`;
      const tile = this.tiles[index].get(key);
      if (tile) tile.seen = this.frame;
      if (visible.has(`${index}:${key}`)) continue;
      visible.add(`${index}:${key}`);
      if (tile && (tile.wanted === this.look || tile.look === this.look)) continue;
      if (pool.busy >= pool.width * 2) continue;
      this.request(tile ?? this.createTile(index, col, row));
    }
    for (let index = 3; index < LEVELS.length; index++) this.evict(index);
  }

  private request(tile: Tile): void {
    const pool = this.pool as TilePool;
    const look = this.look;
    tile.wanted = look;
    const key = `${tile.col},${tile.row}`;
    void pool.paint(this.job(tile)).then(pixels => {
      if (!pixels || this.tiles[tile.level].get(key) !== tile) return;
      if (look < tile.look) return;
      tile.ground = pixels;
      tile.look = look;
      this.decorate(tile);
    });
  }

  private job(tile: Tile): TileJob {
    const spec = LEVELS[tile.level];
    const view = getMapView();
    const borders = Layers.isOn("borders") || view !== "terrain";
    return {
      scale: spec.scale,
      ox: tile.col * TILE - APRON,
      oy: tile.row * TILE - APRON,
      width: tile.width + APRON * 2,
      height: tile.height + APRON * 2,
      core: { x: APRON, y: APRON, w: tile.width, h: tile.height },
      detail: spec.detail,
      view,
      borders,
      borderPx: spec.borderPx,
      bandPx: spec.bandPx,
      provinces: tile.level >= 3 && view === "terrain" && borders,
      outline: isOutlineOnly(),
      coastPx: borders ? Math.max(1, Math.round(spec.scale / 3)) : 0
    };
  }

  private coreSize(index: number, col: number, row: number): { width: number; height: number } {
    const map = wholeMap();
    const { scale } = LEVELS[index];
    return {
      width: Math.min(TILE, Math.ceil(map.width * scale) - col * TILE),
      height: Math.min(TILE, Math.ceil(map.height * scale) - row * TILE)
    };
  }

  private createTile(index: number, col: number, row: number): Tile {
    const { width, height } = this.coreSize(index, col, row);
    const source = new BufferImageSource({
      resource: new Uint8Array(width * height * 4),
      width,
      height,
      scaleMode: "nearest",
      autoGenerateMipmaps: true
    });
    const sprite = new Sprite(new Texture({ source }));
    sprite.position.set(col * TILE, row * TILE);
    sprite.roundPixels = true;
    sprite.alpha = 0;
    sprite.visible = false;
    this.layers[index].addChild(sprite);
    const tile: Tile = {
      level: index,
      col,
      row,
      width,
      height,
      sprite,
      source,
      ground: null,
      look: -1,
      wanted: -1,
      lines: -1,
      seen: this.frame,
      born: 0
    };
    this.tiles[index].set(`${col},${row}`, tile);
    return tile;
  }

  /** Roads, rivers and ice over the painted ground, then up to the GPU */
  private decorate(tile: Tile): void {
    if (!tile.ground || !this.model) return;
    tile.lines = this.lines;
    const pixels = new Uint32Array(tile.ground);
    const { scale } = LEVELS[tile.level];
    const frame = {
      scale,
      area: {
        x: tile.col * (TILE / scale),
        y: tile.row * (TILE / scale),
        width: tile.width / scale,
        height: tile.height / scale
      },
      raster: {
        ox: tile.col * TILE,
        oy: tile.row * TILE,
        width: tile.width,
        height: tile.height,
        seed: this.model.seed
      }
    };
    const stamps: Stamp[] = [
      ...(Layers.isOn("ice") ? iceStamps(frame) : []),
      ...lineStamps(frame, Layers.isOn("rivers"), Layers.isOn("routes"))
    ];
    const clip = { x: 0, y: 0, x1: tile.width, y1: tile.height };
    const put = (x: number, y: number, color: number) => {
      if (x >= 0 && y >= 0 && x < tile.width && y < tile.height) pixels[y * tile.width + x] = color;
    };
    for (const stamp of stamps) stamp.paint(put, clip);
    tile.source.resource = new Uint8Array(pixels.buffer);
    tile.source.update();
    if (!tile.sprite.visible) {
      tile.sprite.visible = true;
      tile.born = performance.now();
      TIME && console.info(`pixelMap tile ${tile.level} ${tile.col},${tile.row} at ${Math.round(tile.born)}`);
    }
  }

  private tilesIn(index: number, area: MapArea, ring = 0): [number, number][] {
    const map = wholeMap();
    const { scale } = LEVELS[index];
    const maxC = Math.ceil((map.width * scale) / TILE) - 1;
    const maxR = Math.ceil((map.height * scale) / TILE) - 1;
    const c0 = Math.max(0, Math.floor((area.x * scale) / TILE) - ring);
    const r0 = Math.max(0, Math.floor((area.y * scale) / TILE) - ring);
    const c1 = Math.min(maxC, Math.floor(((area.x + area.width) * scale) / TILE) + ring);
    const r1 = Math.min(maxR, Math.floor(((area.y + area.height) * scale) / TILE) + ring);
    const out: [number, number][] = [];
    for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) out.push([col, row]);
    return out;
  }

  private evict(index: number): void {
    const tiles = this.tiles[index];
    const keep = LEVELS[index].keep;
    while (tiles.size > keep) {
      let oldest: [string, Tile] | null = null;
      for (const entry of tiles) if (!oldest || entry[1].seen < oldest[1].seen) oldest = entry;
      if (!oldest || oldest[1].seen === this.frame) return;
      this.layers[index].removeChild(oldest[1].sprite);
      oldest[1].sprite.destroy({ texture: true, textureSource: true });
      tiles.delete(oldest[0]);
    }
  }

  private viewArea(): MapArea {
    const { x, y, scale, width, height } = viewport;
    return { x: -x / scale, y: -y / scale, width: width / scale, height: height / scale };
  }
}

let instance: PixelMap | null = null;

export const PixelMapLayer = {
  drawn: (ids: readonly LayerId[]) => {
    instance ??= new PixelMap();
    void instance.drawn(ids);
  },
  toggled: () => void instance?.toggled(),
  restyle: () => instance?.restyle(),
  dim: (bright: ReadonlySet<number> | null, kind?: "land" | "sea") => instance?.dim(bright, kind),
  highlight: (cell: number | null) => instance?.highlight(cell),
  sync: () => instance?.sync()
};
