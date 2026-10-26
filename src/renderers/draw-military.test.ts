// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import "@/generators/styles";
import { kitUnits } from "@/fluoria/forces/kit";
import type { Regiment } from "@/generators/military-generator";
import { drawMilitary, drawRegiment, moveRegiment } from "./draw-military";

vi.mock("@/fluoria/forces/pixels", async () => {
  const real = await vi.importActual<typeof import("@/fluoria/forces/pixels")>("@/fluoria/forces/pixels");
  const describe = (art: import("@/fluoria/forces/pixels").UnitArt) => {
    if (art.type === "card") return `card:${art.face.unit.id}`;
    if (art.type === "transport")
      return `hold:${art.face.unit.id}:${art.cargo.map(c => c.unit.id).join(",")}/${art.room}`;
    if (art.type === "far") return `far:${art.kind}:${art.roles.join(",")}`;
    return `farhold:${art.cargo.join(",")}/${art.room}`;
  };
  return {
    ...real,
    artUrl: (art: import("@/fluoria/forces/pixels").UnitArt, frame = false) =>
      `${frame ? "frame:" : ""}${describe(art)}`
  };
});

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

test("every regiment is one unit's card", () => {
  pack.states[1].military = [regiment({ Riflemen: 60 }), regiment({ Homeguard: 80 }, { i: 2 })];
  drawMilitary();
  expect(document.querySelector("#regiment1-1 .flClose")?.getAttribute("href")).toBe("card:land_infantry_t2");
  expect(document.querySelector("#regiment1-2 .flClose")?.getAttribute("href")).toBe("card:land_infantry_t1");
});

test("a transport is a hull round its hold, bays by tier", () => {
  drawRegiment(regiment({ Troopship: 1 }, { cargo: { Riflemen: 60 } }), 1);
  expect(document.querySelector(".flClose")?.getAttribute("href")).toBe("hold:naval_transport_t2:land_infantry_t2/3");
});

test("the card's middle sits on the regiment; it is named by its unit; moving glides", async () => {
  const army = regiment({ Riflemen: 60 });
  drawRegiment(army, 1);
  expect(document.querySelector(".regimentName")?.textContent).toBe("Riflemen");
  drawRegiment({ ...army, named: true }, 1);
  expect(document.querySelector(".regimentName")?.textContent).toBe("1st Royal Army");
  const card = document.querySelector(".flClose")!;
  const u = 10 / 21;
  const [x, y, width, height] = ["x", "y", "width", "height"].map(name => Number(card.getAttribute(name)));
  expect(x).toBeCloseTo(50 - (19 * u) / 2, 1);
  expect(y).toBeCloseTo(50 - 16.5 * u, 1);
  expect(width).toBeCloseTo(19 * u, 1);
  expect(height).toBeCloseTo(35 * u, 1);
  moveRegiment(army, 60, 50);
  await vi.waitFor(() =>
    expect(Number(document.querySelector(".flClose")!.getAttribute("x"))).toBeCloseTo(60 - (19 * u) / 2, 1)
  );
});
