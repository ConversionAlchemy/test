// Road mode: every road node shows as a dot at its cell centre. Press on any land cell and drag: the road snaps cell
// to cell (cells skipped over are filled with the shortest way across land), and letting go builds it at the chosen
// level. Hovering a segment highlights it; right-click it to change its level or delete just that step
import { t } from "@/utils/i18n";
import { cellAtPoint, mainCell, neighbours } from "./one-grid";
import { showRoadEdit } from "./pixel-map-sync";
import { nodePoint, routeCells, segmentAt } from "./road-geometry";
import { changeSegment, createRoadThrough, ROUTE_LEVELS, type RouteGroup } from "./routes";

let active = false;
let level: RouteGroup = "trails";
let drawing: number[] | null = null;
let hovered: ReturnType<typeof segmentAt> = null;
let menu: HTMLDivElement | null = null;
const listeners = new Set<(on: boolean, level: RouteGroup) => void>();

const isLand = (cell: number | undefined): cell is number => cell !== undefined && pack.cells.h[cell] >= 20;

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
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("keyup", onKey, true);
  } else {
    map?.removeEventListener("pointerdown", onDown, true);
    map?.removeEventListener("pointermove", onMove, true);
    map?.removeEventListener("contextmenu", onContext, true);
    map?.removeEventListener("mousedown", swallow, true);
    map?.removeEventListener("click", swallow, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("keyup", onKey, true);
    drawing = null;
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
    cells: drawing ?? undefined
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
  const point = toMap(event);
  const cell = point ? cellAtPoint(point[0], point[1]) : undefined;
  if (!isLand(cell)) return;
  event.stopPropagation();
  event.preventDefault();
  drawing = [cell];
  render();
}

function onMove(event: PointerEvent): void {
  const point = toMap(event);
  if (!point) return;
  if (drawing) {
    event.stopPropagation();
    const cell = cellAtPoint(point[0], point[1]);
    if (!isLand(cell) || cell === drawing.at(-1)) return;
    const back = drawing.indexOf(cell);
    if (back >= 0)
      drawing = drawing.slice(0, back + 1); // dragging back undoes
    else drawing.push(...landPath(drawing.at(-1) as number, cell).slice(1));
    render();
    return;
  }
  const next = segmentAt(point[0], point[1], 6 / (viewportScale() || 1));
  if (next?.id === hovered?.id && next?.k === hovered?.k) return;
  hovered = next;
  render();
}

function onUp(): void {
  if (!drawing) return;
  const cells = drawing;
  drawing = null;
  if (cells.length >= 2) createRoadThrough(cells, level);
  render(true);
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  event.stopImmediatePropagation();
  if (menu) {
    closeMenu();
    return;
  }
  if (drawing) {
    drawing = null;
    render();
    return;
  }
  setRoadMode(false);
}

/** Right-click on a segment: its level, or delete just that step */
function onContext(event: MouseEvent): void {
  if (!hovered) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const { id, k } = hovered;
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
    `<hr /><button type="button" data-group="" class="danger"><span class="name">${t("Delete segment")}</span></button>`
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
    changeSegment(id, k, group);
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

/** Shortest run of land cells between two cells, both included; a straight hop when they touch */
function landPath(from: number, to: number): number[] {
  if (neighbours(from).includes(to)) return [from, to];
  const previous = new Map<number, number>([[from, from]]);
  let frontier = [from];
  for (let step = 0; step < 40 && frontier.length && !previous.has(to); step++) {
    const next: number[] = [];
    for (const cell of frontier)
      for (const n of neighbours(cell)) {
        if (previous.has(n) || !isLand(n)) continue;
        previous.set(n, cell);
        next.push(n);
      }
    frontier = next;
  }
  if (!previous.has(to)) return [from];
  const path = [to];
  while (path[0] !== from) path.unshift(previous.get(path[0]) as number);
  return path;
}
