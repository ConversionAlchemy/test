import { beforeEach, describe, expect, it } from "vitest";
import { canStand, cellPace, reachable } from "./movement";

// a row of cells: 0–9 land, 10–11 sea; a main road joins 0–1–2–3–4–5, a path 5–6–7
function world(): void {
  const n = 12;
  globalThis.pack = {
    cells: {
      p: Array.from({ length: n }, (_, i) => [i * 30, 0]),
      c: Array.from({ length: n }, (_, i) => [i - 1, i + 1].filter(j => j >= 0 && j < n)),
      h: Array.from({ length: n }, (_, i) => (i < 10 ? 30 : 10)),
      routes: {
        0: { 1: 1 },
        1: { 0: 1, 2: 1 },
        2: { 1: 1, 3: 1 },
        3: { 2: 1, 4: 1 },
        4: { 3: 1, 5: 1 },
        5: { 4: 1, 6: 2 },
        6: { 5: 2, 7: 2 },
        7: { 6: 2 }
      },
      haven: []
    },
    routes: [
      { i: 1, group: "roads", points: [0, 1, 2, 3, 4, 5].map(c => [c * 30, 0, c]) },
      { i: 2, group: "paths", points: [5, 6, 7].map(c => [c * 30, 0, c]) }
    ]
  } as unknown as typeof pack;
}

describe("movement", () => {
  beforeEach(world);

  it("keeps fleets on water and armies on land", () => {
    expect(canStand({ n: 0 }, 2)).toBe(true);
    expect(canStand({ n: 0 }, 10)).toBe(false);
    expect(canStand({ n: 1 }, 10)).toBe(true);
  });

  it("goes four cells along a main road and no further", () => {
    const reach = reachable({ n: 0, cell: 0 });
    expect(reach.has(4)).toBe(true);
    expect(reach.has(5)).toBe(false); // no step off on top of a road move
  });

  it("costs each step by the road it's on", () => {
    const reach = reachable({ n: 0, cell: 3 });
    expect(reach.has(6)).toBe(true); // two main-road steps (½) and one path step (½)
    expect(reach.has(7)).toBe(false);
  });

  it("moves one cell off road", () => {
    globalThis.pack.routes = [];
    const reach = reachable({ n: 0, cell: 8 });
    expect([...reach.keys()].sort()).toEqual([7, 8, 9]);
    expect(cellPace(8)).toEqual({ cells: 1, road: null });
  });
});
