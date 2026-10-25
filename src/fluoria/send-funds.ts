// Send Funds: money from one of a nation's settlements (its capital is the nation's treasury) to another
// settlement or another nation's capital. Laid out like Azgaar's dialogs; either end can be picked on the map
import type { Burg } from "@/generators/burgs-generator";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import { STANDING_LABEL, standing } from "./nation";
import { cellAtPoint } from "./one-grid";
import { sizeOf } from "./settlement-size";
import { burgOfElement, funds, isCapital, transfer } from "./settlements";

interface Sent {
  from: number;
  to: number;
  amount: number;
  undone?: boolean;
}

let el: HTMLElement | null = null;
let nation = 0;
let from = 0;
let to = 0;
let picking: "from" | "to" | null = null;
const log: Sent[] = [];
let onChange: () => void = () => {};

const living = (id: number) => {
  const burg = pack.burgs[id];
  return burg?.i && !burg.removed ? burg : null;
};
const capitalOf = (state: number) => living(pack.states[state]?.capital ?? 0);
const name = (b: Burg) => b.name ?? "";

/** Settlements a nation can send from: its capital first, then its towns and cities */
function sources(): Burg[] {
  const capital = capitalOf(nation);
  const towns = pack.burgs.filter(
    b => b?.i && !b.removed && b.state === nation && sizeOf(b) && b.i !== capital?.i
  ) as Burg[];
  return [...(capital ? [capital] : []), ...towns.sort((a, b) => name(a).localeCompare(name(b)))];
}

/** Places it can send to: its own settlements, and every other nation's capital */
function targets(): { own: Burg[]; others: Burg[] } {
  const own = sources().filter(b => b.i !== from);
  const others = pack.states
    .filter(s => s.i && !s.removed && s.i !== nation)
    .map(s => capitalOf(s.i))
    .filter((b): b is Burg => Boolean(b));
  return { own, others };
}

const label = (b: Burg) => {
  if (b.state === nation) return isCapital(b) ? `${name(b)} (${t("nation")})` : name(b);
  const relation = standing(nation, b.state ?? 0);
  const note = relation === "ally" || relation === "enemy" || relation === "vassal" || relation === "overlord";
  return `${pack.states[b.state ?? 0]?.name ?? name(b)}${note ? ` (${t(STANDING_LABEL[relation])})` : ""}`;
};

/** Open the dialog; `toBurg` presets the destination, else the source is the nation's capital */
export function openSendFunds(state: number, toBurg?: number, changed?: () => void): void {
  nation = state;
  onChange = changed ?? (() => {});
  from = capitalOf(state)?.i ?? sources()[0]?.i ?? 0;
  const preset = toBurg ? living(toBurg) : null;
  if (preset && preset.state === state && preset.i === from) to = targets().own[0]?.i ?? 0;
  else to = preset?.i ?? targets().own[0]?.i ?? 0;
  if (!el) build();
  render();
  $(el!).dialog("open").dialog("moveToTop");
}

function build(): void {
  el = document.createElement("div");
  el.id = "flSendFunds";
  el.className = "dialog";
  document.getElementById("dialogs")?.append(el);
  $(el).dialog({
    title: t("Send Funds"),
    autoOpen: false,
    resizable: false,
    width: "24em",
    position: { my: "center", at: "center", of: "#map" },
    close: () => stopPicking()
  });
  el.addEventListener("change", event => {
    const target = event.target as HTMLSelectElement;
    if (target.dataset.end === "from") from = +target.value;
    if (target.dataset.end === "to") to = +target.value;
    render();
  });
  el.addEventListener("click", event => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!button) return;
    const act = button.dataset.act;
    if (act === "pick-from" || act === "pick-to") startPicking(act === "pick-from" ? "from" : "to");
    if (act === "all") amountInput().value = String(Math.floor(funds(living(from)!)));
    if (act === "send") send();
    if (act === "undo") undo(Number(button.dataset.k));
  });
}

const amountInput = () => el!.querySelector<HTMLInputElement>("#flSendAmount")!;

function render(): void {
  if (!el) return;
  const kept = el.querySelector<HTMLInputElement>("#flSendAmount")?.value ?? "100";
  const src = living(from);
  const dst = living(to);
  const { own, others } = targets();
  const option = (b: Burg, on: number) =>
    `<option value="${b.i}" ${b.i === on ? "selected" : ""}>${escapeHtml(label(b))}</option>`;
  const coin = (b: Burg | null) =>
    `<span class="flCoin">§${b ? Math.floor(b.state === nation || isCapital(b) ? funds(b) : 0).toLocaleString() : 0}</span>`;
  el.innerHTML = /* html */ `
    <div class="flSendGrid">
      <span class="flSendLabel">${t("From")}:</span>
      <select data-end="from">${sources()
        .map(b => option(b, from))
        .join("")}</select>
      <button type="button" class="flSendPick" data-act="pick-from" data-tip="${t("Pick on the map")}">⌖</button>
      ${coin(src)}
      <span class="flSendLabel">${t("To")}:</span>
      <select data-end="to">
        <optgroup label="${escapeHtml(pack.states[nation]?.name ?? "")}">${own.map(b => option(b, to)).join("")}</optgroup>
        <optgroup label="${t("Other nations")}">${others.map(b => option(b, to)).join("")}</optgroup>
      </select>
      <button type="button" class="flSendPick" data-act="pick-to" data-tip="${t("Pick on the map")}">⌖</button>
      ${coin(dst)}
      <span class="flSendLabel">${t("Amount")}:</span>
      <input id="flSendAmount" type="number" min="1" step="1" value="${escapeHtml(kept)}" />
    </div>
    <div class="flSendError"></div>
    <div class="flSendButtons">
      <button type="button" data-act="send">${t("Send")}</button>
      <button type="button" data-act="all">${t("All")}</button>
    </div>
    ${
      log.length
        ? `<div class="flSendLog">${log
            .slice(0, 3)
            .map((s, k) => {
              const a = living(s.from);
              const b = living(s.to);
              return `<div class="flSendRow"><span>§${s.amount.toLocaleString()} · ${escapeHtml(a ? label(a) : "?")} → ${escapeHtml(b ? label(b) : "?")}</span>${
                s.undone
                  ? `<i>${t("undone")}</i>`
                  : `<button type="button" data-act="undo" data-k="${k}">↶ ${t("undo")}</button>`
              }</div>`;
            })
            .join("")}</div>`
        : ""
    }`;
  for (const [end, on] of [
    ["from", picking === "from"],
    ["to", picking === "to"]
  ] as const)
    el.querySelector(`[data-act="pick-${end}"]`)?.classList.toggle("pressed", on);
}

const error = (text: string) => {
  const box = el?.querySelector(".flSendError");
  if (box) box.textContent = text;
};

function send(): void {
  const src = living(from);
  const dst = living(to);
  if (!src || !dst) {
    error(t("Choose both ends"));
    return;
  }
  const amount = Math.round(+amountInput().value);
  const why = transfer(src, dst, amount);
  if (why) {
    error(t(why));
    return;
  }
  log.unshift({ from: src.i, to: dst.i, amount });
  render();
  onChange();
}

function undo(k: number): void {
  const s = log[k];
  const src = living(s?.to ?? 0);
  const dst = living(s?.from ?? 0);
  if (!s || s.undone || !src || !dst) return;
  const why = transfer(src, dst, s.amount);
  if (why) {
    error(t("Already spent"));
    return;
  }
  s.undone = true;
  render();
  onChange();
}

// --- picking an end on the map, the way Azgaar's click modes work

function startPicking(end: "from" | "to"): void {
  if (picking === end) {
    stopPicking();
    return;
  }
  picking = end;
  document.body.classList.add("flPicking");
  el?.closest(".ui-dialog")?.classList.add("flFaded");
  document.addEventListener("click", onPick, true);
  document.addEventListener("keyup", onEscape, true);
  render();
}

function stopPicking(): void {
  picking = null;
  document.body.classList.remove("flPicking");
  el?.closest(".ui-dialog")?.classList.remove("flFaded");
  document.removeEventListener("click", onPick, true);
  document.removeEventListener("keyup", onEscape, true);
  render();
}

function onEscape(event: KeyboardEvent): void {
  if (event.key === "Escape") stopPicking();
}

function onPick(event: MouseEvent): void {
  const target = event.target as Element;
  if (target.closest("#flSendFunds, .ui-dialog")) return; // the dialog itself still works
  event.stopPropagation();
  event.preventDefault();
  // the settlement in the clicked cell first, so a neighbour's name lying over it doesn't win
  let burg: Burg | null = null;
  if (target.closest("#map")) {
    const viewbox = document.getElementById("viewbox") as SVGGraphicsElement | null;
    const matrix = viewbox?.getScreenCTM()?.inverse();
    if (matrix) {
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
      const cell = cellAtPoint(p.x, p.y);
      burg = cell === undefined ? null : living(pack.cells.burg[cell]);
    }
  }
  burg ??= burgOfElement(target);
  if (!burg) {
    stopPicking();
    return;
  } // a click on empty ground cancels
  if (picking === "from") {
    if (burg.state !== nation || !sizeOf(burg)) {
      error(t("Pick one of your own towns, cities or capital"));
      return;
    }
    from = burg.i;
    if (to === from) to = targets().own[0]?.i ?? 0;
  } else {
    // a foreign settlement stands for its nation's capital
    const pick = burg.state === nation ? burg : capitalOf(burg.state ?? 0);
    if (!pick || pick.i === from || (pick.state === nation && !sizeOf(pick))) {
      error(t("Pick another settlement"));
      return;
    }
    to = pick.i;
  }
  error("");
  stopPicking();
}
