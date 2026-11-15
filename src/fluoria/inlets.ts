// Bodies of sea water reaching into the land, sorted by the cells around them. The open sea is water at least OPEN
// steps from land, grown back by the same; each group of the water it doesn't cover is then:
//  - a sound where it opens onto two separate stretches of open sea (a channel between them)
//  - a bay where it opens onto one, through a mouth of at most MOUTH cells, with land along at least RIM of its edge
//  - else nothing: just the sea's own margin
// Lakes (water with no way to the sea) are Azgaar's lake features and named apart
import { cellOfGrid } from "./one-grid";

const OPEN = 2;
const MIN = 3;
const MOUTH = 3;
const RIM = 0.55;

export interface Inlet {
  cells: number[];
  kind: "Bay" | "Sound";
}

export function seaInlets(): Inlet[] {
  const { h, c } = grid.cells;
  const n = h.length;
  const water = (g: number) => h[g] < 20;
  const toLand = new Int32Array(n).fill(-1);
  let frontier: number[] = [];
  for (let g = 0; g < n; g++) if (!water(g)) (toLand[g] = 0), frontier.push(g);
  for (let d = 1; frontier.length; d++) {
    const next: number[] = [];
    for (const g of frontier) for (const j of c[g]) if (toLand[j] < 0) (toLand[j] = d), next.push(j);
    frontier = next;
  }
  const open = new Uint8Array(n);
  frontier = [];
  for (let g = 0; g < n; g++) if (water(g) && toLand[g] > OPEN) (open[g] = 1), frontier.push(g);
  for (let d = 0; d < OPEN; d++) {
    const next: number[] = [];
    for (const g of frontier) for (const j of c[g]) if (water(j) && !open[j]) (open[j] = 1), next.push(j);
    frontier = next;
  }
  // which stretch of open sea each open cell belongs to
  const sea = new Int32Array(n).fill(-1);
  let seas = 0;
  for (let g = 0; g < n; g++) {
    if (!open[g] || sea[g] >= 0) continue;
    const q = [g];
    sea[g] = seas;
    for (let k = 0; k < q.length; k++) for (const j of c[q[k]]) if (open[j] && sea[j] < 0) (sea[j] = seas), q.push(j);
    seas++;
  }
  const seen = new Uint8Array(n);
  const out: Inlet[] = [];
  for (let g = 0; g < n; g++) {
    if (seen[g] || !water(g) || open[g]) continue;
    const group = [g];
    seen[g] = 1;
    for (let q = 0; q < group.length; q++)
      for (const j of c[group[q]]) if (!seen[j] && water(j) && !open[j]) (seen[j] = 1), group.push(j);
    if (group.length < MIN) continue;
    const inside = new Set(group);
    const touched = new Set<number>();
    let mouth = 0;
    let land = 0;
    let rim = 0;
    for (const cell of group) {
      let opening = false;
      for (const j of c[cell]) {
        if (inside.has(j)) continue;
        rim++;
        if (!water(j)) land++;
        else if (open[j]) {
          touched.add(sea[j]);
          opening = true;
        }
      }
      if (opening) mouth++;
    }
    if (!touched.size) continue; // no way to the sea: a lake, named as one already
    const kind = touched.size > 1 ? "Sound" : mouth <= MOUTH && land / rim >= RIM ? "Bay" : null;
    if (!kind) continue;
    const cells = group.map(cellOfGrid).filter(i => i >= 0 && pack.features[pack.cells.f[i]]?.type === "ocean");
    if (cells.length >= MIN) out.push({ cells, kind });
  }
  return out.sort((a, b) => b.cells.length - a.cells.length);
}
