// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import "@/generators/styles";
import { kitUnits } from "@/fluoria/forces/kit";
import type { Regiment } from "@/generators/military-generator";
import { drawMilitary, drawRegiment, moveRegiment } from "./draw-military";

vi.mock("@/fluoria/forces/pixels", async () => {
  const real = await vi.importActual<typeof import("@/fluoria/forces/pixels")>("@/fluoria/forces/pixels");
  return {
    ...real,
    columnUrl: (col: import("@/fluoria/forces/pixels").ChipColumn, frame = false) =>
      `${frame ? "frame" : "col"}:${col.kind}:${col.chips.map(c => `${c.unit.id}x${c.count}`).join(",")}${col.carrier ? `|hold:${col.carrier.slots.length}/${col.carrier.room}:${col.carrier.open}` : ""}`
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

test("every regiment is a column of chips, one per slot", () => {
  pack.states[1].military = [regiment({ Riflemen: 150 }), regiment({ Homeguard: 80 }, { i: 2 })];
  drawMilitary();
  const army = document.getElementById("regiment1-1")!;
  expect(army.querySelector(".flClose")?.getAttribute("href")).toBe(
    "col:land:land_infantry_t2x60,land_infantry_t2x60,land_infantry_t2x30"
  );
  expect(document.getElementById("regiment1-2")!.querySelector(".flClose")?.getAttribute("href")).toBe(
    "col:land:land_infantry_t1x80"
  );
});

test("a transport is one chip counting its cargo, with a hold of 4", () => {
  drawRegiment(regiment({ Troopship: 1 }, { cargo: { Riflemen: 150 } }), 1);
  expect(document.querySelector(".flClose")?.getAttribute("href")).toBe(
    "col:naval:naval_transport_t2x150|hold:3/4:false"
  );
  expect(document.querySelector(".flFold")).not.toBeNull();
});

test("the first chip is centred on the regiment, the rest below; only a name of its own shows; moving glides", async () => {
  const army = regiment({ Riflemen: 120 });
  drawRegiment(army, 1);
  expect(document.querySelector(".regimentName")).toBeNull();
  drawRegiment({ ...army, named: true }, 1);
  const column = document.querySelector(".flClose")!;
  const u = 10 / 21;
  const [x, y, width, height] = ["x", "y", "width", "height"].map(name => Number(column.getAttribute(name)));
  expect(x).toBeCloseTo(50 - (65 * u) / 2, 1);
  expect(y).toBeCloseTo(45, 1);
  expect(width).toBeCloseTo(65 * u, 1);
  expect(height).toBeCloseTo(41 * u, 1);
  expect(document.querySelector(".regimentName")?.textContent).toBe("1st Royal Army");
  moveRegiment(army, 60, 50);
  await vi.waitFor(() =>
    expect(Number(document.querySelector(".flClose")!.getAttribute("x"))).toBeCloseTo(60 - (65 * u) / 2, 1)
  );
});
