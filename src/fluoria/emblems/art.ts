// The 28 Fluoria nation emblems, drawn on their original 32-pixel grid and widened to 33 by repeating the last inner line
export const SIZE = 33;

const C = {
  ink: "#17191a",
  white: "#eee5cd",
  gold: "#dcb745",
  blue: "#244d7b",
  navy: "#14283e",
  green: "#35583d",
  pale: "#a6c1bc",
  red: "#a83346",
  pink: "#d98fa7",
  sky: "#5599b3"
};
type Tone = keyof typeof C;

const NATIONS: [string, Tone, string][] = [
  ["Astia", "ink", "star-border"],
  ["Sax", "green", "diagonal"],
  ["Avenna", "navy", "half-star"],
  ["Rovia", "blue", "waves-star"],
  ["Thaselore", "navy", "crowns"],
  ["Selveleth", "gold", "waves"],
  ["Kanania", "green", "chevrons"],
  ["Sud Swamy", "pale", "bars-star"],
  ["Cormera", "ink", "sword"],
  ["Aracia", "pink", "fleur"],
  ["Regus", "gold", "saltire"],
  ["Holverland", "ink", "cross-star"],
  ["Tuath", "navy", "star-base"],
  ["Whitecoast", "white", "checks"],
  ["Nord Swamy", "navy", "quarter"],
  ["Cargsnare", "pale", "peak"],
  ["Glenbrit", "navy", "triskelion"],
  ["Lindale", "green", "saltire-thin"],
  ["Reapers", "navy", "long-star"],
  ["Akis", "white", "sun-bars"],
  ["Enoren", "green", "tree"],
  ["Talind", "red", "archer"],
  ["Sanctis", "ink", "stars"],
  ["Portsbridge", "gold", "port"],
  ["Great Keys", "white", "gate"],
  ["Havenport", "pale", "tower"],
  ["Goldbank", "gold", "coin"],
  ["Razi", "gold", "quarters"]
];

const STAR = [
  "....#....",
  "....#....",
  "...###...",
  "..#####..",
  "#########",
  "..#####..",
  "...###...",
  "....#....",
  "....#...."
];
const CROWN = ["#..#..#", "#..#..#", "#######", ".#####.", ".#####."];

function draw(background: Tone, type: string): string[] {
  const px: string[] = Array(32 * 32).fill(C[background]);
  const put = (x: number, y: number, c: string) => {
    if (x > 0 && x < 31 && y > 0 && y < 31) px[y * 32 + x] = c;
  };
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  };
  const line = (x: number, y: number, ex: number, ey: number, c: string, w = 1) => {
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      rect(x, y, w, w, c);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  };
  const stamp = (rows: string[], x: number, y: number, c: string, s = 1) =>
    rows.forEach((row, dy) => {
      [...row].forEach((v, dx) => {
        if (v === "#") rect(x + dx * s, y + dy * s, s, s, c);
      });
    });
  const star = (x = 11, y = 11, c = C.white) => stamp(STAR, x, y, c);
  const waves = (c: string, start = 8) => {
    for (let y = start; y < 31; y += 7)
      for (let x = 1; x < 31; x++) {
        const o = [0, 0, 1, 2, 2, 2, 1, 0][x % 8];
        put(x, y + o, c);
        put(x, y + o + 1, c);
      }
  };
  const each = (fn: (x: number, y: number) => void) => {
    for (let y = 1; y < 31; y++) for (let x = 1; x < 31; x++) fn(x, y);
  };

  switch (type) {
    case "star-border":
      for (let x = 3; x < 30; x += 3) {
        put(x, 3, C.white);
        put(x, 28, C.white);
      }
      for (let y = 6; y < 28; y += 3) {
        put(3, y, C.white);
        put(28, y, C.white);
      }
      star();
      break;
    case "diagonal":
      each((x, y) => Math.abs(x + y - 31) < 3 && put(x, y, C.white));
      star(4, 4);
      break;
    case "half-star":
      rect(16, 1, 15, 30, C.blue);
      rect(1, 1, 15, 30, C.ink);
      star();
      break;
    case "waves-star":
      rect(1, 1, 30, 12, C.navy);
      waves(C.pale, 16);
      star(4, 3);
      break;
    case "crowns":
      stamp(CROWN, 5, 6, C.gold);
      stamp(CROWN, 20, 6, C.gold);
      stamp(CROWN, 12, 20, C.gold);
      break;
    case "waves":
      waves(C.blue, 5);
      break;
    case "chevrons":
      for (const y of [7, 15, 23]) {
        line(1, y + 7, 15, y, C.white, 2);
        line(16, y, 30, y + 7, C.white, 2);
      }
      break;
    case "bars-star":
      rect(1, 10, 30, 6, C.green);
      rect(1, 22, 30, 6, C.green);
      rect(1, 1, 13, 12, C.ink);
      stamp(STAR, 3, 2, C.white);
      break;
    case "sword":
      stamp([...Array(6).fill("..##.."), "######", ...Array(14).fill("..##.."), "...#.."], 13, 5, C.white);
      break;
    case "fleur":
      stamp(
        [
          ".....##.....",
          "....####....",
          ".....##.....",
          ".##..##..##.",
          "####.##.####",
          ".##########.",
          "...######...",
          ".....##.....",
          "...######...",
          ".....##.....",
          "....####...."
        ],
        10,
        5,
        C.ink
      );
      rect(15, 16, 2, 8, C.ink);
      line(15, 23, 10, 26, C.ink);
      line(16, 23, 21, 26, C.ink);
      break;
    case "saltire":
      rect(1, 1, 30, 30, C.blue);
      each((x, y) => (Math.abs(x - y) < 2 || Math.abs(x + y - 31) < 2) && put(x, y, C.gold));
      rect(14, 1, 4, 30, C.ink);
      rect(1, 14, 30, 4, C.ink);
      break;
    case "cross-star":
      rect(12, 1, 3, 30, C.white);
      rect(1, 12, 30, 3, C.white);
      stamp(STAR, 8, 8, C.white);
      break;
    case "star-base":
      star();
      rect(1, 26, 30, 2, C.white);
      break;
    case "checks":
      each((x, y) => (Math.floor((x - 1) / 6) + Math.floor((y - 1) / 6)) % 2 === 0 && put(x, y, C.blue));
      break;
    case "quarter":
      rect(1, 1, 30, 10, C.gold);
      rect(1, 11, 30, 10, C.navy);
      rect(1, 21, 30, 10, C.green);
      rect(1, 1, 12, 12, C.ink);
      stamp(STAR, 3, 3, C.white);
      break;
    case "peak":
      each((x, y) => {
        const edge = 15 + Math.abs(x - 15.5);
        if (y >= edge - 2) put(x, y, C.white);
        if (y >= edge + 1) put(x, y, "#4e2627");
      });
      break;
    case "triskelion":
      rect(1, 1, 6, 30, C.green);
      stamp(
        [
          "..###....",
          ".#...#...",
          ".#..##...",
          "..###....",
          "....#....",
          "...###...",
          ".##.#.##.",
          "#...#...#",
          "#..##...#",
          ".##...##."
        ],
        12,
        10,
        C.gold
      );
      break;
    case "saltire-thin":
      line(1, 1, 30, 30, C.white, 3);
      line(29, 1, 1, 29, C.white, 3);
      line(1, 1, 30, 30, C.red);
      line(30, 1, 1, 30, C.red);
      break;
    case "long-star":
      rect(1, 1, 5, 30, "#33468d");
      rect(26, 1, 5, 30, "#33468d");
      star(11, 3);
      line(15, 9, 15, 27, C.white);
      line(16, 9, 16, 26, C.white);
      line(10, 8, 21, 20, C.white);
      line(21, 8, 10, 20, C.white);
      break;
    case "sun-bars":
      rect(1, 1, 30, 7, C.blue);
      rect(1, 24, 30, 7, C.blue);
      stamp(
        [
          "....#....",
          ".#..#..#.",
          "..#####..",
          "..#####..",
          "#########",
          "..#####..",
          "..#####..",
          ".#..#..#.",
          "....#...."
        ],
        11,
        11,
        C.red
      );
      break;
    case "tree":
      rect(15, 10, 2, 16, C.pale);
      rect(11, 26, 10, 2, C.pale);
      for (const y of [6, 11, 16, 21]) {
        line(15, y, 8, y + 5, C.pale);
        line(16, y, 23, y + 5, C.pale);
        line(15, y, 12, y - 3, C.pale);
        line(16, y, 19, y - 3, C.pale);
      }
      rect(14, 4, 4, 4, C.pale);
      break;
    case "archer":
      stamp(
        [
          "...###.......",
          "...###.......",
          "....#........",
          "...###...##..",
          "..#####.#..#.",
          ".##.#.##....#",
          "....#.......#",
          "....#.......#",
          "...###......#",
          "...###......#",
          "...#.#.....#.",
          "..##.##...#..",
          "..#...#..#...",
          ".##...##....."
        ],
        8,
        7,
        C.white
      );
      line(20, 7, 20, 24, C.white);
      line(13, 13, 26, 13, C.white);
      break;
    case "stars":
      for (const [x, y] of [
        [6, 5],
        [21, 5],
        [13, 13],
        [6, 22],
        [21, 22]
      ])
        stamp(["..#..", "..#..", "#####", "..#..", "..#.."], x, y, C.white);
      break;
    case "port":
      for (let y = 2; y < 31; y += 7) rect(1, y, 30, 3, C.navy);
      rect(1, 1, 13, 18, C.white);
      stamp(["#.#.#", "#.#.#", "#####", "#####", "##.##", "##.##"], 3, 10, C.ink, 2);
      break;
    case "gate":
      rect(1, 24, 30, 7, C.green);
      rect(3, 6, 26, 3, C.ink);
      rect(3, 11, 26, 2, C.ink);
      for (let x = 4; x < 30; x += 5) {
        rect(x, 8, 2, 15, C.ink);
        rect(x + 1, 8, 1, 13, C.white);
      }
      for (let x = 3; x < 30; x += 4) rect(x, 3, 2, 3, C.ink);
      break;
    case "tower":
      rect(1, 27, 30, 4, C.blue);
      rect(6, 6, 5, 21, C.red);
      rect(21, 6, 5, 21, C.red);
      rect(6, 5, 20, 4, C.red);
      rect(6, 20, 20, 4, C.red);
      rect(4, 4, 3, 4, C.red);
      rect(25, 4, 3, 4, C.red);
      rect(11, 10, 10, 9, C.white);
      break;
    case "coin":
      each((x, y) => {
        const d = (x - 15.5) ** 2 + (y - 15.5) ** 2;
        if (d > 169) put(x, y, C.white);
        else if (d > 144 || (d < 112 && d > 90)) put(x, y, "#8b722e");
      });
      stamp(CROWN, 12, 7, C.ink);
      stamp(["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"], 11, 15, C.ink, 2);
      break;
    case "quarters":
      each((x, y) => {
        const dx = x - 15.5;
        const dy = y - 15.5;
        put(x, y, Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "#17191a" : "#163abb") : dy < 0 ? "#f0e52c" : "#cb2b37");
      });
      break;
  }
  return widen(px);
}

/** 32×32 to 33×33 without distorting the art: the last inner column and row are repeated */
function widen(px: string[]): string[] {
  const from = (v: number) => (v <= 30 ? v : v - 1);
  const out: string[] = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) out.push(px[from(y) * 32 + from(x)]);
  return frame(out);
}

/** The fixed black border */
export function frame(px: string[]): string[] {
  for (let n = 0; n < SIZE; n++) {
    px[n] = "#000000";
    px[(SIZE - 1) * SIZE + n] = "#000000";
    px[n * SIZE] = "#000000";
    px[n * SIZE + SIZE - 1] = "#000000";
  }
  return px;
}

let made: Map<string, string[]> | null = null;
/** Each Fluoria nation's emblem by lower-case name */
export function fluoriaEmblems(): Map<string, string[]> {
  made ??= new Map(NATIONS.map(([name, tone, type]) => [name.toLowerCase(), draw(tone, type)]));
  return made;
}

export const EMBLEM_NAMES = NATIONS.map(([name]) => name);
