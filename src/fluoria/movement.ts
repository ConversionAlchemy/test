// How far a regiment can go in one move: a cheapest-path search over cells, measured in the map's distance unit.
// Terrain slows it (Azgaar's biome movement costs and climbing), roads speed it up, and land and sea never mix
import type { Regiment } from "@/generators/military-generator";

const MOVE_DAYS = 5; // one move is about a working week of travel

// miles a day by Azgaar unit type; a regiment moves at the pace of its slowest troops
const MILES_PER_DAY: Record<string, number> = {
  melee: 20,
  ranged: 20,
  magical: 20,
  mounted: 32,
  machinery: 12,
  armored: 15,
  aviation: 100,
  naval: 80
};

// route groups by how much they cut the cost of the way, as a factor on the distance
const ROAD_FACTOR: Record<string, number> = { roads: 0.35, trails: 0.55, paths: 0.75, searoutes: 0.7 };
const OTHER_ROUTE = 0.75;

const isWaterCell = (cell: number) => pack.cells.h[cell] < 20;

/** Whether a regiment may stand in a cell at all: fleets on water, everyone else on land */
export function canStand(regiment: Pick<Regiment, "n">, cell: number): boolean {
  return regiment.n ? isWaterCell(cell) : !isWaterCell(cell);
}

/** Distance a regiment covers in one move on open, level ground, in the map's distance unit */
export function moveDistance(regiment: Pick<Regiment, "n" | "u">): number {
  const perDay = regiment.n ? MILES_PER_DAY.naval : slowestPace(regiment.u);
  const miles = perDay * MOVE_DAYS;
  return options.map.units.distance.unit === "km" ? miles * 1.609 : miles;
}

function slowestPace(units: Record<string, number>): number {
  const types = options.map.military.units;
  let pace = Infinity;
  for (const [name, count] of Object.entries(units)) {
    if (!count) continue;
    const type = types.find(unit => unit.name === name)?.type ?? "melee";
    pace = Math.min(pace, MILES_PER_DAY[type] ?? MILES_PER_DAY.melee);
  }
  return Number.isFinite(pace) ? pace : MILES_PER_DAY.melee;
}

/** The factor on the distance of stepping from one cell into a neighbour */
function stepFactor(from: number, to: number, naval: boolean): number {
  const { cells, routes } = pack;
  const routeId = cells.routes?.[from]?.[to];
  const route = routeId !== undefined ? routes.find(({ i }) => i === routeId) : undefined;
  if (route) return ROAD_FACTOR[route.group] ?? OTHER_ROUTE;
  if (naval) return 1;
  const biomeCost = pack.biomes[cells.biome[to]]?.cost ?? 50;
  const terrain = Math.min(6, Math.max(0.8, biomeCost / 50));
  const climb = Math.max(0, cells.h[to] - cells.h[from]) / 20; // uphill tires, downhill doesn't
  const peaks = cells.h[to] >= 70 ? 1.5 : 1;
  return terrain * peaks + climb;
}

/** How moving through a cell compares with open level ground: its road if it has one, else its ground */
export function cellPace(cell: number): { factor: number; road: string | null } {
  const { cells, routes } = pack;
  let best: { factor: number; road: string | null } | null = null;
  for (const id of Object.values(cells.routes?.[cell] ?? {})) {
    const route = routes.find(({ i }) => i === id);
    if (!route) continue;
    const factor = ROAD_FACTOR[route.group] ?? OTHER_ROUTE;
    if (!best || factor < best.factor) best = { factor, road: route.group };
  }
  if (best) return best;
  const biomeCost = pack.biomes[cells.biome[cell]]?.cost ?? 50;
  const terrain = Math.min(6, Math.max(0.8, biomeCost / 50));
  return { factor: terrain * (cells.h[cell] >= 70 ? 1.5 : 1), road: null };
}

/** Every cell the regiment can reach this move from where it stands, with what it costs to get there */
export function reachable(regiment: Pick<Regiment, "n" | "u" | "cell">): Map<number, number> {
  const { cells } = pack;
  const naval = Boolean(regiment.n);
  const budget = moveDistance(regiment) / options.map.units.distance.scale; // in map pixels
  const start = startCell(regiment);
  const best = new Map<number, number>([[start, 0]]);
  const queue: [number, number][] = [[0, start]];
  while (queue.length) {
    let k = 0;
    for (let j = 1; j < queue.length; j++) if (queue[j][0] < queue[k][0]) k = j;
    const [cost, cell] = queue[k];
    queue[k] = queue[queue.length - 1];
    queue.pop();
    if (cost > (best.get(cell) ?? Infinity)) continue;
    const [x0, y0] = cells.p[cell];
    for (const next of cells.c[cell]) {
      if (!canStand(regiment, next)) continue;
      const [x1, y1] = cells.p[next];
      const total = cost + Math.hypot(x1 - x0, y1 - y0) * stepFactor(cell, next, naval);
      if (total > budget || total >= (best.get(next) ?? Infinity)) continue;
      best.set(next, total);
      queue.push([total, next]);
    }
  }
  return best;
}

/** A fleet moored at a port counts from its harbour; anyone stranded counts from the nearest cell they may use */
function startCell(regiment: Pick<Regiment, "n" | "cell">): number {
  const { cells } = pack;
  const cell = regiment.cell;
  if (canStand(regiment, cell)) return cell;
  const haven = cells.haven?.[cell];
  if (haven && canStand(regiment, haven)) return haven;
  return cells.c[cell].find(next => canStand(regiment, next)) ?? cell;
}
