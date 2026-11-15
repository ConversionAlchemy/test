// Main roads from each nation's capital out to its province seats on the same land: each seat joins the nearest
// place already on the network, so the roads branch like a tree
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

export function seatRoads(): number {
  seatProvinces();
  let made = 0;
  for (const state of pack.states) {
    if (!state?.i || state.removed) continue;
    const seats = (state.provinces ?? [])
      .map(p => pack.burgs[pack.provinces[p]?.burg ?? 0])
      .filter(b => b?.i && !b.removed && b.i !== state.capital);
    const capital = pack.burgs[state.capital];
    if (!capital?.i || !seats.length) continue;
    const joined = [capital];
    const left = seats.filter(b => pack.cells.f[b.cell] === pack.cells.f[capital.cell]);
    while (left.length) {
      let best: [number, number, number] = [0, 0, Infinity];
      for (const [i, b] of left.entries())
        for (const [k, j] of joined.entries()) {
          const d = (b.x - j.x) ** 2 + (b.y - j.y) ** 2;
          if (d < best[2]) best = [i, k, d];
        }
      const [seat] = left.splice(best[0], 1);
      try {
        Routes.add(joined[best[1]].i, seat.i, "roads");
        made++;
      } catch {
        // no way through by land: the seat stays on its trails
      }
      joined.push(seat);
    }
  }
  return made;
}
