// The region map's ground, as the battle sandbox painted it: each ground a 64-pixel tile that repeats without a seam,
// a few flat tones laid with an ordered dither, so it reads as pixel art with no extra noise on top
import { Terrain } from "./terrain";

type Key = "ice" | "deep" | "sea" | "shallow" | "plains" | "dry" | "marsh" | "woods" | "hills" | "mountains";

const TT: Record<Key, { w?: boolean; p: string[] }> = {
  ice: { w: true, p: ["#c9d6d8", "#d6e1e2", "#e2eaea", "#edf2f1"] },
  deep: { w: true, p: ["#7898a2", "#7e9ea8", "#85a4ad", "#9db8be"] },
  sea: { w: true, p: ["#88a8b0", "#8eaeb5", "#95b3ba", "#abc4c8"] },
  shallow: { w: true, p: ["#9ebcbd", "#a5c2c2", "#adc8c7"] },
  plains: { p: ["#7b7f47", "#83874d", "#8b8e53", "#93955a", "#9d9d61"] },
  dry: { p: ["#8b8350", "#958c57", "#9e955e", "#a89d65", "#b2a56d"] },
  marsh: { p: ["#6a7450", "#717b55", "#78825b", "#5f7672", "#6a817b", "#555e3c"] },
  woods: { p: ["#3c4524", "#566131", "#68733a", "#7a8644", "#8d984f"] },
  hills: { p: ["#6f7042", "#7a7a48", "#85844f", "#908d56", "#9b975e"] },
  mountains: { p: ["#4e4a42", "#6c675d", "#787267", "#837d71", "#8f897c", "#a8a295"] }
};

/** How high each ground stands, for the shadows it casts on lower ground */
export const RAISE: Partial<Record<Key, number>> = { woods: 2, mountains: 5, hills: 1, ice: 3 };

export const COAST = {
  foam: [223, 233, 229] as const,
  band: [188, 211, 209] as const,
  rip: [204, 223, 220] as const,
  shore: 0.82
};

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TP = 64;
const smt = (t: number) => t * t * (3 - 2 * t);
const th = (a: number, b: number, s: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7 + s * 17.3) * 43758.5453;
  return v - Math.floor(v);
};
const wr = (v: number, P: number) => ((v % P) + P) % P;
function pv(x: number, y: number, s: number, Px: number, Py = Px): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smt(x - xi);
  const fy = smt(y - yi);
  const a = th(wr(xi, Px), wr(yi, Py), s);
  const b = th(wr(xi + 1, Px), wr(yi, Py), s);
  const c = th(wr(xi, Px), wr(yi + 1, Py), s);
  const d = th(wr(xi + 1, Px), wr(yi + 1, Py), s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const mot = (X: number, Y: number, s: number) =>
  pv(X / 16, Y / 16, s, TP / 16) * 0.55 +
  pv(X / 6, Y / 6, s + 1, (TP / 6) | 0 || 1) * 0.25 +
  pv(X / 2, Y / 2, s + 2, TP / 2) * 0.1 +
  th(X, Y, s + 3) * 0.1;
const hex = (h: string): [number, number, number] => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16)
];

interface Tile {
  A: Uint8Array;
  P: [number, number, number][];
  s: number;
}
const TILE: Partial<Record<Key, Tile>> = {};

function tile(t: Key): Tile {
  const done = TILE[t];
  if (done) return done;
  const S = t === "woods" ? 63 : TP;
  const P = TT[t].p.map(hex);
  const n = P.length;
  const A = new Uint8Array(S * S);
  const at = (x: number, y: number) => A[wr(y, S) * S + wr(x, S)];
  const put = (x: number, y: number, v: number) => {
    A[wr(y, S) * S + wr(x, S)] = v;
  };
  const dq = (x: number, y: number, v: number, m = n) =>
    Math.max(0, Math.min(m - 1, Math.floor(v * m + (B4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9)));
  const lay = (f: (x: number, y: number) => number, m?: number) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) put(x, y, dq(x, y, f(x, y), m));
  };
  const grass = (den: number) => {
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        if (th(x, y, 77) > den * (pv(x / 9, y / 9, 78, (S / 9) | 0 || 1) * 2)) continue;
        const b = at(x, y);
        const hi = Math.min(n - 1, b + 2);
        const lo = Math.max(0, b - 2);
        put(x, y + 1, lo);
        put(x, y, hi);
        put(x, y - 1, hi);
        if (th(x, y, 79) > 0.4) {
          const sd = th(x, y, 80) > 0.5 ? 1 : -1;
          put(x + sd, y, hi);
          put(x + sd, y + 1, lo);
        }
      }
  };
  if (TT[t].w) {
    lay((x, y) => mot(x, y, 11) * 0.9 + 0.05, 3);
    if (t !== "shallow")
      for (let r = 0; r < S / 6; r++) {
        const y = r * 6 + (r & 1) * 3;
        for (let k = 0; k < 2; k++) {
          const x0 = (th(r, k, 14) * S) | 0;
          const L = 4 + ((th(r, k, 15) * 5) | 0);
          for (let d = 0; d < L; d++) put(x0 + d, y + (d === 0 || d === L - 1 ? 1 : 0), 3);
        }
      }
  } else if (t === "woods") {
    // small crowns in offset rows, lit upper left, dark gaps between
    A.fill(0);
    const shape = [".43.", "4321", "3211", ".10."];
    const trees: [number, number, number][] = [];
    for (let gy = 0; gy < 21; gy++)
      for (let gx = 0; gx < 21; gx++)
        trees.push([gx * 3 + (gy % 3), gy * 3 + (th(gx, gy, 22) > 0.7 ? 1 : 0), th(gx, gy, 23)]);
    trees.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const O = new Int16Array(S * S).fill(-1);
    const own = (x: number, y: number, v: number, cy: number) => {
      const j = wr(y, S) * S + wr(x, S);
      const o = O[j];
      if (o < 0 || wr(cy - o, S) < S / 2) {
        A[j] = v;
        O[j] = wr(cy, S);
      }
    };
    for (const [cx, cy, v] of trees) {
      const d = v < 0.25 ? 1 : v > 0.85 ? -1 : 0;
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          const ch = shape[r][c];
          if (ch === ".") continue;
          own(cx + c, cy + r, Math.max(1, Math.min(4, +ch - d)), cy);
        }
      own(cx + 2, cy + 4, 0, cy);
      own(cx + 3, cy + 3, 0, cy);
      own(cx + 3, cy + 4, 0, cy);
    }
  } else if (t === "mountains") {
    // stepped ledges seen from above: the lower right edge of each drops in shadow, the upper left catches the light
    const h = (x: number, y: number) => {
      let v = 0;
      let a = 1;
      let f = 1 / 32;
      for (let o = 0; o < 3; o++) {
        v += a * pv(x * f, y * f, 140 + o, S * f);
        a *= 0.4;
        f *= 2;
      }
      return v / 1.56;
    };
    const L = new Uint8Array(S * S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) L[y * S + x] = Math.max(0, Math.min(11, Math.floor(h(x, y) * 16 - 3)));
    const lv = (x: number, y: number) => L[wr(y, S) * S + wr(x, S)];
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const l = lv(x, y);
        const g2 = mot(x, y, 49);
        let o: number;
        if (lv(x - 1, y - 1) > l || lv(x - 2, y - 2) > l) o = lv(x - 1, y - 1) > l ? 0 : 1;
        else if (lv(x + 1, y + 1) < l || lv(x + 1, y) < l) o = n - 1;
        else o = dq(x, y, 0.2 + (l % 4) * 0.12 + (g2 - 0.5) * 0.45, n - 2) + 1;
        if (o > 1 && th(x, y, 50) > 0.93) o--;
        else if (o < n - 2 && th(x, y, 51) > 0.95) o++;
        put(x, y, o);
      }
  } else if (t === "hills") {
    const h = (x: number, y: number) => pv(x / 16, y / 16, 31, S / 16) + 0.35 * pv(x / 8, y / 8, 32, S / 8);
    lay((x, y) => 0.5 + (h(x - 1, y - 1) - h(x + 1, y + 1)) * 3 + (mot(x, y, 33) - 0.5) * 0.2);
    grass(0.03);
  } else {
    lay((x, y) => mot(x, y, t === "dry" ? 51 : 61) * 1.1 - 0.05, t === "marsh" ? 3 : n);
    if (t === "marsh") {
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const w = pv(x / 7, y / 5, 71, (S / 7) | 0, (S / 5) | 0);
          if (w > 0.64) put(x, y, w > 0.72 ? 4 : 3);
        }
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++)
          if (th(x, y, 73) > 0.93 && at(x, y) < 3) {
            put(x, y, 5);
            put(x, y - 1, 5);
            if (th(x, y, 74) > 0.5) put(x + 1, y - 1, 5);
          }
    } else grass(t === "dry" ? 0.035 : 0.06);
  }
  const made = { A, P, s: S };
  TILE[t] = made;
  return made;
}

/** Which sandbox ground stands for a Fluoria terrain */
export function groundOf(t: number): Key {
  switch (t) {
    case Terrain.DeepWater:
      return "sea";
    case Terrain.Water:
      return "shallow";
    case Terrain.River:
      return "sea";
    case Terrain.Forest:
    case Terrain.Taiga:
    case Terrain.Jungle:
      return "woods";
    case Terrain.Hills:
      return "hills";
    case Terrain.Mountains:
      return "mountains";
    case Terrain.Snow:
      return "ice";
    case Terrain.Marsh:
      return "marsh";
    case Terrain.DryGrass:
    case Terrain.Desert:
    case Terrain.Sand:
    case Terrain.Tundra:
      return "dry";
    default:
      return "plains";
  }
}

/** One pixel of a ground at a world position */
export function groundPixel(key: Key, X: number, Y: number): readonly [number, number, number] {
  const T = tile(key);
  const k = T.A[wr(Y, T.s) * T.s + wr(X, T.s)];
  return T.P[Math.min(k, T.P.length - 1)];
}

export const shallowPixel = (X: number, Y: number) => groundPixel("shallow", X, Y);
export const ditherAt = (x: number, y: number) => B4[(y & 3) * 4 + (x & 3)] / 16;
