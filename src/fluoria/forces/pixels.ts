// Unit art as pixels, numbers included: the 17×17 icon, and the chips units are drawn as (a 3×5 pixel font, doubled)
import type { KitUnit } from "./kit";

const SCALE = 4; // canvas pixels per art pixel

export type IconMode = "icon" | "silhouette" | "white";

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const css = (channels: number[]) => `rgb(${channels.map(Math.round).join(",")})`;
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

// --- chips: a unit as a rectangle with its icon, power grade and count, its tier as pips on its left edge; the right
// corner cut shows the kind (air: top, ship: bottom). Stacked chips share an edge. A transport adds layers on top
// and opens into slots; far out a cell is one chip with its strongest unit's icon and how many units it stands for

export const CHIP = { w: 62, h: 21, gap: -1, cut: 6, layer: 2, pip: 3 } as const;
export type ChipKind = "land" | "air" | "naval";

export interface ChipFace {
  unit: KitUnit;
  colour: string;
  band?: string; // serving another nation: its colour across the top
  grade: number; // 1–9, 0 for none
  count: number;
  strength: number; // 0–1
}

export interface ChipColumn {
  chips: ChipFace[];
  kind: ChipKind;
  carrier?: { open: boolean; slots: ChipFace[]; room: number }; // a transport: its cargo and room
  summary?: { lead: KitUnit; units: number; colour: string; grade: number; count: number }; // far out, a cell
}

/** Rows of a column image, top down: where each chip sits, in art pixels */
export interface ChipLayout {
  width: number;
  height: number;
  rows: { y: number; kind: "chip" | "cargo" | "empty" | "head"; index: number }[];
}

/** Whether a pixel lies outside a chip's cut corner */
function cutAway(x: number, y: number, w: number, h: number, kind: ChipKind): boolean {
  const c = CHIP.cut;
  if (kind === "air") return x > w - 1 - c + y; // top right
  if (kind === "naval") return x > w - 1 - c + (h - 1 - y); // bottom right
  return false;
}
const onEdge = (x: number, y: number, w: number, h: number, kind: ChipKind) =>
  x === 0 ||
  y === 0 ||
  y === h - 1 ||
  x === w - 1 ||
  cutAway(x + 1, y, w, h, kind) ||
  cutAway(x, y + (kind === "air" ? -1 : 1), w, h, kind);

const plain = new Map<string, string[]>();
/** A unit's icon without the tier marks under it (the pips show the tier), centred again */
function plainPixels(unit: KitUnit): string[] {
  let rows = plain.get(unit.id);
  if (rows) return rows;
  const marks = unit.pixels.findIndex(row => row.includes("W"));
  const bare = (row?: string) => Boolean(row && /^[.#]+$/.test(row) && row.includes("###"));
  const drop = new Set<number>();
  if (marks >= 0) {
    drop.add(marks);
    if (bare(unit.pixels[marks - 1])) drop.add(marks - 1);
    if (bare(unit.pixels[marks + 1])) drop.add(marks + 1);
  }
  const kept = unit.pixels.filter((_, k) => !drop.has(k));
  const used = kept.map(row => row.replaceAll(".", "").length > 0);
  const first = used.indexOf(true);
  const last = used.lastIndexOf(true);
  const art = first < 0 ? kept : kept.slice(first, last + 1);
  const pad = Math.floor((17 - art.length) / 2);
  const blank = ".".repeat(17);
  rows = [...Array(pad).fill(blank), ...art, ...Array(17 - pad - art.length).fill(blank)];
  plain.set(unit.id, rows);
  return rows;
}

/** Tier pips hugging a chip's left edge, sharing its outline */
function drawPips(p: Pixels, x0: number, y0: number, n: number): void {
  const top = y0 + Math.round((CHIP.h - (n * 3 + 1)) / 2);
  for (let k = 0; k < n; k++)
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const edge = x === 0 || y === 0 || x === 3 || y === 3;
        p.dot(x0 - 3 + x, top + k * 3 + y, edge ? "#000" : "#fff");
      }
}

function drawChip(p: Pixels, x0: number, y0: number, w: number, kind: ChipKind, face: ChipFace, frame = false): void {
  const h = CHIP.h;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (cutAway(x, y, w, h, kind)) continue;
      const edge = onEdge(x, y, w, h, kind);
      if (frame) {
        if (edge) p.dot(x0 + x, y0 + y, "#fff");
        continue;
      }
      if (edge) p.dot(x0 + x, y0 + y, "#000");
      else if (face.band && y <= 3) p.dot(x0 + x, y0 + y, face.band);
      else p.dot(x0 + x, y0 + y, x <= 19 ? shade(face.colour, 0.78) : face.colour);
    }
  if (frame) return;
  drawPips(p, x0, y0, face.unit.tier);
  p.art(plainPixels(face.unit), x0 + 2, y0 + 2, { "#": "#000", R: "#fff", W: "#fff" });
  const text = ink(face.colour);
  if (face.grade) p.bigText(String(face.grade), x0 + 22, y0 + 5, "#fff", "#000");
  p.bigText(short(face.count), x0 + 31, y0 + 5, text, text === "#fff" ? "#000" : null);
  if (face.strength < 0.995) {
    const left = 20;
    const bar = Math.round(face.strength * (w - left - 2 - CHIP.cut));
    for (let x = 0; x < bar; x++) p.dot(x0 + left + x, y0 + h - 2, barColour(face.strength));
  }
}

function drawSummary(
  p: Pixels,
  x0: number,
  y0: number,
  w: number,
  s: NonNullable<ChipColumn["summary"]>,
  frame = false
): void {
  const h = CHIP.h;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || y === h - 1 || x === w - 1;
      if (frame) {
        if (edge) p.dot(x0 + x, y0 + y, "#fff");
      } else p.dot(x0 + x, y0 + y, edge ? "#000" : x <= 19 ? shade(s.colour, 0.78) : s.colour);
    }
  if (frame) return;
  p.art(plainPixels(s.lead), x0 + 2, y0 + 2, { "#": "#000", R: "#fff", W: "#fff" });
  if (s.units > 1) {
    // how many units it stands for, as a badge in the icon's corner
    const label = `x${Math.min(s.units, 9)}`;
    for (let y = 12; y <= 19; y++) for (let x = 10; x <= 19; x++) p.dot(x0 + x, y0 + y, "#000");
    p.text(label, x0 + 11, y0 + 13, "#fff", false);
  }
  const text = ink(s.colour);
  if (s.grade) p.bigText(String(s.grade), x0 + 22, y0 + 5, "#fff", "#000");
  p.bigText(short(s.count), x0 + 31, y0 + 5, text, text === "#fff" ? "#000" : null);
}

/** The layout of a column: chips one under another, sharing edges; a transport's layers on top, its hold below */
export function chipLayout(col: ChipColumn): ChipLayout {
  const { h, gap, layer, pip } = CHIP;
  const width = pip + CHIP.w;
  const rows: ChipLayout["rows"] = [];
  if (col.summary) {
    const behind = Math.max(0, col.summary.units - 1);
    return { width, height: h + behind * layer, rows: [{ y: 0, kind: "chip", index: 0 }] };
  }
  if (col.carrier) {
    const lift = col.carrier.open ? 0 : 2 * layer;
    rows.push({ y: lift, kind: "head", index: 0 });
    if (!col.carrier.open) return { width, height: lift + h, rows };
    let y = h + 1;
    for (let k = 0; k < col.carrier.room; k++) {
      rows.push({ y, kind: k < col.carrier.slots.length ? "cargo" : "empty", index: k });
      y += h + gap;
    }
    return { width, height: y + 4, rows };
  }
  for (let k = 0; k < col.chips.length; k++) rows.push({ y: k * (h + gap), kind: "chip", index: k });
  return { width, height: Math.max(h, col.chips.length * (h + gap) - gap), rows };
}

const faceKey = (f: ChipFace) =>
  `${f.unit.id}|${f.colour}|${f.band ?? ""}|${f.grade}|${f.count}|${Math.round(f.strength * 20)}`;

/** A column of chips as one image, or its white frame (selection) */
export function columnUrl(col: ChipColumn, frame = false): string {
  const key = `col|${frame}|${col.kind}|${col.chips.map(faceKey).join(";")}|${col.carrier ? `${col.carrier.open}|${col.carrier.room}|${col.carrier.slots.map(faceKey).join(";")}` : ""}|${col.summary ? `${col.summary.lead.id}|${col.summary.units}|${col.summary.colour}|${col.summary.grade}|${col.summary.count}` : ""}`;
  return cached(key, () => {
    const layout = chipLayout(col);
    const p = new Pixels(layout.width, layout.height);
    const w = CHIP.w;
    const x0 = CHIP.pip;
    if (col.summary) {
      drawSummary(p, x0, 0, w, col.summary, frame);
      if (!frame)
        for (let k = 0; k < col.summary.units - 1; k++)
          for (let x = 2; x < w - 2; x++) {
            p.dot(x0 + x, CHIP.h + k * CHIP.layer, shade(col.summary.colour, 0.85));
            p.dot(x0 + x, CHIP.h + k * CHIP.layer + 1, "#000");
          }
      return p.element;
    }
    if (col.carrier) {
      const head = col.chips[0];
      if (!col.carrier.open && !frame)
        for (let k = 0; k < 2; k++)
          for (let x = 2; x < w - 2 - (col.kind === "air" ? CHIP.cut : 0); x++) {
            p.dot(x0 + x, k * CHIP.layer, "#000");
            p.dot(x0 + x, k * CHIP.layer + 1, shade(head.colour, 0.85));
          }
      const top = col.carrier.open ? 0 : 2 * CHIP.layer;
      if (col.carrier.open && !frame) {
        // the hold: the transport's colour around dark wells, the cut corner kept at the bottom for ships
        const bodyH = layout.height;
        for (let y = CHIP.h; y < bodyH; y++)
          for (let x = 0; x < w; x++) {
            if (col.kind === "naval" && cutAway(x, y - (bodyH - CHIP.h), w, CHIP.h, "naval") && y >= bodyH - CHIP.h)
              continue;
            const edge = x === 0 || x === w - 1 || y === bodyH - 1;
            p.dot(x0 + x, y, edge ? "#000" : x <= 1 || x >= w - 2 || y >= bodyH - 3 ? head.colour : "#1c1f1c");
          }
      }
      drawChip(p, x0, top, w, col.kind, head, frame);
      if (!frame) {
        // the fold arrow: down when shut, up when open
        const ax = x0 + w - 7;
        const ay = top + 8;
        for (let r = 0; r < 3; r++)
          for (let x = r; x < 5 - r; x++) p.dot(ax + x, col.carrier.open ? ay + 2 - r : ay + r, "#000");
      }
      if (col.carrier.open && !frame)
        for (const row of layout.rows) {
          if (row.kind === "cargo") drawChip(p, x0 + 2, row.y, w - 4, "land", col.carrier.slots[row.index]);
          else if (row.kind === "empty")
            for (let y = 1; y < CHIP.h - 1; y++)
              for (let x = 3; x < w - 3; x++) p.dot(x0 + x, row.y + y, (x + y) % 2 ? "#2c322c" : "#262b26");
        }
      return p.element;
    }
    for (const row of layout.rows) drawChip(p, x0, row.y, w, col.kind, col.chips[row.index], frame);
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
