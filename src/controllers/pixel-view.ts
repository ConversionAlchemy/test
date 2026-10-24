// Pixel engine test bench: paint terrain and battle damage on a sample coast at whole-number zooms.
// Opened with ?view=pixel-test; Escape closes. The map itself is drawn in pixels by fluoria/pixel-map
import { clearOverlay, paintTerrain, stampOverlay } from "@/fluoria/brushes";
import { fitView, screenToWorld, snap, stepZoom, zoomAround } from "@/fluoria/camera";
import { css, Palette } from "@/fluoria/palette";
import type { PixelRaster } from "@/fluoria/raster";
import { buildSampleScene } from "@/fluoria/sample-scene";
import { PixelStage } from "@/fluoria/stage";
import { isLine, OVERLAYS, type OverlayId, TERRAINS, type TerrainId } from "@/fluoria/terrain";

type Tool = { kind: "terrain"; id: TerrainId } | { kind: "overlay"; id: OverlayId } | { kind: "clean" };

const BRUSH_SIZES = [1, 3, 6, 12];

let root: HTMLElement | null = null;
let stage: PixelStage | null = null;
let raster: PixelRaster | null = null;
let tool: Tool = { kind: "terrain", id: TERRAINS[4].id };
let brush = 3;
let seed = 7;
let spaceHeld = false;

async function open(): Promise<void> {
  if (root) return;
  root = document.createElement("div");
  root.className = "fl-root";
  root.innerHTML = `<style>${STYLE}</style>
    <div class="fl-bar">
      <strong class="fl-title">Pixel view</strong>
      <div class="fl-group" data-group="terrain"></div>
      <div class="fl-group" data-group="overlay"></div>
      <div class="fl-group" data-group="size"><span class="fl-label">Brush</span></div>
      <div class="fl-group">
        <button type="button" data-zoom="-1" aria-label="Zoom out">−</button>
        <span class="fl-zoom"></span>
        <button type="button" data-zoom="1" aria-label="Zoom in">+</button>
      </div>
      <button type="button" class="fl-new">New coast</button>
      <button type="button" class="fl-close" aria-label="Close">×</button>
    </div>
    <div class="fl-host"></div>
    <div class="fl-status"></div>`;
  document.body.appendChild(root);
  buildToolbar(root);

  const host = root.querySelector<HTMLElement>(".fl-host");
  if (!host) return;
  stage = new PixelStage();
  await stage.init(host);
  newScene();
  bindPointer(stage);
  say("");
  document.addEventListener("keydown", onKey);
  document.addEventListener("keyup", onKeyUp);
}

function close(): void {
  document.removeEventListener("keydown", onKey);
  document.removeEventListener("keyup", onKeyUp);
  stage?.destroy();
  root?.remove();
  stage = raster = root = null;
}

const HINT = "Left drag paints · right drag or space+drag pans · wheel zooms · Escape closes";

/** Status line: a tool's message, or the standing hint */
function say(message: string): void {
  const status = root?.querySelector(".fl-status");
  if (!status) return;
  status.textContent = message || HINT;
}

function newScene(): void {
  if (!stage) return;
  const scene = buildSampleScene(seed);
  raster = scene.raster;
  stage.setRaster(raster);
  stage.setLabels(scene.labels);
  setView(fitView(raster.width, raster.height, stage.width, stage.height));
  const title = root?.querySelector(".fl-title");
  if (title) title.textContent = "Sample coast";
}

function setView(view: Parameters<PixelStage["setView"]>[0]): void {
  stage?.setView(view);
  const label = root?.querySelector(".fl-zoom");
  if (label) label.textContent = view.zoom < 1 ? `${Math.round(view.zoom * 100)}%` : `${view.zoom}×`;
}

function buildToolbar(container: HTMLElement): void {
  const terrainGroup = container.querySelector('[data-group="terrain"]');
  const overlayGroup = container.querySelector('[data-group="overlay"]');
  const sizeGroup = container.querySelector('[data-group="size"]');
  // roads, rivers and paving are map data or city detail, not land you paint
  for (const t of TERRAINS.filter(t => !isLine(t.id)))
    terrainGroup?.appendChild(toolButton(t.name, css(t.swatch), { kind: "terrain", id: t.id }));
  for (const o of OVERLAYS) overlayGroup?.appendChild(toolButton(o.name, css(o.swatch), { kind: "overlay", id: o.id }));
  overlayGroup?.appendChild(toolButton("Clean", css(Palette.g2), { kind: "clean" }));
  for (const size of BRUSH_SIZES) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(size);
    button.dataset.size = String(size);
    button.classList.toggle("fl-on", size === brush);
    button.onclick = () => {
      brush = size;
      for (const b of container.querySelectorAll<HTMLElement>("[data-size]"))
        b.classList.toggle("fl-on", b.dataset.size === String(size));
    };
    sizeGroup?.appendChild(button);
  }
  for (const b of container.querySelectorAll<HTMLButtonElement>("[data-zoom]"))
    b.onclick = () => zoomBy(Number(b.dataset.zoom) as 1 | -1);
  const fresh = container.querySelector<HTMLButtonElement>(".fl-new");
  if (fresh)
    fresh.onclick = () => {
      seed += 1;
      newScene();
    };
  const closer = container.querySelector<HTMLButtonElement>(".fl-close");
  if (closer) closer.onclick = close;
  markActive(container);
}

function toolButton(name: string, color: string, value: Tool): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.title = name;
  button.className = "fl-tool";
  button.dataset.tool = toolKey(value);
  button.innerHTML = `<i style="background:${color}"></i>${name}`;
  button.onclick = () => {
    tool = value;
    if (root) markActive(root);
  };
  return button;
}

const toolKey = (value: Tool): string => (value.kind === "clean" ? "clean" : `${value.kind}:${value.id}`);

function markActive(container: HTMLElement): void {
  for (const b of container.querySelectorAll<HTMLElement>("[data-tool]"))
    b.classList.toggle("fl-on", b.dataset.tool === toolKey(tool));
}

function zoomBy(direction: 1 | -1, screenX?: number, screenY?: number): void {
  if (!stage) return;
  const zoom = stepZoom(stage.view.zoom, direction);
  setView(zoomAround(stage.view, screenX ?? stage.width / 2, screenY ?? stage.height / 2, zoom));
}

function applyTool(x: number, y: number): void {
  if (!raster) return;
  if (tool.kind === "terrain") paintTerrain(raster, x, y, brush, tool.id);
  else if (tool.kind === "overlay") stampOverlay(raster, tool.id, x, y, Math.max(3, brush * 1.5));
  else clearOverlay(raster, x, y, brush + 1);
}

function bindPointer(target: PixelStage): void {
  const canvas = target.app.canvas;
  let drag: { mode: "paint" | "pan"; x: number; y: number } | null = null;
  canvas.addEventListener("contextmenu", event => event.preventDefault());
  canvas.addEventListener("pointerdown", event => {
    canvas.setPointerCapture(event.pointerId);
    const pan = event.button !== 0 || spaceHeld;
    drag = { mode: pan ? "pan" : "paint", x: event.offsetX, y: event.offsetY };
    if (!pan) paintAt(event.offsetX, event.offsetY);
  });
  canvas.addEventListener("pointermove", event => {
    if (!drag) return;
    if (drag.mode === "pan") {
      const v = target.view;
      setView(snap({ x: v.x + event.offsetX - drag.x, y: v.y + event.offsetY - drag.y, zoom: v.zoom }));
    } else if (tool.kind !== "overlay") strokeBetween(drag.x, drag.y, event.offsetX, event.offsetY);
    drag.x = event.offsetX;
    drag.y = event.offsetY;
  });
  canvas.addEventListener("pointerup", () => {
    drag = null;
  });
  canvas.addEventListener(
    "wheel",
    event => {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1 : -1, event.offsetX, event.offsetY);
    },
    { passive: false }
  );

  function paintAt(sx: number, sy: number): void {
    const [x, y] = screenToWorld(target.view, sx, sy);
    applyTool(Math.floor(x), Math.floor(y));
    target.refresh();
  }

  function strokeBetween(x0: number, y0: number, x1: number, y1: number): void {
    const [ax, ay] = screenToWorld(target.view, x0, y0);
    const [bx, by] = screenToWorld(target.view, x1, y1);
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / Math.max(1, brush / 2)));
    for (let k = 1; k <= steps; k++)
      applyTool(Math.floor(ax + ((bx - ax) * k) / steps), Math.floor(ay + ((by - ay) * k) / steps));
    target.refresh();
  }
}

function onKey(event: KeyboardEvent): void {
  if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
  if (event.code === "Space") spaceHeld = true;
  else if (event.key === "Escape") close();
  else if (event.key === "+" || event.key === "=") zoomBy(1);
  else if (event.key === "-") zoomBy(-1);
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.code === "Space") spaceHeld = false;
}

const STYLE = `
@font-face { font-family: VT323; src: url(${import.meta.env.BASE_URL}fonts/VT323.ttf); }
.fl-root { position: fixed; inset: 0; z-index: 10000; display: flex; flex-direction: column;
  background: ${css(Palette.night)}; color: ${css(Palette.paper)}; font: 18px/1 VT323, monospace; }
.fl-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; padding: 6px 10px;
  background: ${css(Palette.ink)}; border-bottom: 2px solid #000; }
.fl-title { font-size: 22px; font-weight: normal; color: ${css(Palette.gold)}; }
.fl-group { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.fl-label { opacity: 0.7; margin-right: 2px; }
.fl-root button { font: inherit; color: inherit; background: #2a262c; border: 2px solid #000; padding: 2px 7px;
  cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
.fl-root button:hover { background: #3a353d; }
.fl-root button:focus-visible { outline: 2px solid ${css(Palette.gold)}; }
.fl-root button.fl-on { background: ${css(Palette.gold2)}; color: ${css(Palette.ink)}; }
.fl-tool i { width: 12px; height: 12px; border: 1px solid #000; display: inline-block; }
.fl-zoom { min-width: 30px; text-align: center; }
.fl-close { margin-left: auto; font-size: 22px; }
.fl-host { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.fl-status { padding: 4px 10px; background: ${css(Palette.ink)}; opacity: 0.85; min-height: 26px; }
.fl-panel { position: absolute; top: 10px; right: 10px; z-index: 2; width: 250px; display: grid; gap: 8px; padding: 10px;
  background: ${css(Palette.ink)}; border: 2px solid #000; }
.fl-panel[hidden] { display: none; }
.fl-panel label { display: grid; gap: 3px; }
.fl-panel input, .fl-panel select { font: inherit; color: ${css(Palette.ink)}; background: ${css(Palette.paper)};
  border: 2px solid #000; padding: 2px 4px; }
.fl-panel .fl-row { display: flex; gap: 6px; flex-wrap: wrap; }
.fl-panel .fl-hint { margin: 0; opacity: 0.7; font-size: 16px; line-height: 1.1; }
`;

export const PixelView = { open, close };
