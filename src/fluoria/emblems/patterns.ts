// Patterns shared by the studio and the generator: field templates and small motifs to stamp
import { frame, SIZE } from "./art";

const N = SIZE;
const MID = (N - 1) / 2;

export const MOTIFS: Record<string, string[]> = {
  Star: [
    "....#....",
    "....#....",
    "...###...",
    "..#####..",
    "#########",
    "..#####..",
    "...###...",
    "....#....",
    "....#...."
  ],
  Crown: ["#.#.#", "#.#.#", "#####", ".###.", ".###."],
  Cross: ["..#..", "..#..", "#####", "..#..", "..#.."],
  Chevron: ["....#....", "...#.#...", "..#...#..", ".#.....#.", "#.......#"],
  Sword: [...Array(5).fill(".#."), "###", ...Array(9).fill(".#."), ".#."],
  Tower: ["#.#.#", "#####", ".###.", ".#.#.", ".###.", ".###.", "#####"],
  Fleur: ["...#...", "..###..", "#..#..#", "#######", "..###..", "...#...", "..###.."],
  Tree: ["...#...", "..###..", ".#####.", "#######", "...#...", "...#...", "..###.."],
  Coin: [".###.", "#...#", "#.#.#", "#...#", ".###."],
  Peak: ["....#....", "...###...", "..##.##..", ".##...##.", "#########"]
};

export const TEMPLATES = [
  "Plain",
  "Split",
  "Halves",
  "Quarters",
  "Diagonal",
  "Saltire",
  "Cross",
  "Checks",
  "Bars",
  "Canton",
  "Border"
];

export function template(name: string, field: string, charge: string): string[] {
  const px: string[] = Array(N * N).fill(field);
  for (let y = 1; y < N - 1; y++)
    for (let x = 1; x < N - 1; x++) {
      const mark =
        (name === "Split" && x > MID) ||
        (name === "Halves" && y > MID) ||
        (name === "Quarters" && x > MID !== y > MID) ||
        (name === "Diagonal" && Math.abs(x + y - 2 * MID) < 3) ||
        (name === "Saltire" && (Math.abs(x - y) < 2 || Math.abs(x + y - 2 * MID) < 2)) ||
        (name === "Cross" && (Math.abs(x - MID) < 2 || Math.abs(y - MID) < 2)) ||
        (name === "Checks" && (Math.floor(((x - 1) / 31) * 5) + Math.floor(((y - 1) / 31) * 5)) % 2 === 0) ||
        (name === "Bars" && [6, 15, 24].some(v => y >= v && y < v + 4)) ||
        (name === "Canton" && x < 14 && y < 14) ||
        (name === "Border" && (x < 4 || y < 4 || x > N - 5 || y > N - 5));
      if (mark) px[y * N + x] = charge;
    }
  return frame(px);
}

/** Stamp a motif centred on a pixel */
export function stamp(px: string[], motif: string, cx: number, cy: number, colour: string, scale = 1): void {
  const rows = MOTIFS[motif];
  const left = cx - Math.floor((rows[0].length * scale) / 2);
  const top = cy - Math.floor((rows.length * scale) / 2);
  rows.forEach((row, dy) => {
    [...row].forEach((v, dx) => {
      if (v !== "#") return;
      for (let a = 0; a < scale; a++)
        for (let b = 0; b < scale; b++) {
          const x = left + dx * scale + a;
          const y = top + dy * scale + b;
          if (x > 0 && y > 0 && x < N - 1 && y < N - 1) px[y * N + x] = colour;
        }
    });
  });
}

const rgb = (hex: string) => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) =>
  `#${c
    .map(v =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
const light = (h: string) => {
  const [r, g, b] = rgb(h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
};

/** A new nation's emblem, built from its colour: a field, a second tone, sometimes a motif; the same seed, the same emblem */
export function randomEmblem(colour: string, seed: number): string[] {
  let s = (seed * 2654435761) >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const field = /^#[0-9a-f]{6}$/i.test(colour) ? colour.toLowerCase() : "#8a8a8a";
  // the second tone always stands apart from the field: darker on a light field, paler on a dark one
  const second = light(field)
    ? pick([hex(rgb(field).map(v => v * 0.4)), "#17191a"])
    : pick([hex(rgb(field).map(v => v + (255 - v) * 0.7)), "#eee5cd"]);
  const ink = light(field) ? "#17191a" : "#eee5cd";
  const layout = pick([
    "Plain",
    "Split",
    "Halves",
    "Quarters",
    "Diagonal",
    "Saltire",
    "Cross",
    "Bars",
    "Canton",
    "Border"
  ]);
  const px = template(layout, field, second);
  if (layout === "Canton") {
    // a small charge, large enough to read, in the canton
    stamp(px, pick(["Crown", "Cross", "Tower", "Coin"]), 7, 7, field, 2);
    return frame(px);
  }
  // a plain field always carries a charge, so no emblem is a bare colour
  if (layout === "Plain" || rand() < 0.7) {
    const motif = pick(["Star", "Crown", "Tower", "Tree", "Fleur", "Sword", "Coin", "Peak", "Cross"]);
    const scale = MOTIFS[motif][0].length <= 5 ? 3 : 2;
    stamp(px, motif, MID, MID, layout === "Plain" ? second : ink, scale);
  }
  return frame(px);
}
