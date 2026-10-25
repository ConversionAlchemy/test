// Eager, tiny: wires Azgaar's layer and zoom events to the pixel map, which loads (with PixiJS) on first draw

import { Icons } from "@/components/icons";
import { Layers } from "@/components/layers";
import { tip } from "@/components/tooltips";
import { viewport } from "@/components/viewport";
import { Controllers } from "@/controllers";
import { ensureHitLayer, NATION_ZOOM } from "./cell-card";
import { applyFluoriaEmblems } from "./emblems/store";
import { raiseBeside } from "./forces/army";
import { convertUnitTypes, normalise } from "./forces/forces";
import { applyLabelZoom } from "./label-zoom";
import { onMapView } from "./map-view";
import { setFocus, simplifyDiplomacy } from "./nation";
import { nationZoom, refreshNation } from "./nation-panel";
import { foldMap } from "./one-grid";
import { collectIslands, drawIslands } from "./owners";
import {
  setPixelMapDimmer,
  setPixelMapHighlighter,
  setPixelMapNationHighlighter,
  setPixelMapRoads,
  setPixelMapSync
} from "./pixel-map-sync";
import { collectSeas } from "./sea-names";
import { applyUnitZoom, snapAll, snapMarkers, stackAll } from "./units";

type PixelMapModule = typeof import("./pixel-map")["PixelMapLayer"];

let loaded: PixelMapModule | null = null;
let loading: Promise<PixelMapModule> | null = null;

const load = (): Promise<PixelMapModule> => {
  loading ??= import("./pixel-map").then(m => {
    loaded = m.PixelMapLayer;
    const map = loaded;
    setPixelMapSync(() => {
      map.sync();
      nationZoom(viewport.scale, NATION_ZOOM);
      applyLabelZoom();
      applyUnitZoom(viewport.scale);
      drawIslands();
    });
    setPixelMapDimmer(map.dim);
    setPixelMapHighlighter(map.highlight);
    setPixelMapNationHighlighter(map.highlightNation);
    setPixelMapRoads({ draw: map.drawRoads, edit: map.showRoadEdit });
    watchRoutes(map.drawRoads);
    onMapView(() => map.restyle());
    return loaded;
  });
  return loading;
};

Layers.onDraw(ids => {
  ensureHitLayer();
  labelsOverUnits();
  if (ids.includes("labels")) applyLabelZoom();
  if (ids.some(id => id === "states" || id === "labels")) collectIslands();
  if (ids.some(id => id === "states" || id === "military")) refreshNation();
  if (ids.includes("labels")) collectSeas();
  if (ids.includes("military") && Layers.isOn("military")) {
    if (snapAll())
      queueMicrotask(() => Layers.draw("military")); // every regiment stands at its cell's centre
    else {
      applyUnitZoom(viewport.scale);
      stackAll();
      void Controllers.RegimentEditor.bind(); // regiments drag at any time
    }
  }
  if (ids.some(id => id === "states" || id === "borders") && coloursChanged())
    queueMicrotask(() => {
      // units and markers wear their nation's colour
      if (Layers.isOn("military")) Layers.draw("military");
      if (Layers.isOn("markers")) Layers.draw("markers");
    });
  if (ids.includes("markers") && Layers.isOn("markers") && snapMarkers()) queueMicrotask(() => Layers.draw("markers")); // markers stand at their cell's centre
  void load().then(map => map.drawn(ids));
});
Layers.subscribe(() => loaded?.toggled());

let colours = "";
function coloursChanged(): boolean {
  const now = (pack.states ?? []).map(s => s?.color ?? "").join();
  if (now === colours) return false;
  colours = now;
  return true;
}

// every map, made or loaded, is brought onto the one grid once
// its diplomacy kept to ally, neutral, enemy, vassal and overlord, and its forces to the Fluoria units and rules
window.addEventListener("map:generated", () => {
  setFocus(0);
  const { moved, clashes } = foldMap();
  const relations = simplifyDiplomacy();
  const converted = convertUnitTypes(emoji => Icons.glyph(emoji));
  const split = normalise(raiseBeside);
  const emblems = applyFluoriaEmblems();
  Layers.draw("burgIcons", "labels", "military", "markers", "routes");
  const lines = [
    moved.length
      ? `${moved.length} settlements moved onto their cell's centre (${moved.slice(0, 6).join(", ")}${moved.length > 6 ? "…" : ""}).`
      : "",
    clashes.length ? `Left in place (their cell already has a settlement): ${clashes.join(", ")}.` : "",
    relations ? `${relations} relations set to neutral (friendly, suspicious, rival or unknown).` : "",
    converted ? "Military units converted to the Fluoria unit types." : "",
    split ? `${split} groups split off to keep every army within 12 slots.` : "",
    emblems ? `${emblems} nations given their Fluoria emblem.` : ""
  ].filter(Boolean);
  if (!lines.length) return;
  console.info(`Fluoria: ${lines.join(" ")}`, moved.length ? `Moved: ${moved.join(", ")}` : "");
  tip(lines.join(" "), true, "info", 15000);
});

/** Azgaar's own route editors redraw the svg route; the road layer follows on the next frame */
function watchRoutes(draw: () => void): void {
  let frame = 0;
  const watch = () => {
    const routes = document.getElementById("routes");
    if (!routes) return;
    new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }).observe(routes, { childList: true, subtree: true, attributes: true, attributeFilter: ["d"] });
  };
  watch();
  window.addEventListener("map:generated", () => setTimeout(watch));
}

/** Names are read first: the labels layer always sits above regiments */
function labelsOverUnits(): void {
  const armies = document.getElementById("armies");
  const labels = document.getElementById("labels");
  if (!armies || !labels || armies.parentNode !== labels.parentNode) return;
  if (armies.compareDocumentPosition(labels) & Node.DOCUMENT_POSITION_PRECEDING)
    queueMicrotask(() => Layers.move("military", "labels"));
}
