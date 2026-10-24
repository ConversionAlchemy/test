// Who owns what, made clear: the owner's name on hover, short names on a state's outlying islands, and a colour fix
// for neighbours that look alike. Ownership itself stays Azgaar's: states, cells and diplomacy are only read
import { color, hsl } from "d3";
import { viewport } from "@/components/viewport";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";

const living = (id: number) => (id && pack.states[id] && !pack.states[id].removed ? pack.states[id] : null);

/** The owner of a cell for the hover line, with whom it answers to */
export function ownerText(cell: number): string {
  const id = pack.cells.state[cell];
  const state = living(id);
  if (!state) return "";
  const name = state.fullName || state.name;
  const suzerain = state.diplomacy?.indexOf("Vassal") ?? -1;
  const over = suzerain > 0 ? living(suzerain) : null;
  return over ? t("{{state}}, vassal of {{suzerain}}", { state: name, suzerain: over.fullName || over.name }) : name;
}

// --- island names: a state's land on other islands carries its short name, so a lone island is never unclaimed

interface IslandLabel {
  x: number;
  y: number;
  text: string;
}

let islands: IslandLabel[] = [];

/** Find every piece of a state's land that is off the island it mostly lives on */
export function collectIslands(): void {
  const { cells } = pack;
  const byState = new Map<number, Map<number, number[]>>();
  for (let c = 0; c < cells.i.length; c++) {
    const s = cells.state[c];
    if (!living(s) || cells.h[c] < 20) continue;
    const features = byState.get(s) ?? new Map<number, number[]>();
    const list = features.get(cells.f[c]) ?? [];
    list.push(c);
    features.set(cells.f[c], list);
    byState.set(s, features);
  }
  islands = [];
  for (const [s, features] of byState) {
    if (features.size < 2) continue;
    const main = [...features.entries()].sort((a, b) => b[1].length - a[1].length)[0][0];
    for (const [feature, list] of features) {
      if (feature === main) continue;
      let sx = 0;
      let sy = 0;
      for (const c of list) {
        sx += cells.p[c][0];
        sy += cells.p[c][1];
      }
      const cx = sx / list.length;
      const cy = sy / list.length;
      let best = list[0];
      let bestD = Infinity;
      for (const c of list) {
        const d = (cells.p[c][0] - cx) ** 2 + (cells.p[c][1] - cy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      islands.push({ x: cells.p[best][0], y: cells.p[best][1], text: pack.states[s].name });
    }
  }
  drawIslands();
}

const ISLANDS_FROM = 3; // zoom at which outlying islands are named
const ISLAND_PX = 12;

/** Island names as plain svg text over the map, a fixed size on screen */
export function drawIslands(): void {
  const viewbox = document.getElementById("viewbox");
  if (!viewbox) return;
  let group = document.getElementById("flIslands") as SVGGElement | null;
  if (!group) {
    const created = document.createElementNS("http://www.w3.org/2000/svg", "g");
    created.id = "flIslands";
    created.setAttribute("pointer-events", "none");
    viewbox.append(created);
    group = created;
  }
  const scale = viewport.scale || 1;
  group.style.display = scale >= ISLANDS_FROM ? "" : "none";
  group.setAttribute("font-size", String(ISLAND_PX / scale));
  if (group.childElementCount !== islands.length || group.dataset.for !== String(pack.cells.i.length)) {
    group.dataset.for = String(pack.cells.i.length);
    group.innerHTML = islands
      .map(({ x, y, text }) => `<text x="${x}" y="${y}" text-anchor="middle" dy="0.35em">${escapeHtml(text)}</text>`)
      .join("");
  }
}

// --- colour fix: states that touch, across a strait too, and look alike are moved apart in hue

const NEAR = () => grid.spacing * 3; // map pixels: closer than this across water still counts as neighbours
const ALIKE = 70; // colour distance (rgb) under which two neighbours are hard to tell apart

function neighbours(): Map<number, Set<number>> {
  const { cells } = pack;
  const out = new Map<number, Set<number>>();
  const link = (a: number, b: number) => {
    if (a === b || !living(a) || !living(b)) return;
    (out.get(a) ?? out.set(a, new Set()).get(a))?.add(b);
    (out.get(b) ?? out.set(b, new Set()).get(b))?.add(a);
  };
  const coast: number[] = [];
  for (let c = 0; c < cells.i.length; c++) {
    if (cells.h[c] < 20) continue;
    for (const n of cells.c[c]) if (cells.h[n] >= 20) link(cells.state[c], cells.state[n]);
    if (cells.t[c] === 1) coast.push(c);
  }
  const near = NEAR() ** 2;
  for (let i = 0; i < coast.length; i++)
    for (let j = i + 1; j < coast.length; j++) {
      const a = coast[i];
      const b = coast[j];
      if (cells.state[a] === cells.state[b]) continue;
      const dx = cells.p[a][0] - cells.p[b][0];
      const dy = cells.p[a][1] - cells.p[b][1];
      if (dx * dx + dy * dy < near) link(cells.state[a], cells.state[b]);
    }
  return out;
}

const distance = (a: string, b: string) => {
  const x = color(a)?.rgb();
  const y = color(b)?.rgb();
  return x && y ? Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b) : Infinity;
};

/** Recolour the smaller of any two neighbours that look alike; returns how many states changed */
export function fixColours(): number {
  const links = neighbours();
  let changed = 0;
  const area = (id: number) => pack.states[id].area ?? 0;
  for (const [a, others] of links)
    for (const b of others) {
      const sa = pack.states[a];
      const sb = pack.states[b];
      if (!sa.color || !sb.color || distance(sa.color, sb.color) >= ALIKE) continue;
      const small = area(a) <= area(b) ? a : b;
      const target = pack.states[small];
      const base = hsl(target.color as string);
      const taken = [...(links.get(small) ?? [])].map(id => pack.states[id].color as string);
      for (let turn = 1; turn < 12; turn++) {
        const next = hsl(((base.h || 0) + turn * 47) % 360, Math.max(0.35, base.s || 0.5), base.l || 0.5).formatHex();
        if (taken.every(other => distance(next, other) >= ALIKE)) {
          States.recolor(small, next);
          changed++;
          break;
        }
      }
    }
  return changed;
}
