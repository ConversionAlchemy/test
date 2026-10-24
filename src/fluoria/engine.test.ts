import { describe, expect, test } from "vitest";
import { paintTerrain, stampOverlay } from "./brushes";
import { fitView, stepZoom, ZOOM_STEPS, zoomAround } from "./camera";
import { type MapLabel, placeLabels } from "./labels";
import { hash2, valueNoise } from "./noise";
import { Palette, packRGB } from "./palette";
import { CHUNK, PixelRaster } from "./raster";
import { buildSampleScene } from "./sample-scene";
import { Overlay, Terrain } from "./terrain";

describe("camera", () => {
  test("zooms in whole steps and stops at the ends", () => {
    expect(stepZoom(1, 1)).toBe(2);
    expect(stepZoom(1, -1)).toBe(0.5);
    expect(stepZoom(ZOOM_STEPS[0], -1)).toBe(ZOOM_STEPS[0]);
    expect(stepZoom(8, 1)).toBe(8);
  });

  test("keeps the pixel under the cursor fixed and snaps to whole screen pixels", () => {
    const view = zoomAround({ x: 10, y: 20, zoom: 2 }, 110, 120, 4);
    expect(view).toEqual({ x: -90, y: -80, zoom: 4 });
    expect(Number.isInteger(view.x) && Number.isInteger(view.y)).toBe(true);
  });

  test("fits a world at the largest step that shows all of it", () => {
    expect(fitView(640, 360, 1300, 800).zoom).toBe(2);
    expect(fitView(640, 360, 600, 300).zoom).toBe(0.5);
  });
});

describe("labels", () => {
  const measure = () => ({ width: 60, height: 16 });
  const label = (id: string, x: number, priority: number): MapLabel => ({ id, text: id, x, y: 50, priority, size: 16 });

  test("hides the less important of two overlapping labels", () => {
    const shown = placeLabels(
      [label("small", 52, 1), label("big", 50, 5)],
      { x: 0, y: 0, zoom: 1 },
      { width: 400, height: 200 },
      measure
    );
    expect([...shown]).toEqual(["big"]);
  });

  test("shows both once zoomed in far enough to separate them", () => {
    const shown = placeLabels(
      [label("a", 50, 1), label("b", 90, 2)],
      { x: 0, y: 0, zoom: 3 },
      { width: 600, height: 300 },
      measure
    );
    expect(shown.size).toBe(2);
  });

  test("skips labels off screen", () => {
    const shown = placeLabels([label("far", 900, 1)], { x: 0, y: 0, zoom: 1 }, { width: 400, height: 200 }, measure);
    expect(shown.size).toBe(0);
  });
});

describe("noise", () => {
  test("is deterministic and stays in range", () => {
    expect(hash2(3, 4, 1)).toBe(hash2(3, 4, 1));
    expect(hash2(3, 4, 1)).not.toBe(hash2(4, 3, 1));
    for (let i = 0; i < 200; i++) {
      const v = valueNoise(i * 1.7, i * 0.3, 5, 2);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("raster", () => {
  test("renders the same colours every time", () => {
    const a = buildSampleScene(3, 300, 200).raster;
    const b = buildSampleScene(3, 300, 200).raster;
    a.flush();
    b.flush();
    expect(a.pixels).toEqual(b.pixels);
  });

  test("puts a beach between grass and water, and foam on the water side", () => {
    const raster = new PixelRaster(40, 20, 1);
    for (let y = 0; y < 20; y++) for (let x = 20; x < 40; x++) raster.terrain[y * 40 + x] = Terrain.Water;
    raster.flush();
    const beach = [packRGB(Palette.sand), packRGB(Palette.sand2)];
    const surf = [packRGB(Palette.foam), packRGB(Palette.water2)];
    expect(beach).toContain(raster.pixels[10 * 40 + 19]);
    expect(surf).toContain(raster.pixels[10 * 40 + 20]);
  });

  test("only re-renders the chunks a brush touched", () => {
    const raster = new PixelRaster(CHUNK * 3, CHUNK * 2, 1);
    raster.flush();
    paintTerrain(raster, 10, 10, 4, Terrain.Forest);
    expect(raster.flush()).toEqual([0]);
    paintTerrain(raster, CHUNK * 2 + 50, CHUNK + 50, 4, Terrain.Forest);
    expect(raster.flush()).toEqual([5]);
  });

  test("overlays change the look but never the ground underneath", () => {
    const raster = new PixelRaster(64, 64, 1);
    raster.flush();
    const before = raster.pixels.slice();
    stampOverlay(raster, Overlay.Crater, 32, 32, 6);
    raster.flush();
    expect(raster.overlay[32 * 64 + 32]).toBe(Overlay.Crater);
    expect(raster.terrain.every(t => t === Terrain.Grass)).toBe(true);
    expect(raster.pixels).not.toEqual(before);
  });
});
