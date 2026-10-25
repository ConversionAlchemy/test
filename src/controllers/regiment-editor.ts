// Fluoria's folder for a regiment: Azgaar's regiment dialog, its units shown as one row per slot up to the cap.
// Rows drag between open folders, out onto the map to stand alone or join a regiment there, and into a transport.
// A regiment dragged onto another on the map merges with it, or loads into it if it's a transport
import { type D3DragEvent, drag, easeSinInOut, select, transition } from "d3";
import { confirmationDialog, noteButton, refreshEditors } from "@/components/dialog/dialog-helpers";
import { Icons } from "@/components/icons";
import { Layers } from "@/components/layers";
import { clearMainTip, tip } from "@/components/tooltips";
import { applyDefaultViewboxEvents } from "@/components/viewbox-events";
import { zoomTo } from "@/components/zoom";
import { Controllers } from "@/controllers";
import { canLoad, landingCells, load } from "@/fluoria/boarding";
import { addSlot, changeRow, disband, encampRefusal, merge, regimentOf, splitOff } from "@/fluoria/forces/army";
import {
  cargoSlots,
  domainOf,
  domainOfUnit,
  encamp,
  isTransport,
  kitOf,
  type List,
  MAX_SLOTS,
  mergeRefusal,
  refusal,
  rows,
  shift,
  slotsOf,
  troopsOf
} from "@/fluoria/forces/forces";
import { KIT } from "@/fluoria/forces/kit";
import { cardUrl, iconUrl, short, stallUrl } from "@/fluoria/forces/pixels";
import { borrowView, returnView } from "@/fluoria/map-view";
import { canStand, reachable } from "@/fluoria/movement";
import { openNation } from "@/fluoria/nation-panel";
import { cellAtPoint, mainCell, neighbours } from "@/fluoria/one-grid";
import { dimPixelMap } from "@/fluoria/pixel-map-sync";
import { GARRISON_SLOTS, sizeOf } from "@/fluoria/settlement-size";
import {
  BUILDING_ORDER,
  BUILDINGS,
  type Building,
  build,
  buildRefusal,
  burgOfElement,
  demolish,
  ensureGarrison,
  formArmy,
  funds,
  garrisonOf,
  hasBuilding,
  peopleFor,
  peopleOf,
  perSlot,
  priceOf,
  recruit,
  recruitable,
  recruitLimit,
  sendFunds,
  sendHome,
  station,
  unitName
} from "@/fluoria/settlements";
import { hidePeek, peek, regimentGroup } from "@/fluoria/unit-peek";
import {
  chooseLanding,
  clearSelection,
  closeStack,
  dragOver,
  dropAt,
  isOpen,
  moved,
  selectRegiment,
  stackAll,
  stackOf,
  toggleStack
} from "@/fluoria/units";
import { atWar, enemiesIn, hasRoom } from "@/fluoria/war";
import { goodIconLines } from "@/renderers/draw-goods";
import { faceOf, placeRegiment } from "@/renderers/draw-military";
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

/** A single click picks a card, with Shift added to the choice; only the stack's arrow opens a stack */
function clickRegiment(selector: string, shift = false): void {
  if (customization) return;
  const regiment = regimentFrom(document.querySelector(selector));
  if (!regiment) return;
  bindRegiments();
  if (mode) return; // the mode's own click handles it
  if (shift) elementOf(regiment)?.classList.toggle("fl-chosen");
  else pick(regiment);
}

/** Clicking empty ground, or Escape: folders shut, the row folds back, nothing picked */
function clearAll(): void {
  for (const key of [...folders.keys()]) closeFolder(key);
  closeStack();
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
    .call(drag<SVGGElement, unknown>().on("start", dragRegiment));
  const node = armies.node();
  if (node && !node.dataset.flDouble) {
    node.dataset.flDouble = "1";
    // the arrow beside a stack opens and closes it, and never starts a drag
    node.addEventListener(
      "pointerdown",
      event => {
        hidePeek();
        if ((event.target as Element).closest(".flTab")) event.stopPropagation();
      },
      true
    );
    // hovering a card shows what's inside; a closed stack shows all of its units
    node.addEventListener("mouseover", event => {
      if ((event as MouseEvent).buttons) return;
      if ((event.target as Element).closest(".flSettle")) return; // a settlement's own hover shows it
      const g = (event.target as Element).closest<SVGGElement>("#armies > g > g");
      const regiment = regimentFrom(g);
      if (!g || !regiment || (event.target as Element).closest(".flTab")) return hidePeek();
      const stack = stackOf(regiment);
      const all = stack.length > 1 && !isOpen(regiment) ? stack : [regiment];
      const card = g.querySelector(`image.${node.dataset.flStage === "far" ? "flFar" : "flClose"}:not(.flPick)`) ?? g;
      peek(card, all.map(regimentGroup));
    });
    node.addEventListener("mouseout", event => {
      const to = (event as MouseEvent).relatedTarget as Element | null;
      if (!to?.closest?.("#armies > g > g")) hidePeek();
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
        const tab = (event.target as Element).closest(".flTab");
        if (!tab) return;
        event.stopPropagation();
        const ghost = tab.closest("#flGhost");
        const regiment = ghost ? openRegiment() : regimentFrom(tab);
        if (!regiment) return;
        const opening = !isOpen(regiment);
        toggleStack(regiment);
        if (!opening && picked && stackOf(regiment).includes(picked)) pick(null);
        bindRegiments();
      },
      true
    );
    node.addEventListener("dblclick", event => {
      const g = (event.target as Element).closest<SVGGElement>("#armies > g > g");
      if (!g?.dataset.state) return;
      event.stopPropagation(); // not the map's double-click zoom
      editRegiment(`#${g.id}`, event.shiftKey);
    });
  }
}

/** The settlement under a screen point: its count, symbol or name */
const settlementAt = (x: number, y: number) => {
  for (const el of document.elementsFromPoint(x, y)) {
    const burg = burgOfElement(el);
    if (burg) return burg;
  }
  return null;
};

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

/** The front regiment of the open stack */
const openRegiment = () => {
  const g = document.querySelector<SVGGElement>("#armies .fl-row");
  return g ? regimentFrom(g) : undefined;
};

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

/** A settlement's folder: who holds it, its buildings, goods and garrison; recruiting and money live here */
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
  el.id = `flSettlement${burgId}`;
  el.className = "dialog flFolder";
  ensureEl("dialogs").append(el);
  folders.set(key, el);
  renderSettlement(el, burgId);
  $(el).dialog({
    title: burg.name ?? "",
    resizable: false,
    width: "22em",
    position: { my: "left top", at: "left+10 top+10", of: "#map" },
    close: () => closeFolder(key)
  });
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

const slotRow = (list: List, unit: string, count: number, state: number) => {
  const kit = kitOf(unit) ?? KIT[0];
  return `<div class="flSlot" draggable="true" data-list="${list}" data-unit="${escapeHtml(unit)}" data-count="${count}">
    <img src="${iconUrl(kit, colourOf(state))}" alt="" /><span class="flSlotName">${escapeHtml(unit)}</span>
    <button type="button" class="flGear" data-tip="${t("Edit Unit")}">⚙</button>
    <span class="flSlotCount">${count.toLocaleString()}</span></div>`;
};
const emptyRow = (list: List) => `<div class="flSlot flEmpty" data-list="${list}"></div>`;

function render(el: HTMLElement, regiment: Regiment): void {
  const transport = isTransport(regiment);
  const face = faceOf(regiment);
  const art = cardUrl(faceOf(regiment), "close");
  const list: List = transport ? "cargo" : "u";
  const items = rows(transport ? regiment.cargo : regiment.u);
  const cap = transport ? cargoSlots(regiment) : MAX_SLOTS;
  const filled = items.map(row => slotRow(list, row.unit, row.count, regiment.state)).join("");
  const empty = Array.from({ length: Math.max(0, cap - items.length) }, () => emptyRow(list)).join("");
  const own = transport ? Object.keys(regiment.u)[0] : "";

  el.innerHTML = /* html */ `
    <div class="flFolderHead">
      <img class="flFolderArt" src="${art}" alt="" />
      <div>
        <input class="flFolderName" value="${escapeHtml(regiment.name)}" data-tip="${t("Type to rename")}" spellcheck="false" />
        <div class="flFolderSub">${t("Power")} ${short(face.power)} · ${short(face.troops)} ${t("troops")}</div>
        <div class="flFolderSub">${transport ? `${escapeHtml(own)} · ${t("cargo")}` : t("Slots")} ${items.length}/${cap}</div>
      </div>
    </div>
    <div class="flSlots" data-list="${list}">${filled}${empty}</div>
    <div class="flFolderBottom">
      <button data-act="attack" data-tip="${t("Attack a regiment next to this one")}" class="icon-button-melee"></button>
      ${transport ? "" : `<button data-act="merge" data-tip="${t("Merge into another group: click it on the map, or drag this one onto it")}" class="icon-attach"></button>`}
      ${
        transport
          ? `<button data-act="unload" data-tip="${t("Unload all cargo onto the coast beside it")}" class="icon-button-landing"></button>`
          : `<button data-act="disband" data-tip="${t("Disband: every slot stands on its own in this cell")}" class="icon-object-ungroup"></button>`
      }
      <button data-act="encamp" data-tip="${t("Encamp: rest and repair, the strength bar refills (no new troops)")}" class="icon-campground"></button>
      <button data-act="add" data-tip="${t("Raise a new group: click on the map")}" class="icon-user-plus"></button>
      ${noteButton(`flFolderNote${keyOf(regiment)}`, t("Edit free text notes (legend)"))}
      <button data-act="delete" data-tip="${t("Release: its troops go home to the settlement they came from")}" class="icon-trash"></button>
    </div>`;

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

// --- settlements

const SIZE_NAME: Record<string, string> = { town: "Town", city: "City", capital: "Capital" };
const BUILDING_ICON: Record<Building, string> = {
  barracks: "land_infantry_t2",
  harbour: "naval_combat_t1",
  depot: "land_armour_t1",
  airbase: "air_combat_t1",
  market: ""
};
let recruiting: number | null = null; // the settlement whose recruit form is open

function buildingIcon(b: Building, on: boolean): string {
  const colour = on ? "#ffffff" : "#5c5c5c";
  const kit = KIT.find(k => k.id === BUILDING_ICON[b]);
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

function renderSettlement(el: HTMLElement, burgId: number): void {
  const burg = pack.burgs[burgId];
  if (!burg?.i || burg.removed) return;
  const size = sizeOf(burg);
  const garrison = size ? ensureGarrison(burg) : null;
  const state = burg.state ?? 0;
  if (state) void EmblemRenderer.trigger(`stateCOA${state}`, pack.states[state].coa);
  const province = pack.provinces?.[pack.cells.province?.[burg.cell] ?? 0];
  const where = province && "name" in province ? province.name : (pack.states[state]?.name ?? "");
  const cap = size ? GARRISON_SLOTS[size] : 0;
  const kind = size ? `${SIZE_NAME[size]} (${cap} ${t("Slots")})` : t("Village");
  const capitalOfNation = size === "capital" && pack.states[state]?.capital === burg.i;
  const money = capitalOfNation
    ? `<span class="flGold" data-tip="${t("The nation's treasury, held here")}">§${Math.floor(funds(burg)).toLocaleString()}</span>`
    : `<span class="flGold">§${Math.floor(burg.treasury ?? 0).toLocaleString()}</span>`;
  const buildings = size
    ? BUILDING_ORDER.map(b => {
        const on = hasBuilding(burg, b);
        const why = on ? t("Built") : buildRefusal(burg, b) || `§${BUILDINGS[b].cost}`;
        return `<button type="button" class="flBuilding${on ? " on" : ""}" data-build="${b}" data-tip="${t(BUILDINGS[b].name)} · ${t(BUILDINGS[b].unlocks)} · ${why}"><img src="${buildingIcon(b, on)}" alt="" /></button>`;
      }).join("")
    : "";
  const items = garrison ? rows(garrison.u) : [];
  const slots = garrison
    ? `<div class="flSlots" data-list="u">${items.map(row => slotRow("u", row.unit, row.count, state)).join("")}${Array.from(
        { length: Math.max(0, cap - slotsOf(garrison.u)) },
        () => `<div class="flSlot flEmpty flNoAdd" data-list="u"></div>`
      ).join("")}</div>`
    : "";

  el.innerHTML = /* html */ `
    <div class="flFolderHead">
      <svg class="flFolderArt flNationLink" viewBox="0 0 200 200" data-tip="${t("Open the nation")}"><use href="#stateCOA${state}"></use></svg>
      <div>
        <input class="flFolderName" value="${escapeHtml(burg.name ?? "")}" data-tip="${t("Type to rename")}" spellcheck="false" />
        <div class="flFolderSub">${kind} · ${escapeHtml(where)}</div>
        <div class="flFolderSub">${t("Pop")} ${peopleOf(burg).toLocaleString()} · ${money}</div>
      </div>
    </div>
    <div class="flSettleRow"><div class="flBuildings">${buildings}</div><div class="flGoods">${goodsOf(burg)}</div></div>
    ${slots}
    ${recruiting === burgId && size ? recruitForm(burg) : ""}
    <div class="flFolderBottom">
      ${size ? `<button data-act="recruit" data-tip="${t("Recruit")}" class="icon-user-plus${recruiting === burgId ? " pressed" : ""}"></button>` : ""}
      ${size ? `<button data-act="form" data-tip="${t("Form Army: the garrison marches out as a group (or drag rows onto the map)")}" class="icon-flag"></button>` : ""}
      ${size && !capitalOfNation ? `<button data-act="funds" data-tip="${t("Send Funds from the nation")}" class="icon-bank"></button>` : ""}
      <button data-act="locate" data-tip="${t("Locate")}" class="icon-target"></button>
      ${noteButton(`flSettleNote${burgId}`, t("Notes"))}
      <button data-act="lock" data-tip="${t("Lock")}" class="${burg.lock ? "icon-lock" : "icon-lock-open"}"></button>
      <button data-act="remove" data-tip="${t("Delete")}" class="icon-trash"></button>
      <button data-act="editor" data-tip="${t("Full Editor")}" class="icon-cog"></button>
    </div>`;

  el.querySelector<HTMLInputElement>(".flFolderName")!.addEventListener("change", function () {
    if (!this.value.trim()) return;
    Burgs.rename(burgId, this.value.trim());
    $(el).dialog("option", "title", burg.name);
    Layers.draw("labels");
  });
  el.querySelector(".flNationLink")?.addEventListener("click", () => {
    if (state) openNation(state);
  });
  el.querySelector(".flBuildings")?.addEventListener("click", event => {
    const b = (event.target as HTMLElement).closest<HTMLElement>("[data-build]")?.dataset.build as Building | undefined;
    if (!b) return;
    if (!hasBuilding(burg, b)) {
      report(build(burg, b), el.querySelector(`[data-build="${b}"]`));
      changed();
      return;
    }
    confirmationDialog({
      title: t("Demolish"),
      message: t("Tear down the {{building}}? Half its cost comes back.", { building: t(BUILDINGS[b].name) }),
      confirm: t("Demolish"),
      onConfirm: () => {
        demolish(burg, b);
        changed();
      }
    });
  });
  el.querySelector(".flFolderBottom")!.addEventListener("click", event => {
    const act = (event.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act) settlementAction(act, burg, el);
  });
  el.querySelector(`#flSettleNote${burgId}`)?.addEventListener(
    "click",
    () => void Controllers.NotesEditor.open({ type: "burg", id: burgId })
  );
  if (garrison) wireSlots(el, garrison);
  if (recruiting === burgId) wireRecruit(el, burg);
}

function recruitForm(burg: Burg): string {
  const options = recruitable(burg);
  if (!options.length)
    return `<div class="flRecruit flFolderSub">${t("Build a Barracks, Harbour, Armour Depot or Airbase to recruit here")}</div>`;
  return /* html */ `<div class="flRecruit">
    <select class="flRecruitUnit">${options
      .map(k => `<option value="${k.id}">${escapeHtml(unitName(k))} · ${t("Tier")} ${k.tier}</option>`)
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
    cost.textContent = `${t("Cost")}: ${peopleFor(unitName(k), n).toLocaleString()} ${t("People")} · §${priceOf(k, n).toLocaleString()} · ${t("Up To")} ${limit.toLocaleString()}`;
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
  if (act === "form") {
    const garrison = garrisonOf(burg);
    const units = garrison ? marchOut(garrison.u) : {};
    const why = !Object.keys(units).length
      ? t("The garrison is empty")
      : hasRoom(burg.state!, burg.cell, slotsOf(units))
        ? ""
        : t("That cell is full: 4 units or 12 slots");
    if (why) {
      report(why);
      return;
    }
    const made = formArmy(burg, units);
    if (typeof made === "string") {
      report(made);
      return;
    }
    changed();
    pick(made);
    return;
  }
  if (act === "funds") {
    const nation = Math.floor(pack.states[burg.state ?? 0]?.treasury ?? 0);
    const sum = Number(
      prompt(
        t("Send funds to {{name}} (the nation holds §{{amount}})", {
          name: burg.name,
          amount: nation.toLocaleString()
        }),
        "100"
      )
    );
    if (!sum) return;
    report(sendFunds(burg, sum));
    changed();
    return;
  }
  if (act === "locate") {
    zoomTo(burg.x, burg.y, 6, 900);
    return;
  }
  if (act === "lock") {
    burg.lock = !burg.lock;
    renderSettlement(el, burg.i);
    return;
  }
  if (act === "editor") {
    closeFolder(`b${burg.i}`);
    void Controllers.BurgEditor.open(burg.i);
    return;
  }
  if (act === "remove")
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

/** The first kind of unit in a garrison, up to an army's 12 slots: what Form Army marches out */
function marchOut(units: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  const first = Object.keys(units).find(u => units[u] > 0);
  if (!first) return out;
  const domain = domainOfUnit(first);
  let room = MAX_SLOTS;
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
}
let carried: Carried | null = null;

function wireSlots(el: HTMLElement, regiment: Regiment): void {
  const box = el.querySelector<HTMLElement>(".flSlots")!;
  for (const row of box.querySelectorAll<HTMLElement>(".flSlot:not(.flEmpty)")) {
    row.addEventListener("dragstart", event => {
      carried = {
        state: regiment.state,
        id: regiment.i,
        list: row.dataset.list as List,
        unit: row.dataset.unit!,
        count: +row.dataset.count!
      };
      event.dataTransfer?.setData("text/plain", row.dataset.unit!);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      dimPixelMap(new Set(dropCells(regiment, carried.list, carried.unit, carried.count)), "land");
    });
    row.addEventListener("dragend", () => {
      carried = null;
      pick(picked); // the reach again
    });
    row.querySelector(".flGear")?.addEventListener("click", () => editRow(row, regiment));
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
    report(moveRow(from, carried, regiment, box.dataset.list as List), box);
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

/** A row dropped on the map: into a regiment under the pointer, or standing alone in the cell */
function dropOnMap(event: DragEvent): void {
  const from = carried && regimentOf(carried.state, carried.id);
  if (!carried || !from) return;
  event.preventDefault();
  const row = carried;
  const town = settlementAt(event.clientX, event.clientY);
  if (town && town.state === from.state) {
    carried = null;
    const garrison = ensureGarrison(town);
    if (garrison && garrison !== from) report(moveRow(from, row, garrison, "u"));
    return;
  }
  const target = regimentAt(event.clientX, event.clientY);
  carried = null;
  if (target && target !== from) {
    report(moveRow(from, row, target, isTransport(target) && domainOfUnit(row.unit) === "land" ? "cargo" : "u"));
    return;
  }
  const point = mapPoint(event.clientX, event.clientY);
  const cell = point && cellAtPoint(point[0], point[1]);
  if (cell === undefined || cell === null) return;
  if (!dropCells(from, row.list, row.unit, row.count).includes(mainCell(cell))) {
    pick(picked);
    return;
  }
  const made = splitOff(from, row.list, row.unit, row.count, cell);
  if (typeof made === "string") {
    report(made);
    return;
  }
  if (mainCell(cell) === mainCell(from.cell)) {
    made.x = from.x;
    made.y = from.y;
  }
  changed();
}

/** Where a row may be dropped: its own cell or a neighbour with room; cargo onto the shore beside the transport */
function dropCells(from: Regiment, list: List, unit: string, count: number): number[] {
  const slots = slotsOf({ [unit]: count });
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
    if (carried) event.preventDefault();
  });
  map.addEventListener("drop", dropOnMap);
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
    report(t("That cell is full: 12 slots"));
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

function dragRegiment(this: SVGGElement, event: D3DragEvent<SVGGElement, unknown, unknown>): void {
  const reg = regimentFrom(this);
  if (!reg || mode) return; // in a mode, a click picks a target instead
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
  });
  event.on("end", (dragEvent: D3DragEvent<SVGGElement, unknown, unknown>) => {
    if (!started) return;
    const source = dragEvent.sourceEvent as MouseEvent | undefined;
    const town = source ? settlementAt(source.clientX, source.clientY) : null;
    if (town && town.state === reg.state) {
      placeRegiment(this, from[0], from[1]);
      stationIn(reg, town);
      return;
    }
    const under = source ? regimentAt(source.clientX, source.clientY, reg) : undefined;
    if (under && under.state === reg.state) {
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
    const spot = dropAt(reg, dragEvent.x, dragEvent.y) ?? from;
    Military.move(reg.state, reg.i, spot[0], spot[1]);
    placeRegiment(this, reg.x, reg.y);
    moved(reg);
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
    if (from && burgOfElement((event as MouseEvent).relatedTarget as Element | null) !== from) hidePeek();
  });
}

export const RegimentEditor = {
  open: editRegiment,
  click: clickRegiment,
  bind: bindRegiments,
  clear: clearAll,
  settlement: openSettlement
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
