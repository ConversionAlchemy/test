// The zoom handler's line to the pixel map: a no-op until the map has loaded. Kept free of imports so tests that
// load the zoom module don't pull in the layer registry
let sync: (() => void) | null = null;

export function setPixelMapSync(next: () => void): void {
  sync = next;
}

/** Called by the zoom handler every frame the view moves, and on resize */
export function syncPixelMap(): void {
  sync?.();
}

type Dimmer = (bright: ReadonlySet<number> | null, kind?: "land" | "sea") => void;
let dimmer: Dimmer | null = null;

export function setPixelMapDimmer(next: Dimmer): void {
  dimmer = next;
}

/** Dim every cell except `bright`: packed cells for land units, even sea cells for fleets; null lifts it */
export function dimPixelMap(bright: ReadonlySet<number> | null, kind: "land" | "sea" = "land"): void {
  dimmer?.(bright, kind);
}

let highlighter: ((cell: number | null) => void) | null = null;

export function setPixelMapHighlighter(next: (cell: number | null) => void): void {
  highlighter = next;
}

/** Brighten the cell under the pointer a little; null for none */
export function highlightCell(cell: number | null): void {
  highlighter?.(cell);
}

/** What road mode shows over the map: road nodes, a highlighted segment, a road being drawn and its cells */
export interface RoadEdit {
  nodes?: [number, number][];
  segment?: [number, number][];
  drawing?: [number, number][];
  cells?: number[];
  invalid?: boolean;
}

let roads: { draw: () => void; edit: (edit: RoadEdit | null) => void } | null = null;

export function setPixelMapRoads(next: { draw: () => void; edit: (edit: RoadEdit | null) => void }): void {
  roads = next;
}

/** Redraw the road layer from the routes as they are now */
export function redrawRoads(): void {
  roads?.draw();
}

export function showRoadEdit(edit: RoadEdit | null): void {
  roads?.edit(edit);
}
