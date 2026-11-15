// No unclaimed land: every land cell left neutral goes to the nation it is nearest by land; islands nobody reaches
// go to the nation nearest across the water. Settlements follow their cell.
interface Cells {
  h: { [i: number]: number; length: number };
  c: number[][];
  p: [number, number][];
  state: { [i: number]: number };
  burg: { [i: number]: number };
}

export function claimAll(cells: Cells, burgs: { state?: number }[]): number {
  const n = cells.h.length;
  const land = (i: number) => cells.h[i] >= 20;
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (land(i) && cells.state[i]) queue.push(i);
  if (!queue.length) return 0;
  let claimed = 0;
  const spread = () => {
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      for (const j of cells.c[i])
        if (land(j) && !cells.state[j]) (cells.state[j] = cells.state[i]), claimed++, queue.push(j);
    }
  };
  spread();
  // whatever is left sits on land no nation touches: give each such cell to the nearest owned cell
  const owned = queue.slice();
  for (let i = 0; i < n; i++) {
    if (!land(i) || cells.state[i]) continue;
    let best = owned[0];
    let bd = Infinity;
    for (const o of owned) {
      const d = (cells.p[o][0] - cells.p[i][0]) ** 2 + (cells.p[o][1] - cells.p[i][1]) ** 2;
      if (d < bd) (bd = d), (best = o);
    }
    cells.state[i] = cells.state[best];
    claimed++;
    queue.length = 0;
    queue.push(i);
    spread();
  }
  for (let i = 0; i < n; i++) if (cells.burg[i] && burgs[cells.burg[i]]) burgs[cells.burg[i]].state = cells.state[i];
  return claimed;
}
