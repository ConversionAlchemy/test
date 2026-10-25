// Regiments on the map, Fluoria's way: they stand at the centre of their cell, share a cell as a stack, and a
// selected one dims everything it can't reach in one move. A drag ends on a reachable cell or not at all
import { select } from "d3";
import type { Regiment } from "@/generators/military-generator";
import { cargo, carry, land, landingCells, load } from "./boarding";
import { canStand, LANE_CELLS, laneCells, reachable, SEA_CELLS } from "./movement";
import { dimPixelMap } from "./pixel-map-sync";
import { seaCellAt, seaPoint, seaPolygon, seaReach } from "./sea-grid";

let range: Map<number, number> | null = null; // packed cells for armies, sea grid cells for fleets
let rangeOf: Regiment | null = null;

/** Where a regiment stands and the cell it is measured in: fleets on the even sea grid, armies on packed cells */
const standAt = (regiment: Regiment, x: number, y: number): { cell: number; point: [number, number] } | null => {
  if (regiment.n) {
    const g = seaCellAt(x, y);
    return g === undefined ? null : { cell: g, point: seaPoint(g) };
  }
  const cell = Pack.findCell(x, y);
  return cell === undefined ? null : { cell, point: [pack.cells.p[cell][0], pack.cells.p[cell][1]] };
};

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
  for (const stack of stacks) layStack(stack); // only the offsets of shared cells change with size
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

/** Every regiment stands at the centre of its cell: armies on packed cells, fleets on the even sea grid */
export function snapAll(): boolean {
  let moved = false;
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    for (const regiment of state.military ?? []) {
      if (regiment.carrier) continue;
      const spot = standAt(regiment, regiment.x, regiment.y);
      if (!spot) continue;
      const [x, y] = spot.point;
      const cell = Pack.findCell(x, y) ?? regiment.cell;
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
  rangeOf = regiment;
  if (regiment.n) {
    const start = seaCellAt(regiment.x, regiment.y);
    range = start === undefined ? new Map() : seaReach(start, laneCells(), SEA_CELLS, LANE_CELLS);
    dimPixelMap(new Set(range.keys()), "sea");
    return;
  }
  range = reachable(regiment);
  dimPixelMap(new Set(range.keys()), "land");
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
  const spot = standAt(regiment, x, y);
  outline(spot && range?.has(spot.cell) ? spot.cell : null, Boolean(regiment.n));
}

/** Where a dragged regiment ends up: the centre of a reachable cell, or null to put it back */
export function dropAt(regiment: Regiment, x: number, y: number): [number, number] | null {
  outline(null);
  const spot = standAt(regiment, x, y);
  if (!spot || !range?.has(spot.cell)) return null;
  const cell = Pack.findCell(spot.point[0], spot.point[1]);
  if (cell === undefined || !canStand(regiment, cell)) return null;
  regiment.cell = cell;
  return spot.point;
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
  dimPixelMap(targets, "land");
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

function outline(cell: number | null, sea = false): void {
  const debug = select<SVGGElement, unknown>("#debug");
  debug.select("#flTargetCell").remove();
  if (cell === null) return;
  const flat = sea ? seaPolygon(cell) : pack.cells.v[cell].flatMap(v => pack.vertices.p[v]);
  const pairs: string[] = [];
  for (let k = 0; k + 1 < flat.length; k += 2) pairs.push(`${flat[k]},${flat[k + 1]}`);
  const points = pairs.join(" ");
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

// --- stacks: regiments sharing a cell stand in a neat column on the cell's centre; nothing moves on hover

const GAP = 0.25; // between boxes, of the box height
const SHOWN = 3; // a column this long, or one longer than this plus one, shows a "+N" tab for the rest

/** Lay out every shared cell as a column */
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
  for (const stack of byCell.values()) layStack(stack);
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

/** A column centred on the cell: each box centred across, a small gap between them */
function layStack(stack: Regiment[]): void {
  const size = styles.military.options.boxSize * 2 * unitScale;
  const shown = stack.length > SHOWN + 1 ? SHOWN : stack.length;
  const step = size * (1 + GAP);
  stack.forEach((regiment, k) => {
    const element = elementOf(regiment);
    if (!element) return;
    element.querySelector(".flMore")?.remove();
    element.style.display = k < shown ? "" : "none";
    const dy = (k - (shown - 1) / 2) * step;
    element.style.translate = dy ? `0px ${dy}px` : "";
  });
  if (shown === stack.length) return;
  const last = elementOf(stack[shown - 1]);
  const box = last?.querySelector("rect");
  if (!last || !box) return;
  const tab = document.createElementNS("http://www.w3.org/2000/svg", "text");
  tab.setAttribute("class", "flMore");
  tab.setAttribute("x", String(Number(box.getAttribute("x")) + Number(box.getAttribute("width")) / 2));
  tab.setAttribute("y", String(Number(box.getAttribute("y")) + Number(box.getAttribute("height")) * 1.75));
  tab.setAttribute("font-size", String(styles.military.options.boxSize * 1.6));
  tab.setAttribute("text-anchor", "middle");
  tab.textContent = `+${stack.length - shown}`;
  tab.addEventListener("click", event => {
    event.stopPropagation(); // the full list, not the editor of the box it sits under
    Controllers.ContextMenu.open(event);
  });
  last.append(tab);
}
