// Regiments on the map, Fluoria's way: they stand at the centre of their cell, share a cell as a stack, and a
// selected one dims everything it can't reach in one move. A drag ends on a reachable cell or not at all
import { select } from "d3";
import type { Regiment } from "@/generators/military-generator";
import { getRegimentWidth } from "@/renderers/draw-military";
import { cargo, carry, land, landingCells, load } from "./boarding";
import { canStand, reachable } from "./movement";
import { dimPixelMap } from "./pixel-map-sync";

let range: Map<number, number> | null = null;
let rangeOf: Regiment | null = null;

const regimentsAt = (cell: number) =>
  pack.states.flatMap(state =>
    state.i && !state.removed ? (state.military ?? []).filter(r => !r.hidden && r.cell === cell) : []
  );

// regiment boxes keep about this height on screen, whatever the zoom: small chips far out, a little bigger close in
const BOX_PX = [
  [0, 11],
  [1.5, 16],
  [4.5, 20],
  [8, 24]
] as const;
let unitScale = 1;

/** Scale every regiment box around its own point so its on-screen size follows BOX_PX, not the map zoom */
export function applyUnitZoom(scale: number): void {
  const armies = document.getElementById("armies");
  if (!armies || !scale || !styles?.military) return;
  let px: number = BOX_PX[0][1];
  for (const [from, size] of BOX_PX) if (scale >= from) px = size;
  const box = styles.military.options.boxSize * 2; // box height in map units
  unitScale = Math.max(0.02, px / (box * scale));
  armies.style.setProperty("--fl-unit", String(unitScale));
  armies.dataset.flNames = scale >= 4.5 ? "1" : "0";
  for (const stack of stacks) layStack(stack, false); // only the offsets of shared cells change with size
}

let stacks: Regiment[][] = [];

/** Markers stand at their cell's centre, or on the settlement in it */
export function snapMarkers(): boolean {
  let moved = false;
  for (const marker of pack.markers ?? []) {
    if (marker.cell === undefined) continue;
    const burg = pack.cells.burg[marker.cell];
    const [x, y] = burg ? [pack.burgs[burg].x, pack.burgs[burg].y] : pack.cells.p[marker.cell];
    if (marker.x === x && marker.y === y) continue;
    marker.x = x;
    marker.y = y;
    moved = true;
  }
  return moved;
}

/** The cell a regiment stands in is the cell under its point; standing means its centre */
export function snapAll(): boolean {
  let moved = false;
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    for (const regiment of state.military ?? []) {
      const cell = Pack.findCell(regiment.x, regiment.y) ?? regiment.cell;
      const [x, y] = pack.cells.p[cell];
      if (regiment.cell === cell && regiment.x === x && regiment.y === y) continue;
      regiment.cell = cell;
      regiment.x = x;
      regiment.y = y;
      moved = true;
    }
  }
  return moved;
}

/** Show what a regiment can reach this move */
export function selectRegiment(regiment: Regiment): void {
  range = reachable(regiment);
  rangeOf = regiment;
  dimPixelMap(new Set(range.keys()));
}

export function clearSelection(): void {
  range = null;
  rangeOf = null;
  dimPixelMap(null);
  outline(null);
}

/** While dragging: outline the cell under the pointer if the regiment may end there */
export function dragOver(regiment: Regiment, x: number, y: number): void {
  if (rangeOf !== regiment) selectRegiment(regiment);
  const cell = Pack.findCell(x, y);
  outline(cell !== undefined && range?.has(cell) ? cell : null);
}

/** Where a dragged regiment ends up: the centre of a reachable cell, or null to put it back */
export function dropAt(regiment: Regiment, x: number, y: number): [number, number] | null {
  outline(null);
  const cell = Pack.findCell(x, y);
  if (cell === undefined || !range?.has(cell) || !canStand(regiment, cell)) return null;
  regiment.cell = cell;
  const [cx, cy] = pack.cells.p[cell];
  return [cx, cy];
}

/** After a move the reach is measured again from the new cell, and anyone aboard comes along */
export function moved(regiment: Regiment): void {
  if (regiment.n) carry(regiment);
  selectRegiment(regiment);
  stackAll();
}

/** The regiment whose reach is shown, if any */
export const selected = (): Regiment | null => rangeOf;

/** Pick a land cell next to the fleet for its troops: the cells light up, a click lands them, Escape cancels */
export function chooseLanding(fleet: Regiment, troops: Regiment[], done: () => void): void {
  const targets = new Set(landingCells(fleet));
  if (!targets.size || !troops.length) return;
  dimPixelMap(targets);
  const map = document.getElementById("map");
  const finish = () => {
    map?.removeEventListener("click", onClick, true);
    map?.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("keyup", onKey, true);
    outline(null);
    if (rangeOf) selectRegiment(rangeOf);
    else dimPixelMap(null);
  };
  const cellAt = (event: MouseEvent) => {
    const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
    const matrix = viewbox?.getScreenCTM()?.inverse();
    if (!matrix) return undefined;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return Pack.findCell(point.x, point.y);
  };
  const onMove = (event: PointerEvent) => {
    const cell = cellAt(event);
    outline(cell !== undefined && targets.has(cell) ? cell : null);
  };
  const onClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const cell = cellAt(event);
    if (cell === undefined || !targets.has(cell)) return;
    for (const regiment of troops) land(regiment, cell);
    finish();
    done();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopImmediatePropagation();
    finish();
  };
  map?.addEventListener("click", onClick, true);
  map?.addEventListener("pointermove", onMove, true);
  window.addEventListener("keyup", onKey, true);
}

function outline(cell: number | null): void {
  const debug = select<SVGGElement, unknown>("#debug");
  debug.select("#flTargetCell").remove();
  if (cell === null) return;
  const points = pack.cells.v[cell].map(v => pack.vertices.p[v].join(",")).join(" ");
  debug
    .append("polygon")
    .attr("id", "flTargetCell")
    .attr("points", points)
    .attr("fill", "none")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("pointer-events", "none");
}

// --- stacks: regiments sharing a cell sit like a little deck, fanned out while the pointer is over them

const STEP = 0.6; // of the box height, per regiment in the stack

/** Offset regiments that share a cell and badge the top one with the count */
export function stackAll(): void {
  if (!document.getElementById("armies")) return;
  const byCell = new Map<number, Regiment[]>();
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    for (const regiment of state.military ?? []) {
      if (regiment.hidden) continue;
      const list = byCell.get(regiment.cell) ?? [];
      list.push(regiment);
      byCell.set(regiment.cell, list);
    }
  }
  stacks = [...byCell.values()].filter(stack => stack.length > 1);
  for (const stack of byCell.values()) layStack(stack, false);
  for (const state of pack.states)
    for (const fleet of state.i && !state.removed ? (state.military ?? []) : []) if (fleet.n) cargoBadge(fleet);
}

/** A fleet with troops aboard shows how many it carries */
function cargoBadge(fleet: Regiment): void {
  const element = elementOf(fleet);
  element?.querySelector(".flCargo")?.remove();
  const troops = cargo(fleet).length ? load(fleet) : 0;
  const box = element?.querySelector("rect");
  if (!element || !box || !troops) return;
  const size = styles.military.options.boxSize * 2;
  const badge = document.createElementNS("http://www.w3.org/2000/svg", "text");
  badge.setAttribute("class", "flCargo");
  badge.setAttribute("x", box.getAttribute("x") ?? "0");
  badge.setAttribute("y", String(Number(box.getAttribute("y")) + size * 1.9));
  badge.setAttribute("font-size", String(size * 0.8));
  badge.textContent = `⚔ ${troops}`;
  element.append(badge);
}

const elementOf = (regiment: Regiment) =>
  document.getElementById(`regiment${regiment.state}-${regiment.i}`) as SVGGElement | null;

/** Lay a stack down as a deck, or fanned out in a row around `anchor`, which stays where it is under the pointer */
function layStack(stack: Regiment[], fanned: boolean, anchor?: Regiment): void {
  const size = styles.military.options.boxSize * 2 * unitScale;
  const deck = (k: number) => (stack.length > 1 ? [k * size * STEP, -k * size * STEP] : [0, 0]);
  const widths = stack.map(regiment => getRegimentWidth(regiment) * unitScale + size); // box plus its icon square
  const gap = size * 0.3;
  const a = Math.max(0, anchor ? stack.indexOf(anchor) : 0);
  const centres: number[] = [];
  let left = 0;
  stack.forEach((_, k) => {
    centres.push(left + widths[k] / 2);
    left += widths[k] + gap;
  });
  stack.forEach((regiment, k) => {
    const element = elementOf(regiment);
    if (!element) return;
    element.querySelector(".flStack")?.remove();
    const [dx, dy] = fanned ? [deck(a)[0] + centres[k] - centres[a], deck(a)[1]] : deck(k);
    element.style.translate = dx || dy ? `${dx}px ${dy}px` : "";
    element.dataset.stack = String(stack.length);
    if (!element.dataset.flStackBound) {
      element.dataset.flStackBound = "1";
      element.addEventListener("mouseenter", () => fan(regiment, true));
      element.addEventListener("mouseleave", () => fan(regiment, false));
    }
  });
  if (stack.length < 2) return;
  const top = stack[stack.length - 1];
  const element = elementOf(top);
  const box = element?.querySelector("rect");
  if (!element || !box || fanned) return;
  const x = Number(box.getAttribute("x")) + Number(box.getAttribute("width"));
  const y = Number(box.getAttribute("y"));
  const badge = document.createElementNS("http://www.w3.org/2000/svg", "text");
  badge.setAttribute("class", "flStack");
  badge.setAttribute("x", String(x));
  badge.setAttribute("y", String(y));
  badge.setAttribute("font-size", String(size * 0.9));
  badge.textContent = `×${stack.length}`;
  element.append(badge);
}

let fanTimer = 0;
let fannedCell: number | null = null;
function fan(regiment: Regiment, open: boolean): void {
  clearTimeout(fanTimer);
  const stack = regimentsAt(regiment.cell);
  if (stack.length < 2) return;
  if (open) {
    if (fannedCell === regiment.cell) return; // already spread: moving between its boxes keeps the layout
    fannedCell = regiment.cell;
    layStack(stack, true, regiment);
    return;
  }
  // a short grace, so moving between boxes doesn't fold them
  fanTimer = window.setTimeout(() => {
    fannedCell = null;
    layStack(stack, false);
  }, 300);
}
