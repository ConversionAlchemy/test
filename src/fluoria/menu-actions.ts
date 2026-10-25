// What the right-click menu offers for each kind of thing, Windows-style: short verbs, nothing else.
// Every action goes through Azgaar's own modules, so editors and saves see the same change

import { confirmationDialog } from "@/components/dialog/dialog-helpers";
import { Layers } from "@/components/layers";
import { type EntityRef, MapEntities } from "@/components/map-entities";
import { tip } from "@/components/tooltips";
import { Controllers } from "@/controllers";
import type { Regiment } from "@/generators/military-generator";
import { drawMilitary } from "@/renderers/draw-military";
import { t } from "@/utils/i18n";
import { landingCells, load, transportsFor } from "./boarding";
import { openCellCard } from "./cell-card";
import { disband, merge } from "./forces/army";
import { cargoSlots, isTransport, mergeRefusal, slotsOf } from "./forces/forces";
import { openNation } from "./nation-panel";
import { cellCentre, mainCell } from "./one-grid";
import { showRoadEdit } from "./pixel-map-sync";
import { nodePoint, segmentAt } from "./road-geometry";
import { changeSegment, deleteRoute, findRoute, ROUTE_LEVELS, renameRoute, setRouteGroup } from "./routes";
import { chooseLanding, stackAll } from "./units";
import { annexCell, occupierOf, returnCell } from "./war";

export interface MenuAction {
  label: string;
  run?: () => void;
  rename?: { value: string; apply: (name: string) => void };
  disabled?: boolean;
  indent?: boolean; // one of a list under the row above
  danger?: boolean;
  ladder?: string; // leads to this kind of thing's own panel: its row in the list below is left out
}

const regimentAt = (state: number, id: number) =>
  pack.states[state]?.removed ? undefined : pack.states[state]?.military?.find(r => r.i === id);

const redraw = () => {
  drawMilitary();
  stackAll();
};

/** Load, and let go of the army if it was the one selected: it has left the map */
const embark = (army: Regiment, transport: Regiment) => {
  const why = load(army, transport);
  if (why) tip(why, false, "error");
  redraw();
};

const openRegiment = (r: Regiment) => () => Controllers.RegimentEditor.open(`#regiment${r.state}-${r.i}`);

/** Actions for the thing right-clicked; `cell` is where, for the empty-ground menu; `client` is the pointer on screen */
export function actionsFor(
  ref: EntityRef | undefined,
  cell: number,
  confirm: (run: () => void) => void,
  point?: [number, number],
  client?: [number, number]
): MenuAction[] {
  if (ref?.type === "regiment" && ref.sub !== undefined) {
    const regiment = regimentAt(ref.id, ref.sub);
    if (regiment)
      return [
        ...(isTransport(regiment) ? transportActions(regiment, confirm) : armyActions(regiment, confirm)),
        ...warActions(mainCell(regiment.cell))
      ];
  }
  if (ref?.type === "route") return routeActions(ref.id, confirm, point);
  if (ref?.type === "burg") return burgActions(ref.id);
  return [...ladder(cell, client), ...cellActions(cell)];
}

/** On bare ground: up the ladder from the cell to its settlement, province and nation, each opening its own panel */
function ladder(cell: number, client?: [number, number]): MenuAction[] {
  const at = mainCell(cell);
  const { cells } = pack;
  const out: MenuAction[] = [];
  const state = cells.state[at];
  if (state && pack.states[state] && !pack.states[state].removed)
    out.push({ label: `${pack.states[state].name} · ${t("nation")} ›`, ladder: "state", run: () => openNation(state) });
  const province = cells.province?.[at];
  const p = province ? pack.provinces[province] : null;
  if (p && "name" in p && !p.removed)
    out.push({
      label: `${p.name} · ${t("province")} ›`,
      ladder: "province",
      run: () => void MapEntities.open({ type: "province", id: province as number })
    });
  const burg = cells.burg[at];
  if (burg && pack.burgs[burg] && !pack.burgs[burg].removed)
    out.push({
      label: `${pack.burgs[burg].name} · ${t("settlement")} ›`,
      run: () => Controllers.BurgEditor.open(burg)
    });
  out.push({
    label: t("Cell details"),
    run: () => openCellCard(at, client?.[0] ?? window.innerWidth / 2, client?.[1] ?? window.innerHeight / 2)
  });
  return out;
}

function common(regiment: Regiment): MenuAction[] {
  const actions: MenuAction[] = [
    {
      label: t("Rename"),
      rename: {
        value: regiment.name,
        apply: (name: string) => {
          Military.rename(regiment.state, regiment.i, name);
          redraw();
        }
      }
    },
    {
      label: t("Duplicate"),
      run: () => {
        const id = Military.add(regiment.state, regiment.x, regiment.y);
        Military.setUnits(regiment.state, id, { ...regiment.u });
        Military.setIcon(regiment.state, id, regiment.icon);
        Military.setNaval(regiment.state, id, Boolean(regiment.n));
        redraw();
      }
    }
  ];
  const others = (pack.states[regiment.state]?.military ?? []).filter(
    o => o !== regiment && !o.hidden && o.cell === regiment.cell && !mergeRefusal(regiment, o)
  );
  if (others.length) {
    actions.push({ label: t("Merge into"), disabled: true });
    for (const target of others)
      actions.push({
        label: target.name,
        indent: true,
        run: () => {
          merge(regiment, target);
          redraw();
        }
      });
  }
  if (!isTransport(regiment) && slotsOf(regiment.u) > 1)
    actions.push({
      label: t("Disband"),
      run: () => {
        disband(regiment);
        redraw();
      }
    });
  return actions;
}

function armyActions(army: Regiment, confirm: (run: () => void) => void): MenuAction[] {
  return [
    { label: t("Edit"), run: openRegiment(army) },
    ...common(army),
    ...transportsFor(army).map(transport => ({
      label: `${t("Load into")} ${transport.name}`,
      run: () => embark(army, transport)
    })),
    {
      label: t("Delete"),
      danger: true,
      run: () =>
        confirm(() => {
          Military.remove(army.state, army.i);
          redraw();
        })
    }
  ];
}

function transportActions(transport: Regiment, confirm: (run: () => void) => void): MenuAction[] {
  const shore = landingCells(transport).length > 0;
  const loaded = slotsOf(transport.cargo);
  const actions: MenuAction[] = [{ label: t("Edit"), run: openRegiment(transport) }, ...common(transport)];
  actions.push({ label: `${t("Cargo")} ${loaded} / ${cargoSlots(transport)}`, disabled: true });
  if (loaded)
    actions.push({
      label: shore ? t("Unload") : t("No coast in reach"),
      disabled: !shore,
      run: () => chooseLanding(transport, redraw)
    });
  actions.push({
    label: t("Delete"),
    danger: true,
    run: () =>
      confirm(() => {
        Military.remove(transport.state, transport.i); // its cargo is lost with it
        redraw();
      })
  });
  return actions;
}

function routeActions(id: number, confirm: (run: () => void) => void, point?: [number, number]): MenuAction[] {
  const route = findRoute(id);
  if (!route) return [];
  const scale = (document.getElementById("viewbox") as SVGGraphicsElement | null)?.getScreenCTM()?.a || 1;
  const segment = point ? segmentAt(point[0], point[1], 8 / scale) : null;
  const here = segment && segment.id === id ? segment : null;
  if (here) showRoadEdit({ segment: [nodePoint(here.a), nodePoint(here.b)] }); // which step the levels apply to
  return [
    { label: t("Edit"), run: () => Controllers.RouteEditor.open(`route${id}`) },
    { label: t("Rename"), rename: { value: route.name ?? "", apply: name => renameRoute(id, name) } },
    ...ROUTE_LEVELS.filter(level => !here || level.group !== route.group).map(level => ({
      label: here
        ? `${t("Make segment")} ${t(level.name).toLowerCase()}`
        : `${t("Make")} ${t(level.name).toLowerCase()}`,
      run: () => (here ? changeSegment(id, here.k, level.group) : setRouteGroup(id, level.group))
    })),
    ...(here ? [{ label: t("Delete segment"), danger: true, run: () => changeSegment(id, here.k, null) }] : []),
    { label: t("Delete road"), danger: true, run: () => confirm(() => deleteRoute(id)) }
  ];
}

function burgActions(id: number): MenuAction[] {
  const burg = pack.burgs[id];
  if (!burg || burg.removed) return [];
  const here = pack.states.flatMap(state =>
    state.i && !state.removed ? (state.military ?? []).filter(r => !r.hidden && r.cell === burg.cell) : []
  );
  return [
    { label: t("Edit"), run: () => Controllers.BurgEditor.open(id) },
    { label: t("Rename"), rename: { value: burg.name ?? "", apply: name => Burgs.rename(id, name) } },
    ...(here.length
      ? [
          { label: t("Units here"), disabled: true },
          ...here.map(r => ({ label: `${r.name} (${r.a})`, indent: true, run: openRegiment(r) }))
        ]
      : []),
    ...cellActions(burg.cell)
  ];
}

function cellActions(cell: number): MenuAction[] {
  const state = pack.cells.state[cell];
  const war = warActions(cell);
  if (!state) return war;
  const water = pack.cells.h[cell] < 20;
  return [
    ...war,

    {
      label: water ? t("Add fleet here") : t("Add army here"),
      run: () => {
        const [x, y] = cellCentre(cell);
        const id = Military.add(state, x, y);
        redraw();
        Controllers.RegimentEditor.open(`#regiment${state}-${id}`);
      }
    }
  ];
}

/** A cell held in war: who holds it, and annexing it or giving it back */
function warActions(cell: number): MenuAction[] {
  const state = pack.cells.state[cell];
  const occupier = occupierOf(cell);
  const war: MenuAction[] = [];
  if (occupier) {
    const by = pack.states[occupier].name;
    const burg = pack.cells.burg[mainCell(cell)];
    const annex = () => {
      annexCell(cell);
      Layers.draw("states", "borders", "provinces", "burgIcons", "labels", "emblems");
      window.dispatchEvent(new Event("fl:occupation"));
    };
    war.push(
      { label: `${t("Occupied by")} ${by}`, disabled: true },
      {
        label: `${t("Annex this cell for")} ${by}`,
        indent: true,
        run: () =>
          burg
            ? confirmationDialog({
                title: t("Annex"),
                message: t("{{burg}} goes to {{state}} with this cell. Annex it?", {
                  burg: pack.burgs[burg].name ?? "",
                  state: by
                }),
                confirm: t("Annex"),
                onConfirm: annex
              })
            : annex()
      },
      {
        label: `${t("Return to")} ${state ? pack.states[state].name : t("neutral lands")}`,
        indent: true,
        run: () => {
          returnCell(cell);
          window.dispatchEvent(new Event("fl:occupation"));
        }
      }
    );
  }
  return war;
}
