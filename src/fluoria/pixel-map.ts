// The map drawn in pixels, under Azgaar's own SVG. The SVG keeps everything you click (labels, settlements,
// markers, routes, rivers) and every editor; this canvas replaces only what the base layers used to paint.
// Loaded on demand by pixel-map-hook so PixiJS stays out of the main bundle
import { Application } from "pixi.js";
import { type LayerId, Layers } from "@/components/layers";
import { viewport } from "@/components/viewport";
import { ensureEl } from "@/utils/nodeUtils";
import { css, Palette } from "./palette";
import { RasterSprites } from "./raster-sprites";
import {
  applyPolitics,
  buildTerrain,
  lineStamps,
  type MapArea,
  type TerrainBuild,
  WORLD_SCALE,
  wholeMap
} from "./world";

const DETAIL_SCALE = 6; // game pixels per map pixel when zoomed in close
const DETAIL_FROM = 6; // Azgaar zoom from which the close-in level takes over (one game pixel per screen pixel)
const DETAIL_MARGIN = 0.15; // extra area drawn around the view, so small pans don't need a rebuild

const TERRAIN: LayerId[] = ["ocean", "landmass", "heightmap", "lakes", "biomes", "coastline", "relief"];
const POLITICS: LayerId[] = ["states", "borders"];
const LINES: LayerId[] = ["rivers", "routes"];

const STYLE = `
body.fluoria-pixel #map { background-color: transparent; }
body.fluoria-pixel :is(#ocean, #landmass, #texture, #biomes, #terrain, #coastline) { display: none; }
body.fluoria-pixel :is(#lakes, #rivers, #routes, #regions, #borders) { opacity: 0; }
#pixelMap { position: absolute; z-index: -1; pointer-events: none; image-rendering: pixelated; }
#pixelMap canvas { display: block; image-rendering: pixelated; }
`;

interface Level {
  build: TerrainBuild;
  sprites: RasterSprites;
}

class PixelMap {
  private app = new Application();
  private host = document.createElement("div");
  private base: Level | null = null;
  private detail: Level | null = null;
  private ready: Promise<void>;
  private rebuildTimer = 0;
  private detailTimer = 0;
  private active = true;

  constructor() {
    this.ready = this.mount();
  }

  private async mount(): Promise<void> {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.append(style);
    this.host.id = "pixelMap";
    const map = ensureEl("map");
    map.before(this.host);
    await this.app.init({ width: 1, height: 1, background: css(Palette.deep), antialias: false, resolution: 1 });
    this.host.append(this.app.canvas);
    document.body.classList.add("fluoria-pixel");
    this.app.ticker.add(() => this.tick());
  }

  /** Layers were asked to redraw: rebuild what their data feeds */
  async drawn(ids: readonly LayerId[]): Promise<void> {
    await this.ready;
    if (!pack?.cells?.i?.length) return;
    if (!this.base || ids.some(id => TERRAIN.includes(id))) return this.scheduleRebuild();
    const politics = ids.some(id => POLITICS.includes(id));
    const lines = ids.some(id => LINES.includes(id));
    for (const level of this.levels()) this.decorate(level, politics, lines);
  }

  /** A layer was switched on or off */
  async toggled(): Promise<void> {
    await this.ready;
    for (const level of this.levels()) this.decorate(level, true, true);
  }

  /** Follow Azgaar's zoom and pan, and keep the canvas over the SVG */
  sync(): void {
    if (!this.base) return;
    const rect = ensureEl("map").getBoundingClientRect();
    const { width, height } = rect;
    if (this.app.renderer.width !== Math.round(width) || this.app.renderer.height !== Math.round(height))
      this.app.renderer.resize(Math.round(width), Math.round(height));
    Object.assign(this.host.style, {
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.top + window.scrollY}px`
    });
    for (const level of this.levels()) this.place(level);
    const close = viewport.scale >= DETAIL_FROM;
    if (this.detail) this.detail.sprites.container.visible = close && this.covers(this.detail.build.area);
    if (close && !(this.detail && this.covers(this.detail.build.area))) this.scheduleDetail();
  }

  private scheduleRebuild(): void {
    clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => this.rebuild(), 250);
  }

  private rebuild(): void {
    TIME && console.time("pixelMap");
    this.drop(this.base);
    this.drop(this.detail);
    this.detail = null;
    this.base = this.make(WORLD_SCALE, wholeMap());
    TIME && console.timeEnd("pixelMap");
    this.sync();
  }

  private scheduleDetail(): void {
    clearTimeout(this.detailTimer);
    this.detailTimer = window.setTimeout(() => {
      if (viewport.scale < DETAIL_FROM) return;
      const view = this.viewArea();
      const pad = (size: number) => size * DETAIL_MARGIN;
      const { width, height } = options.map.graph;
      const x = Math.max(0, view.x - pad(view.width));
      const y = Math.max(0, view.y - pad(view.height));
      const area = {
        x,
        y,
        width: Math.min(width, view.x + view.width + pad(view.width)) - x,
        height: Math.min(height, view.y + view.height + pad(view.height)) - y
      };
      this.drop(this.detail);
      this.detail = this.make(DETAIL_SCALE, area);
      this.sync();
    }, 200);
  }

  private make(scale: number, area: MapArea): Level {
    const build = buildTerrain(scale, area);
    const level = { build, sprites: new RasterSprites(build.raster) };
    this.decorate(level, true, true);
    this.app.stage.addChild(level.sprites.container);
    return level;
  }

  private decorate(level: Level, politics: boolean, lines: boolean): void {
    const { build } = level;
    if (politics) applyPolitics(build, Layers.isOn("states"), Layers.isOn("borders"));
    if (lines) {
      const old = build.raster.stamps;
      build.raster.stamps = lineStamps(build, Layers.isOn("rivers"), Layers.isOn("routes"));
      for (const stamp of [...old, ...build.raster.stamps])
        build.raster.markDirty(stamp.x0, stamp.y0, stamp.x1, stamp.y1);
    }
  }

  private place({ build, sprites }: Level): void {
    const zoom = viewport.scale / build.scale;
    sprites.container.position.set(
      Math.round(viewport.x + build.area.x * viewport.scale),
      Math.round(viewport.y + build.area.y * viewport.scale)
    );
    sprites.container.scale.set(zoom);
    sprites.setSmooth(zoom < 1);
  }

  /** On-screen chunks first, each level within its share of the frame */
  private tick(): void {
    const editingHeights = Boolean(window.customization);
    if (editingHeights === this.active) {
      this.active = !editingHeights; // Azgaar's heightmap editor draws its own preview
      document.body.classList.toggle("fluoria-pixel", this.active);
      this.host.style.display = this.active ? "" : "none";
    }
    for (const level of this.levels()) {
      if (!level.build.raster.pending || !level.sprites.container.visible) continue;
      const view = this.viewArea();
      const { scale, area } = level.build;
      const visible = level.sprites.chunksIn(
        (view.x - area.x) * scale,
        (view.y - area.y) * scale,
        (view.x + view.width - area.x) * scale,
        (view.y + view.height - area.y) * scale
      );
      level.sprites.refresh(id => visible.has(id), 12);
    }
  }

  private viewArea(): MapArea {
    const { x, y, scale, width, height } = viewport;
    return { x: -x / scale, y: -y / scale, width: width / scale, height: height / scale };
  }

  private covers(area: MapArea): boolean {
    const view = this.viewArea();
    return (
      view.x >= area.x - 0.5 &&
      view.y >= area.y - 0.5 &&
      view.x + view.width <= area.x + area.width + 0.5 &&
      view.y + view.height <= area.y + area.height + 0.5
    );
  }

  private levels(): Level[] {
    return [this.base, this.detail].filter((level): level is Level => level !== null);
  }

  private drop(level: Level | null): void {
    if (!level) return;
    this.app.stage.removeChild(level.sprites.container);
    level.sprites.destroy();
  }
}

let instance: PixelMap | null = null;

export const PixelMapLayer = {
  drawn: (ids: readonly LayerId[]) => {
    instance ??= new PixelMap();
    void instance.drawn(ids);
  },
  toggled: () => void instance?.toggled(),
  sync: () => instance?.sync()
};
