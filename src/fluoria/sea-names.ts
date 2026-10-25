// Sea and ocean names for the atlas views, from Azgaar's own water features (name + ocean/sea/gulf). Each sits on
// the open water furthest from land; a big ocean is named in up to three places far apart
import { escapeHtml } from "@/utils/stringUtils";
import { cellOfGrid } from "./one-grid";

interface SeaLabel {
  x: number;
  y: number;
  text: string;
  size: number; // map units
}

let seas: SeaLabel[] = [];

/** Steps from each grid cell to the nearest land, over the grid */
function distanceToLand(): Int32Array {
  const n = grid.cells.i.length;
  const dist = new Int32Array(n).fill(-1);
  let frontier: number[] = [];
  for (let g = 0; g < n; g++) {
    const c = cellOfGrid(g);
    if (c >= 0 && pack.cells.h[c] >= 20) {
      dist[g] = 0;
      frontier.push(g);
    }
  }
  for (let d = 1; frontier.length; d++) {
    const next: number[] = [];
    for (const g of frontier)
      for (const n2 of grid.cells.c[g])
        if (dist[n2] < 0) {
          dist[n2] = d;
          next.push(n2);
        }
    frontier = next;
  }
  return dist;
}

/** The pack feature a grid water body belongs to: the one its coastal cells were packed into */
function packFeatures(): Map<number, number> {
  const out = new Map<number, number>();
  for (let g = 0; g < grid.cells.i.length; g++) {
    const f = grid.cells.f[g];
    if (out.has(f)) continue;
    const c = cellOfGrid(g);
    if (c >= 0 && pack.cells.h[c] < 20) out.set(f, pack.cells.f[c]);
  }
  return out;
}

export function collectSeas(): void {
  seas = [];
  if (!grid?.cells?.f || !pack?.features) return;
  const dist = distanceToLand();
  const toPack = packFeatures();
  const byFeature = new Map<number, number[]>();
  for (let g = 0; g < grid.cells.i.length; g++) {
    if (dist[g] <= 0) continue;
    const f = toPack.get(grid.cells.f[g]);
    if (f === undefined || pack.features[f]?.type !== "ocean") continue;
    const list = byFeature.get(f) ?? [];
    list.push(g);
    byFeature.set(f, list);
  }
  const spacing = grid.spacing;
  for (const [f, cells] of byFeature) {
    const feature = pack.features[f];
    if (!feature?.name) continue;
    const kind = feature.subtype || "sea";
    const text = `${feature.name} ${kind[0].toUpperCase()}${kind.slice(1)}`;
    const places = kind === "ocean" ? 3 : 1;
    const size = spacing * (kind === "ocean" ? 2.4 : kind === "sea" ? 1.7 : 1.2);
    const sorted = cells.sort((a, b) => dist[b] - dist[a]);
    const chosen: number[] = [];
    const apart = (Math.min(options.map.graph.width, options.map.graph.height) / 3) ** 2;
    for (const g of sorted) {
      if (chosen.length >= places || dist[g] < 2) break;
      const [x, y] = grid.points[g];
      if (chosen.every(o => (grid.points[o][0] - x) ** 2 + (grid.points[o][1] - y) ** 2 > apart)) chosen.push(g);
    }
    if (!chosen.length && sorted.length) chosen.push(sorted[0]);
    for (const g of chosen) seas.push({ x: grid.points[g][0], y: grid.points[g][1], text, size });
  }
  drawSeas();
}

export function drawSeas(): void {
  const viewbox = document.getElementById("viewbox");
  if (!viewbox) return;
  let group = document.getElementById("flSeas") as SVGGElement | null;
  if (!group) {
    group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.id = "flSeas";
    group.setAttribute("pointer-events", "none");
    const labels = document.getElementById("labels");
    if (labels?.parentNode === viewbox) labels.before(group);
    else viewbox.append(group);
  }
  group.innerHTML = seas
    .map(
      ({ x, y, text, size }) =>
        `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dy="0.35em">${escapeHtml(text)}</text>`
    )
    .join("");
}
