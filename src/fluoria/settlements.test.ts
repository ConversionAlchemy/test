import { beforeEach, describe, expect, it } from "vitest";
import type { Burg } from "@/generators/burgs-generator";
import { KIT } from "./forces/kit";
import { garrisonSlots, sizeOf } from "./settlement-size";
import {
  BANK_CAPITAL,
  bankFunds,
  borrow,
  classRefusal,
  funds,
  hireMercenaries,
  manpowerOf,
  priceOf,
  recruitable,
  resizeTo,
  sendFunds,
  setClass
} from "./settlements";

const kit = (id: string) => KIT.find(k => k.id === id)!;

function world(): void {
  globalThis.pack = {
    cells: { haven: [0, 5], t: [2, 1], f: [0, 0, 0, 0, 0, 3] },
    provinces: [],
    burgs: [
      {},
      { i: 1, cell: 0, state: 1, group: "town", treasury: 300, population: 2 },
      { i: 2, cell: 1, state: 1, capital: 1, treasury: 50, population: 20 }
    ],
    states: [{ i: 0 }, { i: 1, capital: 2, treasury: 1000, military: [] }]
  } as unknown as typeof pack;
  globalThis.options = {
    map: { burgs: { groups: [{ name: "village" }, { name: "town" }, { name: "city" }] } }
  } as never;
  globalThis.Burgs = { setGroup: (id: number, group: string) => (pack.burgs[id].group = group) } as never;
}

describe("settlements", () => {
  beforeEach(world);
  const town = () => pack.burgs[1] as Burg;
  const capital = () => pack.burgs[2] as Burg;

  it("sizes towns and capitals (citadels) and gives them garrison slots", () => {
    expect(sizeOf(town())).toBe("town");
    expect(sizeOf(capital())).toBe("citadel");
    expect(garrisonSlots(1)).toBe(4);
    expect(garrisonSlots(2)).toBe(12);
  });

  it("prices units per chip by tier: a chip of 80 Homeguard costs 20, of 25 Commandos 200", () => {
    expect(priceOf(kit("land_infantry_t1"), 80)).toBe(20);
    expect(priceOf(kit("land_assault_t3"), 25)).toBe(200);
    expect(priceOf(kit("air_combat_t1"), 3)).toBe(300);
  });

  it("takes one class where it fits, paid from the settlement, half back on a change", () => {
    expect(classRefusal(town(), "harbour")).toBe("Coastal Only");
    expect(setClass(town(), "barracks")).toBe("");
    expect(town().treasury).toBe(50);
    expect(
      recruitable(town())
        .filter(k => k.id !== "land_infantry_t1")
        .every(k => k.tier === 1 && k.domain === "land" && k.role !== "armour")
    ).toBe(true);
    expect(setClass(town(), "market")).toBe("");
    expect(town().treasury).toBe(50 + 125 - 150);
  });

  it("raises Homeguard anywhere, and higher tiers by size", () => {
    expect(recruitable(town()).map(k => k.id)).toEqual(["land_infantry_t1"]);
    capital().flClass = "barracks";
    expect(Math.max(...recruitable(capital()).map(k => k.tier))).toBe(3);
  });

  it("grows for a price, tops manpower up the first time only, and gives half back shrinking", () => {
    town().treasury = 900;
    expect(manpowerOf(town())).toBe(150);
    expect(resizeTo(town(), "city")).toBe("");
    expect(town().treasury).toBe(100);
    expect(manpowerOf(town())).toBe(400);
    expect(resizeTo(town(), "town")).toBe("");
    expect(town().treasury).toBe(500);
    town().manpower = 100;
    town().treasury = 800;
    expect(manpowerOf(town())).toBe(100);
    expect(resizeTo(capital(), "city")).toBe("Move the capital first");
  });

  it("borrows from the Goldbank and hires mercenaries", () => {
    expect(borrow(town(), 500)).toBe("");
    expect(town().treasury).toBe(800);
    expect(bankFunds()).toBe(BANK_CAPITAL - 500);
    expect(borrow(town(), -200)).toBe("");
    expect(pack.states[1].loan).toBe(300);
    expect(hireMercenaries(town(), 100)).toBe("");
    expect(town().treasury).toBe(400);
    expect(manpowerOf(town())).toBe(250);
  });

  it("spends the nation's money at the capital, and sends it to towns", () => {
    expect(funds(capital())).toBe(1050);
    expect(sendFunds(town(), 200)).toBe("");
    expect(pack.states[1].treasury).toBe(800);
    expect(town().treasury).toBe(500);
  });
});
