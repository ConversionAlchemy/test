// Lore tab: the world's name, year, era and description, edited through the Lore model
import { Pins } from "@/components/pins";
import { Lore } from "@/generators/lore";
import { Names } from "@/generators/names-generator";
import { link } from "@/utils/commonUtils";
import { t } from "@/utils/i18n";
import { ensureEl } from "@/utils/nodeUtils";

const REPOSITORY = "https://github.com/Azgaar/Fantasy-Map-Generator";

const TEMPLATE = /* html */ `
  <div class="loreTab">
    <label for="loreTabName">${t("World")}</label>
    <span class="loreRow">
      <input id="loreTabName" type="text" autocorrect="off" spellcheck="false" />
      <i id="loreTabNameRegenerate" class="icon-arrows-cw" data-tip="${t("Generate a new map name")}"></i>
    </span>
    <label for="loreTabYear">${t("Year")}</label>
    <input id="loreTabYear" type="number" step="1" />
    <label for="loreTabEra">${t("Era")}</label>
    <span class="loreRow">
      <input id="loreTabEra" type="text" autocorrect="off" spellcheck="false" />
      <input id="loreTabEraShort" type="text" autocorrect="off" spellcheck="false" />
    </span>
    <label for="loreTabDescription">${t("Lore")}</label>
    <textarea
      id="loreTabDescription"
      rows="12"
      placeholder="${t("Describe the world: its history, peoples and legends")}"
    ></textarea>
  </div>
  <p class="loreCredit">
    ${t("Built on {{- generator}} by Azgaar.", { generator: link(REPOSITORY, t("Fantasy Map Generator")) })}
  </p>
`;

ensureEl("aboutContent").innerHTML = TEMPLATE;

const input = (id: string) => ensureEl<HTMLInputElement>(id);

function fill(): void {
  const { name, description, calendar } = options.map.lore;
  input("loreTabName").value = name;
  input("loreTabYear").value = String(calendar.year);
  input("loreTabEra").value = calendar.era;
  input("loreTabEraShort").value = calendar.eraShort;
  ensureEl<HTMLTextAreaElement>("loreTabDescription").value = description;
}

// typed values are pinned, as in the Lore editor, so the next map keeps them
ensureEl("aboutContent").addEventListener("change", event => {
  const { id, value } = event.target as HTMLInputElement;
  const { lore } = options.map;
  if (id === "loreTabName" && value.trim()) {
    Lore.rename(value);
    Pins.set("mapName", lore.name);
  } else if (id === "loreTabYear" && value && !Number.isNaN(+value)) {
    Lore.setYear(+value);
    Pins.set("year", lore.calendar.year);
  } else if (id === "loreTabEra" && value.trim()) {
    Lore.setEra(value);
    Pins.set("era", lore.calendar.era);
    Pins.set("eraShort", lore.calendar.eraShort);
  } else if (id === "loreTabEraShort" && value.trim()) {
    Lore.setEra(lore.calendar.era, value);
    Pins.set("eraShort", lore.calendar.eraShort);
  } else if (id === "loreTabDescription") Lore.setDescription(value);
  else return;
  Options.save();
  fill();
});

ensureEl("loreTabNameRegenerate").addEventListener("click", () => {
  Pins.clear("mapName");
  Lore.rename(Names.getMapName());
  Options.save();
  fill();
});

ensureEl("aboutTab").addEventListener("click", () => {
  if (options.map?.lore) fill();
});
