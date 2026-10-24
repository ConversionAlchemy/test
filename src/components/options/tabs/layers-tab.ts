// Layers tab: a projection of the Layers registry. Renders the layer buttons and wires them up.
import type { LayerId } from "@/components/layers";
import { Layers } from "@/components/layers";
import { LAYER_TOGGLES, underlineHotkey } from "@/data/layer-labels";
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

// Fluoria's Map tab: layers grouped by what they show, data overlays as one choice
const GROUPS: [title: string, ids: LayerId[]][] = [
  [t("Borders"), ["states", "provinces", "cultures", "religions", "zones", "borders"]],
  [t("Geography"), ["rivers", "lakes", "routes", "ice"]],
  [t("Places"), ["labels", "burgIcons", "markers", "emblems", "military", "journeys"]],
  [t("Frame"), ["scaleBar", "vignette", "grid", "coordinates", "compass", "rulers", "cells"]]
];

const DATA_LAYERS: [id: LayerId, label: string][] = [
  ["temperature", t("Temperature")],
  ["precipitation", t("Moisture")],
  ["population", t("Population")],
  ["heightmap", t("Elevation")],
  ["goods", t("Goods")],
  ["markets", t("Markets")],
  ["trade", t("Trade")]
];

const LABEL_OVERRIDES: Partial<Record<LayerId, string>> = { burgIcons: t("Settlements") };

const TEMPLATE = /* html */ `
  <p data-tip="${t("Select a map layers preset")}" style="display: inline-block">${t("Preset")}:</p>
  <select data-tip="${t("Select a map layers preset")}" id="layersPreset" style="width: 45%">
    ${Object.entries(LAYER_PRESETS)
      .map(([id, label]) => `<option value="${id}">${label}</option>`)
      .join("")}
    <option hidden value="custom">${t("Custom (not saved)")}</option>
  </select>
  <button
    id="savePresetButton"
    data-tip="${t("Click to save displayed layers as a new preset")}"
    class="icon-plus sideButton"
    style="display: none"
  ></button>
  <button
    id="removePresetButton"
    data-tip="${t("Remove")}"
    class="icon-minus sideButton"
    style="display: none"
  ></button>
  <div id="mapLayers" data-tip="${sentences(t("Click to toggle"), t("Ctrl + click to edit layer style"))}">
    ${GROUPS.map(([title], index) => `<p>${title}</p><ul class="layerGroup" data-group="${index}"></ul>`).join("")}
  </div>
  <p>${t("Show data")}</p>
  <select id="showData" data-tip="${t("Show one kind of data over the map")}">
    <option value="">${t("None")}</option>
    ${DATA_LAYERS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}
  </select>
`;

ensureEl("layersContent").innerHTML = TEMPLATE;

function layerButton(id: LayerId): HTMLLIElement | null {
  const button = LAYER_TOGGLES.get(id);
  if (!button) return null;
  const label = LABEL_OVERRIDES[id] ?? button.label;
  const item = document.createElement("li");
  item.dataset.layer = id;
  item.dataset.tip = sentences(
    t("{{layer}}: click to toggle", { layer: label }),
    t("Ctrl + click to edit layer style")
  );
  if (button.shortcut) item.dataset.shortcut = button.hint ?? button.shortcut.replace("Key", "");
  item.innerHTML = underlineHotkey({ ...button, label });
  item.classList.toggle("buttonoff", !Layers.isOn(id));
  return item;
}

function render(): void {
  for (const [index, [, ids]] of GROUPS.entries()) {
    const list = ensureEl("mapLayers").querySelector(`[data-group="${index}"]`);
    list?.replaceChildren(...ids.flatMap(id => layerButton(id) ?? []));
  }
  const shown = DATA_LAYERS.find(([id]) => Layers.isOn(id));
  ensureEl<HTMLSelectElement>("showData").value = shown?.[0] ?? "";
}

ensureEl("mapLayers").addEventListener("click", event => {
  const id = (event.target as HTMLElement).closest("li")?.dataset.layer;
  if (!id || !Layers.has(id)) return;

  if (isCtrlClick(event) && !options.map.viewOnly) return void Controllers.StyleEditor.open(id);
  Layers.toggle(id);
});

ensureEl<HTMLSelectElement>("showData").addEventListener("change", event => {
  const chosen = (event.target as HTMLSelectElement).value;
  const others = DATA_LAYERS.map(([id]) => id).filter(id => id !== chosen && Layers.isOn(id));
  if (others.length) Layers.hide(...others);
  if (Layers.has(chosen) && !Layers.isOn(chosen)) Layers.show(chosen);
});

Layers.subscribe(render);
Layers.subscribe(() => ViewportLayers.renderNow());

render();
