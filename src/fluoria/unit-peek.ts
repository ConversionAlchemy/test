// Hovering a card or a settlement shows what's inside, beside it: each unit's icon, name and count.
// It waits a moment after the pointer leaves, so it can be reached; its rows drag out like folder rows
import type { Regiment } from "@/generators/military-generator";
import { escapeHtml } from "@/utils/stringUtils";
import { kitOf } from "./forces/forces";
import { iconUrl, short } from "./forces/pixels";

export interface PeekGroup {
  title: string;
  units: Record<string, number>;
  state: number;
  id?: number; // the regiment its rows come from, so they can be dragged out
}

export interface PeekRow {
  state: number;
  id: number;
  unit: string;
  count: number;
}

const LINGER = 1000; // ms the panel waits after the pointer leaves

let box: HTMLElement | null = null;
let timer = 0;
let dragging: ((row: PeekRow, event: DragEvent) => void) | null = null;
let dropped: (() => void) | null = null;

/** What happens when a row is dragged out of the panel, and when that drag ends */
export function onPeekDrag(start: (row: PeekRow, event: DragEvent) => void, end: () => void): void {
  dragging = start;
  dropped = end;
}

/** Each unit type once, with its whole count */
const present = (units: Record<string, number>) =>
  Object.entries(units)
    .filter(([, n]) => n > 0)
    .map(([unit, count]) => ({ unit, count }));

const colourOf = (state: number) => {
  const c = pack.states[state]?.color;
  return c && c[0] === "#" && c.length >= 7 ? c.slice(0, 7) : "#999999";
};

export const regimentGroup = (r: Regiment): PeekGroup => ({
  title: r.name,
  units: { ...r.u },
  state: r.state,
  id: r.i
});

function ensureBox(): HTMLElement {
  if (box) return box;
  box = Object.assign(document.createElement("div"), { id: "flPeek" });
  box.addEventListener("mouseenter", () => clearTimeout(timer));
  box.addEventListener("mouseleave", () => hidePeek(LINGER));
  box.addEventListener("dragstart", event => {
    const row = (event.target as HTMLElement).closest<HTMLElement>(".flPeekRow[data-id]");
    if (!row || !dragging) return;
    event.dataTransfer?.setData("text/plain", row.dataset.unit!);
    dragging(
      { state: +row.dataset.state!, id: +row.dataset.id!, unit: row.dataset.unit!, count: +row.dataset.count! },
      event
    );
  });
  box.addEventListener("dragend", () => {
    dropped?.();
    hidePeek();
  });
  return box;
}

/** Show the contents beside an element; `also` widens the anchor (a stack's arrow) so the panel sits past it */
export function peek(anchor: Element, groups: PeekGroup[], withTotal = true, also?: Element | null): void {
  clearTimeout(timer);
  const list = groups.filter(g => present(g.units).length);
  if (!list.length) {
    hidePeek();
    return;
  }
  const el = ensureBox();
  if (!el.isConnected) document.body.append(el);
  let total = 0;
  el.innerHTML = list
    .map(g => {
      const lines = present(g.units)
        .map(({ unit, count }) => {
          total += count;
          const kit = kitOf(unit);
          const icon = kit ? `<img src="${iconUrl(kit, colourOf(g.state))}" alt="" />` : "<span></span>";
          const grab =
            g.id === undefined
              ? ""
              : ` draggable="true" data-state="${g.state}" data-id="${g.id}" data-unit="${escapeHtml(unit)}" data-count="${count}"`;
          return `<div class="flPeekRow"${grab}>${g.id === undefined ? "" : '<i class="flGrip">⋮⋮</i>'}${icon}<span>${escapeHtml(unit)}</span><b>${short(count)}</b></div>`;
        })
        .join("");
      return `${list.length > 1 ? `<div class="flPeekTitle">${escapeHtml(g.title)}</div>` : ""}${lines}`;
    })
    .join("");
  if (withTotal && list.length > 1)
    el.insertAdjacentHTML("beforeend", `<div class="flPeekTotal"><span>Total</span><b>${short(total)}</b></div>`);
  const r = anchor.getBoundingClientRect();
  const right = Math.max(r.right, also?.getBoundingClientRect().right ?? 0);
  const width = el.offsetWidth;
  const left = right + 8 + width > window.innerWidth ? r.left - 8 - width : right + 8;
  el.style.left = `${Math.max(4, left)}px`;
  el.style.top = `${Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, r.top))}px`;
}

/** Hide now, or after a moment unless the pointer comes back */
export function hidePeek(delay = 0): void {
  clearTimeout(timer);
  if (delay) timer = window.setTimeout(() => box?.remove(), delay);
  else box?.remove();
}
