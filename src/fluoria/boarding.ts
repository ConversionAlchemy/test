// Loading land units onto transports. Ships load at the coast or in a port, airships on any land cell beside them.
// Cargo lives in the transport (`cargo`), so it moves with it and is lost with it
import type { Regiment } from "@/generators/military-generator";
import { disband, loadAll } from "./forces/army";
import { domainOf, isTransport, troopsOf } from "./forces/forces";
import { cellCentre, isPort, mainCell, neighbours } from "./one-grid";

const isWater = (cell: number) => pack.cells.h[cell] < 20;

// how far from a ship's point a shore cell counts as next to it: a little over one even sea cell
const reachOf = () => grid.spacing * 1.6;
const near = (cell: number, ship: Regiment) => {
  const [x, y] = cellCentre(cell);
  return Math.hypot(x - ship.x, y - ship.y) <= reachOf();
};

/** Whether an army standing where it is can step aboard a transport */
export function canLoad(army: Regiment, transport: Regiment): boolean {
  if (army === transport || army.state !== transport.state || !isTransport(transport)) return false;
  if (isTransport(army) || !troopsOf(army) || domainOf(army) !== "land") return false;
  const at = mainCell(army.cell);
  if (domainOf(transport) === "air") {
    const there = mainCell(transport.cell);
    return !isWater(at) && (there === at || neighbours(at).includes(there));
  }
  const docked = mainCell(transport.cell) === at && isPort(at);
  const beside =
    near(at, transport) || neighbours(at).includes(transport.cell) || pack.cells.haven?.[at] === transport.cell;
  return docked || (beside && (isWater(transport.cell) || isPort(transport.cell)));
}

/** Transports an army could load onto where it stands */
export function transportsFor(army: Regiment): Regiment[] {
  return (pack.states[army.state]?.military ?? []).filter(other => canLoad(army, other));
}

/** Load a whole army; returns why not, or "" */
export function load(army: Regiment, transport: Regiment): string {
  if (!canLoad(army, transport))
    return domainOf(transport) === "air" ? "Move beside the airship first" : "Move to the coast beside the ship first";
  return loadAll(army, transport);
}

/** Land cells a transport's cargo may step onto */
export function landingCells(transport: Regiment): number[] {
  const at = mainCell(transport.cell);
  if (domainOf(transport) === "air") return [at, ...neighbours(at)].filter(cell => !isWater(cell));
  const out = new Set(neighbours(at).filter(cell => !isWater(cell)));
  if (isPort(at)) out.add(at);
  for (const water of [at, ...neighbours(at)])
    for (const cell of neighbours(water)) if (!isWater(cell) && near(cell, transport)) out.add(cell);
  return [...out];
}

/** Put all cargo ashore in a cell; each slot stands on its own */
export function unload(transport: Regiment, cell: number): Regiment[] {
  return landingCells(transport).includes(cell) ? disband(transport, cell) : [];
}
