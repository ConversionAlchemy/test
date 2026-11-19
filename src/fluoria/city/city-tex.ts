// Pixel textures for the Terrain view, one texel per world pixel, in the region map's manner: grass in a few
// dithered tones with lit tufts; everything else a soft mottle of one colour, dots, and hatching in the hollows.
// Trees are single pixel crowns at their true size (a world pixel is about 1.2 m, a crown 4-9 px).

import type { City, P2 } from "./city-gen";

type C3 = [number, number, number];
const N = 128;
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const wr = (v: number, p: number) => ((v % p) + p) % p;
const th = (a: number, b: number, s: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7 + s * 17.3) * 43758.5453;
  return v - Math.floor(v);
};
const smt = (t: number) => t * t * (3 - 2 * t);
// value noise that repeats every px by py cells, so tiles join
function pv(x: number, y: number, s: number, px: number, py: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smt(x - xi);
  const fy = smt(y - yi);
  const a = th(wr(xi, px), wr(yi, py), s);
  const b = th(wr(xi + 1, px), wr(yi, py), s);
  const c = th(wr(xi, px), wr(yi + 1, py), s);
  const d = th(wr(xi + 1, px), wr(yi + 1, py), s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fb = (x: number, y: number, s: number, sc: number) =>
  pv(x / sc, y / sc, s, N / sc, N / sc) * 0.6 +
  pv((x * 2) / sc, (y * 2) / sc, s + 1, (N * 2) / sc, (N * 2) / sc) * 0.3 +
  pv(x / 2, y / 2, s + 2, N / 2, N / 2) * 0.1;
const hex = (h: string): C3 => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as C3;
const dq = (x: number, y: number, v: number, n: number) =>
  Math.max(0, Math.min(n - 1, Math.floor(v * n + (B4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9)));

interface Soft {
  amp?: number;
  dots?: number;
  hatch?: number;
  sc?: number;
  speck?: number;
  crack?: boolean;
  vein?: string;
  hatch2?: boolean; // cross-hatched all over, for walls
  grain?: number;
  stone?: boolean;
}
function soft(base: string, o: Soft, s: number) {
  const c0 = hex(base);
  const amp = o.amp ?? 0.1;
  const dots = o.dots ?? 0.03;
  const sc = o.sc ?? 16;
  const vein = o.vein ? hex(o.vein) : null;
  return (x: number, y: number): C3 => {
    const v = fb(x, y, s, sc);
    let c = c0.map(q => q * (1 + (v - 0.5) * amp * 2)) as C3;
    const mul = (f: number) => {
      c = c.map(q => q * f) as C3;
    };
    if (o.hatch && v < 0.44) {
      if (wr(x + y, 4) === 0) mul(1 - o.hatch);
      if (v < 0.36 && wr(x - y, 4) === 0) mul(1 - o.hatch);
    }
    if (o.hatch2) {
      if (wr(x + y, 3) === 0) mul(0.84);
      if (wr(x - y, 3) === 0) mul(0.9);
    }
    if (o.grain) mul(1 + (pv(x / 2, y / 16, s + 23, N / 2, N / 16) - 0.5) * o.grain);
    if (vein) {
      const d = Math.abs(pv(x / 16, y / 8, s + 21, N / 16, N / 8) - 0.5);
      const t = d < 0.008 ? 0.35 : d < 0.03 ? 0.1 : 0;
      if (t) c = c.map((q, i) => q + (vein[i] - q) * t) as C3;
    }
    if (
      o.crack &&
      pv(x / 8, y / 8, s + 19, N / 8, N / 8) > 0.62 &&
      Math.abs(pv(x / 16, y / 16, s + 17, N / 16, N / 16) - 0.5) < 0.011
    )
      mul(0.88);
    const t = th(wr(x, N), wr(y, N), s + 11);
    if (t < dots) mul(o.stone ? 0.93 : 0.87);
    else if (t > 1 - dots * 0.5) mul(o.stone ? 1.03 : 1.07);
    if (o.speck) {
      const u = th(wr(x, N), wr(y, N), s + 13);
      if (u < o.speck) mul(0.87);
      else if (u > 1 - o.speck * 0.6) mul(1.08);
    }
    return c.map(q => Math.max(0, Math.min(255, q))) as C3;
  };
}
// grass: the region's plains, a few tones dithered, with lit blades over their own shadow
function grass(pal: string[], s: number, den: number, flowers = 0) {
  const P = pal.map(hex);
  const n = P.length;
  return (x: number, y: number): C3 => {
    let k = dq(x, y, fb(x, y, s, 16) * 1.1 - 0.05, flowers ? n - 1 : n);
    for (const [dx, dy, d] of [
      [0, 0, 1],
      [0, 1, 1],
      [0, -1, -1]
    ]) {
      const X = x - dx;
      const Y = y - dy;
      if (th(wr(X, N), wr(Y, N), s + 50) < den * pv(X / 8, Y / 8, s + 51, N / 8, N / 8) * 2) {
        k = Math.max(0, Math.min(n - 1, k + (d > 0 ? 2 : -2)));
        break;
      }
    }
    if (flowers && th(wr(x, N), wr(y, N), s + 52) > 1 - flowers) k = n - 1;
    return P[k];
  };
}
// sea: the region's blues and short pale ripples
function sea(s: number) {
  const P = ["#7f9ea8", "#86a5ae", "#8eacb4", "#b6ccd0"].map(hex);
  return (x: number, y: number): C3 => {
    let k = dq(x, y, fb(x, y, s, 16) * 0.9 + 0.05, 3);
    const row = Math.floor(y / 6);
    if (wr(y, 6) === (row & 1) * 3) {
      const x0 = Math.floor(th(wr(row, N / 6 + 1), Math.floor(wr(x, N) / 16), s + 3) * 12);
      const d = wr(x, 16) - x0;
      if (d >= 0 && d < 4) k = 3;
    }
    return P[k];
  };
}

export type Tex =
  | "meadow"
  | "pasture"
  | "garden"
  | "wheat"
  | "tilled"
  | "yard"
  | "under"
  | "main"
  | "street"
  | "lane"
  | "track"
  | "stone"
  | "quay"
  | "wood"
  | "sea";
const MAKERS: Record<Tex, () => (x: number, y: number) => C3> = {
  meadow: () => grass(["#98a466", "#9ea96b", "#a4ae70", "#aab375", "#b0b87b"], 61, 0.035),
  pasture: () => grass(["#a8b47a", "#adb87e", "#b2bc83", "#b7c088", "#cdd0a2"], 62, 0.015, 0.005),
  garden: () => grass(["#9aa968", "#a0ae6d", "#a6b372", "#acb877", "#b2bd7c"], 66, 0.035),
  wheat: () => soft("#c4a95e", { amp: 0.09, dots: 0.04, hatch: 0.05 }, 3),
  tilled: () => soft("#866e4b", { amp: 0.11, dots: 0.05, hatch: 0.07, speck: 0.008 }, 5),
  yard: () => soft("#b4a789", { amp: 0.06, dots: 0.03 }, 7),
  under: () => soft("#6f7c3f", { amp: 0.12, dots: 0.04 }, 12),
  main: () => soft("#ddd4c1", { amp: 0.03, dots: 0.004, stone: true }, 41),
  street: () => soft("#d6ccb6", { amp: 0.03, dots: 0.004, stone: true }, 43),
  lane: () => soft("#ccbe9e", { amp: 0.04, dots: 0.008, stone: true }, 45),
  track: () => soft("#b5a27e", { amp: 0.05, dots: 0.01, stone: true }, 47),
  stone: () => soft("#948d82", { amp: 0.05, dots: 0.004, hatch2: true, stone: true }, 51),
  quay: () => soft("#857e73", { speck: 0.015, crack: true, amp: 0.1, stone: true }, 53),
  wood: () => soft("#8a623e", { grain: 0.1, amp: 0.08, dots: 0.025, sc: 8 }, 55),
  sea: () => sea(11)
};
const tiles = new Map<Tex, HTMLCanvasElement>();
/** A repeating 128 px tile of one texture, at one texel per world pixel */
export function tile(t: Tex): HTMLCanvasElement {
  let c = tiles.get(t);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const im = g.createImageData(N, N);
  const f = MAKERS[t]();
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const k = f(x, y);
      const j = (y * N + x) * 4;
      im.data[j] = k[0];
      im.data[j + 1] = k[1];
      im.data[j + 2] = k[2];
      im.data[j + 3] = 255;
    }
  g.putImageData(im, 0, 0);
  tiles.set(t, c);
  return c;
}
/** A fill or stroke style of the texture, laid in world pixels on a context already scaled to world units */
export const pattern = (g: CanvasRenderingContext2D, t: Tex) => g.createPattern(tile(t), "repeat") as CanvasPattern;

// ---- trees, in pixels
const TG = ["#2e3a1c", "#3f4d24", "#55632f", "#6a7a3a", "#82924a", "#9aa95c"].map(hex);
type Tree = [number, number, number, number]; // x, y, radius, seed
const inPoly = (P: P2[], x: number, y: number) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ax, ay] = P[i];
    const [bx, by] = P[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c;
  }
  return c;
};
const treeLayers = new WeakMap<City, HTMLCanvasElement>();
/** Every tree of the town as one world-sized pixel layer: woods packed crown to crown, garden and park trees alone */
export function treeLayer(city: City): HTMLCanvasElement {
  const done = treeLayers.get(city);
  if (done) return done;
  const { cells, vertices } = city.pack;
  const W = Math.ceil(city.W);
  const H = Math.ceil(city.H);
  const T: Tree[] = [];
  const sp = 5.2;
  for (let i = 0; i < cells.p.length; i++) {
    if (city.use[i] !== "woods" || city.home[i] !== 1) continue;
    const P = (cells.v[i] as number[]).map(v => vertices.p[v] as P2);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of P) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    for (let gy = Math.floor(y0 / sp); gy <= y1 / sp; gy++)
      for (let gx = Math.floor(x0 / sp); gx <= x1 / sp; gx++) {
        const x = gx * sp + (gy & 1) * (sp / 2) + (th(gx, gy, 1) - 0.5) * sp * 0.7;
        const y = gy * sp + (th(gx, gy, 2) - 0.5) * sp * 0.7;
        if (inPoly(P, x, y)) T.push([x, y, 3.1 + th(gx, gy, 3) * 1.5, gx * 131 + gy * 7]);
      }
  }
  // a lone tree only where its crown and shadow clear every building
  const near = (x: number, y: number, r: number) =>
    city.buildings.some(b => b.poly.some(p => Math.hypot(p[0] - x, p[1] - y) < r) || inPoly(b.poly, x, y));
  for (const [k, [x, y]] of city.trees.entries()) {
    const r = 2.4 + th(k, 0, 4) * 1;
    const cx = x + 1;
    const cy = y + 1;
    if (near(cx, cy, r * 1.4) || near(cx + r * 0.5, cy + r * 0.6, r * 1.2)) continue;
    let hit = false;
    for (const b of city.buildings)
      for (let a = 0; a < 6.283 && !hit; a += 0.8)
        if (inPoly(b.poly, cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3)) hit = true;
    if (!hit) T.push([cx, cy, r, 9000 + k]);
  }
  T.sort((a, b) => a[1] - b[1]);
  const im = new ImageData(W, H);
  const D = im.data;
  const lobes = ([x, y, r, sd]: Tree) => {
    const L: [number, number, number][] = [];
    const n = 5 + Math.floor(th(sd, 1, 3) * 3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 6.283 + th(sd, k, 4) * 0.8;
      L.push([x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * (0.48 + th(sd, k, 5) * 0.14)]);
    }
    L.push([x, y, r * 0.6]);
    return L;
  };
  const inside = (L: [number, number, number][], px: number, py: number) => {
    let m = -1e9;
    for (const [lx, ly, lr] of L) m = Math.max(m, lr - Math.hypot(px - lx, py - ly));
    return m;
  };
  const Ls = T.map(lobes);
  // shadows first, down and right; then the crowns, nearest last
  for (const [k, [x, y, r]] of T.entries())
    for (let py = Math.floor(y - r); py < y + r * 2.2; py++)
      for (let px = Math.floor(x - r); px < x + r * 2.2; px++) {
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        if (inside(Ls[k], px + 0.5 - r * 0.45, py + 0.5 - r * 0.55) <= 0) continue;
        const j = (py * W + px) * 4;
        if (D[j + 3]) continue;
        D[j + 3] = 82;
      }
  for (const [k, [x, y, r, sd]] of T.entries())
    for (let py = Math.floor(y - r * 1.3); py < y + r * 1.3; py++)
      for (let px = Math.floor(x - r * 1.3); px < x + r * 1.3; px++) {
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const d = inside(Ls[k], px + 0.5, py + 0.5);
        if (d <= 0) continue;
        const lit = -((px + 0.5 - x) / r + (py + 0.5 - y) / r) * 0.7 + 0.1;
        let ti = d < 0.8 ? 0 : lit > 0.45 ? 4 : lit > 0.1 ? 3 : lit > -0.3 ? 2 : 1;
        const h = th(px, py, sd);
        if (d >= 0.8) {
          if (h < 0.12 && ti > 1) ti--;
          else if (h > 0.9 && ti < 4) ti++;
        }
        const j = (py * W + px) * 4;
        D[j] = TG[ti][0];
        D[j + 1] = TG[ti][1];
        D[j + 2] = TG[ti][2];
        D[j + 3] = 255;
      }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  (c.getContext("2d") as CanvasRenderingContext2D).putImageData(im, 0, 0);
  treeLayers.set(city, c);
  return c;
}
