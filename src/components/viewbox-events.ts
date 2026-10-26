// Default interaction on the map canvas: pan/zoom, click-to-edit, the context menu and hover tooltips
import { drag, select } from "d3";
import { Controllers } from "@/controllers";
import { groundClick, hoverAt, leave, zoomedOut } from "@/fluoria/cell-card";
import { openNation } from "@/fluoria/nation-panel";
import { showRoadEdit } from "@/fluoria/pixel-map-sync";
import { nodePoint, roadUnder } from "@/fluoria/road-geometry";
import { roadModeOn } from "@/fluoria/road-mode";
import type { LabelType } from "@/generators/labels-generator";
import { dragLegendBox } from "@/renderers/draw-legend";
import { findEl } from "@/utils";
import { debounce } from "@/utils/commonUtils";
import { handleMouseMove } from "./map-tooltip";
import { applyZoomBehavior } from "./zoom";

const onMouseMove = debounce(handleMouseMove, 100);

export function applyDefaultViewboxEvents(): void {
  applyZoomBehavior();

  select<SVGGElement, unknown>("#viewbox")
    .style("cursor", "default")
    .on(".drag", null)
    .on("click", onClick)
    .on("contextmenu", onContextMenu)
    .on("touchmove mousemove", onMouseMove);

  // Fluoria: the pixel map has no svg under bare ground, so the map itself hears hover and clicks there
  select<SVGSVGElement, unknown>("#map")
    .on("mousemove.fluoria", (event: MouseEvent) => {
      hoverAt(event);
      roadHover(event);
    })
    .on("mouseleave.fluoria", leave)
    .on("click.fluoria", (event: MouseEvent) => {
      if ((event.target as Element)?.id !== "map" || options.map.viewOnly || customization) return;
      groundClick(event);
    });

  select<SVGGElement, unknown>("#legend").call(drag<SVGGElement, unknown>().on("start", dragLegendBox));
}

// map group id -> editor to open. The click target is resolved by walking up its ancestors
type Opener = (target: SVGElement, parent: SVGElement) => void;

const PARENT_EDITORS: Record<string, Opener> = {
  rivers: target => Controllers.RiverEditor.open(target.id),
  ice: target => Controllers.IceEditor.open(target),
  terrain: target => Controllers.ReliefEditor.open(target),
  goodsCells: () => Controllers.GoodsEditor.open()
};

const GRAND_EDITORS: Record<string, Opener> = {
  emblems: target => Controllers.EmblemsEditor.open(undefined, undefined, undefined, target),
  routes: target => Controllers.RouteEditor.open(target.id),
  journeys: (_target, parent) => Controllers.JourneyEditor.open(Number(parent.id.replace("journey", ""))),
  markers: target => Controllers.MarkersEditor.open(undefined, target),
  ruler: () => Controllers.MeasurersEditor.open(),
  goodsIcons: () => Controllers.GoodsEditor.open(),
  goodsBurgs: (_target, parent) => Controllers.ProductionOverview.open(Number(parent.dataset.id)),
  lakes: target => Controllers.LakesEditor.open(target),
  markets: (target, parent) => {
    if (target.tagName !== "path") Controllers.MarketOverview.open(Number(parent.dataset.id));
  }
};

const GREAT_EDITORS: Record<string, Opener> = {
  burgIcons: target => Controllers.RegimentEditor.settlement(Number(target.dataset.id)), // Fluoria: the settlement folder
  markers: target => Controllers.MarkersEditor.open(undefined, target),
  ruler: () => Controllers.MeasurersEditor.open(),
  armies: (_target, parent) =>
    Controllers.RegimentEditor.click(`#${parent.id}`, Boolean((window.event as MouseEvent | undefined)?.shiftKey))
};

/** Open the editor for a map element, as a click on it does; false when it has none */
export function openEditor(element: Element): boolean {
  const target = element as SVGElement;
  const parent = target.parentElement as SVGElement | null;
  const grand = parent?.parentElement as SVGElement | null;
  const great = grand?.parentElement as SVGElement | null;
  const ancestor = great?.parentElement as SVGElement | null;
  if (!parent || !grand || !great || !ancestor) return false;

  const label = target.closest<SVGTextElement>("#labels text[data-label-type]");
  if (label) {
    const id = Number(label.dataset.id);
    const type = label.dataset.labelType as LabelType;
    if (type === "state") {
      openNation(id); // Fluoria: a nation's name opens the nation
      return true;
    }
    if (type === "burg") {
      const burgEditor = findEl("burgEditor");
      const isBurgEditorOpen = burgEditor?.dataset.burgId === String(id);
      if (isBurgEditorOpen) Controllers.LabelsEditor.open(type, id);
      else Controllers.RegimentEditor.settlement(id);
    } else Controllers.LabelsEditor.open(type, id);
    return true;
  }

  const open = PARENT_EDITORS[parent.id] || GRAND_EDITORS[grand.id] || GREAT_EDITORS[great.id];
  open?.(target, parent);
  return Boolean(open);
}

function onClick(event: MouseEvent): void {
  if (!event?.target || options.map.viewOnly) return;
  if (openEditor(event.target as Element) || customization) return;
  groundClick(event); // Fluoria: a road isn't edited by a click; it lights up on hover, Edit is on its right-click
}

let litRoad = "";

/** The road segment under the pointer brightens, like a unit card does */
function roadHover(event: MouseEvent): void {
  const menu = document.getElementById("contextMenu"); // it lights its own road
  if (event.buttons || roadModeOn() || zoomedOut() || menu) {
    if (litRoad && !roadModeOn() && !menu) showRoadEdit(null);
    litRoad = "";
    return;
  }
  const road = roadUnder(event, 5);
  const key = road ? `${road.a}-${road.b}` : "";
  if (key === litRoad) return;
  litRoad = key;
  showRoadEdit(road ? { hover: [nodePoint(road.a), nodePoint(road.b)] } : null);
}

/** Right-click on the map belongs to the context menu; Shift+right-click keeps the browser's own */
function onContextMenu(event: MouseEvent): void {
  if (event.shiftKey || customization || options.map.viewOnly) return;
  event.preventDefault();
  Controllers.ContextMenu.open(event);
}
