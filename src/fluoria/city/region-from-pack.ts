// The city view's input, cut from Azgaar's live map: every cell, route and settlement, with the states, faiths and
// name bases that name things. One export serves every settlement on the map (see settlement.ts regionOf)

import type { World } from "./settlement";

const r1 = (v: number) => Math.round(v * 10) / 10;

export function worldFromPack(): World {
  const { cells, vertices, burgs, routes, states, cultures, religions } = pack;
  const n = cells.i.length;
  let W = 0;
  let H = 0;
  for (const [x, y] of cells.p) {
    W = Math.max(W, x);
    H = Math.max(H, y);
  }
  // region units: about Goldbank's cell size, so towns come out at the scale they were designed at
  const k = Math.sqrt(400 / ((W * H) / n));
  const P = (x: number, y: number): [number, number] => [r1(x * k), r1(y * k)];
  const bases = Names.nameBases;
  const used = new Map<number, number>();
  const baseOf = (b: number) => {
    if (!used.has(b)) used.set(b, used.size);
    return used.get(b) as number;
  };
  const out: World = {
    seed: String(options.map.seed),
    cells: [],
    routes: [],
    burgs: [],
    states: states.map(s => ({ n: s.name ?? "", full: s.fullName, form: s.form, c: s.color })),
    cultures: cultures.map(c => ({ n: c.name ?? "", base: baseOf(c.base ?? 0) })),
    religions: religions.map(r => ({ n: r.name ?? "", deity: r.deity ?? undefined })),
    bases: []
  };
  for (let i = 0; i < n; i++)
    out.cells.push({
      p: (cells.v[i] as number[]).map(v => P(vertices.p[v][0], vertices.p[v][1])),
      c: P(cells.p[i][0], cells.p[i][1]),
      h: cells.h[i],
      b: cells.biome[i],
      s: cells.state[i],
      r: cells.religion?.[i] ?? 0,
      n: (cells.c[i] as number[]).filter(j => j < n)
    });
  for (const r of routes) {
    if (!r?.points?.length || r.group === "searoutes") continue;
    out.routes.push({ g: r.group, n: r.name, pts: r.points.map(([x, y]) => P(x, y)), cells: r.points.map(p => p[2]) });
  }
  for (const b of burgs) {
    if (!b?.i || b.removed) continue;
    out.burgs.push({
      i: b.i,
      n: b.name ?? "",
      x: r1(b.x * k),
      y: r1(b.y * k),
      cell: b.cell,
      pop: b.population ?? 0,
      cap: b.capital ? 1 : 0,
      port: b.port ? 1 : 0,
      walls: b.walls ? 1 : 0,
      citadel: b.citadel ? 1 : 0,
      plaza: b.plaza ? 1 : 0,
      temple: b.temple ? 1 : 0,
      shanty: b.shanty ? 1 : 0,
      rank: b.flSize ?? (b.capital ? "citadel" : "village"),
      state: b.state ?? 0,
      culture: b.culture ?? 0
    });
  }
  for (const [b] of [...used.entries()].sort((a, c) => a[1] - c[1])) {
    const nb = bases[b] ?? bases[0];
    out.bases.push({ b: nb.b, min: nb.min, max: nb.max, d: nb.d });
  }
  return out;
}

declare global {
  var fluoriaCityWorld: typeof worldFromPack;
}
window.fluoriaCityWorld = worldFromPack;
