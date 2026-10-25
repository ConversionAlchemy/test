// Roads as Fluoria shows them: every node is a cell centre (or the settlement standing in that cell), joined by
// straight segments with lightly rounded corners. Azgaar's route data is only read here
type Point = [number, number];

/** The map point a road passes through in a cell: the settlement there, else the cell centre */
export function nodePoint(cell: number): Point {
  const burg = pack.cells.burg[cell];
  if (burg && pack.burgs[burg] && !pack.burgs[burg].removed) return [pack.burgs[burg].x, pack.burgs[burg].y];
  return [pack.cells.p[cell][0], pack.cells.p[cell][1]];
}

/** A route's cells in order, without repeats */
export function routeCells(route: (typeof pack.routes)[number]): number[] {
  const out: number[] = [];
  for (const point of route.points ?? []) {
    const cell = point[2];
    if (cell === undefined || out.at(-1) === cell) continue;
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

/** Every route as Fluoria draws it */
export function roadLines(): RoadLine[] {
  const out: RoadLine[] = [];
  for (const route of pack.routes ?? []) {
    const cells = routeCells(route);
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
