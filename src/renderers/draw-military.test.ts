// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import "@/generators/styles";
import { kitUnits } from "@/fluoria/forces/kit";
import type { Regiment } from "@/generators/military-generator";
import { drawMilitary, drawRegiment, moveRegiment } from "./draw-military";

vi.mock("@/fluoria/forces/pixels", () => ({
  CARD: { far: 23, close: 29 },
  STRIP: 2,
  short: (v: number) => String(v),
  tabUrl: () => "tab",
  frameUrl: () => "frame",
  cardUrl: (face: { troops: number; slots: number; single: boolean; unit: { id: string } }, size: string) =>
    `${size}:${face.unit.id}:${face.troops}:${face.slots}:${face.single ? "pale" : "full"}`
}));

beforeEach(() => {
  document.body.innerHTML = '<svg><g id="armies"></g></svg>';
  styles.military.options.boxSize = 5;
  styles.military.options.showNames = true;
  globalThis.options = {
    map: { military: { units: kitUnits(e => e) }, units: { population: { scale: 1000 } } }
  } as unknown as typeof options;
  globalThis.pack = { states: [{ i: 0 }, { i: 1, color: "#888888", military: [] }] } as never;
});

const regiment = (u: Record<string, number>, extra: Partial<Regiment> = {}) =>
  ({ i: 1, state: 1, name: "1st Royal Army", x: 50, y: 50, n: 0, a: 0, u, ...extra }) as Regiment;

test("every regiment is a card at both sizes; a single slot is pale", () => {
  pack.states[1].military = [regiment({ Riflemen: 1200 }), regiment({ Homeguard: 300 }, { i: 2 })];
  drawMilitary();
  const army = document.getElementById("regiment1-1")!;
  expect(army.querySelector(".flClose")?.getAttribute("href")).toBe("close:land_infantry_t2:1200:3:full");
  expect(army.querySelector(".flFar")?.getAttribute("href")).toBe("far:land_infantry_t2:1200:3:full");
  expect(army.querySelector(".flTotal")?.textContent).toBe("1200");
  expect(document.getElementById("regiment1-2")!.querySelector(".flClose")?.getAttribute("href")).toBe(
    "close:land_infantry_t1:300:1:pale"
  );
});

test("a transport is always a full card, counting its cargo", () => {
  drawRegiment(regiment({ Troopship: 1 }, { cargo: { Riflemen: 1500 } }), 1);
  expect(document.querySelector(".flClose")?.getAttribute("href")).toBe("close:naval_transport_t2:1500:3:full");
});

test("cards are centred on the regiment; only a name of its own shows; moving glides", async () => {
  const army = regiment({ Riflemen: 1000 });
  drawRegiment(army, 1);
  expect(document.querySelector(".regimentName")).toBeNull();
  drawRegiment({ ...army, named: true }, 1);
  const card = document.querySelector(".flClose")!;
  expect(["x", "y", "width", "height"].map(name => Number(card.getAttribute(name)))).toEqual([45, 45, 10, 10]);
  expect(document.querySelector(".regimentName")?.textContent).toBe("1st Royal Army");
  moveRegiment(army, 60, 50);
  await vi.waitFor(() => expect(Number(document.querySelector(".flClose")!.getAttribute("x"))).toBe(55));
});
