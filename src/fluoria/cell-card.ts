// Bare ground on the map: hovering brightens the cell a little, clicking opens a small card about it.
// Anything with its own editor (settlements, labels, regiments, markers, roads) keeps its own click
import type { Regiment } from "@/generators/military-generator";
import { t } from "@/utils/i18n";
import { convertTemperature, getHeight, getPrecipitation } from "@/utils/unitUtils";
import { cellPace } from "./movement";
import { highlightCell } from "./pixel-map-sync";
import { seaCellAt } from "./sea-grid";

const OWN_CLICK = "#labels text, #burgIcons *, #anchors *, #armies *, #markers *, #routes *, #emblems *, #legend *";

const ROAD_NAMES: Record<string, string> = {
  roads: t("Main road"),
  trails: t("Road"),
  paths: t("Path"),
  searoutes: t("Sea lane")
};

let card: HTMLDivElement | null = null;
let hovered: number | null = null;

const mapPoint = (event: MouseEvent): DOMPoint | null => {
  const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
  const matrix = viewbox?.getScreenCTM()?.inverse();
  return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix) : null;
};

const pointCell = (event: MouseEvent): number | undefined => {
  const point = mapPoint(event);
  return point ? Pack.findCell(point.x, point.y) : undefined;
};

/** Hover: brighten the cell under the pointer when nothing clickable is there */
export function hoverAt(event: MouseEvent): void {
  const own = (event.target as Element | null)?.closest?.(OWN_CLICK);
  const cell = own || window.customization ? undefined : pointCell(event);
  // at sea the even grid is what's drawn, so that's what lights up; sea cells are told apart by sign
  let next = cell === undefined ? null : cell;
  if (next !== null && pack.cells.h[next] < 20) {
    const point = mapPoint(event);
    const g = point && seaCellAt(point.x, point.y);
    next = g === undefined || g === null ? null : -1 - g;
  }
  if (next === hovered) return;
  hovered = next;
  highlightCell(next);
}

export function leave(): void {
  hovered = null;
  highlightCell(null);
}

/** Click on bare ground: the card for that cell */
export function openCellCard(event: MouseEvent): void {
  const cell = pointCell(event);
  if (cell === undefined) return;
  close();
  card = document.createElement("div");
  card.id = "cellCard";
  card.innerHTML = cardHtml(cell);
  document.body.append(card);
  const { width, height } = card.getBoundingClientRect();
  card.style.left = `${Math.max(4, Math.min(event.clientX + 14, window.innerWidth - width - 4))}px`;
  card.style.top = `${Math.max(4, Math.min(event.clientY + 14, window.innerHeight - height - 4))}px`;
  card.addEventListener("click", onCardClick);
  setTimeout(() => window.addEventListener("pointerdown", outside, true));
  window.addEventListener("keyup", onKey, true);
}

function close(): void {
  card?.remove();
  card = null;
  window.removeEventListener("pointerdown", outside, true);
  window.removeEventListener("keyup", onKey, true);
}

function outside(event: Event): void {
  if (card && !card.contains(event.target as Node)) close();
}

function onKey(event: KeyboardEvent): void {
  if (event.key === "Escape") close();
}

function onCardClick(event: MouseEvent): void {
  if ((event.target as HTMLElement).closest("[data-close]")) {
    close();
    return;
  }
  const button = (event.target as HTMLElement).closest<HTMLElement>("[data-open]");
  if (!button) return;
  const [kind, a, b] = (button.dataset.open ?? "").split(":");
  close();
  if (kind === "regiment") Controllers.RegimentEditor.open(`#regiment${a}-${b}`);
  if (kind === "burg") Controllers.BurgEditor.open(Number(a));
  if (kind === "state") Controllers.StatesEditor.open();
}

const row = (label: string, value: string) =>
  value ? `<div class="row"><span>${label}</span><span>${value}</span></div>` : "";

function cardHtml(cell: number): string {
  const { cells } = pack;
  const water = cells.h[cell] < 20;
  const lake = pack.features[cells.f[cell]]?.type === "lake";
  const biome = pack.biomes[cells.biome[cell]]?.name ?? "";
  const shape = water ? "" : cells.h[cell] >= 62 ? t("mountains") : cells.h[cell] >= 46 ? t("hills") : "";
  const title = water ? (lake ? t("Lake") : t("Sea")) : [biome, shape].filter(Boolean).join(", ");
  const gridCell = cells.g[cell];
  const temp = grid.cells.temp[gridCell];
  const prec = grid.cells.prec[gridCell];

  const pace = cellPace(cell);
  const paceText = pace.road
    ? `${ROAD_NAMES[pace.road] ?? t("Road")}: ${t("fast")}`
    : water
      ? ""
      : `${pace.factor > 1.2 ? t("slow") : pace.factor < 0.95 ? t("quick") : t("normal")} (×${pace.factor.toFixed(1)})`;

  const name = (list: { name?: string }[] | undefined, id: number) => (id && list?.[id]?.name) || "";
  const state = cells.state[cell];
  const burgId = cells.burg[cell];
  const burg = burgId ? pack.burgs[burgId] : null;
  const rural = Math.round(cells.pop[cell] * options.map.units.population.scale);
  const urban = burg
    ? Math.round(
        (burg.population || 0) * options.map.units.population.scale * options.map.units.population.urbanization.rate
      )
    : 0;
  const good = cells.good?.[cell] ? pack.goods?.[cells.good[cell]]?.name : "";

  const units: Regiment[] = pack.states.flatMap(s =>
    s.i && !s.removed ? (s.military ?? []).filter(r => !r.hidden && r.cell === cell) : []
  );

  return /* html */ `
    <button type="button" class="close" data-close aria-label="${t("Close")}">✕</button>
    <div class="title">${title}</div>
    ${row(t("Height"), water ? "" : getHeight(cells.h[cell]))}
    ${row(t("Coast"), !water && cells.t[cell] === 1 ? t("yes") : "")}
    ${row(t("Temperature"), temp === undefined ? "" : convertTemperature(temp))}
    ${row(t("Moisture"), prec === undefined || water ? "" : getPrecipitation(prec))}
    ${row(t("Movement"), paceText)}
    ${state ? `<div class="row"><span>${t("State")}</span><a data-open="state">${name(pack.states, state)}</a></div>` : ""}
    ${row(t("Province"), name(pack.provinces as { name?: string }[], cells.province?.[cell] ?? 0))}
    ${row(t("Culture"), name(pack.cultures, cells.culture[cell]))}
    ${row(t("Religion"), name(pack.religions, cells.religion[cell]))}
    ${burg ? `<div class="row"><span>${t("Settlement")}</span><a data-open="burg:${burgId}">${burg.name}</a></div>` : ""}
    ${row(t("Population"), water ? "" : (rural + urban).toLocaleString())}
    ${row(t("Goods"), good || "")}
    ${
      units.length
        ? `<div class="sub">${t("Units here")}</div>${units
            .map(r => `<a class="unit" data-open="regiment:${r.state}:${r.i}">${r.name} (${r.a})</a>`)
            .join("")}`
        : ""
    }
  `;
}
