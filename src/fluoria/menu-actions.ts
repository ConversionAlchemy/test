// What the right-click menu offers for each kind of thing, Windows-style: short verbs, nothing else.
// Every action goes through Azgaar's own modules, so editors and saves see the same change
import { type EntityRef, MapEntities } from "@/components/map-entities";
import { Controllers } from "@/controllers";
import type { Regiment } from "@/generators/military-generator";
import { drawMilitary } from "@/renderers/draw-military";
import { t } from "@/utils/i18n";
import { findEl } from "@/utils/nodeUtils";
import { board, canBoard, capacity, cargo, carrierOf, fleetsFor, landingCells, load, space } from "./boarding";
import { openCellCard } from "./cell-card";
import { openNation } from "./nation-panel";
import { cellCentre, mainCell } from "./one-grid";
import { showRoadEdit } from "./pixel-map-sync";
import { nodePoint, segmentAt } from "./road-geometry";
import { changeSegment, deleteRoute, findRoute, ROUTE_LEVELS, renameRoute, setRouteGroup } from "./routes";
import { chooseLanding, selected, stackAll } from "./units";

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

/** Board, and let go of the army if it was the one selected: it has left the map */
const embark = (army: Regiment, fleet: Regiment) => {
  board(army, fleet);
  if (findEl("regimentEditor")) $("#regimentEditor").dialog("close");
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
    if (regiment) return regiment.n ? fleetActions(regiment, confirm) : armyActions(regiment, confirm);
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
  const others = pack.states.flatMap(state =>
    state.i && !state.removed
      ? (state.military ?? []).filter(
          o => o !== regiment && !o.hidden && o.cell === regiment.cell && Boolean(o.n) === Boolean(regiment.n)
        )
      : []
  );
  if (others.length) {
    actions.push({ label: t("Merge into"), disabled: true });
    for (const target of others)
      actions.push({
        label: target.name,
        indent: true,
        run: () => {
          Military.attach(regiment.state, regiment.i, target.state, target.i);
          redraw();
        }
      });
  }
  actions.push({
    label: t("Split in half"),
    disabled: regiment.a < 2,
    run: () => {
      Military.split(regiment.state, regiment.i);
      redraw();
    }
  });
  return actions;
}

function armyActions(army: Regiment, confirm: (run: () => void) => void): MenuAction[] {
  const fleets = fleetsFor(army);
  return [
    { label: t("Edit"), run: openRegiment(army) },
    ...common(army),
    ...fleets.map(fleet => ({
      label: boardLabel(army, fleet),
      run: () => embark(army, fleet)
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

function fleetActions(fleet: Regiment, confirm: (run: () => void) => void): MenuAction[] {
  const aboard = cargo(fleet);
  const army = selected();
  const shore = landingCells(fleet).length > 0;
  const actions: MenuAction[] = [{ label: t("Edit"), run: openRegiment(fleet) }];
  if (army && canBoard(army, fleet)) actions.push({ label: boardLabel(army, fleet), run: () => embark(army, fleet) });
  actions.push(...common(fleet));
  actions.push({ label: `${t("Cargo")} ${load(fleet)} / ${capacity(fleet)}`, disabled: true });
  if (aboard.length) {
    actions.push(
      ...aboard.map(regiment => ({
        label: `${t("Land")} ${regiment.name} (${regiment.a})`,
        indent: true,
        disabled: !shore,
        run: () => chooseLanding(fleet, [regiment], redraw)
      }))
    );
    actions.push({
      label: shore ? t("Land all") : t("No coast in reach"),
      disabled: !shore,
      run: () => chooseLanding(fleet, aboard, redraw)
    });
  }
  actions.push({
    label: t("Delete"),
    danger: true,
    run: () =>
      confirm(() => {
        for (const regiment of aboard) Military.remove(regiment.state, regiment.i); // lost with the ships
        Military.remove(fleet.state, fleet.i);
        redraw();
      })
  });
  return actions;
}

function boardLabel(army: Regiment, fleet: Regiment): string {
  const free = space(fleet);
  return army.a <= free
    ? `${t("Board")} ${fleet.name}`
    : `${t("Board")} ${fleet.name} (${t("fits {{fit}} of {{total}}", { fit: free, total: army.a })})`;
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
  if (!state) return [];
  const water = pack.cells.h[cell] < 20;
  return [
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

/** For the regiment card: the fleet it is aboard, if any */
export const aboardOf = carrierOf;
