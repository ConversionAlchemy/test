import { buildRoadNetwork } from "./road-network";
import { blocksRoads } from "./woods";

/** Every province gets a seat: its biggest settlement, or a new one on its best open ground */
export function seatProvinces(): void {
  const { cells } = pack;
  for (const province of pack.provinces) {
    if (!province?.i || province.removed || pack.burgs[province.burg]?.i) continue;
    const own: number[] = [];
    for (let i = 0; i < cells.i.length; i++) if (cells.province[i] === province.i && cells.h[i] >= 20) own.push(i);
    if (!own.length) continue;
    const towns = own.map(i => pack.burgs[cells.burg[i]]).filter(b => b?.i && !b.removed);
    if (towns.length) {
      province.burg = towns.sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0].i;
      continue;
    }
    const open = own.filter(i => !blocksRoads(cells, i));
    const at = (open.length ? open : own).sort((a, b) => cells.s[b] - cells.s[a])[0];
    try {
      province.burg = Burgs.add(cells.p[at][0], cells.p[at][1]);
    } catch {
      // the province keeps no seat
    }
  }
}

/** Seats first, then the whole road network laid out from settlement to settlement */
export function seatRoads(): number {
  seatProvinces();
  return buildRoadNetwork();
}
