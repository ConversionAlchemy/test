import { CanvasSource, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { CHUNK, type PixelRaster, type Rect } from "./raster";

const FRAME_BUDGET_MS = 12;

/** One PixelRaster as PixiJS sprites: a texture per chunk, recoloured lazily (on-screen chunks first) */
export class RasterSprites {
  readonly container = new Container();
  private chunks: ({ source: CanvasSource; canvas: HTMLCanvasElement } | null)[] = [];
  private smooth = false;

  /** `crop`: the part of the raster to show, in its own pixels; the rest is apron for edge effects */
  constructor(
    readonly raster: PixelRaster,
    readonly crop: Rect = { x: 0, y: 0, x1: raster.width, y1: raster.height }
  ) {
    for (let id = 0; id < raster.cols * raster.rows; id++) {
      const { x, y, w, h } = raster.chunkRect(id);
      const fx = Math.max(x, crop.x);
      const fy = Math.max(y, crop.y);
      const fw = Math.min(x + w, crop.x1) - fx;
      const fh = Math.min(y + h, crop.y1) - fy;
      if (fw <= 0 || fh <= 0) {
        this.chunks.push(null);
        continue;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const source = new CanvasSource({ resource: canvas, scaleMode: "nearest", autoGenerateMipmaps: true });
      const frame = new Rectangle(fx - x, fy - y, fw, fh);
      const sprite = new Sprite(new Texture({ source, frame }));
      sprite.position.set(fx, fy);
      sprite.roundPixels = true;
      this.container.addChild(sprite);
      this.chunks.push({ source, canvas });
    }
  }

  /** Whether a chunk is shown at all */
  shows(id: number): boolean {
    return this.chunks[id] !== null;
  }

  /** Below one screen pixel per game pixel, sample smoothly from mipmaps so the map doesn't shimmer */
  setSmooth(smooth: boolean): void {
    if (smooth === this.smooth) return;
    this.smooth = smooth;
    for (const chunk of this.chunks) {
      if (!chunk) continue;
      const { source } = chunk;
      source.scaleMode = smooth ? "linear" : "nearest";
      if (smooth) source.updateMipmaps();
    }
  }

  /** Recolour dirty chunks within a frame budget; `visible` picks which go first */
  refresh(visible: (id: number) => boolean, budget = FRAME_BUDGET_MS): void {
    const raster = this.raster;
    const start = performance.now();
    while (raster.pending && performance.now() - start < budget) {
      let done = raster.flush(id => this.shows(id) && visible(id), 1);
      if (!done.length) done = raster.flush(id => this.shows(id), 1);
      if (!done.length) break; // only hidden apron chunks left
      for (const { id, rect } of done) this.upload(id, rect);
    }
  }

  /** Chunk ids overlapping a rectangle given in this raster's game pixels */
  chunksIn(x0: number, y0: number, x1: number, y1: number): Set<number> {
    const { cols, rows } = this.raster;
    const ids = new Set<number>();
    const c0 = Math.max(0, Math.floor(x0 / CHUNK));
    const r0 = Math.max(0, Math.floor(y0 / CHUNK));
    const c1 = Math.min(cols - 1, Math.floor(x1 / CHUNK));
    const r1 = Math.min(rows - 1, Math.floor(y1 / CHUNK));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) ids.add(r * cols + c);
    return ids;
  }

  destroy(): void {
    this.container.destroy({ children: true, texture: true, textureSource: true });
  }

  private upload(id: number, rect: Rect): void {
    const raster = this.raster;
    const { x, y } = raster.chunkRect(id);
    const w = rect.x1 - rect.x;
    const h = rect.y1 - rect.y;
    const block = new Uint32Array(w * h);
    for (let row = 0; row < h; row++) {
      const from = (rect.y + row) * raster.width + rect.x;
      block.set(raster.pixels.subarray(from, from + w), row * w);
    }
    const chunk = this.chunks[id];
    if (!chunk) return;
    const { canvas, source } = chunk;
    canvas
      .getContext("2d")
      ?.putImageData(new ImageData(new Uint8ClampedArray(block.buffer), w, h), rect.x - x, rect.y - y);
    source.update();
    if (this.smooth) source.updateMipmaps();
  }
}
