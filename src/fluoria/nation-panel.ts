// One front door to a nation: who it is, what it holds, how it stands with others, its army, money and notes. Every
// field is Azgaar's own data and every change goes through Azgaar's modules; the full editors stay a click away.
// While it is open the nation is in focus on the map
import { Layers } from "@/components/layers";
import { zoomTo } from "@/components/zoom";
import { Controllers } from "@/controllers";
import { RELATIONS } from "@/data/diplomacy";
import type { Regiment } from "@/generators/military-generator";
import { Notes } from "@/generators/notes";
import { STATE_FORMS } from "@/generators/states-generator";
import { drawMilitary } from "@/renderers/draw-military";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import { si } from "@/utils/unitUtils";
import { focusedNation, type Standing, setFocus, standing } from "./nation";
import { cellCentre } from "./one-grid";
import { cellsOfState } from "./owners";

type Tab = "overview" | "economy" | "diplomacy" | "military" | "notes";

const TABS: [Tab, string][] = [
  ["overview", t("Overview")],
  ["economy", t("Economy")],
  ["diplomacy", t("Diplomacy")],
  ["military", t("Military")],
  ["notes", t("Notes")]
];

let panel: HTMLElement | null = null;
let tab: Tab = "overview";
let editingName = false;
let showNeutral = false;
const history: number[] = [];
let at = -1;
let quietUntil = 0; // the panel's own fly-tos don't count as the user zooming in

const living = (id: number) => (id && pack.states[id] && !pack.states[id].removed ? pack.states[id] : null);
const popScale = () => options.map.units.population.scale;
const people = (state: (typeof pack.states)[number]) =>
  (state.rural || 0) * popScale() + (state.urban || 0) * popScale() * options.map.units.population.urbanization.rate;

export const nationPanelOpen = (): boolean => Boolean(panel);

/** Open a nation's panel, putting it in focus; remembered for back and forward */
export function openNation(id: number): void {
  if (!living(id)) return;
  if (history[at] !== id) {
    history.splice(at + 1);
    history.push(id);
    at = history.length - 1;
  }
  editingName = false;
  show(id);
}

export function closeNation(): void {
  panel?.remove();
  panel = null;
  window.removeEventListener("keyup", onKey, true);
  setFocus(0);
}

/** Zooming in past the nation scale closes the panel, unless the panel itself flew there */
export function nationZoom(scale: number, threshold: number): void {
  if (panel && scale >= threshold && performance.now() > quietUntil && focusedNation() && lastScale < threshold)
    closeNation();
  lastScale = scale;
}
let lastScale = 0;

function flyTo(x: number, y: number, zoom: number): void {
  quietUntil = performance.now() + 2500;
  zoomTo(x, y, zoom, 900);
}

function show(id: number): void {
  if (!panel) {
    panel = document.createElement("aside");
    panel.id = "flNation";
    panel.addEventListener("click", onClick);
    panel.addEventListener("change", onChange);
    document.body.append(panel);
    window.addEventListener("keyup", onKey, true);
  }
  setFocus(id);
  render();
}

/** Redraw the open panel from the data as it is now */
export function refreshNation(): void {
  if (panel && living(focusedNation())) render();
}

function render(): void {
  const id = focusedNation();
  const state = living(id);
  if (!panel || !state) {
    closeNation();
    return;
  }
  EmblemRenderer.trigger(`stateCOA${id}`, state.coa);
  const capital = pack.burgs[state.capital];
  const name = (list: { name?: string }[] | undefined, i: number) => (i && list?.[i]?.name) || "—";
  const religion = capital && !capital.removed ? pack.cells.religion[capital.cell] : 0;
  const burgs = pack.burgs.filter(b => b?.i && !b.removed && b.state === id);
  const provinces = (pack.provinces ?? []).filter(p => p && "i" in p && p.i && !p.removed && p.state === id);
  const regiments = state.military ?? [];
  const army = regiments.filter(r => !r.n).reduce((sum, r) => sum + r.a, 0);
  const fleets = regiments.filter(r => r.n).length;

  panel.innerHTML = /* html */ `
    <header class="np-bar">
      <button type="button" data-act="back" ${at > 0 ? "" : "disabled"} aria-label="${t("Previous nation")}">◂</button>
      <button type="button" data-act="forward" ${at < history.length - 1 ? "" : "disabled"} aria-label="${t("Next nation")}">▸</button>
      <span>${t("Nation")}</span>
      <button type="button" data-act="close" aria-label="${t("Close")}">✕</button>
    </header>
    <div class="np-identity">
      <button type="button" class="np-emblem" data-act="emblem" data-tip="${t("Edit emblem")}">
        <svg viewBox="0 0 200 200"><use href="#stateCOA${id}"></use></svg>
      </button>
      <div class="np-who">
        ${editingName ? nameForm(state) : nameView(state)}
        <label class="np-line">${t("Government")}
          <select data-field="form">${formOptions(state.formName ?? "")}</select>
        </label>
        <div class="np-line">
          <input type="color" data-field="color" value="${state.color ?? "#999999"}" data-tip="${t("Nation colour")}" />
          <button type="button" data-act="locate">⌖ ${t("Locate")}</button>
        </div>
      </div>
    </div>
    <div class="np-facts">
      <span>${t("Capital")}: ${capital && !capital.removed ? `<a data-act="capital">${escapeHtml(capital.name ?? "")}</a>` : "—"}</span>
      <span>${t("Culture")}: ${escapeHtml(name(pack.cultures, state.culture))}</span>
      <span>${t("Religion")}: ${escapeHtml(name(pack.religions, religion))}</span>
    </div>
    <div class="np-stats">
      ${stat(t("Population"), si(people(state)))}
      ${stat(t("Area"), `${cellsOfState(id)} ${t("cells")}`)}
      ${stat(t("Settlements"), String(burgs.length))}
      ${stat(t("Provinces"), String(provinces.length))}
      ${stat(t("Treasury"), `● ${si(state.treasury || 0)}`, "gold")}
      ${stat(t("Army"), si(army))}
      ${stat(t("Fleets"), String(fleets))}
      ${stat(t("Vassals"), String(vassals(id).length))}
    </div>
    <nav class="np-tabs">
      ${TABS.map(([key, label]) => `<button type="button" data-tab="${key}" class="${key === tab ? "on" : ""}">${label}</button>`).join("")}
    </nav>
    <main class="np-body">${body(id, burgs, provinces, regiments)}</main>
    <footer class="np-foot">
      <button type="button" data-act="charts">▥ ${t("Charts")}</button>
      <button type="button" data-act="editor">⚙ ${t("Full editor")}</button>
    </footer>`;
}

const stat = (label: string, value: string, kind = "") =>
  `<div class="np-stat ${kind}"><label>${label}</label><strong>${value}</strong></div>`;

function nameView(state: (typeof pack.states)[number]): string {
  return /* html */ `<div class="np-name">
    <strong>${escapeHtml(state.name)}</strong>
    <button type="button" data-act="rename" aria-label="${t("Rename")}" data-tip="${t("Rename")}">✎</button>
  </div>
  <div class="np-full">${escapeHtml(state.fullName || state.name)}</div>`;
}

function nameForm(state: (typeof pack.states)[number]): string {
  return /* html */ `<div class="np-rename">
    <input data-name="short" value="${escapeHtml(state.name)}" placeholder="${t("Short name")}" />
    <input data-name="full" value="${escapeHtml(state.fullName || "")}" placeholder="${t("Full name")}" />
    <div><button type="button" data-act="name-ok">${t("Apply")}</button><button type="button" data-act="name-cancel">${t("Cancel")}</button></div>
  </div>`;
}

function formOptions(current: string): string {
  const listed = Object.values(STATE_FORMS).some(list => (list as readonly string[]).includes(current));
  const groups = Object.entries(STATE_FORMS)
    .map(
      ([government, forms]) =>
        `<optgroup label="${t(government)}">${forms.map(f => `<option value="${f}" ${f === current ? "selected" : ""}>${t(f)}</option>`).join("")}</optgroup>`
    )
    .join("");
  return `${!listed && current ? `<option selected value="${escapeHtml(current)}">${escapeHtml(current)}</option>` : ""}${groups}`;
}

const vassals = (id: number) =>
  pack.states.filter(other => living(other.i) && other.i !== id && standing(id, other.i) === "vassal");

function body(
  id: number,
  burgs: (typeof pack.burgs)[number][],
  provinces: { i: number; name: string; burg?: number }[],
  regiments: Regiment[]
): string {
  if (tab === "economy") return economy(id);
  if (tab === "diplomacy") return diplomacy(id);
  if (tab === "military") return military(regiments);
  if (tab === "notes") return notes(id);
  const top = burgs.toSorted((a, b) => (b.population || 0) - (a.population || 0)).slice(0, 8);
  const pop = (b: (typeof pack.burgs)[number]) =>
    si((b.population || 0) * popScale() * options.map.units.population.urbanization.rate);
  return /* html */ `
    <h3>${t("Largest settlements")}</h3>
    ${top.map(b => `<a class="np-row" data-burg="${b.i}"><span>${b.capital ? "■ " : ""}${escapeHtml(b.name ?? "")}</span><span>${pop(b)}</span></a>`).join("") || `<p class="np-empty">${t("None")}</p>`}
    <h3>${t("Provinces")}</h3>
    ${provinces.map(p => `<a class="np-row" data-province="${p.i}"><span>${escapeHtml(p.name)}</span><span>${p.burg ? escapeHtml(pack.burgs[p.burg]?.name ?? "") : ""}</span></a>`).join("") || `<p class="np-empty">${t("None")}</p>`}`;
}

function economy(id: number): string {
  const state = pack.states[id];
  const rules = state.tariffs?.length ?? 0;
  return /* html */ `
    <div class="np-form">
      <label>${t("Treasury")}<input type="number" step="1" data-field="treasury" value="${Math.round(state.treasury || 0)}" /></label>
      <label>${t("Sales tax")}<input type="number" min="0" max="1" step="0.01" data-field="salesTax" value="${state.salesTax ?? 0}" /></label>
      <label>${t("Poll tax")}<input type="number" min="0" step="0.01" data-field="pollTax" value="${state.pollTax ?? 0}" /></label>
    </div>
    <p class="np-dim">${t("{{count}} tariff and embargo rules", { count: rules })}</p>
    <button type="button" class="np-wide" data-act="taxes">${t("Tariffs and embargoes")}…</button>`;
}

const GROUPS: [Standing, string][] = [
  ["ally", t("Allies")],
  ["enemy", t("Enemies")],
  ["overlord", t("Overlord")],
  ["vassal", t("Vassals")],
  ["neutral", t("Neutral")]
];

function diplomacy(id: number): string {
  const others = pack.states.filter(s => living(s.i) && s.i !== id);
  const by = new Map<Standing, typeof others>();
  for (const other of others) {
    const kind = standing(id, other.i);
    by.set(kind, [...(by.get(kind) ?? []), other]);
  }
  return `${GROUPS.map(([kind, label]) => {
    const list = by.get(kind) ?? [];
    if (!list.length) return "";
    const folded = kind === "neutral" && !showNeutral;
    const head =
      kind === "neutral"
        ? `<h3 class="np-${kind}"><a data-act="neutral">${label} (${list.length}) ${folded ? "▸" : "▾"}</a></h3>`
        : `<h3 class="np-${kind}">${label}</h3>`;
    if (folded) return head;
    return head + list.map(other => relationRow(other, kind)).join("");
  }).join("")}
    <a class="np-link" data-act="matrix">▦ ${t("Open full relations matrix")}</a>`;
}

function relationRow(other: (typeof pack.states)[number], kind: Standing): string {
  EmblemRenderer.trigger(`stateCOA${other.i}`, other.coa);
  const control =
    kind === "vassal"
      ? `<button type="button" data-release="${other.i}">${t("Release")}</button>`
      : kind === "overlord"
        ? `<button type="button" data-free="${other.i}">${t("Break free")}</button>`
        : `<select data-relation="${other.i}">${["Ally", "Neutral", "Enemy"]
            .map(
              r => `<option value="${r}" ${r.toLowerCase() === kind ? "selected" : ""}>${RELATIONS[r].label}</option>`
            )
            .join("")}</select>`;
  return /* html */ `<div class="np-relation">
    <svg viewBox="0 0 200 200"><use href="#stateCOA${other.i}"></use></svg>
    <a data-nation="${other.i}">${escapeHtml(other.fullName || other.name)}</a>
    ${control}
  </div>`;
}

function military(regiments: Regiment[]): string {
  const row = (r: Regiment) => /* html */ `<div class="np-row">
      <a data-regiment="${r.i}">${r.n ? "≋" : "⚔"} ${escapeHtml(r.name)}</a>
      <span>${r.n ? `${Object.values(r.u).reduce((a, b) => a + b, 0)} ${t("ships")}` : si(r.a)}${r.carrier ? ` · ${t("aboard")}` : ""}</span>
      <button type="button" data-locate="${r.i}" aria-label="${t("Locate")}">⌖</button>
    </div>`;
  return /* html */ `
    ${regiments.map(row).join("") || `<p class="np-empty">${t("No regiments")}</p>`}
    <div class="np-pair">
      <button type="button" data-act="add-regiment">+ ${t("Add regiment")}</button>
      <button type="button" data-act="military">${t("Military overview")}</button>
    </div>`;
}

function notes(id: number): string {
  const note = Notes.get({ type: "state", id }) ?? "";
  return /* html */ `
    <div class="np-note" contenteditable="true" data-field="note">${note}</div>
    <a class="np-link" data-act="notes">${t("Open in notes editor")}</a>`;
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== "Escape" || !panel) return;
  const target = event.target as HTMLElement;
  if (target.closest?.(".ui-dialog") || (target !== document.body && panel.contains(target) && editingName)) return;
  closeNation();
}

function regimentOf(id: number): Regiment | undefined {
  return pack.states[focusedNation()]?.military?.find(r => r.i === id);
}

function onClick(event: MouseEvent): void {
  const el = event.target as HTMLElement;
  const id = focusedNation();
  const state = living(id);
  if (!state) return;
  const tabButton = el.closest<HTMLElement>("[data-tab]");
  if (tabButton) {
    tab = tabButton.dataset.tab as Tab;
    render();
    return;
  }
  const nation = el.closest<HTMLElement>("[data-nation]");
  if (nation) {
    openNation(Number(nation.dataset.nation));
    return;
  }
  const burg = el.closest<HTMLElement>("[data-burg]");
  if (burg) {
    const b = pack.burgs[Number(burg.dataset.burg)];
    flyTo(b.x, b.y, 6);
    return;
  }
  const province = el.closest<HTMLElement>("[data-province]");
  if (province) {
    const p = pack.provinces[Number(province.dataset.province)];
    const centre = p && "center" in p && p.center ? cellCentre(p.center) : null;
    if (centre) flyTo(centre[0], centre[1], 4);
    return;
  }
  const unit = el.closest<HTMLElement>("[data-regiment], [data-locate]");
  if (unit) {
    const r = regimentOf(Number(unit.dataset.regiment ?? unit.dataset.locate));
    if (!r) return;
    flyTo(r.x, r.y, 6);
    if (unit.dataset.regiment) Controllers.RegimentEditor.open(`#regiment${r.state}-${r.i}`);
    return;
  }
  const release = el.closest<HTMLElement>("[data-release], [data-free]");
  if (release) {
    const other = Number(release.dataset.release ?? release.dataset.free);
    States.setRelation(id, other, "Neutral");
    Layers.draw("states");
    render();
    return;
  }
  const act = el.closest<HTMLElement>("[data-act]")?.dataset.act;
  switch (act) {
    case "close":
      closeNation();
      return;
    case "back":
      if (at > 0) show(history[--at]);
      return;
    case "forward":
      if (at < history.length - 1) show(history[++at]);
      return;
    case "emblem":
      void Controllers.EmblemsEditor.open("state", `stateCOA${id}`, state);
      return;
    case "rename":
      editingName = true;
      render();
      return;
    case "name-cancel":
      editingName = false;
      render();
      return;
    case "name-ok":
      applyName(id);
      return;
    case "locate":
    case "capital": {
      const capital = pack.burgs[state.capital];
      if (capital && !capital.removed) flyTo(capital.x, capital.y, act === "capital" ? 6 : 2.5);
      return;
    }
    case "neutral":
      showNeutral = !showNeutral;
      render();
      return;
    case "matrix":
      void Controllers.DiplomacyOverview.open();
      return;
    case "taxes":
      void Controllers.StatesEditor.openTreasury(id);
      return;
    case "add-regiment": {
      const capital = pack.burgs[state.capital];
      const [x, y] = capital && !capital.removed ? [capital.x, capital.y] : cellCentre(state.center ?? 0);
      const regiment = Military.add(id, x, y);
      drawMilitary();
      render();
      Controllers.RegimentEditor.open(`#regiment${id}-${regiment}`);
      return;
    }
    case "military":
      void Controllers.RegimentsOverview.open(id);
      return;
    case "notes":
      void Controllers.NotesEditor.open({ type: "state", id });
      return;
    case "charts":
      void Controllers.ChartsOverview.open();
      return;
    case "editor":
      void Controllers.StatesEditor.open();
      return;
  }
}

function applyName(id: number): void {
  const short = panel?.querySelector<HTMLInputElement>('[data-name="short"]')?.value.trim() ?? "";
  const full = panel?.querySelector<HTMLInputElement>('[data-name="full"]')?.value.trim() ?? "";
  const state = pack.states[id];
  if (short && short !== state.name) States.rename(id, short);
  if (full && full !== state.fullName) States.setFullName(id, full);
  if (state.label?.text) delete state.label.text;
  editingName = false;
  Layers.draw("labels");
  render();
}

function onChange(event: Event): void {
  const el = event.target as HTMLInputElement | HTMLSelectElement | HTMLElement;
  const id = focusedNation();
  if (!living(id)) return;
  const relation = el.closest<HTMLElement>("[data-relation]");
  if (relation && el instanceof HTMLSelectElement) {
    States.setRelation(id, Number(relation.dataset.relation), el.value);
    render();
    return;
  }
  const field = (el as HTMLElement).dataset?.field;
  if (!field || !("value" in el)) return;
  const state = pack.states[id];
  if (field === "form") {
    States.setForm(id, el.value);
    if (state.label?.text) delete state.label.text;
    Layers.draw("labels");
  }
  if (field === "color") {
    States.recolor(id, el.value);
    Layers.draw("states", "borders", "labels");
  }
  if (field === "treasury") States.setTreasury(id, Number(el.value) || 0);
  if (field === "salesTax" || field === "pollTax") {
    const sales = field === "salesTax" ? Number(el.value) : (state.salesTax ?? 0);
    const poll = field === "pollTax" ? Number(el.value) : (state.pollTax ?? 0);
    States.setTaxes(id, Math.max(0, Math.min(1, sales || 0)), Math.max(0, poll || 0));
  }
  render();
}

// notes are saved as they're typed, without redrawing the panel under the cursor
document.addEventListener("input", event => {
  const el = event.target as HTMLElement;
  if (!panel?.contains(el) || el.dataset.field !== "note") return;
  Notes.set({ type: "state", id: focusedNation() }, el.innerHTML.trim());
});
