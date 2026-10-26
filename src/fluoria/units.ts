// Regiments on the map, Fluoria's way: they stand at the centre of their cell, share a cell as a stack, and a
// selected one dims everything it can't reach in one move. A drag ends on a reachable cell or not at all

import { select } from "d3";
import type { Regiment } from "@/generators/military-generator";
import { paintRegiment } from "@/renderers/draw-military";
import { landingCells, unload } from "./boarding";
import { cardPower, domainOf, isTransport, kitOf, rows, slotsOf, troopsOf } from "./forces/forces";
import { CARD } from "./forces/pixels";
import { airReach, canStand, LANE_CELLS, reachable, SEA_CELLS } from "./movement";
import { cellAtPoint, cellCentre, cellOfGrid, cellPolygon, mainCell } from "./one-grid";
import { dimPixelMap } from "./pixel-map-sync";
import { laneSteps } from "./road-geometry";
import { seaCellAt, seaPoint, seaPolygon, seaReach } from "./sea-grid";
import { afterMove, blocked, hasRoom, placeOf } from "./war";

let range: Map<number, number> | null = null; // packed cells for armies, sea grid cells for fleets
let rangeOf: Regiment | null = null;

/**
 * Where a regiment stands: the cell it is measured in (sea grid cells for fleets), the packed cell it records, and
 * the cell's centre
 */
const isAirborne = (r: Regiment) => Boolean(troopsOf(r)) && domainOf(r) === "air";

const standAt = (
  regiment: Regiment,
  x: number,
  y: number
): { cell: number; packCell: number; point: [number, number] } | null => {
  if (isAirborne(regiment)) {
    // airships stand anywhere on the even grid, open sea included
    const g = Grid.findCell(x, y);
    const point = seaPoint(g);
    const own = cellOfGrid(g);
    return { cell: g, packCell: own >= 0 ? own : (Pack.findCell(point[0], point[1]) ?? regiment.cell), point };
  }
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

const CHIP_PX = 20; // a chip's height on screen, at every zoom
const FAR_MILES = 70; // past this on the ruler, a cell shows as one summary chip
let unitScale = 1;

/** Scale every regiment around its own point so its on-screen size stays the same; far out, cells fold into summaries */
export function applyUnitZoom(scale: number): void {
  const armies = document.getElementById("armies");
  if (!armies || !scale || !styles?.military) return;
  const bar = styles.scaleBar?.options?.barSize ?? 2;
  const miles = (100 * bar * options.map.units.distance.scale) / scale; // what the ruler reads
  const stage = miles > FAR_MILES ? "far" : "close";
  const box = styles.military.options.boxSize * 2; // a chip's height in map units
  unitScale = Math.max(0.02, CHIP_PX / (box * scale));
  armies.style.setProperty("--fl-unit", String(unitScale));
  armies.dataset.flStage = stage;
  armies.dataset.flNames = stage === "close" ? "1" : "0";
  layCells();
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
  if (isAirborne(regiment)) {
    range = airReach(regiment);
    dimPixelMap(new Set(range.keys()), "grid");
    return;
  }
  if (regiment.n) {
    const start = seaCellAt(regiment.x, regiment.y);
    range = start === undefined ? new Map() : seaReach(start, laneSteps(), SEA_CELLS, LANE_CELLS);
    for (const g of [...range.keys()])
      if (g !== start && !hasRoom(regiment.state, -1 - g, slotsOf(regiment.u), regiment)) range.delete(g); // by sea cell
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
  outline(spot && range?.has(spot.cell) ? spot.cell : null, Boolean(regiment.n) || isAirborne(regiment));
}

/** Where a dragged regiment ends up: the centre of a reachable cell, or null to put it back */
export function dropAt(regiment: Regiment, x: number, y: number): [number, number] | null {
  outline(null);
  const spot = standAt(regiment, x, y);
  if (!spot || !range?.has(spot.cell)) return null;
  const cell = spot.packCell;
  if (!canStand(regiment, cell) && !regiment.n && !isAirborne(regiment)) return null;
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

// --- cells: aircraft, ships and transports lie stacked on top, land units stand in a row beneath, all above a
// settlement's symbol; transports first, then the highest tier. Far out each nation's part folds into one chip

let cells: Regiment[][] = [];
let lit: { key: string; bay: number } | null = null; // the transport bay a carried unit would board
const keyOf = (r: Regiment) => `${r.state}-${r.i}`;

/** Light the bay a carried unit would take in a transport, or none */
export function lightBay(transport: Regiment | null): void {
  const next = transport ? { key: keyOf(transport), bay: rows(transport.cargo).length } : null;
  if (next?.key === lit?.key) return;
  const was = lit;
  lit = next;
  for (const key of [was?.key, next?.key]) {
    const r = key && cells.flat().find(o => keyOf(o) === key);
    if (r) repaint(r);
  }
}

const tierOf = (r: Regiment) => kitOf(rows(r.u)[0]?.unit ?? "")?.tier ?? 0;
const flat = (r: Regiment) => isTransport(r) || domainOf(r) !== "land";
const ORDER = (a: Regiment, b: Regiment) =>
  Number(isTransport(b)) - Number(isTransport(a)) || tierOf(b) - tierOf(a) || cardPower(b) - cardPower(a);

function repaint(r: Regiment): void {
  const el = elementOf(r);
  const cell = cells.find(c => c.includes(r));
  if (!el || !cell) return;
  const mine = cell.filter(o => o.state === r.state);
  const lead = isTransport(r) || mine.find(o => !isTransport(o)) === r;
  paintRegiment(el, r, lit?.key === keyOf(r) ? lit.bay : undefined, lead ? mine : undefined);
  el.classList.toggle("fl-farhide", !lead);
  el.classList.toggle("fl-lone", cell.length === 1);
}

/** Lay out every cell */
export function stackAll(): void {
  const armies = document.getElementById("armies");
  if (!armies) return;
  const byCell = new Map<number, Regiment[]>();
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    for (const regiment of state.military ?? []) {
      if (regiment.hidden) continue;
      const cell = placeOf(regiment); // a fleet: its sea grid cell
      byCell.set(cell, [...(byCell.get(cell) ?? []), regiment]);
    }
  }
  cells = [...byCell.values()];
  for (const cell of cells) {
    cell.sort(ORDER);
    for (const r of cell) repaint(r);
  }
  layCells();
  nameLabels();
}

const GAP = 1; // art pixels between cards
const sizeOf = (el: SVGGElement | null, far: boolean) => {
  const image = el?.querySelector<SVGImageElement>(far ? "image.flFar" : "image.flClose");
  return { w: Number(image?.dataset.w ?? 0), h: Number(image?.dataset.h ?? 0), mid: Number(image?.dataset.mid ?? 0) };
};

/** Each regiment's place in its cell, for the zoom showing: offsets of its card's middle from the cell's point */
function layCells(): void {
  const armies = document.getElementById("armies");
  if (!armies || !styles?.military) return;
  const far = armies.dataset.flStage === "far";
  const u = ((styles.military.options.boxSize * 2) / CARD.h) * unitScale; // map units per art pixel, as drawn
  for (const cell of cells) {
    const parts = cell.filter(r => !far || !elementOf(r)?.classList.contains("fl-farhide"));
    const spots: { r: Regiment; x: number; y: number }[] = [];
    let y = 0;
    const stack = far ? parts : parts.filter(flat);
    for (const r of stack) {
      const { h, mid } = sizeOf(elementOf(r), far);
      spots.push({ r, x: 0, y: y + mid });
      y += h + GAP;
    }
    const row = far ? [] : parts.filter(r => !flat(r));
    if (row.length) {
      const sizes = row.map(r => sizeOf(elementOf(r), false));
      const width = sizes.reduce((sum, s) => sum + s.w, 0) + GAP * 2 * (row.length - 1);
      let x = -width / 2;
      const tallest = Math.max(...sizes.map(s => s.h));
      row.forEach((r, k) => {
        spots.push({ r, x: x + sizes[k].w / 2, y: y + sizes[k].mid });
        x += sizes[k].w + GAP * 2;
      });
      y += tallest + GAP;
    }
    const total = y - GAP;
    const first = parts[0];
    const burg = first && !first.n ? pack.cells.burg[mainCell(first.cell)] : 0;
    const top = burg ? -total - CARD.h * 0.45 : -total / 2; // above a settlement's symbol, else centred
    for (const { r, x, y } of spots) {
      const el = elementOf(r);
      if (el) el.style.translate = `${x * u}px ${(top + y) * u}px`;
    }
  }
}

/** Settlement names keep their place under the symbol: units stand above it */
export function nameLabels(): void {
  for (const label of document.querySelectorAll<SVGTextElement>("#labels text[data-fl-under]")) {
    delete label.dataset.flUnder;
    label.style.translate = "0 1.5em";
  }
}

/** Regiments sharing a regiment's cell, itself included, in layout order */
export const cellOf = (regiment: Regiment): Regiment[] => cells.find(cell => cell.includes(regiment)) ?? [regiment];

const elementOf = (regiment: Regiment) =>
  document.getElementById(`regiment${regiment.state}-${regiment.i}`) as SVGGElement | null;
