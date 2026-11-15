import { expect, test } from "vitest";
import { PixelRaster } from "./raster";

test("a province line is drawn where provinces meet inside one nation", () => {
  const make = (split: boolean) => {
    const r = new PixelRaster(40, 20, 1);
    r.region = new Uint16Array(800).fill(1);
    r.subregion = new Uint16Array(800).map((_, i) => (split && i % 40 >= 20 ? 2 : 1));
    r.borders = true;
    r.borderPx = 1;
    r.bandPx = 2;
    r.bandColors = [0, 0xff3366cc];
    r.regionColors = [0, 0xff3366cc];
    r.flush();
    return r.pixels[10 * 40 + 19];
  };
  expect(make(true)).not.toBe(make(false));
});
