import { beforeEach, describe, expect, it } from "vitest";
import type { Regiment } from "@/generators/military-generator";
import {
  cardPower,
  cargoSlots,
  convertUnitTypes,
  flagship,
  mergeInto,
  normalise,
  refusal,
  rows,
  shift,
  slotsOf,
  strength
} from "./forces";
import { kitUnits } from "./kit";

const glyph = (emoji: string) => emoji;

function regiment(u: Record<string, number>, extra: Partial<Regiment> = {}): Regiment {
  return { i: 0, state: 1, name: "1st Regiment", u, a: 0, n: 0, cell: 1, x: 0, y: 0, ...extra } as Regiment;
}

beforeEach(() => {
  globalThis.options = {
    map: { military: { units: kitUnits(glyph) }, units: { population: { scale: 1000 } } }
  } as unknown as typeof options;
  globalThis.pack = { states: [{ i: 0 }, { i: 1, military: [] }] } as unknown as typeof pack;
});

describe("slots", () => {
  it("counts each type rounded up after adding it together", () => {
    expect(slotsOf({ Homeguard: 1200, "Mounted scouts": 250, "Gun wagon": 11 })).toBe(3 + 1 + 2);
  });

  it("lists one row per slot, the remainder last", () => {
    expect(rows({ Riflemen: 1200 })).toEqual([
      { unit: "Riflemen", count: 500 },
      { unit: "Riflemen", count: 500 },
      { unit: "Riflemen", count: 200 }
    ]);
  });

  it("gives transports 4, 8 and 12 cargo slots by tier", () => {
    expect(cargoSlots(regiment({ "Troop barge": 1 }))).toBe(4);
    expect(cargoSlots(regiment({ Troopship: 1 }))).toBe(8);
    expect(cargoSlots(regiment({ "Strategic transport": 1 }))).toBe(12);
  });
});

describe("power and strength", () => {
  it("matches Azgaar's battle power: 500 Homeguard are 8", () => {
    expect(cardPower(regiment({ Homeguard: 500 }))).toBe(8);
    expect(cardPower(regiment({ Troopship: 1 }))).toBe(10);
  });

  it("falls as troops are lost and leads with the strongest unit", () => {
    const army = regiment({ Homeguard: 1000, Riflemen: 500 }, { full: 28 });
    army.u.Homeguard = 250;
    expect(strength(army)).toBeCloseTo(16 / 28);
    expect(flagship(army)).toBe("Riflemen");
  });
});

describe("moving troops", () => {
  it("keeps each side's strength when a slot moves", () => {
    const a = regiment({ Homeguard: 1000 }, { full: 32 });
    const b = regiment({ Homeguard: 500 }, { i: 1 });
    expect(shift(a, "u", "Homeguard", 500, b, "u")).toBe("");
    expect(a.u.Homeguard).toBe(500);
    expect(b.u.Homeguard).toBe(1000);
    expect(strength(a)).toBeCloseTo(0.5);
    expect(b.full).toBeCloseTo(24);
  });

  it("refuses a 13th slot, ships in an army and naval cargo", () => {
    const army = regiment({ Homeguard: 6000 });
    expect(refusal(army, "u", "Homeguard", 1)).toMatch(/cap is 12/);
    expect(refusal(regiment({ Riflemen: 500 }), "u", "Frigate", 1)).toMatch(/can't join/);
    expect(refusal(regiment({ Troopship: 1 }), "cargo", "Frigate", 1)).toMatch(/land units/);
  });

  it("loads cargo up to the transport's capacity", () => {
    const ship = regiment({ "Troop barge": 1 });
    const army = regiment({ Riflemen: 2500 }, { i: 1 });
    expect(shift(army, "u", "Riflemen", 2000, ship, "cargo")).toBe("");
    expect(shift(army, "u", "Riflemen", 500, ship, "cargo")).toMatch(/Won't fit/);
  });

  it("merges two armies of one domain within the cap", () => {
    const a = regiment({ Riflemen: 1000 });
    const b = regiment({ Riflemen: 500, "Mounted rifles": 250 }, { i: 1 });
    expect(mergeInto(a, b)).toBe("");
    expect(b.u.Riflemen).toBe(1500);
    expect(a.a).toBe(0);
    expect(mergeInto(regiment({ Frigate: 1 }), b)).toMatch(/naval group/);
  });
});

describe("conversion", () => {
  it("turns old unit types into kit types and splits what breaks the rules", () => {
    options.map.military.units = [
      { icon: "", name: "militia", rural: 0, urban: 0, crew: 1, power: 1, type: "ranged", separate: 1 },
      { icon: "", name: "navy", rural: 0, urban: 0, crew: 100, power: 50, type: "naval", separate: 1 }
    ];
    const big = regiment({ militia: 7000 }, { name: "Northern Host" });
    const fleet = regiment({ navy: 18 }, { i: 1, name: "1st Fleet", n: 1 });
    pack.states[1].military = [big, fleet];
    expect(convertUnitTypes(glyph)).toBe(true);
    expect(big.u).toEqual({ Homeguard: 7000 });

    let next = 2;
    const made: Regiment[] = [];
    const added = normalise((like, units, name) => {
      const r = regiment(units, { i: next++, name, state: like.state });
      made.push(r);
      return r;
    });
    expect(added).toBe(2);
    expect(big.u).toEqual({ Homeguard: 6000 });
    expect(made.map(r => [r.name, r.u])).toEqual([
      ["Northern Host II", { Homeguard: 1000 }],
      ["1st Fleet II", { Gunboat: 6 }]
    ]);
    expect(convertUnitTypes(glyph)).toBe(false);
  });
});
