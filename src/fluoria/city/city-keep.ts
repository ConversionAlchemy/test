// A citadel's keep: the largest near-square rectangle that stands inside its cells, clear of the streets round them
import { connectVertices } from "@/utils/pathUtils";
import type { City, P2 } from "./city-gen";

/** The outline of a group of cells, as one ring */
export function outlineOf(city: City, cs: number[]): P2[] {
  const { cells, vertices } = city.pack;
  const set = new Set(cs);
  const i = cs.find(c => cells.c[c].some((j: number) => !set.has(j)));
  if (i === undefined) return [];
  const start = cells.v[i].find((v: number) => vertices.c[v].some((c: number) => !set.has(c)));
  if (start === undefined) return [];
  return connectVertices({ vertices, startingVertex: start, ofSameType: c => set.has(c), closeRing: false }).map(
    v => vertices.p[v] as P2
  );
}

const inside = (P: P2[], x: number, y: number) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [a, b] = P[i];
    const [d, e] = P[j];
    if (b > y !== e > y && x < ((d - a) * (y - b)) / (e - b) + a) c = !c;
  }
  return c;
};
const edgeDist = (P: P2[], x: number, y: number) => {
  let m = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [a, b] = P[i];
    const ex = P[j][0] - a;
    const ey = P[j][1] - b;
    const t = Math.max(0, Math.min(1, ((x - a) * ex + (y - b) * ey) / (ex * ex + ey * ey || 1)));
    m = Math.min(m, Math.hypot(x - a - t * ex, y - b - t * ey));
  }
  return m;
};

/** Margin: how far the keep stands in from the cells' edge, where the street's middle runs */
export function keepOf(city: City, cs: number[], margin = 4.2): P2[] | undefined {
  const P = outlineOf(city, cs);
  if (P.length < 3) return undefined;
  const ok = (x: number, y: number) => inside(P, x, y) && edgeDist(P, x, y) >= margin;
  const rect = (cx: number, cy: number, ux: number, uy: number, a: number, b: number): P2[] => [
    [cx - ux * a + uy * b, cy - uy * a - ux * b],
    [cx + ux * a + uy * b, cy + uy * a - ux * b],
    [cx + ux * a - uy * b, cy + uy * a + ux * b],
    [cx - ux * a - uy * b, cy - uy * a + ux * b]
  ];
  const fits = (Q: P2[]) => {
    for (let k = 0; k < 4; k++) {
      const p = Q[k];
      const q = Q[(k + 1) % 4];
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const st = Math.max(1, Math.ceil(L / 0.8));
      for (let t = 0; t <= st; t++) if (!ok(p[0] + ((q[0] - p[0]) * t) / st, p[1] + ((q[1] - p[1]) * t) / st)) return false;
    }
    // no corner of the outline pokes in
    return !P.some(v => inside(Q, v[0], v[1]));
  };
  // turn to the outline's long sides, and try round its middle
  const angs = new Set<number>();
  for (let k = 0; k < P.length; k++) {
    const q = P[(k + 1) % P.length];
    if (Math.hypot(q[0] - P[k][0], q[1] - P[k][1]) < 4) continue;
    const a = Math.atan2(q[1] - P[k][1], q[0] - P[k][0]);
    angs.add(Math.round((((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)) * 40) / 40);
  }
  for (let k = 0; k < 6; k++) angs.add((k * Math.PI) / 12);
  const mx = cs.reduce((q, c) => q + city.pack.cells.p[c][0], 0) / cs.length;
  const my = cs.reduce((q, c) => q + city.pack.cells.p[c][1], 0) / cs.length;
  let best: P2[] | undefined;
  let score = 0;
  for (const a of angs) {
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const cx = mx + dx * 2;
        const cy = my + dy * 2;
        if (!ok(cx, cy)) continue;
        // the biggest square first, then let it run longer one way, to half again its width at most
        let lo = 0;
        let hi = 60;
        for (let it = 0; it < 12; it++) {
          const h = (lo + hi) / 2;
          if (fits(rect(cx, cy, ux, uy, h, h))) lo = h;
          else hi = h;
        }
        if (lo < 4) continue;
        let la = lo;
        let lb = lo;
        for (const ax of [0, 1]) {
          let l2 = lo;
          let h2 = lo * 1.5;
          for (let it = 0; it < 8; it++) {
            const h = (l2 + h2) / 2;
            if (fits(ax ? rect(cx, cy, ux, uy, lo, h) : rect(cx, cy, ux, uy, h, lo))) l2 = h;
            else h2 = h;
          }
          if (l2 * lo > la * lb) [la, lb] = ax ? [lo, l2] : [l2, lo];
        }
        // squarer is better, as is nearer the middle
        const sc = la * lb * (0.85 + 0.15 * (Math.min(la, lb) / Math.max(la, lb))) - (dx * dx + dy * dy) * 0.3;
        if (sc > score) {
          score = sc;
          best = rect(cx, cy, ux, uy, la, lb);
        }
      }
  }
  return best;
}
