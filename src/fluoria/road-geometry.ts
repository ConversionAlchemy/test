// Roads as Fluoria shows them: every node is a cell centre (or the settlement standing in that cell), joined by
// straight segments with lightly rounded corners. Azgaar's route data is only read here
import { cellCentre, foldCells, mainCell } from "./one-grid";

type Point = [number, number];

/** The map point a road passes through in a cell: the settlement there, else the cell centre */
export function nodePoint(cell: number): Point {
  const at = mainCell(cell);
  const burg = pack.cells.burg[at];
  if (burg && pack.burgs[burg] && !pack.burgs[burg].removed) return [pack.burgs[burg].x, pack.burgs[burg].y];
  return cellCentre(at);
}

/** A route's cells in order, without repeats */
export function routeCells(route: (typeof pack.routes)[number]): number[] {
  const out: number[] = [];
  const n = pack.cells.i.length;
  for (const point of route.points ?? []) {
    const cell = point[2];
    if (cell === undefined || !(cell >= 0 && cell < n) || out.at(-1) === cell) continue;
    out.push(cell);
  }
  return out;
}

/** Straight node-to-node lines with each corner cut a little, so roads read as roads, not zigzags */
export function roundedLine(nodes: Point[], cut = 0.22): Point[] {
  if (nodes.length < 3) return nodes;
  const out: Point[] = [nodes[0]];
  for (let k = 1; k < nodes.length - 1; k++) {
    const [px, py] = nodes[k - 1];
    const [x, y] = nodes[k];
    const [nx, ny] = nodes[k + 1];
    out.push([x + (px - x) * cut, y + (py - y) * cut], [x + (nx - x) * cut, y + (ny - y) * cut]);
  }
  out.push(nodes[nodes.length - 1]);
  return out;
}

export interface RoadLine {
  id: number;
  group: string;
  cells: number[];
  line: Point[];
}

/**
 * A sea lane as a run of neighbouring cells of Azgaar's even sea grid, so it snaps to sea cell centres like a road
 * does to land cells. Gaps between its points are bridged across water
 */
export function seaLaneCells(route: (typeof pack.routes)[number]): number[] {
  const usable = (g: number) => grid.cells.h[g] < 20;
  const out: number[] = [];
  for (const point of route.points ?? []) {
    const g = Grid.findCell(point[0], point[1]);
    const last = out.at(-1);
    if (g === last) continue;
    if (last === undefined || grid.cells.c[last].includes(g)) {
      out.push(g);
      continue;
    }
    out.push(...seaPath(last, g, usable).slice(1));
  }
  return out;
}

function seaPath(from: number, to: number, usable: (g: number) => boolean): number[] {
  const previous = new Map<number, number>([[from, from]]);
  let frontier = [from];
  for (let step = 0; step < 30 && frontier.length && !previous.has(to); step++) {
    const next: number[] = [];
    for (const g of frontier)
      for (const n of grid.cells.c[g]) {
        if (previous.has(n) || (!usable(n) && n !== to)) continue;
        previous.set(n, g);
        next.push(n);
      }
    frontier = next;
  }
  if (!previous.has(to)) return [from, to];
  const path = [to];
  while (path[0] !== from) path.unshift(previous.get(path[0]) as number);
  return path;
}

/** Steps of the sea grid that lie on a lane, as "a-b" keys both ways */
export function laneSteps(): Set<string> {
  const steps = new Set<string>();
  for (const route of pack.routes ?? []) {
    if (route.group !== "searoutes") continue;
    const cells = seaLaneCells(route);
    for (let k = 1; k < cells.length; k++) {
      steps.add(`${cells[k - 1]}-${cells[k]}`);
      steps.add(`${cells[k]}-${cells[k - 1]}`);
    }
  }
  return steps;
}

const gridPoint = (g: number): Point => [grid.points[g][0], grid.points[g][1]];

/** Every route as Fluoria draws it */
export function roadLines(): RoadLine[] {
  const out: RoadLine[] = [];
  for (const route of pack.routes ?? []) {
    if (route.group === "searoutes") {
      const lane = seaLaneCells(route);
      if (lane.length < 2) continue;
      // ends at the ports themselves, the rest on sea cell centres
      const nodes = lane.map(gridPoint);
      const first = route.points[0];
      const last = route.points.at(-1);
      if (first && pack.cells.burg[first[2]]) nodes[0] = nodePoint(first[2]);
      if (last && pack.cells.burg[last[2]]) nodes[nodes.length - 1] = nodePoint(last[2]);
      out.push({ id: route.i, group: route.group, cells: lane, line: roundedLine(nodes) });
      continue;
    }
    const cells = foldCells(routeCells(route));
    if (cells.length < 2) continue;
    out.push({ id: route.i, group: route.group, cells, line: roundedLine(cells.map(nodePoint)) });
  }
  return out;
}

/** The segment nearest a map point within `tolerance`: route id and the index of its first cell */
export function segmentAt(
  x: number,
  y: number,
  tolerance: number
): { id: number; k: number; a: number; b: number } | null {
  let best: { id: number; k: number; a: number; b: number } | null = null;
  let bestD = tolerance;
  for (const route of pack.routes ?? []) {
    const cells = routeCells(route);
    for (let k = 0; k + 1 < cells.length; k++) {
      const [ax, ay] = nodePoint(cells[k]);
      const [bx, by] = nodePoint(cells[k + 1]);
      const d = distanceToSegment(x, y, ax, ay, bx, by);
      if (d < bestD) {
        bestD = d;
        best = { id: route.i, k, a: cells[k], b: cells[k + 1] };
      }
    }
  }
  return best;
}

function distanceToSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

/** The road segment under a pointer event, judged on the road as drawn, within a few screen pixels */
export function roadUnder(event: MouseEvent, px = 6): ReturnType<typeof segmentAt> {
  if (!pack?.routes?.length) return null;
  const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
  const ctm = viewbox?.getScreenCTM();
  if (!ctm) return null;
  const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
  return segmentAt(x, y, px / (ctm.a || 1));
}
