import { expect, test } from "vitest";
import { applyTerraces, levelOf } from "./terraces";

// a line of cells: sea, then land rising to a peak in the middle
const line = (h: number[]) => ({ h: [...h], c: h.map((_, i) => [i - 1, i + 1].filter(j => j >= 0 && j < h.length)) });

test("a peak is ringed by one level less each cell, and the coast drops through shallows", () => {
  const cells = line([5, 5, 5, 22, 30, 30, 30, 90, 90, 30, 30, 30, 22, 5, 5]);
  applyTerraces(cells);
  const L = cells.h.map(levelOf);
  for (let i = 1; i < L.length; i++) expect(Math.abs(L[i] - L[i - 1])).toBeLessThanOrEqual(1);
  expect(L[2]).toBe(1);
  expect(L[0]).toBe(0);
  expect(L[3]).toBe(2);
  expect(Math.max(...L)).toBe(6);
});

test("land and sea never trade places", () => {
  const cells = line([5, 25, 80, 25, 5, 5, 5, 60, 5]);
  const was = cells.h.map(h => h >= 20);
  applyTerraces(cells);
  expect(cells.h.map(h => h >= 20)).toEqual(was);
});
