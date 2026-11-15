// Road and province names: hovering one lights its road or its province; a click renames it on the spot, a
// double-click opens its dialog
import { Layers } from "@/components/layers";
import { highlightPlace, showRoadEdit } from "./pixel-map-sync";
import { openPlace } from "./place-dialog";
import { openProvince } from "./province-dialog";
import { roadLineOf } from "./road-geometry";
import { renameRoute } from "./routes";
import { clickOrDouble, inlineEdit } from "./zone-labels";

const routeOf = (label: Element) => pack.routes.find(r => r.i === Number((label as SVGElement).dataset.id));

export function routeLabelClick(label: SVGTextElement): void {
  const event = window.event as MouseEvent | undefined;
  const route = routeOf(label);
  if (!route || !event) return;
  clickOrDouble(
    event,
    () =>
      inlineEdit(label, route.name ?? "", name => {
        renameRoute(route.i, name);
        Layers.draw("labels");
      }),
    () => openPlace("route", route.i)
  );
}

let lit = -1;
document.addEventListener("pointerover", event => {
  const label = (event.target as Element | null)?.closest?.("#labels text[data-label-type='route']");
  const route = label ? routeOf(label) : undefined;
  const id = route?.i ?? -1;
  if (id === lit) return;
  lit = id;
  showRoadEdit({ hover: (route && roadLineOf(route)) || [] });
});

export function provinceLabelClick(label: SVGTextElement): void {
  const event = window.event as MouseEvent | undefined;
  const id = Number(label.dataset.id);
  const province = pack.provinces[id];
  if (!province?.i || province.removed || !event) return;
  clickOrDouble(
    event,
    () =>
      inlineEdit(label, province.name, name => {
        Provinces.rename(id, name);
        Layers.draw("labels");
      }),
    () => openProvince(id)
  );
}

let litProvince = 0;
document.addEventListener("pointerover", event => {
  const label = (event.target as Element | null)?.closest?.("#labels text[data-label-type='province']");
  const id = label ? Number((label as SVGElement).dataset.id) : 0;
  if (id === litProvince) return;
  litProvince = id;
  const p = pack.provinces[id];
  highlightPlace(id && p ? { province: id, state: p.state, capital: false } : null);
});
