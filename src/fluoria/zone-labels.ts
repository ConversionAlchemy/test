// Named places on the map: forests, mountain ranges, lakes and islands. Forests and ranges are kept as hidden Azgaar
// zones (so they save with the map); lakes and islands are Azgaar features. Hovering a name lights its ground,
// double-clicking it edits the name in place
import { viewport } from "@/components/viewport";
import { getIsolines } from "@/utils/pathUtils";
import { escapeHtml } from "@/utils/stringUtils";
import { isForestBiome } from "./woods";

const NS = "http://www.w3.org/2000/svg";
const KINDS = { Forest: "Forest", Mountains: "Mountains" } as const;

interface Named {
  key: string; // z:<zone id> or f:<feature id>
  text: string;
  x: number;
  y: number;
  cells: number[];
  shape?: string; // the outline along the cell edges
}

/** A group of cells as one shape: its outer rings along the cell edges */
function shapeOf(n: Named): string {
  if (n.shape !== undefined) return n.shape;
  const inside = new Uint8Array(pack.cells.i.length);
  for (const c of n.cells) inside[c] = 1;
  const rings = getIsolines(pack, c => inside[c] || null, { polygons: true })[1]?.polygons ?? [];
  n.shape = rings.map(ring => `M${ring.map(p => p.join(",")).join("L")}Z`).join("");
  return n.shape;
}

// by size: the biggest named from the region view, the smallest only close in, in a smaller hand
const TIERS = [
  { px: 13, from: 1.4 },
  { px: 11, from: 2 },
  { px: 10, from: 2.6 }
];
const tierOf = (n: Named) => (n.cells.length >= 6 ? 0 : n.cells.length >= 3 ? 1 : 2);

let named: Named[] = [];

/** Connected clusters of cells passing `test`, biggest first */
function clusters(test: (i: number) => boolean, min: number): number[][] {
  const { cells } = pack;
  const seen = new Uint8Array(cells.i.length);
  const out: number[][] = [];
  for (let i = 0; i < cells.i.length; i++) {
    if (seen[i] || !test(i)) continue;
    const group = [i];
    seen[i] = 1;
    for (let q = 0; q < group.length; q++)
      for (const j of cells.c[group[q]]) if (!seen[j] && test(j)) (seen[j] = 1), group.push(j);
    if (group.length >= min) out.push(group);
  }
  return out.sort((a, b) => b.length - a.length);
}

/** Name every forest and every mountain not yet named: a forest, wood or copse, a range or a peak, by its size */
export function nameZones(): void {
  if (!pack?.cells?.i) return;
  pack.zones ??= [];
  const { cells } = pack;
  const taken = new Uint8Array(cells.i.length);
  for (const z of pack.zones)
    if (z.type === KINDS.Forest || z.type === KINDS.Mountains) for (const c of z.cells) taken[c] = 1;
  const add = (type: string, group: number[], name: string) =>
    pack.zones.push({ i: pack.zones.length, name, type, cells: group, color: "#000000", hidden: true });
  const culture = (group: number[]) => cells.culture[group[(group.length / 2) | 0]] || 1;
  const fresh = (g: number[]) => !g.some(c => taken[c]);
  for (const g of clusters(i => cells.h[i] >= 20 && cells.h[i] < 55 && isForestBiome(cells.biome[i]), 1))
    if (fresh(g))
      add(
        KINDS.Forest,
        g,
        `${Names.getCultureShort(culture(g))} ${g.length >= 6 ? "Forest" : g.length >= 3 ? "Wood" : "Copse"}`
      );
  for (const g of clusters(i => cells.h[i] >= 55, 1))
    if (fresh(g))
      add(
        KINDS.Mountains,
        g,
        g.length >= 2 ? `Mount ${Names.getCultureShort(culture(g))}` : `${Names.getCultureShort(culture(g))} Peak`
      );
}

/** The middle of a place: the centre of its cells deepest inside it, so the name sits in its widest part */
function centre(group: number[]): [number, number] {
  const p = pack.cells.p;
  const inside = new Set(group);
  const depth = new Map<number, number>();
  const queue: number[] = [];
  for (const c of group)
    if (pack.cells.c[c].some(j => !inside.has(j))) {
      depth.set(c, 0);
      queue.push(c);
    }
  for (let q = 0; q < queue.length; q++)
    for (const j of pack.cells.c[queue[q]])
      if (inside.has(j) && !depth.has(j)) {
        depth.set(j, depth.get(queue[q])! + 1);
        queue.push(j);
      }
  const deepest = Math.max(0, ...depth.values());
  const core = group.filter(c => (depth.get(c) ?? 0) === deepest);
  let x = 0;
  let y = 0;
  for (const c of core) {
    x += p[c][0] / core.length;
    y += p[c][1] / core.length;
  }
  // the core's middle, unless it falls outside the place: then the core cell nearest it
  const near = core.reduce((a, b) =>
    (p[a][0] - x) ** 2 + (p[a][1] - y) ** 2 <= (p[b][0] - x) ** 2 + (p[b][1] - y) ** 2 ? a : b
  );
  const at = Pack.findCell(x, y, Infinity, pack) as number;
  return inside.has(at) ? [x, y] : p[near];
}

export function collectZones(): void {
  nameZones();
  named = [];
  for (const z of pack.zones ?? [])
    if ((z.type === KINDS.Forest || z.type === KINDS.Mountains) && z.cells.length) {
      const [x, y] = centre(z.cells);
      named.push({ key: `z:${z.i}`, text: z.name, x, y, cells: z.cells });
    }
  const byFeature = new Map<number, number[]>();
  for (let i = 0; i < pack.cells.i.length; i++) {
    const f = pack.features[pack.cells.f[i]];
    if (f && f.type === "lake") (byFeature.get(f.i) ?? byFeature.set(f.i, []).get(f.i))?.push(i);
  }
  for (const [f, group] of byFeature) {
    const feature = pack.features[f];
    if (!feature?.name) continue;
    const [x, y] = centre(group);
    named.push({
      key: `f:${f}`,
      text: `${feature.name.replace(/ Bay$/, "")} Bay`,
      x,
      y,
      cells: group
    });
  }
  drawZones(true);
}

export function drawZones(rebuild = false): void {
  const viewbox = document.getElementById("viewbox");
  if (!viewbox) return;
  let group = document.getElementById("flZones") as SVGGElement | null;
  if (!group) {
    group = document.createElementNS(NS, "g");
    group.id = "flZones";
    const hl = document.createElementNS(NS, "g");
    hl.id = "flZoneLight";
    hl.setAttribute("pointer-events", "none");
    viewbox.append(hl, group);
    group.addEventListener("pointerover", e => light((e.target as Element).closest("text")?.dataset.key));
    group.addEventListener("pointerout", () => light(undefined));
    group.addEventListener("dblclick", e => {
      const t = (e.target as Element).closest("text") as SVGTextElement | null;
      if (t?.dataset.key) {
        e.stopPropagation();
        edit(t);
      }
    });
  }
  if (rebuild || group.childElementCount !== named.length)
    group.innerHTML = named
      .map(
        n =>
          `<text x="${n.x}" y="${n.y}" data-key="${n.key}" class="${kindOf(n)} t${tierOf(n)}" text-anchor="middle" dy="0.35em">${escapeHtml(n.text)}</text>`
      )
      .join("");
  // kept on top of the layers Azgaar redraws (lakes over a bay's name would take its pointer)
  if (viewbox.lastElementChild !== group) viewbox.append(document.getElementById("flZoneLight")!, group);
  const scale = viewport.scale || 1;
  TIERS.forEach(({ px, from }, t) => {
    group.style.setProperty(`--z${t}`, `${px / scale}px`);
    group.style.setProperty(`--zo${t}`, String(Math.max(0, Math.min(1, (scale - from) / 0.3))));
  });
  group.style.display = scale >= TIERS[0].from ? "" : "none";
}

const kindOf = (n: Named) =>
  n.key.startsWith("f:") ? "bay" : pack.zones[+n.key.slice(2)]?.type === KINDS.Forest ? "wood" : "peak";

/** Light the cells of a named place */
function light(key: string | undefined): void {
  const hl = document.getElementById("flZoneLight");
  if (!hl) return;
  const n = key ? named.find(m => m.key === key) : null;
  if (!n) {
    hl.innerHTML = "";
    return;
  }
  hl.innerHTML = `<path d="${shapeOf(n)}" class="${kindOf(n)}" shape-rendering="crispEdges" stroke-width="${1 / (viewport.scale || 1)}"/>`;
}

/** Edit a name where it stands: an input over the label, Enter or leaving it keeps the change, Escape drops it */
function edit(text: SVGTextElement): void {
  const key = text.dataset.key as string;
  const n = named.find(m => m.key === key);
  if (!n) return;
  const box = text.getBoundingClientRect();
  const input = document.createElement("input");
  input.value = n.text;
  input.className = "flZoneEdit";
  Object.assign(input.style, {
    left: `${box.left + box.width / 2}px`,
    top: `${box.top + box.height / 2}px`,
    width: `${Math.max(80, box.width + 24)}px`
  });
  document.body.append(input);
  text.style.visibility = "hidden";
  input.focus();
  input.select();
  let done = false;
  const finish = (keep: boolean) => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    input.remove();
    text.style.visibility = "";
    if (!keep || !value || value === n.text) return;
    if (key.startsWith("z:")) pack.zones[Number(key.slice(2))].name = value;
    else {
      const f = pack.features[Number(key.slice(2))];
      if (f) f.name = value.replace(/ Bay$/, "");
      n.text = `${f?.name ?? value} Bay`;
      text.textContent = n.text;
      return;
    }
    n.text = value;
    text.textContent = value;
  };
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
    e.stopPropagation();
  });
  input.addEventListener("blur", () => finish(true));
}

const STYLE = `
#flZones text { font-family: "IM Fell English", serif; font-style: italic; fill: #2f2a20; stroke: #f4f0e4; stroke-width: 0.14em;
  stroke-opacity: 0.75; paint-order: stroke; cursor: pointer; user-select: none; }
#flZones text.wood { fill: #2d5a1e; stroke: #eef2e2; }
#flZones text.peak { fill: #4a4036; }
#flZones text.bay { fill: #2c5d93; stroke: #e9eef2; }
#flZones text.t0 { font-size: var(--z0); opacity: var(--zo0); }
#flZones text.t1 { font-size: var(--z1); opacity: var(--zo1); }
#flZones text.t2 { font-size: var(--z2); opacity: var(--zo2); }
#flZoneLight path { stroke-opacity: 0.9; fill-opacity: 0.26; }
#flZoneLight path.wood { fill: #6fcf3a; stroke: #9be36b; }
#flZoneLight path.bay { fill: #5fb4ff; stroke: #a9d8ff; }
#flZoneLight path.peak { fill: #b9ab97; stroke: #e8e0d0; }
.flZoneEdit { position: fixed; transform: translate(-50%, -50%); z-index: 1000; text-align: center; font: italic 14px "IM Fell English", serif;
  background: #f4f0e4; color: #26262b; border: 1px solid #26262b; padding: 2px 4px; outline: none; }
`;
{
  const s = document.createElement("style");
  s.textContent = STYLE;
  document.head.append(s);
}
