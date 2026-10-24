// Road drawing and editing for the pixel view. Roads are Azgaar routes in map coordinates; the view works in game
// pixels (map × WORLD_SCALE), so everything here converts at the edges
import { screenToWorld } from "@/fluoria/camera";
import { Palette } from "@/fluoria/palette";
import type { PixelRaster } from "@/fluoria/raster";
import {
  createRoute,
  crossedPlace,
  deleteRoute,
  findRoute,
  moveRoutePoints,
  type Place,
  type Point,
  pickNode,
  pickRoute,
  ROUTE_LEVELS,
  type RouteGroup,
  renameRoute,
  setRouteGroup,
  snapToPlace
} from "@/fluoria/routes";
import type { PixelStage } from "@/fluoria/stage";
import { routeStamp, WORLD_SCALE } from "@/fluoria/world";

const SETTLEMENT_RADIUS = 8; // screen pixels around a settlement marker that count as "at" it
const PICK_TOLERANCE = 7; // screen pixels
const hex = (c: readonly number[]) => (c[0] << 16) | (c[1] << 8) | c[2];

export class RoadTool {
  mode: "draw" | "select" = "draw";
  group: RouteGroup = "roads";
  private drawing: Point[] = [];
  private drawingStart: number | null = null; // settlement the road being drawn starts at
  private hover: Point | null = null;
  private selected: number | null = null;
  private selectedNode = -1;
  private dragging: Point[] | null = null; // the selected road's points while a node is dragged

  constructor(
    private stage: PixelStage,
    private raster: PixelRaster,
    private places: Place[], // settlements, map coordinates
    private panel: HTMLElement,
    private say: (message: string) => void
  ) {
    stage.onView = () => this.redraw();
  }

  /** Left button pressed in a road mode; screen coordinates */
  press(sx: number, sy: number): void {
    const point = this.toMap(sx, sy);
    if (this.mode === "draw") this.addNode(point);
    else this.pick(sx, sy, point);
    this.redraw();
  }

  move(sx: number, sy: number): void {
    const point = this.toMap(sx, sy);
    this.hover = point;
    if (this.dragging && this.selectedNode >= 0) {
      const last = this.selectedNode === 0 || this.selectedNode === this.dragging.length - 1;
      const place = last ? snapToPlace(point, this.places, this.radius()) : null;
      this.dragging[this.selectedNode] = place ? [place.x, place.y] : point;
    }
    this.redraw();
  }

  release(): void {
    if (this.dragging && this.selected !== null) {
      moveRoutePoints(this.selected, this.dragging);
      this.restamp(this.selected);
    }
    this.dragging = null;
    this.redraw();
  }

  /** Double click: finish the road being drawn, or add a node where a selected road was clicked */
  doubleClick(sx: number, sy: number): void {
    if (this.mode === "draw") {
      this.finish();
      return;
    }
    const route = this.selected === null ? null : findRoute(this.selected);
    if (!route) return;
    const hit = pickRoute(this.toMap(sx, sy), [{ id: route.i, points: points(route) }], this.tolerance());
    if (!hit) return;
    const next = points(route);
    next.splice(hit.segment + 1, 0, this.toMap(sx, sy));
    moveRoutePoints(route.i, next);
    this.selectedNode = hit.segment + 1;
    this.restamp(route.i);
    this.redraw();
  }

  /** Keys the tool uses; returns true when handled so the view doesn't also act (Escape would close it) */
  key(event: KeyboardEvent): boolean {
    if (this.drawing.length) {
      if (event.key === "Escape") this.cancel();
      else if (event.key === "Enter") this.finish();
      else if (event.key === "Backspace") this.drawing.pop();
      else return false;
      if (!this.drawing.length) this.drawingStart = null;
      this.redraw();
      return true;
    }
    if (this.selected !== null && (event.key === "Delete" || event.key === "Backspace") && !isTyping(event)) {
      this.removeNode();
      return true;
    }
    if (this.selected !== null && event.key === "Escape") {
      this.select(null);
      return true;
    }
    return false;
  }

  setMode(mode: "draw" | "select", group?: RouteGroup): void {
    this.cancel();
    this.mode = mode;
    if (group) this.group = group;
    if (mode === "draw") this.select(null);
    this.redraw();
  }

  /** Leaving road tools: drop half-drawn roads and the selection */
  reset(): void {
    this.cancel();
    this.select(null);
    this.hover = null;
    this.redraw();
  }

  private addNode(point: Point): void {
    const place = snapToPlace(point, this.places, this.radius());
    const at: Point = place ? [place.x, place.y] : point;
    const last = this.drawing.at(-1);
    if (last) {
      const ends = [this.drawingStart ?? -1, place?.id ?? -1];
      const blocked = crossedPlace(last, at, this.places, this.radius() * 0.8, ends);
      if (blocked) {
        this.say(`Roads stop at settlements: end this one at ${placeName(blocked.id)} first`);
        return;
      }
    } else this.drawingStart = place?.id ?? null;
    this.drawing.push(at);
    if (place && this.drawing.length > 1 && place.id !== this.drawingStart)
      this.finish(); // reached a settlement
    else
      this.say(
        this.drawing.length === 1
          ? "Click to add bends · click a settlement or double-click to finish · Backspace undoes · Escape cancels"
          : `${this.drawing.length} points`
      );
  }

  private finish(): void {
    if (this.drawing.length < 2) {
      this.cancel();
      return;
    }
    const id = createRoute(this.drawing, this.group);
    this.drawing = [];
    this.drawingStart = null;
    this.restamp(id);
    this.mode = "select";
    this.select(id);
    this.say(`Created ${findRoute(id)?.name ?? "road"} · drag its points to reshape, double-click it to add a point`);
    this.panel.dispatchEvent(new CustomEvent("modechange"));
  }

  private cancel(): void {
    this.drawing = [];
    this.drawingStart = null;
  }

  private pick(sx: number, sy: number, point: Point): void {
    const route = this.selected === null ? null : findRoute(this.selected);
    if (route) {
      const node = pickNode(point, points(route), this.tolerance());
      if (node >= 0) {
        this.selectedNode = node;
        this.dragging = points(route);
        return;
      }
    }
    const roads = pack.routes.filter(r => r.group !== "searoutes").map(r => ({ id: r.i, points: points(r) }));
    const hit = pickRoute(this.toMap(sx, sy), roads, this.tolerance());
    this.select(hit ? hit.id : null);
  }

  private removeNode(): void {
    const route = this.selected === null ? null : findRoute(this.selected);
    if (!route || this.selectedNode < 0) return;
    if (route.points.length <= 2) {
      this.say("A road needs two points; use Delete road to remove it");
      return;
    }
    const next = points(route);
    next.splice(this.selectedNode, 1);
    moveRoutePoints(route.i, next);
    this.selectedNode = -1;
    this.restamp(route.i);
    this.redraw();
  }

  private select(id: number | null): void {
    this.selected = id;
    this.selectedNode = -1;
    this.dragging = null;
    this.renderPanel();
  }

  /** The side panel for the selected road: name, level, delete */
  private renderPanel(): void {
    const route = this.selected === null ? null : findRoute(this.selected);
    this.panel.hidden = !route;
    if (!route) return;
    const options = ROUTE_LEVELS.map(
      level => `<option value="${level.group}"${level.group === route.group ? " selected" : ""}>${level.name}</option>`
    ).join("");
    this.panel.innerHTML = `
      <label>Name <input id="flRoadName" value="${escapeHtml(route.name ?? "")}" /></label>
      <label>Type <select id="flRoadLevel">${options}</select></label>
      <div class="fl-row"><button type="button" id="flRoadDelete">Delete road</button>
      <button type="button" id="flRoadDone">Done</button></div>
      <p class="fl-hint">Drag points to reshape · double-click the road to add a point · select a point and press Delete to remove it</p>`;
    const name = this.panel.querySelector<HTMLInputElement>("#flRoadName");
    if (name) name.onchange = () => renameRoute(route.i, name.value);
    const level = this.panel.querySelector<HTMLSelectElement>("#flRoadLevel");
    if (level)
      level.onchange = () => {
        setRouteGroup(route.i, level.value as RouteGroup);
        this.restamp(route.i);
      };
    const remove = this.panel.querySelector<HTMLButtonElement>("#flRoadDelete");
    if (remove)
      remove.onclick = () => {
        if (remove.dataset.confirm) {
          deleteRoute(route.i);
          this.restamp(route.i);
          this.select(null);
          this.redraw();
          this.say("Road deleted");
        } else {
          remove.dataset.confirm = "1";
          remove.textContent = "Click again to delete";
        }
      };
    const done = this.panel.querySelector<HTMLButtonElement>("#flRoadDone");
    if (done)
      done.onclick = () => {
        this.select(null);
        this.redraw();
      };
  }

  /** Swap the route's pixels for its current shape (or remove them) and recolour both footprints */
  private restamp(id: number): void {
    const stamps = this.raster.stamps as (PixelRaster["stamps"][number] & { route?: number })[];
    const old = stamps.find(stamp => stamp.route === id);
    if (old) this.raster.markDirty(old.x0, old.y0, old.x1, old.y1);
    const route = findRoute(id);
    const fresh = route ? routeStamp(route) : null;
    this.raster.stamps = stamps.filter(stamp => stamp.route !== id).concat(fresh ? [fresh] : []);
    if (fresh) this.raster.markDirty(fresh.x0, fresh.y0, fresh.x1, fresh.y1);
    this.stage.refresh();
  }

  redraw(): void {
    const g = this.stage.overlay;
    g.clear();
    const view = this.stage.view;
    const toScreen = ([x, y]: Point): Point => [
      view.x + x * WORLD_SCALE * view.zoom,
      view.y + y * WORLD_SCALE * view.zoom
    ];
    const line = (pts: Point[], color: number, width: number) => {
      if (pts.length < 2) return;
      const [first, ...rest] = pts.map(toScreen);
      g.moveTo(first[0], first[1]);
      for (const [x, y] of rest) g.lineTo(x, y);
      g.stroke({ width, color, alpha: 0.9 });
    };
    const nodes = (pts: Point[], active: number) =>
      pts.map(toScreen).forEach(([x, y], index) => {
        g.rect(Math.round(x) - 3, Math.round(y) - 3, 7, 7)
          .fill(index === active ? hex(Palette.gold) : hex(Palette.paper))
          .stroke({ width: 1, color: hex(Palette.ink) });
      });
    if (this.drawing.length) {
      const preview = this.hover ? [...this.drawing, this.hover] : this.drawing;
      line(preview, hex(Palette.gold), 2);
      nodes(this.drawing, -1);
    }
    const route = this.selected === null ? null : findRoute(this.selected);
    if (route) {
      const pts = this.dragging ?? points(route);
      line(pts, hex(Palette.gold), 3);
      nodes(pts, this.selectedNode);
    }
  }

  private toMap(sx: number, sy: number): Point {
    const [x, y] = screenToWorld(this.stage.view, sx, sy);
    return [x / WORLD_SCALE, y / WORLD_SCALE];
  }

  private radius(): number {
    return SETTLEMENT_RADIUS / this.stage.view.zoom / WORLD_SCALE;
  }

  private tolerance(): number {
    return PICK_TOLERANCE / this.stage.view.zoom / WORLD_SCALE;
  }
}

const points = (route: { points: number[][] }): Point[] => route.points.map(([x, y]) => [x, y]);
const placeName = (id: number) => pack.burgs[id]?.label?.text || pack.burgs[id]?.name || "the settlement";
const isTyping = (event: KeyboardEvent) => (event.target as HTMLElement | null)?.tagName === "INPUT";
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
