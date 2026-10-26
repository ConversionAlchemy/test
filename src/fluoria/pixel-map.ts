// The map drawn in pixels, under Azgaar's own SVG. The SVG keeps everything you click (labels, settlements,
// markers, routes, rivers) and every editor; this canvas replaces only what the base layers used to paint.
// A pyramid of detail: the whole map at one game pixel per map pixel in a painted look, and close-up levels built
// only for the tiles on screen, painted by background workers. Loaded on demand by pixel-map-hook
import { Application, BufferImageSource, Container, Graphics, Sprite, Texture } from "pixi.js";
import { type LayerId, Layers } from "@/components/layers";
import { viewport } from "@/components/viewport";
import { ensureEl } from "@/utils/nodeUtils";
import { getMapView, isOutlineOnly } from "./map-view";
import { focusedNation, onFocus, type Standing, standing } from "./nation";
import { cellOfGrid, cellPolygon } from "./one-grid";
import { css, Palette } from "./palette";
import type { RoadEdit } from "./pixel-map-sync";
import type { Stamp } from "./raster";
import { roadLines } from "./road-geometry";
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
const TINT = [0.2, 0.2, 0.08]; // by level: nations' colour over the terrain, clearest zoomed out

// widths in map pixels, with a floor in screen pixels so roads stay visible zoomed out; solid roads get a dark edge
// so they read on any ground. Lesser roads show only closer in
const ROAD_STYLE: Record<
  string,
  { color: number; width: number; minPx: number; dash: number; edge: boolean; from: number; alpha: number }
> = {
  roads: { color: 0xb23a26, width: 1.1, minPx: 2.4, dash: 0, edge: true, from: 0, alpha: 1 },
  trails: { color: 0xd2a862, width: 0.8, minPx: 1.8, dash: 0, edge: true, from: 1.5, alpha: 1 },
  paths: { color: 0x5e4630, width: 0.45, minPx: 1.2, dash: 2.2, edge: false, from: 3, alpha: 0.9 },
  searoutes: { color: 0xb4cadb, width: 0.5, minPx: 1.2, dash: 7, edge: false, from: 0, alpha: 0.75 }
};
const ROAD_EDGE = 0x2b2118;

/** A dashed polyline: alternate runs of `dash` map pixels */
function dashed(g: Graphics, pts: [number, number][], dash: number): void {
  let on = true;
  let left = dash;
  for (let n = 1; n < pts.length; n++) {
    let [x, y] = pts[n - 1];
    const [tx, ty] = pts[n];
    let rest = Math.hypot(tx - x, ty - y);
    while (rest > 0) {
      const step = Math.min(left, rest);
      const nx = x + ((tx - x) * step) / rest;
      const ny = y + ((ty - y) * step) / rest;
      if (on) g.moveTo(x, y).lineTo(nx, ny);
      x = nx;
      y = ny;
      rest -= step;
      left -= step;
      if (left <= 1e-6) {
        on = !on;
        left = dash;
      }
    }
  }
}
const CELL_LINES_FROM = 1.5;

const TERRAIN: LayerId[] = ["ocean", "landmass", "heightmap", "lakes", "biomes", "coastline", "relief"];
const LOOK: LayerId[] = ["states", "borders", "provinces", "cultures", "religions"];
const LINES: LayerId[] = ["rivers", "routes", "ice"];

const STYLE = `
body.fluoria-pixel #map { background-color: transparent; }
body.fluoria-pixel :is(#ocean, #landmass, #texture, #biomes, #terrain, #coastline, #cells) { display: none; }
body.fluoria-pixel :is(#lakes, #rivers, #routes, #regions, #borders, #ice, #provs) { opacity: 0; }
body.fluoria-pixel #routes { pointer-events: none; } /* clicked where drawn: see road-geometry roadUnder */
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
  private cellLines = new Container();
  private landLines = new Graphics();
  private seaLines = new Graphics();
  private hover = new Graphics();
  private roads = new Graphics();
  private roadEdit = new Graphics(); // road mode: the segment under the pointer, the road being drawn
  private roadNodes = new Graphics(); // road mode: every node, drawn once per change, not per pointer move
  private nodeList: [number, number][] | null = null;
  private roadScale = 0;
  private shade = new Graphics();
  private focusShade = new Graphics(); // a nation in focus: the rest dimmed, tinted by how they stand to it
  private enemyMask = new Graphics();
  private enemyStripes = new Graphics();
  private occupation = new Container(); // cells held in war: stripes in the occupier's colour
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
    this.cellLines.addChild(this.seaLines, this.landLines);
    this.overlay.addChild(
      this.cellLines,
      this.focusShade,
      this.enemyMask,
      this.enemyStripes,
      this.occupation,
      this.roads,
      this.hover,
      this.shade,
      this.roadNodes,
      this.roadEdit
    );
    this.app.stage.addChild(this.overlay);
    document.body.classList.add("fluoria-pixel");
    this.enemyStripes.mask = this.enemyMask;
    onFocus(() => this.drawFocus());
    window.addEventListener("fl:occupation", () => this.drawOccupation());
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
      this.drawFocus();
      this.drawOccupation();
    }
    if (ids.some(id => LINES.includes(id))) this.lines++;
    if (ids.includes("routes")) this.drawRoads();
  }

  /** A layer was switched on or off */
  async toggled(): Promise<void> {
    await this.ready;
    this.restyle();
    this.lines++;
    this.drawRoads();
  }

  /** The view changed: repaint every tile, keeping the old ones on screen until the new arrive */
  restyle(): void {
    this.look++;
    this.cellLines.alpha = this.lineAlpha();
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
    const bucket = Math.round(Math.log2(viewport.scale || 1) * 3);
    if (bucket !== this.roadScale) {
      this.roadScale = bucket;
      this.drawRoads(); // line widths keep a floor on screen
      this.drawNodes();
      this.drawCellLines();
    }
    this.cellLines.visible = viewport.scale >= CELL_LINES_FROM || this.emphasis;
  }

  /** Darken every cell outside `bright`: packed cells for armies, even sea cells for fleets (land all dark) */
  dim(bright: ReadonlySet<number> | null, kind: "land" | "sea" | "grid" = "land"): void {
    this.shade.clear();
    this.emphasis = Boolean(bright);
    this.cellLines.alpha = this.lineAlpha();
    this.sync();
    if (!bright || !this.model) return;
    const { land } = this.model;
    const sea = kind === "sea";
    for (let g = 0; g < grid.cells.i.length; g++) {
      // grid: even grid cells, land and sea alike (airships)
      const lit = kind === "grid" ? bright.has(g) : sea ? !land[g] && bright.has(g) : bright.has(cellOfGrid(g));
      if (lit) continue;
      const points = grid.cells.v[g].flatMap(v => grid.vertices.p[v]);
      if (points.length >= 6) this.shade.poly(points);
    }
    this.shade.fill({ color: 0x0c0c10, alpha: 0.42 });
  }

  /** Roads as pixel-style lines over the terrain: redrawn on every edit, so changes show at once */
  drawRoads(): void {
    const g = this.roads;
    g.clear();
    if (!Layers.isOn("routes") || !pack?.routes) return;
    const k = viewport.scale || 1;
    const lines = roadLines();
    const trace = (pts: [number, number][], dash: number) => {
      if (dash) {
        dashed(g, pts, dash);
        return;
      }
      g.moveTo(pts[0][0], pts[0][1]);
      for (let n = 1; n < pts.length; n++) g.lineTo(pts[n][0], pts[n][1]);
    };
    for (const group of ["paths", "searoutes", "trails", "roads"]) {
      const style = ROAD_STYLE[group];
      if (k < style.from) continue;
      const mine = lines.filter(road => (ROAD_STYLE[road.group] ? road.group : "paths") === group);
      if (!mine.length) continue;
      const width = (style.minPx * Math.min(3, k ** 0.45)) / k; // grows on screen as you zoom in, gently
      const alpha = group === "searoutes" && k < 1.5 ? style.alpha * 0.75 : style.alpha;
      if (style.edge) {
        for (const road of mine) trace(road.line, 0);
        g.stroke({ color: ROAD_EDGE, width: width + 1.4 / k, cap: "round", join: "round", alpha: 0.85 });
      }
      for (const road of mine) trace(road.line, style.dash ? style.dash / k : 0);
      g.stroke({ color: style.color, width, cap: "round", join: "round", alpha });
    }
  }

  /** Road mode drawing: nodes, a highlighted segment, a road in progress */
  showRoadEdit(edit: RoadEdit | null): void {
    const g = this.roadEdit;
    g.clear();
    if (!edit || edit.nodes === null) {
      this.nodeList = null;
      this.drawNodes();
    } else if (edit.nodes) {
      this.nodeList = edit.nodes;
      this.drawNodes();
    }
    if (!edit) return;
    const k = viewport.scale || 1;
    for (const cell of edit.cells ?? []) {
      const points = cellPolygon(cell);
      if (points.length >= 6) g.poly(points);
    }
    if (edit.cells?.length) g.fill({ color: 0xffffff, alpha: 0.14 });
    if (edit.hover && edit.hover.length >= 2) {
      g.moveTo(edit.hover[0][0], edit.hover[0][1]);
      for (let n = 1; n < edit.hover.length; n++) g.lineTo(edit.hover[n][0], edit.hover[n][1]);
      g.stroke({ color: 0xffffff, width: 5 / k, cap: "round", join: "round", alpha: 0.35 });
    }
    for (const [line, color] of [
      [edit.segment, 0xf2c94c],
      [edit.drawing, edit.invalid ? 0xe05a4a : 0xffffff]
    ] as const) {
      if (!line || line.length < 2) continue;
      g.moveTo(line[0][0], line[0][1]);
      for (let n = 1; n < line.length; n++) g.lineTo(line[n][0], line[n][1]);
      g.stroke({ color, width: 4 / k, cap: "round", join: "round", alpha: 0.9 });
    }
  }

  private drawNodes(): void {
    const g = this.roadNodes;
    g.clear();
    if (!this.nodeList?.length) return;
    const k = viewport.scale || 1;
    for (const [x, y] of this.nodeList) g.circle(x, y, 2.4 / k);
    g.fill({ color: 0xffffff }).stroke({ color: 0x1b1b20, width: 1 / k });
  }

  /** Light up a whole nation under the pointer, zoomed out; 0 for none */
  highlightNation(state: number): void {
    this.hover.clear();
    if (!state || !this.model) return;
    const { state: owner, land } = this.model;
    for (let g = 0; g < owner.length; g++) if (land[g] && owner[g] === state) this.polyOf(this.hover, g);
    this.hover.fill({ color: 0xffffff, alpha: 0.16 });
  }

  private polyOf(g: Graphics, cell: number): void {
    const points = grid.cells.v[cell].flatMap(v => grid.vertices.p[v]);
    if (points.length >= 6) g.poly(points);
  }

  /** The nation in focus at full brightness; allies green, enemies red and striped, vassals and overlord in their
   * own colour, everyone else dimmed */
  private drawFocus(): void {
    const g = this.focusShade;
    g.clear();
    this.enemyMask.clear();
    this.enemyStripes.clear();
    const focus = focusedNation();
    if (!focus || !this.model) return;
    const { state: owner, land } = this.model;
    const groups = new Map<Standing, number[]>();
    for (let cell = 0; cell < owner.length; cell++) {
      if (!land[cell]) continue;
      const kind = owner[cell] ? standing(focus, owner[cell]) : "neutral";
      if (kind === "self") continue;
      const list = groups.get(kind) ?? [];
      list.push(cell);
      groups.set(kind, list);
    }
    const paint = (kind: Standing, fill: () => void) => {
      const cells = groups.get(kind);
      if (!cells?.length) return;
      for (const cell of cells) this.polyOf(g, cell);
      fill();
    };
    paint("neutral", () => g.fill({ color: 0x0c0c10, alpha: 0.5 }));
    paint("vassal", () => g.fill({ color: 0x0c0c10, alpha: 0.12 }));
    paint("overlord", () => g.fill({ color: 0x0c0c10, alpha: 0.12 }));
    paint("ally", () => g.fill({ color: 0x2f9e44, alpha: 0.42 }));
    paint("enemy", () => g.fill({ color: 0xb02a22, alpha: 0.45 }));
    this.enemyMask.clear();
    this.enemyStripes.clear();
    const enemies = groups.get("enemy");
    if (!enemies?.length) return;
    for (const cell of enemies) this.polyOf(this.enemyMask, cell);
    this.enemyMask.fill({ color: 0xffffff });
    const { width, height } = wholeMap();
    const step = Math.max(3, grid.spacing * 0.45); // stripes across the enemy's land, at war
    for (let k = -height; k < width; k += step) this.enemyStripes.moveTo(k, height).lineTo(k + height, 0);
    this.enemyStripes.stroke({ color: 0x5a0f0c, width: step * 0.3, alpha: 0.55 });
  }

  /** Occupied cells, striped in the occupier's colour over the owner's */
  private drawOccupation(): void {
    for (const child of this.occupation.removeChildren()) child.destroy();
    const { width, height } = wholeMap();
    const step = Math.max(3, grid.spacing * 0.4);
    for (const state of pack.states ?? []) {
      if (!state?.i || state.removed || !state.occupied?.length) continue;
      const mask = new Graphics();
      for (const cell of state.occupied) {
        const g = pack.cells.g?.[cell];
        if (g !== undefined) this.polyOf(mask, g);
      }
      mask.fill({ color: 0xffffff });
      const stripes = new Graphics();
      for (let k = -height; k < width; k += step) stripes.moveTo(k, height).lineTo(k + height, 0);
      const colour = Number.parseInt((state.color ?? "#999999").slice(1, 7), 16) || 0x999999;
      stripes.stroke({ color: colour, width: step * 0.45, alpha: 0.85 });
      stripes.mask = mask;
      this.occupation.addChild(mask, stripes);
    }
  }

  /** Brighten one cell a little: a packed cell, or a sea grid cell as -1 - id; null for none */
  highlight(cell: number | null): void {
    this.hover.clear();
    if (cell === null) return;
    const points = cell < 0 ? (grid.cells.v[-1 - cell] ?? []).flatMap(v => grid.vertices.p[v]) : cellPolygon(cell);
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
    this.drawRoads();
    this.drawFocus();
    this.drawOccupation();
    this.sync();
  }

  /** Every cell on the one even grid, land and sea alike */
  private drawCellLines(): void {
    this.landLines.clear();
    this.seaLines.clear();
    for (let g = 0; g < grid.cells.i.length; g++) {
      const points = grid.cells.v[g].flatMap(v => grid.vertices.p[v]);
      if (points.length < 6) continue;
      (grid.cells.h[g] >= 20 ? this.landLines : this.seaLines).poly(points);
    }
    // about 1.6 screen pixels on land; at sea half as strong, so the water stays calm
    const width = 1.6 / (viewport.scale || 1);
    this.landLines.stroke({ color: 0xf2efe6, width, alpha: 1 });
    this.seaLines.stroke({ color: 0xf2efe6, width, alpha: 0.5 });
    this.cellLines.alpha = this.lineAlpha();
  }

  /** Cell lines: clearer with a unit picked; quieter in the military view, where units and borders lead */
  private lineAlpha(): number {
    if (this.emphasis) return 0.4;
    return getMapView() === "military" ? 0.1 : 0.2;
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
      provinces: tile.level >= 3 && (view === "terrain" || view === "military") && borders,
      outline: isOutlineOnly(),
      coastPx: borders ? Math.max(1, Math.round(spec.scale / 3)) : 0,
      tint: borders ? (TINT[tile.level] ?? 0) : 0
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
      ...lineStamps(frame, Layers.isOn("rivers"), false) // roads are their own layer, drawn on top
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
  drawRoads: () => instance?.drawRoads(),
  showRoadEdit: (edit: RoadEdit | null) => instance?.showRoadEdit(edit),
  dim: (bright: ReadonlySet<number> | null, kind?: "land" | "sea" | "grid") => instance?.dim(bright, kind),
  highlight: (cell: number | null) => instance?.highlight(cell),
  highlightNation: (state: number) => instance?.highlightNation(state),
  sync: () => instance?.sync()
};
