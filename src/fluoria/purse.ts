// A settlement's money and manpower as two blocks, shared by the settlement and nation panels: a box with ▲▼ that
// draws from (or returns to) the settlement picked under it, the Goldbank (a loan; mercenaries) and other nations
import type { Burg } from "@/generators/burgs-generator";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import { standing } from "./nation";
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

const box = (name: string, value: number, tip: string) =>
  `<span class="flBox"><input type="number" data-box="${name}" value="${Math.round(value)}" data-tip="${tip}" /><span class="flSteps"><button type="button" data-step="${name}" data-dir="1">▲</button><button type="button" data-step="${name}" data-dir="-1">▼</button></span></span>`;

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
  const state = burg.state ?? 0;
  const from = sourceOf("m", burg);
  const other = otherNation("m", burg);
  const loan = pack.states[state]?.loan ?? 0;
  const otherCapital = other ? capitalOf(other) : null;
  const nationName = (id: number) => (id ? `${emblem(id)}${escapeHtml(pack.states[id].name)}` : t("None"));
  return /* html */ `
    <div class="flPurse" data-purse="${burg.i}">
      <div class="flPurseHead">${t("Treasury")}${box("money", funds(burg), t("Draws from or returns to the settlement below"))}</div>
      <div class="flPurseLine">${picker(
        "m-source",
        from ? escapeHtml(from.name ?? "") : t("Set directly"),
        settlementItems(burg, b => `§${fmt(funds(b))}`)
      )}<span>${from ? `§${fmt(funds(from))}` : ""}</span></div>
      ${state ? `<div class="flPurseLine">${t("Goldbank")} <span>§${fmt(bankFunds())}</span> · ${t("Loan")}${box("loan", loan, t("Raise to borrow, lower to repay"))}</div>` : ""}
      ${state && other ? `<div class="flPurseLine">${picker("m-nation", nationName(other), nationItems(state))}<span>§${fmt(otherCapital ? funds(otherCapital) : 0)}</span>${box("gift", 0, t("Raise to take from their capital, lower to send to it"))}</div>` : ""}
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
    <div class="flPurse" data-purse="${burg.i}">
      <div class="flPurseHead">${t("Manpower")}${box("men", manpowerOf(burg), t("Draws from or returns to the settlement below"))}</div>
      <div class="flPurseLine">${picker(
        "p-source",
        fromMen ? escapeHtml(fromMen.name ?? "") : t("Set directly"),
        settlementItems(burg, b => fmt(manpowerOf(b)))
      )}<span>${fromMen ? fmt(manpowerOf(fromMen)) : ""}</span></div>
      ${state ? `<div class="flPurseLine">${t("Goldbank mercenaries")} (§${MERCENARY_PRICE} ${t("a man")})${box("hire", 0, t("Raise to hire, lower to let go"))}</div>` : ""}
      ${state && ally ? `<div class="flPurseLine">${picker("p-nation", nationName(ally), nationItems(state, "ally"))}<span>${fmt(allyCapital ? manpowerOf(allyCapital) : 0)}</span>${box("lend", 0, t("Raise to borrow men, lower to send them back"))}</div>` : ""}
    </div>`;
}

/** Move `delta` of a box's figure; "" or why not */
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

/** The box's figure now, to read a typed value against */
function figure(burg: Burg, name: string): number {
  if (name === "money") return funds(burg);
  if (name === "men") return manpowerOf(burg);
  if (name === "loan") return pack.states[burg.state ?? 0]?.loan ?? 0;
  return 0;
}

/** Wire the blocks in a panel; `done` redraws, `refuse` reports why a move didn't happen */
export function wirePurse(
  root: HTMLElement,
  burg: Burg,
  done: () => void,
  refuse: (why: string, el: Element) => void
): void {
  for (const input of root.querySelectorAll<HTMLInputElement>(".flPurse [data-box]"))
    input.addEventListener("change", () => {
      const why = apply(burg, input.dataset.box!, Math.round(+input.value || 0) - figure(burg, input.dataset.box!));
      if (why) refuse(t(why), input);
      done();
    });
  for (const button of root.querySelectorAll<HTMLButtonElement>(".flPurse [data-step]"))
    button.addEventListener("click", event => {
      const why = apply(burg, button.dataset.step!, Number(button.dataset.dir) * (event.shiftKey ? 10 : 1));
      if (why) refuse(t(why), button);
      done();
    });
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
      done();
    });
  }
  for (const block of root.querySelectorAll(".flPurse"))
    block.addEventListener("click", () => {
      for (const other of root.querySelectorAll(".flPicker.on")) other.classList.remove("on");
    });
}
