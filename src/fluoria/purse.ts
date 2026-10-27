// A settlement's money and manpower as two blocks, shared by the settlement and nation panels. Each amount is a number
// field (number-field.ts): it draws from (or returns to) the settlement picked under it, the Goldbank (a loan;
// mercenaries) and other nations. Nothing moves until it's confirmed; then every open purse updates in place
import type { Burg } from "@/generators/burgs-generator";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import { standing } from "./nation";
import { numberField, wireField } from "./number-field";
import { order } from "./orders";
import { RANKS, rankOf } from "./settlement-size";
import {
  bankFunds,
  borrow,
  capitalOf,
  funds,
  hireMercenaries,
  isCapital,
  MERCENARY_PRICE,
  manpowerOf,
  moveManpower,
  releaseManpower,
  setNationMoney,
  transfer
} from "./settlements";
import { play } from "./sfx";

const NONE = 0; // no source: the box sets its figure outright
const sources = new Map<string, number>(); // "m12" / "p12": the settlement a box draws on
const nations = new Map<string, number>(); // "m12" / "p12": the other nation picked

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const living = (id: number) => (pack.burgs[id]?.i && !pack.burgs[id].removed ? pack.burgs[id] : null);

/** A nation's settlements, its capital first then by size and name */
function ownSettlements(state: number): Burg[] {
  return pack.burgs
    .filter(b => b?.i && !b.removed && b.state === state)
    .sort(
      (a, b) =>
        Number(isCapital(b)) - Number(isCapital(a)) ||
        RANKS.indexOf(rankOf(b)) - RANKS.indexOf(rankOf(a)) ||
        (a.name ?? "").localeCompare(b.name ?? "")
    );
}

function sourceOf(kind: "m" | "p", burg: Burg): Burg | null {
  const key = `${kind}${burg.i}`;
  if (sources.has(key)) return living(sources.get(key)!);
  const capital = capitalOf(burg.state ?? 0);
  return capital && capital.i !== burg.i ? capital : null; // the capital sets its own figure
}

interface Item {
  value: number;
  html: string;
  group?: string;
  disabled?: boolean;
}

/** A small dropdown: a button that opens a list */
const picker = (name: string, current: string, items: Item[]) => {
  const list = items
    .map((item, k) => {
      const head =
        item.group && item.group !== items[k - 1]?.group ? `<div class="flPickGroup">${item.group}</div>` : "";
      return `${head}<button type="button" class="flPickItem" data-pick-value="${item.value}" ${item.disabled ? "disabled" : ""}>${item.html}</button>`;
    })
    .join("");
  return `<span class="flPicker" data-picker="${name}"><button type="button" class="flPickOpen">${current} ▾</button><div class="flPickList">${list}</div></span>`;
};

const emblem = (state: number) => {
  void EmblemRenderer.trigger(`stateCOA${state}`, pack.states[state].coa);
  return `<svg class="flPickEmblem" viewBox="0 0 200 200"><use href="#stateCOA${state}"></use></svg>`;
};

function settlementItems(burg: Burg, value: (b: Burg) => string): Item[] {
  return [
    { value: NONE, html: t("Set directly") },
    ...ownSettlements(burg.state ?? 0).map(b => ({
      value: b.i,
      html: `${isCapital(b) ? "■ " : ""}${escapeHtml(b.name ?? "")} <i>${value(b)}</i>`,
      disabled: b.i === burg.i
    }))
  ];
}

const GROUPS: [string, string][] = [
  ["ally", "Allies"],
  ["neutral", "Neutral"],
  ["enemy", "Enemies"]
];

const groupOf = (state: number, other: number) => {
  const kind = standing(state, other);
  return kind === "vassal" || kind === "overlord" ? "ally" : kind;
};

function nationItems(state: number, only?: string): Item[] {
  return GROUPS.filter(([kind]) => !only || kind === only).flatMap(([kind, label]) =>
    pack.states
      .filter(s => s.i && !s.removed && s.i !== state && capitalOf(s.i) && groupOf(state, s.i) === kind)
      .map(s => ({ value: s.i, html: `${emblem(s.i)}${escapeHtml(s.name)}`, group: t(label) }))
  );
}

function otherNation(kind: "m" | "p", burg: Burg, only?: string): number {
  const key = `${kind}${burg.i}`;
  const items = nationItems(burg.state ?? 0, only);
  const kept = nations.get(key);
  return items.find(i => i.value === kept)?.value ?? items[0]?.value ?? 0;
}

/** The treasury and manpower blocks of a settlement; the nation panel shows only the treasury */
export function purseBlocks(burg: Burg, men = true): string {
  return `<div class="flPurseWrap" data-purse-of="${burg.i}" data-men="${men ? 1 : 0}">${blocks(burg, men)}</div>`;
}

function blocks(burg: Burg, men: boolean): string {
  const state = burg.state ?? 0;
  const from = sourceOf("m", burg);
  const other = otherNation("m", burg);
  const loan = pack.states[state]?.loan ?? 0;
  const otherCapital = other ? capitalOf(other) : null;
  const nationName = (id: number) => (id ? `${emblem(id)}${escapeHtml(pack.states[id].name)}` : t("None"));
  return /* html */ `
    <div class="flPurse">
      <div class="flPurseHead">${t("Treasury")}${numberField("money", funds(burg), t("Draws from or returns to the settlement below"))}</div>
      <div class="flPurseLine">${picker(
        "m-source",
        from ? escapeHtml(from.name ?? "") : t("Set directly"),
        settlementItems(burg, b => `§${fmt(funds(b))}`)
      )}<span>${from ? `§${fmt(funds(from))}` : ""}</span></div>
      ${state ? `<div class="flPurseLine">${t("Goldbank")} <span class="flGold">§${fmt(bankFunds())}</span> · ${t("Loan")}${numberField("loan", loan, t("Raise to borrow, lower to repay"))}</div>` : ""}
      ${state && other ? `<div class="flPurseLine">${picker("m-nation", nationName(other), nationItems(state))}<span>§${fmt(otherCapital ? funds(otherCapital) : 0)}</span>${numberField("gift", 0, t("+ takes from their capital, − sends to it"), true)}</div>` : ""}
    </div>
    ${men ? manpowerBlock(burg) : ""}`;
}

function manpowerBlock(burg: Burg): string {
  const state = burg.state ?? 0;
  const fromMen = sourceOf("p", burg);
  const ally = otherNation("p", burg, "ally");
  const allyCapital = ally ? capitalOf(ally) : null;
  const nationName = (id: number) => (id ? `${emblem(id)}${escapeHtml(pack.states[id].name)}` : t("None"));
  return /* html */ `
    <div class="flPurse">
      <div class="flPurseHead">${t("Manpower")}${numberField("men", manpowerOf(burg), t("Draws from or returns to the settlement below"))}</div>
      <div class="flPurseLine">${picker(
        "p-source",
        fromMen ? escapeHtml(fromMen.name ?? "") : t("Set directly"),
        settlementItems(burg, b => fmt(manpowerOf(b)))
      )}<span>${fromMen ? fmt(manpowerOf(fromMen)) : ""}</span></div>
      ${state ? `<div class="flPurseLine">${t("Goldbank mercenaries")} (§${MERCENARY_PRICE} ${t("a man")})${numberField("hire", 0, t("+ hires, − lets go"), true)}</div>` : ""}
      ${state && ally ? `<div class="flPurseLine">${picker("p-nation", nationName(ally), nationItems(state, "ally"))}<span>${fmt(allyCapital ? manpowerOf(allyCapital) : 0)}</span>${numberField("lend", 0, t("+ borrows men, − sends them back"), true)}</div>` : ""}
    </div>`;
}

/** Move `delta` of a field's figure; "" or why not */
function apply(burg: Burg, name: string, delta: number): string {
  if (!delta) return "";
  const state = burg.state ?? 0;
  const setMoney = (b: Burg, amount: number) => {
    if (isCapital(b)) setNationMoney(b.state ?? 0, amount);
    else b.treasury = Math.max(0, Math.round(amount));
  };
  switch (name) {
    case "money": {
      const from = sourceOf("m", burg);
      if (!from) {
        setMoney(burg, funds(burg) + delta);
        return "";
      }
      return delta > 0 ? transfer(from, burg, delta) : transfer(burg, from, -delta);
    }
    case "men": {
      const from = sourceOf("p", burg);
      if (!from) {
        burg.manpower = Math.max(0, manpowerOf(burg) + delta);
        return "";
      }
      return delta > 0 ? moveManpower(from, burg, delta) : moveManpower(burg, from, -delta);
    }
    case "loan":
      return borrow(burg, delta);
    case "gift": {
      const theirs = capitalOf(otherNation("m", burg));
      if (!theirs) return "";
      return delta > 0 ? transfer(theirs, burg, delta) : transfer(burg, theirs, -delta);
    }
    case "hire":
      if (delta > 0) return hireMercenaries(burg, delta);
      releaseManpower(burg, -delta);
      return "";
    case "lend": {
      const theirs = capitalOf(otherNation("p", burg, "ally"));
      if (!theirs || !state) return "";
      return delta > 0 ? moveManpower(theirs, burg, delta) : moveManpower(burg, theirs, -delta);
    }
  }
  return "";
}

/** The field's figure now: what a typed value is read against (0 for the take/send fields) */
function figure(burg: Burg, name: string): number {
  if (name === "money") return funds(burg);
  if (name === "men") return manpowerOf(burg);
  if (name === "loan") return pack.states[burg.state ?? 0]?.loan ?? 0;
  return 0;
}

const signedNumber = (n: number) => `${n > 0 ? "+" : "−"}${fmt(Math.abs(n))}`;

/** What confirming a field's new figure would do, in a line */
function previewOf(burg: Burg, name: string, next: number): string {
  const now = figure(burg, name);
  const delta = next - now;
  const other = (kind: "m" | "p", only?: string) => pack.states[otherNation(kind, burg, only)]?.name ?? "";
  switch (name) {
    case "money": {
      const from = sourceOf("m", burg);
      return from
        ? `§${fmt(now)} → §${fmt(next)} · ${from.name} §${fmt(funds(from))} → §${fmt(funds(from) - delta)}`
        : `§${fmt(now)} → §${fmt(next)}`;
    }
    case "men": {
      const from = sourceOf("p", burg);
      return from
        ? `${fmt(now)} → ${fmt(next)} · ${from.name} ${fmt(manpowerOf(from))} → ${fmt(manpowerOf(from) - delta)}`
        : `${fmt(now)} → ${fmt(next)}`;
    }
    case "loan":
      return `${t("Loan")} §${fmt(now)} → §${fmt(next)} · ${t("treasury")} ${signedNumber(delta)}`;
    case "gift":
      return next > 0 ? `+§${fmt(next)} ${t("from")} ${other("m")}` : `−§${fmt(-next)} ${t("to")} ${other("m")}`;
    case "hire":
      return next > 0
        ? `+${fmt(next)} ${t("men")} · §${fmt(next * MERCENARY_PRICE)}`
        : `${t("Let")} ${fmt(-next)} ${t("men go")}`;
    case "lend":
      return next > 0
        ? `+${fmt(next)} ${t("men from")} ${other("p", "ally")}`
        : `−${fmt(-next)} ${t("men to")} ${other("p", "ally")}`;
  }
  return "";
}

const SOUND: Record<string, "coin" | "pouch" | "men"> = {
  money: "coin",
  loan: "pouch",
  gift: "coin",
  men: "men",
  hire: "men",
  lend: "men"
};

/** Every open purse redraws its figures, wherever it is */
export function refreshPurses(): void {
  for (const wrap of document.querySelectorAll<HTMLElement>(".flPurseWrap[data-purse-of]")) {
    const burg = living(Number(wrap.dataset.purseOf));
    if (!burg) continue;
    wrap.innerHTML = blocks(burg, wrap.dataset.men === "1");
    wireBlocks(wrap, burg);
  }
}

let refuseWith: (why: string, el: Element) => void = () => {};

function wireBlocks(root: HTMLElement, burg: Burg): void {
  for (const field of root.querySelectorAll<HTMLElement>(".flField[data-field]")) {
    const name = field.dataset.field!;
    wireField(field, {
      current: () => figure(burg, name),
      preview: next => previewOf(burg, name, next),
      apply: next =>
        order(name === "men" || name === "hire" || name === "lend" ? "Manpower" : "Treasury", () =>
          apply(burg, name, next - figure(burg, name))
        ),
      done: (why, el) => {
        if (why) {
          refuseWith(t(why), el); // the figure stays to be changed, or put back with Escape
          return;
        }
        const big = Math.abs(figure(burg, name)) >= 100;
        play(SOUND[name] === "coin" && big ? "pouch" : SOUND[name]);
        window.dispatchEvent(new Event("fl:money"));
        refreshPurses();
      }
    });
  }
  for (const pick of root.querySelectorAll<HTMLElement>(".flPurse [data-picker]")) {
    pick.querySelector(".flPickOpen")?.addEventListener("click", event => {
      event.stopPropagation();
      const open = pick.classList.contains("on");
      for (const other of root.querySelectorAll(".flPicker.on")) other.classList.remove("on");
      pick.classList.toggle("on", !open);
    });
    pick.addEventListener("click", event => {
      const item = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-pick-value]");
      if (!item || item.disabled) return;
      const [kind, what] = pick.dataset.picker!.split("-") as ["m" | "p", string];
      (what === "source" ? sources : nations).set(`${kind}${burg.i}`, Number(item.dataset.pickValue));
      refreshPurses();
    });
  }
  for (const block of root.querySelectorAll(".flPurse"))
    block.addEventListener("click", event => {
      if ((event.target as Element).closest(".flPicker")) return;
      for (const other of root.querySelectorAll(".flPicker.on")) other.classList.remove("on");
    });
}

/** Wire the blocks in a panel; `refuse` reports why a change didn't happen */
export function wirePurse(root: HTMLElement, burg: Burg, refuse: (why: string, el: Element) => void): void {
  refuseWith = refuse;
  const wrap = root.querySelector<HTMLElement>(`.flPurseWrap[data-purse-of="${burg.i}"]`);
  if (wrap) wireBlocks(wrap, burg);
}
