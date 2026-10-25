// Unit art as pixels: the 17×17 icon, its far-out silhouette, and the 29×29 card, one grid with text laid over it
import type { KitUnit } from "./kit";

const CARD = 29;
const ICON_AT = [6, 5] as const; // icon's top-left on the card: column 14 is the centre of both
const SCALE = 4; // canvas pixels per art pixel

export type IconMode = "icon" | "silhouette" | "white";

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const css = (channels: number[]) => `rgb(${channels.map(Math.round).join(",")})`;
const tint = (hex: string, a: number) => css(rgb(hex).map(v => v + (255 - v) * a));

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

function paint(
  ctx: CanvasRenderingContext2D,
  cells: string[],
  at: readonly [number, number],
  colours: Record<string, string>
) {
  cells.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = colours[row[x]];
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect((at[0] + x) * SCALE, (at[1] + y) * SCALE, SCALE, SCALE);
    }
  });
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement("canvas");
  element.width = element.height = size * SCALE;
  const ctx = element.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return [element, ctx];
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
    const [element, ctx] = canvas(17);
    const colours =
      mode === "silhouette"
        ? { "#": colour, R: colour, W: colour }
        : { "#": "#000", R: mode === "white" ? "#fff" : colour, W: "#fff" };
    paint(ctx, unit.pixels, [0, 0], colours);
    return element;
  });
}

export interface CardFace {
  unit: KitUnit;
  colour: string;
  power: number;
  troops: number;
  slots: number;
  strength: number;
}

let fontReady = false;
/** Cards drawn before VT323 loaded are drawn again once it has */
export function whenFontReady(then: () => void): void {
  void document.fonts?.load(`22px "VT323"`).then(() => {
    if (fontReady) return;
    fontReady = true;
    cache.clear();
    then();
  });
}

export function cardUrl(face: CardFace): string {
  const step = Math.round(face.strength * 10) / 10;
  const key = `c|${face.unit.id}|${face.colour}|${face.power}|${face.troops}|${face.slots}|${step}|${fontReady}`;
  return cached(key, () => {
    const [element, ctx] = canvas(CARD);
    const grid = Array.from({ length: CARD }, (_, y) =>
      Array.from({ length: CARD }, (_, x) => (x === 0 || y === 0 || x === CARD - 1 || y >= CARD - 3 ? "#" : "C")).join(
        ""
      )
    );
    paint(ctx, grid, [0, 0], { "#": "#000", C: face.colour });
    paint(ctx, face.unit.pixels, ICON_AT, { "#": "#000", R: "#fff", W: "#fff" });
    ctx.fillStyle = barColour(step);
    ctx.fillRect(SCALE, (CARD - 2) * SCALE, Math.round(step * (CARD - 2)) * SCALE, SCALE);

    const text = ink(face.colour);
    ctx.font = `22px "VT323", monospace`;
    ctx.textBaseline = "top";
    const write = (value: string, x: number, y: number, fill: string, align: CanvasTextAlign, shadow: boolean) => {
      ctx.textAlign = align;
      if (shadow) {
        ctx.fillStyle = "#000";
        ctx.fillText(value, x + 2, y + 2);
      }
      ctx.fillStyle = fill;
      ctx.fillText(value, x, y);
    };
    const light = text === "#fff";
    write(short(face.power), 8, 6, tint(face.colour, 0.6), "left", true);
    write(short(face.troops), CARD * SCALE - 8, 6, text, "right", light);
    write(String(face.slots), 8, 80, text, "left", light);
    return element;
  });
}
