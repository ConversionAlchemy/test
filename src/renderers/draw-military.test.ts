// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import "@/generators/styles";
import { kitUnits } from "@/fluoria/forces/kit";
import type { Regiment } from "@/generators/military-generator";
import { drawMilitary, drawRegiment, moveRegiment } from "./draw-military";

vi.mock("@/fluoria/forces/pixels", () => ({
  iconUrl: (unit: { id: string }, _colour: string, mode = "icon") => `${mode}:${unit.id}`,
  cardUrl: (face: { troops: number; slots: number }) => `card:${face.troops}:${face.slots}`
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

test("a group gets a card; a single slot only its icon and silhouette", () => {
  pack.states[1].military = [regiment({ Riflemen: 1200 }), regiment({ Homeguard: 300 }, { i: 2 })];
  drawMilitary();
  const army = document.getElementById("regiment1-1")!;
  expect(army.querySelector(".flCard")?.getAttribute("href")).toBe("card:1200:3");
  expect(army.classList.contains("fl-group")).toBe(true);
  const single = document.getElementById("regiment1-2")!;
  expect(single.querySelector(".flCard")).toBeNull();
  expect(single.querySelector(".flIcon")?.getAttribute("href")).toBe("icon:land_infantry_t1");
  expect(single.querySelector(".flDot")?.getAttribute("href")).toBe("silhouette:land_infantry_t1");
});

test("a transport's card counts its cargo", () => {
  drawRegiment(regiment({ Troopship: 1 }, { cargo: { Riflemen: 1500 } }), 1);
  expect(document.querySelector(".flCard")?.getAttribute("href")).toBe("card:1500:3");
  expect(document.querySelector(".flIcon")?.getAttribute("href")).toBe("icon:naval_transport_t2");
});

test("art is centred on the regiment, the name below; moving glides it", async () => {
  const army = regiment({ Riflemen: 1000 });
  drawRegiment(army, 1);
  const card = document.querySelector(".flCard")!;
  expect(["x", "y", "width", "height"].map(name => Number(card.getAttribute(name)))).toEqual([45, 45, 10, 10]);
  const name = document.querySelector(".regimentName")!;
  expect(name.textContent).toBe("1st Royal Army");
  expect(Number(name.getAttribute("y"))).toBeGreaterThan(55);
  moveRegiment(army, 60, 50);
  await vi.waitFor(() => expect(Number(card.getAttribute("x"))).toBe(55));
});
