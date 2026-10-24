import { Application, CanvasSource, Container, Sprite, Texture } from "pixi.js";
import type { View } from "./camera";
import { type MapLabel, placeLabels } from "./labels";
import { css, Palette, type RGB } from "./palette";
import type { PixelRaster } from "./raster";

const LABEL_PIXEL = 2; // each font pixel becomes 2×2 screen pixels, matching the chunky world

/** Draws a PixelRaster with PixiJS: one texture per chunk, nearest-neighbour above 1×, mipmaps below */
export class PixelStage {
  readonly app = new Application();
  private world = new Container();
  private labelLayer = new Container();
  private chunks: { source: CanvasSource; canvas: HTMLCanvasElement }[] = [];
  private labels: { label: MapLabel; sprite: Sprite }[] = [];
  private raster: PixelRaster | null = null;
  view: View = { x: 0, y: 0, zoom: 1 };

  async init(host: HTMLElement): Promise<void> {
    await Promise.all([
      this.app.init({ resizeTo: host, background: css(Palette.night), antialias: false, resolution: 1 }),
      loadFont()
    ]);
    this.app.canvas.style.imageRendering = "pixelated";
    this.app.canvas.style.display = "block";
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world, this.labelLayer);
    this.app.renderer.on("resize", () => this.layoutLabels());
  }

  get width(): number {
    return this.app.screen.width;
  }

  get height(): number {
    return this.app.screen.height;
  }

  setRaster(raster: PixelRaster): void {
    this.raster = raster;
    for (const child of this.world.removeChildren()) child.destroy({ texture: true, textureSource: true });
    this.chunks = [];
    for (let id = 0; id < raster.cols * raster.rows; id++) {
      const { x, y, w, h } = raster.chunkRect(id);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const source = new CanvasSource({ resource: canvas, scaleMode: "nearest", autoGenerateMipmaps: true });
      const sprite = new Sprite(new Texture({ source }));
      sprite.position.set(x, y);
      sprite.roundPixels = true;
      this.world.addChild(sprite);
      this.chunks.push({ source, canvas });
    }
    this.refresh();
  }

  /** Recolour and re-upload whatever the raster marked dirty */
  refresh(): void {
    const raster = this.raster;
    if (!raster) return;
    for (const id of raster.flush()) {
      const { x, y, w, h } = raster.chunkRect(id);
      const { canvas, source } = this.chunks[id];
      const block = new Uint32Array(w * h);
      for (let row = 0; row < h; row++)
        block.set(raster.pixels.subarray((y + row) * raster.width + x, (y + row) * raster.width + x + w), row * w);
      const ctx = canvas.getContext("2d");
      ctx?.putImageData(new ImageData(new Uint8ClampedArray(block.buffer), w, h), 0, 0);
      source.update();
      source.updateMipmaps();
    }
  }

  setView(view: View): void {
    this.view = view;
    this.world.position.set(view.x, view.y);
    this.world.scale.set(view.zoom);
    const mode = view.zoom < 1 ? "linear" : "nearest";
    for (const { source } of this.chunks) if (source.scaleMode !== mode) source.scaleMode = mode;
    this.layoutLabels();
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

  private layoutLabels(): void {
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
