import { Layers } from "@/components/layers";
import { zoomFontSize } from "@/components/viewport";
import { tokenUrl } from "@/fluoria/forces/pixels";
import type { Marker } from "@/generators/markers-generator";
import { ViewportLayers, type ViewportRenderContext } from "@/renderers/viewport/viewport-renderer";
import { escapeHtml } from "@/utils/stringUtils";

const layer = ViewportLayers.register({ id: "markers", render: reconcileMarkers });
let editedMarker: Marker | null = null;
let visibleMarkerIds: Set<number> | null = null;

export function setEditedMarker(marker: Marker | null): void {
  editedMarker = marker;
  layer.render();
}

export const setMarkersFilter = (ids: number[] | null): void => {
  visibleMarkerIds = ids ? new Set(ids) : null;
};

export const drawMarkers = (): void => {
  TIME && console.time("drawMarkers");
  layer.render();
  TIME && console.timeEnd("drawMarkers");
};

function reconcileMarkers({ root, bounds }: ViewportRenderContext): void {
  const container = root.querySelector<SVGGElement>("#markers");
  if (!container || !Layers.isOn("markers")) return;

  const fontSize = zoomFontSize("markers", bounds.scale); // a marker is sized in em of the layer font
  const anyPinned = pack.markers.some(marker => marker.pinned);
  const selected = root === document && editedMarker ? container.querySelector(`#marker${editedMarker.i}`) : null;
  const markup: string[] = [];
  let selectedMarkup = "";

  for (const marker of pack.markers) {
    const edited = root === document && marker === editedMarker;
    if (marker.hidden) continue;
    if (!edited && ((anyPinned && !marker.pinned) || (visibleMarkerIds && !visibleMarkerIds.has(marker.i)))) continue;
    const { x, y, size = 30 } = marker;
    const drawn = (size / 100) * fontSize; // the box in map units, for culling
    if (
      !edited &&
      (x - drawn / 2 > bounds.x1 || y - drawn / 2 > bounds.y1 || x + drawn / 2 < bounds.x0 || y + drawn / 2 < bounds.y0)
    )
      continue;
    // the box sits at the marker point; the token is centred on it
    const html = /*html*/ `<svg id="marker${marker.i}" viewBox="0 0 30 30" width="${size / 100}em" height="${size / 100}em" x="${x}" y="${y}" overflow="visible">${getMarkerContent(marker)}</svg>`;
    if (edited) selectedMarkup = html;
    else markup.push(html);
  }

  markup.push(selectedMarkup);
  container.innerHTML = markup.join("");

  // Preserve the edited SVG's drag handlers while replacing its rendered content.
  if (selected && selectedMarkup) {
    const rendered = container.lastElementChild!;
    for (const { name, value } of Array.from(rendered.attributes)) selected.setAttribute(name, value);
    selected.replaceChildren(...rendered.childNodes);
    rendered.replaceWith(selected);
  }
}

/** Fluoria: a marker is a pixel token centred on its point, its name below once the user has given it one */
function getMarkerContent(marker: Marker): string {
  const href = tokenUrl(marker.shape ?? "circle", markerColour(marker), markerLetter(marker));
  const name = marker.named
    ? `<text x="0" y="17" text-anchor="middle" class="flMarkerName">${escapeHtml(marker.name)}</text>`
    : "";
  return /* html */ `<image href="${href}" x="-10" y="-10" width="20" height="20" image-rendering="pixelated"/>${name}`;
}

export const markerLetter = (marker: Marker) => (marker.letter || marker.type || "?").slice(0, 1).toUpperCase();

/** A marker takes its allegiance's colour; with none, a neutral grey */
export function markerColour(marker: Marker): string {
  const colour = marker.state ? pack.states[marker.state]?.color : "";
  return colour && colour[0] === "#" && !pack.states[marker.state!]?.removed ? colour.slice(0, 7) : "#8a8a8a";
}
