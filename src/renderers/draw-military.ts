import { easeSinInOut, select, transition } from "d3";
import { type Pile, pileSize, pileUrl } from "@/fluoria/forces/cards";
import { refreshNames, troopsOf } from "@/fluoria/forces/forces";
import { short } from "@/fluoria/forces/pixels";
import { sizeOf } from "@/fluoria/settlement-size";
import { garrisonOf } from "@/fluoria/settlements";
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
