// Named places on the map: forests, mountain ranges, lakes and islands. Forests and ranges are kept as hidden Azgaar
// zones (so they save with the map); lakes and islands are Azgaar features. Hovering a name lights its ground,
// double-clicking it edits the name in place
import { viewport } from "@/components/viewport";
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
}

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

/** Name every forest of 3 cells and up and every range of 2 mountain cells and up, once per map */
export function nameZones(): void {
  if (!pack?.cells?.i) return;
  pack.zones ??= [];
  if (pack.zones.some(z => z.type === KINDS.Forest || z.type === KINDS.Mountains)) return;
  const { cells } = pack;
  const add = (type: string, group: number[], name: string) =>
    pack.zones.push({ i: pack.zones.length, name, type, cells: group, color: "#000000", hidden: true });
  const culture = (group: number[]) => cells.culture[group[(group.length / 2) | 0]] || 1;
  for (const g of clusters(i => cells.h[i] >= 20 && cells.h[i] < 55 && isForestBiome(cells.biome[i]), 3))
    add(KINDS.Forest, g, `${Names.getCultureShort(culture(g))} Forest`);
  for (const g of clusters(i => cells.h[i] >= 55, 2))
    add(KINDS.Mountains, g, `Mount ${Names.getCultureShort(culture(g))}`);
}

/** The cell of a group nearest its middle, so the name sits on the place itself */
function centre(group: number[]): [number, number] {
  const p = pack.cells.p;
  let sx = 0;
  let sy = 0;
  for (const c of group) (sx += p[c][0]), (sy += p[c][1]);
  sx /= group.length;
  sy /= group.length;
  let best = group[0];
  let bd = Infinity;
  for (const c of group) {
    const d = (p[c][0] - sx) ** 2 + (p[c][1] - sy) ** 2;
    if (d < bd) (bd = d), (best = c);
  }
  return p[best];
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
      text: `${feature.name}${feature.group === "lake" ? " Water" : ""}`,
      x,
      y,
      cells: group
    });
  }
  drawZones(true);
}

const LABEL_PX = 13;

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
          `<text x="${n.x}" y="${n.y}" data-key="${n.key}" text-anchor="middle" dy="0.35em">${escapeHtml(n.text)}</text>`
      )
      .join("");
  group.style.fontSize = `${LABEL_PX / (viewport.scale || 1)}px`;
  group.style.display = (viewport.scale || 1) >= 1.4 ? "" : "none";
}

/** Light the cells of a named place */
function light(key: string | undefined): void {
  const hl = document.getElementById("flZoneLight");
  if (!hl) return;
  const n = key ? named.find(m => m.key === key) : null;
  if (!n) {
    hl.innerHTML = "";
    return;
  }
  const { cells, vertices } = pack;
  const d = n.cells.map(c => `M${cells.v[c].map(v => vertices.p[v].join(",")).join("L")}Z`).join("");
  hl.innerHTML = `<path d="${d}" fill="#f4f0e4" fill-opacity="0.22" stroke="#f4f0e4" stroke-opacity="0.5" stroke-width="${1 / (viewport.scale || 1)}"/>`;
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
      if (f) f.name = value.replace(/ Water$/, "");
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
#flZones text:hover { fill: #111; }
.flZoneEdit { position: fixed; transform: translate(-50%, -50%); z-index: 1000; text-align: center; font: italic 14px "IM Fell English", serif;
  background: #f4f0e4; color: #26262b; border: 1px solid #26262b; padding: 2px 4px; outline: none; }
`;
{
  const s = document.createElement("style");
  s.textContent = STYLE;
  document.head.append(s);
}
