// a made-up region cut round one settlement, so any kind of place can be generated and tested

import type { P2, Region, Spec } from "./city-gen";

export interface Params extends Spec {
  name: string;
  roads: keyof typeof LAYOUTS;
  turn: number; // degrees, clockwise from north
  coast: number | null; // bearing of the sea, or none
  river: boolean;
  woods: boolean;
  seed: number;
}

export const LAYOUTS = {
  none: [],
  end: [0],
  through: [0, 180],
  bend: [0, 125],
  t: [0, 90, 180],
  y: [0, 120, 240],
  cross: [0, 90, 180, 270],
  star: [0, 72, 144, 216, 288]
} as const;

const ROAD_NAMES = ["King's Road", "Mill Road", "Market Road", "Ford Road", "Old Road"];
const O: P2 = [500, 500];
const R = 13; // a region cell's radius, as Goldbank's

const rng = (seed: number) => {
  let v = ((seed * 2654435761) >>> 0) % 2147483646 || 1;
  return () => {
    v = (v * 16807) % 2147483647;
    return v / 2147483647;
  };
};
// compass bearing to a unit step on screen
const step = (deg: number): P2 => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)];
const angOff = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

export function synthRegion(p: Params): Region {
  const rand = rng(p.seed);
  const jit = new Map<string, P2>();
  // shared corners move together, so neighbouring cells still meet
  const corner = (x: number, y: number): P2 => {
    const k = `${Math.round(x / (Math.sqrt(3) * R * 0.5))}|${Math.round(y / (R * 0.5))}`;
    if (!jit.has(k)) jit.set(k, [x + (rand() - 0.5) * 5, y + (rand() - 0.5) * 5]);
    return jit.get(k) as P2;
  };
  const cells: Region["cells"] = [];
  const w = Math.sqrt(3) * R;
  for (let q = -3; q <= 3; q++)
    for (let r = -3; r <= 3; r++) {
      if (Math.abs(q + r) > 3) continue;
      const c: P2 = [O[0] + w * (q + r / 2), O[1] + 1.5 * R * r];
      const poly: P2[] = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        poly.push(corner(c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R));
      }
      const bearing = (Math.atan2(c[0] - O[0], O[1] - c[1]) * 180) / Math.PI;
      const sea = p.coast !== null && (q || r) && angOff(bearing, p.coast) < 62;
      cells.push({ p: poly, c, h: sea ? 10 : 30, b: p.woods ? 6 : 1 });
    }
  const dry = (pt: P2) => {
    const c = cells.reduce((b, x) =>
      Math.hypot(x.c[0] - pt[0], x.c[1] - pt[1]) < Math.hypot(b.c[0] - pt[0], b.c[1] - pt[1]) ? x : b
    );
    return c.h >= 20;
  };
  const routes = LAYOUTS[p.roads]
    .map((a, k) => {
      const [dx, dy] = step(a + p.turn);
      return { g: ROAD_NAMES[k], pts: [O, [O[0] + dx * 40, O[1] + dy * 40]] as P2[] };
    })
    .filter(r => dry([O[0] + (r.pts[1][0] - O[0]) * 0.4, O[1] + (r.pts[1][1] - O[1]) * 0.4]));
  const rivers: Region["rivers"] = [];
  if (p.river) {
    // inland it crosses the cell; on a coast it runs down to the sea
    const dir = p.coast ?? p.turn + 45;
    const [ux, uy] = step(dir);
    const from = -45;
    const to = p.coast === null ? 45 : 30;
    const pts: P2[] = [];
    for (let t = from; t <= to; t += 3) {
      const s = Math.sin(t / 7 + p.seed) * 2.2;
      pts.push([O[0] + ux * t - uy * s, O[1] + uy * t + ux * s]);
    }
    rivers.push({ pts });
  }
  return { cells, routes, rivers, burgs: [{ n: p.name, x: O[0], y: O[1] }] };
}
