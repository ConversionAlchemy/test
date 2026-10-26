// Fluoria's folder for a regiment: Azgaar's regiment dialog, its units shown as one row per slot up to the cap.
// Rows drag between open folders, out onto the map to stand alone or join a regiment there, and into a transport.
// A regiment dragged onto another on the map merges with it, or loads into it if it's a transport
import { type D3DragEvent, drag, easeSinInOut, select, transition } from "d3";
import { confirmationDialog, refreshEditors } from "@/components/dialog/dialog-helpers";
import { Icons } from "@/components/icons";
import { Layers } from "@/components/layers";
import { clearMainTip, tip } from "@/components/tooltips";
import { applyDefaultViewboxEvents } from "@/components/viewbox-events";
import { viewport } from "@/components/viewport";
import { zoomTo } from "@/components/zoom";
import { Controllers } from "@/controllers";
import { canLoad, landingCells, load } from "@/fluoria/boarding";
import { addSlot, assign, changeRow, disband, encampRefusal, merge, regimentOf, splitOff } from "@/fluoria/forces/army";
import {
  cardPower,
  cargoSlots,
  domainOf,
  domainOfUnit,
  encamp,
  flagship,
  isTransport,
  kitOf,
  type List,
  MAX_SLOTS,
  mergeRefusal,
  perSlot as perChip,
  refusal,
  rows,
  shift,
  slotsOf,
  strength,
  troopsOf
} from "@/fluoria/forces/forces";
import { KIT } from "@/fluoria/forces/kit";
import { artUrl, buttonUrl, iconUrl, short, stallUrl } from "@/fluoria/forces/pixels";
import { borrowView, returnView } from "@/fluoria/map-view";
import { canStand, reachable } from "@/fluoria/movement";
import { openNation } from "@/fluoria/nation-panel";
import { cellAtPoint, mainCell, neighbours } from "@/fluoria/one-grid";
import { dimPixelMap, highlightCell } from "@/fluoria/pixel-map-sync";
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
  burgOfElement,
  CLASS_ORDER,
  CLASSES,
  categoryOf,
  classOf,
  classRefusal,
  ensureGarrison,
  formArmy,
  garrisonable,
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
  station,
  unitName,
  upgrade,
  upgradeCost,
  upgradeRefusal
} from "@/fluoria/settlements";
import { hidePeek, LINGER, onPeekDrag, peek, regimentGroup, unitTip } from "@/fluoria/unit-peek";
import {
  cellOf,
  chooseLanding,
  clearSelection,
  dragOver,
  dropAt,
  lightBay,
  moved,
  selectRegiment,
  stackAll
} from "@/fluoria/units";
import { atWar, enemiesIn, hasRoom } from "@/fluoria/war";
import { Notes } from "@/generators/notes";
import { goodIconLines } from "@/renderers/draw-goods";
import { artOf, chipOf, labelOf, paintColumn, placeRegiment } from "@/renderers/draw-military";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import type { Burg } from "../generators/burgs-generator";
import type { Regiment } from "../generators/military-generator";
import { ensureEl, getPointer } from "../utils";

const folders = new Map<string, HTMLElement>(); // open folders by "state-id"
let picked: Regiment | null = null; // the one whose reach is shown
let mode: "attack" | "merge" | "add" | null = null;

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

/** A click picks a unit; Shift adds it to the chosen ones, Ctrl or Cmd chooses its whole column; in a settlement's cell
 * it opens the settlement too */
function clickRegiment(selector: string, shift = false): void {
  if (customization) return;
  const regiment = regimentFrom(document.querySelector(selector));
  if (!regiment) return;
  bindRegiments();
  if (mode) return; // the mode's own click handles it
  if (shift) {
    elementOf(regiment)?.classList.toggle("fl-chosen");
    return;
  }
  const event = window.event as MouseEvent | undefined;
  if (event?.ctrlKey || event?.metaKey) {
    // the whole column of the nation's units in this cell
    for (const r of cellOf(regiment)) if (r.state === regiment.state) elementOf(r)?.classList.add("fl-chosen");
    return;
  }
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

/** Every regiment can be dragged at any time; a double-click on one opens its folder */
function bindRegiments(): void {
  const armies = select<SVGGElement, unknown>("#armies");
  armies.selectAll(":scope > g").classed("draggable", true);
  armies
    .selectAll<SVGGElement, unknown>(":scope > g:not(#flSettlements) > g")
    .call(drag<SVGGElement, unknown>().clickDistance(4).on("start", dragRegiment)); // a shaky click is still a click
  const node = armies.node();
  if (node && !node.dataset.flDouble) {
    node.dataset.flDouble = "1";
    for (const type of ["pointerdown", "mousedown", "touchstart"]) node.addEventListener(type, () => hidePeek(), true);
    // close in, a unit's card (a transport's: the cargo card under the pointer) tells what it is; far out, a nation's
    // chip lists its units
    node.addEventListener("mousemove", event => {
      const mouse = event as MouseEvent;
      if (mouse.buttons) return;
      if ((mouse.target as Element).closest(".flSettle")) return; // a settlement's own hover shows it
      const g = (mouse.target as Element).closest<SVGGElement>("#armies > g > g");
      const regiment = regimentFrom(g);
      if (!g || !regiment) return hidePeek(LINGER);
      if (node.dataset.flStage === "far") {
        if (isTransport(regiment)) return hidePeek();
        const mine = cellOf(regiment).filter(r => r.state === regiment.state && !isTransport(r));
        peek(g.querySelector("image.flFar:not(.flPick)") ?? g, mine.map(regimentGroup), true);
        return;
      }
      const part = partAt(g, mouse.clientX, mouse.clientY);
      if (!part) return hidePeek();
      const row = rows(part.list === "cargo" ? regiment.cargo : regiment.u)[part.index];
      if (!row) return hidePeek();
      const full = part.list === "cargo" ? Math.min(1, row.count / perChip(row.unit)) : strength(regiment);
      unitTip(mouse.clientX, mouse.clientY, unitLine(regiment, part.list, row.unit, row.count, full));
    });
    node.addEventListener("mouseout", event => {
      const to = (event as MouseEvent).relatedTarget as Element | null;
      if (!to?.closest?.("#armies > g > g")) hidePeek(LINGER);
    });
    node.addEventListener(
      "click",
      event => {
        const settle = (event.target as Element).closest<SVGGElement>(".flSettle");
        if (settle && !mode) {
          event.stopPropagation();
          openSettlement(Number(settle.dataset.burg), event.shiftKey);
          return;
        }
      },
      true
    );
    node.addEventListener("dblclick", event => {
      const g = (event.target as Element).closest<SVGGElement>("#armies > g > g");
      if (!g?.dataset.state) return;
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
}

/** The settlement whose symbol is under a screen point: only dropping on the symbol garrisons */
const settlementAt = (x: number, y: number) => {
  for (const el of document.elementsFromPoint(x, y))
    if (el.closest("#burgIcons use[data-id]")) return burgOfElement(el);
  return null;
};

/** Every unit of a list may go inside a settlement */
const allGarrisonable = (units: Record<string, number>) => Object.keys(units).every(garrisonable);

/** A regiment walks into its settlement's garrison, if it can reach it */
function stationIn(r: Regiment, burg: Burg): void {
  const there = mainCell(burg.cell);
  if (mainCell(r.cell) !== there && !reachable(r).has(there)) {
    report(t("Out of reach this move"));
    return;
  }
  const why = station(r, burg);
  if (why) {
    report(why);
    return;
  }
  tip(t("{{name}} joins the garrison of {{town}}", { name: r.name, town: burg.name ?? "" }), false, "success");
  changed();
}

// --- the folder

function openFolder(regiment: Regiment, beside = false): void {
  hidePeek();
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
  hidePeek();
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
  return `<div class="flSlot" draggable="true" data-list="${list}" data-unit="${escapeHtml(unit)}" data-count="${count}">
    <img src="${iconUrl(kit, colourOf(state))}" alt="" /><span class="flSlotName">${escapeHtml(unit)}</span>
    ${up}<button type="button" class="flGear" data-tip="${t("Edit Unit")}">⚙</button>
    <span class="flSlotCount">${count.toLocaleString()}</span></div>`;
};
const emptyRow = (list: List) => `<div class="flSlot flEmpty" data-list="${list}"></div>`;

function render(el: HTMLElement, regiment: Regiment): void {
  const transport = isTransport(regiment);
  const face = artOf(regiment);
  const art = face ? artUrl(face) : "";
  const list: List = transport ? "cargo" : "u";
  const items = rows(transport ? regiment.cargo : regiment.u);
  const cap = transport ? cargoSlots(regiment) : MAX_SLOTS;
  const home = pack.burgs[pack.cells.burg[mainCell(regiment.cell)]];
  const upAt = home?.i && !home.removed && home.state === regiment.state && sizeOf(home) ? home : null;
  const filled = items.map(row => slotRow(list, row.unit, row.count, regiment.state, upAt)).join("");
  const empty = Array.from({ length: Math.max(0, cap - items.length) }, () => emptyRow(list)).join("");
  const own = transport ? Object.keys(regiment.u)[0] : "";
  const burgHere = pack.burgs[pack.cells.burg[mainCell(regiment.cell)]];
  const at = burgHere?.i && !burgHere.removed ? burgHere : null;

  el.innerHTML = /* html */ `
    <div class="flFolderHead">
      <img class="flFolderArt" src="${art}" alt="" />
      <div>
        <input class="flFolderName" value="${escapeHtml(regiment.name)}" data-tip="${t("Type to rename")}" spellcheck="false" />
        <div class="flFolderSub">${t("Power")} ${short(cardPower(regiment))} · ${short(transport ? troopsOf({ u: regiment.cargo ?? {} }) : troopsOf(regiment))} ${t("troops")}</div>
        <div class="flFolderSub">${transport ? `${escapeHtml(own)} · ${t("cargo")}` : t("Slots")} ${items.length}/${cap}</div>
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
    <div class="flSlots" data-list="${list}">${filled}${empty}</div>
    <div class="flFolderBottom">
      ${px("attack", "attack", t("Attack a regiment next to this one"))}
      ${transport ? "" : px("merge", "merge", t("Merge into another group: click it on the map, or drag this one onto it"))}
      ${transport ? px("unload", "unload", t("Unload all cargo onto the coast beside it")) : px("disband", "disband", t("Disband: every slot stands on its own in this cell"))}
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
  const handle = el.querySelector<HTMLImageElement>(".flFolderArt");
  if (handle) {
    handle.draggable = true;
    handle.dataset.tip = t("Drag onto the map to move the whole army");
    handle.addEventListener("dragstart", event => {
      event.dataTransfer?.setData("text/plain", regiment.name);
      carryArmy(regiment);
    });
    handle.addEventListener("dragend", () => carryArmy(null));
  }

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
  wireSlots(el, regiment);
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
let carriedArmy: Regiment | null = null;

/** The settlement a nested folder's rows upgrade at: the garrison's own, or the one an army stands in */
const partBurg = (r: Regiment): Burg | null => {
  const b = pack.burgs[r.garrison || pack.cells.burg[mainCell(r.cell)]];
  return b?.i && !b.removed && b.state === r.state && sizeOf(b) ? b : null;
};

/** A nested folder in a settlement: an army or the garrison, its units as rows */
function partFolder(key: string, r: Regiment, title: string, cap: number, open: boolean, garrisonOfBurg = 0): string {
  const lead = kitOf(flagship(r) ?? "");
  const icon = lead ? `<img src="${iconUrl(lead, colourOf(r.state))}" alt="" />` : "<span class='flNoIcon'></span>";
  const items = rows(r.u);
  const empty = Math.max(0, cap - slotsOf(r.u));
  return /* html */ `<details class="flPart" data-part="${key}" data-state="${r.state}" data-id="${r.i}" ${open ? "open" : ""}>
    <summary draggable="true" data-tip="${t("Drag onto the map to march out")}">${icon}<span class="flPartName">${escapeHtml(title)}</span>
      <span class="flPartSize">${short(troopsOf(r))} (${cardPower(r)})</span>
      ${garrisonOfBurg ? "" : px("", "locate", t("Locate"))}
    </summary>
    <div class="flSlots" data-list="u">${items.map(row => slotRow("u", row.unit, row.count, r.state, partBurg(r))).join("")}${Array.from(
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
  wirePurse(el, burg, changed, (why, at) => report(why, at));

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
    wireSlots(part, r);
    const summary = part.querySelector("summary")!;
    summary.querySelector(".flPx")?.addEventListener("click", event => {
      event.preventDefault();
      zoomTo(r.x, r.y, 6, 900);
    });
    summary.addEventListener("dragstart", event => {
      event.dataTransfer?.setData("text/plain", r.name);
      carryArmy(r);
    });
    summary.addEventListener("dragend", () => carryArmy(null));
    if (r.garrison) {
      // a whole army dragged onto the garrison is stationed in it
      part.addEventListener("dragover", event => {
        if (carriedArmy && carriedArmy !== r) event.preventDefault();
      });
      part.addEventListener("drop", event => {
        if (!carriedArmy || carriedArmy === r) return;
        event.preventDefault();
        const army = carriedArmy;
        carriedArmy = null;
        stationIn(army, burg);
      });
    }
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
      report(t(setClass(burg, c)), button);
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
            .map(k => `<option value="${k.id}">${escapeHtml(unitName(k))}</option>`)
            .join("")}</optgroup>`
      )
      .join("")}</select>
    <div class="flRecruitLine"><input class="flRecruitCount" type="number" min="1" /><button type="button" class="flRecruitGo">${t("Raise")}</button></div>
    <div class="flFolderSub flRecruitCost"></div>
  </div>`;
}

function wireRecruit(el: HTMLElement, burg: Burg): void {
  const unit = el.querySelector<HTMLSelectElement>(".flRecruitUnit");
  const count = el.querySelector<HTMLInputElement>(".flRecruitCount");
  const cost = el.querySelector<HTMLElement>(".flRecruitCost");
  if (!unit || !count || !cost) return;
  const kit = () => KIT.find(k => k.id === unit.value)!;
  const update = (reset: boolean) => {
    const k = kit();
    const limit = recruitLimit(burg, k);
    count.max = String(limit);
    if (reset || +count.value > limit) count.value = String(Math.min(perSlot(k), limit));
    const n = Math.max(0, +count.value || 0);
    cost.textContent = `${t("Cost")}: ${peopleFor(unitName(k), n).toLocaleString()} ${t("Manpower")} · §${priceOf(k, n).toLocaleString()} · ${t("Up To")} ${limit.toLocaleString()}`;
  };
  update(true);
  unit.addEventListener("change", () => update(true));
  count.addEventListener("input", () => update(false));
  const go = () => {
    const why = recruit(burg, kit(), +count.value);
    if (why) {
      report(why, count);
      return;
    }
    tip(t("Raised in {{name}}", { name: burg.name }), false, "success");
    changed();
  };
  el.querySelector(".flRecruitGo")?.addEventListener("click", go);
  count.addEventListener("keydown", event => {
    if (event.key === "Enter") go();
  });
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

/** The garrison's chips of its first kind, as many as the cell has room for: what Form Army marches out */
function marchOut(units: Record<string, number>, room: number): Record<string, number> {
  const out: Record<string, number> = {};
  const first = Object.keys(units).find(u => units[u] > 0);
  if (!first) return out;
  const domain = domainOfUnit(first);
  for (const row of rows(units)) {
    if (domainOfUnit(row.unit) !== domain || room <= 0) continue;
    if (kitOf(row.unit)?.role === "transport") continue;
    out[row.unit] = (out[row.unit] ?? 0) + row.count;
    room--;
  }
  return out;
}

// --- dragging rows

interface Carried {
  state: number;
  id: number;
  list: List;
  unit: string;
  count: number;
  more?: { unit: string; count: number }[]; // other chosen rows of the same list, carried together
}
let carried: Carried | null = null;
let dropSet: ReadonlySet<number> = new Set(); // where the carried rows may land, lit while dragging

/** Every row a drag carries, the grabbed one first */
const carriedRows = (c: Carried): Carried[] => [c, ...(c.more ?? []).map(r => ({ ...c, ...r, more: undefined }))];

function showDrop(cells: number[]): void {
  dropSet = new Set(cells);
  dimPixelMap(dropSet, "land");
}

function wireSlots(el: HTMLElement, regiment: Regiment): void {
  const box = el.querySelector<HTMLElement>(".flSlots")!;
  const rowsOf = () => [...box.querySelectorAll<HTMLElement>(".flSlot:not(.flEmpty)")];
  let anchor: HTMLElement | null = null;
  for (const row of rowsOf()) {
    // a click chooses rows: Shift picks a run, Ctrl or Cmd adds one, a plain click picks just this one
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
    row.addEventListener("dragstart", event => {
      const chosen = rowsOf().filter(r => r.classList.contains("flChosenRow") && r.dataset.list === row.dataset.list);
      const group = row.classList.contains("flChosenRow") ? chosen : [row];
      carried = {
        state: regiment.state,
        id: regiment.i,
        list: row.dataset.list as List,
        unit: row.dataset.unit!,
        count: +row.dataset.count!,
        more: group.filter(r => r !== row).map(r => ({ unit: r.dataset.unit!, count: +r.dataset.count! }))
      };
      for (const r of group) r.classList.add("flCarried");
      event.dataTransfer?.setData("text/plain", row.dataset.unit!);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      showDrop(dropCells(regiment, carried.list, carriedUnits(carried)));
    });
    row.addEventListener("dragend", () => {
      for (const r of rowsOf()) r.classList.remove("flCarried");
      carried = null;
      highlightCell(null);
      pick(picked); // the reach again
    });
    row.querySelector(".flGear")?.addEventListener("click", () => editRow(row, regiment));
    row.querySelector<HTMLElement>(".flUp")?.addEventListener("click", function () {
      const at = pack.burgs[Number(this.dataset.burg)];
      if (!at) return;
      report(upgrade(at, regiment, row.dataset.unit!, +row.dataset.count!), row);
      changed();
    });
  }
  for (const row of box.querySelectorAll<HTMLElement>(".flEmpty:not(.flNoAdd)"))
    row.addEventListener("click", () => chooseUnit(row, regiment, row.dataset.list as List));
  box.addEventListener("dragover", event => {
    if (!carried) return;
    event.preventDefault();
    box.classList.add("flOver");
  });
  box.addEventListener("dragleave", () => box.classList.remove("flOver"));
  box.addEventListener("drop", event => {
    event.preventDefault();
    box.classList.remove("flOver");
    const from = carried && regimentOf(carried.state, carried.id);
    if (!carried || !from) return;
    const list = box.dataset.list as List;
    report(
      carriedRows(carried)
        .map(r => moveRow(from, r, regiment, list))
        .find(Boolean) ?? "",
      box
    );
  });
}

/** Move a dragged row into another regiment, if they stand close enough */
function moveRow(from: Regiment, row: Carried, to: Regiment, list: List): string {
  if (from === to && row.list === list) return "";
  if (from.state !== to.state) return t("Only a nation's own groups trade units");
  const why = closeEnough(from, row.list, to, list);
  if (why) return why;
  const result = shift(from, row.list, row.unit, row.count, to, list);
  if (!result) {
    if (!troopsOf(from) && !isTransport(from)) Military.remove(from.state, from.i);
    changed();
  }
  return result;
}

function closeEnough(from: Regiment, fromList: List, to: Regiment, toList: List): string {
  if (toList === "cargo") return canLoad(from, to) ? "" : t("Move beside the transport first");
  if (fromList === "cargo")
    return landingCells(from).includes(mainCell(to.cell)) ? "" : t("Land beside the transport first");
  if (to.garrison && neighbours(mainCell(to.cell)).includes(mainCell(from.cell))) return "";
  return mainCell(from.cell) === mainCell(to.cell) ? "" : t("Both groups must stand in the same cell");
}

function report(why: string, el?: Element | null): void {
  if (!why) return;
  tip(why, false, "error");
  el?.classList.add("flRefused");
  setTimeout(() => el?.classList.remove("flRefused"), 400);
}

/** A row dropped on the map from a folder or hover panel */
function dropOnMap(event: DragEvent): void {
  if (!carried) return;
  event.preventDefault();
  dropRowsAt(event.clientX, event.clientY);
}

/** Carried rows let go at a screen point: into a garrison (on its symbol), a regiment under the pointer, or a cell,
 * joining the nation's group already standing there */
function dropRowsAt(clientX: number, clientY: number): void {
  const from = carried && regimentOf(carried.state, carried.id);
  highlightCell(null);
  markSymbol(null);
  if (!carried || !from) return;
  const rowsCarried = carriedRows(carried);
  carried = null;
  const town = settlementAt(clientX, clientY);
  if (town && town.state === from.state) {
    const garrison = ensureGarrison(town);
    if (garrison && garrison !== from)
      report(rowsCarried.map(r => moveRow(from, r, garrison, "u")).find(Boolean) ?? "");
    changed();
    return;
  }
  const target = regimentAt(clientX, clientY, from);
  if (target && target.state === from.state) {
    const why = rowsCarried
      .map(r => moveRow(from, r, target, isTransport(target) && domainOfUnit(r.unit) === "land" ? "cargo" : "u"))
      .find(Boolean);
    report(why ?? "");
    changed();
    return;
  }
  const point = mapPoint(clientX, clientY);
  const cell = point && cellAtPoint(point[0], point[1]);
  if (cell === undefined || cell === null || !dropSet.has(mainCell(cell))) {
    if (cell !== undefined && cell !== null && mainCell(cell) !== mainCell(from.cell))
      report(
        rowsCarried[0].list === "cargo"
          ? t("Unload onto the shore beside the transport, in a cell with room")
          : t("Out of reach, or that cell is full")
      );
    pick(picked);
    changed();
    return;
  }
  // each chip stands as a unit of its own
  for (const r of rowsCarried) {
    const made = splitOff(from, r.list, r.unit, r.count, cell);
    if (typeof made === "string") {
      report(made);
      break;
    }
    if (mainCell(cell) === mainCell(from.cell)) [made.x, made.y] = [from.x, from.y];
  }
  if (!troopsOf(from) && !isTransport(from) && !from.garrison) Military.remove(from.state, from.i);
  changed();
}

/** Light a settlement symbol while carried infantry could go inside it */
function markSymbol(burg: Burg | null): void {
  const was = document.querySelector("#burgIcons use.flGarrisonHere");
  if (was && burg && was.getAttribute("data-id") === String(burg.i)) return;
  was?.classList.remove("flGarrisonHere");
  if (!burg) return;
  document.querySelector(`#burgIcons use[data-id="${burg.i}"]`)?.classList.add("flGarrisonHere");
  tip(t("Drop on the symbol to garrison {{town}}", { town: burg.name ?? "" }), false, "info", 1500);
}

const carriedUnits = (c: Carried): Record<string, number> => {
  const units: Record<string, number> = {};
  for (const r of carriedRows(c)) units[r.unit] = (units[r.unit] ?? 0) + r.count;
  return units;
};

/** A whole army (or garrison) is being dragged from a folder, a hover panel or the Military tab */
function carryArmy(r: Regiment | null): void {
  carriedArmy = r;
  if (r && !r.garrison) selectRegiment(r); // show where it can go
  if (!r) pick(picked);
}

/** A whole army dropped on the map from a list: like dragging its card. A garrison marches out first */
function dropArmy(army: Regiment, clientX: number, clientY: number): void {
  if (army.garrison) {
    const burg = pack.burgs[army.garrison];
    const units = marchOut(army.u, 4);
    if (!burg || !Object.keys(units).length) {
      report(t("The garrison is empty"));
      return;
    }
    if (settlementAt(clientX, clientY) === burg) return;
    const made = formArmy(burg, units);
    if (typeof made === "string") {
      report(made);
      return;
    }
    for (const r of made) if (!landArmy(r, clientX, clientY)) station(r, burg); // nowhere to go: back inside
    changed();
    return;
  }
  landArmy(army, clientX, clientY);
  changed();
}

/** Put an army where a pointer let go: into a settlement, onto a friend, into battle, or onto a cell in reach */
function landArmy(reg: Regiment, clientX: number, clientY: number): boolean {
  const town = settlementAt(clientX, clientY);
  if (town && town.state === reg.state && allGarrisonable(reg.u)) {
    stationIn(reg, town);
    return true;
  }
  const under = regimentAt(clientX, clientY, reg);
  if (under && under.state === reg.state) {
    joinOnMap(reg, under);
    return true;
  }
  const point = mapPoint(clientX, clientY);
  if (!point) return false;
  const cell = cellAtPoint(point[0], point[1]);
  const foe =
    under && atWar(reg.state, under.state) ? under : cell === undefined ? undefined : enemiesIn(reg.state, cell)[0];
  if (foe) return attack(reg, foe);
  selectRegiment(reg); // its reach, measured now (a garrison's army has only just formed)
  const spot = dropAt(reg, point[0], point[1]);
  if (!spot) {
    report(t("Out of reach this move"));
    return false;
  }
  Military.move(reg.state, reg.i, spot[0], spot[1]);
  moved(reg);
  return true;
}

/** Where a row may be dropped: its own cell or a neighbour with room; cargo onto the shore beside the transport */
function dropCells(from: Regiment, list: List, units: Record<string, number>): number[] {
  const slots = slotsOf(units);
  const at = mainCell(from.cell);
  const cells = list === "cargo" ? landingCells(from) : [at, ...neighbours(at)].filter(cell => canStand(from, cell));
  return cells.filter(cell => hasRoom(from.state, cell, list === "u" && cell === at ? 0 : slots));
}

function mapPoint(x: number, y: number): [number, number] | null {
  const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
  const matrix = viewbox?.getScreenCTM()?.inverse();
  if (!matrix) return null;
  const point = new DOMPoint(x, y).matrixTransform(matrix);
  return [point.x, point.y];
}

function watchMap(): void {
  const map = document.getElementById("map");
  if (!map || map.dataset.flFolders) return;
  map.dataset.flFolders = "1";
  map.addEventListener("dragover", event => {
    if (!carried && !carriedArmy) return;
    event.preventDefault();
    // the cell under the pointer lights up when the carried rows may land there
    const point = mapPoint(event.clientX, event.clientY);
    const cell = point ? cellAtPoint(point[0], point[1]) : undefined;
    highlightCell(carried && cell !== undefined && dropSet.has(mainCell(cell)) ? cell : null);
  });
  map.addEventListener("drop", event => {
    if (carriedArmy) {
      event.preventDefault();
      const army = carriedArmy;
      carryArmy(null);
      dropArmy(army, event.clientX, event.clientY);
      return;
    }
    dropOnMap(event);
  });
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
  if (act === "attack" || act === "merge" || act === "add") {
    setMode(mode === act ? null : act);
    return;
  }
  if (act === "disband") {
    disband(regiment);
    changed();
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
    encamp(regiment);
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
        sendHome(regiment, { ...regiment.u, ...(regiment.cargo ?? {}) });
        Military.remove(regiment.state, regiment.i);
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
    merge: t("Click a group to merge this one into it"),
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
  if (mode === "merge") {
    setMode(null);
    joinOnMap(self, target);
    return;
  }
  if (mode === "attack") {
    setMode(null, true);
    if (!attack(self, target)) returnView();
  }
}

/** Merge into a group, or load into a transport, after walking there if it's within reach */
function joinOnMap(self: Regiment, target: Regiment): void {
  if (isTransport(target) && !isTransport(self)) {
    report(load(self, target));
    changed();
    return;
  }
  const why = mergeRefusal(self, target);
  if (why) {
    report(why);
    return;
  }
  const same = mainCell(self.cell) === mainCell(target.cell);
  if (!same && !reachable(self).has(mainCell(target.cell))) {
    report(t("Out of reach this move"));
    return;
  }
  if (!same && !hasRoom(self.state, target.cell, slotsOf(self.u), self, 0)) {
    report(t("That cell is full: 4 units"));
    return;
  }
  report(merge(self, target));
  changed();
  openFolder(target);
  pick(target);
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
  if (at !== there && !neighbours(at).includes(there)) {
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

// --- dragging a regiment on the map

/** What of a regiment's card a screen point is on: a cargo card in a transport's bay, or the unit itself */
function partAt(g: SVGGElement, clientX: number, clientY: number): { list: List; index: number } | null {
  const image = g.querySelector<SVGImageElement>("image.flClose:not(.flPick)");
  if (!image || !g.dataset.layout) return null;
  const rect = image.getBoundingClientRect();
  const layout = JSON.parse(g.dataset.layout) as {
    w: number;
    h: number;
    bays: { x: number; y: number; w: number; h: number }[];
  };
  const x = ((clientX - rect.left) / rect.width) * layout.w;
  const y = ((clientY - rect.top) / rect.height) * layout.h;
  const regiment = regimentFrom(g);
  if (!regiment) return null;
  const bay = layout.bays.findIndex(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  if (bay >= 0) return bay < rows(regiment.cargo).length ? { list: "cargo", index: bay } : null;
  return isTransport(regiment) ? null : { list: "u", index: 0 }; // a transport's hull tells nothing
}

/** A unit's tooltip: name, type, tier, troops, health */
function unitLine(regiment: Regiment, list: List, unit: string, count: number, full: number): string {
  const kit = kitOf(unit);
  const name = list === "u" ? labelOf(regiment) : kit ? (kit.domain === "land" ? unit : (kit.nickname ?? unit)) : unit;
  const type = kit ? t(kit.role[0].toUpperCase() + kit.role.slice(1)) : "";
  const tier = kit ? `${t("Tier")} ${kit.tier}` : "";
  const troops = kit && kit.domain === "land" ? ` · ${short(count)} ${t("troops")}` : "";
  return `<b>${escapeHtml(name)}</b><br>${[type, tier].filter(Boolean).join(" · ")}${troops} · ${Math.round(full * 100)}%`;
}

/** While a land unit is carried over its nation's transport with room, light the bay it would take */
function lightUnder(reg: Regiment, units: Record<string, number>, clientX: number, clientY: number): void {
  const under = regimentAt(clientX, clientY, reg);
  const boards =
    under &&
    under !== reg &&
    isTransport(under) &&
    under.state === reg.state &&
    Object.keys(units).every(u => domainOfUnit(u) === "land");
  lightBay(boards && rows(under.cargo).length < cargoSlots(under) ? under : null);
}

/** Drag a unit: close in, the chip under the pointer goes on its own (Shift: the whole group); far out, the cell's
 * part that belongs to its nation moves together */
function dragRegiment(this: SVGGElement, event: D3DragEvent<SVGGElement, unknown, unknown>): void {
  const reg = regimentFrom(this);
  if (!reg || mode) return; // in a mode, a click picks a target instead
  const source = event.sourceEvent as MouseEvent;
  const far = document.getElementById("armies")?.dataset.flStage === "far";
  const part = far ? null : partAt(this, source.clientX, source.clientY);
  const own = part?.list === "cargo" ? rows(reg.cargo) : rows(reg.u);
  if (part && !source.shiftKey && (part.list === "cargo" || own.length > 1)) {
    dragChip(this, reg, part.list, part.index, event);
    return;
  }
  // far out the nation's part of the cell moves together; close in, every chosen unit moves with the one dragged
  const chosen = [...document.querySelectorAll<SVGGElement>("#armies .fl-chosen")]
    .map(el => regimentFrom(el))
    .filter((r): r is Regiment => Boolean(r) && r!.state === reg.state);
  const group = far
    ? cellOf(reg).filter(r => r.state === reg.state)
    : chosen.includes(reg)
      ? [reg, ...chosen.filter(r => r !== reg)]
      : [reg];
  const from = [reg.x, reg.y] as const;
  let started = false;
  event.on("drag", (dragEvent: D3DragEvent<SVGGElement, unknown, unknown>) => {
    const { x, y } = dragEvent;
    if (!isInMap(x, y)) return;
    if (!started) {
      started = true;
      select(this).raise();
      select(this.parentNode as Element).raise();
      this.style.translate = "";
      pick(reg);
    }
    placeRegiment(this, x, y);
    dragOver(reg, x, y);
    const town = settlementAt(
      (dragEvent.sourceEvent as MouseEvent).clientX,
      (dragEvent.sourceEvent as MouseEvent).clientY
    );
    markSymbol(town && town.state === reg.state && allGarrisonable(reg.u) ? town : null);
    const mouse = dragEvent.sourceEvent as MouseEvent;
    if (!isTransport(reg)) lightUnder(reg, reg.u, mouse.clientX, mouse.clientY);
  });
  event.on("end", (dragEvent: D3DragEvent<SVGGElement, unknown, unknown>) => {
    markSymbol(null);
    lightBay(null);
    if (!started) return;
    const end = dragEvent.sourceEvent as MouseEvent | undefined;
    const town = end ? settlementAt(end.clientX, end.clientY) : null;
    if (town && town.state === reg.state && allGarrisonable(reg.u)) {
      placeRegiment(this, from[0], from[1]);
      stationIn(reg, town);
      return;
    }
    const under = end ? regimentAt(end.clientX, end.clientY, reg) : undefined;
    if (under && under.state === reg.state && !group.includes(under)) {
      placeRegiment(this, from[0], from[1]);
      joinOnMap(reg, under);
      return;
    }
    // dropped on an enemy, or into a cell an enemy holds: the battle starts
    const cell = cellAtPoint(dragEvent.x, dragEvent.y);
    const foe =
      under && atWar(reg.state, under.state) ? under : cell === undefined ? undefined : enemiesIn(reg.state, cell)[0];
    if (foe) {
      placeRegiment(this, from[0], from[1]);
      attack(reg, foe);
      return;
    }
    const reached = dropAt(reg, dragEvent.x, dragEvent.y);
    if (!reached && cell !== undefined && mainCell(cell) !== mainCell(reg.cell))
      report(t("Out of reach, or that cell is full"));
    const spot = reached ?? from;
    Military.move(reg.state, reg.i, spot[0], spot[1]);
    placeRegiment(this, reg.x, reg.y);
    // the rest of the cell's group follows where it can reach
    for (const other of group.slice(1)) {
      if (other === reg) continue;
      selectRegiment(other);
      const there = dropAt(other, dragEvent.x, dragEvent.y);
      if (there) Military.move(other.state, other.i, there[0], there[1]);
    }
    moved(reg);
    changed();
  });
}

/** Drag one chip out of a column: a little copy follows the pointer, the cells it may land in light up */
function dragChip(
  g: SVGGElement,
  reg: Regiment,
  list: List,
  index: number,
  event: D3DragEvent<SVGGElement, unknown, unknown>
): void {
  const row = (list === "cargo" ? rows(reg.cargo) : rows(reg.u))[index];
  const art = chipOf(reg, list, index);
  if (!row || !art) return;
  let ghost: SVGGElement | null = null;
  event.on("drag", (dragEvent: D3DragEvent<SVGGElement, unknown, unknown>) => {
    const { x, y } = dragEvent;
    const mouse = dragEvent.sourceEvent as MouseEvent;
    if (!ghost) {
      ghost = document.createElementNS("http://www.w3.org/2000/svg", "g");
      ghost.id = "flChipGhost";
      paintColumn(ghost, art);
      document.getElementById("armies")?.append(ghost);
      g.classList.add("fl-lifting");
      carried = { state: reg.state, id: reg.i, list, unit: row.unit, count: row.count };
      showDrop(dropCells(reg, list, { [row.unit]: row.count }));
    }
    lightUnder(reg, { [row.unit]: row.count }, mouse.clientX, mouse.clientY);
    placeRegiment(ghost, x, y);
    const cell = cellAtPoint(x, y);
    highlightCell(cell !== undefined && dropSet.has(mainCell(cell)) ? cell : null);
    const town = settlementAt(mouse.clientX, mouse.clientY);
    markSymbol(town && town.state === reg.state && garrisonable(row.unit) ? town : null);
  });
  event.on("end", (dragEvent: D3DragEvent<SVGGElement, unknown, unknown>) => {
    if (!ghost) return;
    const mouse = dragEvent.sourceEvent as MouseEvent;
    ghost.remove();
    g.classList.remove("fl-lifting");
    lightBay(null);
    dropRowsAt(mouse.clientX, mouse.clientY);
  });
}

const isInMap = (x: number, y: number) =>
  x >= 0 && y >= 0 && x <= options.map.graph.width && y <= options.map.graph.height;

/** After any change: redraw, rebind, refresh the open folders and the other editors */
function changed(): void {
  Layers.draw("military");
  stackAll();
  bindRegiments();
  for (const [key, el] of [...folders]) {
    if (key[0] === "b") {
      if (pack.burgs[+key.slice(1)]?.removed) closeFolder(key);
      else renderSettlement(el, +key.slice(1));
      continue;
    }
    const r = regimentOf(...(key.split("-").map(Number) as [number, number]));
    if (!r) closeFolder(key);
    else render(el, r);
  }
  if (picked && !regimentOf(picked.state, picked.i)) pick(null);
  else pick(picked);
  refreshEditors();
}

watchMap();
watchSettlements();

/** Hovering a settlement (its count, symbol or name) lists its garrison; the count above says how many */
function watchSettlements(): void {
  document.addEventListener("mouseover", event => {
    if ((event as MouseEvent).buttons) return;
    const burg = burgOfElement(event.target as Element);
    if (!burg) return;
    const garrison = garrisonOf(burg);
    if (garrison && troopsOf(garrison)) peek(event.target as Element, [regimentGroup(garrison)], false);
  });
  document.addEventListener("mouseout", event => {
    const from = burgOfElement(event.target as Element);
    if (from && burgOfElement((event as MouseEvent).relatedTarget as Element | null) !== from) hidePeek(LINGER);
  });
  // rows dragged out of the hover panel behave like folder rows
  onPeekDrag(
    row => {
      const from = regimentOf(row.state, row.id);
      if (!from) return;
      if (!row.unit) {
        carryArmy(from);
        return;
      }
      carried = { state: row.state, id: row.id, list: "u", unit: row.unit, count: row.count };
      showDrop(dropCells(from, "u", { [row.unit]: row.count }));
    },
    () => {
      carried = null;
      carryArmy(null);
      pick(picked);
    }
  );
}

export const RegimentEditor = {
  carry: (state: number, id: number | null) => carryArmy(id === null ? null : (regimentOf(state, id) ?? null)),
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
