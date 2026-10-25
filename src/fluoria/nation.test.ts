import { describe, expect, it } from "vitest";
import { simplifyDiplomacy, standing } from "./nation";

describe("nation standing", () => {
  it("keeps five relations and reads how others stand to a nation", () => {
    globalThis.pack = {
      states: [
        { i: 0 },
        { i: 1, diplomacy: ["x", "x", "Friendly", "Suzerain", "Rival"] },
        { i: 2, diplomacy: ["x", "Friendly", "x", "Enemy", "Ally"] },
        { i: 3, diplomacy: ["x", "Vassal", "Enemy", "x", "Unknown"] },
        { i: 4, diplomacy: ["x", "Suspicion", "Ally", "Unknown", "x"] }
      ]
    } as unknown as typeof pack;
    expect(simplifyDiplomacy()).toBe(6);
    expect(pack.states[1].diplomacy).toEqual(["x", "x", "Neutral", "Suzerain", "Neutral"]);
    expect(standing(1, 3)).toBe("vassal");
    expect(standing(3, 1)).toBe("overlord");
    expect(standing(2, 3)).toBe("enemy");
    expect(standing(2, 4)).toBe("ally");
    expect(standing(1, 2)).toBe("neutral");
    expect(standing(1, 1)).toBe("self");
  });
});
