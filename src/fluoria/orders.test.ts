import { beforeEach, describe, expect, it } from "vitest";
import type { Regiment } from "@/generators/military-generator";
import { forgetOrders, order, rehearse, undoOrder } from "./orders";

const regiment = (i: number, n: number) => ({ i, state: 1, u: { Homeguard: n }, cell: 1 }) as unknown as Regiment;

beforeEach(() => {
  forgetOrders();
  globalThis.pack = {
    states: [{ i: 0 }, { i: 1, military: [regiment(0, 30), regiment(1, 80)], treasury: 100 }],
    burgs: [{}, { i: 1, manpower: undefined, treasury: 5 }]
  } as unknown as typeof pack;
});

describe("orders", () => {
  it("undoes all of a refused change, and keeps each regiment the same object", () => {
    const [a] = pack.states[1].military!;
    expect(
      order("Move", () => {
        a.u.Homeguard = 60;
        pack.states[1].treasury = 0;
        return "No";
      })
    ).toBe("No");
    expect(pack.states[1].military![0]).toBe(a);
    expect(a.u.Homeguard).toBe(30);
    expect(pack.states[1].treasury).toBe(100);
  });

  it("rehearses without changing anything", () => {
    expect(rehearse(() => (pack.states[1].military!.pop() ? "" : "x"))).toBe("");
    expect(pack.states[1].military!.length).toBe(2);
  });

  it("undoes the last order: units, money and manpower, even manpower that wasn't set", () => {
    const [a, b] = pack.states[1].military!;
    order("Merge", () => {
      b.u.Homeguard = 110;
      pack.states[1].military!.splice(0, 1);
      pack.burgs[1].manpower = 40;
      pack.burgs[1].treasury = 0;
      return "";
    });
    expect(undoOrder()).toBe("Merge");
    expect(pack.states[1].military).toEqual([a, b]);
    expect(pack.states[1].military![0]).toBe(a);
    expect(b.u.Homeguard).toBe(80);
    expect(pack.burgs[1].manpower).toBeUndefined();
    expect(pack.burgs[1].treasury).toBe(5);
    expect(undoOrder()).toBeNull();
  });
});
