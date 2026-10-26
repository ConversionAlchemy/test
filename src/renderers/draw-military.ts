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
import { type KitUnit, unitName } from "@/fluoria/forces/kit";
import {
  type ArtLayout,
  artLayout,
  artUrl,
  CARD,
  type CardFace,
  type CardKind,
  short,
  type UnitArt
} from "@/fluoria/forces/pixels";
import { sizeOf } from "@/fluoria/settlement-size";
import { garrisonOf } from "@/fluoria/settlements";
import type { Regiment } from "../generators/military-generator";
import { rn } from "../utils";

// Fluoria: a regiment is one unit card (a transport: its hull and hold); far out a nation's units in a cell fold into
// one chip of symbols. Both are drawn and the zoom picks one; units.ts lays out each cell

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

const kindOf = (regiment: Regiment): CardKind => {
  const d = domainOf(regiment);
  return d === "naval" ? "naval" : d === "air" ? "air" : "land";
};

/** One face per unit of a list, in a nation's colour */
function facesOf(
  units: Record<string, number> | undefined,
  colour: string,
  band: string | undefined,
  full = 1
): CardFace[] {
  return rows(units).flatMap(({ unit, count }) => {
    const kit = kitOf(unit);
    if (!kit) return [];
    const share = Math.min(1, count / perSlot(unit));
    return [{ unit: kit, colour, band, grade: gradeOf(powerOf({ [unit]: count })), strength: share * full }];
  });
}

const coloursOf = (regiment: Regiment) => ({
  colour: colourOf(regiment.origin ?? regiment.state), // an assigned army keeps the colour it came from
  band: regiment.origin ? colourOf(regiment.state) : undefined
});

/** A regiment's art close in; `lit` lights a bay of a transport, where a carried unit would go */
export function artOf(regiment: Regiment, lit?: number): UnitArt | null {
  const { colour, band } = coloursOf(regiment);
  const face = facesOf(regiment.u, colour, band, strength(regiment))[0];
  if (!face) return null;
  if (!isTransport(regiment)) return { type: "card", face };
  return {
    type: "transport",
    face: { ...face, grade: gradeOf(powerOf(regiment.u) + powerOf(regiment.cargo)) },
    cargo: facesOf(regiment.cargo, colour, band),
    room: Math.max(cargoSlots(regiment), rows(regiment.cargo).length), // an old map's overfull hold shows whole
    lit
  };
}

/** A regiment's art far out: a transport flattened round its cargo's symbols, or its nation's units in the cell as one */
export function farArtOf(regiment: Regiment, mine: Regiment[]): UnitArt | null {
  const { colour, band } = coloursOf(regiment);
  const face = facesOf(regiment.u, colour, band, strength(regiment))[0];
  if (!face) return null;
  if (isTransport(regiment))
    return {
      type: "farTransport",
      face,
      cargo: facesOf(regiment.cargo, colour, undefined).map(f => f.unit.role),
      room: cargoSlots(regiment)
    };
  const roles = mine.filter(r => !isTransport(r)).flatMap(r => facesOf(r.u, colour, undefined).map(f => f.unit.role));
  return { type: "far", colour, kind: kindOf(regiment), roles };
}

/** One unit of a regiment's list on its own card, for dragging */
export function chipOf(regiment: Regiment, list: "u" | "cargo", index: number): UnitArt | null {
  const { colour, band } = coloursOf(regiment);
  const face = facesOf(list === "u" ? regiment.u : regiment.cargo, colour, band)[index];
  return face ? { type: "card", face } : null;
}

/** What a unit is called on the map: its own name if given one; land units by name, aircraft and ships by nickname */
export function labelOf(regiment: Regiment): string {
  if (regiment.named) return regiment.name;
  const kit: KitUnit | undefined = kitOf(rows(regiment.u)[0]?.unit ?? "");
  if (!kit) return regiment.name;
  return kit.domain === "land" ? unitName(kit) : (kit.nickname ?? unitName(kit));
}

/** Map units per art pixel: an aircraft's card is as tall as Azgaar's box was */
const unit = () => size() / CARD.h;

function add(g: SVGGElement, tag: string, kind: string): SVGElement {
  const element = document.createElementNS(SVG, tag) as SVGElement;
  element.setAttribute("class", kind);
  g.append(element);
  return element;
}

function image(g: SVGGElement, kind: string, href: string, layout: ArtLayout): SVGImageElement {
  const el = add(g, "image", kind) as SVGImageElement;
  el.setAttribute("href", href);
  el.setAttribute("preserveAspectRatio", "none");
  el.setAttribute("image-rendering", "pixelated");
  el.dataset.w = String(layout.width);
  el.dataset.h = String(layout.height);
  el.dataset.mid = String(layout.middle);
  return el;
}

/** A bare card in a group of its own: a unit carried by the pointer */
export function paintColumn(g: SVGGElement, art: UnitArt): void {
  g.replaceChildren();
  image(g, "flClose", artUrl(art), artLayout(art));
}

/** Fill a regiment's group: its card close in, far out its nation's chip when it leads it (or its own, a transport) */
export function paintRegiment(g: SVGGElement, regiment: Regiment, lit?: number, mine?: Regiment[]): void {
  g.replaceChildren();
  const art = artOf(regiment, lit);
  if (art) {
    const layout = artLayout(art);
    g.dataset.layout = JSON.stringify({ w: layout.width, h: layout.height, bays: layout.bays });
    image(g, "flClose", artUrl(art), layout);
    image(g, "flClose flPick", artUrl(art, true), layout);
  }
  const far = mine && farArtOf(regiment, mine);
  if (far) {
    const layout = artLayout(far);
    image(g, "flFar", artUrl(far), layout);
    image(g, "flFar flPick", artUrl(far, true), layout);
  }
  g.classList.toggle("fl-carrier", isTransport(regiment));
  const name = add(g, "text", "regimentName");
  name.setAttribute("text-anchor", "middle");
  name.textContent = labelOf(regiment);
  placeRegiment(g, regiment.x, regiment.y);
}

/** Put a regiment's art on a point: its card's middle there */
export function placeRegiment(g: SVGGElement, x: number, y: number): void {
  const u = unit();
  g.setAttribute("transform-origin", `${x}px ${y}px`);
  for (const el of g.querySelectorAll<SVGImageElement>("image")) {
    const w = Number(el.dataset.w) * u;
    const h = Number(el.dataset.h) * u;
    el.setAttribute("x", String(rn(x - w / 2, 2)));
    el.setAttribute("y", String(rn(y - Number(el.dataset.mid) * u, 2)));
    el.setAttribute("width", String(rn(w, 3)));
    el.setAttribute("height", String(rn(h, 3)));
  }
  const name = g.querySelector("text.regimentName");
  const close = g.querySelector<SVGImageElement>("image.flClose");
  if (name && close) {
    name.setAttribute("x", String(rn(x, 2)));
    name.setAttribute("y", String(rn(y - (Number(close.dataset.mid) + 2) * u, 2)));
    name.setAttribute("font-size", `${rn(15 * u, 2)}px`);
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
