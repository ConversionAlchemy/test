// Unit cards: a 21×13 box in the nation's colour with a black symbol; the frame tells the domain (land plain, air with
// its top corners clipped, sea with its bottom ones) and the symbol tells the type and tier. A stack shows the units
// under the top card as 1 px strips, one health line under all of them and cargo pips on top
import { MAX_PIPS, PIP } from "../constants";
import type { KitUnit } from "./kit";

export const CARD_W = 21;
export const CARD_H = 13;
const CX = 10;
const CY = 6;
const STRIP = 2; // art px each card under the top one adds

/** 0 empty, 1 black, 2 nation colour */
export type Grid = number[][];

const blank = (): Grid => Array.from({ length: CARD_H }, () => Array(CARD_W).fill(0));

const clipped = (domain: KitUnit["domain"], x: number, y: number) => {
  const edge = (row: number, inner: number) =>
    (y === row && (x < 2 || x > CARD_W - 3)) || (y === inner && (x === 0 || x === CARD_W - 1));
  if (domain === "air") return edge(0, 1);
  if (domain === "naval") return edge(CARD_H - 1, CARD_H - 2);
  return false;
};

/** The card's shape: its outline black, the inside the nation's colour */
export function frame(domain: KitUnit["domain"]): Grid {
  const g = blank();
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < CARD_W && y < CARD_H && !clipped(domain, x, y);
  for (let y = 0; y < CARD_H; y++)
    for (let x = 0; x < CARD_W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      g[y][x] = edge ? 1 : 2;
    }
  return g;
}

type Ink = (x: number, y: number, v?: number) => void;

const line = (dot: Ink, x0: number, y0: number, x1: number, y1: number) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let t = 0; t <= n; t++) dot(Math.round(x0 + ((x1 - x0) * t) / n), Math.round(y0 + ((y1 - y0) * t) / n));
};
const box = (dot: Ink, x: number, y: number, w: number, h: number, v = 1) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) dot(x + i, y + j, v);
};
const ring = (dot: Ink, x: number, y: number, w: number, h: number) => {
  box(dot, x, y, w, h);
  box(dot, x + 1, y + 1, w - 2, h - 2, 2);
};
/** The tier mark of the plainer symbols: nothing, a 3×3 square, a 5×5 square */
const tierSquare = (dot: Ink, tier: number) => {
  if (tier === 2) box(dot, CX - 1, CY - 1, 3, 3);
  if (tier === 3) box(dot, CX - 2, CY - 2, 5, 5);
};
const cross = (dot: Ink) => {
  line(dot, 1, 1, CARD_W - 2, CARD_H - 2);
  line(dot, 1, CARD_H - 2, CARD_W - 2, 1);
};
/** A low or tall arc from left to right, its peak in the middle */
const arc = (dot: Ink, base: number, height: number, from = 2) => {
  const span = CARD_W - 1 - 2 * from;
  for (let x = from; x <= CX; x++) {
    const y = Math.round(base - height * Math.sin((Math.PI * (x - from)) / span));
    dot(x, y);
    dot(CARD_W - 1 - x, y);
  }
};
const hold = (dot: Ink, tier: number) => {
  const walls = (x: number) => line(dot, x, 3, x, 8);
  walls(CX - 5);
  walls(CX + 5);
  line(dot, CX - 5, 8, CX + 5, 8);
  if (tier === 2) {
    walls(CX - 7);
    walls(CX + 7);
  }
  if (tier === 3) {
    walls(CX - 4);
    walls(CX + 4);
    line(dot, CX - 5, 9, CX + 5, 9);
  }
};

const SYMBOLS: Record<string, (dot: Ink, tier: number) => void> = {
  land_infantry: (dot, tier) => {
    cross(dot);
    if (tier === 2) ring(dot, CX - 2, CY - 2, 5, 5);
    if (tier === 3) {
      line(dot, CX, 1, CX, CARD_H - 2);
      box(dot, CX - 1, CY - 1, 3, 3);
    }
  },
  land_assault: (dot, tier) => {
    cross(dot);
    if (tier === 2) {
      line(dot, 1, CY, CARD_W - 2, CY);
      box(dot, CX - 2, CY - 2, 2, 5);
      box(dot, CX + 1, CY - 2, 2, 5);
    }
    if (tier === 3)
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4.5) dot(CX + x, CY + y);
  },
  land_cavalry: (dot, tier) => {
    line(dot, 1, CARD_H - 2, CARD_W - 2, 1);
    tierSquare(dot, tier);
  },
  land_armour: (dot, tier) => {
    for (let a = 0; a < 96; a++) {
      const t = (a / 96) * Math.PI * 2;
      dot(Math.round(CX + 7 * Math.cos(t)), Math.round(CY + 3.5 * Math.sin(t)));
    }
    tierSquare(dot, tier);
  },
  air_scout: (dot, tier) => {
    line(dot, CX - 6, CY, CX + 6, CY);
    line(dot, CX, CY - 3, CX, CY + 3);
    tierSquare(dot, tier);
  },
  air_combat: (dot, tier) => {
    line(dot, CX - 6, CY, CX + 6, CY);
    for (const s of [-1, 1]) {
      dot(CX + s * 6, CY - 1);
      dot(CX + s * 6, CY + 1);
      dot(CX + s * 7, CY - 2);
      dot(CX + s * 7, CY + 2);
    }
    tierSquare(dot, tier);
  },
  air_bomber: (dot, tier) => {
    line(dot, CX - 6, 3, CX + 6, 3);
    const at = tier === 1 ? [CX] : tier === 2 ? [CX - 3, CX + 3] : [CX - 5, CX, CX + 5];
    for (const x of at) {
      dot(x, 4);
      box(dot, x - 1, 5, 3, 3);
    }
  },
  air_transport: (dot, tier) => hold(dot, tier),
  naval_transport: (dot, tier) => hold(dot, tier),
  naval_scout: (dot, tier) => {
    const bases = tier === 1 ? [7] : tier === 2 ? [5, 9] : [4, 7, 10];
    for (const base of bases) arc(dot, base, 2, 3);
  },
  naval_combat: (dot, tier) => {
    arc(dot, 10, 6);
    if (tier === 2) line(dot, CX, 6, CX, 10);
    if (tier === 3) {
      box(dot, CX - 1, 7, 3, 3);
      line(dot, CX, 1, CX, 4);
    }
  }
};

/** A unit's card: its frame and its symbol */
export function cardGrid(unit: Pick<KitUnit, "domain" | "role" | "tier">): Grid {
  const g = frame(unit.domain);
  const dot: Ink = (x, y, v = 1) => {
    if (x > 0 && y > 0 && x < CARD_W - 1 && y < CARD_H - 1) g[y][x] = v;
  };
  SYMBOLS[`${unit.domain}_${unit.role}`]?.(dot, unit.tier);
  return g;
}

export const HEALTH = { good: "#6fd36a", hurt: "#e0b74a", bad: "#d9533f", lost: "#3a3a3a" } as const;
export const healthColour = (health: number) => (health > 0.6 ? HEALTH.good : health > 0.3 ? HEALTH.hurt : HEALTH.bad);

export interface Pile {
  unit: Pick<KitUnit, "id" | "domain" | "role" | "tier">;
  colour: string;
  count: number; // cards in the pile, the top one included
  health: number; // 0–1, the pile's average
  pips: number; // units aboard the top card, 0–4
}

/** A pile's size in art px, and where its top card's middle is */
export function pileSize(pile: Pick<Pile, "count" | "pips">): { w: number; h: number; mid: number } {
  const top = pile.pips ? PIP : 0;
  const strips = Math.max(0, Math.min(pile.count, MAX_STRIPS + 1) - 1) * STRIP;
  return { w: CARD_W, h: top + CARD_H + strips + 1, mid: top + CARD_H / 2 };
}

/** Strips shown under a pile at most: past this a pile looks the same however big */
export const MAX_STRIPS = 8;

const rgb = (hex: string) => [1, 3, 5].map(k => Number.parseInt(hex.slice(k, k + 2), 16));
const shade = (hex: string, f: number) =>
  `#${rgb(hex)
    .map(v =>
      Math.round(v * f)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;

/** Every art pixel of a pile, as colours by row (null is empty) */
export function pilePixels(pile: Pile): (string | null)[][] {
  const { w, h } = pileSize(pile);
  const out: (string | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));
  const top = pile.pips ? PIP : 0;
  const under = Math.min(pile.count, MAX_STRIPS + 1) - 1;
  const put = (grid: Grid, y0: number, fill: string) => {
    for (let y = 0; y < CARD_H; y++)
      for (let x = 0; x < CARD_W; x++) {
        const v = grid[y][x];
        if (v) out[y0 + y][x] = v === 1 ? "#111111" : fill;
      }
  };
  const back = frame(pile.unit.domain);
  for (let k = under; k > 0; k--) put(back, top + k * STRIP, shade(pile.colour, Math.max(0.42, 0.8 - k * 0.05)));
  put(cardGrid(pile.unit), top, pile.colour);
  const bar = h - 1;
  const kept = Math.round(CARD_W * Math.max(0, Math.min(1, pile.health)));
  for (let x = 0; x < CARD_W; x++) out[bar][x] = x < kept ? healthColour(pile.health) : HEALTH.lost;
  const pips = Math.min(MAX_PIPS, pile.pips);
  if (pips) {
    const width = pips * 2 + 1;
    const x0 = Math.floor((CARD_W - width) / 2);
    for (let k = 0; k < pips; k++)
      for (let y = 0; y < PIP; y++)
        for (let x = 0; x < PIP; x++) out[y][x0 + k * 2 + x] = x === 1 && y === 1 ? pile.colour : "#111111";
  }
  return out;
}

const cache = new Map<string, string>();
const healthStep = (health: number) => Math.round(Math.max(0, Math.min(1, health)) * CARD_W);

/** A pile as an image: cached by everything it shows */
export function pileUrl(pile: Pile): string {
  const key = `${pile.unit.id}|${pile.colour}|${Math.min(pile.count, MAX_STRIPS + 1)}|${healthStep(pile.health)}|${Math.min(MAX_PIPS, pile.pips)}`;
  let url = cache.get(key);
  if (url) return url;
  const pixels = pilePixels({ ...pile, health: healthStep(pile.health) / CARD_W });
  const canvas = document.createElement("canvas");
  canvas.width = pixels[0].length;
  canvas.height = pixels.length;
  const ctx = canvas.getContext("2d")!;
  for (const [y, row] of pixels.entries())
    for (const [x, colour] of row.entries()) {
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

/** One unit's card on its own, full health: for lists and panels */
export const cardUrl = (unit: Pile["unit"], colour: string, health = 1) =>
  pileUrl({ unit, colour, count: 1, health, pips: 0 });
