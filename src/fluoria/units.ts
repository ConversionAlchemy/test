// Regiments on the map, Fluoria's way: they stand at the centre of their cell, share a cell as a stack, and a
// selected one dims everything it can't reach in one move. A drag ends on a reachable cell or not at all

import { select } from "d3";
import type { Regiment } from "@/generators/military-generator";
import { paintRegiment, stripColour } from "@/renderers/draw-military";
import { landingCells, unload } from "./boarding";
import { cardPower, rows, slotsOf, troopsOf } from "./forces/forces";
import { canStand, LANE_CELLS, reachable, SEA_CELLS } from "./movement";
import { cellAtPoint, cellCentre, cellOfGrid, cellPolygon, mainCell } from "./one-grid";
import { dimPixelMap } from "./pixel-map-sync";
import { laneSteps } from "./road-geometry";
import { seaCellAt, seaPoint, seaPolygon, seaReach } from "./sea-grid";
import { afterMove, blocked, hasRoom } from "./war";

let range: Map<number, number> | null = null; // packed cells for armies, sea grid cells for fleets
let rangeOf: Regiment | null = null;

/**
 * Where a regiment stands: the cell it is measured in (sea grid cells for fleets), the packed cell it records, and
 * the cell's centre
 */
const standAt = (
  regiment: Regiment,
  x: number,
  y: number
): { cell: number; packCell: number; point: [number, number] } | null => {
  if (regiment.n) {
    const g = seaCellAt(x, y);
    if (g === undefined) return null;
    const point = seaPoint(g);
    const own = cellOfGrid(g);
    return { cell: g, packCell: own >= 0 ? own : (Pack.findCell(point[0], point[1]) ?? regiment.cell), point };
  }
  const cell = cellAtPoint(x, y);
  return cell === undefined ? null : { cell, packCell: cell, point: cellCentre(cell) };
};

// on-screen card size by zoom: the far card (23×23) out to 3, then the close card (29×29), growing a little
const STAGES = [
  [0, 18, "far"],
  [1.5, 23, "far"],
  [3, 44, "close"],
  [6, 52, "close"],
  [10, 58, "close"]
] as const;
let unitScale = 1;

/** Scale every regiment around its own point so its on-screen size follows the zoom stage, not the map zoom */
export function applyUnitZoom(scale: number): void {
  const armies = document.getElementById("armies");
  if (!armies || !scale || !styles?.military) return;
  let [, px, stage]: readonly [number, number, string] = STAGES[0];
  for (const [from, size, name] of STAGES) if (scale >= from) [px, stage] = [size, name];
  const box = styles.military.options.boxSize * 2; // art size in map units
  unitScale = Math.max(0.02, px / (box * scale));
  armies.style.setProperty("--fl-unit", String(unitScale));
  armies.dataset.flStage = stage;
  armies.dataset.flNames = stage === "close" ? "1" : "0";
  for (const stack of stacks) layStack(stack); // only an open stack's offsets change with size
  laySettlements();
  nameLabels();
}

/** Markers stand at their cell's centre, or on the settlement in it */
export function snapMarkers(): boolean {
  let moved = false;
  for (const marker of pack.markers ?? []) {
    if (marker.cell === undefined) continue;
    const at = mainCell(marker.cell);
    const burg = pack.cells.burg[at];
    const [x, y] = burg ? [pack.burgs[burg].x, pack.burgs[burg].y] : cellCentre(at);
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
      const cell = spot.packCell;
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
    range = start === undefined ? new Map() : seaReach(start, laneSteps(), SEA_CELLS, LANE_CELLS);
    for (const g of [...range.keys()]) {
      const cell = cellOfGrid(g);
      if (cell >= 0 && g !== start && !hasRoom(regiment.state, cell, slotsOf(regiment.u), regiment)) range.delete(g);
    }
    dimPixelMap(new Set(range.keys()), "sea");
    return;
  }
  range = reachable(regiment);
  for (const cell of blocked(regiment)) range.delete(cell); // an enemy army is attacked, not walked into
  for (const cell of [...range.keys()])
    if (cell !== mainCell(regiment.cell) && !hasRoom(regiment.state, cell, slotsOf(regiment.u), regiment))
      range.delete(cell);
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
  const cell = spot.packCell;
  if (!canStand(regiment, cell) && !regiment.n) return null;
  regiment.cell = cell;
  return spot.point;
}

/** After a move: enemy ground taken or freed, and the reach measured again from the new cell */
export function moved(regiment: Regiment): void {
  if (afterMove(regiment)) window.dispatchEvent(new Event("fl:occupation"));
  selectRegiment(regiment);
  stackAll();
}

/** The regiment whose reach is shown, if any */
export const selected = (): Regiment | null => rangeOf;

/** Pick a land cell beside a transport for its cargo: the cells light up, a click lands them, Escape cancels */
export function chooseLanding(transport: Regiment, done: () => void): void {
  const aboard = slotsOf(transport.cargo);
  const units = rows(transport.cargo).length;
  const targets = new Set(
    landingCells(transport).filter(cell => hasRoom(transport.state, cell, aboard, undefined, units))
  );
  if (!targets.size) return;
  if (targets.size === 1) {
    unload(transport, [...targets][0]);
    done();
    return;
  }
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
    return cellAtPoint(point.x, point.y);
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
    unload(transport, cell);
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
  const flat = sea ? seaPolygon(cell) : cellPolygon(cell);
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

// --- stacks: units sharing a cell show as one card, the strongest, with a strip on top for each one behind and
// the cell's total below; a tab beside it opens the cell into a row of cards, the stack darkened

let stacks: Regiment[][] = [];
let openCell: number | null = null;

/** Lay out every shared cell as a stack */
export function stackAll(): void {
  const armies = document.getElementById("armies");
  if (!armies) return;
  const byCell = new Map<number, Regiment[]>();
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    for (const regiment of state.military ?? []) {
      if (regiment.hidden) continue;
      const cell = mainCell(regiment.cell);
      const list = byCell.get(cell) ?? [];
      list.push(regiment);
      byCell.set(cell, list);
    }
  }
  stacks = [...byCell.values()].filter(stack => stack.length > 1);
  for (const stack of stacks) stack.sort((a, b) => cardPower(b) - cardPower(a));
  if (openCell !== null && !stacks.some(stack => mainCell(stack[0].cell) === openCell)) openCell = null;
  document.getElementById("flGhost")?.remove();
  for (const stack of stacks) layStack(stack);
  unitCells = new Set(byCell.keys());
  laySettlements();
  nameLabels();
}

let unitCells = new Set<number>();

/** A garrison's count rises above a unit card standing on its settlement */
function laySettlements(): void {
  const size = styles.military.options.boxSize * 2 * unitScale;
  for (const g of document.querySelectorAll<SVGGElement>("#flSettlements > g")) {
    const burg = pack.burgs[Number(g.dataset.burg)];
    const shared = burg && unitCells.has(mainCell(burg.cell));
    g.style.translate = shared ? `0px ${-size * 0.45}px` : "";
  }
}

/** A settlement's name sits just below a unit card standing on it (and below the far card's total), at any zoom */
export function nameLabels(): void {
  const armies = document.getElementById("armies");
  if (!armies || !styles?.military) return;
  const h = styles.military.options.boxSize * 2 * unitScale; // the card's size on the map
  const far = armies.dataset.flStage === "far";
  for (const burg of pack.burgs ?? []) {
    if (!burg?.i || burg.removed) continue;
    const label = document.getElementById(`burgLabel${burg.i}`) as SVGTextElement | null;
    if (!label) continue;
    if (!unitCells.has(mainCell(burg.cell))) {
      if (label.dataset.flUnder) {
        delete label.dataset.flUnder;
        label.style.translate = "";
      }
      continue;
    }
    label.dataset.flUnder = "1";
    const bottom = burg.y + h * (far ? 1.05 : 0.5) + h * 0.08;
    let top = burg.y;
    try {
      top = label.getBBox().y;
    } catch {}
    label.style.translate = `0px ${Math.max(0, bottom - top)}px`;
  }
}

/** Regiments sharing a regiment's cell, itself included, strongest first */
export const stackOf = (regiment: Regiment): Regiment[] => stacks.find(stack => stack.includes(regiment)) ?? [regiment];

export const isOpen = (regiment: Regiment) => openCell === mainCell(regiment.cell);

/** Open a shared cell into a row of cards, or close it */
export function toggleStack(regiment: Regiment): void {
  const cell = mainCell(regiment.cell);
  openCell = openCell === cell ? null : cell;
  stackAll();
}

export function closeStack(): void {
  if (openCell === null) return;
  openCell = null;
  stackAll();
}

const elementOf = (regiment: Regiment) =>
  document.getElementById(`regiment${regiment.state}-${regiment.i}`) as SVGGElement | null;

function layStack(stack: Regiment[]): void {
  const [front, ...behind] = stack;
  const open = openCell === mainCell(front.cell);
  const total = stack.reduce((sum, r) => sum + troopsOf(r), 0);
  const frontEl = elementOf(front);
  if (!frontEl) return;
  // drawn back to front, so the front card is on top
  for (const r of [...behind].reverse()) {
    const el = elementOf(r);
    if (el) frontEl.parentNode === el.parentNode ? frontEl.before(el) : el.parentNode?.append(el);
  }
  frontEl.parentNode?.append(frontEl);
  const size = styles.military.options.boxSize * 2 * unitScale;
  if (!open) {
    paintRegiment(frontEl, front, behind.map(stripColour), total);
    frontEl.classList.remove("fl-row");
    frontEl.style.translate = "";
    for (const r of behind) {
      const el = elementOf(r);
      if (!el) continue;
      el.classList.add("fl-behind");
      el.classList.remove("fl-row");
      el.style.translate = "";
    }
    return;
  }
  // the stack stays behind, darkened; every card stands in a row to its right
  const armies = document.getElementById("armies")!;
  const ghost = document.createElementNS("http://www.w3.org/2000/svg", "g");
  ghost.id = "flGhost";
  paintRegiment(ghost, front, behind.map(stripColour), total);
  ghost.querySelector(".flTab")?.classList.add("fl-tab-open");
  armies.append(ghost);
  paintRegiment(frontEl, front);
  stack.forEach((r, k) => {
    const el = elementOf(r);
    if (!el) return;
    el.classList.remove("fl-behind");
    el.classList.add("fl-row");
    el.style.translate = `${size * (1.3 + k * 1.04)}px 0px`;
  });
  for (const r of stack) elementOf(r)?.parentNode?.appendChild(elementOf(r)!);
}
