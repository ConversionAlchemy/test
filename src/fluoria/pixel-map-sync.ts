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

let dimmer: ((bright: ReadonlySet<number> | null) => void) | null = null;

export function setPixelMapDimmer(next: (bright: ReadonlySet<number> | null) => void): void {
  dimmer = next;
}

/** Dim every cell except `bright`; null lifts the dimming */
export function dimPixelMap(bright: ReadonlySet<number> | null): void {
  dimmer?.(bright);
}
