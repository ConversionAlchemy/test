// One small dialog for named places (bays, forests, mountains, roads): name and kind to edit, a few stats, and the
// notes open beneath. Notes past three lines clamp with "… Show more", which opens them in a dialog of their own
import { polygonLength } from "d3";
import { Layers } from "@/components/layers";
import { FEATURE_SUBTYPE_LABELS } from "@/data/id-labels";
import { LAKE_SUBTYPES } from "@/generators/features-generator";
import { Notes } from "@/generators/notes";
import { escapeHtml } from "@/utils/stringUtils";
import { getArea, getAreaUnit, getHeight, si } from "@/utils/unitUtils";
import { ROUTE_LEVELS, type RouteGroup, renameRoute, setRouteGroup } from "./routes";

export type PlaceKind = "bay" | "inlet" | "forest" | "mountain" | "route";

interface Place {
  title: string;
  name: string;
  setName: (name: string) => void;
  kinds: [value: string, label: string][];
  kind: string;
  setKind: (kind: string) => void;
  stats: [string, string][];
  ref: NoteRef;
}

export type NoteRef = { type: "feature" | "zone" | "route" | "province"; id: number };

const FOREST_NOUNS = ["Forest", "Wood", "Copse", "Grove"];
const PEAK_NOUNS = ["Mount", "Peak", "Range", "Hills"];
const BAY_NOUNS = ["Bay", "Inlet", "Cove", "Sound", "Firth"];

/** A zone's name split into its own part and its noun ("Mount X" puts the noun first) */
function splitName(name: string, nouns: string[]): [base: string, noun: string] {
  for (const noun of nouns) {
    if (name.startsWith(`${noun} `)) return [name.slice(noun.length + 1), noun];
    if (name.endsWith(` ${noun}`)) return [name.slice(0, -noun.length - 1), noun];
  }
  return [name, ""];
}
const joinName = (base: string, noun: string) => (noun === "Mount" ? `Mount ${base}` : noun ? `${base} ${noun}` : base);

const cellsArea = (cells: number[]) => cells.reduce((sum, c) => sum + (pack.cells.area[c] ?? 0), 0);
const area = (raw: number) => `${si(getArea(raw))} ${getAreaUnit()}`;
const distance = (raw: number) => `${si(raw * options.map.units.distance.scale)} ${options.map.units.distance.unit}`;

function placeOf(kind: PlaceKind, id: number, redraw: () => void): Place | null {
  if (kind === "bay") {
    const f = pack.features[id];
    if (!f || f.type !== "lake") return null;
    const cells = [...pack.cells.i].filter(i => pack.cells.f[i] === id);
    const shore = polygonLength((f.vertices ?? []).map(v => pack.vertices.p[v] as [number, number]));
    return {
      title: "Bay",
      name: f.name,
      setName: name => {
        f.name = name.replace(/ Bay$/, "");
        redraw();
      },
      kinds: LAKE_SUBTYPES.map(s => [s, FEATURE_SUBTYPE_LABELS[s]?.replace(/ lake$/, "") ?? s]),
      kind: f.subtype || "freshwater",
      setKind: subtype => Features.setSubtype(id, subtype),
      stats: [
        ["Area", area(f.area ?? 0)],
        ["Shore", distance(shore)],
        ["Elevation", getHeight(f.height ?? 20)],
        ["Cells", String(cells.length)]
      ],
      ref: { type: "feature", id }
    };
  }
  if (kind === "route") {
    const r = pack.routes.find(route => route.i === id);
    if (!r) return null;
    return {
      title: "Road",
      name: r.name ?? "",
      setName: name => {
        renameRoute(id, name);
        Layers.draw("labels");
      },
      kinds: ROUTE_LEVELS.map(l => [l.group, l.name]),
      kind: r.group,
      setKind: group => setRouteGroup(id, group as RouteGroup),
      stats: [["Length", distance(Routes.getLength(id))]],
      ref: { type: "route", id }
    };
  }
  const z = pack.zones[id];
  if (!z) return null;
  const nouns = kind === "forest" ? FOREST_NOUNS : kind === "inlet" ? BAY_NOUNS : PEAK_NOUNS;
  const heights = z.cells.map(c => pack.cells.h[c]);
  return {
    title: kind === "forest" ? "Forest" : kind === "inlet" ? "Bay" : "Mountain",
    name: splitName(z.name, nouns)[0],
    setName: name => {
      z.name = joinName(name, splitName(z.name, nouns)[1]);
      redraw();
    },
    kinds: nouns.map(n => [n, n]),
    kind: splitName(z.name, nouns)[1],
    setKind: noun => {
      z.name = joinName(splitName(z.name, nouns)[0], noun);
      redraw();
    },
    stats: [
      ["Area", area(cellsArea(z.cells))],
      ["Cells", String(z.cells.length)],
      ...(kind === "mountain" ? [["Height", getHeight(Math.max(...heights))] as [string, string]] : [])
    ],
    ref: { type: "zone", id }
  };
}

let open: HTMLElement | null = null;

/** The dialog for a place; `redraw` refreshes its name on the map */
export function openPlace(kind: PlaceKind, id: number, redraw: () => void = () => {}): void {
  const place = placeOf(kind, id, redraw);
  if (!place) return;
  if (open) $(open).dialog("destroy").remove();
  const el = document.createElement("div");
  el.className = "dialog flPlace";
  open = el;
  el.innerHTML = /* html */ `
    <label class="flPlaceRow"><span>Name</span><input class="flPlaceName" value="${escapeHtml(place.name)}" spellcheck="false" /></label>
    <label class="flPlaceRow"><span>Type</span><select class="flPlaceKind">${place.kinds
      .map(([v, l]) => `<option value="${v}" ${v === place.kind ? "selected" : ""}>${escapeHtml(l)}</option>`)
      .join("")}</select></label>
    ${place.stats.map(([k, v]) => `<div class="flPlaceRow flStat"><span>${k}</span><b>${escapeHtml(v)}</b></div>`).join("")}
    ${notesHtml(place.ref)}`;
  document.body.append(el);
  $(el).dialog({
    title: place.title,
    width: "20em",
    resizable: false,
    position: { my: "left top", at: "left+10 top+10", of: "#map" },
    close: () => {
      $(el).dialog("destroy").remove();
      if (open === el) open = null;
    }
  });
  const name = el.querySelector<HTMLInputElement>(".flPlaceName")!;
  name.addEventListener("change", () => name.value.trim() && place.setName(name.value.trim()));
  el.querySelector<HTMLSelectElement>(".flPlaceKind")!.addEventListener("change", function () {
    place.setKind(this.value);
  });
  wireNotes(el, place.title, place.ref);
}

/** The notes box, open to type in, with "… Show more" past three lines and the note icon */
export const notesHtml = (ref: NoteRef) => /* html */ `
  <div class="flNoteBox" contenteditable="true" data-placeholder="Notes">${Notes.get(ref) ?? ""}</div>
  <button type="button" class="flMore" hidden>… Show more</button>
  <div class="flPlaceBottom"><button type="button" class="flNoteIcon icon-book" title="Notes"></button></div>`;

export function wireNotes(el: HTMLElement, title: string, ref: NoteRef): void {
  const box = el.querySelector<HTMLElement>(".flNoteBox")!;
  const more = el.querySelector<HTMLButtonElement>(".flMore")!;
  const overflowing = () => (more.hidden = document.activeElement === box || box.scrollHeight <= box.clientHeight + 1);
  box.addEventListener("input", () => Notes.set(ref, box.innerHTML.trim()));
  box.addEventListener("focus", overflowing);
  box.addEventListener("blur", overflowing);
  overflowing();
  const popup = () =>
    openNotes(title, ref, html => {
      box.innerHTML = html;
      overflowing();
    });
  more.addEventListener("click", popup);
  el.querySelector(".flNoteIcon")!.addEventListener("click", popup);
}

/** The notes on their own, in a big box */
function openNotes(title: string, ref: NoteRef, changed: (html: string) => void): void {
  const el = document.createElement("div");
  el.className = "dialog flNotesPopup";
  el.innerHTML = `<div class="flNoteFull" contenteditable="true">${Notes.get(ref) ?? ""}</div>`;
  document.body.append(el);
  const full = el.querySelector<HTMLElement>(".flNoteFull")!;
  full.addEventListener("input", () => {
    Notes.set(ref, full.innerHTML.trim());
    changed(full.innerHTML);
  });
  $(el).dialog({
    title: `${title} notes`,
    width: "28em",
    close: () => $(el).dialog("destroy").remove()
  });
  full.focus();
}

const STYLE = `
.flPlace { font: 18px "VT323", monospace; }
.flPlaceRow { display: flex; justify-content: space-between; align-items: center; gap: 0.6em; margin: 3px 0; }
.flPlaceRow > span { opacity: 0.8; }
.flPlaceRow input, .flPlaceRow select { width: 11em; font: inherit; }
.flStat b { font-weight: normal; width: 11em; padding: 0 4px; }
.flNoteBox { box-sizing: border-box; width: 100%; min-width: 100%; margin-top: 6px; min-height: 3.6em; max-height: 3.6em; line-height: 1.2em; overflow: hidden; padding: 3px 5px;
  border: 1px solid #555; background: #1b1b1b; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  white-space: pre-wrap; outline: none; }
.flNoteBox:focus { display: block; max-height: 8em; overflow: auto; }
.flNoteBox:empty::before { content: attr(data-placeholder); opacity: 0.45; }
.flMore { font: inherit; background: none; border: 0; color: #c8c2b2; cursor: pointer; padding: 0; margin-top: 2px; }
.flPlaceBottom { margin-top: 6px; }
.flNoteFull { box-sizing: border-box; width: 100%; min-height: 14em; max-height: 60vh; overflow: auto; padding: 6px; border: 1px solid #555; background: #1b1b1b;
  font: 18px "VT323", monospace; white-space: pre-wrap; outline: none; }
`;
{
  const s = document.createElement("style");
  s.textContent = STYLE;
  document.head.append(s);
}
