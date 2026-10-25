import { beforeEach, describe, expect, it } from "vitest";
import { cellCentre, foldCells, foldMap, isSliver, mainCell, neighbours, resetOneGrid } from "./one-grid";

// grid: three cells in a row, 0–1 land, 2 sea; pack: one cell on each grid point plus a coastal sliver (3) of grid 1
function world(): void {
  globalThis.grid = {
    cells: { i: [0, 1, 2], c: [[1], [0, 2], [1]], v: [[], [], []], h: [30, 30, 10] },
    points: [
      [0, 0],
      [10, 0],
      [20, 0]
    ]
  } as unknown as typeof grid;
  globalThis.pack = {
    cells: {
      i: [0, 1, 2, 3],
      g: [0, 1, 2, 1],
      p: [
        [0, 0],
        [10, 0],
        [20, 0],
        [15, 0]
      ],
      c: [[1], [0, 3], [3], [1, 2]],
      h: [30, 30, 10, 30],
      burg: [0, 0, 0, 1]
    },
    burgs: [{}, { i: 1, cell: 3, x: 15, y: 0, name: "Sliverton" }],
    states: [],
    markers: []
  } as unknown as typeof pack;
  resetOneGrid();
}

describe("one grid", () => {
  beforeEach(world);

  it("folds slivers into the cell on the grid point", () => {
    expect(mainCell(3)).toBe(1);
    expect(isSliver(3)).toBe(true);
    expect(isSliver(1)).toBe(false);
    expect(foldCells([0, 1, 3, 2])).toEqual([0, 1, 2]);
  });

  it("finds neighbours on the grid", () => {
    expect(neighbours(1)).toEqual([0, 2]);
    expect(cellCentre(3)).toEqual([10, 0]);
  });

  it("moves settlements out of slivers onto the cell centre", () => {
    const report = foldMap();
    expect(report.moved).toEqual(["Sliverton"]);
    expect(pack.burgs[1].cell).toBe(1);
    expect(pack.cells.burg[1]).toBe(1);
    expect(pack.cells.burg[3]).toBe(0);
    expect([pack.burgs[1].x, pack.burgs[1].y]).toEqual([10, 0]);
  });
});
