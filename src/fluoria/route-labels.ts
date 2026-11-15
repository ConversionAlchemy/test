// Road names: written along the road on a faded band. Hovering one lights its road; a click renames it on the spot,
// a double-click opens its dialog
import { Layers } from "@/components/layers";
import { showRoadEdit } from "./pixel-map-sync";
import { openPlace } from "./place-dialog";
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
