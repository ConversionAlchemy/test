import { expect, test } from "vitest";
import { claimAll } from "./claim";

test("every land cell ends up with a nation, islands included", () => {
  // a strip 0-4 of land with nation 1 at 0, sea at 5, an island at 6, and its settlement
  const h = [30, 30, 30, 30, 30, 5, 30];
  const cells = {
    h,
    c: h.map((_, i) => [i - 1, i + 1].filter(j => j >= 0 && j < h.length)),
    p: h.map((_, i) => [i * 10, 0] as [number, number]),
    state: [1, 0, 0, 0, 0, 0, 0],
    burg: [0, 0, 0, 0, 0, 0, 1]
  };
  const burgs = [{ state: 0 }, { state: 0 }];
  claimAll(cells, burgs);
  expect(cells.state).toEqual([1, 1, 1, 1, 1, 0, 1]);
  expect(burgs[1].state).toBe(1);
});
