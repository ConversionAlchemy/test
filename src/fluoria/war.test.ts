import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Regiment } from "@/generators/military-generator";
import { kitUnits } from "./forces/kit";
import { afterMove, blocked, fallBack, integrate, occupierOf } from "./war";

// a row of land cells 0–5: state 1 owns 0–2, state 2 owns 3–5; the two are at war
function world(): void {
  const n = 6;
  globalThis.options = {
    map: { military: { units: kitUnits(e => e) }, units: { population: { scale: 1000 } } }
  } as unknown as typeof options;
  globalThis.pack = {
    cells: {
      i: Array.from({ length: n }, (_, i) => i),
      p: Array.from({ length: n }, (_, i) => [i * 10, 0]),
      c: Array.from({ length: n }, (_, i) => [i - 1, i + 1].filter(j => j >= 0 && j < n)),
      h: Array(n).fill(30),
      state: [1, 1, 1, 2, 2, 2],
      burg: Array(n).fill(0)
    },
    burgs: [],
    states: [
      { i: 0 },
      { i: 1, diplomacy: ["x", "x", "Enemy"], military: [] },
      { i: 2, diplomacy: ["x", "Enemy", "x"], military: [] }
    ]
  } as unknown as typeof pack;
  globalThis.Military = { move: vi.fn(), remove: vi.fn() } as never;
  globalThis.States = { setCells: vi.fn() } as never;
}

const army = (state: number, cell: number, i = 0) =>
  ({ i, state, cell, x: cell * 10, y: 0, n: 0, a: 500, u: { Riflemen: 500 }, name: "Host" }) as unknown as Regiment;

describe("war", () => {
  beforeEach(world);

  it("takes enemy ground it moves onto, and frees its own", () => {
    const host = army(1, 3);
    expect(afterMove(host)).toBe(true);
    expect(occupierOf(3)).toBe(1);
    const back = army(2, 3);
    expect(afterMove(back)).toBe(true);
    expect(occupierOf(3)).toBe(0);
  });

  it("can't take a cell an enemy army still stands in, nor walk into it", () => {
    pack.states[2].military = [army(2, 4)];
    const host = army(1, 4, 1);
    expect(afterMove(host)).toBe(false);
    expect(blocked(army(1, 2)).has(4)).toBe(true);
  });

  it("falls back away from the winner, onto friendly ground first", () => {
    const loser = army(2, 3);
    expect(fallBack(loser, [20, 0])).toBe(4);
  });

  it("integrates every occupied cell", () => {
    pack.states[1].occupied = [3, 4];
    expect(integrate(1)).toBe(2);
    expect(States.setCells).toHaveBeenCalledWith(1, [3, 4]);
    expect(pack.states[1].occupied).toEqual([]);
  });
});
