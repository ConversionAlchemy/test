// Bays of the sea: water reaching into the land through a narrow mouth. The open sea is the water at least OPEN
// steps from land, grown back by the same; what water it doesn't cover is inlets and narrows, each group a bay
import { cellOfGrid } from "./one-grid";

const OPEN = 2;
const MIN = 3;

/** Packed water cells of each sea inlet, biggest first */
export function seaInlets(): number[][] {
  const { h, c } = grid.cells;
  const n = h.length;
  const water = (g: number) => h[g] < 20;
  // steps to the nearest land
  const toLand = new Int32Array(n).fill(-1);
  let frontier: number[] = [];
  for (let g = 0; g < n; g++) if (!water(g)) (toLand[g] = 0), frontier.push(g);
  for (let d = 1; frontier.length; d++) {
    const next: number[] = [];
    for (const g of frontier) for (const j of c[g]) if (toLand[j] < 0) (toLand[j] = d), next.push(j);
    frontier = next;
  }
  // the open sea, grown back towards the shore within the water
  const open = new Uint8Array(n);
  frontier = [];
  for (let g = 0; g < n; g++) if (water(g) && toLand[g] > OPEN) (open[g] = 1), frontier.push(g);
  for (let d = 0; d < OPEN; d++) {
    const next: number[] = [];
    for (const g of frontier) for (const j of c[g]) if (water(j) && !open[j]) (open[j] = 1), next.push(j);
    frontier = next;
  }
  const seen = new Uint8Array(n);
  const out: number[][] = [];
  for (let g = 0; g < n; g++) {
    if (seen[g] || !water(g) || open[g]) continue;
    const group = [g];
    seen[g] = 1;
    for (let q = 0; q < group.length; q++)
      for (const j of c[group[q]]) if (!seen[j] && water(j) && !open[j]) (seen[j] = 1), group.push(j);
    // only sea: a group touching no open water is a lake, named already
    if (group.length < MIN || !group.some(g2 => c[g2].some(j => open[j]))) continue;
    const cells = group.map(cellOfGrid).filter(i => i >= 0 && pack.features[pack.cells.f[i]]?.type === "ocean");
    if (cells.length >= MIN) out.push(cells);
  }
  return out.sort((a, b) => b.length - a.length);
}
