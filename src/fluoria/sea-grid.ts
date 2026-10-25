// At sea, fleets use Azgaar's original even grid instead of the packed cells: the packed sea is merged into huge
// cells offshore and slivers along coasts, the grid is the same size everywhere. Nothing is stored in grid terms:
// a fleet still records the packed cell under it, the grid only decides where it stands and how far it goes
const isWaterPack = (cell: number | undefined) => cell !== undefined && pack.cells.h[cell] < 20;

/** A grid cell a fleet may stand in: water in the grid, and water in the map as drawn */
export function seaUsable(g: number): boolean {
  if (grid.cells.h[g] >= 20) return false;
  const [x, y] = grid.points[g];
  return isWaterPack(Pack.findCell(x, y));
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

/** Every sea cell a fleet reaches this move: 6 cells across open sea, 10 along a sea lane */
export function seaReach(
  start: number,
  onLaneAt: (x: number, y: number) => boolean,
  open: number,
  lane: number
): Map<number, number> {
  const { cells, points } = grid;
  const onLane = (g: number) => onLaneAt(points[g][0], points[g][1]);
  const laneOf = new Map<number, boolean>();
  const isLane = (g: number) => laneOf.get(g) ?? laneOf.set(g, onLane(g)).get(g) ?? false;
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
      const total = cost + 1 / (isLane(cell) && isLane(next) ? lane : open);
      if (total > 1 + 1e-9 || total >= (best.get(next) ?? Infinity)) continue;
      best.set(next, total);
      queue.push([total, next]);
    }
  }
  return best;
}

export const seaPoint = (g: number): [number, number] => [grid.points[g][0], grid.points[g][1]];
export const seaPolygon = (g: number): number[] => grid.cells.v[g].flatMap(v => grid.vertices.p[v]);
