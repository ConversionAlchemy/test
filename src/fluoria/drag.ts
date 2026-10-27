// One way to move units: drag. A card on the map peels its top unit off its pile (Shift: the whole pile); a row in a
// panel carries that unit, a panel's army header the whole army. Wherever it's carried, the drop is worked out the same
// way: into a panel's list, a settlement's garrison, onto a pile of the same type (they merge, the most hurt filled
// first), into a ship's hold, onto a cell (a move), or at an enemy (an attack). Each drop is rehearsed as the pointer
// reaches it, so the cursor, outline and note say exactly what letting go will do
import { tip } from "@/components/tooltips";
import type { Burg } from "@/generators/burgs-generator";
import type { Regiment } from "@/generators/military-generator";
import { t } from "@/utils/i18n";
import { canLoad, landingCells } from "./boarding";
import { type Cursor, carryCursor, installCursors } from "./cursors";
import { dropIfEmpty, regimentOf, splitOff } from "./forces/army";
import { pileUrl } from "./forces/cards";
import {
  domainOf,
  domainOfUnit,
  fillFrom,
  hasHold,
  health,
  isTransport,
  kitOf,
  type List,
  perSlot,
  roomIn,
  rows,
  shift,
  slotsOf,
  troopsOf,
  typeOf
} from "./forces/forces";
import { canStand } from "./movement";
import { takeEscape } from "./number-field";
import { cellAtPoint, mainCell, neighbours } from "./one-grid";
import { order, rehearse } from "./orders";
import { garrisonSlots } from "./settlement-size";
import { burgOfElement, ensureGarrison, formArmy, garrisonable, station } from "./settlements";
import { play, type Sound } from "./sfx";
import {
  clearSelection,
  isAfloat,
  isFar,
  measuredAt,
  outline,
  rangeFor,
  selectRegiment,
  spotIn,
  stackOf
} from "./units";
import { afterMove, atWar, enemiesIn, hasRoom } from "./war";

export type Payload =
  | { kind: "units"; regs: Regiment[]; from: "map" | "panel" }
  | { kind: "rows"; from: Regiment; list: List; rows: { unit: string; count: number }[] };

/** What the editor does around a drop: a battle, choosing who lands, and refreshing everything after */
export interface Hooks {
  attack: (attacker: Regiment, defender: Regiment) => boolean;
  land: (ship: Regiment, cell: number) => void;
  changed: () => void;
}
let hooks: Hooks | null = null;
export const setDragHooks = (next: Hooks) => {
  hooks = next;
};

interface Plan {
  key: string; // the target: the same key, the same plan
  cursor: Cursor;
  note: string;
  sound?: Sound;
  label?: string; // the order's name, for undo
  apply?: () => string; // the change, "" or why not
  orderless?: boolean; // nothing changes now: only what follows (a battle, a chooser)
  after?: () => void; // what follows a change: a battle, a chooser
  mark?: () => () => void; // light the target; returns how to unlight it
}

const NONE: Plan = { key: "none", cursor: "no", note: "" };

interface Drag {
  payload: Payload;
  ghost: HTMLImageElement;
  lifted: Element[];
  ranges: Map<Regiment, Map<number, number>>;
  plan: Plan;
  unmark: (() => void) | null;
  point: [number, number];
}
let drag: Drag | null = null;
export const dragging = () => Boolean(drag);

// --- where the pointer is

function mapPoint(clientX: number, clientY: number): [number, number] | null {
  const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
  const matrix = viewbox?.getScreenCTM()?.inverse();
  if (!matrix) return null;
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix);
  return [point.x, point.y];
}

const overMap = (el: Element | null) => Boolean(el?.closest("#map")) && !el?.closest(".ui-dialog");

function regimentFrom(el: Element | null): Regiment | undefined {
  const g = el?.closest<SVGGElement>("#armies > g > g");
  if (!g || g.classList.contains("fl-hide")) return undefined;
  return regimentOf(Number(g.dataset.state), Number(g.dataset.id));
}

interface Under {
  panel?: { regiment: Regiment; list: List; el: HTMLElement };
  burg?: Burg;
  regiment?: Regiment;
  point?: [number, number];
  cell?: number;
}

function under(clientX: number, clientY: number, skip: Regiment[]): Under {
  const els = document.elementsFromPoint(clientX, clientY);
  const top = els[0] ?? null;
  const box = top?.closest<HTMLElement>("[data-drop]");
  if (box) {
    const [state, id] = box.dataset.drop!.split("-").map(Number);
    const regiment = regimentOf(state, id);
    return regiment ? { panel: { regiment, list: (box.dataset.dropList as List) ?? "u", el: box } } : {};
  }
  if (!overMap(top)) return {};
  const found: Under = {};
  for (const el of els) {
    if (!found.burg && el.closest("#burgIcons use[data-id], #flSettlements .flSettle"))
      found.burg = burgOfElement(el) ?? undefined;
    const r = regimentFrom(el);
    if (!found.regiment && r && !skip.includes(r)) found.regiment = r;
  }
  found.point = mapPoint(clientX, clientY) ?? undefined;
  const cell = found.point ? cellAtPoint(found.point[0], found.point[1]) : undefined;
  if (cell !== undefined) found.cell = cell;
  return found;
}

// --- lighting targets

const markClass = (el: Element | null, refused: boolean) => () => {
  const name = refused ? "fl-target-no" : "fl-target";
  el?.classList.add(name);
  return () => el?.classList.remove(name);
};
const markRegiment = (r: Regiment, refused: boolean) =>
  markClass(document.getElementById(`regiment${r.state}-${r.i}`), refused);
const markBurg = (burg: Burg, refused: boolean) =>
  markClass(document.querySelector(`#burgIcons use[data-id="${burg.i}"]`), refused);
const markCell = (regiment: Regiment, x: number, y: number, refused: boolean) => () => {
  const spot = measuredAt(regiment, x, y);
  if (spot) outline(isAfloat(regiment) ? spot.cell : spot.packCell, isAfloat(regiment), refused);
  return () => outline(null);
};

// --- plans for whole units

const nameOf = (r: Regiment) => r.name;

function unitsPlan(d: Drag, at: Under): Plan {
  const regs = (d.payload as Extract<Payload, { kind: "units" }>).regs.filter(r => regimentOf(r.state, r.i));
  const lead = regs[0];
  if (!lead) return NONE;
  if (lead.garrison) return marchPlan(d, lead, at);
  if (at.panel) return intoPanel(regs, at.panel);
  if (at.burg && at.burg.state === lead.state) return garrisonPlan(regs, at.burg);
  const target = at.regiment;
  if (target && target.state !== lead.state && atWar(lead.state, target.state))
    return {
      key: `attack|${target.state}-${target.i}`,
      cursor: "carry",
      note: `${t("Attack")} ${nameOf(target)}`,
      label: "Attack",
      apply: () => "",
      orderless: true,
      after: () => hooks?.attack(lead, target),
      mark: markRegiment(target, false)
    };
  if (target && target.state === lead.state) {
    if (hasHold(target) && regs.every(r => domainOf(r) === "land")) return boardPlan(regs, target);
    if (regs.every(r => typeOf(r) === typeOf(target)) && !isTransport(target)) return mergePlan(d, regs, target);
  }
  if (!at.point || at.cell === undefined) return NONE;
  return movePlan(d, regs, at.point, at.cell);
}

/** Land units: into a panel's list (a garrison, a hold or a unit of the same type) */
function intoPanel(regs: Regiment[], panel: NonNullable<Under["panel"]>): Plan {
  const { regiment: to, list } = panel;
  if (regs.includes(to)) return NONE;
  const burg = to.garrison ? pack.burgs[to.garrison] : null;
  if (burg) return { ...garrisonPlan(regs, burg), key: `panel|${to.state}-${to.i}`, mark: markClass(panel.el, false) };
  if (list === "cargo") return { ...boardPlan(regs, to), mark: markClass(panel.el, false) };
  return { ...mergeAt(regs, to, to.cell), mark: markClass(panel.el, false) };
}

function garrisonPlan(regs: Regiment[], burg: Burg): Plan {
  const apply = () => {
    for (const r of regs) {
      const there = mainCell(burg.cell);
      if (mainCell(r.cell) !== there && !rangeFor(r).range.has(there)) return t("Out of reach this move");
      const why = station(r, burg);
      if (why) return t(why);
    }
    return "";
  };
  const why = !garrisonSlots(burg.i) ? t("Villages have no garrison") : rehearse(apply);
  return {
    key: `burg|${burg.i}`,
    cursor: why ? "no" : "in",
    note: why || `+${regs.length} ${t("into")} ${burg.name} ${t("garrison")}`,
    sound: "garrison",
    label: "Garrison",
    apply: why ? undefined : apply,
    mark: markBurg(burg, Boolean(why))
  };
}

function boardPlan(regs: Regiment[], ship: Regiment): Plan {
  const apply = () => {
    for (const r of regs) {
      if (!canLoad(r, ship))
        return domainOf(ship) === "air"
          ? t("Move beside the airship first")
          : t("Move to the coast beside the ship first");
      for (const row of rows(r.u)) {
        const why = shift(r, "u", row.unit, row.count, ship, "cargo");
        if (why) return t(why);
      }
      dropIfEmpty(r);
    }
    return "";
  };
  const why = rehearse(apply);
  return {
    key: `board|${ship.state}-${ship.i}`,
    cursor: why ? "no" : "in",
    note: why || `+${regs.length} ${t("aboard")} ${nameOf(ship)}`,
    sound: "board",
    label: "Board",
    apply: why ? undefined : apply,
    mark: markRegiment(ship, Boolean(why))
  };
}

/** Pour units into a pile of their type, the most hurt first; what's left stands in its cell */
function mergeAt(regs: Regiment[], target: Regiment, cell: number): Plan {
  const pile = stackOf(target)?.members ?? [target];
  const unit = typeOf(target) ?? "";
  const kit = kitOf(unit);
  let healed = false;
  let beside = 0;
  const apply = () => {
    const before = pile.map(health);
    beside = 0;
    for (const r of regs) {
      const here = mainCell(r.cell) === mainCell(cell);
      if (!here && !rangeFor(r).range.has(mainCell(cell))) return t("Out of reach this move");
      fillFrom(r, pile);
      if (!troopsOf(r)) {
        dropIfEmpty(r);
        continue;
      }
      beside++;
      if (here) continue;
      if (!hasRoom(r.state, cell, slotsOf(r.u), r)) return t("That cell is full: 4 units");
      const [x, y] = [target.x, target.y];
      Military.move(r.state, r.i, x, y);
      r.cell = target.cell;
      afterMove(r);
    }
    healed = pile.some((r, k) => regimentOf(r.state, r.i) && health(r) > before[k] + 0.001);
    return "";
  };
  const full = pile.every(r => roomIn(r) <= 0);
  const why = rehearse(apply);
  const name = kit ? kit.name : unit;
  return {
    key: `merge|${target.state}-${target.i}`,
    cursor: why ? "no" : full ? "carry" : "merge",
    note:
      why ||
      (full
        ? ""
        : `+${regs.length} ${t("into")} ${name}${healed ? ` · ${t("healed")}` : ""}${beside ? ` · ${beside} ${t("beside")}` : ""}`),
    sound: full ? "stack" : "merge",
    label: "Merge",
    apply: why ? undefined : apply,
    mark: markRegiment(target, Boolean(why))
  };
}

function mergePlan(_d: Drag, regs: Regiment[], target: Regiment): Plan {
  return mergeAt(regs, target, target.cell);
}

function movePlan(d: Drag, regs: Regiment[], point: [number, number], cell: number): Plan {
  const lead = regs[0];
  const [x, y] = point;
  const foe = enemiesIn(lead.state, cell)[0];
  if (foe)
    return {
      key: `attack|${foe.state}-${foe.i}`,
      cursor: "carry",
      note: `${t("Attack")} ${nameOf(foe)}`,
      label: "Attack",
      apply: () => "",
      orderless: true,
      after: () => hooks?.attack(lead, foe),
      mark: markCell(lead, x, y, false)
    };
  // a ship with troops aboard, let go on the shore beside it: choose who lands
  if (regs.length === 1 && slotsOf(lead.cargo) && !canStand(lead, cell) && landingCells(lead).includes(mainCell(cell)))
    return {
      key: `land|${mainCell(cell)}`,
      cursor: "in",
      note: t("Choose who lands here"),
      apply: () => "",
      orderless: true,
      after: () => hooks?.land(lead, mainCell(cell)),
      mark: markCell(lead, x, y, false)
    };
  const spot = measuredAt(lead, x, y);
  const key = `cell|${spot ? spot.cell : cell}`;
  const apply = () => {
    for (const [k, r] of regs.entries()) {
      const range = d.ranges.get(r) ?? rangeFor(r).range;
      const at = spotIn(r, range, x, y);
      const fits =
        at &&
        (mainCell(at.cell) === mainCell(r.cell) ||
          hasRoom(r.state, isAfloat(r) && r.n ? -1 - at.measured : at.cell, slotsOf(r.u), r));
      if (!at || !fits) {
        if (k === 0) return mainCell(cell) === mainCell(r.cell) ? "" : t("Out of reach, or that cell is full");
        continue; // the rest follow where they can
      }
      r.cell = at.cell;
      Military.move(r.state, r.i, at.point[0], at.point[1]);
      afterMove(r);
    }
    return "";
  };
  const same = spot && regs.every(r => mainCell(r.cell) === mainCell(spot.packCell));
  if (same) return { key, cursor: "carry", note: "" };
  const why = rehearse(apply);
  return {
    key,
    cursor: why ? "no" : "carry",
    note: why,
    sound: "drop",
    label: "Move",
    apply: why ? undefined : apply,
    mark: markCell(lead, x, y, Boolean(why))
  };
}

/** A garrison dragged out of its panel: as much as a cell holds marches out where it's let go */
function marchPlan(d: Drag, garrison: Regiment, at: Under): Plan {
  const burg = pack.burgs[garrison.garrison ?? 0];
  if (!burg || !at.point || at.cell === undefined || at.burg === burg || at.panel) return NONE;
  const out: Record<string, number> = {};
  let room = 4;
  for (const row of rows(garrison.u)) {
    if (room-- <= 0) break;
    out[row.unit] = (out[row.unit] ?? 0) + row.count;
  }
  if (!Object.keys(out).length) return { key: "empty", cursor: "no", note: t("The garrison is empty") };
  const point = at.point;
  const apply = () => {
    const made = formArmy(burg, out);
    if (typeof made === "string") return t(made);
    const plan = movePlan({ ...d, ranges: new Map() }, made, point, at.cell!);
    return plan.apply ? plan.apply() : plan.note || t("Out of reach this move");
  };
  const why = rehearse(apply);
  return {
    key: `march|${at.cell}`,
    cursor: why ? "no" : "carry",
    note: why || t("March out"),
    sound: "drop",
    label: "March out",
    apply: why ? undefined : apply,
    mark: markCell(garrison, point[0], point[1], Boolean(why))
  };
}

// --- plans for rows carried out of a panel

/** Whether a row's unit can reach another list from where its own stands */
function closeEnough(from: Regiment, fromList: List, to: Regiment, toList: List): string {
  if (from.state !== to.state) return t("Only a nation's own groups trade units");
  if (toList === "cargo") return canLoad(from, to) ? "" : t("Move beside the ship first");
  if (fromList === "cargo")
    return landingCells(from).includes(mainCell(to.cell)) ? "" : t("Land beside the ship first");
  if (to.garrison && [mainCell(to.cell), ...neighbours(mainCell(to.cell))].includes(mainCell(from.cell))) return "";
  return mainCell(from.cell) === mainCell(to.cell) ? "" : t("Both must stand in the same cell");
}

function moveRows(p: Extract<Payload, { kind: "rows" }>, to: Regiment, list: List): string {
  const from = regimentOf(p.from.state, p.from.i);
  if (!from || (from === to && p.list === list)) return t("It's already there");
  for (const row of p.rows) {
    const why = closeEnough(from, p.list, to, list);
    if (why) return why;
    let n = row.count;
    if (list === "u" && !to.garrison && typeOf(to)) n = Math.min(n, roomIn(to));
    if (n <= 0) return t("It's full");
    const refused = shift(from, p.list, row.unit, n, to, list);
    if (refused) return t(refused);
  }
  if (!from.garrison && !hasHold(from)) dropIfEmpty(from);
  return "";
}

function rowsPlan(p: Extract<Payload, { kind: "rows" }>, at: Under): Plan {
  const from = regimentOf(p.from.state, p.from.i);
  if (!from) return NONE;
  const land = p.rows.every(r => domainOfUnit(r.unit) === "land");
  const to = (target: Regiment, list: List, key: string, mark: () => () => void, sound: Sound, what: string): Plan => {
    const apply = () => moveRows(p, target, list);
    const why = rehearse(apply);
    const cursor: Cursor = why ? "no" : list === "u" && !target.garrison ? "merge" : "in";
    return { key, cursor, note: why || what, sound, label: "Move", apply: why ? undefined : apply, mark };
  };
  const count = p.rows.length;
  if (at.panel) {
    const { regiment, list, el } = at.panel;
    const sound: Sound = regiment.garrison ? "garrison" : list === "cargo" ? "board" : "merge";
    return to(
      regiment,
      list,
      `panel|${regiment.state}-${regiment.i}|${list}`,
      markClass(el, false),
      sound,
      `+${count} ${t("into")} ${regiment.name}`
    );
  }
  if (at.burg && at.burg.state === from.state) {
    const burg = at.burg;
    if (!garrisonSlots(burg.i))
      return { key: `burg|${burg.i}`, cursor: "no", note: t("Villages have no garrison"), mark: markBurg(burg, true) };
    if (!p.rows.every(r => garrisonable(r.unit)))
      return {
        key: `burg|${burg.i}`,
        cursor: "no",
        note: t("Only infantry garrisons a settlement"),
        mark: markBurg(burg, true)
      };
    const apply = () => {
      const garrison = ensureGarrison(burg);
      return garrison ? moveRows(p, garrison, "u") : t("No garrison here");
    };
    const why = rehearse(apply);
    return {
      key: `burg|${burg.i}`,
      cursor: why ? "no" : "in",
      note: why || `+${count} ${t("into")} ${burg.name} ${t("garrison")}`,
      sound: "garrison",
      label: "Garrison",
      apply: why ? undefined : apply,
      mark: markBurg(burg, Boolean(why))
    };
  }
  const target = at.regiment;
  if (target && target.state === from.state && target !== from) {
    if (hasHold(target) && land)
      return to(
        target,
        "cargo",
        `board|${target.state}-${target.i}`,
        markRegiment(target, false),
        "board",
        `+${count} ${t("aboard")} ${target.name}`
      );
    if (p.rows.every(r => r.unit === typeOf(target)))
      return to(
        target,
        "u",
        `merge|${target.state}-${target.i}`,
        markRegiment(target, false),
        "merge",
        `+${count} ${t("into")} ${target.name}`
      );
  }
  if (!at.point || at.cell === undefined) return NONE;
  const cell = mainCell(at.cell);
  const [x, y] = at.point;
  const apply = () => {
    const units: Record<string, number> = {};
    for (const r of p.rows) units[r.unit] = (units[r.unit] ?? 0) + r.count;
    const at0 = mainCell(from.cell);
    const cells =
      p.list === "cargo"
        ? landingCells(from)
        : [at0, ...neighbours(at0)].filter(c => canStand({ ...from, n: 0 } as Regiment, c));
    if (!cells.includes(cell))
      return p.list === "cargo"
        ? t("Unload onto the shore beside the ship")
        : t("Out of reach: next to where it stands");
    for (const row of p.rows) {
      if (!hasRoom(from.state, cell, 1)) return t("That cell is full: 4 units");
      const made = splitOff(from, p.list, row.unit, row.count, cell);
      if (typeof made === "string") return t(made);
      if (cell === at0 && !from.garrison) [made.x, made.y] = [from.x, from.y];
      made.n = 0;
    }
    if (!from.garrison && !hasHold(from)) dropIfEmpty(from);
    return "";
  };
  const why = rehearse(apply);
  const ghostReg = { ...from, n: 0 } as Regiment;
  return {
    key: `cell|${cell}`,
    cursor: why ? "no" : "carry",
    note: why,
    sound: p.list === "cargo" ? "unload" : "drop",
    label: p.list === "cargo" ? "Unload" : "Move",
    apply: why ? undefined : apply,
    mark: markCell(ghostReg, x, y, Boolean(why))
  };
}

// --- the drag itself

const THRESHOLD = 4;

function ghostOf(payload: Payload): HTMLImageElement {
  const img = document.createElement("img");
  img.id = "flGhost";
  const colourOf = (state: number) => {
    const c = pack.states[state]?.color;
    return c && c[0] === "#" && c.length >= 7 ? c.slice(0, 7) : "#999999";
  };
  let unit: string;
  let count: number;
  let whole: number;
  let state: number;
  if (payload.kind === "units") {
    const lead = payload.regs[0];
    unit = typeOf(lead) ?? "";
    count = payload.regs.length;
    whole = payload.regs.reduce((sum, r) => sum + health(r), 0) / count;
    state = lead.origin ?? lead.state;
  } else {
    unit = payload.rows[0].unit;
    count = payload.rows.length;
    whole = payload.rows.reduce((sum, r) => sum + Math.min(1, r.count / perSlot(r.unit)), 0) / count;
    state = payload.from.origin ?? payload.from.state;
  }
  const kit = kitOf(unit);
  if (kit) img.src = pileUrl({ unit: kit, colour: colourOf(state), count, health: whole, pips: 0 });
  img.addEventListener("load", () => {
    img.style.width = `${img.naturalWidth * 2}px`;
    img.style.height = `${img.naturalHeight * 2}px`;
  });
  document.body.append(img);
  return img;
}

function lift(payload: Payload): Element[] {
  if (payload.kind === "units")
    return payload.regs
      .map(r => document.getElementById(`regiment${r.state}-${r.i}`))
      .filter((el): el is HTMLElement => Boolean(el));
  return [...document.querySelectorAll(".flCarried")];
}

function begin(payload: Payload, clientX: number, clientY: number): void {
  installCursors();
  const ranges = new Map<Regiment, Map<number, number>>();
  if (payload.kind === "units") {
    const lead = payload.regs[0];
    if (!lead.garrison) selectRegiment(lead); // where it can go this move
    for (const r of payload.regs) ranges.set(r, rangeFor(r).range);
  }
  const lifted = lift(payload);
  for (const el of lifted) el.classList.add("fl-lifting");
  drag = { payload, ghost: ghostOf(payload), lifted, ranges, plan: NONE, unmark: null, point: [clientX, clientY] };
  document.body.classList.add("fl-dragging");
  play("pick");
  follow(clientX, clientY);
}

let frame = 0;
function follow(clientX: number, clientY: number): void {
  if (!drag) return;
  drag.point = [clientX, clientY];
  drag.ghost.style.translate = `${clientX + 12}px ${clientY + 14}px`;
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!drag) return;
    const d = drag;
    const skip = d.payload.kind === "units" ? d.payload.regs : [];
    const at = under(d.point[0], d.point[1], skip);
    const plan = d.payload.kind === "units" ? unitsPlan(d, at) : rowsPlan(d.payload, at);
    if (plan.key === d.plan.key && plan.note === d.plan.note) return;
    d.unmark?.();
    d.unmark = plan.mark ? plan.mark() : null;
    d.plan = plan;
    carryCursor(plan.cursor);
    if (plan.note) tip(plan.note, false, plan.cursor === "no" ? "error" : "info");
    else tip("", false);
  });
}

function end(commit: boolean): void {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  d.unmark?.();
  d.ghost.remove();
  for (const el of d.lifted) el.classList.remove("fl-lifting");
  document.body.classList.remove("fl-dragging");
  carryCursor(null);
  outline(null);
  if (!commit) {
    tip("", false);
    hooks?.changed();
    return;
  }
  // the plan for exactly where it was let go
  const skip = d.payload.kind === "units" ? d.payload.regs : [];
  const at = under(d.point[0], d.point[1], skip);
  const plan = d.payload.kind === "units" ? unitsPlan(d, at) : rowsPlan(d.payload, at);
  if (!plan.apply) {
    if (plan.note && plan.cursor === "no") {
      play("refuse");
      tip(plan.note, false, "error", 2500);
    } else tip("", false);
    hooks?.changed();
    return;
  }
  if (plan.orderless) {
    hooks?.changed();
    plan.after?.();
    return;
  }
  const why = order(plan.label ?? "Move", plan.apply);
  if (why) {
    play("refuse");
    tip(why, false, "error", 2500);
    hooks?.changed();
    return;
  }
  if (plan.sound) play(plan.sound);
  tip(plan.note, false, "success", plan.note ? 1800 : 1);
  window.dispatchEvent(new Event("fl:occupation"));
  hooks?.changed();
  plan.after?.();
}

/** Start watching a pointer that went down on something draggable; it becomes a drag once it moves a little */
export function pressed(event: PointerEvent, payload: () => Payload | null): void {
  if (event.button !== 0 || drag) return;
  const [x0, y0] = [event.clientX, event.clientY];
  const move = (e: PointerEvent) => {
    if (!drag) {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) < THRESHOLD) return;
      const p = payload();
      if (!p) return stop();
      begin(p, e.clientX, e.clientY);
    }
    follow(e.clientX, e.clientY);
  };
  const up = () => {
    stop();
    if (drag) {
      suppressClick();
      end(true);
    }
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !drag) return;
    e.stopImmediatePropagation();
    takeEscape();
    stop();
    end(false);
  };
  const stop = () => {
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    window.removeEventListener("pointercancel", up, true);
    window.removeEventListener("keydown", key, true);
  };
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", up, true);
  window.addEventListener("keydown", key, true);
}

/** The click that follows a drag's release isn't a click */
function suppressClick(): void {
  const swallow = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", swallow, true), 0);
}

/** The unit card under a screen point, even beneath a label */
export function regimentUnder(clientX: number, clientY: number): Regiment | undefined {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (el.closest(".ui-dialog")) return undefined;
    const r = regimentFrom(el);
    if (r) return r;
  }
  return undefined;
}

/** Map cards: the top of a pile peels off one unit, Shift takes the whole pile; far out piles don't drag */
export function watchMapDrags(): void {
  installCursors();
  if (!document.body.dataset.flNoNativeDrag) {
    document.body.dataset.flNoNativeDrag = "1";
    // the browser's own image drag would cancel ours
    document.addEventListener("dragstart", event => {
      if ((event.target as Element)?.closest?.("[data-drag], #map")) event.preventDefault();
    });
  }
  const map = document.getElementById("map");
  if (!map || map.dataset.flDrag) return;
  map.dataset.flDrag = "1";
  map.addEventListener(
    "pointerdown",
    event => {
      if (event.button !== 0 || isFar() || drag) return;
      const r = regimentUnder(event.clientX, event.clientY);
      if (!r) return;
      event.preventDefault(); // the map doesn't pan
      const shiftKey = event.shiftKey;
      pressed(event, () => {
        const pile = stackOf(r)?.members ?? [r];
        return { kind: "units", regs: shiftKey ? [r, ...pile.filter(o => o !== r)] : [r], from: "map" };
      });
    },
    true
  );
}

export function clearDragSelection(): void {
  clearSelection();
}
