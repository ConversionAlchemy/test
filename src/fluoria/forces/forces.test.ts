import { beforeEach, describe, expect, it } from "vitest";
import type { Regiment } from "@/generators/military-generator";
import {
  cardPower,
  cargoSlots,
  convertToChips,
  convertUnitTypes,
  flagship,
  mergeInto,
  normalise,
  refreshNames,
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
    expect(slotsOf({ Homeguard: 200, "Mounted scouts": 40, "Gun wagon": 5 })).toBe(3 + 1 + 2);
  });

  it("lists one chip per slot, the remainder last", () => {
    expect(rows({ Riflemen: 150 })).toEqual([
      { unit: "Riflemen", count: 60 },
      { unit: "Riflemen", count: 60 },
      { unit: "Riflemen", count: 30 }
    ]);
  });

  it("gives a transport 2, 3 or 4 bays by tier", () => {
    expect(cargoSlots(regiment({ "Troop barge": 1 }))).toBe(2);
    expect(cargoSlots(regiment({ Troopship: 1 }))).toBe(3);
    expect(cargoSlots(regiment({ "Strategic transport": 1 }))).toBe(4);
  });
});

describe("power and strength", () => {
  it("gives a full chip its power: 80 Homeguard are 100", () => {
    expect(cardPower(regiment({ Homeguard: 80 }))).toBe(100);
    expect(cardPower(regiment({ Commandos: 25 }))).toBe(340);
    expect(cardPower(regiment({ Troopship: 1 }))).toBe(100);
  });

  it("falls as troops are lost and leads with the strongest unit", () => {
    const army = regiment({ Homeguard: 160, Riflemen: 60 }, { full: 360 });
    army.u.Homeguard = 40;
    expect(strength(army)).toBeCloseTo(210 / 360);
    expect(flagship(army)).toBe("Riflemen");
  });
});

describe("moving troops", () => {
  it("keeps each side's strength when troops move", () => {
    const a = regiment({ Homeguard: 80 }, { full: 200 });
    const b = regiment({ Homeguard: 40 }, { i: 1 });
    expect(shift(a, "u", "Homeguard", 40, b, "u")).toBe("");
    expect(a.u.Homeguard).toBe(40);
    expect(b.u.Homeguard).toBe(80);
    expect(strength(a)).toBeCloseTo(0.5);
    expect(b.full).toBeCloseTo(150);
  });

  it("keeps a unit to one chip, and refuses ships in an army, naval cargo and anything but infantry in a garrison", () => {
    expect(refusal(regiment({ Homeguard: 80 }), "u", "Homeguard", 1)).toMatch(/one chip/);
    expect(refusal(regiment({ Riflemen: 60 }), "u", "Frigate", 1)).toMatch(/can't join/);
    expect(refusal(regiment({ Troopship: 1 }), "cargo", "Frigate", 1)).toMatch(/land units/);
    expect(refusal(regiment({}, { garrison: 3 }), "u", "Gunship", 1)).toMatch(/Only infantry/);
  });

  it("loads cargo up to the transport's bays", () => {
    const ship = regiment({ "Strategic transport": 1 });
    const army = regiment({ Riflemen: 300 }, { i: 1 });
    expect(shift(army, "u", "Riflemen", 240, ship, "cargo")).toBe("");
    expect(shift(army, "u", "Riflemen", 60, ship, "cargo")).toMatch(/Won't fit/);
  });

  it("tops up a unit from another of its kind, within one chip", () => {
    const a = regiment({ Riflemen: 30 });
    const b = regiment({ Riflemen: 30 }, { i: 1 });
    expect(mergeInto(a, b)).toBe("");
    expect(b.u.Riflemen).toBe(60);
    expect(a.a).toBe(0);
    expect(mergeInto(regiment({ Riflemen: 10 }), b)).toMatch(/one chip/);
    expect(mergeInto(regiment({ Frigate: 1 }), regiment({ Riflemen: 10 }, { i: 2 }))).toMatch(/naval group/);
  });
});

describe("conversion", () => {
  it("turns old unit types into kit types, a chip per old slot, each chip a unit of its own", () => {
    options.map.military.units = [
      { icon: "", name: "militia", rural: 0, urban: 0, crew: 1, power: 1, type: "ranged", separate: 1 },
      { icon: "", name: "navy", rural: 0, urban: 0, crew: 100, power: 50, type: "naval", separate: 1 }
    ];
    const big = regiment({ militia: 1500 }, { name: "Northern Host" });
    const fleet = regiment({ navy: 3 }, { i: 1, name: "1st Fleet", n: 1 });
    pack.states[1].military = [big, fleet];
    expect(convertUnitTypes(glyph)).toBe(true);
    expect(big.u).toEqual({ Homeguard: 240 }); // 3 old slots of 500, 3 chips of 80

    let next = 2;
    const made: Regiment[] = [];
    const added = normalise((like, units, name) => {
      const r = regiment(units, { i: next++, name, state: like.state });
      made.push(r);
      return r;
    });
    expect(added).toBe(4);
    expect(big.u).toEqual({ Homeguard: 80 });
    expect(fleet.u).toEqual({ Gunboat: 1 });
    expect(made.map(r => [r.name, r.u])).toEqual([
      ["Northern Host II", { Homeguard: 80 }],
      ["Northern Host III", { Homeguard: 80 }],
      ["1st Fleet II", { Gunboat: 1 }],
      ["1st Fleet III", { Gunboat: 1 }]
    ]);
    expect(convertUnitTypes(glyph)).toBe(false);
  });

  it("converts maps saved with the old slot sizes, slot for slot", () => {
    const old = kitUnits(glyph).map(u => (u.name === "Riflemen" ? { ...u, slot: 500 } : u));
    options.map.military.units = old;
    const army = regiment({ Riflemen: 1000 }, { full: 99 });
    pack.states[1].military = [army];
    expect(convertToChips(glyph)).toBe(1);
    expect(army.u).toEqual({ Riflemen: 120 });
    expect(army.full).toBeUndefined();
    expect(convertToChips(glyph)).toBe(0);
  });
});

describe("base names", () => {
  it("names each kind from the lowest free number, and leaves names of the user's own", () => {
    pack.states[1].military = [
      regiment({ Riflemen: 120 }, { name: "1st (Markush) Regiment" }),
      regiment({ Riflemen: 180 }, { i: 1, name: "1st Army" }),
      regiment({ Gunboat: 3 }, { i: 2, name: "x", n: 1 }),
      regiment({ Riflemen: 60 }, { i: 3, name: "y" }),
      regiment({ Troopship: 1 }, { i: 4, name: "z" }),
      regiment({ Riflemen: 90 }, { i: 5, name: "The Iron Host", named: true })
    ];
    refreshNames();
    expect(pack.states[1].military.map(r => r.name)).toEqual([
      "2nd Army",
      "1st Army",
      "1st Fleet",
      "1st Riflemen",
      "1st Troopship",
      "The Iron Host"
    ]);
  });
});
