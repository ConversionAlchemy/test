// What the right-click bar offers for the thing under the pointer: a few pixel buttons, nothing else.
// Every action goes through Azgaar's own modules, so editors and saves see the same change

import { Icons } from "@/components/icons";
import { Layers } from "@/components/layers";
import type { EntityRef } from "@/components/map-entities";
import { viewport } from "@/components/viewport";
import { Controllers } from "@/controllers";
import type { Marker } from "@/generators/markers-generator";
import { drawMilitary } from "@/renderers/draw-military";
import { t } from "@/utils/i18n";
import { openNation } from "./nation-panel";
import { cellCentre, mainCell } from "./one-grid";
import { stackAll } from "./units";

export interface MenuAction {
  label: string;
  icon?: string; // its pixel button; the bar shows only these
  run?: () => void;
  rename?: { value: string; apply: (name: string) => void };
  disabled?: boolean;
  indent?: boolean;
  danger?: boolean;
  ladder?: string;
}

const living = <T extends { removed?: boolean }>(item: T | undefined) => (item && !item.removed ? item : undefined);

const nation = (state: number | undefined): MenuAction[] =>
  state && living(pack.states[state]) ? [{ label: t("Nation"), icon: "nation", run: () => openNation(state) }] : [];

function addArmy(cell: number): MenuAction[] {
  const state = pack.cells.state[cell];
  if (!state) return [];
  return [
    {
      label: pack.cells.h[cell] < 20 ? t("Add fleet") : t("Add army"),
      icon: "army",
      run: () => {
        const [x, y] = cellCentre(cell);
        const id = Military.add(state, x, y);
        drawMilitary();
        stackAll();
        Controllers.RegimentEditor.open(`#regiment${state}-${id}`);
      }
    }
  ];
}

const tools = (cell: number, point?: [number, number]): MenuAction[] => [
  {
    label: t("Add marker"),
    icon: "marker",
    run: () => {
      const [x, y] = cellCentre(cell);
      Markers.add({ icon: Icons.glyph("❓"), type: "custom", x, y, cell } as Marker);
      Layers.show("markers");
      Layers.draw("markers");
    }
  },
  {
    label: t("Measure"),
    icon: "measure",
    run: () => {
      const [x, y] = point ?? cellCentre(cell);
      const length = viewport.width / 6 / (viewport.scale || 1);
      Measurers.create("Ruler", [
        [Math.round(x), Math.round(y)],
        [Math.round(x + length), Math.round(y)]
      ]);
      Layers.show("rulers");
      Layers.draw("rulers");
    }
  }
];

/** Actions for the thing right-clicked; `cell` is where, `point` the spot in map units */
export function actionsFor(
  ref: EntityRef | undefined,
  cell: number,
  _confirm?: (run: () => void) => void,
  point?: [number, number],
  _client?: [number, number]
): MenuAction[] {
  const at = mainCell(cell);
  if (ref?.type === "regiment" && ref.sub !== undefined) {
    const regiment = pack.states[ref.id]?.military?.find(r => r.i === ref.sub);
    if (regiment)
      return [
        {
          label: t("Open"),
          icon: "open",
          run: () => Controllers.RegimentEditor.open(`#regiment${regiment.state}-${regiment.i}`)
        },
        ...nation(regiment.state),
        ...tools(at, point)
      ];
  }
  if (ref?.type === "route")
    return [
      { label: t("Edit route"), icon: "route", run: () => Controllers.RouteEditor.open(`route${ref.id}`) },
      ...tools(at, point)
    ];
  const burgId = ref?.type === "burg" ? ref.id : pack.cells.burg[at];
  const burg = living(pack.burgs[burgId]);
  if (burg?.i)
    return [
      { label: t("Open"), icon: "open", run: () => Controllers.RegimentEditor.settlement(burg.i) },
      ...(burg.state
        ? [{ label: t("Recruit"), icon: "recruit", run: () => Controllers.RegimentEditor.recruit(burg.i) }]
        : []),
      ...nation(burg.state),
      ...addArmy(burg.cell),
      ...tools(burg.cell, point)
    ];
  return [...nation(pack.cells.state[at]), ...addArmy(at), ...tools(at, point)];
}
