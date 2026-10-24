import { beforeEach, describe, expect, it } from "vitest";
import { canStand, moveDistance, reachable } from "./movement";

// a row of cells 30 map px apart: 0–5 land, 6–9 sea; a road joins 0–1–2–3
function world(): void {
  const n = 10;
  globalThis.pack = {
    cells: {
      p: Array.from({ length: n }, (_, i) => [i * 30, 0]),
      c: Array.from({ length: n }, (_, i) => [i - 1, i + 1].filter(j => j >= 0 && j < n)),
      h: Array.from({ length: n }, (_, i) => (i < 6 ? 30 : 10)),
      biome: Array.from({ length: n }, () => 1),
      routes: { 0: { 1: 1 }, 1: { 0: 1, 2: 1 }, 2: { 1: 1, 3: 1 }, 3: { 2: 1 } },
      haven: []
    },
    routes: [{ i: 1, group: "roads" }],
    biomes: [{ cost: 10 }, { cost: 50 }]
  } as unknown as typeof pack;
  globalThis.options = {
    map: {
      units: { distance: { unit: "mi", scale: 1 } },
      military: { units: [{ name: "infantry", type: "melee", crew: 1 }] }
    }
  } as unknown as typeof options;
}

describe("movement", () => {
  beforeEach(world);

  it("keeps fleets on water and armies on land", () => {
    expect(canStand({ n: 0 }, 2)).toBe(true);
    expect(canStand({ n: 0 }, 7)).toBe(false);
    expect(canStand({ n: 1 }, 7)).toBe(true);
  });

  it("goes further along a road than across open ground", () => {
    const army = { n: 0, u: { infantry: 100 }, cell: 0 };
    expect(moveDistance(army)).toBe(100); // 20 miles a day for five days
    const reach = reachable(army);
    expect(reach.has(3)).toBe(true); // 90 px of road costs 31.5
    expect(reach.has(5)).toBe(true);
    expect(reach.has(6)).toBe(false); // the sea
  });

  it("stops where the ground runs out, and never strays to sea", () => {
    const army = { n: 0, u: { infantry: 100 }, cell: 5 };
    globalThis.pack.cells.routes = {};
    const reach = reachable(army);
    expect([...reach.keys()].every(cell => cell <= 5)).toBe(true);
    expect(reach.has(2)).toBe(true); // three steps of 30 miles
    expect(reach.has(1)).toBe(false); // a fourth would pass 100
  });
});
