// Unit art as pixels, numbers included: the 17×17 icon, and the chips units are drawn as (a 3×5 pixel font, doubled)
import type { KitUnit } from "./kit";

const SCALE = 4; // canvas pixels per art pixel

export type IconMode = "icon" | "silhouette" | "white";

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hexOf = (channels: number[]) => `#${channels.map(v => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
/** A single unit's card colour: the nation colour halfway to white */
export const pale = (hex: string) => hexOf(rgb(hex).map(v => v + (255 - v) * 0.5));

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on a colour */
export const ink = (hex: string) => {
  const l = luminance(hex);
  return (l + 0.05) / 0.05 > 1.05 / (l + 0.05) ? "#000" : "#fff";
};

/** The strength bar's colour: green, light green, yellow, amber, red */
export function barColour(strength: number): string {
  if (strength >= 0.8) return "#2bff3a";
  if (strength >= 0.6) return "#a6f25a";
  if (strength >= 0.4) return "#ffe81a";
  if (strength >= 0.2) return "#ff9d1a";
  return "#ff2a1a";
}

/** Numbers as 500, 1.2K, 12K, 1.2M */
export function short(value: number): string {
  const v = Math.round(value);
  if (v < 1e3) return String(v);
  if (v < 1e4) return `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  if (v < 1e6) return `${Math.round(v / 1e3)}K`;
  return `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
}

// 3×5 digits for card numbers
const DIGITS: Record<string, string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  M: ["#.#", "###", "###", "#.#", "#.#"],
  ".": [".", ".", ".", ".", "#"],
  "/": ["..#", "..#", ".#.", "#..", "#.."],
  x: ["...", "#.#", ".#.", "#.#", "..."]
};

class Pixels {
  readonly element = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  constructor(width: number, height: number) {
    this.element.width = width * SCALE;
    this.element.height = height * SCALE;
    this.ctx = this.element.getContext("2d")!;
  }
  dot(x: number, y: number, colour: string): void {
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
  }
  art(rows: string[], x0: number, y0: number, colours: Record<string, string>, below = Infinity): void {
    rows.forEach((row, y) => {
      if (y0 + y >= below) return;
      for (let x = 0; x < row.length; x++) if (colours[row[x]]) this.dot(x0 + x, y0 + y, colours[row[x]]);
    });
  }
  text(value: string, x0: number, y0: number, colour: string, shadow: boolean): void {
    let x = x0;
    for (const c of value) {
      const glyph = DIGITS[c];
      if (!glyph) continue;
      glyph.forEach((row, y) => {
        for (let k = 0; k < row.length; k++) {
          if (row[k] !== "#") continue;
          if (shadow) this.dot(x + k + 1, y0 + y + 1, "#000");
          this.dot(x + k, y0 + y, colour);
        }
      });
      x += glyph[0].length + 1;
    }
  }
  /** Digits at twice the size, with an outline when asked */
  bigText(value: string, x0: number, y0: number, colour: string, outline: string | null): void {
    const cells: [number, number][] = [];
    let x = x0;
    for (const c of value) {
      const glyph = DIGITS[c];
      if (!glyph) continue;
      glyph.forEach((row, y) => {
        for (let k = 0; k < row.length; k++)
          if (row[k] === "#")
            for (const [dx, dy] of [
              [0, 0],
              [1, 0],
              [0, 1],
              [1, 1]
            ])
              cells.push([x + k * 2 + dx, y0 + y * 2 + dy]);
      });
      x += (glyph[0].length + 1) * 2;
    }
    if (outline)
      for (const [cx, cy] of cells)
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ])
          this.dot(cx + dx, cy + dy, outline);
    for (const [cx, cy] of cells) this.dot(cx, cy, colour);
  }
}

const cache = new Map<string, string>();
const cached = (key: string, draw: () => HTMLCanvasElement) => {
  let url = cache.get(key);
  if (!url) {
    url = draw().toDataURL();
    cache.set(key, url);
  }
  return url;
};

/** A unit's icon in a nation's colour, its solid silhouette, or white for a card */
export function iconUrl(unit: KitUnit, colour: string, mode: IconMode = "icon"): string {
  return cached(`i|${unit.id}|${colour}|${mode}`, () => {
    const p = new Pixels(17, 17);
    const colours =
      mode === "silhouette"
        ? { "#": colour, R: colour, W: colour }
        : { "#": "#000", R: mode === "white" ? "#fff" : colour, W: "#fff" };
    p.art(unit.pixels, 0, 0, colours);
    return p.element;
  });
}

// --- unit cards: land units stand as vertical cards, air and naval units lie as horizontal cards whose right end shows
// their role; each carries its role's symbol, its power grade and its tier as bars, with a thin health bar beneath.
// A transport is a hull wrapped round a hold of 2–4 bays, its cargo's cards inside. Far out a nation's units in a cell
// fold into one plain chip of symbols, and a transport into its outline with its cargo's symbols in the bays

export type CardKind = "land" | "air" | "naval";
export type RoleShape = "flat" | "arrow" | "swept" | "reverse" | "bow" | "rake" | "blunt";

/** Art sizes, in art pixels */
export const CARD = { landW: 19, landH: 33, w: 50, h: 21, end: 10, bayGap: 1, front: 20, bar: 2 } as const;

export interface CardFace {
  unit: KitUnit;
  colour: string;
  band?: string; // serving another nation: its colour across the top
  grade: number; // 1–9, 0 for none
  strength: number; // 0–1
}

export type UnitArt =
  | { type: "card"; face: CardFace }
  | { type: "transport"; face: CardFace; cargo: CardFace[]; room: number; lit?: number }
  | { type: "far"; colour: string; kind: CardKind; roles: KitUnit["role"][] }
  | { type: "farTransport"; face: CardFace; cargo: KitUnit["role"][]; room: number };

/** Where things sit in an art image: its size, the card's middle (what stands on the regiment's point), the bays */
export interface ArtLayout {
  width: number;
  height: number;
  middle: number;
  bays: { x: number; y: number; w: number; h: number }[];
}

const GLYPHS: Record<KitUnit["role"], string[]> = {
  infantry: [
    "##.......##",
    "###.....###",
    ".###...###.",
    "..###.###..",
    "...#####...",
    "....###....",
    "...#####...",
    "..###.###..",
    ".###...###.",
    "###.....###",
    "##.......##"
  ],
  assault: [
    "##.......##",
    "###.....###",
    ".###...###.",
    "..#######..",
    "...#####...",
    "...#####...",
    "...#####...",
    "..#######..",
    ".###...###.",
    "###.....###",
    "##.......##"
  ],
  cavalry: [
    "##.......##",
    "##.......##",
    "##.......##",
    "##.......##",
    "##.......##",
    "##.......##",
    "###.....###",
    ".###...###.",
    "..#######..",
    "...#####...",
    "..........."
  ],
  armour: [
    "...........",
    "..#######..",
    ".#########.",
    "###.....###",
    "##.......##",
    "##.......##",
    "##.......##",
    "###.....###",
    ".#########.",
    "..#######..",
    "..........."
  ],
  scout: [
    ".........##",
    ".......###.",
    ".....###...",
    "...###.....",
    ".###.......",
    "##.........",
    ".###.......",
    "...###.....",
    ".....###...",
    ".......###.",
    ".........##"
  ],
  combat: [
    "....###....",
    "....###....",
    "....###....",
    "....###....",
    "###########",
    "###########",
    "###########",
    "....###....",
    "....###....",
    "....###....",
    "....###...."
  ],
  bomber: [
    "....###....",
    ".....#.....",
    "...#####...",
    "..#######..",
    ".#########.",
    ".#########.",
    ".#########.",
    ".#########.",
    "..#######..",
    "...#####...",
    "..........."
  ],
  trade: [
    "###########",
    "#....#....#",
    "#....#....#",
    "#....#....#",
    "###########",
    "#....#....#",
    "#....#....#",
    "#....#....#",
    "#....#....#",
    "###########",
    "..........."
  ],
  transport: [
    "##.......##",
    "##.......##",
    "##.......##",
    "##..###..##",
    "##..###..##",
    "##.......##",
    "###########",
    "###########",
    "...........",
    "...........",
    "..........."
  ]
};

/** The right end a unit's card takes, by its domain and role */
export function shapeOf(unit: KitUnit): RoleShape {
  if (unit.domain === "land") return "flat";
  if (unit.role === "trade") return "blunt";
  if (unit.domain === "air") return unit.role === "scout" ? "arrow" : unit.role === "bomber" ? "reverse" : "swept";
  return unit.role === "scout" ? "bow" : "rake";
}

/** The last pixel inside a horizontal card on row y */
function rightEdge(shape: RoleShape, w: number, h: number, y: number): number {
  const e = CARD.end;
  const c = (h - 1) / 2;
  const last = w - 1;
  switch (shape) {
    case "arrow":
      return Math.round(last - (e * Math.abs(y - c)) / c);
    case "swept":
      return Math.round(last - e + (e * y) / (h - 1));
    case "reverse":
    case "rake":
      return Math.round(last - (e * y) / (h - 1));
    case "bow":
      return y <= c ? Math.round(last - e * 0.5 * ((c - y) / c) ** 2) : Math.round(last - (e * 0.8 * (y - c)) / c);
    case "blunt":
      return y < e / 2 ? Math.round(last - (e / 2 - y)) : last;
    default:
      return last;
  }
}

/** Fill a shape given by a test, its edge in black (white when it's the selection frame) */
function fillShape(
  p: Pixels,
  x0: number,
  y0: number,
  w: number,
  h: number,
  inside: (x: number, y: number) => boolean,
  fill: (x: number, y: number) => string,
  frame: boolean
): void {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (frame) {
        if (edge) p.dot(x0 + x, y0 + y, "#fff");
      } else p.dot(x0 + x, y0 + y, edge ? "#000" : fill(x, y));
    }
}

const inBox = (w: number, h: number) => (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
const glyph = (p: Pixels, role: KitUnit["role"], x: number, y: number) => p.art(GLYPHS[role], x, y, { "#": "#000" });
const tintOf = (hex: string, a: number) => hexOf(rgb(hex).map(v => v + (255 - v) * a));
const faceFill = (face: CardFace) => (_x: number, y: number) => (face.band && y <= 3 ? face.band : face.colour);

function healthBar(p: Pixels, cx: number, y: number, w: number, strength: number): void {
  const left = Math.round(cx - w / 2);
  const lit = Math.round(w * Math.max(0, Math.min(1, strength)));
  for (let x = 0; x < w; x++) p.dot(left + x, y, x < lit ? barColour(strength) : "#1d3a2f");
}

/** A land unit standing up: symbol, grade, tier bars at its foot */
function drawLand(p: Pixels, x0: number, y0: number, face: CardFace, frame: boolean, bar = true): void {
  const { landW: w, landH: h } = CARD;
  fillShape(p, x0, y0, w, h, inBox(w, h), faceFill(face), frame);
  if (frame) return;
  glyph(p, face.unit.role, x0 + 4, y0 + 3);
  if (face.grade) p.bigText(String(face.grade), x0 + 7, y0 + 16, "#000", null);
  for (let k = 0; k < face.unit.tier; k++) for (let x = 0; x < 9; x++) p.dot(x0 + 5 + x, y0 + h - 3 - k * 2, "#000");
  if (bar) healthBar(p, x0 + w / 2, y0 + h + 1, 11, face.strength);
}

/** An aircraft or ship lying down: symbol, grade, tier bars before its shaped end */
function drawFlat(p: Pixels, x0: number, y0: number, face: CardFace, frame: boolean): void {
  const { w, h } = CARD;
  const shape = shapeOf(face.unit);
  fillShape(p, x0, y0, w, h, (x, y) => inBox(w, h)(x, y) && x <= rightEdge(shape, w, h, y), faceFill(face), frame);
  if (frame) return;
  glyph(p, face.unit.role, x0 + 4, y0 + 5);
  if (face.grade) p.bigText(String(face.grade), x0 + 19, y0 + 5, "#000", null);
  let edge: number = w;
  for (let y = 5; y <= 15; y++) edge = Math.min(edge, rightEdge(shape, w, h, y));
  for (let k = 0; k < face.unit.tier; k++)
    for (let y = 6; y <= 14; y++) for (let t = 0; t < 2; t++) p.dot(x0 + edge - 3 - k * 3 - t, y0 + y, "#000");
  healthBar(p, x0 + w / 2, y0 + h + 1, 18, face.strength);
}

/** A transport's measurements: its hold's bays, the front beyond them */
function transportSize(room: number, far: boolean) {
  const bayW = far ? 13 : CARD.landW;
  const bayH = far ? 13 : CARD.landH;
  const holdW = room * bayW + (room + 1) * CARD.bayGap;
  const front = far ? 12 : CARD.front;
  const w = 2 + holdW + 1 + front;
  const h = 2 + bayH + 2 + 2;
  return { bayW, bayH, holdW, front, w, h };
}

function drawTransport(
  p: Pixels,
  face: CardFace,
  room: number,
  frame: boolean,
  inner: (k: number, x: number, y: number) => void,
  far: boolean,
  lit?: number
): ArtLayout["bays"] {
  const { bayW, bayH, holdW, front, w, h } = transportSize(room, far);
  const air = face.unit.domain === "air";
  const r = (h - 1) / 2;
  const frontX = 2 + holdW + 1;
  const inside = (x: number, y: number) => {
    if (!inBox(w, h)(x, y)) return false;
    if (x < frontX) return true;
    if (air) {
      const nose = w - 1 - r;
      return x <= nose || (x - nose) ** 2 + (y - r) ** 2 <= r * r;
    }
    return x <= Math.round(w - 1 - (front * 0.55 * y) / (h - 1));
  };
  fillShape(p, 0, 0, w, h, inside, faceFill(face), frame);
  const bays: ArtLayout["bays"] = [];
  for (let k = 0; k < room; k++)
    bays.push({ x: 2 + CARD.bayGap + k * (bayW + CARD.bayGap), y: 2 + 1, w: bayW, h: bayH });
  if (frame) return bays;
  // the hold: a lighter well framed in black, a faint divider between bays
  const well = tintOf(face.colour, 0.45);
  const divider = tintOf(face.colour, 0.2);
  for (let y = 2; y < 2 + bayH + 2; y++)
    for (let x = 2; x <= 2 + holdW - 1; x++) {
      const rim = y === 2 || y === 2 + bayH + 1 || x === 2 || x === 2 + holdW - 1;
      p.dot(x, y, rim ? "#000" : well);
    }
  for (let k = 1; k < room; k++) {
    const x = 2 + k * (bayW + CARD.bayGap);
    for (let y = 4; y < 2 + bayH; y++) p.dot(x, y, divider);
  }
  for (const [k, bay] of bays.entries()) {
    if (k === lit)
      for (let y = 0; y < bay.h; y++) for (let x = 0; x < bay.w; x++) p.dot(bay.x + x, bay.y + y, "#ffffff");
    inner(k, bay.x, bay.y);
  }
  // the front: grade and tier bars
  const cx = frontX + Math.round(front * (air ? 0.32 : 0.28));
  if (face.grade) p.bigText(String(face.grade), cx - 3, far ? 3 : 8, "#000", null);
  if (!far)
    for (let k = 0; k < face.unit.tier; k++)
      for (let y = 0; y < 7; y++) for (let t = 0; t < 2; t++) p.dot(cx - 3 + k * 3 + t, 22 + y, "#000");
  return bays;
}

/** An art's layout, without drawing it */
export function artLayout(art: UnitArt): ArtLayout {
  switch (art.type) {
    case "card":
      return art.face.unit.domain === "land"
        ? { width: CARD.landW, height: CARD.landH + 2, middle: CARD.landH / 2, bays: [] }
        : { width: CARD.w, height: CARD.h + 2, middle: CARD.h / 2, bays: [] };
    case "transport":
    case "farTransport": {
      const far = art.type === "farTransport";
      const { bayW, bayH, w, h } = transportSize(art.room, far);
      const bays = Array.from({ length: art.room }, (_, k) => ({
        x: 2 + CARD.bayGap + k * (bayW + CARD.bayGap),
        y: 3,
        w: bayW,
        h: bayH
      }));
      return { width: w, height: h + (far ? 0 : 2), middle: h / 2, bays };
    }
    case "far": {
      const w = 4 + art.roles.length * 13 + (art.kind === "land" ? 0 : CARD.end);
      return { width: Math.max(17, w), height: 15, middle: 7, bays: [] };
    }
  }
}

const faceKey = (f: CardFace) => `${f.unit.id}|${f.colour}|${f.band ?? ""}|${f.grade}|${Math.round(f.strength * 20)}`;

const artKey = (art: UnitArt): string => {
  switch (art.type) {
    case "card":
      return `c|${faceKey(art.face)}`;
    case "transport":
      return `t|${faceKey(art.face)}|${art.room}|${art.lit ?? ""}|${art.cargo.map(faceKey).join(";")}`;
    case "far":
      return `f|${art.colour}|${art.kind}|${art.roles.join(",")}`;
    case "farTransport":
      return `ft|${faceKey(art.face)}|${art.room}|${art.cargo.join(",")}`;
  }
};

/** A unit's art as an image, or its white outline (the selection frame) */
export function artUrl(art: UnitArt, frame = false): string {
  return cached(`art|${frame}|${artKey(art)}`, () => {
    const layout = artLayout(art);
    const p = new Pixels(layout.width, layout.height);
    switch (art.type) {
      case "card":
        if (art.face.unit.domain === "land") drawLand(p, 0, 0, art.face, frame);
        else drawFlat(p, 0, 0, art.face, frame);
        break;
      case "transport": {
        drawTransport(
          p,
          art.face,
          art.room,
          frame,
          (k, x, y) => art.cargo[k] && drawLand(p, x, y, art.cargo[k], false, false),
          false,
          art.lit
        );
        if (!frame) {
          const { w, h } = transportSize(art.room, false);
          healthBar(p, w / 2, h + 1, Math.round(w * 0.35), art.face.strength);
        }
        break;
      }
      case "farTransport":
        drawTransport(
          p,
          art.face,
          art.room,
          frame,
          (k, x, y) => art.cargo[k] && glyph(p, art.cargo[k], x + 1, y + 1),
          true
        );
        break;
      case "far": {
        const w = layout.width;
        const h = layout.height;
        const shape: RoleShape = art.kind === "land" ? "flat" : art.kind === "air" ? "swept" : "rake";
        const edge = (y: number) => (shape === "flat" ? w - 1 : Math.round(rightEdge(shape, w, h * 1.4, y * 1.4)));
        fillShape(
          p,
          0,
          0,
          w,
          h,
          (x, y) => inBox(w, h)(x, y) && x <= edge(y),
          () => art.colour,
          frame
        );
        if (!frame) for (const [k, role] of art.roles.entries()) glyph(p, role, 3 + k * 13, 2);
        break;
      }
    }
    return p.element;
  });
}

const STALL = [
  ".................",
  ".................",
  "#################",
  "#.#.#.#.#.#.#.#.#",
  "#################",
  ".#.#.#.#.#.#.#.#.",
  ".................",
  "..#...........#..",
  "..#...........#..",
  "..#..#######..#..",
  "..#..#.....#..#..",
  "..#..#.....#..#..",
  "..#..#######..#..",
  "..#...........#..",
  "#################",
  "#################",
  "................."
];

/** A market stall, for the Market building */
export function stallUrl(colour: string): string {
  return cached(`stall|${colour}`, () => {
    const p = new Pixels(17, 17);
    p.art(STALL, 0, 0, { "#": colour });
    return p.element;
  });
}

// 11×11 button icons, one colour, drawn like the buildings
const BUTTONS: Record<string, string[]> = {
  recruit: [
    "...###.....",
    "..#####....",
    "..#####....",
    "...###..#..",
    "..#####.#..",
    ".#######.##",
    ".#######.#.",
    ".#######.#.",
    ".#######...",
    "..#####....",
    "..........."
  ].map(r => r.replace(".##", "###")),
  form: [
    ".#.........",
    ".########..",
    ".########..",
    ".#########.",
    ".########..",
    ".########..",
    ".#.........",
    ".#.........",
    ".#.........",
    ".#.........",
    "###........"
  ],
  locate: [
    ".....#.....",
    "...#####...",
    "..#..#..#..",
    ".#...#...#.",
    ".#.......#.",
    "###.###.###",
    ".#.......#.",
    ".#...#...#.",
    "..#..#..#..",
    "...#####...",
    ".....#....."
  ],
  notes: [
    ".#########.",
    ".#.......#.",
    ".#.#####.#.",
    ".#.......#.",
    ".#.#####.#.",
    ".#.......#.",
    ".#.###...#.",
    ".#.......#.",
    ".#########.",
    "...........",
    "..........."
  ],
  unlocked: [
    "...#####...",
    "..#.....#..",
    "..#.....#..",
    "..#........",
    ".#########.",
    ".####.####.",
    ".###...###.",
    ".####.####.",
    ".####.####.",
    ".#########.",
    "..........."
  ],
  locked: [
    "...#####...",
    "..#.....#..",
    "..#.....#..",
    "..#.....#..",
    ".#########.",
    ".####.####.",
    ".###...###.",
    ".####.####.",
    ".####.####.",
    ".#########.",
    "..........."
  ],
  delete: [
    "....###....",
    ".#########.",
    "...........",
    ".#########.",
    ".#.#.#.#.#.",
    ".#.#.#.#.#.",
    ".#.#.#.#.#.",
    ".#.#.#.#.#.",
    ".#.#.#.#.#.",
    "..#######..",
    "..........."
  ],
  attack: [
    "#.........#",
    ".#.......#.",
    "..#.....#..",
    "...#...#...",
    "....#.#....",
    ".....#.....",
    "....#.#....",
    ".##.#.#.##.",
    ".###...###.",
    "##.......##",
    "#.........#"
  ],
  merge: [
    "#.........#",
    ".#.......#.",
    "..#.....#..",
    "...#...#...",
    "....#.#....",
    ".....#.....",
    ".....#.....",
    ".....#.....",
    ".....#.....",
    "...#####...",
    "....###...."
  ],
  disband: [
    ".....#.....",
    ".....#.....",
    ".....#.....",
    ".....#.....",
    "....#.#....",
    "...#...#...",
    "..#.....#..",
    ".#.......#.",
    "#.........#",
    "##.......##",
    "..........."
  ],
  unload: [
    "....###....",
    "....###....",
    "....###....",
    "..#######..",
    "...#####...",
    "....###....",
    ".....#.....",
    "...........",
    "###########",
    "#.#.#.#.#.#",
    "###########"
  ],
  encamp: [
    ".....#.....",
    "....###....",
    "...#####...",
    "..###.###..",
    ".###...###.",
    "###.....###",
    "###.....###",
    "###.....###",
    "###########",
    "...........",
    "..........."
  ],
  release: [
    "....#......",
    "...###.....",
    "..#####....",
    "....#......",
    "....#..####",
    "....#..#..#",
    "###########",
    "#.........#",
    "#..###....#",
    "#..#.#....#",
    "#..#.#....#"
  ],
  send: [
    "...........",
    "...........",
    "......#....",
    "......##...",
    "#########..",
    "##########.",
    "#########..",
    "......##...",
    "......#....",
    "...........",
    "..........."
  ]
};

/** A folder button's pixel icon */
export function buttonUrl(name: string, colour = "#e8e5d9"): string {
  return cached(`b|${name}|${colour}`, () => {
    const p = new Pixels(11, 11);
    p.art(BUTTONS[name] ?? BUTTONS.notes, 0, 0, { "#": colour });
    return p.element;
  });
}

export type TokenShape = "circle" | "diamond" | "square";

/** A marker's token: a 17×17 shape in its colour with one letter or digit */
export function tokenUrl(shape: TokenShape, colour: string, letter: string): string {
  return cached(`t|${shape}|${colour}|${letter}`, () => {
    const n = 17;
    const p = new Pixels(n, n);
    const inside = (x: number, y: number, r: number) => {
      const dx = x - 8;
      const dy = y - 8;
      if (shape === "square") return Math.max(Math.abs(dx), Math.abs(dy)) <= r - 1;
      if (shape === "diamond") return Math.abs(dx) + Math.abs(dy) <= r;
      return dx * dx + dy * dy <= (r + 0.4) * (r + 0.4);
    };
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (inside(x, y, 7)) p.dot(x, y, colour);
        else if (inside(x, y, 8)) p.dot(x, y, "#000");
      }
    const ctx = p.element.getContext("2d")!;
    ctx.font = `${9 * SCALE}px "VT323", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = ink(colour);
    ctx.fillText(letter.slice(0, 1).toUpperCase(), 8.5 * SCALE, 8.7 * SCALE);
    return p.element;
  });
}
