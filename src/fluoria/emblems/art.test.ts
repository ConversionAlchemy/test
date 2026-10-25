import { describe, expect, it } from "vitest";
import { EMBLEM_NAMES, fluoriaEmblems, SIZE } from "./art";

describe("Fluoria emblems", () => {
  it("are 28 framed 33×33 grids", () => {
    const art = fluoriaEmblems();
    expect(EMBLEM_NAMES).toHaveLength(28);
    for (const px of art.values()) {
      expect(px).toHaveLength(SIZE * SIZE);
      for (let n = 0; n < SIZE; n++)
        expect([px[n], px[n * SIZE], px[n * SIZE + SIZE - 1]]).toEqual(Array(3).fill("#000000"));
    }
  });
});
