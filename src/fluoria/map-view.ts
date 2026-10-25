// Which view the map is in: the background under the cells changes, nothing else. Import-free so the Map tab and
// the pixel map can both use it without loading each other
import type { ViewName } from "./world-model";

const VIEWS: readonly ViewName[] = ["terrain", "military", "political", "provinces", "cultures", "religions"];

let view: ViewName = "terrain"; // every visit opens on the terrain view
const listeners = new Set<(view: ViewName) => void>();

let outline = false; // regions drawn as outlines only, under a data overlay

export const getMapView = (): ViewName => view;
export const isOutlineOnly = (): boolean => outline;

/** Show regions by their borders only, so an overlay's colours read cleanly; the view's own look returns after */
export function setOutlineOnly(next: boolean): void {
  if (next === outline) return;
  outline = next;
  for (const listener of listeners) listener(view);
}

export function setMapView(next: ViewName): void {
  if (next === view || !VIEWS.includes(next)) return;
  view = next;
  for (const listener of listeners) listener(view);
}

export function onMapView(listener: (view: ViewName) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
