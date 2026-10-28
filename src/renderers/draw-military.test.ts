// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import "@/generators/styles";
import { kitUnits } from "@/fluoria/forces/kit";
import type { Regiment } from "@/generators/military-generator";
import { drawMilitary, drawRegiment, moveRegiment, setArt } from "./draw-military";

vi.mock("@/fluoria/forces/cards", async () => {
  const real = await vi.importActual<typeof import("@/fluoria/forces/cards")>("@/fluoria/forces/cards");
  return {
    ...real,
    pileUrl: (pile: import("@/fluoria/forces/cards").Pile) => `pile:${pile.unit.id}x${pile.count}`
  };
});

beforeEach(() => {
  document.body.innerHTML = '<svg><g id="armies"></g></svg>';
  styles.military.options.boxSize = 5;
  globalThis.options = {
    map: { military: { units: kitUnits(e => e) }, units: { population: { scale: 1000 } } }
  } as unknown as typeof options;
  globalThis.pack = { states: [{ i: 0 }, { i: 1, color: "#888888", military: [] }] } as never;
});

const regiment = (u: Record<string, number>, extra: Partial<Regiment> = {}) =>
  ({ i: 1, state: 1, name: "1st Royal Army", x: 50, y: 50, n: 0, a: 0, u, ...extra }) as Regiment;

const kit = { id: "land_infantry_t2", domain: "land", role: "infantry", tier: 2 } as const;

test("every visible regiment gets its own group, hidden ones none", () => {
  pack.states[1].military = [regiment({ Riflemen: 60 }), regiment({ Homeguard: 80 }, { i: 2, hidden: true })];
  drawMilitary();
  expect(document.querySelector("#regiment1-1")).not.toBeNull();
  expect(document.querySelector("#regiment1-2")).toBeNull();
});

test("a pile's top card sits with its middle on the regiment; moving glides", async () => {
  const army = regiment({ Riflemen: 60 });
  pack.states[1].military = [army];
  drawRegiment(army, 1);
  const g = document.querySelector<SVGGElement>("#regiment1-1")!;
  setArt(g, { unit: kit, colour: "#888888", count: 3, health: 1, pips: 0 });
  const card = g.querySelector("image")!;
  expect(card.getAttribute("href")).toBe("pile:land_infantry_t2x3");
  expect(Number(card.getAttribute("x"))).toBeCloseTo(50 - 21 / 2, 1);
  expect(Number(card.getAttribute("y"))).toBeCloseTo(50 - 13 / 2, 1);
  expect(Number(card.getAttribute("height"))).toBe(13 + 2 * 2 + 1);
  moveRegiment(army, 60, 50);
  await vi.waitFor(() => expect(Number(card.getAttribute("x"))).toBeCloseTo(60 - 21 / 2, 1));
});
