// What the hover line says about a cell, most specific place first:
// "Zundinar (10,489), Kiramunz, Skurnax, Tropical Rainforest, 72°F, 13 ft"
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import { convertTemperature, getArea, getAreaUnit, getHeight } from "@/utils/unitUtils";
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

/** A grid cell's land size in the map's area unit */
function cellArea(g: number): string {
  const p = grid.cells.v[g].map(v => grid.vertices.p[v]);
  let twice = 0;
  for (let k = 0; k < p.length; k++) {
    const [x1, y1] = p[k];
    const [x2, y2] = p[(k + 1) % p.length];
    twice += x1 * y2 - x2 * y1;
  }
  return `${Math.round(getArea(Math.abs(twice) / 2)).toLocaleString()} ${getAreaUnit()}`;
}

const join = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(", ");

/** The hover line for a packed cell (undefined over open ocean) and the grid cell under the pointer */
export function cellLine(cell: number | undefined, g: number): string {
  const temp = grid.cells.temp[g];
  const temperature = temp === undefined ? "" : convertTemperature(temp);
  const { cells } = pack;
  const water = cell === undefined || cells.h[cell] < 20;
  if (water && !(cell !== undefined && isPort(cell))) {
    const lake = cell !== undefined && pack.features[cells.f[cell]]?.type === "lake";
    const where = lake ? t("Lake") : laneCells().has(g) ? t("Sea lane") : t("Open sea");
    return join([where, temperature]);
  }
  const at = cell as number;
  const burg = cells.burg[at] ? pack.burgs[cells.burg[at]] : null;
  const living = burg && !burg.removed ? burg : null;
  const people = (n: number) => Math.round(n).toLocaleString();
  const urban = living
    ? (living.population || 0) * options.map.units.population.scale * options.map.units.population.urbanization.rate
    : 0;
  const rural = (cells.pop?.[at] ?? 0) * options.map.units.population.scale;
  const provinceId = cells.province?.[at] ?? 0;
  const province = provinceId ? pack.provinces[provinceId] : null;
  const state = cells.state[at];
  const owner = state ? ownerText(at) : t("Unclaimed");
  const focus = focusedNation();
  const relation = focus && state && state !== focus ? standing(focus, state) : null;
  const occupier = occupierOf(at);
  const held = occupier ? `${t("occupied by")} ${pack.states[occupier].name}` : "";
  const ownerPart = join([
    relation && pack.states[focus]
      ? `${owner} (${t(STANDING_LABEL[relation])} ${t("of")} ${pack.states[focus].name})`
      : owner,
    held
  ]);
  const biome = pack.biomes[cells.biome[at]]?.name ?? "";
  const port = Boolean(living?.port) || isPort(at);
  return escapeHtml(
    join([
      living && `${living.name} (${people(urban)})`,
      port && t("port"),
      province && "name" in province && province.name,
      ownerPart,
      !port && biome,
      !living && rural >= 1 && `${t("pop.")} ${people(rural)}`,
      temperature,
      !port && getHeight(cells.h[at]),
      cellArea(g)
    ])
  );
}
