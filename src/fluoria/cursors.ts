// Pixel cursors: a chunky arrow, an open hand over units, a black hand carrying them, and while carrying, the drop's
// own sign instead: →← merge, ↓ put in (a garrison or a hold), ✕ refused. Drawn once, at twice the resolution for
// sharp screens; the browser's own cursor stands in if an image fails
const ARROW = ["k.......", "kk......", "kwk.....", "kwwk....", "kwwwk...", "kwwwwk..", "kwwkkkk.", "kk......"];
const OPEN = [
  ".....kk.kk....",
  "....kwwkwwkk..",
  "....kwwkwwkwk.",
  "....kwwkwwkwwk",
  ".kk.kwwkwwkwwk",
  "kwwkkwwkwwkwwk",
  "kwwwkwwwwwwwwk",
  "kwwwwwwwwwwwwk",
  ".kwwwwwwwwwwwk",
  ".kwwwwwwwwwwk.",
  "..kwwwwwwwwwk.",
  "...kwwwwwwwk..",
  "...kwwwwwwwk..",
  "...kkkkkkkkk.."
];
const SHUT = [
  "....kk.kk.kk..",
  "...kwwkwwkwwkk",
  ".kkkwwkwwkwwwk",
  "kwwkwwwwwwwwwk",
  "kwwwwwwwwwwwwk",
  ".kwwwwwwwwwwwk",
  ".kwwwwwwwwwwk.",
  "..kwwwwwwwwwk.",
  "...kwwwwwwwk..",
  "...kwwwwwwwk..",
  "...kkkkkkkkk.."
];
const HEAD = [".....g....", ".....gg...", "gggggggg..", "ggggggggg.", "gggggggg..", ".....gg...", ".....g...."];
const MERGE = HEAD.map(r => `${r}..${[...r].reverse().join("")}`);
const IN = [
  "...ggg...",
  "...ggg...",
  "...ggg...",
  "...ggg...",
  "ggggggggg",
  ".ggggggg.",
  "..ggggg..",
  "...ggg...",
  "....g...."
];
const NO = Array.from({ length: 10 }, (_, j) =>
  Array.from({ length: 10 }, (_, i) => (Math.abs(i - j) <= 1 || Math.abs(i + j - 9) <= 1 ? "r" : ".")).join("")
);

type Cursor = "arrow" | "grab" | "carry" | "merge" | "in" | "no";
const COLOURS: Record<string, string> = { k: "#111111", w: "#f4efe2", g: "#6fd36a", r: "#e0533f" };
const SIZE = 28;

/** Draw pixel rows on a SIZE canvas; `outline` rings them in black; `px` art pixels per cursor pixel */
function draw(rows: string[], scale: number, outline: boolean, px: number, swap = false): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE * scale;
  const ctx = canvas.getContext("2d")!;
  const h = rows.length;
  const w = rows[0].length;
  const centred = outline;
  const ox = centred ? Math.floor((SIZE / px - w) / 2) : 1;
  const oy = centred ? Math.floor((SIZE / px - h) / 2) : 1;
  const on = (i: number, j: number) => rows[j]?.[i] !== undefined && rows[j][i] !== ".";
  const dot = (i: number, j: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.fillRect((ox + i) * px * scale, (oy + j) * px * scale, px * scale, px * scale);
  };
  if (outline)
    for (let j = -1; j <= h; j++)
      for (let i = -1; i <= w; i++) {
        if (on(i, j)) continue;
        let edge = false;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (on(i + a, j + b)) edge = true;
        if (edge) dot(i, j, COLOURS.k);
      }
  for (const [j, row] of rows.entries())
    for (const [i, ch] of [...row].entries()) {
      if (ch === ".") continue;
      const key = swap ? (ch === "k" ? "w" : ch === "w" ? "k" : ch) : ch;
      dot(i, j, COLOURS[key]);
    }
  return canvas.toDataURL();
}

const SET: Record<
  Cursor,
  { rows: string[]; outline?: boolean; px?: number; swap?: boolean; hot: string; native: string }
> = {
  arrow: { rows: ARROW, px: 2, hot: "2 2", native: "default" },
  grab: { rows: OPEN, hot: "7 6", native: "grab" },
  carry: { rows: SHUT, swap: true, hot: "7 5", native: "grabbing" },
  merge: { rows: MERGE, outline: true, hot: "14 14", native: "copy" },
  in: { rows: IN, outline: true, hot: "14 18", native: "copy" },
  no: { rows: NO, outline: true, hot: "14 14", native: "not-allowed" }
};

let installed = false;

/** Put the cursors in a stylesheet as custom properties: --fl-cursor-grab and so on */
export function installCursors(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const rules = Object.entries(SET).map(([name, c]) => {
    const one = draw(c.rows, 1, Boolean(c.outline), c.px ?? 1, c.swap);
    const two = draw(c.rows, 2, Boolean(c.outline), c.px ?? 1, c.swap);
    return `--fl-cursor-${name}: url(${one}) ${c.hot}, ${c.native}; --fl-cursor-${name}-2x: -webkit-image-set(url(${one}) 1x, url(${two}) 2x) ${c.hot}, ${c.native};`;
  });
  const style = document.createElement("style");
  style.id = "flCursors";
  style.textContent = `:root { ${rules.join(" ")} }`;
  document.head.append(style);
}

/** Show a drop's cursor everywhere while carrying, or none */
export function carryCursor(kind: Cursor | null): void {
  const body = document.body;
  for (const name of Object.keys(SET)) body.classList.remove(`fl-cursor-${name}`);
  body.classList.toggle("fl-carrying", Boolean(kind));
  if (kind) body.classList.add(`fl-cursor-${kind}`);
}

export type { Cursor };
