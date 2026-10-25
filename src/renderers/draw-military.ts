import { easeSinInOut, select, transition } from "d3";
import {
  cardPower,
  flagship,
  isGroup,
  isTransport,
  kitOf,
  refreshNames,
  slotsOf,
  strength,
  troopsOf
} from "@/fluoria/forces/forces";
import { KIT } from "@/fluoria/forces/kit";
import { CARD, type CardFace, type CardSize, cardUrl, frameUrl, STRIP, short, tabUrl } from "@/fluoria/forces/pixels";
import { sizeOf } from "@/fluoria/settlement-size";
import { garrisonOf } from "@/fluoria/settlements";
import type { Regiment } from "../generators/military-generator";
import { rn } from "../utils";

// Fluoria: every regiment is a pixel card: far out the small one with its total below, close in the big one with its
// numbers. Both are drawn and the zoom picks one (units.ts); a shared cell shows as a stack (units.ts)

const SVG = "http://www.w3.org/2000/svg";
const size = () => styles.military.options.boxSize * 2;

export const getRegimentWidth = (_regiment: Regiment): number => size();

export const colourOf = (stateId: number) => {
  const colour = pack.states[stateId]?.color;
  return colour && colour[0] === "#" && colour.length >= 7 ? colour.slice(0, 7) : "#999999";
};

export function faceOf(regiment: Regiment, behind: string[] = []): CardFace {
  const lead = flagship(regiment);
  const carrier = isTransport(regiment);
  return {
    unit: (lead && kitOf(lead)) || KIT[0],
    colour: colourOf(regiment.state),
    single: !isGroup(regiment),
    power: cardPower(regiment),
    troops: carrier ? troopsOf({ u: regiment.cargo ?? {} }) : troopsOf(regiment),
    slots: carrier ? slotsOf(regiment.cargo) : slotsOf(regiment.u),
    strength: strength(regiment),
    behind
  };
}

/** The colour a card shows as a strip behind another */
export const stripColour = (regiment: Regiment) => {
  const face = faceOf(regiment);
  return face.single ? `${face.colour}80` : face.colour;
};

function add(g: SVGGElement, tag: string, kind: string): SVGElement {
  const element = document.createElementNS(SVG, tag) as SVGElement;
  element.setAttribute("class", kind);
  g.append(element);
  return element;
}

/** Fill a regiment's group: its two cards, the total under the far one, its name if it has one of its own */
export function paintRegiment(g: SVGGElement, regiment: Regiment, behind: string[] = [], total?: number): void {
  g.replaceChildren();
  const face = faceOf(regiment, behind);
  for (const stage of ["far", "close"] as CardSize[]) {
    const image = add(g, "image", stage === "far" ? "flFar" : "flClose");
    image.setAttribute("href", cardUrl(face, stage));
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("image-rendering", "pixelated");
    image.dataset.lift = String((behind.length * STRIP) / CARD[stage]);
    // CSS outlines and shadows misdraw under the unit scale, so selection is a frame image of its own
    const frame = add(g, "image", `${stage === "far" ? "flFar" : "flClose"} flPick`);
    frame.setAttribute("href", frameUrl(stage, behind.length * STRIP));
    frame.setAttribute("preserveAspectRatio", "none");
    frame.setAttribute("image-rendering", "pixelated");
    frame.dataset.lift = image.dataset.lift;
  }
  const sum = add(g, "text", "flTotal");
  sum.setAttribute("text-anchor", "middle");
  sum.textContent = short(total ?? face.troops);
  if (behind.length) {
    const tab = add(g, "image", "flTab");
    tab.setAttribute("href", tabUrl());
    tab.setAttribute("image-rendering", "pixelated");
  }
  g.classList.toggle("fl-group", !face.single);
  if (regiment.named && styles.military.options.showNames) {
    const name = add(g, "text", "regimentName");
    name.setAttribute("text-anchor", "middle");
    name.textContent = regiment.name;
  }
  placeRegiment(g, regiment.x, regiment.y);
}

/** Put a regiment's art centred on a point; a stack grows upwards */
export function placeRegiment(g: SVGGElement, x: number, y: number): void {
  const h = size();
  g.setAttribute("transform-origin", `${x}px ${y}px`);
  for (const image of g.querySelectorAll<SVGImageElement>("image.flFar, image.flClose")) {
    const lift = Number(image.dataset.lift || 0) * h;
    image.setAttribute("x", String(rn(x - h / 2, 2)));
    image.setAttribute("y", String(rn(y - h / 2 - lift, 2)));
    image.setAttribute("width", String(h));
    image.setAttribute("height", String(rn(h + lift, 3)));
  }
  const tab = g.querySelector("image.flTab");
  if (tab) {
    for (const [k, v] of Object.entries({
      x: x + h / 2 + h * 0.06,
      y: y - h * 0.19,
      width: h * 0.24,
      height: h * 0.38
    }))
      tab.setAttribute(k, String(rn(v, 2)));
  }
  const total = g.querySelector("text.flTotal");
  if (total) {
    total.setAttribute("x", String(rn(x, 2)));
    total.setAttribute("y", String(rn(y + h * 0.9, 2)));
    total.setAttribute("font-size", `${rn(h * 0.5, 2)}px`);
  }
  const name = g.querySelector("text.regimentName");
  if (name) {
    name.setAttribute("x", String(rn(x, 2)));
    name.setAttribute("y", String(rn(y + h * 0.9, 2)));
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

/** Close in, a settlement with troops shows their count above its symbol; hover lists them, a click opens it */
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
    count.setAttribute("text-anchor", "middle");
    count.setAttribute("x", String(rn(burg.x, 2)));
    count.setAttribute("y", String(rn(burg.y - h * 0.3, 2)));
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
