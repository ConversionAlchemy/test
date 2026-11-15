// A province's dialog: its flag, name and form; who holds it; what can be done with it (rebel, release, gift, merge);
// its figures; and its notes
import { confirmationDialog } from "@/components/dialog/dialog-helpers";
import { Layers } from "@/components/layers";
import { tip } from "@/components/tooltips";
import { Controllers } from "@/controllers";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { escapeHtml } from "@/utils/stringUtils";
import { getArea, getAreaUnit, si } from "@/utils/unitUtils";
import { APPOINT_PRICE, appoint, governorOf } from "./court";
import { troopsOf } from "./forces/forces";
import { mainCell } from "./one-grid";
import { notesHtml, wireNotes } from "./place-dialog";
import { occupierOf } from "./war";

let open: HTMLElement | null = null;

const living = (id: number) => (id && pack.states[id] && !pack.states[id].removed ? pack.states[id] : null);

/** Every form a province can take, from Azgaar's lists */
const forms = () => [...new Set(Object.values(Provinces.forms).flatMap(f => Object.keys(f)))].sort();

function figures(id: number) {
  const { cells } = pack;
  const own: number[] = [];
  for (let i = 0; i < cells.i.length; i++) if (cells.province[i] === id && cells.h[i] >= 20) own.push(i);
  const burgs = own.map(c => pack.burgs[cells.burg[c]]).filter(b => b?.i && !b.removed);
  const scale = options.map.units.population.scale;
  const rural = own.reduce((sum, c) => sum + (cells.pop[c] ?? 0), 0) * scale;
  const urban =
    burgs.reduce((sum, b) => sum + (b.population ?? 0), 0) * scale * options.map.units.population.urbanization.rate;
  const inside = new Set(own.map(c => mainCell(c)));
  const troops = pack.states.reduce(
    (sum, s) => sum + (s.military ?? []).filter(r => inside.has(mainCell(r.cell))).reduce((n, r) => n + troopsOf(r), 0),
    0
  );
  const area = own.reduce((sum, c) => sum + (cells.area[c] ?? 0), 0);
  return { own, burgs, people: rural + urban, troops, area };
}

/** Open a province's dialog */
export function openProvince(id: number): void {
  const p = pack.provinces[id];
  if (!p?.i || p.removed) return;
  if (open) $(open).dialog("destroy").remove();
  const el = document.createElement("div");
  el.className = "dialog flPlace flProvince";
  open = el;
  document.body.append(el);
  render(el, id);
  $(el).dialog({
    title: "Province",
    width: "22em",
    resizable: false,
    position: { my: "left top", at: "left+10 top+10", of: "#map" },
    close: () => {
      $(el).dialog("destroy").remove();
      if (open === el) open = null;
    }
  });
}

function render(el: HTMLElement, id: number): void {
  const p = pack.provinces[id];
  if (!p?.i || p.removed) {
    $(el).dialog("close");
    return;
  }
  void EmblemRenderer.trigger(`provinceCOA${id}`, p.coa);
  const owner = living(p.state);
  const seat = pack.burgs[p.burg];
  const governor = governorOf(id);
  const holder = seat?.i ? occupierOf(seat.cell) : 0;
  const f = figures(id);
  const isCapitalProvince = Boolean(owner && pack.cells.province[pack.burgs[owner.capital]?.cell] === id);
  const others = pack.states.filter(s => s.i && !s.removed && s.i !== p.state);
  const neighbours = [
    ...new Set(f.own.flatMap(c => pack.cells.c[c].map(n => pack.cells.province[n])).filter(n => n && n !== id))
  ].filter(n => pack.provinces[n]?.state === p.state && !pack.provinces[n].removed);
  const row = (k: string, v: string) => `<div class="flPlaceRow flStat"><span>${k}</span><b>${v}</b></div>`;
  el.innerHTML = /* html */ `
    <div class="flProvHead">
      <svg class="flProvFlag" viewBox="0 0 200 200"><use href="#provinceCOA${id}"></use></svg>
      <div>
        <input class="flPlaceName" value="${escapeHtml(p.name)}" spellcheck="false" />
        <select class="flProvForm">${forms()
          .map(form => `<option ${form === p.formName ? "selected" : ""}>${escapeHtml(form)}</option>`)
          .join("")}</select>
      </div>
    </div>
    ${row("Nation", owner ? `<a class="flLink" data-nation="${owner.i}">${escapeHtml(owner.name)}</a>` : "None")}
    ${row("Seat", seat?.i ? `<a class="flLink" data-burg="${seat.i}">${escapeHtml(seat.name ?? "")}</a>` : "None")}
    ${row(
      "Governor",
      governor
        ? escapeHtml(governor)
        : `Vacant <button type="button" data-act="appoint">Appoint §${APPOINT_PRICE}</button>`
    )}
    ${holder ? row("Held by", escapeHtml(pack.states[holder].name)) : ""}
    <div class="flProvActs">
      <button type="button" data-act="rebel" ${isCapitalProvince ? "disabled" : ""}>Rebel</button>
      <button type="button" data-act="release" ${isCapitalProvince ? "disabled" : ""}>Release</button>
      <select data-act="gift" ${isCapitalProvince ? "disabled" : ""}><option value="">Gift to…</option>${others
        .map(s => `<option value="${s.i}">${escapeHtml(s.name)}</option>`)
        .join("")}</select>
      <select data-act="merge" ${neighbours.length ? "" : "disabled"}><option value="">Merge into…</option>${neighbours
        .map(n => `<option value="${n}">${escapeHtml(pack.provinces[n].name)}</option>`)
        .join("")}</select>
    </div>
    ${row("Cells", String(f.own.length))}
    ${row("Area", `${si(getArea(f.area))} ${getAreaUnit()}`)}
    ${row("People", si(f.people))}
    ${row("Troops", si(f.troops))}
    <div class="flProvBurgs">${f.burgs
      .map(b => `<a class="flLink" data-burg="${b.i}">${escapeHtml(b.name ?? "")}</a>`)
      .join(" · ")}</div>
    ${notesHtml({ type: "province", id })}`;

  const redraw = () => {
    Layers.draw("states", "borders", "provinces", "burgIcons", "labels", "emblems");
    window.dispatchEvent(new Event("fl:occupation"));
  };
  const name = el.querySelector<HTMLInputElement>(".flPlaceName")!;
  name.addEventListener("change", () => {
    if (!name.value.trim()) return;
    Provinces.rename(id, name.value.trim());
    redraw();
  });
  el.querySelector<HTMLSelectElement>(".flProvForm")!.addEventListener("change", function () {
    Provinces.setForm(id, this.value);
    redraw();
  });
  for (const a of el.querySelectorAll<HTMLElement>("[data-nation]"))
    a.addEventListener("click", () => import("./nation-panel").then(m => m.openNation(Number(a.dataset.nation))));
  for (const a of el.querySelectorAll<HTMLElement>("[data-burg]"))
    a.addEventListener("click", () => Controllers.RegimentEditor.settlement(Number(a.dataset.burg)));
  el.querySelector('[data-act="appoint"]')?.addEventListener("click", () => {
    const why = appoint(id);
    if (why) tip(why, false, "error");
    render(el, id);
  });
  const act = (title: string, message: string, run: () => void) =>
    confirmationDialog({
      title,
      message,
      confirm: title,
      onConfirm: () => {
        try {
          run();
          redraw();
          if (el.isConnected) render(el, id);
        } catch (error) {
          tip(error instanceof Error ? error.message : String(error), false, "error");
        }
      }
    });
  const old = p.state;
  el.querySelector('[data-act="rebel"]')?.addEventListener("click", () =>
    act(
      "Rebel",
      `${p.name} rises against ${owner?.name ?? "its nation"} as a nation of its own, at war with it.`,
      () => {
        const made = Provinces.declareIndependence(id);
        if (old) States.setRelation(made, old, "Enemy");
      }
    )
  );
  el.querySelector('[data-act="release"]')?.addEventListener("click", () =>
    act("Release", `${p.name} goes free as a nation of its own, a vassal of ${owner?.name ?? "its nation"}.`, () => {
      const made = Provinces.declareIndependence(id);
      if (old) States.setRelation(made, old, "Vassal");
    })
  );
  el.querySelector<HTMLSelectElement>('[data-act="gift"]')?.addEventListener("change", function () {
    const to = Number(this.value);
    if (!to) return;
    act("Gift", `${p.name} with all its settlements goes to ${pack.states[to].name}.`, () =>
      Provinces.setState(id, to)
    );
  });
  el.querySelector<HTMLSelectElement>('[data-act="merge"]')?.addEventListener("change", function () {
    const into = Number(this.value);
    if (!into) return;
    act("Merge", `${p.name} joins ${pack.provinces[into].name}.`, () => {
      Provinces.merge(into, [id]);
      openProvince(into);
    });
  });
  wireNotes(el, `${p.name}`, { type: "province", id });
}

const STYLE = `
.flProvHead { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.flProvHead > div { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.flProvHead input, .flProvHead select { font: inherit; width: 100%; box-sizing: border-box; }
.flProvFlag { width: 52px; height: 52px; flex: none; }
.flProvActs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 6px 0; }
.flProvActs button, .flProvActs select { font: inherit; }
.flProvBurgs { margin: 4px 0; line-height: 1.3; }
.flLink { cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
`;
{
  const s = document.createElement("style");
  s.textContent = STYLE;
  document.head.append(s);
}
