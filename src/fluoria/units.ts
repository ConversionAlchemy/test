// Regiments on the map, Fluoria's way: they stand at the centre of their cell, share a cell as a stack, and a
// selected one dims everything it can't reach in one move. A drag ends on a reachable cell or not at all
import { select } from "d3";
import type { Regiment } from "@/generators/military-generator";
import { landingCells, unload } from "./boarding";
import { cardPower, slotsOf } from "./forces/forces";
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

// on-screen size by zoom: a silhouette far out, the icon from 1.5, the card from 4.5
const STAGES = [
  [0, 10, "far"],
  [1.5, 22, "mid"],
  [4.5, 60, "close"],
  [8, 72, "close"]
] as const;
let unitScale = 1;
let zoom = 1;
let stageNow = "far";

/** Scale every regiment around its own point so its on-screen size follows the zoom stage, not the map zoom */
export function applyUnitZoom(scale: number): void {
  const armies = document.getElementById("armies");
  if (!armies || !scale || !styles?.military) return;
  let [, px, stage]: readonly [number, number, string] = STAGES[0];
  for (const [from, size, name] of STAGES) if (scale >= from) [px, stage] = [size, name];
  const box = styles.military.options.boxSize * 2; // art size in map units
  unitScale = Math.max(0.02, px / (box * scale));
  zoom = scale;
  stageNow = stage;
  armies.style.setProperty("--fl-unit", String(unitScale));
  armies.dataset.flStage = stage;
  armies.dataset.flNames = stage === "close" ? "1" : "0";
  for (const stack of stacks) layStack(stack); // only the offsets of shared cells change with size
}

let stacks: Regiment[][] = [];

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
  const targets = new Set(landingCells(transport).filter(cell => hasRoom(transport.state, cell, aboard)));
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

// --- stacks: units sharing a cell sit as a deck, the strongest in front; close in they fan out sideways

const STRIP = 4; // screen pixels of each card behind that show above the one in front
const FAN = 0.5; // close in: each card's step across, of its width

/** Lay out every shared cell as a deck */
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
  for (const stack of byCell.values()) layStack(stack);
}

/** Regiments sharing a regiment's cell, itself included, strongest first */
export const stackOf = (regiment: Regiment): Regiment[] => stacks.find(stack => stack.includes(regiment)) ?? [regiment];

const elementOf = (regiment: Regiment) =>
  document.getElementById(`regiment${regiment.state}-${regiment.i}`) as SVGGElement | null;

function layStack(stack: Regiment[]): void {
  const size = styles.military.options.boxSize * 2 * unitScale;
  const n = stack.length;
  // drawn back to front, so the strongest ends up in front
  for (let k = n - 1; k >= 0; k--) {
    const element = elementOf(stack[k]);
    if (!element) continue;
    if (n > 1) element.parentNode?.append(element);
    let dx = 0;
    let dy = 0;
    if (stageNow === "close") dx = (k - (n - 1) / 2) * size * FAN;
    else if (stageNow === "mid") dy = (-k * STRIP) / zoom;
    element.style.translate = dx || dy ? `${dx}px ${dy}px` : "";
  }
}
