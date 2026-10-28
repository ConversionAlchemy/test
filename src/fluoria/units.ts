// Regiments on the map, Fluoria's way: they stand at the centre of their cell, a nation's units of one type there lie
// as one pile, and a selected one dims everything it can't reach in one move

import { select } from "d3";
import type { Regiment } from "@/generators/military-generator";
import { colourOf, setArt } from "@/renderers/draw-military";
import { landingCells, unload } from "./boarding";
import { ART_PX, MAX_PIPS, PIP, SYMBOL } from "./constants";
import { CARD_W, pileSize } from "./forces/cards";
import { domainOf, health, kitOf, rows, slotsOf, troopsOf, typeOf } from "./forces/forces";
import { airReach, canStand, LANE_CELLS, reachable, SEA_CELLS } from "./movement";
import { cellAtPoint, cellCentre, cellOfGrid, cellPolygon, mainCell } from "./one-grid";
import { dimPixelMap } from "./pixel-map-sync";
import { laneSteps } from "./road-geometry";
import { seaCellAt, seaPoint, seaPolygon, seaReach } from "./sea-grid";
import { rankOf } from "./settlement-size";
import { isCapital } from "./settlements";
import { afterMove, blocked, hasRoom, placeOf } from "./war";

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

const PILE_GAP = 8; // screen pixels kept between piles far out: closer ones merge
let unitScale = 1;
let far = false;

/** Units keep their size on screen; far out, a nation's nearby units merge into one pile and can't be dragged */
export function applyUnitZoom(scale: number): void {
  const armies = document.getElementById("armies");
  if (!armies || !scale) return;
  unitScale = ART_PX / scale;
  armies.style.setProperty("--fl-unit", String(unitScale));
  const wasFar = far;
  far = (grid?.spacing ?? 10) * scale < CARD_W * ART_PX * 1.5; // cells too close for their piles not to overlap
  armies.dataset.flStage = far ? "far" : "close";
  clearTimeout(settle);
  if (far !== wasFar) layCells();
  else if (far) settle = window.setTimeout(layCells, 120); // piles regroup once the zoom stops
}
let settle = 0;

/** Whether units are merged into piles at this zoom: no dragging then */
export const isFar = () => far;

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

type Kind = "land" | "sea" | "grid";

/** Where a regiment can end this move, and in which cells that's measured: a pure reading, nothing shown */
export function rangeFor(regiment: Regiment): { range: Map<number, number>; kind: Kind } {
  if (isAirborne(regiment)) return { range: airReach(regiment), kind: "grid" };
  if (regiment.n) {
    const start = seaCellAt(regiment.x, regiment.y);
    const reach = start === undefined ? new Map() : seaReach(start, laneSteps(), SEA_CELLS, LANE_CELLS);
    for (const g of [...reach.keys()])
      if (g !== start && !hasRoom(regiment.state, -1 - g, slotsOf(regiment.u), regiment)) reach.delete(g); // by sea cell
    return { range: reach, kind: "sea" };
  }
  const reach = reachable(regiment);
  for (const cell of blocked(regiment)) reach.delete(cell); // an enemy army is attacked, not walked into
  for (const cell of [...reach.keys()])
    if (cell !== mainCell(regiment.cell) && !hasRoom(regiment.state, cell, slotsOf(regiment.u), regiment))
      reach.delete(cell);
  return { range: reach, kind: "land" };
}

/** Show what a regiment can reach this move */
export function selectRegiment(regiment: Regiment): void {
  rangeOf = regiment;
  const { range: reach, kind } = rangeFor(regiment);
  dimPixelMap(new Set(reach.keys()), kind);
}

export function clearSelection(): void {
  rangeOf = null;
  dimPixelMap(null);
  outline(null);
}

/** Where a regiment would stand if let go at a map point within a range: its packed cell and point, or null */
export function spotIn(
  regiment: Regiment,
  reach: Map<number, number>,
  x: number,
  y: number
): { cell: number; point: [number, number]; measured: number } | null {
  const spot = standAt(regiment, x, y);
  if (!spot || !reach.has(spot.cell)) return null;
  if (!canStand(regiment, spot.packCell) && !regiment.n && !isAirborne(regiment)) return null;
  return { cell: spot.packCell, point: spot.point, measured: spot.cell };
}

/** The cell a regiment is measured in under a map point (a fleet's sea grid cell), for outlining */
export const measuredAt = (regiment: Regiment, x: number, y: number) => standAt(regiment, x, y);
export const isAfloat = (regiment: Regiment) => Boolean(regiment.n) || isAirborne(regiment);

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

/** Outline a cell: white where the dragged units may go, red where they may not */
export function outline(cell: number | null, sea = false, refused = false): void {
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
    .attr("stroke", refused ? "#e0533f" : "#ffffff")
    .attr("stroke-width", 2)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("pointer-events", "none");
}

// --- stacks: a nation's units of one type in one cell lie as one pile, the healthiest on top. Ships and airships pile
// above the land units' row, and all of it above a settlement's symbol. Hovering a pile spreads it so any card can be
// grabbed. Far out a nation's units close together merge into one pile

export interface Stack {
  key: string;
  state: number;
  place: number; // the cell, or a fleet's sea grid cell as a negative number
  unit: string;
  members: Regiment[]; // healthiest first: the top card
}

let stacks: Stack[] = [];
let byRegiment = new Map<Regiment, Stack>();
let spreadKey: string | null = null;
let piles = new Map<Regiment, { members: Regiment[]; x: number; y: number }>(); // far out: each pile's leader

const flat = (r: Regiment) => domainOf(r) !== "land";
const tierOf = (r: Regiment) => kitOf(typeOf(r) ?? "")?.tier ?? 0;

/** Group every visible regiment into stacks, then lay them out */
export function stackAll(): void {
  const groups = new Map<string, Stack>();
  for (const state of pack.states) {
    if (!state.i || state.removed) continue;
    for (const r of state.military ?? []) {
      if (r.hidden) continue;
      const place = placeOf(r);
      const unit = typeOf(r) ?? "";
      const key = `${r.state}|${place}|${unit}`;
      const stack = groups.get(key) ?? { key, state: r.state, place, unit, members: [] };
      groups.set(key, stack);
      stack.members.push(r);
    }
  }
  stacks = [...groups.values()];
  byRegiment = new Map();
  for (const stack of stacks) {
    stack.members.sort((a, b) => health(b) - health(a) || troopsOf(b) - troopsOf(a));
    for (const r of stack.members) byRegiment.set(r, stack);
  }
  if (spreadKey && !groups.has(spreadKey)) spreadKey = null;
  layCells();
}

window.addEventListener("fl:restack", () => stackAll());

export const stackOf = (r: Regiment): Stack | undefined => byRegiment.get(r);

/** Regiments sharing a regiment's cell, itself included */
export const cellOf = (regiment: Regiment): Regiment[] => {
  const place = stackOf(regiment)?.place;
  return place === undefined ? [regiment] : stacks.filter(s => s.place === place).flatMap(s => s.members);
};

/** Far out: the units merged into the pile a regiment leads or belongs to */
export function pileOf(r: Regiment): Regiment[] {
  for (const pile of piles.values()) if (pile.members.includes(r)) return pile.members;
  return [r];
}

/** Spread a stack so every card can be grabbed, or fold it back (null) */
export function spread(stack: Stack | null): void {
  const key = stack && stack.members.length > 1 && !far ? stack.key : null;
  if (key === spreadKey) return;
  spreadKey = key;
  layCells();
  // a spread pile lies over its neighbours
  for (const r of stack && key ? stack.members : []) {
    const el = elementOf(r);
    el?.parentElement?.append(el);
    if (el?.parentElement) el.parentElement.parentElement?.append(el.parentElement);
  }
}
export const spreadStack = () => stacks.find(s => s.key === spreadKey) ?? null;

const pileArt = (members: Regiment[], unit = typeOf(members[0]) ?? "") => {
  const kit = kitOf(unit);
  if (!kit) return null;
  const lead = members[0];
  return {
    unit: kit,
    colour: colourOf(lead.origin ?? lead.state),
    count: members.length,
    health: members.reduce((sum, r) => sum + health(r), 0) / members.length,
    pips: Math.min(MAX_PIPS, rows(lead.cargo).length)
  };
};

/** The most common unit type of a merged pile, the higher tier on a tie */
function leadingType(members: Regiment[]): string {
  const count = new Map<string, number>();
  for (const r of members) count.set(typeOf(r) ?? "", (count.get(typeOf(r) ?? "") ?? 0) + 1);
  return [...count.entries()].sort(([a, n], [b, m]) => m - n || (kitOf(b)?.tier ?? 0) - (kitOf(a)?.tier ?? 0))[0][0];
}

const GAP = 1; // art pixels between cards

/** Each regiment's art and its place: its pile's top card middle, offset from its own point */
function layCells(): void {
  if (!document.getElementById("armies")) return;
  piles = new Map();
  const shown = new Map<Regiment, { art: ReturnType<typeof pileArt>; x: number; y: number }>();
  if (far) layFar(shown);
  else layClose(shown);
  for (const stack of stacks)
    for (const r of stack.members) {
      const el = elementOf(r);
      if (!el) continue;
      const spot = shown.get(r);
      el.classList.toggle("fl-hide", !spot?.art);
      el.classList.toggle("fl-pile", Boolean(spot && (spot.art?.count ?? 1) > 1));
      if (!spot?.art) continue;
      setArt(el, spot.art);
      el.style.translate = `calc(var(--fl-unit) * ${spot.x}px) calc(var(--fl-unit) * ${spot.y}px)`; // follows the zoom
    }
}

function layClose(shown: Map<Regiment, { art: ReturnType<typeof pileArt>; x: number; y: number }>): void {
  const byPlace = new Map<number, Stack[]>();
  for (const stack of stacks) byPlace.set(stack.place, [...(byPlace.get(stack.place) ?? []), stack]);
  for (const here of byPlace.values()) {
    here.sort((a, b) => tierOf(b.members[0]) - tierOf(a.members[0]));
    const column = here.filter(s => flat(s.members[0]));
    const row = here.filter(s => !flat(s.members[0]));
    const spots: { stack: Stack; x: number; y: number }[] = [];
    let y = 0;
    for (const stack of column) {
      const size = pileSize(pileArt(stack.members) ?? { count: 1, pips: 0 });
      spots.push({ stack, x: 0, y: y + size.mid });
      y += size.h + GAP;
    }
    if (row.length) {
      const sizes = row.map(s => pileSize(pileArt(s.members) ?? { count: 1, pips: 0 }));
      const width = row.length * CARD_W + GAP * 2 * (row.length - 1);
      for (const [k, stack] of row.entries())
        spots.push({ stack, x: -width / 2 + CARD_W / 2 + k * (CARD_W + GAP * 2), y: y + sizes[k].mid });
      y += Math.max(...sizes.map(s => s.h)) + GAP;
    }
    const first = here[0].members[0];
    const burg = pack.cells.burg[mainCell(first.cell)]; // a fleet in harbour too
    const town = burg ? pack.burgs[burg] : null;
    const symbol = town ? SYMBOL[isCapital(town) ? "capital" : rankOf(town)] : 0;
    const top = town ? -y - symbol / 2 - PIP - 1 : -y / 2; // above a settlement's symbol and its pips, else centred
    for (const { stack, x, y: sy } of spots) {
      const [lead, ...rest] = stack.members;
      if (stack.key === spreadKey) {
        const width = stack.members.length * (CARD_W + GAP) - GAP;
        for (const [k, r] of stack.members.entries())
          shown.set(r, { art: pileArt([r]), x: x - width / 2 + CARD_W / 2 + k * (CARD_W + GAP), y: top + sy });
        continue;
      }
      shown.set(lead, { art: pileArt(stack.members), x, y: top + sy });
      for (const r of rest) shown.set(r, { art: null, x: 0, y: 0 });
    }
  }
}

/** Far out: a nation's cells closer than a pile's width on screen merge, round the one with most units */
function layFar(shown: Map<Regiment, { art: ReturnType<typeof pileArt>; x: number; y: number }>): void {
  const reach = ((CARD_W * ART_PX + PILE_GAP) / ART_PX) * unitScale; // map units
  const parts = new Map<string, Regiment[]>();
  for (const stack of stacks) {
    const key = `${stack.state}|${stack.place}`;
    parts.set(key, [...(parts.get(key) ?? []), ...stack.members]);
  }
  const free = [...parts.values()].sort((a, b) => b.length - a.length);
  const taken = new Set<Regiment[]>();
  for (const part of free) {
    if (taken.has(part)) continue;
    taken.add(part);
    const [cx, cy] = [part[0].x, part[0].y];
    const members = [...part];
    for (const other of free)
      if (
        !taken.has(other) &&
        other[0].state === part[0].state &&
        Math.hypot(other[0].x - cx, other[0].y - cy) < reach
      ) {
        taken.add(other);
        members.push(...other);
      }
    const x = members.reduce((sum, r) => sum + r.x, 0) / members.length;
    const y = members.reduce((sum, r) => sum + r.y, 0) / members.length;
    const lead = [...members].sort(
      (a, b) => Number(typeOf(b) === leadingType(members)) - Number(typeOf(a) === leadingType(members))
    )[0];
    const art = pileArt([lead, ...members.filter(r => r !== lead)], leadingType(members));
    piles.set(lead, { members, x, y });
    shown.set(lead, { art, x: (x - lead.x) / unitScale, y: (y - lead.y) / unitScale });
    for (const r of members) if (r !== lead) shown.set(r, { art: null, x: 0, y: 0 });
  }
}

const elementOf = (regiment: Regiment) =>
  document.getElementById(`regiment${regiment.state}-${regiment.i}`) as SVGGElement | null;
