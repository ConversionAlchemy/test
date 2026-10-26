import { beforeEach, describe, expect, it } from "vitest";
import type { Burg } from "@/generators/burgs-generator";
import { KIT } from "./forces/kit";
import { garrisonSlots, sizeOf } from "./settlement-size";
import { build, buildRefusal, funds, priceOf, recruitable, sendFunds } from "./settlements";

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
}

describe("settlements", () => {
  beforeEach(world);
  const town = () => pack.burgs[1] as Burg;
  const capital = () => pack.burgs[2] as Burg;

  it("sizes towns and capitals and gives them garrison slots", () => {
    expect(sizeOf(town())).toBe("town");
    expect(sizeOf(capital())).toBe("capital");
    expect(garrisonSlots(1)).toBe(4);
    expect(garrisonSlots(2)).toBe(12);
  });

  it("prices units per chip by tier: a chip of 80 Homeguard costs 20, of 25 Commandos 200", () => {
    expect(priceOf(kit("land_infantry_t1"), 80)).toBe(20);
    expect(priceOf(kit("land_assault_t3"), 25)).toBe(200);
    expect(priceOf(kit("air_combat_t1"), 3)).toBe(300);
  });

  it("builds only where it fits, and pays from the settlement", () => {
    expect(buildRefusal(town(), "harbour")).toBe("Coastal Only");
    expect(buildRefusal(town(), "airbase")).toBe("City Or Larger");
    expect(build(town(), "barracks")).toBe("");
    expect(town().treasury).toBe(50);
    expect(recruitable(town()).every(k => k.tier === 1 && k.domain === "land" && k.role !== "armour")).toBe(true);
  });

  it("spends the nation's money at the capital, and sends it to towns", () => {
    expect(funds(capital())).toBe(1050);
    expect(sendFunds(town(), 200)).toBe("");
    expect(pack.states[1].treasury).toBe(800);
    expect(town().treasury).toBe(500);
  });
});
