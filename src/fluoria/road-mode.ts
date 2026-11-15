// Road mode: click one settlement, then another, and the road is laid between them by the best way over land, if
// there is one within the rules (road-network.ts). Hovering a road highlights it; right-click it for its level or to
// remove it

import { tip } from "@/components/tooltips";
import { drawRoutes } from "@/renderers/draw-routes";
import { t } from "@/utils/i18n";
import { cellAtPoint, mainCell } from "./one-grid";
import { showRoadEdit } from "./pixel-map-sync";
import { nodePoint, routeCells, segmentAt } from "./road-geometry";
import { layRoad, roadPath } from "./road-network";
import { deleteRoute, ROUTE_LEVELS, type RouteGroup, setRouteGroup } from "./routes";

let active = false;
let level: RouteGroup = "trails";
let start = 0; // the settlement a road is being laid from
let drawing: number[] | null = null; // the way to the settlement under the pointer
let invalid = false;
let hovered: ReturnType<typeof segmentAt> = null;
let menu: HTMLDivElement | null = null;
const listeners = new Set<(on: boolean, level: RouteGroup) => void>();

const burgUnder = (event: MouseEvent): number => {
  const point = toMap(event);
  const cell = point ? cellAtPoint(point[0], point[1]) : undefined;
  if (cell === undefined) return 0;
  const burg = pack.burgs[pack.cells.burg[mainCell(cell)]];
  return burg?.i && !burg.removed ? burg.i : 0;
};

const toMap = (event: MouseEvent): [number, number] | null => {
  const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
  const matrix = viewbox?.getScreenCTM()?.inverse();
  if (!matrix) return null;
  const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
  return [x, y];
};

export const roadModeOn = () => active;
export const roadLevel = () => level;

export function onRoadMode(listener: (on: boolean, level: RouteGroup) => void): void {
  listeners.add(listener);
}

/** Switch road mode on at a level, or off */
export function setRoadMode(on: boolean, next: RouteGroup = level): void {
  level = next;
  if (on === active) {
    for (const listener of listeners) listener(active, level);
    return;
  }
  active = on;
  document.body.classList.toggle("fluoria-roads", on);
  nodesStale = true;
  const map = document.getElementById("map");
  if (on) {
    map?.addEventListener("pointerdown", onDown, true);
    map?.addEventListener("pointermove", onMove, true);
    map?.addEventListener("contextmenu", onContext, true);
    map?.addEventListener("mousedown", swallow, true);
    map?.addEventListener("click", swallow, true);
    window.addEventListener("keyup", onKey, true);
  } else {
    map?.removeEventListener("pointerdown", onDown, true);
    map?.removeEventListener("pointermove", onMove, true);
    map?.removeEventListener("contextmenu", onContext, true);
    map?.removeEventListener("mousedown", swallow, true);
    map?.removeEventListener("click", swallow, true);
    window.removeEventListener("keyup", onKey, true);
    drawing = null;
    start = 0;
    hovered = null;
    closeMenu();
  }
  render();
  for (const listener of listeners) listener(active, level);
}

function nodes(): [number, number][] {
  const seen = new Set<number>();
  for (const route of pack.routes ?? [])
    if (route.group !== "searoutes") for (const cell of routeCells(route)) seen.add(mainCell(cell));
  return [...seen].map(nodePoint);
}

let frame = 0;
let nodesStale = true;

/** Redraw at most once a frame; the node dots only when roads changed */
function render(refreshNodes = false): void {
  nodesStale ||= refreshNodes;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(paint);
}

function paint(): void {
  if (!active) {
    nodesStale = true;
    showRoadEdit(null);
    return;
  }
  const segment = hovered ? [nodePoint(hovered.a), nodePoint(hovered.b)] : undefined;
  const fresh = nodesStale;
  nodesStale = false;
  showRoadEdit({
    nodes: fresh ? nodes() : undefined,
    segment: drawing ? undefined : segment,
    drawing: drawing?.map(nodePoint),
    cells: drawing ?? (start ? [pack.burgs[start].cell] : undefined),
    invalid
  });
}

/** While drawing the map must not pan, and clicks open nothing */
function swallow(event: MouseEvent): void {
  if (event.type === "click" || drawing) {
    event.stopPropagation();
    event.preventDefault();
  }
}

function onDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  closeMenu();
  event.stopPropagation();
  event.preventDefault();
  const burg = burgUnder(event);
  if (!burg) {
    tip("Roads run from settlement to settlement: click one", false, "warn");
    return;
  }
  if (!start || burg === start) {
    start = burg === start ? 0 : burg;
    drawing = null;
    render();
    return;
  }
  const made = layRoad(start, burg, level);
  if (typeof made === "string") tip(made, false, "error");
  else {
    pack.cells.routes = Routes.buildLinks(pack.routes);
    drawRoutes();
    start = 0;
  }
  drawing = null;
  render(true);
}

function onMove(event: PointerEvent): void {
  const point = toMap(event);
  if (!point) return;
  if (start) {
    event.stopPropagation();
    const burg = burgUnder(event);
    const path = burg && burg !== start ? roadPath(start, burg) : null;
    drawing = Array.isArray(path) ? path : null;
    invalid = typeof path === "string";
    if (invalid) drawing = [pack.burgs[start].cell, pack.burgs[burg].cell];
    render();
    return;
  }
  const next = segmentAt(point[0], point[1], 6 / (viewportScale() || 1));
  if (next?.id === hovered?.id && next?.k === hovered?.k) return;
  hovered = next;
  render();
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  event.stopImmediatePropagation();
  if (menu) {
    closeMenu();
    return;
  }
  if (start) {
    start = 0;
    drawing = null;
    render();
    return;
  }
  setRoadMode(false);
}

/** Right-click on a road: its level, or remove it */
function onContext(event: MouseEvent): void {
  if (!hovered) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const { id } = hovered;
  closeMenu();
  menu = document.createElement("div");
  menu.id = "contextMenu";
  menu.className = "flRoadMenu";
  const route = pack.routes.find(r => r.i === id);
  const rows = ROUTE_LEVELS.map(
    l =>
      `<button type="button" data-group="${l.group}" ${route?.group === l.group ? "disabled class='off'" : ""}><span class="name">${t(l.name)}</span></button>`
  );
  rows.push(
    `<hr /><button type="button" data-group="" class="danger"><span class="name">${t("Remove road")}</span></button>`
  );
  menu.innerHTML = rows.join("");
  document.body.append(menu);
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  menu.addEventListener("click", click => {
    const button = (click.target as HTMLElement).closest("button");
    if (!button || button.disabled) return;
    const group = (button.dataset.group || null) as RouteGroup | null;
    closeMenu();
    if (group) setRouteGroup(id, group);
    else deleteRoute(id);
    hovered = null;
    render(true);
  });
}

function closeMenu(): void {
  menu?.remove();
  menu = null;
}

const viewportScale = () => {
  const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
  return viewbox?.getScreenCTM()?.a ?? 1;
};
