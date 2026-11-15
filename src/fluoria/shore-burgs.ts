// A settlement in a cell beside water stands on that cell's shore, at the middle of the wall it shares with the water
// (the longest such wall, open sea first); a road comes to the cell's centre on land and out to it
const IN = 0.97; // just inside the cell, so the point still finds its own cell

export function shoreBurgs(): number {
  const { cells, vertices, features } = pack;
  let moved = 0;
  for (const burg of pack.burgs) {
    if (!burg?.i || burg.removed || burg.lock) continue;
    const cell = burg.cell;
    let best: [number, number] | null = null;
    let bestScore = 0;
    for (const n of cells.c[cell]) {
      if (cells.h[n] >= 20) continue;
      const shared = cells.v[cell].filter(v => cells.v[n].includes(v));
      if (shared.length < 2) continue;
      const [a, b] = [vertices.p[shared[0]], vertices.p[shared[1]]];
      const score = Math.hypot(b[0] - a[0], b[1] - a[1]) * (features[cells.f[n]]?.type === "ocean" ? 2 : 1);
      if (score > bestScore) {
        bestScore = score;
        best = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      }
    }
    if (!best) continue;
    const [x0, y0] = cells.p[cell];
    burg.x = Math.round((x0 + (best[0] - x0) * IN) * 100) / 100;
    burg.y = Math.round((y0 + (best[1] - y0) * IN) * 100) / 100;
    moved++;
  }
  return moved;
}
