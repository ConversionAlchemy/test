import { Application, CanvasSource, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { View } from "./camera";
import { type MapLabel, placeLabels } from "./labels";
import { css, Palette, type RGB } from "./palette";
import type { PixelRaster } from "./raster";
import { RasterSprites } from "./raster-sprites";

const LABEL_PIXEL = 2; // each font pixel becomes 2×2 screen pixels, matching the chunky world

/** Draws a PixelRaster with PixiJS: one texture per chunk, nearest-neighbour above 1×, mipmaps below */
export class PixelStage {
  readonly app = new Application();
  private world = new Container();
  private labelLayer = new Container();
  private markerLayer = new Container();
  private markers: { marker: Marker; sprite: Sprite }[] = [];
  /** Screen-space drawing for tools (a road being drawn, a selected road's nodes), redrawn by `onView` */
  readonly overlay = new Graphics();
  onView: (() => void) | null = null;
  private sprites: RasterSprites | null = null;
  private labels: { label: MapLabel; sprite: Sprite }[] = [];
  view: View = { x: 0, y: 0, zoom: 1 };

  async init(host: HTMLElement): Promise<void> {
    await Promise.all([
      this.app.init({ resizeTo: host, background: css(Palette.night), antialias: false, resolution: 1 }),
      loadFont()
    ]);
    this.app.canvas.style.imageRendering = "pixelated";
    this.app.canvas.style.display = "block";
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world, this.markerLayer, this.overlay, this.labelLayer);
    this.app.renderer.on("resize", () => this.layoutLabels());
    this.app.ticker.add(() => this.refresh());
  }

  get width(): number {
    return this.app.screen.width;
  }

  get height(): number {
    return this.app.screen.height;
  }

  setRaster(raster: PixelRaster): void {
    this.sprites?.destroy();
    this.sprites = new RasterSprites(raster);
    this.world.addChild(this.sprites.container);
    this.refresh();
  }

  /** Recolour what the raster marked dirty: what's on screen first, within a frame budget, the rest in later frames */
  refresh(): void {
    if (!this.sprites?.raster.pending) return;
    const { x, y, zoom } = this.view;
    const visible = this.sprites.chunksIn(-x / zoom, -y / zoom, (this.width - x) / zoom, (this.height - y) / zoom);
    this.sprites.refresh(id => visible.has(id));
  }

  setView(view: View): void {
    this.view = view;
    this.world.position.set(view.x, view.y);
    this.world.scale.set(view.zoom);
    this.sprites?.setSmooth(view.zoom < 1);
    this.layoutLabels();
    this.onView?.();
  }

  setLabels(labels: readonly MapLabel[]): void {
    for (const child of this.labelLayer.removeChildren()) child.destroy({ texture: true, textureSource: true });
    this.labels = labels.map(label => {
      const sprite = new Sprite(labelTexture(label.text, label.size));
      sprite.anchor.set(0.5);
      sprite.scale.set(LABEL_PIXEL);
      sprite.roundPixels = true;
      this.labelLayer.addChild(sprite);
      return { label, sprite };
    });
    this.layoutLabels();
  }

  /** Settlements as Azgaar shows them: a square for capitals, circles by size for the rest, constant on screen */
  setMarkers(markers: readonly Marker[]): void {
    for (const child of this.markerLayer.removeChildren()) child.destroy();
    this.markers = markers.map(marker => {
      const sprite = new Sprite(markerTexture(marker.kind));
      sprite.anchor.set(0.5);
      sprite.scale.set(LABEL_PIXEL);
      sprite.roundPixels = true;
      this.markerLayer.addChild(sprite);
      return { marker, sprite };
    });
    this.layoutLabels();
  }

  private layoutLabels(): void {
    for (const { marker, sprite } of this.markers) {
      sprite.visible = this.view.zoom >= marker.minZoom;
      sprite.position.set(
        Math.round(this.view.x + marker.x * this.view.zoom),
        Math.round(this.view.y + marker.y * this.view.zoom)
      );
    }
    const sizes = new Map(this.labels.map(({ label, sprite }) => [label.id, sprite]));
    const shown = placeLabels(
      this.labels.map(entry => entry.label),
      this.view,
      { width: this.width, height: this.height },
      label => {
        const sprite = sizes.get(label.id);
        return { width: sprite?.width ?? 0, height: sprite?.height ?? 0 };
      }
    );
    for (const { label, sprite } of this.labels) {
      sprite.visible = shown.has(label.id);
      sprite.position.set(
        Math.round(this.view.x + label.x * this.view.zoom),
        Math.round(this.view.y + label.y * this.view.zoom)
      );
    }
  }

  destroy(): void {
    this.app.destroy(true, { children: true, texture: true, textureSource: true });
  }
}

export interface Marker {
  x: number; // game pixels
  y: number;
  kind: "capital" | "city" | "town" | "village";
  minZoom: number;
}

// tiny pixel shapes: # outline, o fill
const MARKER_SHAPES: Record<Marker["kind"], string[]> = {
  capital: ["#######", "#ooooo#", "#ooooo#", "#ooooo#", "#ooooo#", "#ooooo#", "#######"],
  city: [".###.", "#ooo#", "#ooo#", "#ooo#", ".###."],
  town: [".##.", "#oo#", "#oo#", ".##."],
  village: [".#.", "#o#", ".#."]
};
const markerTextures = new Map<string, Texture>();

function markerTexture(kind: Marker["kind"]): Texture {
  const cached = markerTextures.get(kind);
  if (cached) return cached;
  const shape = MARKER_SHAPES[kind];
  const canvas = document.createElement("canvas");
  canvas.width = shape[0].length;
  canvas.height = shape.length;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  for (let y = 0; y < shape.length; y++)
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] === ".") continue;
      ctx.fillStyle = css(shape[y][x] === "#" ? Palette.ink : Palette.paper);
      ctx.fillRect(x, y, 1, 1);
    }
  const texture = new Texture({ source: new CanvasSource({ resource: canvas, scaleMode: "nearest" }) });
  markerTextures.set(kind, texture);
  return texture;
}

let fontLoading: Promise<void> | null = null;

function loadFont(): Promise<void> {
  fontLoading ??= new FontFace("VT323", `url(${import.meta.env.BASE_URL}fonts/VT323.ttf)`)
    .load()
    .then(face => {
      document.fonts.add(face);
    })
    .catch(error => {
      if (ERROR) console.error("VT323 failed to load", error);
    });
  return fontLoading;
}

/** Text drawn without smoothing: alpha is thresholded to hard pixels, then given a one-pixel outline */
function labelTexture(text: string, size: number, fill: RGB = Palette.ink, outline: RGB = Palette.paper): Texture {
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return Texture.EMPTY;
  const font = `${size}px VT323`;
  probe.font = font;
  const width = Math.ceil(probe.measureText(text).width) + 4;
  const height = size + 4;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 2, height / 2 + 1);
  const image = ctx.getImageData(0, 0, width, height);
  const solid = new Uint8Array(width * height);
  for (let i = 0; i < solid.length; i++) solid[i] = image.data[i * 4 + 3] >= 110 ? 1 : 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let color: RGB | null = solid[i] ? fill : null;
      if (!color)
        for (let oy = -1; oy <= 1 && !color; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox;
            const ny = y + oy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height && solid[ny * width + nx]) {
              color = outline;
              break;
            }
          }
      const o = i * 4;
      image.data[o] = color?.[0] ?? 0;
      image.data[o + 1] = color?.[1] ?? 0;
      image.data[o + 2] = color?.[2] ?? 0;
      image.data[o + 3] = color ? 255 : 0;
    }
  ctx.putImageData(image, 0, 0);
  return new Texture({ source: new CanvasSource({ resource: canvas, scaleMode: "nearest" }) });
}
