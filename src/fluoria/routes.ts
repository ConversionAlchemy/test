// Roads drawn in the pixel view are Azgaar routes: created, reshaped, renamed and removed through Azgaar's own
// Routes module, so the classic map and everything that reads routes (economy, travel, names) stay in step
import type { Route } from "@/generators/routes-generator";
import { drawRoutes } from "@/renderers/draw-routes";
import { rn } from "@/utils/numberUtils";

export type Point = [number, number];

export const ROUTE_LEVELS = [
  { group: "roads", name: "Main road" },
  { group: "trails", name: "Road" },
  { group: "paths", name: "Path" }
] as const;

export type RouteGroup = (typeof ROUTE_LEVELS)[number]["group"];

/** Azgaar ships roads and trails; paths are added as a dotted group the first time one is drawn */
function ensureGroup(group: string): void {
  const groups = styles.routes.groups;
  if (groups[group]) return;
  const template = groups.trails ?? groups.roads;
  if (!template) return;
  groups[group] = structuredClone(template);
  groups[group].attrs = {
    ...groups[group].attrs,
    stroke: "#8a6a3c",
    "stroke-width": 0.2,
    "stroke-dasharray": "0.4 0.8"
  };
}

/** Create a route through map points; it gets a generated name like Azgaar's own routes */
export function createRoute(points: Point[], group: RouteGroup): number {
  ensureGroup(group);
  const id = Routes.create(points, group);
  const route = findRoute(id);
  if (route) route.name = Routes.generateName(route) ?? fallbackName(route, group);
  drawRoutes();
  return id;
}

/** Azgaar only names routes of 4+ points; short hand-drawn ones are named after the settlement they reach */
function fallbackName(route: Route, group: RouteGroup): string {
  const burgId = [route.points.at(-1), route.points[0]].map(p => pack.cells.burg[p?.[2] ?? 0]).find(Boolean);
  const burg = burgId ? pack.burgs[burgId] : null;
  const kind = ROUTE_LEVELS.find(level => level.group === group)?.name ?? "Road";
  return burg ? `${burg.label?.text || burg.name} ${kind}` : kind;
}

export function moveRoutePoints(id: number, points: Point[]): void {
  const route = findRoute(id);
  if (!route) return;
  route.points = points.map(([x, y]) => [rn(x, 2), rn(y, 2), Pack.findCell(x, y) ?? route.points[0][2]]);
  pack.cells.routes = Routes.buildLinks(pack.routes);
  drawRoutes();
}

export function renameRoute(id: number, name: string): void {
  if (name.trim()) Routes.rename(id, name.trim());
}

export function setRouteGroup(id: number, group: RouteGroup): void {
  ensureGroup(group);
  Routes.setGroup(id, group);
  drawRoutes();
}

export function deleteRoute(id: number): void {
  Routes.remove(id);
  drawRoutes();
}

export function findRoute(id: number): Route | undefined {
  return pack.routes.find(route => route.i === id);
}

// ---- geometry, in whatever units the caller uses ----

export interface Place {
  id: number;
  x: number;
  y: number;
}

/** The settlement a click lands on, if any lies within `radius` */
export function snapToPlace(point: Point, places: readonly Place[], radius: number): Place | null {
  let best: Place | null = null;
  let bestDistance = radius;
  for (const place of places) {
    const d = Math.hypot(place.x - point[0], place.y - point[1]);
    if (d <= bestDistance) {
      best = place;
      bestDistance = d;
    }
  }
  return best;
}

/** A settlement the segment would cross, other than the ones it starts or ends at: roads stop at settlements */
export function crossedPlace(
  a: Point,
  b: Point,
  places: readonly Place[],
  radius: number,
  ends: number[]
): Place | null {
  for (const place of places) {
    if (ends.includes(place.id)) continue;
    if (distanceToSegment([place.x, place.y], a, b) < radius) return place;
  }
  return null;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** The closest route line within `tolerance`, and where along it the point falls (segment index) */
export function pickRoute(
  point: Point,
  routes: readonly { id: number; points: Point[] }[],
  tolerance: number
): { id: number; segment: number } | null {
  let best: { id: number; segment: number } | null = null;
  let bestDistance = tolerance;
  for (const route of routes)
    for (let k = 1; k < route.points.length; k++) {
      const d = distanceToSegment(point, route.points[k - 1], route.points[k]);
      if (d <= bestDistance) {
        best = { id: route.id, segment: k - 1 };
        bestDistance = d;
      }
    }
  return best;
}

export function pickNode(point: Point, nodes: readonly Point[], tolerance: number): number {
  let best = -1;
  let bestDistance = tolerance;
  nodes.forEach(([x, y], index) => {
    const d = Math.hypot(x - point[0], y - point[1]);
    if (d <= bestDistance) {
      best = index;
      bestDistance = d;
    }
  });
  return best;
}
