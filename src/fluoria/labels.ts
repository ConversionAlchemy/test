import type { View } from "./camera";

export interface MapLabel {
  id: string;
  text: string;
  x: number; // game pixels; the label is centred here
  y: number;
  priority: number; // higher wins a collision
  size: number; // font size in screen pixels before the pixel doubling
  minZoom?: number; // hidden below this zoom
  maxZoom?: number; // hidden above this zoom
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Decide which labels to show: most important first, skipping any that would overlap one already
 * placed or fall off screen. `measure` returns a label's size in screen pixels.
 */
export function placeLabels(
  labels: readonly MapLabel[],
  view: View,
  screen: { width: number; height: number },
  measure: (label: MapLabel) => { width: number; height: number },
  gap = 4
): Set<string> {
  const placed: Box[] = [];
  const shown = new Set<string>();
  const ordered = [...labels].sort((a, b) => b.priority - a.priority);
  for (const label of ordered) {
    if (label.minZoom !== undefined && view.zoom < label.minZoom) continue;
    if (label.maxZoom !== undefined && view.zoom > label.maxZoom) continue;
    const { width, height } = measure(label);
    const cx = view.x + label.x * view.zoom;
    const cy = view.y + label.y * view.zoom;
    const box = {
      x0: cx - width / 2 - gap,
      y0: cy - height / 2 - gap,
      x1: cx + width / 2 + gap,
      y1: cy + height / 2 + gap
    };
    if (box.x1 < 0 || box.y1 < 0 || box.x0 > screen.width || box.y0 > screen.height) continue;
    if (placed.some(other => box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0))
      continue;
    placed.push(box);
    shown.add(label.id);
  }
  return shown;
}
