// Emblem studio: a 33×33 pixel editor for a nation's emblem. The border is fixed; drawing happens on the inner 31×31
import { NATION_COLOURS } from "@/fluoria/palette";
import { escapeHtml } from "@/utils/stringUtils";
import { EMBLEM_NAMES, fluoriaEmblems, frame, SIZE } from "./art";
import { emblemOf, setEmblem } from "./store";

const N = SIZE;
const MID = (N - 1) / 2; // 16: mirrors turn about this pixel
const ZOOM = 12;
const FIELD = "#eee5cd";
const BASE = [
  "#17191a",
  FIELD,
  "#dcb745",
  "#a83346",
  "#14283e",
  "#244d7b",
  "#35583d",
  "#a6c1bc",
  "#d98fa7",
  "#5599b3",
  "#83583e",
  "#74828b"
];

type Tool = "brush" | "erase" | "fill" | "pick" | "line" | "stamp";
const TOOLS: [Tool, string][] = [
  ["brush", "Brush"],
  ["erase", "Eraser"],
  ["fill", "Fill"],
  ["pick", "Pick"],
  ["line", "Line"]
];

const MOTIFS: Record<string, string[]> = {
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

const TEMPLATES = [
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

function template(name: string, field: string, charge: string): string[] {
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

let root: HTMLElement | null = null;

/** Open the studio on a nation's emblem: its pixel art, its Fluoria emblem, or a plain field in its colour */
export async function openStudio(stateId: number): Promise<void> {
  closeStudio();
  const state = pack.states[stateId];
  if (!state) return;
  const own = await emblemOf(stateId)?.catch(() => null);
  const start =
    own ??
    fluoriaEmblems().get(state.name.toLowerCase()) ??
    template("Plain", state.color?.slice(0, 7) ?? FIELD, FIELD);
  root = build(stateId, start);
  document.body.append(root);
}

export function closeStudio(): void {
  root?.remove();
  root = null;
}

function build(stateId: number, start: string[]): HTMLElement {
  const state = pack.states[stateId];
  let px = frame(start.slice());
  let palette = [...BASE, ...NATION_COLOURS.filter(c => !BASE.includes(c))];
  let paint = BASE[0];
  let tool: Tool = "brush";
  let size = 1;
  let mirror: "off" | "lr" | "four" = "off";
  let motif = "Star";
  let grid = false;
  const undo: string[][] = [];
  const redo: string[][] = [];
  let stroke: { before: string[]; from: [number, number]; last: [number, number] } | null = null;
  let hover: [number, number] | null = null;

  const el = document.createElement("section");
  el.id = "flStudio";
  el.innerHTML = /* html */ `
    <header><span>Emblem · ${escapeHtml(state.name)}</span><button data-act="close" aria-label="Close">✕</button></header>
    <div class="fs-main">
      <div>
        <div class="fs-board"><canvas width="${N * ZOOM}" height="${N * ZOOM}"></canvas></div>
        <label class="fs-check"><input type="checkbox" data-act="grid" /> Pixel grid</label>
      </div>
      <div class="fs-side">
        <div><b>Tools</b><div class="fs-row">${TOOLS.map(([id, name]) => `<button data-tool="${id}">${name}</button>`).join("")}</div></div>
        <div><b>Brush</b><div class="fs-row">${[1, 3, 5].map(n => `<button data-size="${n}">${n}</button>`).join("")}</div></div>
        <div><b>Mirror</b><div class="fs-row"><button data-mirror="off">Off</button><button data-mirror="lr">Left–right</button><button data-mirror="four">Four-way</button></div></div>
        <div><b>Colour</b><div class="fs-palette"></div>
          <div class="fs-row"><input type="color" data-act="picker" value="#ffffff" /><button data-act="addColour">Add colour</button></div></div>
        <div class="fs-row"><button data-act="undo">Undo</button><button data-act="redo">Redo</button><button data-act="clear">Clear</button></div>
        <div class="fs-previews"><canvas width="${N}" height="${N}"></canvas><canvas width="${N * 2}" height="${N * 2}"></canvas><canvas width="${N * 3}" height="${N * 3}"></canvas></div>
      </div>
    </div>
    <div class="fs-strip"><b>Stamps</b><div class="fs-row fs-stamps">${Object.keys(MOTIFS)
      .map(m => `<button data-motif="${m}">${m}</button>`)
      .join("")}</div></div>
    <div class="fs-strip"><b>Templates</b><div class="fs-list" data-list="templates"></div></div>
    <div class="fs-strip"><b>Library</b><div class="fs-list" data-list="library"></div></div>
    <footer><span class="fs-status">Ready</span><button data-act="close">Cancel</button><button data-act="save" class="fs-save">Save to nation</button></footer>`;

  const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
  const qa = (s: string) => [...el.querySelectorAll<HTMLElement>(s)];
  const board = q<HTMLCanvasElement>(".fs-board canvas");
  const status = q<HTMLElement>(".fs-status");

  const inside = (x: number, y: number) => x > 0 && y > 0 && x < N - 1 && y < N - 1;
  const mirrored = (x: number, y: number): [number, number][] => {
    const pts: [number, number][] = [[x, y]];
    if (mirror !== "off") pts.push([2 * MID - x, y]);
    if (mirror === "four") pts.push([x, 2 * MID - y], [2 * MID - x, 2 * MID - y]);
    return pts;
  };
  const set = (data: string[], x: number, y: number, c: string) => {
    for (const [mx, my] of mirrored(x, y)) if (inside(mx, my)) data[my * N + mx] = c;
  };
  const dab = (data: string[], x: number, y: number, c: string) => {
    const off = (size - 1) / 2;
    for (let dy = -off; dy <= off; dy++) for (let dx = -off; dx <= off; dx++) set(data, x + dx, y + dy, c);
  };
  const line = (data: string[], [x0, y0]: [number, number], [x1, y1]: [number, number], c: string) => {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      dab(data, x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  };
  const flood = (x: number, y: number, c: string) => {
    for (const [fx, fy] of mirrored(x, y)) {
      if (!inside(fx, fy)) continue;
      const old = px[fy * N + fx];
      if (old === c) continue;
      const todo: [number, number][] = [[fx, fy]];
      while (todo.length) {
        const [a, b] = todo.pop()!;
        if (!inside(a, b) || px[b * N + a] !== old) continue;
        px[b * N + a] = c;
        todo.push([a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]);
      }
    }
  };
  const stamp = (data: string[], x: number, y: number) => {
    const rows = MOTIFS[motif];
    const left = x - Math.floor(rows[0].length / 2);
    const top = y - Math.floor(rows.length / 2);
    rows.forEach((row, dy) => {
      [...row].forEach((v, dx) => {
        if (v === "#") set(data, left + dx, top + dy, paint);
      });
    });
  };

  const raster = (canvas: HTMLCanvasElement, data: string[]) => {
    const ctx = canvas.getContext("2d")!;
    const s = canvas.width / N;
    data.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect((i % N) * s, Math.floor(i / N) * s, s, s);
    });
  };
  const render = () => {
    let shown = px;
    if (stroke && tool === "line") {
      shown = stroke.before.slice();
      line(shown, stroke.from, stroke.last, paint);
    } else if (tool === "stamp" && hover) {
      shown = px.slice();
      stamp(shown, ...hover);
    }
    raster(board, shown);
    const ctx = board.getContext("2d")!;
    if (grid) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let i = 1; i < N; i++) {
        ctx.fillRect(i * ZOOM, 0, 1, N * ZOOM);
        ctx.fillRect(0, i * ZOOM, N * ZOOM, 1);
      }
    }
    if (mirror !== "off") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(MID * ZOOM + ZOOM / 2, 0, 1, N * ZOOM);
      if (mirror === "four") ctx.fillRect(0, MID * ZOOM + ZOOM / 2, N * ZOOM, 1);
    }
    for (const canvas of qa(".fs-previews canvas") as HTMLCanvasElement[]) raster(canvas, px);
    for (const b of qa("[data-tool]")) b.classList.toggle("on", b.dataset.tool === tool);
    for (const b of qa("[data-motif]")) b.classList.toggle("on", tool === "stamp" && b.dataset.motif === motif);
    for (const b of qa("[data-size]")) b.classList.toggle("on", Number(b.dataset.size) === size);
    for (const b of qa("[data-mirror]")) b.classList.toggle("on", b.dataset.mirror === mirror);
    for (const b of qa("[data-colour]")) b.classList.toggle("on", b.dataset.colour === paint);
    q<HTMLButtonElement>('[data-act="undo"]').disabled = !undo.length;
    q<HTMLButtonElement>('[data-act="redo"]').disabled = !redo.length;
  };
  const commit = (before: string[]) => {
    if (before.join() === px.join()) return;
    undo.push(before);
    if (undo.length > 50) undo.shift();
    redo.length = 0;
    status.textContent = "Unsaved changes";
  };
  const replace = (next: string[], label: string) => {
    const before = px.slice();
    px = frame(next.slice());
    commit(before);
    status.textContent = label;
    render();
  };
  const drawPalette = () => {
    q(".fs-palette").innerHTML = palette
      .map(c => `<button data-colour="${c}" style="--paint:${c}" aria-label="${c}"></button>`)
      .join("");
  };
  const thumbs = (list: string, items: [string, string[]][]) => {
    const box = q(`[data-list="${list}"]`);
    box.replaceChildren();
    for (const [name, data] of items) {
      const button = document.createElement("button");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = N;
      raster(canvas, data);
      button.append(canvas, Object.assign(document.createElement("span"), { textContent: name }));
      button.addEventListener("click", () => replace(data, name));
      box.append(button);
    }
  };

  const point = (e: PointerEvent): [number, number] => {
    const r = board.getBoundingClientRect();
    return [Math.floor(((e.clientX - r.left) / r.width) * N), Math.floor(((e.clientY - r.top) / r.height) * N)];
  };
  board.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const p = point(e);
    if (!inside(...p)) return;
    if (tool === "pick") {
      paint = px[p[1] * N + p[0]];
      if (!palette.includes(paint)) palette = [...palette, paint];
      drawPalette();
      tool = "brush";
      return render();
    }
    const before = px.slice();
    if (tool === "fill") flood(...p, paint);
    else if (tool === "stamp") stamp(px, ...p);
    else {
      board.setPointerCapture(e.pointerId);
      stroke = { before, from: p, last: p };
      if (tool !== "line") dab(px, ...p, tool === "erase" ? FIELD : paint);
      return render();
    }
    commit(before);
    render();
  });
  board.addEventListener("pointermove", e => {
    const p = point(e);
    hover = inside(...p) ? p : null;
    if (stroke) {
      const clipped: [number, number] = [Math.max(1, Math.min(N - 2, p[0])), Math.max(1, Math.min(N - 2, p[1]))];
      if (tool !== "line") line(px, stroke.last, clipped, tool === "erase" ? FIELD : paint);
      stroke.last = clipped;
    }
    render();
  });
  const finish = () => {
    if (!stroke) return;
    if (tool === "line") line(px, stroke.from, stroke.last, paint);
    commit(stroke.before);
    stroke = null;
    render();
  };
  board.addEventListener("pointerup", finish);
  board.addEventListener("lostpointercapture", finish);
  board.addEventListener("pointerleave", () => {
    hover = null;
    render();
  });

  const step = (from: string[][], to: string[][], label: string) => {
    const next = from.pop();
    if (!next) return;
    to.push(px);
    px = next;
    status.textContent = label;
    render();
  };
  el.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("button, input");
    if (!b) return;
    if (b.dataset.tool) tool = b.dataset.tool as Tool;
    if (b.dataset.motif) {
      tool = "stamp";
      motif = b.dataset.motif;
    }
    if (b.dataset.size) size = Number(b.dataset.size);
    if (b.dataset.mirror) mirror = b.dataset.mirror as typeof mirror;
    if (b.dataset.colour) {
      paint = b.dataset.colour;
      if (tool === "erase" || tool === "pick") tool = "brush";
    }
    switch (b.dataset.act) {
      case "close":
        return closeStudio();
      case "save":
        setEmblem(stateId, px);
        status.textContent = "Saved to the nation";
        document.dispatchEvent(new CustomEvent("fl:emblem", { detail: stateId }));
        return closeStudio();
      case "undo":
        return step(undo, redo, "Undone");
      case "redo":
        return step(redo, undo, "Redone");
      case "clear":
        return replace(template("Plain", FIELD, FIELD), "Cleared");
      case "grid":
        grid = (b as HTMLInputElement).checked;
        break;
      case "addColour": {
        const c = q<HTMLInputElement>('[data-act="picker"]').value.toLowerCase();
        if (!palette.includes(c)) palette = [...palette, c];
        paint = c;
        drawPalette();
        break;
      }
    }
    render();
  });
  el.addEventListener("keydown", e => {
    if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) step(redo, undo, "Redone");
      else step(undo, redo, "Undone");
    }
  });

  drawPalette();
  const field = state.color?.slice(0, 7) ?? BASE[5];
  thumbs(
    "templates",
    TEMPLATES.map(name => [name, template(name, field, name === "Plain" ? field : FIELD)])
  );
  thumbs(
    "library",
    EMBLEM_NAMES.map(name => [name, fluoriaEmblems().get(name.toLowerCase())!])
  );
  render();
  return el;
}
