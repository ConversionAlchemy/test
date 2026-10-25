// Hovering a card shows what's inside, to its right: each unit's icon, name and count, and the total.
// Read-only; it goes as soon as the pointer leaves or a drag starts
import type { Regiment } from "@/generators/military-generator";
import { escapeHtml } from "@/utils/stringUtils";
import { kitOf } from "./forces/forces";
import { iconUrl, short } from "./forces/pixels";

export interface PeekGroup {
  title: string;
  units: Record<string, number>;
  state: number;
}

let box: HTMLElement | null = null;

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
  units: { ...r.u, ...(r.cargo ?? {}) },
  state: r.state
});

/** Show the contents beside an element */
export function peek(anchor: Element, groups: PeekGroup[], withTotal = true): void {
  const list = groups.filter(g => present(g.units).length);
  if (!list.length) {
    hidePeek();
    return;
  }
  box ??= Object.assign(document.createElement("div"), { id: "flPeek" });
  if (!box.isConnected) document.body.append(box);
  let total = 0;
  box.innerHTML = list
    .map(g => {
      const lines = present(g.units)
        .map(({ unit, count }) => {
          total += count;
          const kit = kitOf(unit);
          const icon = kit ? `<img src="${iconUrl(kit, colourOf(g.state))}" alt="" />` : "<span></span>";
          return `<div class="flPeekRow">${icon}<span>${escapeHtml(unit)}</span><b>${short(count)}</b></div>`;
        })
        .join("");
      return `${list.length > 1 ? `<div class="flPeekTitle">${escapeHtml(g.title)}</div>` : ""}${lines}`;
    })
    .join("");
  if (withTotal)
    box.insertAdjacentHTML("beforeend", `<div class="flPeekTotal"><span>Total</span><b>${short(total)}</b></div>`);
  const r = anchor.getBoundingClientRect();
  const width = box.offsetWidth;
  const left = r.right + 8 + width > window.innerWidth ? r.left - 8 - width : r.right + 8;
  box.style.left = `${Math.max(4, left)}px`;
  box.style.top = `${Math.max(4, Math.min(window.innerHeight - box.offsetHeight - 4, r.top))}px`;
}

export function hidePeek(): void {
  box?.remove();
}
