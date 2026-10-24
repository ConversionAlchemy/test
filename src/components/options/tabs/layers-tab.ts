// Layers tab: a projection of the Layers registry. Renders the layer buttons and wires them up.
import type { LayerId } from "@/components/layers";
import { Layers } from "@/components/layers";
import { tip } from "@/components/tooltips";
import { LAYER_TOGGLES, underlineHotkey } from "@/data/layer-labels";
import { getMapView, onMapView, setMapView } from "@/fluoria/map-view";
import { fixColours } from "@/fluoria/owners";
import type { ViewName } from "@/fluoria/world-model";
import { ViewportLayers } from "@/renderers/viewport/viewport-renderer";
import { isCtrlClick } from "@/utils";
import { sentences, t } from "@/utils/i18n";
import { ensureEl } from "@/utils/nodeUtils";

// built-in layer presets, in the order the select shows them; the layer sets live in layers-presets
export const LAYER_PRESETS: Record<string, string> = {
  political: t("Political map"),
  cultural: t("Cultural map"),
  religions: t("Religions map"),
  provinces: t("Provinces map"),
  biomes: t("Biomes map"),
  heightmap: t("Heightmap"),
  physical: t("Physical map"),
  poi: t("Places of interest"),
  goods: t("Goods map"),
  trade: t("Trade animation"),
  military: t("Military map"),
  emblems: t("Emblems"),
  landmass: t("Pure landmass")
};

export { LAYER_TOGGLES } from "@/data/layer-labels";

export const getLayerByShortcut = (code: string): LayerId | undefined =>
  [...LAYER_TOGGLES].find(([, button]) => button.shortcut === code)?.[0];

// Fluoria's Map tab: a view (what the ground shows) and three toggles. Everything else is decided for you:
// labels and settlements show by zoom, the landscape layers are always on, and decorative layers are off
const VIEW_BUTTONS: [ViewName, string][] = [
  ["terrain", t("Terrain")],
  ["political", t("Political")]
];
const MORE_VIEWS: [ViewName, string][] = [
  ["provinces", t("Provinces")],
  ["cultures", t("Cultures")],
  ["religions", t("Religions")]
];
const TOGGLES: [LayerId, string][] = [
  ["routes", t("Roads")],
  ["military", t("Military")],
  ["markers", t("Markers")]
];

// on in every view, and off for good; the pixel map draws states, borders and provinces itself
const ALWAYS_ON: LayerId[] = ["labels", "burgIcons", "rivers", "lakes", "ice", "scaleBar", "states", "borders"];
const ALWAYS_OFF: LayerId[] = [
  "emblems",
  "journeys",
  "zones",
  "coordinates",
  "compass",
  "grid",
  "vignette",
  "cells",
  "rulers",
  "texture",
  "relief",
  "biomes",
  "provinces",
  "cultures",
  "religions"
];

const TEMPLATE = /* html */ `
  <div hidden>
    <select id="layersPreset">
      ${Object.entries(LAYER_PRESETS)
        .map(([id, label]) => `<option value="${id}">${label}</option>`)
        .join("")}
      <option value="custom">${t("Custom (not saved)")}</option>
    </select>
    <button id="savePresetButton"></button>
    <button id="removePresetButton"></button>
  </div>
  <p class="flHeading">${t("View")}</p>
  <div id="mapViews" class="flRow">
    ${VIEW_BUTTONS.map(([id, label]) => `<button type="button" data-view="${id}">${label}</button>`).join("")}
    <select id="moreViews" data-tip="${t("More views")}">
      <option value="">${t("More views")}…</option>
      ${MORE_VIEWS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}
    </select>
  </div>
  <button id="fixColours" type="button" class="flWide" data-tip="${t("Give neighbouring states that look alike clearly different colours")}">${t("Fix colours")}</button>
  <p class="flHeading">${t("Show")}</p>
  <ul id="mapLayers" class="layerGroup" data-tip="${sentences(t("Click to toggle"), t("Ctrl + click to edit layer style"))}"></ul>
`;

ensureEl("layersContent").innerHTML = TEMPLATE;

function render(): void {
  ensureEl("mapLayers").replaceChildren(
    ...TOGGLES.map(([id, label]) => {
      const button = LAYER_TOGGLES.get(id);
      const item = document.createElement("li");
      item.dataset.layer = id;
      if (button?.shortcut) item.dataset.shortcut = button.hint ?? button.shortcut.replace("Key", "");
      item.innerHTML = underlineHotkey({ ...(button ?? { label }), label });
      item.classList.toggle("buttonoff", !Layers.isOn(id));
      return item;
    })
  );
  const view = getMapView();
  for (const button of ensureEl("mapViews").querySelectorAll<HTMLButtonElement>("button"))
    button.classList.toggle("pressed", button.dataset.view === view);
  ensureEl<HTMLSelectElement>("moreViews").value = MORE_VIEWS.some(([id]) => id === view) ? view : "";
}

/** Keep the decided layers where they belong; quiet while Azgaar's heightmap editor has the map */
function settleLayers(): void {
  if (window.customization) return;
  const on = ALWAYS_ON.filter(id => Layers.has(id) && !Layers.isOn(id));
  const off = ALWAYS_OFF.filter(id => Layers.has(id) && Layers.isOn(id));
  if (on.length) Layers.show(...on);
  if (off.length) Layers.hide(...off);
}

ensureEl("mapLayers").addEventListener("click", event => {
  const id = (event.target as HTMLElement).closest("li")?.dataset.layer;
  if (!id || !Layers.has(id)) return;

  if (isCtrlClick(event) && !options.map.viewOnly) return void Controllers.StyleEditor.open(id);
  Layers.toggle(id);
});

ensureEl("fixColours").addEventListener("click", () => {
  const changed = fixColours();
  if (changed) Layers.draw("states");
  tip(
    changed ? t("{{count}} states recoloured", { count: changed }) : t("Neighbouring states already look distinct"),
    false,
    "success",
    3000
  );
});

ensureEl("mapViews").addEventListener("click", event => {
  const view = (event.target as HTMLElement).closest("button")?.dataset.view as ViewName | undefined;
  if (view) setMapView(view);
});
ensureEl<HTMLSelectElement>("moreViews").addEventListener("change", event => {
  const view = (event.target as HTMLSelectElement).value as ViewName;
  setMapView(view || "terrain");
});

// data overlays belong to the Data tab: a map opens without them
const OVERLAYS: LayerId[] = ["population", "heightmap", "temperature", "precipitation", "goods", "markets", "trade"];
window.addEventListener("map:generated", () => {
  const on = OVERLAYS.filter(id => Layers.has(id) && Layers.isOn(id));
  if (on.length) Layers.hide(...on);
});

Layers.subscribe(render);
Layers.subscribe(settleLayers);
Layers.subscribe(() => ViewportLayers.renderNow());
onMapView(render);

render();
