// One cell size everywhere: Fluoria draws and plays on Azgaar's even grid. Each grid cell is stood for by one packed
// cell (the one on the grid point); the extra cells Azgaar adds along coasts ("slivers") fold into it. Maps made in
// Fluoria have no slivers, so there every packed cell is its own grid cell
type Point = [number, number];

interface Index {
  cells: object;
  grid: object;
  main: Int32Array; // packed cell → the packed cell standing for its grid cell
  ofGrid: Int32Array; // grid cell → its packed cell, -1 for open ocean the pack leaves out
}

let index: Index | null = null;

const hasGrid = () => Boolean(pack?.cells?.g && grid?.cells?.c && grid.points);

function build(): Index {
  const { cells } = pack;
  const n = cells.i.length;
  const ofGrid = new Int32Array(grid.cells.i.length).fill(-1);
  for (let c = 0; c < n; c++) {
    const g = cells.g[c];
    const [gx, gy] = grid.points[g];
    if (cells.p[c][0] === gx && cells.p[c][1] === gy) ofGrid[g] = c;
  }
  for (let c = 0; c < n; c++) if (ofGrid[cells.g[c]] < 0) ofGrid[cells.g[c]] = c;
  const main = new Int32Array(n);
  for (let c = 0; c < n; c++) main[c] = ofGrid[cells.g[c]];
  return { cells, grid: grid.cells, main, ofGrid };
}

function current(): Index | null {
  if (!hasGrid()) return null;
  if (!index || index.cells !== pack.cells || index.grid !== grid.cells) index = build();
  return index;
}

/** Forget the index after the graph was rebuilt in place */
export function resetOneGrid(): void {
  index = null;
}

/** The packed cell standing for a cell's grid cell */
export function mainCell(cell: number): number {
  return current()?.main[cell] ?? cell;
}

export const isSliver = (cell: number): boolean => mainCell(cell) !== cell;

/** A port settlement's cell: half land, half sea, so fleets moor in it and armies board there */
export function isPort(cell: number): boolean {
  const burg = pack.burgs?.[pack.cells.burg?.[mainCell(cell)]];
  return Boolean(burg && !burg.removed && burg.port);
}

/** The packed cell standing for a grid cell, or -1 for open ocean */
export function cellOfGrid(g: number): number {
  return current()?.ofGrid[g] ?? g;
}

/** The cell at a map point, or undefined over open ocean */
export function cellAtPoint(x: number, y: number): number | undefined {
  if (!hasGrid()) return Pack.findCell(x, y);
  const cell = cellOfGrid(Grid.findCell(x, y));
  return cell < 0 ? undefined : cell;
}

/** Neighbouring cells, one per neighbouring grid cell */
export function neighbours(cell: number): number[] {
  const idx = current();
  if (!idx) return pack.cells.c[cell];
  const out: number[] = [];
  for (const g of grid.cells.c[pack.cells.g[cell]]) {
    const next = idx.ofGrid[g];
    if (next >= 0 && !out.includes(next)) out.push(next);
  }
  return out;
}

/** A cell's centre: its grid point */
export function cellCentre(cell: number): Point {
  const point = (hasGrid() && grid.points[pack.cells.g[cell]]) || pack.cells.p[cell] || [0, 0];
  return [point[0], point[1]];
}

/** A cell's outline as flat x, y pairs: its grid cell */
export function cellPolygon(cell: number): number[] {
  if (!hasGrid()) return (pack.cells.v[cell] ?? []).flatMap(v => pack.vertices.p[v]);
  return (grid.cells.v[pack.cells.g[cell]] ?? []).flatMap(v => grid.vertices.p[v]);
}

/** Cells in a list folded to their main cells, without repeats in a row */
export function foldCells(list: number[]): number[] {
  const out: number[] = [];
  for (const cell of list) {
    const main = mainCell(cell);
    if (out.at(-1) !== main) out.push(main);
  }
  return out;
}

const distance = (cell: number, point: { x: number; y: number }) => {
  const [x, y] = cellCentre(cell);
  return (x - point.x) ** 2 + (y - point.y) ** 2;
};

// its own state's land first, then the nearest
const rank = (cell: number, burg: { x: number; y: number; state?: number }) =>
  (pack.cells.state[cell] === burg.state ? 0 : 1e9) + distance(cell, burg);

export interface FoldReport {
  moved: string[]; // settlements moved out of slivers
  clashes: string[]; // settlements left where they were: their grid cell already has one
}

/**
 * Bring a map onto the one grid: settlements stand at their cell centres, those in slivers move to the main cell.
 * Regiments and markers follow their cells. Returns what moved, for telling the user
 */
export function foldMap(): FoldReport {
  const report: FoldReport = { moved: [], clashes: [] };
  if (!current()) return report;
  const { cells } = pack;
  for (const burg of pack.burgs ?? []) {
    if (!burg?.i || burg.removed) continue;
    let cell = burg.cell;
    if (isSliver(cell)) {
      let target = mainCell(cell);
      if (cells.burg[target] && cells.burg[target] !== burg.i) {
        // that cell has a settlement already: the nearest free land cell beside it
        const free = neighbours(target)
          .filter(next => cells.h[next] >= 20 && !cells.burg[next])
          .sort((a, b) => rank(a, burg) - rank(b, burg));
        if (!free.length) {
          report.clashes.push(burg.name ?? `#${burg.i}`);
          continue;
        }
        target = free[0];
      }
      cells.burg[cell] = 0;
      cells.burg[target] = burg.i;
      burg.cell = target;
      cell = target;
      report.moved.push(burg.name ?? `#${burg.i}`);
    }
    const [x, y] = cellCentre(cell);
    burg.x = x;
    burg.y = y;
  }
  for (const state of pack.states ?? [])
    for (const regiment of state.military ?? []) if (isSliver(regiment.cell)) regiment.cell = mainCell(regiment.cell);
  for (const marker of pack.markers ?? []) if (isSliver(marker.cell)) marker.cell = mainCell(marker.cell);
  return report;
}
