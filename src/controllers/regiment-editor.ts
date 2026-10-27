// Fluoria's folder for a regiment: Azgaar's regiment dialog, its unit and its hold as rows, and the settlement panel.
// Moving units is drag.ts's: map cards, panel rows and army headers all drag the same way
import { easeSinInOut, select, transition } from "d3";
import { confirmationDialog, refreshEditors } from "@/components/dialog/dialog-helpers";
import { Icons } from "@/components/icons";
import { Layers } from "@/components/layers";
import { clearMainTip, tip } from "@/components/tooltips";
import { applyDefaultViewboxEvents } from "@/components/viewbox-events";
import { viewport } from "@/components/viewport";
import { zoomTo } from "@/components/zoom";
import { Controllers } from "@/controllers";
import { landingCells } from "@/fluoria/boarding";
import { dragging, type Payload, pressed, regimentUnder, setDragHooks, watchMapDrags } from "@/fluoria/drag";
import { addSlot, assign, changeRow, encampRefusal, regimentOf, splitOff } from "@/fluoria/forces/army";
import { cardUrl } from "@/fluoria/forces/cards";
import {
  cardPower,
  cargoSlots,
  domainOf,
  domainOfUnit,
  encamp,
  flagship,
  health,
  kitOf,
  type List,
  MAX_SLOTS,
  refusal,
  rows,
  slotsOf,
  troopsOf,
  typeOf
} from "@/fluoria/forces/forces";
import { KIT } from "@/fluoria/forces/kit";
import { buttonUrl, iconUrl, short, stallUrl } from "@/fluoria/forces/pixels";
import { borrowView, returnView } from "@/fluoria/map-view";

import { openNation } from "@/fluoria/nation-panel";
import { numberField, wireField } from "@/fluoria/number-field";
import { cellAtPoint, mainCell, neighbours as neighbourCells } from "@/fluoria/one-grid";
import { order, undoOrder } from "@/fluoria/orders";
import { purseBlocks, wirePurse } from "@/fluoria/purse";
import {
  GARRISON_SLOTS,
  garrisonSlots,
  RANK_NAME,
  RANKS,
  type Rank,
  rankOf,
  resizeCost,
  type Size,
  sizeOf
} from "@/fluoria/settlement-size";
import {
  CLASS_ORDER,
  CLASSES,
  categoryOf,
  classOf,
  classRefusal,
  ensureGarrison,
  formArmy,
  garrisonOf,
  isCapital,
  manpowerGain,
  nextTier,
  peopleFor,
  perSlot,
  priceOf,
  recruit,
  recruitable,
  recruitLimit,
  resizeRefusal,
  resizeTo,
  type SettlementClass,
  sendHome,
  setClass,
  unitName,
  upgrade,
  upgradeCost,
  upgradeRefusal
} from "@/fluoria/settlements";
import { play } from "@/fluoria/sfx";
import { setTips } from "@/fluoria/tips";
import {
  chooseLanding,
  clearSelection,
  isFar,
  pileOf,
  selectRegiment,
  spread,
  spreadStack,
  stackAll,
  stackOf
} from "@/fluoria/units";
import { hasRoom } from "@/fluoria/war";
import { Notes } from "@/generators/notes";
import { goodIconLines } from "@/renderers/draw-goods";
import { placeRegiment } from "@/renderers/draw-military";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import type { Burg } from "../generators/burgs-generator";
import type { Regiment } from "../generators/military-generator";
import { ensureEl, getPointer } from "../utils";

const folders = new Map<string, HTMLElement>(); // open folders by "state-id"
let picked: Regiment | null = null; // the one whose reach is shown
let mode: "attack" | "add" | null = null;

const keyOf = (r: Pick<Regiment, "state" | "i">) => `${r.state}-${r.i}`;
const elementOf = (r: Pick<Regiment, "state" | "i">) =>
  document.getElementById(`regiment${r.state}-${r.i}`) as SVGGElement | null;
const regimentFrom = (el: Element | null): Regiment | undefined => {
  const g = el?.closest<SVGGElement>("#armies > g > g");
  return g ? regimentOf(+g.dataset.state!, +g.dataset.id!) : undefined;
};
/** The regiment under a screen point, even beneath a label */
const regimentAt = (x: number, y: number, skip?: Regiment): Regiment | undefined =>
  document
    .elementsFromPoint(x, y)
    .map(el => regimentFrom(el))
    .find(r => r && r !== skip);
const colourOf = (state: number) => {
  const colour = pack.states[state]?.color;
  return colour && colour[0] === "#" && colour.length >= 7 ? colour.slice(0, 7) : "#999999";
};

/** Double-click: the regiment's folder, replacing any open one; with Shift, beside it */
function editRegiment(selector: string, beside = false): void {
  if (customization) return;
  Layers.show("military");
  const regiment = regimentFrom(document.querySelector(selector));
  if (!regiment) return;
  bindRegiments();
  openFolder(regiment, beside);
  pick(regiment);
}

/** A click picks a unit and spreads its pile; in a settlement's cell it opens the settlement too. Far out a click on a
 * pile zooms in to it */
function clickRegiment(selector: string, _shift = false): void {
  if (customization) return;
  const regiment = regimentFrom(document.querySelector(selector));
  if (!regiment) return;
  bindRegiments();
  if (mode) return; // the mode's own click handles it
  if (isFar()) {
    const pile = pileOf(regiment);
    const x = pile.reduce((sum, r) => sum + r.x, 0) / pile.length;
    const y = pile.reduce((sum, r) => sum + r.y, 0) / pile.length;
    zoomTo(x, y, Math.max((viewport.scale || 1) * 2, 70 / (grid.spacing || 10)), 600);
    return;
  }
  const stack = stackOf(regiment);
  if (stack && stack.members.length > 1) spread(stack);
  const town = settlementIn(regiment.cell);
  if (town && !regiment.n) openSettlement(town.i);
  pick(regiment);
}

/** The settlement standing in a cell, if any */
const settlementIn = (cell: number): Burg | null => {
  const burg = pack.burgs[pack.cells.burg[mainCell(cell)]];
  return burg?.i && !burg.removed ? burg : null;
};

/** Clicking empty ground, or Escape: folders shut, nothing picked */
function clearAll(): void {
  for (const key of [...folders.keys()]) closeFolder(key);
  for (const el of document.querySelectorAll("#armies .fl-chosen")) el.classList.remove("fl-chosen");
  setMode(null);
  pick(null);
}

/** The regiment whose reach the map shows; the rest of the units step back */
function pick(regiment: Regiment | null): void {
  picked = regiment;
  const armies = document.getElementById("armies");
  for (const el of armies?.querySelectorAll(".fl-selected") ?? []) el.classList.remove("fl-selected");
  armies?.classList.toggle("fl-picked", Boolean(regiment));
  if (!regiment) {
    clearSelection();
    return;
  }
  elementOf(regiment)?.classList.add("fl-selected");
  selectRegiment(regiment);
}

let hoverTimer = 0;
let hovered: ReturnType<typeof stackOf> | null = null;

/** Hovering a pile spreads it after a moment, so any card can be grabbed; leaving folds it back */
function hoverRegiment(r: Regiment | undefined): void {
  const stack = r && !isFar() ? (stackOf(r) ?? null) : null;
  if (stack === hovered) return;
  hovered = stack;
  clearTimeout(hoverTimer);
  if (!stack) {
    hoverTimer = window.setTimeout(() => spread(null), 300);
    return;
  }
  if (stack.members.length < 2 || spreadStack() === stack) return;
  hoverTimer = window.setTimeout(() => spread(stack), spreadStack() ? 0 : 180);
}

/** Cards drag at any time (drag.ts); hovering spreads a pile and tells what it is; a double-click opens a folder */
function bindRegiments(): void {
  watchMapDrags();
  const node = document.getElementById("armies");
  if (!node || node.dataset.flDouble) return;
  node.dataset.flDouble = "1";
  // hovering: the card under the pointer, even beneath a label
  let frame = 0;
  document.getElementById("map")?.addEventListener("mousemove", event => {
    if (event.buttons || dragging() || frame) return;
    const [x, y] = [event.clientX, event.clientY];
    frame = requestAnimationFrame(() => {
      frame = 0;
      hoverRegiment(regimentUnder(x, y));
    });
  });
  node.addEventListener(
    "click",
    event => {
      const settle = (event.target as Element).closest<SVGGElement>(".flSettle");
      if (settle && !mode) {
        event.stopPropagation();
        openSettlement(Number(settle.dataset.burg), event.shiftKey);
      }
    },
    true
  );
  node.addEventListener("dblclick", event => {
    const g = (event.target as Element).closest<SVGGElement>("#armies > g > g");
    if (!g?.dataset.state || isFar()) return;
    event.stopPropagation(); // not the map's double-click zoom
    // an army standing in one of its own settlements opens there, folded out under the garrison
    const r = regimentFrom(g);
    const town = r ? pack.burgs[pack.cells.burg[mainCell(r.cell)]] : null;
    if (r && town?.i && !town.removed && town.state === r.state && !event.shiftKey) {
      openParts.add(`b${town.i}:${keyOf(r)}`);
      openSettlement(town.i);
      pick(r);
      return;
    }
    editRegiment(`#${g.id}`, event.shiftKey);
  });
}

// --- the folder

function openFolder(regiment: Regiment, beside = false): void {
  const key = keyOf(regiment);
  if (!beside) for (const other of [...folders.keys()]) if (other !== key) closeFolder(other, false);
  const existing = folders.get(key);
  if (existing) {
    render(existing, regiment);
    $(existing).dialog("moveToTop");
    return;
  }
  const el = document.createElement("div");
  el.id = `flFolder${key}`;
  el.className = "dialog flFolder";
  ensureEl("dialogs").append(el);
  folders.set(key, el);
  render(el, regiment);
  const previous = [...folders.values()].at(-2);
  $(el).dialog({
    title: regiment.name,
    resizable: false,
    width: "20em",
    position: previous // side by side, so rows can be dragged between them
      ? { my: "left top", at: "right+8 top", of: $(previous).dialog("widget"), collision: "fit" }
      : { my: "left top", at: "left+10 top+10", of: "#map" },
    close: () => closeFolder(key),
    focus: () => {
      const r = regimentOf(regiment.state, regiment.i);
      if (r && picked !== r) pick(r);
    }
  });
}

/** A settlement's panel, replacing any open folder; with Shift, beside it */
function openSettlement(burgId: number, beside = false): void {
  const burg = pack.burgs[burgId];
  if (!burg?.i || burg.removed) return;
  const key = `b${burgId}`;
  if (!beside) for (const other of [...folders.keys()]) if (other !== key) closeFolder(other, false);
  const existing = folders.get(key);
  if (existing) {
    renderSettlement(existing, burgId);
    $(existing).dialog("moveToTop");
    return;
  }
  const el = document.createElement("div");
  el.className = "dialog flFolder flSettlement";
  el.dataset.key = key;
  ensureEl("dialogs").append(el);
  folders.set(key, el);
  renderSettlement(el, burgId);
  $(el).dialog({
    title: t("Settlement"),
    resizable: false,
    width: "24em",
    position: { my: "left top", at: "left+10 top+10", of: "#map" },
    close: () => closeFolder(el.dataset.key!)
  });
  // ◀ ▶ step through the nation's settlements in the same panel
  const bar = $(el).dialog("widget").find(".ui-dialog-titlebar")[0];
  const title = bar?.querySelector(".ui-dialog-title");
  if (title)
    for (const [dir, label] of [
      [-1, "◀"],
      [1, "▶"]
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "flStep";
      button.textContent = label;
      button.addEventListener("click", () => stepSettlement(el, dir));
      if (dir < 0) title.before(button);
      else title.after(button);
    }
}

/** The panel moves to the nation's previous or next settlement */
function stepSettlement(el: HTMLElement, dir: number): void {
  const from = Number(el.dataset.key?.slice(1));
  const list = settlementsOf(pack.burgs[from]?.state ?? 0);
  if (list.length < 2) return;
  const to = list[(list.indexOf(from) + dir + list.length) % list.length];
  if (folders.has(`b${to}`)) return;
  folders.delete(`b${from}`);
  folders.set(`b${to}`, el);
  el.dataset.key = `b${to}`;
  recruiting = null;
  renderSettlement(el, to);
  const burg = pack.burgs[to];
  zoomTo(burg.x, burg.y, Math.max(viewport.scale || 1, 4), 600);
}

function closeFolder(key: string, letGo = true): void {
  const el = folders.get(key);
  folders.delete(key);
  if (el) {
    $(el).dialog("destroy");
    el.remove();
  }
  if (letGo && !folders.size) pick(null);
}

const slotRow = (list: List, unit: string, count: number, state: number, at: Burg | null = null) => {
  const kit = kitOf(unit) ?? KIT[0];
  // ++ upgrades the row a tier, paid by the settlement it stands in; the tip says to what and for how much
  let up = "";
  const next = nextTier(kit);
  if (at && list === "u" && next) {
    const why = upgradeRefusal(at, kit, count);
    const tip = `${t("Upgrade to")} ${unitName(next)} · §${upgradeCost(kit, count)}${why ? ` · ${t(why)}` : ""}`;
    up = `<button type="button" class="flUp${why ? " flOff" : ""}" data-burg="${at.i}" data-tip="${escapeHtml(tip)}">++</button>`;
  }
  const whole = Math.min(1, count / perSlot(kit));
  return `<div class="flSlot" data-drag="row" data-list="${list}" data-unit="${escapeHtml(unit)}" data-count="${count}">
    <img src="${cardUrl(kit, colourOf(state), whole)}" alt="" /><span class="flSlotName">${escapeHtml(unit)}</span>
    ${up}<button type="button" class="flGear" data-tip="${t("Edit Unit")}">⚙</button>
    <span class="flSlotCount">${count.toLocaleString()}</span></div>`;
};
const emptyRow = (list: List) => `<div class="flSlot flEmpty" data-list="${list}"></div>`;

function render(el: HTMLElement, regiment: Regiment): void {
  const room = cargoSlots(regiment);
  const own = rows(regiment.u);
  const aboard = rows(regiment.cargo);
  const lead = kitOf(typeOf(regiment) ?? "");
  const art = lead ? cardUrl(lead, colourOf(regiment.origin ?? regiment.state), health(regiment)) : "";
  const home = pack.burgs[pack.cells.burg[mainCell(regiment.cell)]];
  const upAt = home?.i && !home.removed && home.state === regiment.state && sizeOf(home) ? home : null;
  const unitRows = own.map(row => slotRow("u", row.unit, row.count, regiment.state, upAt)).join("");
  const holdRows =
    aboard.map(row => slotRow("cargo", row.unit, row.count, regiment.state)).join("") +
    Array.from({ length: Math.max(0, room - aboard.length) }, () => emptyRow("cargo")).join("");
  const at = home?.i && !home.removed ? home : null;
  const drop = `${regiment.state}-${regiment.i}`;

  el.innerHTML = /* html */ `
    <div class="flFolderHead">
      <img class="flFolderArt" src="${art}" alt="" data-drag="army" data-tip="${t("Drag onto the map to move it")}" />
      <div>
        <input class="flFolderName" value="${escapeHtml(regiment.name)}" data-tip="${t("Type to rename")}" spellcheck="false" />
        <div class="flFolderSub">${t("Power")} ${short(cardPower(regiment))} · ${short(troopsOf(regiment))} ${t("troops")} · ${Math.round(health(regiment) * 100)}%</div>
        ${at ? `<div class="flFolderSub">${t("At")} <a class="flAt" data-burg="${at.i}">${escapeHtml(at.name ?? "")} ›</a></div>` : ""}
        <div class="flFolderSub flNationLine">${t("Nation")}: <select class="flAssign">${pack.states
          .filter(st => st.i && !st.removed)
          .map(
            st =>
              `<option value="${st.i}" ${st.i === regiment.state ? "selected" : ""}>${escapeHtml(st.name)}${st.i === regiment.origin ? ` (${t("origin")})` : ""}</option>`
          )
          .join(
            ""
          )}</select><button type="button" class="flAssignPick" data-tip="${t("Pick a nation on the map")}">⌖</button></div>
      </div>
    </div>
    <div class="flSlots" data-list="u" data-drop="${drop}" data-drop-list="u">${unitRows || emptyRow("u")}</div>
    ${room ? `<div class="flFolderSub">${t("Hold")} ${aboard.length}/${room}</div><div class="flSlots flHold" data-list="cargo" data-drop="${drop}" data-drop-list="cargo">${holdRows}</div>` : ""}
    <div class="flFolderBottom">
      ${px("attack", "attack", t("Attack a regiment next to this one"))}
      ${room ? px("unload", "unload", t("Unload the hold onto the coast beside it")) : ""}
      ${px("encamp", "encamp", t("Encamp: rest and repair, the strength bar refills (no new troops)"))}
      ${px("add", "recruit", t("Raise a new group: click on the map"))}
      ${px("", "notes", t("Notes"), `flFolderNote${keyOf(regiment)}`)}
      ${px("delete", "release", t("Release: its troops go home to the settlement they came from"))}
    </div>`;
  el.querySelector(".flAt")?.addEventListener("click", () => openSettlement(at!.i, true));
  el.querySelector<HTMLSelectElement>(".flAssign")?.addEventListener("change", function () {
    assignTo(regiment, +this.value);
  });
  el.querySelector(".flAssignPick")?.addEventListener("click", () => pickNation(state => assignTo(regiment, state)));
  el.querySelector<HTMLElement>(".flFolderArt")?.addEventListener("pointerdown", event =>
    pressed(event, () => ({ kind: "units", regs: [regiment], from: "panel" }))
  );

  for (const button of el.querySelectorAll<HTMLButtonElement>(".flFolderBottom button[data-act]"))
    button.classList.toggle("pressed", button.dataset.act === mode && picked === regiment);
  el.querySelector<HTMLInputElement>(".flFolderName")!.addEventListener("change", function () {
    if (!this.value.trim())
      regiment.named = false; // back to its base name
    else Military.rename(regiment.state, regiment.i, this.value);
    $(el).dialog("option", "title", regiment.name);
    changed();
  });
  el.querySelector(".flFolderBottom")!.addEventListener("click", event => {
    const act = (event.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act) action(act, regiment);
  });
  el.querySelector(`#flFolderNote${keyOf(regiment)}`)?.addEventListener(
    "click",
    () => void Controllers.NotesEditor.open({ type: "regiment", id: regiment.state, sub: regiment.i })
  );
  for (const box of el.querySelectorAll<HTMLElement>(".flSlots")) wireSlots(box, regiment);
}

/** A folder button with a pixel icon */
const px = (act: string, icon: string, tip: string, id = "") =>
  `<button type="button" class="flPx"${act ? ` data-act="${act}"` : ""}${id ? ` id="${id}"` : ""} data-tip="${tip}"><img src="${buttonUrl(icon)}" alt="" /></button>`;

/** Hand an army to another nation; its folder follows it */
function assignTo(regiment: Regiment, state: number): void {
  const key = keyOf(regiment);
  const why = assign(regiment, state);
  if (why) {
    report(why);
    return;
  }
  closeFolder(key, false);
  changed();
  openFolder(regiment);
  pick(regiment);
  tip(
    regiment.origin
      ? t("{{name}} now serves {{nation}}", { name: regiment.name, nation: pack.states[state].name })
      : t("{{name}} is home again", { name: regiment.name }),
    false,
    "success"
  );
}

/** Click a nation's land (or anything of its) on the map; Escape or a click on the sea cancels */
function pickNation(done: (state: number) => void): void {
  document.body.classList.add("flPicking");
  tip(t("Click a nation on the map"), true);
  const finish = () => {
    document.body.classList.remove("flPicking");
    document.removeEventListener("click", onPick, true);
    document.removeEventListener("keyup", onKey, true);
    clearMainTip();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") finish();
  };
  const onPick = (event: MouseEvent) => {
    if ((event.target as Element).closest(".ui-dialog")) return;
    event.stopPropagation();
    event.preventDefault();
    finish();
    const point = mapPoint(event.clientX, event.clientY);
    const cell = point ? cellAtPoint(point[0], point[1]) : undefined;
    const state = cell === undefined ? 0 : pack.cells.state[cell];
    if (state) done(state);
  };
  document.addEventListener("click", onPick, true);
  document.addEventListener("keyup", onKey, true);
}

// --- settlements: a panel like the nation's: who and what it is, its money, manpower and forces, in tabs

const CLASS_ICON: Record<SettlementClass, string> = {
  barracks: "land_infantry_t2",
  armoury: "land_armour_t1",
  harbour: "naval_combat_t1",
  airbase: "air_combat_t1",
  market: ""
};
let recruiting: number | null = null; // the settlement whose recruit form is open
let recruitUnit = ""; // the unit type last picked in it
type SettleTab = "military" | "economy" | "notes";
let settleTab: SettleTab = "military";
let settleFilter = "all";
let settleSort: "power" | "troops" | "name" = "power";
let renamingBurg = 0;

function classIcon(c: SettlementClass, on: boolean): string {
  const colour = on ? "#ffffff" : "#8a8a8a";
  const kit = KIT.find(k => k.id === CLASS_ICON[c]);
  return kit ? iconUrl(kit, colour, "silhouette") : stallUrl(colour);
}

function goodsOf(burg: Burg): string {
  const pool = Production.getBurgProduction(burg) ?? {};
  return Object.entries(pool)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, amount]) => {
      const good = Goods.get(+id);
      if (!good) return "";
      return `<span class="flGood" data-tip="${escapeHtml(good.name)}: ${amount}"><svg width="1em" height="1em"><use href="${Icons.href(good.icon)}"${goodIconLines()}></use></svg>${amount}</span>`;
    })
    .join("");
}

const openParts = new Set<string>(); // folded sections a settlement folder keeps open: "b12:g" (garrison), "b12:3-7"

/** The settlement a nested folder's rows upgrade at: the garrison's own, or the one an army stands in */
const partBurg = (r: Regiment): Burg | null => {
  const b = pack.burgs[r.garrison || pack.cells.burg[mainCell(r.cell)]];
  return b?.i && !b.removed && b.state === r.state && sizeOf(b) ? b : null;
};

/** A nested folder in a settlement: an army or the garrison, its units as rows */
function partFolder(key: string, r: Regiment, title: string, cap: number, open: boolean, garrisonOfBurg = 0): string {
  const lead = kitOf(flagship(r) ?? "");
  const icon = lead
    ? `<img src="${cardUrl(lead, colourOf(r.state), garrisonOfBurg ? 1 : health(r))}" alt="" />`
    : "<span class='flNoIcon'></span>";
  const items = rows(r.u);
  const empty = Math.max(0, cap - slotsOf(r.u));
  return /* html */ `<details class="flPart" data-part="${key}" data-state="${r.state}" data-id="${r.i}" ${open ? "open" : ""}>
    <summary data-drag="army" data-tip="${garrisonOfBurg ? t("Drag onto the map to march out") : t("Drag onto the map to move it")}">${icon}<span class="flPartName">${escapeHtml(title)}</span>
      <span class="flPartSize">${short(troopsOf(r))} (${cardPower(r)})</span>
      ${garrisonOfBurg ? "" : px("", "locate", t("Locate"))}
    </summary>
    <div class="flSlots" data-list="u" data-drop="${r.state}-${r.i}" data-drop-list="u">${items.map(row => slotRow("u", row.unit, row.count, r.state, partBurg(r))).join("")}${Array.from(
      { length: empty },
      () => `<div class="flSlot flEmpty flNoAdd" data-list="u"></div>`
    ).join("")}</div>
  </details>`;
}

const SETTLE_FILTERS: [string, string][] = [
  ["all", "All"],
  ["infantry", "Infantry"],
  ["assault", "Assault"],
  ["cavalry", "Cavalry"],
  ["armour", "Armour"],
  ["naval", "Ships"],
  ["air", "Airships"]
];

const unitCategory = (unit: string) => {
  const kit = kitOf(unit);
  return !kit ? "infantry" : kit.domain === "land" ? kit.role : kit.domain;
};

/** The nation's settlements in panel order, for ◀ ▶ */
function settlementsOf(state: number): number[] {
  return pack.burgs
    .filter(b => b?.i && !b.removed && b.state === state)
    .sort(
      (a, b) =>
        Number(isCapital(b)) - Number(isCapital(a)) ||
        RANKS.indexOf(rankOf(b)) - RANKS.indexOf(rankOf(a)) ||
        (a.name ?? "").localeCompare(b.name ?? "")
    )
    .map(b => b.i);
}

function settlementMilitary(burg: Burg, garrison: Regiment | null, here: Regiment[]): string {
  const id = burg.i;
  const matches = (r: Regiment) =>
    settleFilter === "all" || Object.keys(r.u).some(u => unitCategory(u) === settleFilter);
  const sorted = here
    .filter(matches)
    .sort((a, b) =>
      settleSort === "name"
        ? a.name.localeCompare(b.name)
        : settleSort === "troops"
          ? troopsOf(b) - troopsOf(a)
          : cardPower(b) - cardPower(a)
    );
  const gKey = `b${id}:g`;
  const aKey = `b${id}:a`;
  if (!openParts.has(`${gKey}:seen`)) {
    openParts.add(`${gKey}:seen`);
    openParts.add(`${gKey}:s`); // both sections and the garrison open by default
    openParts.add(`${aKey}:s`);
    openParts.add(gKey);
  }
  const cap = sizeOf(burg) ? GARRISON_SLOTS[sizeOf(burg)!] : 0;
  return /* html */ `
    <div class="flTools">
      <select data-settle-filter>${SETTLE_FILTERS.map(([v, l]) => `<option value="${v}" ${v === settleFilter ? "selected" : ""}>${t(l)}</option>`).join("")}</select>
      <select data-settle-sort>${[
        ["power", "Power"],
        ["troops", "Troops"],
        ["name", "Name"]
      ]
        .map(([v, l]) => `<option value="${v}" ${v === settleSort ? "selected" : ""}>${t("Sort")}: ${t(l)}</option>`)
        .join("")}</select>
    </div>
    ${
      garrison && matches(garrison)
        ? `<details class="flSection" data-part="${gKey}:s" ${openParts.has(`${gKey}:s`) ? "open" : ""}><summary>${t("Garrison")}</summary>${partFolder(gKey, garrison, garrison.name, cap, openParts.has(gKey), id)}</details>`
        : ""
    }
    <details class="flSection" data-part="${aKey}:s" ${openParts.has(`${aKey}:s`) ? "open" : ""}><summary>${t("Armies")} (${sorted.length})</summary>
      ${sorted.map(r => partFolder(`b${id}:${keyOf(r)}`, r, r.name, MAX_SLOTS, openParts.has(`b${id}:${keyOf(r)}`))).join("") || `<div class="flFolderSub">${t("No armies")}</div>`}
    </details>`;
}

function settlementEconomy(burg: Burg): string {
  const current = classOf(burg);
  const button = (c: SettlementClass | null) => {
    const on = current === c;
    const name = c ? t(CLASSES[c].name) : t("None");
    const why = on ? "" : classRefusal(burg, c);
    const price = c ? ` · §${CLASSES[c].cost}` : "";
    const tipText = c
      ? `${name} · ${t(CLASSES[c].unlocks)}${price}${why ? ` · ${t(why)}` : ""}`
      : `${name}${why ? ` · ${t(why)}` : ""}`;
    const art = c ? `<img src="${classIcon(c, on)}" alt="" />` : "<span>–</span>";
    return `<button type="button" class="flClass${on ? " on" : ""}${why ? " off" : ""}" data-class="${c ?? ""}" data-tip="${tipText}">${art}</button>`;
  };
  return /* html */ `
    <div class="flFolderSub">${t("Class")}: <b>${current ? t(CLASSES[current].name) : t("None")}</b>${sizeOf(burg) ? "" : ` · ${t("Grow it into a town to give it a class")}`}</div>
    <div class="flClasses">${[null, ...CLASS_ORDER].map(button).join("")}</div>
    <div class="flFolderSub">${t("Goods")}</div>
    <div class="flGoods">${goodsOf(burg) || `<span class="flFolderSub">${t("None")}</span>`}</div>`;
}

function renderSettlement(el: HTMLElement, burgId: number): void {
  const burg = pack.burgs[burgId];
  if (!burg?.i || burg.removed) return;
  const size = sizeOf(burg);
  const rank = rankOf(burg);
  const garrison = size ? ensureGarrison(burg) : null;
  const state = burg.state ?? 0;
  if (state) void EmblemRenderer.trigger(`stateCOA${state}`, pack.states[state].coa);
  const capital = isCapital(burg);
  const sizePick = `<select class="flSize" data-tip="${t("Size: growing costs money, shrinking gives half back")}">${RANKS.map(
    r => {
      const cost = resizeCost(rank, r);
      const label = r === rank ? t(RANK_NAME[r]) : `${t(RANK_NAME[r])} (${cost > 0 ? `§${cost}` : `+§${-cost}`})`;
      return `<option value="${r}" ${r === rank ? "selected" : ""} ${capital && r !== "citadel" ? "disabled" : ""}>${label}</option>`;
    }
  ).join("")}</select>`;
  const star =
    rank === "citadel" && state
      ? `<button type="button" class="flPx flStar${capital ? " on" : ""}" data-act="capital" data-tip="${capital ? t("The capital") : t("Make it the capital")}"><img src="${buttonUrl("star", capital ? "#ffd34d" : "#7a7a7a")}" alt="" /></button>`
      : "";
  const here = (pack.states[state]?.military ?? []).filter(
    r => !r.hidden && !r.garrison && mainCell(r.cell) === mainCell(burg.cell)
  );
  const garrisonTroops = garrison ? troopsOf(garrison) : 0;
  const armyTroops = here.reduce((sum, r) => sum + troopsOf(r), 0);
  const nation = pack.states[state];
  const name =
    renamingBurg === burgId
      ? `<input class="flFolderName" value="${escapeHtml(burg.name ?? "")}" spellcheck="false" />`
      : `<b class="flSettleName">${escapeHtml(burg.name ?? "")}</b><button type="button" class="flEdit" data-act="rename" data-tip="${t("Rename")}">✎</button>`;
  const tabs: [SettleTab, string][] = [
    ["military", t("Military")],
    ["economy", t("Economy")],
    ["notes", t("Notes")]
  ];
  const note = Notes.get({ type: "burg", id: burgId }) ?? "";
  const body =
    settleTab === "economy"
      ? settlementEconomy(burg)
      : settleTab === "notes"
        ? `<div class="flNote" contenteditable="true" data-burg-note="${burgId}">${note}</div>`
        : settlementMilitary(burg, garrison, here);

  el.innerHTML = /* html */ `
    <div class="flFolderHead">
      <svg class="flFolderArt flNationLink" viewBox="0 0 200 200" data-tip="${t("Open the nation")}"><use href="#stateCOA${state}"></use></svg>
      <div>
        <div class="flNameLine">${name}</div>
        <div class="flFolderSub">${state ? `<a class="flNationLink">${escapeHtml(nation?.name ?? "")}</a>` : t("Neutral")}</div>
        <div class="flFolderSub flSizeLine">${sizePick}${star}${px("lock", burg.lock ? "locked" : "unlocked", burg.lock ? t("Unlock") : t("Lock"))}</div>
      </div>
    </div>
    ${purseBlocks(burg)}
    <div class="flPurse"><div class="flPurseHead">${t("Military")}<span class="flSummary">${t("Garrison")} ${short(garrisonTroops)} · ${t("Armies")} ${short(armyTroops)}</span></div></div>
    <nav class="flTabs">${tabs.map(([key, label]) => `<button type="button" data-settle-tab="${key}" class="${key === settleTab ? "on" : ""}">${label}</button>`).join("")}</nav>
    <div class="flTabBody">${body}</div>
    ${recruiting === burgId ? recruitForm(burg) : ""}
    <div class="flFolderBottom flSplit">
      ${px("recruit", "recruit", t("Recruit"))}
      ${px("remove", "delete", t("Delete"))}
    </div>`;
  el.querySelector('[data-act="recruit"]')?.classList.toggle("pressed", recruiting === burgId);
  wirePurse(el, burg, (why, at) => report(why, at));

  const nameInput = el.querySelector<HTMLInputElement>("input.flFolderName");
  if (nameInput) {
    nameInput.focus();
    nameInput.select();
    const done = () => {
      renamingBurg = 0;
      if (nameInput.value.trim()) {
        Burgs.rename(burgId, nameInput.value.trim());
        Layers.draw("labels");
      }
      renderSettlement(el, burgId);
    };
    nameInput.addEventListener("change", done);
    nameInput.addEventListener("keydown", event => {
      if (event.key === "Enter") nameInput.blur();
      if (event.key === "Escape") {
        renamingBurg = 0;
        renderSettlement(el, burgId);
      }
    });
  }
  el.querySelector<HTMLSelectElement>(".flSize")?.addEventListener("change", function () {
    askResize(burg, this.value as Rank, el);
  });
  for (const link of el.querySelectorAll(".flNationLink"))
    link.addEventListener("click", () => {
      if (state) openNation(state);
    });
  el.querySelector(".flTabs")?.addEventListener("click", event => {
    const tab = (event.target as HTMLElement).closest<HTMLElement>("[data-settle-tab]")?.dataset.settleTab;
    if (!tab) return;
    settleTab = tab as SettleTab;
    renderSettlement(el, burgId);
  });
  el.querySelector<HTMLSelectElement>("[data-settle-filter]")?.addEventListener("change", function () {
    settleFilter = this.value;
    renderSettlement(el, burgId);
  });
  el.querySelector<HTMLSelectElement>("[data-settle-sort]")?.addEventListener("change", function () {
    settleSort = this.value as typeof settleSort;
    renderSettlement(el, burgId);
  });
  el.querySelector(".flClasses")?.addEventListener("click", event => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-class]");
    if (!button) return;
    askClass(burg, (button.dataset.class || null) as SettlementClass | null, button);
  });
  el.querySelector<HTMLElement>("[data-burg-note]")?.addEventListener("input", function () {
    Notes.set({ type: "burg", id: burgId }, this.innerHTML.trim());
  });
  for (const button of el.querySelectorAll<HTMLElement>(".flFolderHead [data-act], .flFolderBottom [data-act]"))
    button.addEventListener("click", () => settlementAction(button.dataset.act!, burg, el));
  for (const section of el.querySelectorAll<HTMLDetailsElement>("details.flSection"))
    section.addEventListener("toggle", () => {
      if (section.open) openParts.add(section.dataset.part!);
      else openParts.delete(section.dataset.part!);
    });
  for (const part of el.querySelectorAll<HTMLDetailsElement>("details.flPart")) {
    const r = regimentOf(+part.dataset.state!, +part.dataset.id!);
    if (!r) continue;
    part.addEventListener("toggle", () => {
      if (part.open) openParts.add(part.dataset.part!);
      else openParts.delete(part.dataset.part!);
    });
    const box = part.querySelector<HTMLElement>(".flSlots");
    if (box) wireSlots(box, r);
    const summary = part.querySelector("summary")!;
    summary.querySelector(".flPx")?.addEventListener("click", event => {
      event.preventDefault();
      zoomTo(r.x, r.y, 6, 900);
    });
    summary.addEventListener("pointerdown", event => {
      if ((event.target as Element).closest("button")) return;
      pressed(event, () => ({ kind: "units", regs: [r], from: "panel" }));
    });
  }
  if (recruiting === burgId) wireRecruit(el, burg);
}

/** Change size after a confirm that says what it costs and what it does to manpower and the garrison */
function askResize(burg: Burg, to: Rank, el: HTMLElement): void {
  const from = rankOf(burg);
  const why = resizeRefusal(burg, to);
  if (why) {
    report(t(why), el.querySelector(".flSize"));
    renderSettlement(el, burg.i);
    return;
  }
  const cost = resizeCost(from, to);
  const gain = manpowerGain(burg, to);
  const lines = [
    cost > 0 ? t("Costs §{{n}}", { n: cost }) : t("Gives §{{n}} back", { n: -cost }),
    gain ? t("+{{n}} manpower", { n: gain }) : "",
    RANKS.indexOf(to) < RANKS.indexOf(from)
      ? to === "village"
        ? t("The garrison marches out and the class is given up")
        : t("The garrison holds {{n}} slots; the rest march out", { n: GARRISON_SLOTS[to as Size] })
      : ""
  ].filter(Boolean);
  confirmationDialog({
    title: t(RANK_NAME[to]),
    message: `${t("Make {{name}} a {{size}}?", { name: burg.name ?? "", size: t(RANK_NAME[to]).toLowerCase() })}<br>${lines.join("<br>")}`,
    confirm: t("Confirm"),
    onConfirm: () => {
      resize(burg, to);
      play("build");
      changed();
    },
    onCancel: () => renderSettlement(el, burg.i)
  });
}

/** Change class after a confirm with its price */
function askClass(burg: Burg, c: SettlementClass | null, button: Element): void {
  if (classOf(burg) === c) return;
  const why = classRefusal(burg, c);
  if (why) {
    report(t(why), button);
    return;
  }
  const old = classOf(burg);
  const back = old ? Math.round(CLASSES[old].cost / 2) : 0;
  const lines = [c ? t("Costs §{{n}}", { n: CLASSES[c].cost }) : "", back ? t("Gives §{{n}} back", { n: back }) : ""];
  confirmationDialog({
    title: c ? t(CLASSES[c].name) : t("No class"),
    message: `${c ? t("Make {{name}} a {{class}}?", { name: burg.name ?? "", class: t(CLASSES[c].name) }) : t("Give up {{name}}'s class?", { name: burg.name ?? "" })}<br>${lines.filter(Boolean).join("<br>")}`,
    confirm: t("Confirm"),
    onConfirm: () => {
      const why = setClass(burg, c);
      if (why) report(t(why), button);
      else play("build");
      Layers.draw("burgIcons");
      changed();
    }
  });
}

/** A settlement made bigger or smaller; a garrison that no longer fits marches its extra out as an army */
function resize(burg: Burg, to: Rank): void {
  const why = resizeTo(burg, to);
  if (why) {
    report(t(why));
    return;
  }
  const garrison = garrisonOf(burg);
  if (!garrison) {
    Layers.draw("burgIcons", "labels");
    return;
  }
  const cap = garrisonSlots(burg.i);
  const extra: Record<string, number> = {};
  const kept = rows(garrison.u);
  while (kept.length > cap) {
    const row = kept.pop()!;
    extra[row.unit] = (extra[row.unit] ?? 0) + row.count;
  }
  if (Object.keys(extra).length) {
    const made = hasRoom(burg.state!, burg.cell, rows(extra).length) ? formArmy(burg, extra) : "full";
    if (typeof made === "string") {
      for (const [unit, n] of Object.entries(extra)) {
        garrison.u[unit] -= n;
        if (garrison.u[unit] <= 0) delete garrison.u[unit];
      }
      sendHome({ ...garrison, home: 0, garrison: 0 }, extra);
    }
    garrison.a = troopsOf(garrison);
    tip(
      typeof made === "string"
        ? t("The extra troops went home: no room on the map")
        : t("The extra troops marched out"),
      false,
      "info"
    );
  }
  if (!cap && !troopsOf(garrison)) Military.remove(garrison.state, garrison.i);
  Layers.draw("burgIcons", "labels");
}

function recruitForm(burg: Burg): string {
  const options = recruitable(burg);
  if (!options.length)
    return `<div class="flRecruit flFolderSub">${t("Nothing to raise: it needs manpower, or a class")}</div>`;
  return /* html */ `<div class="flRecruit">
    <select class="flRecruitUnit">${[...new Set(options.map(categoryOf))]
      .map(
        group =>
          `<optgroup label="${t(group)}">${options
            .filter(k => categoryOf(k) === group)
            .map(
              k =>
                `<option value="${k.id}" ${k.id === recruitUnit ? "selected" : ""}>${escapeHtml(unitName(k))}</option>`
            )
            .join("")}</optgroup>`
      )
      .join("")}</select>
    <div class="flRecruitLine flFieldLine">${numberField("count", 0, t("How many to raise"))}<button type="button" class="flRecruitGo">${t("Raise")}</button></div>
    <div class="flFolderSub flRecruitCost"></div>
  </div>`;
}

function wireRecruit(el: HTMLElement, burg: Burg): void {
  const unit = el.querySelector<HTMLSelectElement>(".flRecruitUnit");
  const field = el.querySelector<HTMLElement>(".flRecruit .flField");
  const cost = el.querySelector<HTMLElement>(".flRecruitCost");
  if (!unit || !field || !cost) return;
  const kit = () => KIT.find(k => k.id === unit.value)!;
  const costLine = (n: number) => {
    const k = kit();
    return `${t("Cost")}: ${peopleFor(unitName(k), n).toLocaleString()} ${t("Manpower")} · §${priceOf(k, n).toLocaleString()} · ${t("Up To")} ${recruitLimit(burg, k).toLocaleString()}`;
  };
  {
    const k = kit();
    const start = Math.min(perSlot(k), recruitLimit(burg, k));
    cost.textContent = costLine(start);
    wireField(field, {
      current: () => 0,
      start,
      min: 1,
      max: () => recruitLimit(burg, kit()),
      preview: n => {
        cost.textContent = costLine(n);
        return "";
      },
      apply: n => recruit(burg, kit(), n),
      done: why => {
        if (why) {
          report(why, field);
          return;
        }
        play("pouch");
        tip(t("Raised in {{name}}", { name: burg.name }), false, "success", 1800);
        changed();
      }
    });
  }
  unit.addEventListener("change", () => {
    recruitUnit = unit.value;
    renderSettlement(el, burg.i);
  });
  el.querySelector(".flRecruitGo")?.addEventListener("click", () =>
    el.querySelector<HTMLButtonElement>(".flRecruit .flTick")?.click()
  );
}

function settlementAction(act: string, burg: Burg, el: HTMLElement): void {
  if (act === "recruit") {
    recruiting = recruiting === burg.i ? null : burg.i;
    renderSettlement(el, burg.i);
    return;
  }
  if (act === "rename") {
    renamingBurg = burg.i;
    renderSettlement(el, burg.i);
    return;
  }
  if (act === "capital") {
    if (isCapital(burg) || !burg.state) return;
    confirmationDialog({
      title: t("Capital"),
      message: t("Make {{name}} the capital of {{state}}? The treasury moves with it.", {
        name: burg.name ?? "",
        state: pack.states[burg.state].name
      }),
      confirm: t("Confirm"),
      onConfirm: () => {
        Burgs.setCapital(burg.i);
        Layers.draw("burgIcons", "labels");
        changed();
      }
    });
    return;
  }
  if (act === "lock") {
    burg.lock = !burg.lock;
    renderSettlement(el, burg.i);
    return;
  }
  if (act === "remove") {
    if (isCapital(burg)) {
      report(t("Move the capital first"));
      return;
    }
    confirmationDialog({
      title: t("Delete"),
      message: t("Delete {{name}}? Its garrison goes to the capital.", { name: burg.name }),
      confirm: t("Delete"),
      onConfirm: () => {
        const garrison = garrisonOf(burg);
        if (garrison) {
          sendHome({ ...garrison, home: 0, garrison: 0 });
          Military.remove(garrison.state, garrison.i);
        }
        Burgs.remove(burg.i);
        closeFolder(`b${burg.i}`);
        Layers.draw("burgIcons", "labels");
        changed();
      }
    });
  }
}

// --- rows: a click chooses them (Shift a run, Ctrl or Cmd one more), dragging carries the chosen ones

function wireSlots(box: HTMLElement, regiment: Regiment): void {
  const rowsOf = () => [...box.querySelectorAll<HTMLElement>(".flSlot:not(.flEmpty)")];
  let anchor: HTMLElement | null = null;
  for (const row of rowsOf()) {
    row.addEventListener("click", event => {
      if ((event.target as HTMLElement).closest("button, input, select")) return;
      const all = rowsOf();
      if (event.shiftKey && anchor) {
        const [a, b] = [all.indexOf(anchor), all.indexOf(row)].sort((x, y) => x - y);
        for (const [k, r] of all.entries()) r.classList.toggle("flChosenRow", k >= a && k <= b);
        return;
      }
      if (event.ctrlKey || event.metaKey) row.classList.toggle("flChosenRow");
      else {
        const only =
          row.classList.contains("flChosenRow") && all.filter(r => r.classList.contains("flChosenRow")).length === 1;
        for (const r of all) r.classList.remove("flChosenRow");
        if (!only) row.classList.add("flChosenRow");
      }
      anchor = row;
    });
    row.addEventListener("pointerdown", event => {
      if ((event.target as HTMLElement).closest("button, input, select")) return;
      pressed(event, (): Payload | null => {
        const from = regimentOf(regiment.state, regiment.i);
        if (!from) return null;
        const chosen = rowsOf().filter(r => r.classList.contains("flChosenRow") && r.dataset.list === row.dataset.list);
        const group = row.classList.contains("flChosenRow") ? chosen : [row];
        for (const r of group) r.classList.add("flCarried");
        return {
          kind: "rows",
          from,
          list: row.dataset.list as List,
          rows: [row, ...group.filter(r => r !== row)].map(r => ({ unit: r.dataset.unit!, count: +r.dataset.count! }))
        };
      });
    });
    row.querySelector(".flGear")?.addEventListener("click", () => editRow(row, regiment));
    row.querySelector<HTMLElement>(".flUp")?.addEventListener("click", function () {
      const at = pack.burgs[Number(this.dataset.burg)];
      if (!at) return;
      const why = order("Upgrade", () => upgrade(at, regiment, row.dataset.unit!, +row.dataset.count!));
      if (why) report(why, row);
      else play("pouch");
      changed();
    });
  }
  for (const row of box.querySelectorAll<HTMLElement>(".flEmpty:not(.flNoAdd)"))
    row.addEventListener("click", () => chooseUnit(row, regiment, row.dataset.list as List));
}

function report(why: string, el?: Element | null): void {
  if (!why) return;
  play("refuse");
  tip(t(why), false, "error", 2500);
  el?.classList.add("flRefused");
  setTimeout(() => el?.classList.remove("flRefused"), 400);
}

/** A ship with troops aboard let go on the shore beside it: tick who lands, then Land */
function chooseWhoLands(ship: Regiment, cell: number): void {
  const aboard = rows(ship.cargo);
  if (!aboard.length) return;
  const box = document.createElement("div");
  box.className = "flLanding";
  box.innerHTML = aboard
    .map(
      (row, k) =>
        `<label class="flSlot"><input type="checkbox" data-k="${k}" checked /><img src="${cardUrl(kitOf(row.unit) ?? KIT[0], colourOf(ship.state), Math.min(1, row.count / (perSlot(kitOf(row.unit) ?? KIT[0]) || 1)))}" alt="" /><span class="flSlotName">${escapeHtml(row.unit)}</span><span class="flSlotCount">${row.count.toLocaleString()}</span></label>`
    )
    .join("");
  confirmationDialog({
    title: t("Land troops"),
    message: box.outerHTML,
    confirm: t("Land"),
    onConfirm: () => {
      const ticked = [...document.querySelectorAll<HTMLInputElement>(".flLanding input:checked")].map(
        input => aboard[Number(input.dataset.k)]
      );
      const why = order("Unload", () => {
        for (const row of ticked) {
          if (!hasRoom(ship.state, cell, 1)) return "That cell is full: 4 units";
          const made = splitOff(ship, "cargo", row.unit, row.count, cell);
          if (typeof made === "string") return made;
          made.n = 0;
        }
        return "";
      });
      if (why) report(why);
      else play("unload");
      changed();
    }
  });
}

function mapPoint(x: number, y: number): [number, number] | null {
  const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
  const matrix = viewbox?.getScreenCTM()?.inverse();
  if (!matrix) return null;
  const point = new DOMPoint(x, y).matrixTransform(matrix);
  return [point.x, point.y];
}

// --- editing slots in place

function chooseUnit(row: HTMLElement, regiment: Regiment, list: List): void {
  if (row.querySelector("select")) return;
  const domain = list === "cargo" ? "land" : troopsOf(regiment) ? domainOf(regiment) : null;
  const choices = KIT.filter(
    unit => (domain ? unit.domain === domain : true) && (list === "u" || unit.role !== "transport")
  )
    .map(unitName)
    .filter(name => !refusal(regiment, list, name, 1));
  if (!choices.length) {
    report(t("No unit fits here"), row);
    return;
  }
  const picker = document.createElement("select");
  picker.innerHTML = `<option value="">${t("Add a unit")}…</option>${choices
    .map(name => `<option>${escapeHtml(name)}</option>`)
    .join("")}`;
  row.append(picker);
  picker.focus();
  picker.addEventListener("change", () => {
    if (picker.value) report(addSlot(regiment, list, picker.value), row);
    changed();
  });
  picker.addEventListener("blur", () => picker.remove());
}

/** The gear on a row: the unit's type and tier, and how many */
function editRow(row: HTMLElement, regiment: Regiment): void {
  if (row.querySelector("select")) return;
  const list = row.dataset.list as List;
  const unit = row.dataset.unit!;
  const count = +row.dataset.count!;
  const domain = domainOfUnit(unit);
  const transport = kitOf(unit)?.role === "transport";
  const choices = KIT.filter(k => k.domain === domain && (k.role === "transport") === transport);
  row.draggable = false;
  row.innerHTML = /* html */ `<select class="flRowType">${choices
    .map(k => {
      const name = unitName(k);
      return `<option value="${escapeHtml(name)}" ${name === unit ? "selected" : ""}>${escapeHtml(name)} · ${t("Tier")} ${k.tier}</option>`;
    })
    .join(
      ""
    )}</select><input class="flRowCount" type="number" min="1" value="${count}" /><button type="button" class="flRowOk">✓</button>`;
  const type = row.querySelector<HTMLSelectElement>(".flRowType")!;
  const amount = row.querySelector<HTMLInputElement>(".flRowCount")!;
  const limit = () => {
    const kit = kitOf(type.value);
    amount.max = String(kit ? perSlot(kit) : 1);
  };
  limit();
  type.addEventListener("change", limit);
  const apply = () => {
    report(changeRow(regiment, list, unit, count, type.value, +amount.value), row);
    changed();
  };
  row.querySelector(".flRowOk")!.addEventListener("click", apply);
  amount.addEventListener("keydown", event => {
    if (event.key === "Enter") apply();
    if (event.key === "Escape") changed();
  });
  amount.focus();
  amount.select();
}

// --- buttons

function action(act: string, regiment: Regiment): void {
  pick(regiment);
  if (act === "attack" || act === "add") {
    setMode(mode === act ? null : act);
    return;
  }
  if (act === "unload") {
    if (!slotsOf(regiment.cargo)) {
      report(t("Nothing aboard"));
      return;
    }
    if (!landingCells(regiment).length) {
      report(t("No coast in reach"));
      return;
    }
    chooseLanding(regiment, changed);
    return;
  }
  if (act === "encamp") {
    const why = encampRefusal(regiment);
    if (why) {
      report(why);
      return;
    }
    order("Encamp", () => {
      encamp(regiment);
      return "";
    });
    play("men");
    tip(t("{{name}} rests and repairs", { name: regiment.name }), false, "success");
    changed();
    return;
  }
  if (act === "delete")
    confirmationDialog({
      title: t("Release"),
      message: t("Release {{name}}? Its troops go home to the settlement they came from.", { name: regiment.name }),
      confirm: t("Release"),
      onConfirm: () => {
        order("Release", () => {
          sendHome(regiment, { ...regiment.u, ...(regiment.cargo ?? {}) });
          Military.remove(regiment.state, regiment.i);
          return "";
        });
        play("men");
        changed();
      }
    });
}

function setMode(next: typeof mode, battling = false): void {
  if (next === "attack") borrowView("military");
  else if (mode === "attack" && !battling) returnView();
  mode = next;
  for (const el of folders.values())
    for (const button of el.querySelectorAll<HTMLElement>("[data-act]"))
      button.classList.toggle("pressed", button.dataset.act === mode);
  clearMainTip();
  if (!mode) {
    applyDefaultViewboxEvents();
    return;
  }
  const message = {
    attack: t("Click a regiment next to this one to attack it"),
    add: t("Click on the map to raise a new group")
  }[mode];
  tip(message, true);
  select<SVGGElement, unknown>("#viewbox").style("cursor", "crosshair").on("click", onModeClick);
}

function onModeClick(this: SVGGElement, event: MouseEvent): void {
  const self = picked;
  if (!self) {
    setMode(null);
    return;
  }
  if (mode === "add") {
    const [x, y] = getPointer(event, this);
    const cell = cellAtPoint(x, y);
    if (cell === undefined) return;
    const id = Military.add(self.state, ...([x, y] as [number, number]));
    setMode(null);
    changed();
    const made = regimentOf(self.state, id);
    if (made) {
      openFolder(made);
      pick(made);
    }
    return;
  }
  const target = regimentAt(event.clientX, event.clientY, self);
  if (!target) {
    report(t("Click another group"));
    return;
  }
  if (mode === "attack") {
    setMode(null, true);
    if (!attack(self, target)) returnView();
  }
}

/** Charge, then open the battle; false when the attack isn't allowed */
function attack(attacker: Regiment, defender: Regiment): boolean {
  if (attacker.state === defender.state) {
    report(t("Cannot attack fraternal regiment"));
    return false;
  }
  if (!attacker.a || !defender.a) {
    report(t("Regiment has no troops to battle"));
    return false;
  }
  const at = mainCell(attacker.cell);
  const there = mainCell(defender.cell);
  if (at !== there && !neighbourCells(at).includes(there)) {
    report(t("Attack only a regiment in a cell next to this one"));
    return false;
  }
  borrowView("military");
  attacker.px = attacker.x;
  attacker.py = attacker.y;
  defender.px = defender.x;
  defender.py = defender.y;
  const el = elementOf(attacker);
  if (el)
    select(el)
      .transition(transition().duration(500).ease(easeSinInOut) as never)
      .tween(
        "charge",
        () => (k: number) =>
          placeRegiment(
            el,
            attacker.x + (defender.x - attacker.x) * k * 0.8,
            attacker.y + (defender.y - attacker.y) * k * 0.8
          )
      )
      .on("end", () => Controllers.BattleScreen.open(attacker, defender));
  for (const key of [...folders.keys()]) closeFolder(key);
  return true;
}

// --- what a card is, for the tooltip line

const roleName = (unit: string) => {
  const kit = kitOf(unit);
  return kit ? t(kit.role[0].toUpperCase() + kit.role.slice(1)) : "";
};

/** A unit: name, type, tier, troops, health; a pile: how many of what */
function unitLine(regiment: Regiment): string {
  const stack = stackOf(regiment);
  const unit = typeOf(regiment) ?? "";
  const kit = kitOf(unit);
  const many = stack && stack.members.length > 1 && spreadStack() !== stack ? stack.members : null;
  if (many) {
    const whole = many.reduce((sum, r) => sum + health(r), 0) / many.length;
    return `${many.length} × ${escapeHtml(unit)} · ${Math.round(whole * 100)}% · ${t("Shift-drag moves them all")}`;
  }
  const troops = kit?.domain === "land" ? ` · ${short(troopsOf(regiment))} ${t("troops")}` : "";
  const hold = cargoSlots(regiment) ? ` · ${t("Hold")} ${rows(regiment.cargo).length}/${cargoSlots(regiment)}` : "";
  return `${escapeHtml(regiment.name)} · ${roleName(unit)}${kit ? ` ${t("Tier")} ${kit.tier}` : ""}${troops}${hold} · ${Math.round(health(regiment) * 100)}%`;
}

/** Far out: a merged pile's units by type */
function pileLine(pile: Regiment[]): string {
  const count = new Map<string, number>();
  for (const r of pile) count.set(typeOf(r) ?? "", (count.get(typeOf(r) ?? "") ?? 0) + 1);
  const whole = pile.reduce((sum, r) => sum + health(r), 0) / pile.length;
  return `${[...count.entries()].map(([unit, n]) => `${n} × ${escapeHtml(unit)}`).join(", ")} · ${Math.round(whole * 100)}% · ${t("Click to zoom in")}`;
}

/** Whether a panel is being typed in: it isn't rebuilt under the cursor */
const typing = (el: HTMLElement) => {
  const active = document.activeElement as HTMLElement | null;
  return Boolean(active && el.contains(active) && active.matches("input, textarea, select, [contenteditable]"));
};
const stale = new Set<HTMLElement>(); // panels skipped while typed in, rebuilt when the typing ends

/** After any change: redraw, rebind, refresh the open folders and the other editors */
function changed(): void {
  Layers.draw("military");
  stackAll();
  bindRegiments();
  for (const [key, el] of [...folders]) refreshFolder(key, el);
  if (picked && !regimentOf(picked.state, picked.i)) pick(null);
  else pick(picked);
  refreshEditors();
}

function refreshFolder(key: string, el: HTMLElement): void {
  if (typing(el)) {
    stale.add(el);
    return;
  }
  stale.delete(el);
  if (key[0] === "b") {
    if (pack.burgs[+key.slice(1)]?.removed) closeFolder(key);
    else renderSettlement(el, +key.slice(1));
    return;
  }
  const r = regimentOf(...(key.split("-").map(Number) as [number, number]));
  if (!r) closeFolder(key);
  else render(el, r);
}

document.addEventListener("focusout", () =>
  setTimeout(() => {
    for (const [key, el] of [...folders]) if (stale.has(el)) refreshFolder(key, el);
  })
);

setDragHooks({ attack, land: chooseWhoLands, changed });

/** A settlement's tooltip: its name and size, and what its garrison holds */
function settlementLine(id: number): string {
  const burg = pack.burgs[id];
  if (!burg?.i) return "";
  const garrison = garrisonOf(burg);
  const units = garrison ? rows(garrison.u) : [];
  const slots = garrisonSlots(burg.i);
  const held = slots
    ? ` · ${t("Garrison")} ${units.length}/${slots}${units.length ? `: ${units.map(r => `${escapeHtml(r.unit)} ${short(r.count)}`).join(", ")}` : ""}`
    : "";
  return `${escapeHtml(burg.name ?? "")} · ${t(RANK_NAME[rankOf(burg)])}${held}`;
}

setTips(el => {
  const r = regimentFrom(el);
  if (!r) return null;
  return isFar() ? pileLine(pileOf(r)) : `${unitLine(r)}. ${t("Drag to move, double-click to open")}`;
}, settlementLine);

/** Ctrl+Z: the last unit order undone */
function undoLast(): void {
  const label = undoOrder();
  if (label === null) {
    tip(t("Nothing to undo"), false, "info", 1500);
    return;
  }
  play("undo");
  tip(t("Undone: {{what}}", { what: t(label) }), false, "info", 1800);
  changed();
}
window.addEventListener("fl:undo", undoLast);

export const RegimentEditor = {
  open: editRegiment,
  click: clickRegiment,
  bind: bindRegiments,
  clear: clearAll,
  settlement: openSettlement,
  recruit: (burgId: number) => {
    recruiting = burgId;
    openSettlement(burgId);
  }
};

window.addEventListener("fl:clear", clearAll);
// captured: the hotkeys handler stops keyup at the document
document.addEventListener(
  "keyup",
  event => {
    if (event.key === "Escape" && !(event.target as HTMLElement)?.closest?.("input, textarea, select")) clearAll();
  },
  true
);
