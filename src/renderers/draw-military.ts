import { easeSinInOut, select, transition } from "d3";
import { MAX_PIPS, PIP, SYMBOL } from "@/fluoria/constants";
import { type Pile, pileSize, pileUrl } from "@/fluoria/forces/cards";
import { refreshNames, rows } from "@/fluoria/forces/forces";
import { garrisonSlots, sizeOf } from "@/fluoria/settlement-size";
import { garrisonOf, isCapital } from "@/fluoria/settlements";
import type { Regiment } from "../generators/military-generator";
import { rn } from "../utils";

// Fluoria: a regiment is one unit card; units.ts piles a nation's units of a type in a cell and gives each its art.
// Art is in art pixels, one map unit each; the group is scaled so a card keeps its size on screen

const SVG = "http://www.w3.org/2000/svg";
const size = () => styles.military.options.boxSize * 2;

export const getRegimentWidth = (_regiment: Regiment): number => size();

export const colourOf = (stateId: number) => {
  const colour = pack.states[stateId]?.color;
  return colour && colour[0] === "#" && colour.length >= 7 ? colour.slice(0, 7) : "#999999";
};

/** Show a pile (or one card) in a regiment's group */
export function setArt(g: SVGGElement, pile: Pile): void {
  let image = g.querySelector<SVGImageElement>("image");
  if (!image) {
    image = document.createElementNS(SVG, "image") as SVGImageElement;
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("image-rendering", "pixelated");
    g.append(image);
  }
  const href = pileUrl(pile);
  if (image.getAttribute("href") === href) return;
  const { w, h, mid } = pileSize(pile);
  image.setAttribute("href", href);
  image.dataset.w = String(w);
  image.dataset.h = String(h);
  image.dataset.mid = String(mid);
  const regiment = pack.states[Number(g.dataset.state)]?.military?.find(r => r.i === Number(g.dataset.id));
  if (regiment) placeRegiment(g, regiment.x, regiment.y);
}

/** Put a regiment's art on a point: its top card's middle there */
export function placeRegiment(g: SVGGElement, x: number, y: number): void {
  g.setAttribute("transform-origin", `${x}px ${y}px`);
  const el = g.querySelector<SVGImageElement>("image");
  if (!el?.dataset.w) return;
  const w = Number(el.dataset.w);
  el.setAttribute("x", String(rn(x - w / 2, 2)));
  el.setAttribute("y", String(rn(y - Number(el.dataset.mid), 2)));
  el.setAttribute("width", String(w));
  el.setAttribute("height", el.dataset.h!);
}

function add(g: SVGGElement, tag: string, kind: string): SVGElement {
  const element = document.createElementNS(SVG, tag) as SVGElement;
  element.setAttribute("class", kind);
  g.append(element);
  return element;
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
  queueMicrotask(() => window.dispatchEvent(new Event("fl:restack"))); // units.ts gives it its art
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

/** A settlement's garrison as pips on its symbol's top edge, one per quarter full; hover tells, a click opens it */
export function drawSettlements(armies = document.getElementById("armies")): void {
  if (!armies) return;
  let layer = armies.querySelector<SVGGElement>(":scope > g#flSettlements");
  if (!layer) {
    layer = document.createElementNS(SVG, "g");
    layer.id = "flSettlements";
  }
  armies.prepend(layer);
  layer.replaceChildren();
  for (const burg of pack.burgs ?? []) {
    if (!burg?.i || burg.removed || !burg.state || !sizeOf(burg)) continue;
    const garrison = garrisonOf(burg);
    const used = garrison ? rows(garrison.u).length : 0;
    if (!used) continue;
    const slots = garrisonSlots(burg.i) || 1;
    const pips = Math.max(1, Math.min(MAX_PIPS, Math.ceil((used / slots) * MAX_PIPS)));
    const side = SYMBOL[isCapital(burg) ? "capital" : (sizeOf(burg) ?? "town")];
    const g = document.createElementNS(SVG, "g");
    g.dataset.burg = String(burg.i);
    g.classList.add("flSettle");
    g.setAttribute("transform-origin", `${burg.x}px ${burg.y}px`);
    g.setAttribute("shape-rendering", "crispEdges");
    const colour = colourOf(burg.state);
    const x0 = burg.x - (pips * 2 + 1) / 2;
    const y0 = burg.y - side / 2 - PIP;
    for (let k = 0; k < pips; k++) {
      const pip = add(g, "rect", "flPip");
      pip.setAttribute("x", String(rn(x0 + k * 2, 2)));
      pip.setAttribute("y", String(rn(y0, 2)));
      pip.setAttribute("width", String(PIP));
      pip.setAttribute("height", String(PIP));
      pip.setAttribute("fill", "#111111");
      const dot = add(g, "rect", "flPip");
      dot.setAttribute("x", String(rn(x0 + k * 2 + 1, 2)));
      dot.setAttribute("y", String(rn(y0 + 1, 2)));
      dot.setAttribute("width", "1");
      dot.setAttribute("height", "1");
      dot.setAttribute("fill", colour);
    }
    layer.append(g);
  }
}
