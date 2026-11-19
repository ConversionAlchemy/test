// a made-up region cut round one settlement, so any kind of place can be generated and tested

import type { P2, Region, Spec } from "./city-gen";
import type { Lore, NameBase } from "./city-names";

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

// ---- real maps: one Azgaar map exported whole (region-from-pack.ts), any settlement on it cut out as a region

export interface World {
  seed: string;
  cells: { p: P2[]; c: P2; h: number; b: number; s: number; r: number; n: number[] }[];
  routes: { g: string; n?: string; pts: P2[]; cells: number[] }[];
  burgs: WorldBurg[];
  states: { n: string; full?: string; form?: string; rival?: string }[];
  cultures: { n: string; base: number }[];
  religions: { n: string; deity?: string }[];
  bases: NameBase[];
}
export interface WorldBurg {
  i: number;
  n: string;
  x: number;
  y: number;
  cell: number;
  pop: number; // thousands, as Azgaar counts
  cap: number;
  port: number;
  walls: number;
  citadel: number;
  plaza: number;
  temple: number;
  shanty: number;
  rank: string; // village, town, city or citadel
  state: number;
  culture: number;
}

/** A settlement's size from its people (Azgaar counts thousands); a capital is at least a town */
export const sizeOf = (b: WorldBurg): Spec["size"] => {
  const size = b.pop < 0.3 ? "hamlet" : b.pop < 2 ? "village" : b.pop < 6 ? "town" : "city";
  return b.cap && (size === "hamlet" || size === "village") ? "town" : size;
};

export function regionOf(world: World, b: WorldBurg): { region: Region; spec: Spec } {
  const B: P2 = [b.x, b.y];
  const near = (p: P2, d: number) => Math.hypot(p[0] - B[0], p[1] - B[1]) < d;
  const byCell = new Map(world.burgs.map(o => [o.cell, o]));
  // every road through the settlement leaves it two ways (or one, where it ends here), each named for where it goes
  const routes: Region["routes"] = [];
  const dirs: number[] = [];
  for (const r of world.routes) {
    let at = r.cells.indexOf(b.cell);
    if (at < 0) at = r.pts.findIndex(p => near(p, 3));
    if (at < 0) continue;
    for (const step of [1, -1]) {
      const half: P2[] = [B];
      let to: string | undefined;
      for (let k = at + step; k >= 0 && k < r.pts.length; k += step) {
        if (near(r.pts[k], 90)) half.push(r.pts[k]);
        const o = byCell.get(r.cells[k]);
        if (o && o.i !== b.i) {
          to = o.n;
          break;
        }
      }
      if (half.length < 2) continue;
      const far = half[half.length - 1];
      const dir = Math.atan2(far[1] - B[1], far[0] - B[0]);
      if (dirs.some(d => Math.abs(Math.atan2(Math.sin(d - dir), Math.cos(d - dir))) < 0.5)) continue;
      dirs.push(dir);
      routes.push({ g: r.g, n: to ? `${to} Road` : (r.n ?? "Old Road"), pts: half });
    }
  }
  const cell = world.cells[b.cell];
  const st = world.states[b.state];
  // a rival: the nearest land held by another state
  let rival: string | undefined;
  let rd = Infinity;
  for (const c of world.cells)
    if (c.s && c.s !== b.state && c.h >= 20) {
      const d = Math.hypot(c.c[0] - B[0], c.c[1] - B[1]);
      if (d < rd) {
        rd = d;
        rival = world.states[c.s]?.n;
      }
    }
  const lore: Lore = {
    base: world.bases[world.cultures[b.culture]?.base ?? 0],
    state: st ? { n: st.n, full: st.full, form: st.form } : undefined,
    religion: cell?.r ? world.religions[cell.r] : undefined,
    rival,
    capital: !!b.cap,
    port: !!b.port
  };
  const size = sizeOf(b);
  return {
    region: {
      cells: world.cells,
      routes,
      burgs: [{ n: b.n, x: b.x, y: b.y, port: b.port, walls: b.walls }],
      lore
    },
    spec: {
      size,
      walled: !!b.walls,
      fort: !!b.citadel,
      hill: !!b.cap || size === "city",
      shanty: !!b.shanty,
      plaza: !!b.plaza,
      temple: !!b.temple
    }
  };
}
