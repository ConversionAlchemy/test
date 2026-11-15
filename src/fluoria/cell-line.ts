// What the hover line says about a cell, most specific place first:
// "Zundinar · Kiramunz · Skurnax (in its colour) · Grassland"

import { hsl } from "d3";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import { islandName } from "./islands";
import { focusedNation, STANDING_LABEL, standing } from "./nation";
import { isPort } from "./one-grid";
import { ownerText } from "./owners";
import { laneSteps } from "./road-geometry";
import { occupierOf } from "./war";

let lanes: { key: string; cells: Set<number> } | null = null;

/** Sea grid cells a lane runs through, kept until the routes change */
function laneCells(): Set<number> {
  const key = `${pack.routes?.length ?? 0}:${pack.routes?.reduce((sum, r) => sum + (r.points?.length ?? 0), 0) ?? 0}`;
  if (lanes?.key === key) return lanes.cells;
  const cells = new Set<number>();
  for (const step of laneSteps()) for (const g of step.split("-")) cells.add(Number(g));
  lanes = { key, cells };
  return cells;
}

const join = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" · ");

/** A nation's name in a bright tint of its colour, so it reads on the dark line */
function nationTag(state: number, text: string): string {
  const c = hsl(pack.states[state]?.color ?? "#cccccc");
  const bright = Number.isNaN(c.h) ? "#e8e4d8" : hsl(c.h, Math.min(0.75, (c.s || 0.4) + 0.1), 0.72).formatHex();
  return `<span style="color:${bright}">${escapeHtml(text)}</span>`;
}

let counts: { at: number; n: Map<number, number> } = { at: 0, n: new Map() };

/** A province's land cells, counted afresh at most once a second */
function provinceCells(id: number): number {
  if (performance.now() - counts.at > 1000) {
    const n = new Map<number, number>();
    const { cells } = pack;
    for (let i = 0; i < cells.i.length; i++)
      if (cells.h[i] >= 20 && cells.province[i]) n.set(cells.province[i], (n.get(cells.province[i]) ?? 0) + 1);
    counts = { at: performance.now(), n };
  }
  return counts.n.get(id) ?? 0;
}

/** The named place a water cell belongs to: a lake, a bay or sound, else the open sea */
function waterName(cell: number | undefined, g: number): string {
  if (cell !== undefined) {
    const f = pack.features[pack.cells.f[cell]];
    if (f?.type === "lake") return f.name ? `Lake ${f.name.replace(/^Lake\s+|\s+(Lake|Bay|Water)$/gi, "")}` : t("Lake");
    const zone = pack.zones?.find(z => z.type === "Bay" && z.cells.includes(cell));
    if (zone) return zone.name;
  }
  return laneCells().has(g) ? t("Sea lane") : t("Open sea");
}

/** The hover line, short: where it is (settlement, province, nation in its colour) and what the ground is */
export function cellLine(cell: number | undefined, g: number): string {
  const { cells } = pack;
  const water = cell === undefined || cells.h[cell] < 20;
  if (water && !(cell !== undefined && isPort(cell))) return escapeHtml(waterName(cell, g));
  const at = cell as number;
  const burg = cells.burg[at] ? pack.burgs[cells.burg[at]] : null;
  const living = burg && !burg.removed ? burg : null;
  const provinceId = cells.province?.[at] ?? 0;
  const province = provinceId ? pack.provinces[provinceId] : null;
  const state = cells.state[at];
  const focus = focusedNation();
  const relation = focus && state && state !== focus ? standing(focus, state) : null;
  const occupier = occupierOf(at);
  const biome = pack.biomes[cells.biome[at]]?.name ?? "";
  return join([
    living && escapeHtml(living.name ?? ""),
    province &&
      !province.removed &&
      `${escapeHtml(islandName(provinceId) ?? province.name)} (${provinceCells(provinceId).toLocaleString()})`,
    state ? nationTag(state, ownerText(at)) : escapeHtml(t("Unclaimed")),
    relation && relation !== "neutral" && escapeHtml(t(STANDING_LABEL[relation])),
    occupier > 0 && `${escapeHtml(t("held by"))} ${nationTag(occupier, pack.states[occupier].name)}`,
    escapeHtml(biome)
  ]);
}
