import { type D3DragEvent, drag, select } from "d3";
import {
  closeDialogs,
  confirmationDialog,
  destroyDialog,
  noteButton,
  refreshEditors
} from "@/components/dialog/dialog-helpers";
import { Layers } from "@/components/layers";
import { stopMapPlacement } from "@/components/map-placement";
import { clearMainTip } from "@/components/tooltips";
import { Controllers } from "@/controllers";
import { tokenUrl } from "@/fluoria/forces/pixels";
import type { Marker } from "@/generators/markers-generator";
import { Notes } from "@/generators/notes";
import { drawMarkers, markerColour, markerLetter, setEditedMarker } from "@/renderers/draw-markers";
import { sentences, t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/stringUtils";
import { ensureEl, findEl, minmax, rn } from "../utils";

let selectedElement: SVGSVGElement;
let selectedMarker: Marker;

function open(markerI?: number, target?: Element): void {
  if (customization) return;
  closeDialogs(".stable");

  const found = getElement(markerI, target);
  if (!found) return;
  [selectedElement, selectedMarker] = found;

  select<SVGElement, unknown>(selectedElement)
    .raise()
    .call(drag<SVGElement, unknown>().on("start", dragMarker))
    .classed("draggable", true);

  if (findEl("notesEditor")) {
    void Controllers.NotesEditor.open({ type: "marker", id: selectedMarker.i });
  }

  renderDialog();
  ensureEl("markerEditor").dataset.entity = `marker:${selectedMarker.i}`;
  updateInputs();

  $("#markerEditor").dialog({
    title: t("Edit Marker"),
    resizable: false,
    position: { my: "left top", at: "left+10 top+10", of: "svg", collision: "fit" },
    close: closeMarkerEditor
  });
}

function renderDialog(): void {
  destroyDialog("markerEditor");
  const states = pack.states.filter(state => state.i && !state.removed);
  const html = /* html */ `<div id="markerEditor" class="dialog">
    <div id="markerBody" style="padding-bottom: 0.3em">
      <div class="flMarkerHead">
        <img id="markerToken" alt="" />
        <input id="markerName" data-tip="${t("Type to rename; a name of your own shows under the token")}" />
      </div>
      <div data-tip="${t("Shape: a person, an event or story point, a place or thing")}">
        <div class="label">${t("Shape")}:</div>
        <select id="markerShape">
          <option value="circle">${t("Circle: a person")}</option>
          <option value="diamond">${t("Diamond: an event")}</option>
          <option value="square">${t("Square: a place or thing")}</option>
        </select>
      </div>
      <div data-tip="${t("One letter or digit shown on the token")}">
        <div class="label">${t("Letter")}:</div>
        <input id="markerLetter" maxlength="1" style="width: 3em; text-transform: uppercase" />
      </div>
      <div data-tip="${t("Allegiance: the nation this marker serves sets its colour")}">
        <div class="label">${t("Allegiance")}:</div>
        <select id="markerState">
          <option value="0">${t("None")}</option>
          ${states.map(state => `<option value="${state.i}">${escapeHtml(state.name)}</option>`).join("")}
        </select>
      </div>
      <nav class="flMarkerTabs">
        <button type="button" data-tab="notes" class="on">${t("Notes")}</button>
        <button type="button" data-tab="inventory">${t("Inventory")}</button>
      </nav>
      <div id="markerNotesTab" class="flMarkerNote" contenteditable="true"></div>
      <div id="markerInventoryTab" style="display: none">
        <div data-tip="${t("Coins this marker holds")}">
          <div class="label">${t("Treasury")}:</div>
          <input id="markerTreasury" type="number" step="1" style="width: 7em" />
        </div>
        <div id="markerItems"></div>
        <button type="button" id="markerItemAdd">+ ${t("Add item")}</button>
      </div>
    </div>
    <div id="markerBottom">
      ${noteButton("markerNotes", t("Open in the notes editor"))}
      <button id="markerRadius" data-tip="${t("Show markers within a radius of this one")}" class="icon-dot-circled"></button>
      <button id="markerLock" class="icon-lock-open" onmouseover="showElementLockTip(event)"></button>
      <button id="markerAdd" data-tip="${t("Add additional marker of that type")}" class="icon-plus"></button>
      <button id="markerRemove" data-tip="${t("Remove")}" data-shortcut="Delete" class="icon-trash fastDelete"></button>
    </div>
  </div>`;
  ensureEl("dialogs").insertAdjacentHTML("beforeend", html);

  ensureEl("markerName").addEventListener("change", changeMarkerName);
  ensureEl("markerShape").addEventListener("change", function (this: HTMLSelectElement) {
    selectedMarker.shape = this.value as Marker["shape"];
    redraw();
  });
  ensureEl("markerLetter").addEventListener("input", function (this: HTMLInputElement) {
    const letter = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    this.value = letter;
    if (letter) selectedMarker.letter = letter;
    redraw();
  });
  ensureEl("markerState").addEventListener("change", function (this: HTMLSelectElement) {
    selectedMarker.state = Number(this.value) || undefined;
    redraw();
  });
  ensureEl("markerNotesTab").addEventListener("input", function (this: HTMLElement) {
    Notes.write(`marker:${selectedMarker.i}`, this.innerHTML);
  });
  ensureEl("markerTreasury").addEventListener("change", function (this: HTMLInputElement) {
    selectedMarker.treasury = Math.round(Number(this.value) || 0);
  });
  ensureEl("markerItemAdd").addEventListener("click", () => {
    selectedMarker.items = [...(selectedMarker.items ?? []), { name: "", value: "" }];
    renderItems();
  });
  for (const tab of document.querySelectorAll<HTMLElement>("#markerEditor [data-tab]"))
    tab.addEventListener("click", () => {
      for (const other of document.querySelectorAll("#markerEditor [data-tab]"))
        other.classList.toggle("on", other === tab);
      ensureEl("markerNotesTab").style.display = tab.dataset.tab === "notes" ? "" : "none";
      ensureEl("markerInventoryTab").style.display = tab.dataset.tab === "inventory" ? "" : "none";
    });
  ensureEl("markerNotes").addEventListener("click", editMarkerLegend);
  ensureEl("markerRadius").addEventListener("click", openMarkersInRadius);
  ensureEl("markerLock").addEventListener("click", toggleMarkerLock);
  ensureEl("markerAdd").addEventListener("click", toggleAddMarker);
  ensureEl("markerRemove").addEventListener("click", confirmMarkerDeletion);
}

function renderItems(): void {
  const box = ensureEl("markerItems");
  const items = selectedMarker.items ?? [];
  box.innerHTML = items
    .map(
      (item, k) => `<div class="flMarkerItem" data-k="${k}">
        <input data-field="name" placeholder="${t("Item")}" value="${escapeHtml(item.name)}" />
        <input data-field="value" placeholder="${t("Value")}" value="${escapeHtml(item.value)}" />
        <button type="button" class="icon-trash" data-remove="${k}"></button></div>`
    )
    .join("");
  for (const input of box.querySelectorAll<HTMLInputElement>("input"))
    input.addEventListener("change", () => {
      const k = Number(input.closest<HTMLElement>("[data-k]")!.dataset.k);
      items[k][input.dataset.field as "name" | "value"] = input.value;
    });
  for (const button of box.querySelectorAll<HTMLElement>("[data-remove]"))
    button.addEventListener("click", () => {
      items.splice(Number(button.dataset.remove), 1);
      renderItems();
    });
}

function redraw(): void {
  ensureEl<HTMLImageElement>("markerToken").src = tokenUrl(
    selectedMarker.shape ?? "circle",
    markerColour(selectedMarker),
    markerLetter(selectedMarker)
  );
  drawMarkers();
}

function getElement(markerI?: number, target?: Element): [SVGSVGElement, Marker] | null {
  const id = target ? Number(target.closest("svg")?.id.slice(6)) : markerI;
  const marker = pack.markers.find(({ i }) => i === id);
  if (!marker) return null;
  setEditedMarker(marker);
  const element = findEl<SVGSVGElement>(`marker${id}`);
  if (!element) setEditedMarker(null);
  return element ? [element, marker] : null;
}

function dragMarker(this: SVGElement, event: D3DragEvent<SVGElement, unknown, unknown>): void {
  const dx = +this.getAttribute("x")! - event.x;
  const dy = +this.getAttribute("y")! - event.y;

  event.on("drag", function (this: SVGElement, dragEvent: D3DragEvent<SVGElement, unknown, unknown>) {
    this.setAttribute("x", String(dx + dragEvent.x));
    this.setAttribute("y", String(dy + dragEvent.y));
  });

  event.on("end", function (this: SVGElement, dragEvent: D3DragEvent<SVGElement, unknown, unknown>) {
    const { width, height } = options.map.graph;
    const x = minmax(dragEvent.x + dx, 0, width); // the box sits at the marker point
    const y = minmax(dragEvent.y + dy, 0, height);
    this.setAttribute("x", String(rn(x, 2)));
    this.setAttribute("y", String(rn(y, 2)));

    Markers.move(selectedMarker.i, x, y);
    Layers.draw("markers"); // it snaps to its cell's centre
  });
}

function updateInputs(): void {
  const marker = selectedMarker;
  ensureEl<HTMLInputElement>("markerName").value = marker.name || "";
  ensureEl<HTMLSelectElement>("markerShape").value = marker.shape ?? "circle";
  ensureEl<HTMLInputElement>("markerLetter").value = markerLetter(marker);
  ensureEl<HTMLSelectElement>("markerState").value = String(marker.state ?? 0);
  ensureEl("markerNotesTab").innerHTML = Notes.get({ type: "marker", id: marker.i }) ?? "";
  ensureEl<HTMLInputElement>("markerTreasury").value = String(marker.treasury ?? 0);
  ensureEl("markerLock").className = marker.lock ? "icon-lock" : "icon-lock-open";
  renderItems();
  redraw();
}

function changeMarkerName(this: HTMLInputElement): void {
  if (this.value.trim()) {
    Markers.rename(selectedMarker.i, this.value);
    selectedMarker.named = true;
  } else selectedMarker.named = false;
  drawMarkers();
  if (findEl("notesEditor")) void Controllers.NotesEditor.open({ type: "marker", id: selectedMarker.i });
}

function editMarkerLegend(): void {
  void Controllers.NotesEditor.open({ type: "marker", id: selectedMarker.i });
}

function openMarkersInRadius(): void {
  void Controllers.MarkersInRadius.open(selectedMarker);
}

function toggleMarkerLock(): void {
  Markers.setLocked(selectedMarker.i, !selectedMarker.lock);
  const markerLock = ensureEl("markerLock");
  markerLock.classList.toggle("icon-lock-open");
  markerLock.classList.toggle("icon-lock");
}

function toggleAddMarker(): void {
  void Controllers.MarkerCreator.toggle(selectedMarker);
}

function confirmMarkerDeletion(): void {
  confirmationDialog({
    title: t("Remove"),
    message: sentences(t("Are you sure you want to remove this marker?"), t("This action cannot be reverted")),
    confirm: t("Remove"),
    onConfirm: deleteMarker
  });
}

function deleteMarker(): void {
  Markers.remove(selectedMarker.i);
  drawMarkers();
  $("#markerEditor").dialog("close");
  refreshEditors();
}

function closeMarkerEditor(): void {
  select(selectedElement).on(".drag", null).classed("draggable", false);
  setEditedMarker(null);
  if (ensureEl("addMarker").classList.contains("pressed")) stopMapPlacement();
  clearMainTip();
  destroyDialog("markerEditor");
  selectedElement = null!;
  selectedMarker = null!;
}

export const MarkersEditor = { open };
