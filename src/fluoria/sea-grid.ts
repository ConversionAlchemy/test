// At sea, fleets use Azgaar's original even grid instead of the packed cells: the packed sea is merged into huge
// cells offshore and slivers along coasts, the grid is the same size everywhere. Nothing is stored in grid terms:
// a fleet still records the packed cell under it, the grid only decides where it stands and how far it goes
import { cellOfGrid, isPort } from "./one-grid";

/** A grid cell a fleet may stand in: sea as drawn, or a port's harbour */
export function seaUsable(g: number): boolean {
  const cell = cellOfGrid(g);
  if (cell < 0) return grid.cells.h[g] < 20;
  return pack.cells.h[cell] < 20 || isPort(cell);
}

/** The usable sea cell at a map point, or the nearest usable one around it */
export function seaCellAt(x: number, y: number): number | undefined {
  const g = Grid.findCell(x, y);
  if (seaUsable(g)) return g;
  let best: number | undefined;
  let bestD = Infinity;
  for (const n of grid.cells.c[g]) {
    if (!seaUsable(n)) continue;
    const d = (grid.points[n][0] - x) ** 2 + (grid.points[n][1] - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

/** Every sea cell a fleet reaches this move: 6 cells across open sea, 10 along the steps of a sea lane */
export function seaReach(start: number, lanes: ReadonlySet<string>, open: number, lane: number): Map<number, number> {
  const { cells } = grid;
  const best = new Map<number, number>([[start, 0]]);
  const queue: [number, number][] = [[0, start]];
  while (queue.length) {
    let k = 0;
    for (let j = 1; j < queue.length; j++) if (queue[j][0] < queue[k][0]) k = j;
    const [cost, cell] = queue[k];
    queue[k] = queue[queue.length - 1];
    queue.pop();
    if (cost > (best.get(cell) ?? Infinity)) continue;
    for (const next of cells.c[cell]) {
      if (!seaUsable(next)) continue;
      const total = cost + 1 / (lanes.has(`${cell}-${next}`) ? lane : open); // only steps along the lane itself
      if (total > 1 + 1e-9 || total >= (best.get(next) ?? Infinity)) continue;
      best.set(next, total);
      queue.push([total, next]);
    }
  }
  return best;
}

export const seaPoint = (g: number): [number, number] => [grid.points[g][0], grid.points[g][1]];
export const seaPolygon = (g: number): number[] => grid.cells.v[g].flatMap(v => grid.vertices.p[v]);
