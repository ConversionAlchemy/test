import { easeSinInOut, select, transition } from "d3";
import {
  cargoSlots,
  domainOf,
  isTransport,
  kitOf,
  perSlot,
  powerOf,
  refreshNames,
  rows,
  strength,
  troopsOf
} from "@/fluoria/forces/forces";
import { KIT } from "@/fluoria/forces/kit";
import {
  CHIP,
  type ChipColumn,
  type ChipFace,
  type ChipKind,
  chipLayout,
  columnUrl,
  short
} from "@/fluoria/forces/pixels";
import { sizeOf } from "@/fluoria/settlement-size";
import { garrisonOf } from "@/fluoria/settlements";
import type { Regiment } from "../generators/military-generator";
import { rn } from "../utils";

// Fluoria: a regiment is a column of pixel chips, one per unit; far out a cell shows as one summary chip. Both are
// drawn and the zoom picks one; the cell's columns stack into one (units.ts)

const SVG = "http://www.w3.org/2000/svg";
const size = () => styles.military.options.boxSize * 2;

export const getRegimentWidth = (_regiment: Regiment): number => size();

export const colourOf = (stateId: number) => {
  const colour = pack.states[stateId]?.color;
  return colour && colour[0] === "#" && colour.length >= 7 ? colour.slice(0, 7) : "#999999";
};

/** Power as one digit, 1–9: each step about twice the one before */
export const gradeOf = (power: number) =>
  power > 0 ? Math.max(1, Math.min(9, Math.round(Math.log2(power / 25)) + 1)) : 0;

const kindOf = (regiment: Regiment): ChipKind => {
  const d = domainOf(regiment);
  return d === "naval" ? "naval" : d === "air" ? "air" : "land";
};

/** One chip per slot of a unit list, in a nation's colour */
function facesOf(
  units: Record<string, number> | undefined,
  colour: string,
  band: string | undefined,
  full = 1
): ChipFace[] {
  return rows(units).flatMap(({ unit, count }) => {
    const kit = kitOf(unit);
    if (!kit) return [];
    const share = Math.min(1, count / perSlot(unit));
    return [{ unit: kit, colour, band, grade: gradeOf(powerOf({ [unit]: count })), count, strength: share * full }];
  });
}

/** What a regiment draws: a column of chips, a transport with its hold, and far out the cell's summary */
export function columnOf(regiment: Regiment, open = false, summary?: Regiment[]): ChipColumn {
  const colour = colourOf(regiment.origin ?? regiment.state); // an assigned army keeps the colour it came from
  const band = regiment.origin ? colourOf(regiment.state) : undefined;
  const kind = kindOf(regiment);
  const full = strength(regiment);
  if (summary) {
    const faces = summary.flatMap(r => facesOf(r.u, colour, band));
    const lead = faces.reduce((best, f) => (f.grade > best.grade ? f : best), faces[0]);
    const count = summary.reduce((sum, r) => sum + troopsOf(r) + troopsOf({ u: r.cargo ?? {} }), 0);
    const power = summary.reduce((sum, r) => sum + powerOf(r.u) + powerOf(r.cargo), 0);
    return {
      chips: [],
      kind: "land",
      summary: { lead: lead?.unit ?? KIT[0], units: faces.length, colour, grade: gradeOf(power), count }
    };
  }
  if (isTransport(regiment)) {
    const head = facesOf(regiment.u, colour, band, full)[0];
    const cargo = facesOf(regiment.cargo, colour, band);
    const carried = troopsOf({ u: regiment.cargo ?? {} });
    return {
      chips: head ? [{ ...head, count: carried, grade: gradeOf(powerOf(regiment.cargo)) }] : [],
      kind,
      carrier: { open, slots: cargo, room: cargoSlots(regiment) }
    };
  }
  return { chips: facesOf(regiment.u, colour, band, full), kind };
}

/** One chip of a regiment's list on its own, for dragging */
export function chipOf(regiment: Regiment, list: "u" | "cargo", index: number): ChipColumn | null {
  const colour = colourOf(regiment.origin ?? regiment.state);
  const band = regiment.origin ? colourOf(regiment.state) : undefined;
  const face = facesOf(list === "u" ? regiment.u : regiment.cargo, colour, band)[index];
  if (!face) return null;
  return { chips: [face], kind: list === "cargo" ? "land" : kindOf(regiment) };
}

/** Map units per art pixel: a chip is as tall as Azgaar's box was */
const unit = () => size() / CHIP.h;

function add(g: SVGGElement, tag: string, kind: string): SVGElement {
  const element = document.createElementNS(SVG, tag) as SVGElement;
  element.setAttribute("class", kind);
  g.append(element);
  return element;
}

function image(g: SVGGElement, kind: string, href: string): SVGImageElement {
  const el = add(g, "image", kind) as SVGImageElement;
  el.setAttribute("href", href);
  el.setAttribute("preserveAspectRatio", "none");
  el.setAttribute("image-rendering", "pixelated");
  return el;
}

/** A bare column in a group of its own: a chip carried by the pointer */
export function paintColumn(g: SVGGElement, col: ChipColumn): void {
  g.replaceChildren();
  const layout = chipLayout(col);
  const el = image(g, "flClose", columnUrl(col));
  el.dataset.w = String(layout.width);
  el.dataset.h = String(layout.height);
  el.dataset.head = String(layout.rows[0]?.y ?? 0);
}

/** Fill a regiment's group: its column close in, the cell's summary far out when it leads it */
export function paintRegiment(g: SVGGElement, regiment: Regiment, open = false, summary?: Regiment[]): void {
  g.replaceChildren();
  const col = columnOf(regiment, open);
  const layout = chipLayout(col);
  const head = layout.rows[0]?.y ?? 0;
  g.dataset.layout = JSON.stringify({ w: layout.width, h: layout.height, head, rows: layout.rows });
  const close = image(g, "flClose", columnUrl(col));
  const closeFrame = image(g, "flClose flPick", columnUrl(col, true));
  for (const el of [close, closeFrame]) {
    el.dataset.w = String(layout.width);
    el.dataset.h = String(layout.height);
    el.dataset.head = String(head);
  }
  if (summary) {
    const lone = summary.length === 1 && (isTransport(regiment) || rows(regiment.u).length === 1);
    const far = lone ? columnOf(regiment) : columnOf(regiment, false, summary); // one unit far out: its own chip
    const farLayout = chipLayout(far);
    for (const el of [image(g, "flFar", columnUrl(far)), image(g, "flFar flPick", columnUrl(far, true))]) {
      el.dataset.w = String(farLayout.width);
      el.dataset.h = String(farLayout.height);
      el.dataset.head = "0";
    }
  }
  if (col.carrier) {
    const fold = add(g, "rect", "flFold");
    fold.setAttribute("fill", "transparent");
  }
  g.classList.toggle("fl-carrier", Boolean(col.carrier));
  g.classList.toggle("fl-open", Boolean(col.carrier?.open));
  if (regiment.named && styles.military.options.showNames) {
    const name = add(g, "text", "regimentName");
    name.setAttribute("text-anchor", "middle");
    name.textContent = regiment.name;
  }
  placeRegiment(g, regiment.x, regiment.y);
}

/** Put a regiment's art on a point: its first chip centred there, the rest of its column below */
export function placeRegiment(g: SVGGElement, x: number, y: number): void {
  const u = unit();
  g.setAttribute("transform-origin", `${x}px ${y}px`);
  for (const el of g.querySelectorAll<SVGImageElement>("image")) {
    const w = Number(el.dataset.w) * u;
    const h = Number(el.dataset.h) * u;
    const head = Number(el.dataset.head) * u;
    el.setAttribute("x", String(rn(x - w / 2, 2)));
    el.setAttribute("y", String(rn(y - head - (CHIP.h * u) / 2, 2)));
    el.setAttribute("width", String(rn(w, 3)));
    el.setAttribute("height", String(rn(h, 3)));
  }
  const fold = g.querySelector("rect.flFold");
  const close = g.querySelector<SVGImageElement>("image.flClose");
  if (fold && close) {
    const head = Number(close.dataset.head) * u;
    const w = Number(close.dataset.w) * u;
    for (const [k, v] of Object.entries({
      x: x + w / 2 - 10 * u,
      y: y - head - (CHIP.h * u) / 2 + head,
      width: 10 * u,
      height: CHIP.h * u
    }))
      fold.setAttribute(k, String(rn(v, 3)));
  }
  const name = g.querySelector("text.regimentName");
  if (name) {
    name.setAttribute("x", String(rn(x, 2)));
    name.setAttribute("y", String(rn(y + CHIP.h * u, 2)));
    name.setAttribute("font-size", `${rn(size() * 0.4, 2)}px`);
  }
}

function armyGroup(stateId: number): SVGGElement {
  const armies = document.getElementById("armies")!;
  let army = armies.querySelector<SVGGElement>(`:scope > g#army${stateId}`);
  if (!army) {
    army = document.createElementNS(SVG, "g");
    army.id = `army${stateId}`;
    armies.append(army);
  }
  return army;
}

function regimentGroup(regiment: Regiment, stateId: number): SVGGElement {
  const g = document.createElementNS(SVG, "g");
  g.id = `regiment${stateId}-${regiment.i}`;
  g.dataset.name = regiment.name;
  g.dataset.state = String(stateId);
  g.dataset.id = String(regiment.i);
  paintRegiment(g, regiment);
  return g;
}

export const drawMilitary = (): void => {
  TIME && console.time("drawMilitary");
  const armies = document.getElementById("armies");
  if (!armies) return;
  refreshNames(); // base names follow what each regiment now is
  armies.replaceChildren();
  armies.setAttribute("font-size", String(size()));
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    const visible = (state.military ?? []).filter(regiment => !regiment.hidden);
    if (!visible.length) continue;
    const army = armyGroup(state.i);
    for (const regiment of visible) army.append(regimentGroup(regiment, state.i));
  }
  drawSettlements(armies);
  TIME && console.timeEnd("drawMilitary");
};

export const drawRegiment = (regiment: Regiment, stateId: number): void => {
  if (!document.getElementById("armies")) return;
  const old = document.getElementById(`regiment${stateId}-${regiment.i}`);
  if (regiment.hidden) {
    old?.remove();
    return;
  }
  const g = regimentGroup(regiment, stateId);
  if (old) old.replaceWith(g);
  else armyGroup(stateId).append(g);
};

/** Move one regiment to a point, gliding */
export const moveRegiment = (regiment: Regiment, x: number, y: number): void => {
  const el = document.getElementById(`regiment${regiment.state}-${regiment.i}`) as SVGGElement | null;
  const [fromX, fromY] = [regiment.x, regiment.y];
  regiment.x = x;
  regiment.y = y;
  if (!el) return;
  const duration = Math.hypot(fromX - x, fromY - y) * 8;
  select(el)
    .transition(transition().duration(duration).ease(easeSinInOut) as never)
    .tween("move", () => (t: number) => placeRegiment(el, fromX + (x - fromX) * t, fromY + (y - fromY) * t));
};

/** Close in, a settlement with a garrison shows its count beside its symbol; hover lists them, a click opens it */
export function drawSettlements(armies = document.getElementById("armies")): void {
  if (!armies) return;
  let layer = armies.querySelector<SVGGElement>(":scope > g#flSettlements");
  if (!layer) {
    layer = document.createElementNS(SVG, "g");
    layer.id = "flSettlements";
  }
  armies.prepend(layer); // units stand above settlements
  layer.replaceChildren();
  const h = size();
  for (const burg of pack.burgs ?? []) {
    if (!burg?.i || burg.removed || !burg.state || !sizeOf(burg)) continue;
    const garrison = garrisonOf(burg);
    const troops = garrison ? troopsOf(garrison) : 0;
    if (!troops) continue;
    const g = document.createElementNS(SVG, "g");
    g.dataset.burg = String(burg.i);
    g.classList.add("flSettle");
    const count = add(g, "text", "flCount");
    count.setAttribute("text-anchor", "start");
    count.setAttribute("x", String(rn(burg.x + h * 0.35, 2))); // beside the symbol: units stand above it
    count.setAttribute("y", String(rn(burg.y + h * 0.15, 2)));
    count.setAttribute("font-size", `${rn(h * 0.42, 2)}px`);
    count.setAttribute("fill", tintOf(colourOf(burg.state)));
    count.textContent = short(troops);
    g.setAttribute("transform-origin", `${burg.x}px ${burg.y}px`);
    layer.append(g);
  }
}

/** The nation's colour lifted toward white, so a count reads on any ground */
const tintOf = (hex: string) =>
  `rgb(${[1, 3, 5].map(k => Math.round(Number.parseInt(hex.slice(k, k + 2), 16) * 0.35 + 255 * 0.65)).join(",")})`;
