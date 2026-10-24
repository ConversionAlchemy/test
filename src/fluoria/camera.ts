// Pixel art only stays crisp at whole-number scales; below 1× the view switches to smoothed mipmaps
export const ZOOM_STEPS = [0.25, 0.5, 1, 2, 3, 4, 6, 8] as const;

export interface View {
  x: number; // screen position of game pixel (0, 0)
  y: number;
  zoom: number;
}

/** The next zoom step up (+1) or down (-1), staying at the ends */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const index = ZOOM_STEPS.findIndex(step => step >= zoom);
  const current = index < 0 ? ZOOM_STEPS.length - 1 : index;
  const next = Math.max(0, Math.min(ZOOM_STEPS.length - 1, current + direction));
  return ZOOM_STEPS[next];
}

/** Change zoom keeping the game pixel under the screen point fixed, snapped so pixels land on whole screen pixels */
export function zoomAround(view: View, screenX: number, screenY: number, zoom: number): View {
  const worldX = (screenX - view.x) / view.zoom;
  const worldY = (screenY - view.y) / view.zoom;
  return snap({ x: screenX - worldX * zoom, y: screenY - worldY * zoom, zoom });
}

/** Fit a world into the screen at the largest whole step that shows all of it */
export function fitView(worldWidth: number, worldHeight: number, screenWidth: number, screenHeight: number): View {
  const fits = ZOOM_STEPS.filter(step => worldWidth * step <= screenWidth && worldHeight * step <= screenHeight);
  const zoom = fits.length ? fits[fits.length - 1] : ZOOM_STEPS[0];
  return snap({ x: (screenWidth - worldWidth * zoom) / 2, y: (screenHeight - worldHeight * zoom) / 2, zoom });
}

export function snap(view: View): View {
  return { x: Math.round(view.x), y: Math.round(view.y), zoom: view.zoom };
}

export function screenToWorld(view: View, screenX: number, screenY: number): [number, number] {
  return [(screenX - view.x) / view.zoom, (screenY - view.y) / view.zoom];
}
