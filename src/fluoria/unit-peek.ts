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

export const LINGER = 200; // ms the panel waits after the pointer leaves, just long enough to reach it

let box: HTMLElement | null = null;
let timer = 0;
let held = false; // a row is being dragged out: the panel stays until the drag ends
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
    held = true;
    queueMicrotask(() => box?.classList.add("flGone")); // out of the way once the drag has its image
    event.dataTransfer?.setData("text/plain", row.dataset.unit || "army");
    // a row without a unit is a whole army
    dragging(
      {
        state: +row.dataset.state!,
        id: +row.dataset.id!,
        unit: row.dataset.unit ?? "",
        count: +(row.dataset.count ?? 0)
      },
      event
    );
  });
  box.addEventListener("dragend", () => {
    held = false;
    box?.classList.remove("flGone");
    dropped?.();
    hidePeek();
  });
  return box;
}

// gone at once when the map moves, a click lands elsewhere, or a drag starts elsewhere
const outside = (event: Event) => !(event.target as Element).closest?.("#flPeek");
window.addEventListener("wheel", () => hidePeek(), true);
for (const type of ["pointerdown", "dragstart"])
  window.addEventListener(type, event => outside(event) && hidePeek(), true);

/** Show the contents beside an element; `also` widens the anchor (a stack's arrow) so the panel sits past it;
 * `above` puts it over the anchor instead, for a card in an open stack's row */
export function peek(
  anchor: Element,
  groups: PeekGroup[],
  withTotal = true,
  also?: Element | null,
  above = false
): void {
  clearTimeout(timer);
  const list = groups.filter(g => present(g.units).length);
  if (!list.length) {
    hidePeek();
    return;
  }
  const el = ensureBox();
  if (!el.isConnected) document.body.append(el);
  el.classList.remove("flTip");
  let total = 0;
  if (list.length > 1) {
    // a stack: one short line per group (its lead unit, name and troops), so the panel stays small
    el.innerHTML = list
      .map(g => {
        const units = present(g.units).sort((a, b) => b.count - a.count);
        const count = units.reduce((sum, u) => sum + u.count, 0);
        total += count;
        const kit = kitOf(units[0].unit);
        const icon = kit ? `<img src="${iconUrl(kit, colourOf(g.state))}" alt="" />` : "<span></span>";
        const grab = g.id === undefined ? "" : ` draggable="true" data-state="${g.state}" data-id="${g.id}"`;
        const grip = g.id === undefined ? "" : '<i class="flGrip">⋮⋮</i>';
        return `<div class="flPeekRow"${grab}>${grip}${icon}<span>${escapeHtml(g.title)}</span><b>${short(count)}</b></div>`;
      })
      .join("");
    if (withTotal)
      el.insertAdjacentHTML("beforeend", `<div class="flPeekTotal"><span>Total</span><b>${short(total)}</b></div>`);
    place(el, anchor, also, above);
    return;
  }
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
  place(el, anchor, also, above);
}

function place(el: HTMLElement, anchor: Element, also?: Element | null, above = false): void {
  const r = anchor.getBoundingClientRect();
  if (above) {
    el.style.left = `${Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, r.left))}px`;
    el.style.top = `${Math.max(4, r.top - el.offsetHeight - 6)}px`;
    return;
  }
  const right = Math.max(r.right, also?.getBoundingClientRect().right ?? 0);
  const width = el.offsetWidth;
  const left = right + 8 + width > window.innerWidth ? r.left - 8 - width : right + 8;
  el.style.left = `${Math.max(4, left)}px`;
  el.style.top = `${Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, r.top))}px`;
}

/** A small tooltip by the pointer for one unit */
export function unitTip(clientX: number, clientY: number, html: string): void {
  clearTimeout(timer);
  const el = ensureBox();
  if (!el.isConnected) document.body.append(el);
  el.classList.add("flTip");
  el.innerHTML = html;
  el.style.left = `${Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, clientX + 14))}px`;
  el.style.top = `${Math.max(4, clientY - el.offsetHeight - 10)}px`;
}

/** Hide now, or after a moment unless the pointer comes back */
export function hidePeek(delay = 0): void {
  if (held) return;
  clearTimeout(timer);
  if (delay) timer = window.setTimeout(() => box?.remove(), delay);
  else box?.remove();
}
