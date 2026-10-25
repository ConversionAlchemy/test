// One front door to a nation: who it is, what it holds, how it stands with others, its army, money and notes. Every
// field is Azgaar's own data and every change goes through Azgaar's modules; the full editors stay a click away.
// While it is open the nation is in focus on the map
import { confirmationDialog } from "@/components/dialog/dialog-helpers";
import { Layers } from "@/components/layers";
import { tip } from "@/components/tooltips";
import { zoomTo } from "@/components/zoom";
import { Controllers } from "@/controllers";
import type { Regiment } from "@/generators/military-generator";
import { Notes } from "@/generators/notes";
import { STATE_FORMS } from "@/generators/states-generator";
import { drawMilitary } from "@/renderers/draw-military";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import { si } from "@/utils/unitUtils";
import { openStudio } from "./emblems/studio";
import { cardPower, flagship, isTransport, kitOf, shift, troopsOf } from "./forces/forces";
import { iconUrl } from "./forces/pixels";
import { focusedNation, type Standing, setFocus, standing } from "./nation";
import { cellCentre } from "./one-grid";
import { cellsOfState } from "./owners";
import { NATION_COLOURS } from "./palette";
import { sendHome } from "./settlements";
import { integrate, occupiedBy, tidyOccupations } from "./war";

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
let minimised = false;
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
    panel.addEventListener("pointerdown", startDrag);
    document.body.append(panel);
    place();
    window.addEventListener("keyup", onKey, true);
  }
  setFocus(id);
  render();
}

// the panel floats where it was last left, open or minimised
const SPOT = "fl-nation-panel";
function place(): void {
  if (!panel) return;
  try {
    const saved = JSON.parse(localStorage.getItem(SPOT) ?? "{}") as { x?: number; y?: number; min?: boolean };
    minimised = Boolean(saved.min);
    if (saved.x !== undefined && saved.y !== undefined) moveTo(saved.x, saved.y);
  } catch {}
}

function moveTo(x: number, y: number): void {
  if (!panel) return;
  const left = Math.max(0, Math.min(window.innerWidth - 120, x));
  const top = Math.max(0, Math.min(window.innerHeight - 40, y));
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.classList.add("np-float");
}

function remember(): void {
  if (!panel) return;
  try {
    const box = panel.getBoundingClientRect();
    const float = panel.classList.contains("np-float");
    localStorage.setItem(
      SPOT,
      JSON.stringify(float ? { x: box.left, y: box.top, min: minimised } : { min: minimised })
    );
  } catch {}
}

function startDrag(event: PointerEvent): void {
  const handle = (event.target as HTMLElement).closest("[data-drag]");
  if (!handle || !panel) return;
  event.preventDefault();
  const box = panel.getBoundingClientRect();
  const dx = event.clientX - box.left;
  const dy = event.clientY - box.top;
  const move = (e: PointerEvent) => moveTo(e.clientX - dx, e.clientY - dy);
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    remember();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
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
  const troops = regiments.reduce((sum, r) => sum + troopsOf(r), 0);
  const power = regiments.reduce((sum, r) => sum + cardPower(r), 0);

  panel.classList.toggle("np-min", minimised);
  panel.innerHTML = /* html */ `
    <header class="np-bar">
      <button type="button" data-act="back" ${at > 0 ? "" : "disabled"} aria-label="${t("Previous nation")}">◂</button>
      <button type="button" data-act="forward" ${at < history.length - 1 ? "" : "disabled"} aria-label="${t("Next nation")}">▸</button>
      <span data-drag>${t("Nation")}</span>
      <button type="button" data-act="minimise" aria-label="${t("Minimise")}">${minimised ? "▢" : "▁"}</button>
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
          <input type="color" data-field="color" list="flNationColours" value="${state.color ?? "#999999"}" data-tip="${t("Nation colour")}" />
          <datalist id="flNationColours">${NATION_COLOURS.map(c => `<option value="${c}"></option>`).join("")}</datalist>
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
      ${stat(t("Treasury"), money(state.treasury || 0), "gold")}
      ${stat(t("Military"), `${si(troops)} (${si(power)})`, "wide", "military")}
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
  wireMilitary();
}

const stat = (label: string, value: string, kind = "", open = "") =>
  `<div class="np-stat ${kind}"${open ? ` data-tab="${open}"` : ""}><label>${label}</label><strong>${value}</strong></div>`;

/** Fluoria money: §2,312 */
export const money = (value: number) => `§${Math.round(value).toLocaleString("en-US")}`;

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
    ${occupiedBy(id).length ? `<button type="button" class="np-wide" data-act="integrate">${t("Integrate occupations")} (${occupiedBy(id).length} ${t("cells")})</button>` : ""}
    <a class="np-link" data-act="matrix">▦ ${t("Open full relations matrix")}</a>`;
}

const ACTIONS: Record<Standing, [string, string][]> = {
  self: [],
  neutral: [
    ["ally", t("Ally")],
    ["war", t("Declare war")],
    ["vassal", t("Make vassal")],
    ["annex", t("Annex nation")]
  ],
  ally: [
    ["peace", t("End alliance")],
    ["war", t("Declare war")],
    ["vassal", t("Make vassal")],
    ["annex", t("Annex nation")]
  ],
  enemy: [
    ["peace", t("Make peace")],
    ["vassal", t("Make vassal")],
    ["annex", t("Annex nation")]
  ],
  vassal: [
    ["release", t("Release")],
    ["annex", t("Annex nation")]
  ],
  overlord: [["free", t("Break free")]]
};

function relationRow(other: (typeof pack.states)[number], kind: Standing): string {
  EmblemRenderer.trigger(`stateCOA${other.i}`, other.coa);
  const choices = ACTIONS[kind].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  return /* html */ `<div class="np-relation">
    <svg viewBox="0 0 200 200"><use href="#stateCOA${other.i}"></use></svg>
    <a data-nation="${other.i}">${escapeHtml(other.fullName || other.name)}</a>
    <select data-deal="${other.i}"><option value="">${t("Actions")}…</option>${choices}</select>
  </div>`;
}

/** A diplomatic act of the nation in focus towards another */
function deal(id: number, other: number, act: string): void {
  const redraw = () => {
    tidyOccupations();
    Layers.draw("states", "borders", "provinces", "burgIcons", "labels", "military", "emblems");
    window.dispatchEvent(new Event("fl:occupation"));
    render();
  };
  if (act === "ally") States.setRelation(id, other, "Ally");
  if (act === "war") States.setRelation(id, other, "Enemy");
  if (act === "peace" || act === "release" || act === "free") States.setRelation(id, other, "Neutral");
  if (act === "vassal") States.setRelation(other, id, "Vassal");
  if (act === "annex") {
    confirmationDialog({
      title: t("Annex nation"),
      message: t("{{other}} becomes part of {{state}}: its lands, settlements and armies. Annex it?", {
        other: pack.states[other].name,
        state: pack.states[id].name
      }),
      confirm: t("Annex"),
      onConfirm: () => {
        States.merge(id, [other]);
        redraw();
      }
    });
    return;
  }
  redraw();
}

// the Military tab is the game master's desk: every army and garrison, open to see and drag units between them
const openArmies = new Set<string>();
let armySort: "power" | "troops" | "name" = "power";
let armyFilter = "all";
const CATEGORIES: [string, string][] = [
  ["all", "All"],
  ["infantry", "Infantry"],
  ["assault", "Assault"],
  ["cavalry", "Cavalry"],
  ["armour", "Armour"],
  ["naval", "Ships"],
  ["air", "Airships"]
];

const categoryOf = (unit: string) => {
  const kit = kitOf(unit);
  if (!kit) return "infantry";
  return kit.domain === "land" ? kit.role : kit.domain;
};

function military(regiments: Regiment[]): string {
  const id = focusedNation();
  const colour = pack.states[id]?.color?.slice(0, 7) ?? "#999999";
  const matches = (r: Regiment) =>
    armyFilter === "all" || Object.keys({ ...r.u, ...(r.cargo ?? {}) }).some(u => categoryOf(u) === armyFilter);
  const sorted = (list: Regiment[]) =>
    [...list].sort((a, b) =>
      armySort === "name"
        ? a.name.localeCompare(b.name)
        : armySort === "troops"
          ? b.a - a.a
          : cardPower(b) - cardPower(a)
    );
  const unitRows = (r: Regiment) =>
    Object.entries({ ...r.u, ...(r.cargo ?? {}) })
      .filter(([, n]) => n > 0)
      .map(([unit, n]) => {
        const kit = kitOf(unit);
        const icon = kit ? `<img src="${iconUrl(kit, colour)}" alt="" />` : "";
        return `<div class="np-unit" draggable="true" data-from="${r.i}" data-unit="${escapeHtml(unit)}">${icon}<span>${escapeHtml(unit)}</span><b>${n.toLocaleString()}</b></div>`;
      })
      .join("");
  const army = (r: Regiment) => {
    const key = String(r.i);
    const lead = kitOf(flagship(r) ?? "");
    const icon = lead ? `<img src="${iconUrl(lead, colour)}" alt="" />` : "";
    return /* html */ `<details class="np-army" data-army="${r.i}" ${openArmies.has(key) ? "open" : ""}>
      <summary draggable="true" data-army-drag="${r.i}">${icon}
        <input class="np-army-name" data-rename="${r.i}" value="${escapeHtml(r.name)}" spellcheck="false" />
        <span class="np-army-size">${si(r.a)} (${cardPower(r)})</span>
        <button type="button" data-locate="${r.i}" aria-label="${t("Locate")}" data-tip="${t("Locate")}">⌖</button>
        <button type="button" data-release="${r.i}" aria-label="${t("Release")}" data-tip="${t("Release: troops go home")}">✕</button>
      </summary>
      <div class="np-army-units">${unitRows(r) || `<p class="np-empty">${t("No units")}</p>`}</div>
    </details>`;
  };
  const armies = sorted(regiments.filter(r => !r.garrison && matches(r)));
  const garrisons = sorted(regiments.filter(r => r.garrison && matches(r)));
  return /* html */ `
    <div class="np-tools">
      <select data-army-filter>${CATEGORIES.map(([v, l]) => `<option value="${v}" ${v === armyFilter ? "selected" : ""}>${t(l)}</option>`).join("")}</select>
      <select data-army-sort>${[
        ["power", "Power"],
        ["troops", "Troops"],
        ["name", "Name"]
      ]
        .map(([v, l]) => `<option value="${v}" ${v === armySort ? "selected" : ""}>${t("Sort")}: ${t(l)}</option>`)
        .join("")}</select>
    </div>
    <h3>${t("Armies")}</h3>
    ${armies.map(army).join("") || `<p class="np-empty">${t("No armies")}</p>`}
    <h3>${t("Garrisons")}</h3>
    ${garrisons.map(army).join("") || `<p class="np-empty">${t("No garrisons")}</p>`}
    <div class="np-pair">
      <button type="button" data-act="add-regiment">+ ${t("Add Army")}</button>
      <button type="button" data-act="military">${t("Military Overview")}</button>
    </div>`;
}

/** The Military tab's dragging: units onto another army or garrison, armies into a new order */
function wireMilitary(): void {
  if (!panel || tab !== "military") return;
  const id = focusedNation();
  let carried: { from: number; unit: string } | { army: number } | null = null;
  for (const d of panel.querySelectorAll<HTMLDetailsElement>("details.np-army"))
    d.addEventListener("toggle", () => {
      if (d.open) openArmies.add(d.dataset.army!);
      else openArmies.delete(d.dataset.army!);
    });
  for (const row of panel.querySelectorAll<HTMLElement>(".np-unit"))
    row.addEventListener("dragstart", event => {
      carried = { from: Number(row.dataset.from), unit: row.dataset.unit! };
      event.dataTransfer?.setData("text/plain", row.dataset.unit!);
      event.stopPropagation();
    });
  for (const s of panel.querySelectorAll<HTMLElement>("summary[data-army-drag]")) {
    s.addEventListener("dragstart", event => {
      carried = { army: Number(s.dataset.armyDrag) };
      event.dataTransfer?.setData("text/plain", s.dataset.armyDrag!);
      void Controllers.RegimentEditor.carry(id, Number(s.dataset.armyDrag)); // it can land on the map too
    });
    s.addEventListener("dragend", () => void Controllers.RegimentEditor.carry(id, null));
  }
  for (const d of panel.querySelectorAll<HTMLElement>("details.np-army")) {
    d.addEventListener("dragover", event => {
      if (!carried) return;
      event.preventDefault();
      d.classList.add("np-over");
    });
    d.addEventListener("dragleave", () => d.classList.remove("np-over"));
    d.addEventListener("drop", event => {
      event.preventDefault();
      d.classList.remove("np-over");
      const to = regimentOf(Number(d.dataset.army));
      if (!carried || !to) return;
      if ("army" in carried) {
        const list = pack.states[id].military ?? [];
        const moving = list.find(r => r.i === (carried as { army: number }).army);
        if (moving && moving !== to) {
          list.splice(list.indexOf(moving), 1);
          list.splice(list.indexOf(to), 0, moving);
        }
      } else {
        const from = regimentOf(carried.from);
        if (from && from !== to) {
          const list = from.u[carried.unit] ? "u" : "cargo";
          const why = shift(
            from,
            list,
            carried.unit,
            (list === "u" ? from.u : (from.cargo ?? {}))[carried.unit] ?? 0,
            to,
            isTransport(to) ? "cargo" : "u"
          );
          if (why) tip(why, false, "error");
          if (!troopsOf(from) && !isTransport(from) && !from.garrison) Military.remove(from.state, from.i);
        }
      }
      carried = null;
      drawMilitary();
      Layers.draw("military");
      render();
    });
  }
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
  if (el.closest(".np-army-name")) {
    event.preventDefault(); // typing a name, not folding the army
    return;
  }
  const release = el.closest<HTMLElement>("[data-release]");
  if (release) {
    event.preventDefault();
    const r = regimentOf(Number(release.dataset.release));
    if (!r) return;
    confirmationDialog({
      title: t("Release"),
      message: t("Release {{name}}? Its troops go home to the settlement they came from.", { name: r.name }),
      confirm: t("Release"),
      onConfirm: () => {
        sendHome(r, { ...r.u, ...(r.cargo ?? {}) });
        if (r.garrison) {
          r.u = {};
          r.a = 0;
        } else Military.remove(r.state, r.i);
        drawMilitary();
        Layers.draw("military");
        render();
      }
    });
    return;
  }
  const unit = el.closest<HTMLElement>("[data-regiment], [data-locate]");
  if (unit) {
    if (unit.closest("summary")) event.preventDefault();
    const r = regimentOf(Number(unit.dataset.regiment ?? unit.dataset.locate));
    if (!r) return;
    flyTo(r.x, r.y, 6);
    if (r.garrison) Controllers.RegimentEditor.settlement(r.garrison);
    else if (unit.dataset.regiment) Controllers.RegimentEditor.open(`#regiment${r.state}-${r.i}`);
    return;
  }
  const act = el.closest<HTMLElement>("[data-act]")?.dataset.act;
  switch (act) {
    case "close":
      closeNation();
      return;
    case "minimise":
      minimised = !minimised;
      remember();
      render();
      return;
    case "back":
      if (at > 0) show(history[--at]);
      return;
    case "forward":
      if (at < history.length - 1) show(history[++at]);
      return;
    case "emblem":
      void openStudio(id);
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
    case "integrate":
      integrate(id);
      tidyOccupations();
      Layers.draw("states", "borders", "provinces", "burgIcons", "labels", "emblems");
      window.dispatchEvent(new Event("fl:occupation"));
      render();
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
  const other = el.closest<HTMLElement>("[data-deal]");
  if (other && el instanceof HTMLSelectElement) {
    if (el.value) deal(id, Number(other.dataset.deal), el.value);
    return;
  }
  if (el instanceof HTMLInputElement && el.dataset.rename) {
    const r = regimentOf(Number(el.dataset.rename));
    if (r && el.value.trim()) {
      Military.rename(r.state, r.i, el.value.trim());
      drawMilitary();
    }
    return;
  }
  if (el instanceof HTMLSelectElement && (el.dataset.armyFilter !== undefined || el.dataset.armySort !== undefined)) {
    if (el.dataset.armyFilter !== undefined) armyFilter = el.value;
    else armySort = el.value as typeof armySort;
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
