// Unit art as pixels, numbers included: the 17×17 icon, the far card (23×23: icon only) and the close card (29×29:
// power, troops and slots in a 3×5 pixel font). A single unit's card is pale; a stack adds a 2-pixel strip per unit
// behind the front one
import type { KitUnit } from "./kit";

const SCALE = 4; // canvas pixels per art pixel
export const CARD = { far: 23, close: 29 } as const;
export type CardSize = keyof typeof CARD;
export const STRIP = 2; // art pixels per unit behind the front card

export type IconMode = "icon" | "silhouette" | "white";

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const css = (channels: number[]) => `rgb(${channels.map(Math.round).join(",")})`;
const tint = (hex: string, a: number) => css(rgb(hex).map(v => v + (255 - v) * a));
const shade = (hex: string, a: number) => css(rgb(hex).map(v => v * a));
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
  ".": [".", ".", ".", ".", "#"]
};
const textWidth = (text: string) => [...text].reduce((w, c) => w + (DIGITS[c]?.[0].length ?? 3) + 1, -1);

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

export interface CardFace {
  unit: KitUnit;
  colour: string; // the nation's
  single: boolean; // one slot on its own: pale
  power: number;
  troops: number;
  slots: number;
  strength: number;
  behind?: string[]; // colours of the cards stacked behind, front to back
}

/** A card, with a strip on top for each unit behind it */
export function cardUrl(face: CardFace, size: CardSize): string {
  const step = Math.round(face.strength * 10) / 10;
  const behind = face.behind ?? [];
  const key = `c|${size}|${face.unit.id}|${face.colour}|${face.single}|${face.power}|${face.troops}|${face.slots}|${step}|${behind.join(",")}`;
  return cached(key, () => {
    const n = CARD[size];
    const lift = behind.length * STRIP;
    const p = new Pixels(n, n + lift);
    behind.forEach((colour, k) => {
      for (let x = 0; x < n; x++) {
        p.dot(x, k * STRIP, "#000");
        p.dot(x, k * STRIP + 1, x === 0 || x === n - 1 ? "#000" : shade(colour, 0.85));
      }
    });
    const fill = face.single ? pale(face.colour) : face.colour;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) p.dot(x, lift + y, x === 0 || y === 0 || x === n - 1 || y >= n - 3 ? "#000" : fill);
    const bar = Math.round(step * (n - 2));
    for (let x = 1; x <= bar; x++) p.dot(x, lift + n - 2, barColour(step));
    const icon = { "#": "#000", R: "#fff", W: "#fff" };
    if (size === "far") {
      p.art(face.unit.pixels, 3, lift + 2, icon, lift + n - 3);
      return p.element;
    }
    p.art(face.unit.pixels, 6, lift + 8, icon, lift + n - 3);
    const text = ink(fill);
    const power = short(face.power);
    const troops = short(face.troops);
    p.text(power, 2, lift + 2, tint(fill, 0.6), true);
    p.text(troops, n - 3 - textWidth(troops), lift + 2, text, text === "#fff");
    p.text(String(face.slots), 2, lift + 20, text, text === "#fff");
    return p.element;
  });
}

/** A white frame over a card's edge pixels: shows a card is selected */
export function frameUrl(size: CardSize, lift: number): string {
  return cached(`f|${size}|${lift}`, () => {
    const n = CARD[size];
    const p = new Pixels(n, n + lift);
    for (let k = 0; k < n; k++) {
      p.dot(k, lift, "#fff");
      p.dot(k, lift + n - 1, "#fff");
      p.dot(0, lift + k, "#fff");
      p.dot(n - 1, lift + k, "#fff");
    }
    return p.element;
  });
}

/** The tab beside a stack that opens it */
export function tabUrl(): string {
  return cached("tab", () => {
    const p = new Pixels(7, 11);
    p.art(
      [
        "#......",
        "##.....",
        "#W#....",
        "#WW#...",
        "#WWW#..",
        "#WWWW#.",
        "#WWW#..",
        "#WW#...",
        "#W#....",
        "##.....",
        "#......"
      ],
      0,
      0,
      { "#": "#000", W: "#fff" }
    );
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
