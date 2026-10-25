import { easeSinInOut, select, transition } from "d3";
import { cardPower, flagship, isGroup, isTransport, kitOf, slotsOf, strength, troopsOf } from "@/fluoria/forces/forces";
import { KIT } from "@/fluoria/forces/kit";
import { cardUrl, iconUrl } from "@/fluoria/forces/pixels";
import type { Regiment } from "../generators/military-generator";
import { rn } from "../utils";

// Fluoria: a regiment is a pixel silhouette far out, its icon closer, and a card close in when it holds more than
// one slot. The three are drawn at once and the zoom picks one (see units.ts)

const SVG = "http://www.w3.org/2000/svg";
const size = () => styles.military.options.boxSize * 2;

export const getRegimentWidth = (_regiment: Regiment): number => size();

const colourOf = (stateId: number) => {
  const colour = pack.states[stateId]?.color;
  return colour && colour[0] === "#" && colour.length >= 7 ? colour.slice(0, 7) : "#999999";
};

function faceOf(regiment: Regiment) {
  const lead = flagship(regiment);
  const unit = (lead && kitOf(lead)) || KIT[0];
  const carrier = isTransport(regiment);
  return {
    unit,
    colour: colourOf(regiment.state),
    power: cardPower(regiment),
    troops: carrier ? troopsOf({ u: regiment.cargo ?? {} }) : troopsOf(regiment),
    slots: carrier ? slotsOf(regiment.cargo) : slotsOf(regiment.u),
    strength: strength(regiment)
  };
}

function image(g: SVGGElement, kind: string, href: string): void {
  const element = document.createElementNS(SVG, "image");
  element.setAttribute("class", kind);
  element.setAttribute("href", href);
  element.setAttribute("preserveAspectRatio", "none");
  element.setAttribute("image-rendering", "pixelated");
  g.append(element);
}

/** Fill a regiment's group: silhouette, icon, card and name */
export function paintRegiment(g: SVGGElement, regiment: Regiment): void {
  g.replaceChildren();
  const face = faceOf(regiment);
  image(g, "flDot", iconUrl(face.unit, face.colour, "silhouette"));
  image(g, "flIcon", iconUrl(face.unit, face.colour));
  const group = isGroup(regiment);
  g.classList.toggle("fl-group", group);
  if (group) image(g, "flCard", cardUrl(face));
  if (styles.military.options.showNames) {
    const name = document.createElementNS(SVG, "text");
    name.setAttribute("class", "regimentName");
    name.setAttribute("text-anchor", "middle");
    name.setAttribute("text-rendering", "optimizeSpeed");
    name.textContent = regiment.name;
    g.append(name);
  }
  placeRegiment(g, regiment.x, regiment.y);
}

/** Put a regiment's art centred on a point */
export function placeRegiment(g: SVGGElement, x: number, y: number): void {
  const h = size();
  g.setAttribute("transform-origin", `${x}px ${y}px`);
  for (const element of g.querySelectorAll("image")) {
    element.setAttribute("x", String(rn(x - h / 2, 2)));
    element.setAttribute("y", String(rn(y - h / 2, 2)));
    element.setAttribute("width", String(h));
    element.setAttribute("height", String(h));
  }
  const name = g.querySelector("text.regimentName");
  if (name) {
    name.setAttribute("x", String(rn(x, 2)));
    name.setAttribute("y", String(rn(y + h * 0.95, 2)));
    name.setAttribute("font-size", `${rn(h * 0.4, 2)}px`);
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
  armies.replaceChildren();
  armies.setAttribute("font-size", String(size()));
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    const visible = (state.military ?? []).filter(regiment => !regiment.hidden);
    if (!visible.length) continue;
    const army = armyGroup(state.i);
    for (const regiment of visible) army.append(regimentGroup(regiment, state.i));
  }
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
