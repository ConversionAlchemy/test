// Data tab: reading the world. A topic shows its overlay on the map and opens Data Charts on the matching chart;
// plotting another chart moves the map with it, and closing the charts puts the map back
import { type LayerId, Layers } from "@/components/layers";
import { MAP_COMMANDS } from "@/components/map-commands";
import { getMapView, setMapView, setOutlineOnly } from "@/fluoria/map-view";
import type { ViewName } from "@/fluoria/world-model";
import { t } from "@/utils/i18n";
import { ensureEl } from "@/utils/nodeUtils";

interface Topic {
  label: string;
  entity: string;
  plotBy: string;
  groupBy?: string;
}

const TOPICS: Record<string, Topic> = {
  population: { label: t("Population"), entity: "states", plotBy: "total_population", groupBy: "cultures" },
  temperature: { label: t("Temperature"), entity: "biomes", plotBy: "average_temperature" },
  moisture: { label: t("Moisture"), entity: "biomes", plotBy: "average_precipitation" },
  elevation: { label: t("Elevation"), entity: "states", plotBy: "average_elevation" },
  production: { label: t("Production"), entity: "goods", plotBy: "production_value" },
  trade: { label: t("Trade"), entity: "markets", plotBy: "burgs_profit" },
  land: { label: t("Land"), entity: "states", plotBy: "area" }
};

// the overlay each chart metric is drawn with on the map; none means the view's own colours carry it
const OVERLAY_OF: [RegExp, LayerId[]][] = [
  [/population/, ["population"]],
  [/elevation/, ["heightmap"]],
  [/temperature/, ["temperature"]],
  [/precipitation/, ["precipitation"]],
  [/production/, ["goods"]],
  [/profit/, ["markets", "trade"]]
];
const OVERLAYS: LayerId[] = ["population", "heightmap", "temperature", "precipitation", "goods", "markets", "trade"];

const VIEW_OF: Record<string, ViewName> = {
  states: "political",
  provinces: "provinces",
  cultures: "cultures",
  religions: "religions"
};

const OVERVIEWS: [string, string][] = [
  ["editStatesButton", t("States")],
  ["editProvincesButton", t("Provinces")],
  ["editCulturesButton", t("Cultures")],
  ["editReligions", t("Religions")],
  ["overviewBurgsButton", t("Settlements")],
  ["overviewMilitaryButton", t("Military")],
  ["editDiplomacyButton", t("Diplomacy")],
  ["overviewMarketsButton", t("Markets")],
  ["editGoods", t("Goods")],
  ["overviewRiversButton", t("Rivers")],
  ["overviewRoutesButton", t("Routes")],
  ["overviewMarkersButton", t("Markers")],
  ["overviewLabelsButton", t("Labels")],
  ["overviewFeaturesButton", t("Features")],
  ["overviewChartsButton", t("Charts")]
];

const TEMPLATE = /* html */ `
  <p class="flHeading">${t("On the map")}</p>
  <div id="dataTopics" class="grid">
    ${Object.entries(TOPICS)
      .map(([id, { label }]) => `<button type="button" data-topic="${id}">${label}</button>`)
      .join("")}
  </div>
  <p class="flHeading">${t("Overviews")}</p>
  <div id="dataOverviews" class="grid">
    ${OVERVIEWS.map(([id, label]) => `<button type="button" data-command="${id}">${label}</button>`).join("")}
  </div>
`;

ensureEl("dataContent").innerHTML = TEMPLATE;

// what the map looked like before a topic changed it, to put back when the charts close
let before: { view: ViewName; overlays: LayerId[] } | null = null;
let active: string | null = null;
let charts: typeof import("@/controllers/charts-overview")["ChartsOverview"] | null = null;

async function openTopic(id: string): Promise<void> {
  const topic = TOPICS[id];
  if (!topic) return;
  before ??= { view: getMapView(), overlays: OVERLAYS.filter(layer => Layers.isOn(layer)) };
  active = id;
  markActive();
  if (!charts) {
    charts = (await import("@/controllers/charts-overview")).ChartsOverview;
    charts.onPlot(follow);
    charts.onClose(restore);
  }
  charts.open(topic);
  follow(topic);
}

/** The map shows what the latest chart measures, over the regions it measures them for */
function follow({ entity, plotBy }: { entity: string; plotBy: string }): void {
  before ??= { view: getMapView(), overlays: OVERLAYS.filter(layer => Layers.isOn(layer)) };
  const overlays = OVERLAY_OF.find(([test]) => test.test(plotBy))?.[1] ?? [];
  const off = OVERLAYS.filter(layer => !overlays.includes(layer) && Layers.isOn(layer));
  const on = overlays.filter(layer => Layers.has(layer) && !Layers.isOn(layer));
  if (off.length) Layers.hide(...off);
  if (on.length) Layers.show(...on);
  setOutlineOnly(overlays.length > 0);
  setMapView(VIEW_OF[entity] ?? (overlays.length ? "terrain" : before.view));
}

function restore(): void {
  if (!before) return;
  const { view, overlays } = before;
  before = null;
  active = null;
  markActive();
  const off = OVERLAYS.filter(layer => !overlays.includes(layer) && Layers.isOn(layer));
  if (off.length) Layers.hide(...off);
  if (overlays.length) Layers.show(...overlays);
  setOutlineOnly(false);
  setMapView(view);
}

function markActive(): void {
  for (const button of ensureEl("dataTopics").querySelectorAll<HTMLButtonElement>("button"))
    button.classList.toggle("pressed", button.dataset.topic === active);
}

ensureEl("dataContent").addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest("button");
  if (!button) return;
  if (button.dataset.topic) return void openTopic(button.dataset.topic);
  const command = MAP_COMMANDS.find(({ id }) => id === button.dataset.command);
  if (command) void command.run(event);
});
