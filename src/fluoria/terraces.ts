// Height in steps: every cell sits on one of seven levels, and neighbours differ by one level at most,
// so a peak is ringed by mountain, then hills, then plain, and every coast drops through shallows before deep sea.
// Levels: 0 deep sea, 1 shallow sea, 2 coast, 3 plain, 4 hill, 5 mountain, 6 snowy mountain.
export const LEVEL_BANDS: readonly (readonly [number, number])[] = [
  [0, 14],
  [15, 19],
  [20, 23],
  [24, 39],
  [40, 54],
  [55, 69],
  [70, 100]
];

export const levelOf = (h: number): number => LEVEL_BANDS.findIndex(([lo, hi]) => h >= lo && h <= hi);

interface Cells {
  h: { length: number; [i: number]: number };
  c: number[][];
}

export function applyTerraces(cells: Cells): void {
  const n = cells.h.length;
  const land = (i: number) => cells.h[i] >= 20;
  const L = new Int8Array(n);
  for (let i = 0; i < n; i++) L[i] = levelOf(cells.h[i]);

  // the sea: shallow wherever it touches land, deep everywhere else
  for (let i = 0; i < n; i++) if (!land(i)) L[i] = cells.c[i].some(land) ? 1 : 0;

  // land is capped by how far it is from the sea: coast at the shore, one level more per cell inland
  const dist = new Int32Array(n).fill(-1);
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (land(i) && cells.c[i].some(j => !land(j))) (dist[i] = 1), queue.push(i);
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    for (const j of cells.c[i]) if (land(j) && dist[j] < 0) (dist[j] = dist[i] + 1), queue.push(j);
  }
  const cap = (i: number) => (dist[i] < 0 ? 6 : Math.min(6, 1 + dist[i]));
  for (let i = 0; i < n; i++) {
    if (!land(i)) continue;
    L[i] = Math.min(Math.max(L[i], dist[i] === 1 ? 2 : 3), cap(i));
  }

  // high ground lifts its surroundings, a level less per ring, never past the cap
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (!land(i)) continue;
      let want = L[i];
      for (const j of cells.c[i]) if (land(j)) want = Math.max(want, L[j] - 1);
      want = Math.min(want, cap(i));
      if (want > L[i]) (L[i] = want), (changed = true);
    }
  }
  // where a cap held a slope back, the high side comes down to meet it
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (!land(i)) continue;
      let want = L[i];
      for (const j of cells.c[i]) if (land(j)) want = Math.min(want, L[j] + 1);
      if (want < L[i]) (L[i] = want), (changed = true);
    }
  }

  for (let i = 0; i < n; i++) {
    const [lo, hi] = LEVEL_BANDS[L[i]];
    cells.h[i] = Math.min(hi, Math.max(lo, cells.h[i]));
  }
}
