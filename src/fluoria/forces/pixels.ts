// Pixel art for panels: the 17×17 unit icon, the market stall, button icons and marker tokens
import type { KitUnit } from "./kit";

const SCALE = 4; // canvas pixels per art pixel

export type IconMode = "icon" | "silhouette" | "white";

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

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

/** Numbers as 500, 1.2K, 12K, 1.2M */
export function short(value: number): string {
  const v = Math.round(value);
  if (v < 1e3) return String(v);
  if (v < 1e4) return `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  if (v < 1e6) return `${Math.round(v / 1e3)}K`;
  return `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
}

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
  open: [
    "...........",
    "#####......",
    "#...#######",
    "#.........#",
    "#.........#",
    "#.........#",
    "#.........#",
    "#.........#",
    "###########",
    "...........",
    "..........."
  ],
  army: [
    "....#......",
    "....##.....",
    "....###....",
    "....#......",
    "....#......",
    "....#....#.",
    "..#####..#.",
    "..#####.###",
    "..#####..#.",
    "..#####..#.",
    "..........."
  ],
  marker: [
    "...#####...",
    "..#######..",
    ".###...###.",
    ".##.....##.",
    ".###...###.",
    "..#######..",
    "...#####...",
    "....###....",
    "....###....",
    ".....#.....",
    "..........."
  ],
  measure: [
    "...........",
    "...........",
    "###########",
    "#.#.#.#.#.#",
    "#.#.#.#.#.#",
    "#.........#",
    "###########",
    "...........",
    "...........",
    "...........",
    "..........."
  ],
  nation: [
    "#..........",
    "#######....",
    "#######....",
    "#######....",
    "#######....",
    "#..........",
    "#..........",
    "#..........",
    "#..........",
    "#..........",
    "..........."
  ],
  route: [
    "........##.",
    ".......#...",
    "......#....",
    ".....#.....",
    "....#......",
    "...#.......",
    "...#.......",
    "....#......",
    ".....#.....",
    "......##...",
    "........###"
  ],
  star: [
    ".....#.....",
    ".....#.....",
    "....###....",
    "###########",
    ".#########.",
    "..#######..",
    "...#####...",
    "..###.###..",
    "..##...##..",
    ".#.......#.",
    "..........."
  ],
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
