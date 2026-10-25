// Fluoria's folder for a regiment: Azgaar's regiment dialog, its units shown as one row per slot up to the cap.
// Rows drag between open folders, out onto the map to stand alone or join a regiment there, and into a transport.
// A regiment dragged onto another on the map merges with it, or loads into it if it's a transport
import { type D3DragEvent, drag, easeSinInOut, select, transition } from "d3";
import { confirmationDialog, noteButton, refreshEditors } from "@/components/dialog/dialog-helpers";
import { Layers } from "@/components/layers";
import { clearMainTip, tip } from "@/components/tooltips";
import { applyDefaultViewboxEvents } from "@/components/viewbox-events";
import { Controllers } from "@/controllers";
import { canLoad, landingCells, load } from "@/fluoria/boarding";
import { addSlot, disband, encampRefusal, merge, regimentOf, setRow, splitOff } from "@/fluoria/forces/army";
import {
  cardPower,
  cargoSlots,
  domainOf,
  domainOfUnit,
  encamp,
  isGroup,
  isTransport,
  kitOf,
  type List,
  MAX_SLOTS,
  mergeRefusal,
  refusal,
  rows,
  shift,
  slotsOf,
  strength,
  troopsOf
} from "@/fluoria/forces/forces";
import { KIT } from "@/fluoria/forces/kit";
import { cardUrl, iconUrl, short } from "@/fluoria/forces/pixels";
import { canStand, reachable } from "@/fluoria/movement";
import { cellAtPoint, mainCell, neighbours } from "@/fluoria/one-grid";
import { dimPixelMap } from "@/fluoria/pixel-map-sync";
import {
  chooseLanding,
  clearSelection,
  dragOver,
  dropAt,
  moved,
  selectRegiment,
  stackAll,
  stackOf
} from "@/fluoria/units";
import { hasRoom } from "@/fluoria/war";
import { placeRegiment } from "@/renderers/draw-military";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
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

function editRegiment(selector: string): void {
  if (customization) return;
  Layers.show("military");
  const regiment = regimentFrom(document.querySelector(selector));
  if (!regiment) return;
  bindRegiments();
  if (stackOf(regiment).length > 1) openCell(regiment);
  openFolder(regiment);
  pick(regiment);
}

// --- a cell's folder: every unit standing there, one row each

let cellFolder: { el: HTMLElement; cell: number } | null = null;

function openCell(regiment: Regiment): void {
  const cell = mainCell(regiment.cell);
  if (!cellFolder) {
    const el = document.createElement("div");
    el.id = "flCellFolder";
    el.className = "dialog flFolder";
    ensureEl("dialogs").append(el);
    cellFolder = { el, cell };
    $(el).dialog({
      title: t("Units in this cell"),
      resizable: false,
      width: "20em",
      position: { my: "left top", at: "left+10 top+10", of: "#map" },
      close: () => {
        if (!cellFolder) return;
        $(cellFolder.el).dialog("destroy");
        cellFolder.el.remove();
        cellFolder = null;
      }
    });
  }
  cellFolder.cell = cell;
  renderCell();
}

function renderCell(): void {
  if (!cellFolder) return;
  const { el, cell } = cellFolder;
  const here = pack.states
    .flatMap(s => (s.i && !s.removed ? (s.military ?? []) : []))
    .filter(r => !r.hidden && mainCell(r.cell) === cell)
    .sort((a, b) => cardPower(b) - cardPower(a));
  if (here.length < 2) {
    $(el).dialog("close");
    return;
  }
  el.innerHTML = `<div class="flSlots">${here
    .map(r => {
      const lead = kitOf(rows(isTransport(r) ? r.u : r.u)[0]?.unit ?? "") ?? KIT[0];
      return `<div class="flSlot flUnit" draggable="true" data-state="${r.state}" data-id="${r.i}">
        <img src="${iconUrl(lead, colourOf(r.state))}" alt="" /><span class="flSlotName">${escapeHtml(r.name)}</span>
        <span class="flSlotCount">${short(troopsOf(r))} · ${Math.round(strength(r) * 100)}%</span></div>`;
    })
    .join("")}</div>`;
  for (const row of el.querySelectorAll<HTMLElement>(".flUnit")) {
    const r = regimentOf(+row.dataset.state!, +row.dataset.id!);
    if (!r) continue;
    row.addEventListener("click", () => {
      openFolder(r);
      pick(r);
    });
    row.addEventListener("dragstart", event => {
      unitCarried = r;
      event.dataTransfer?.setData("text/plain", r.name);
    });
    row.addEventListener("dragend", () => {
      unitCarried = null;
    });
    row.addEventListener("dragover", event => {
      if (unitCarried && unitCarried !== r) event.preventDefault();
    });
    row.addEventListener("drop", event => {
      event.preventDefault();
      if (unitCarried && unitCarried !== r) joinOnMap(unitCarried, r);
      unitCarried = null;
    });
  }
}

let unitCarried: Regiment | null = null;

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

function bindRegiments(): void {
  const armies = select<SVGGElement, unknown>("#armies");
  armies.selectAll(":scope > g").classed("draggable", true);
  armies.selectAll<SVGGElement, unknown>(":scope > g > g").call(drag<SVGGElement, unknown>().on("start", dragRegiment));
}

// --- the folder

function openFolder(regiment: Regiment): void {
  const key = keyOf(regiment);
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
  const previous = [...folders.values()].at(-2) ?? cellFolder?.el;
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

function closeFolder(key: string): void {
  const el = folders.get(key);
  folders.delete(key);
  if (el) {
    $(el).dialog("destroy");
    el.remove();
  }
  if (picked && keyOf(picked) === key) {
    const next = [...folders.keys()].map(k => regimentOf(...(k.split("-").map(Number) as [number, number])));
    pick(next.find(Boolean) ?? null);
  }
  if (!folders.size) unbind();
}

function unbind(): void {
  setMode(null);
  pick(null);
  select<SVGGElement, unknown>("#debug").selectAll("*").remove();
  const armies = select<SVGGElement, unknown>("#armies");
  armies.selectAll(":scope > g").classed("draggable", false);
  armies.selectAll<SVGGElement, unknown>("g>g").on(".drag", null);
}

const slotRow = (list: List, unit: string, count: number, state: number) => {
  const kit = kitOf(unit) ?? KIT[0];
  return `<div class="flSlot" draggable="true" data-list="${list}" data-unit="${escapeHtml(unit)}" data-count="${count}">
    <img src="${iconUrl(kit, colourOf(state))}" alt="" /><span class="flSlotName">${escapeHtml(unit)}</span>
    <span class="flSlotCount" data-tip="${t("Double-click to change")}">${count.toLocaleString()}</span></div>`;
};
const emptyRow = (list: List) => `<div class="flSlot flEmpty" data-list="${list}"></div>`;

function render(el: HTMLElement, regiment: Regiment): void {
  const transport = isTransport(regiment);
  const kit = kitOf(rows(regiment.u)[0]?.unit ?? "") ?? KIT[0];
  const face = {
    unit: kitOf(transport ? Object.keys(regiment.u)[0] : (rows(regiment.u)[0]?.unit ?? "")) ?? kit,
    colour: colourOf(regiment.state),
    power: cardPower(regiment),
    troops: transport ? troopsOf({ u: regiment.cargo ?? {} }) : troopsOf(regiment),
    slots: transport ? slotsOf(regiment.cargo) : slotsOf(regiment.u),
    strength: strength(regiment)
  };
  const art = isGroup(regiment) ? cardUrl(face) : iconUrl(face.unit, face.colour);
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
      <button data-act="delete" data-tip="${t("Delete the group and all its units")}" class="icon-trash"></button>
    </div>`;

  for (const button of el.querySelectorAll<HTMLButtonElement>(".flFolderBottom button[data-act]"))
    button.classList.toggle("pressed", button.dataset.act === mode && picked === regiment);
  el.querySelector<HTMLInputElement>(".flFolderName")!.addEventListener("change", function () {
    if (!this.value.trim()) return;
    Military.rename(regiment.state, regiment.i, this.value);
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
    row.querySelector(".flSlotCount")?.addEventListener("dblclick", () => editCount(row, regiment));
  }
  for (const row of box.querySelectorAll<HTMLElement>(".flEmpty"))
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
  const target = regimentAt(event.clientX, event.clientY);
  const row = carried;
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
  return cells.filter(cell => (list === "u" && cell === at) || hasRoom(from.state, cell, slots));
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

const unitName = (unit: (typeof KIT)[number]) =>
  options.map.military.units.find(u => u.fl === unit.id)?.name ?? unit.name;

function editCount(row: HTMLElement, regiment: Regiment): void {
  const span = row.querySelector<HTMLElement>(".flSlotCount");
  if (!span || span.querySelector("input")) return;
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.value = row.dataset.count!;
  span.replaceChildren(input);
  input.focus();
  input.select();
  const done = () => {
    report(setRow(regiment, row.dataset.list as List, row.dataset.unit!, +row.dataset.count!, +input.value));
    if (!troopsOf(regiment) && !isTransport(regiment)) Military.remove(regiment.state, regiment.i);
    changed();
  };
  input.addEventListener("change", done);
  input.addEventListener("blur", () => changed());
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") input.blur();
  });
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
      title: t("Delete"),
      message: t("Delete {{name}} and all its units?", { name: regiment.name }),
      confirm: t("Delete"),
      onConfirm: () => {
        Military.remove(regiment.state, regiment.i);
        changed();
      }
    });
}

function setMode(next: typeof mode): void {
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
    setMode(null);
    attack(self, target);
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
  if (!same && !hasRoom(self.state, target.cell, slotsOf(self.u), self)) {
    report(t("That cell is full: 12 slots"));
    return;
  }
  report(merge(self, target));
  changed();
  openFolder(target);
  pick(target);
}

function attack(attacker: Regiment, defender: Regiment): void {
  if (attacker.state === defender.state) {
    report(t("Cannot attack fraternal regiment"));
    return;
  }
  if (!attacker.a || !defender.a) {
    report(t("Regiment has no troops to battle"));
    return;
  }
  const at = mainCell(attacker.cell);
  const there = mainCell(defender.cell);
  if (at !== there && !neighbours(at).includes(there)) {
    report(t("Attack only a regiment in a cell next to this one"));
    return;
  }
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
    const under = source ? regimentAt(source.clientX, source.clientY, reg) : undefined;
    if (under && under.state === reg.state) {
      placeRegiment(this, from[0], from[1]);
      joinOnMap(reg, under);
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
    const r = regimentOf(...(key.split("-").map(Number) as [number, number]));
    if (!r) closeFolder(key);
    else render(el, r);
  }
  renderCell();
  if (picked && !regimentOf(picked.state, picked.i)) pick(null);
  else pick(picked);
  refreshEditors();
}

watchMap();

export const RegimentEditor = { open: editRegiment };
