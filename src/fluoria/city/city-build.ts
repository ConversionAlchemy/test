// Buildings drawn as shapes, then snapped back to hard pixels at the zoom they are seen at: neat edges at every distance,
// still the pixel look. Far out a terrace reads as one block; close in every house has its own outline
import { connectVertices } from "@/utils/pathUtils";
import type { Painted } from "./city-draw";
import { DIST_COL, hedgeEdges, OPEN_LAND, TYPE_INK } from "./city-draw";
import type { Building, City, P2 } from "./city-gen";
import { pattern, type Tex, treeLayer } from "./city-tex";

type C3 = readonly [number, number, number];
const sh = (c: C3, f: number): C3 => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
const hex = (h: string): C3 => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16)
];
const PAPER: C3 = [246, 241, 228];
const mix = (a: C3, b: C3, t: number): C3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];
const mix3 = (a: C3, b: C3, t: number): C3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];
const css = (c: C3) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export type Style = "terrain" | "map" | "districts" | "factions";

/** A landmark's footprint: the outline of its cells, pulled in off the streets */
export function landmarkShape(city: City, b: Building): P2[] {
  const { cells, vertices } = city.pack;
  const set = new Set(b.cells ?? [b.cell]);
  const i = [...set].find(c => cells.c[c].some((j: number) => !set.has(j)));
  if (i === undefined) return [];
  const start = cells.v[i].find((v: number) => vertices.c[v].some((c: number) => !set.has(c)));
  if (start === undefined) return [];
  const chain = connectVertices({ vertices, startingVertex: start, ofSameType: c => set.has(c), closeRing: false });
  let poly: P2[] = chain.map(v => vertices.p[v] as P2);
  poly = poly.filter(
    (p, k) => Math.hypot(p[0] - poly[(k + 1) % poly.length][0], p[1] - poly[(k + 1) % poly.length][1]) > 0.8
  );
  // drop corners that lie on a straight side, so a square cell stays four corners
  poly = poly.filter((p, k) => {
    const a = poly[(k + poly.length - 1) % poly.length];
    const c = poly[(k + 1) % poly.length];
    return Math.abs((p[0] - a[0]) * (c[1] - p[1]) - (p[1] - a[1]) * (c[0] - p[0])) > 0.5;
  });
  if (b.type === "Fort") return squareIn(inset(poly, 8), city.ang[b.cell]);
  poly = inset(poly, 2);
  return b.type === "Bank" && poly.length !== 4 ? squareIn(poly, city.ang[b.cell]) : poly;
}

// the largest square on the town grid that fits the plot: the Aurum is built square whatever its cell
function squareIn(poly: P2[], a: number): P2[] {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const at = (h: number, dx: number, dy: number): P2[] =>
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1]
    ].map(([i, j]) => [cx + dx + (ux * i - uy * j) * h, cy + dy + (uy * i + ux * j) * h] as P2);
  const fits = (q: P2[]) => q.every(p => inside(poly, p[0], p[1]));
  let best: P2[] = at(2, 0, 0);
  let bh = 0;
  for (let dx = -6; dx <= 6; dx += 2)
    for (let dy = -6; dy <= 6; dy += 2)
      for (let h = bh + 0.5; h < 40; h += 0.5) {
        const q = at(h, dx, dy);
        if (!fits(q)) break;
        best = q;
        bh = h;
      }
  return best;
}
function inside(poly: P2[], x: number, y: number) {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}

function inset(poly: P2[], d: number, per?: number[]): P2[] {
  const n = poly.length;
  if (n < 3) return poly;
  let area = 0;
  for (let k = 0; k < n; k++) {
    const [a, b] = [poly[k], poly[(k + 1) % n]];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sgn = area > 0 ? 1 : -1;
  const lines = poly.map((a, k) => {
    const b = poly[(k + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / L) * sgn;
    const ny = ((b[0] - a[0]) / L) * sgn;
    const o = per?.[k] ?? d;
    return { a: [a[0] + nx * o, a[1] + ny * o] as P2, dx: (b[0] - a[0]) / L, dy: (b[1] - a[1]) / L };
  });
  const lim = Math.max(d, ...(per ?? [0])) * 3;
  return poly.map((p, k) => {
    const l1 = lines[(k + n - 1) % n];
    const l2 = lines[k];
    const den = l1.dx * l2.dy - l1.dy * l2.dx;
    if (Math.abs(den) < 1e-3) return l2.a;
    const t = ((l2.a[0] - l1.a[0]) * l2.dy - (l2.a[1] - l1.a[1]) * l2.dx) / den;
    const q: P2 = [l1.a[0] + l1.dx * t, l1.a[1] + l1.dy * t];
    return Math.hypot(q[0] - p[0], q[1] - p[1]) > lim ? l2.a : q;
  });
}

const pathOf = (g: CanvasRenderingContext2D, poly: P2[]) => {
  g.beginPath();
  for (const [k, p] of poly.entries()) {
    if (k) g.lineTo(p[0], p[1]);
    else g.moveTo(p[0], p[1]);
  }
  g.closePath();
};
const hard = (cv: HTMLCanvasElement) => {
  const g = cv.getContext("2d") as CanvasRenderingContext2D;
  const im = g.getImageData(0, 0, cv.width, cv.height);
  const d = im.data;
  for (let k = 3; k < d.length; k += 4) d[k] = d[k] < 110 ? 0 : 255;
  g.putImageData(im, 0, 0);
};

// a faint grain on the roofs, a few world pixels apart whatever the zoom
const speckle = (cv: HTMLCanvasElement, s: number, amt = 1) => {
  const g = cv.getContext("2d") as CanvasRenderingContext2D;
  const im = g.getImageData(0, 0, cv.width, cv.height);
  const d = im.data;
  const W = cv.width;
  for (let y = 1; y < cv.height - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const k = (y * W + x) * 4;
      if (!d[k + 3] || !d[k + 7] || !d[k - 1] || !d[k + W * 4 + 3] || !d[k - W * 4 + 3]) continue;
      const wx = Math.floor(x / s);
      const wy = Math.floor(y / s);
      let h = (wx * 374761393 + wy * 668265263) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const r = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      const f = r < 0.07 ? 1 + 0.07 * amt : r > 0.94 ? 1 - 0.05 * amt : 0;
      if (!f) continue;
      for (let i = 0; i < 3; i++) d[k + i] = Math.min(255, d[k + i] * f);
    }
  g.putImageData(im, 0, 0);
};

export function renderBuildings(
  city: City,
  style: Style,
  s: number
): { body: HTMLCanvasElement; shadow: HTMLCanvasElement } {
  const body = document.createElement("canvas");
  const shadow = document.createElement("canvas");
  for (const c of [body, shadow]) {
    c.width = Math.ceil(city.W * s);
    c.height = Math.ceil(city.H * s);
  }
  const g = body.getContext("2d") as CanvasRenderingContext2D;
  const gs = shadow.getContext("2d") as CanvasRenderingContext2D;
  g.scale(s, s);
  gs.scale(s, s);
  const px = 1 / s;
  const lw = Math.max(1, s * 0.45) * px;
  const joined = s < 4 || style === "map" || style === "terrain";
  const shapes = new Map<number, P2[]>();
  for (const b of city.buildings) shapes.set(b.id, b.landmark ? landmarkShape(city, b) : b.poly);

  const look = (b: Building): { pal: [C3, C3, C3]; flat: boolean } => {
    const ink = TYPE_INK[b.type];
    const own = city.edits.colors?.[b.key ?? ""];
    if (own && style !== "districts" && style !== "factions")
      return { pal: [hex(own), hex(own), sh(hex(own), 0.45)], flat: true };
    if (style === "map" || style === "terrain") {
      // one red, shaded by who lives there: deep in the rich quarters, faded in the shanty
      const k = city.kind[b.cell] ?? "";
      const c: C3 = b.landmark
        ? b.type === "Bank"
          ? [196, 150, 60]
          : b.type === "Fort"
            ? [118, 112, 104]
            : [74, 50, 38]
        : ink && style === "map"
          ? sh(hex(ink), 0.92)
          : b.trade
            ? [204, 112, 70]
            : k === "shanty"
              ? [204, 146, 120]
              : k === "wealthy" || k === "centre"
                ? [176, 82, 58]
                : k === "docks"
                  ? [174, 110, 78]
                  : (b.district ?? -1) < 0
                    ? [200, 124, 88]
                    : [194, 100, 68];
      // the reference map: the town faded back so the marked places stand out
      const f = style === "map" && !(ink || b.landmark) ? 0.42 : 0;
      const cc = mix(c, PAPER, f);
      return { pal: [cc, cc, sh(cc, f ? 0.7 : 0.45)], flat: true };
    }
    // the themed views: the town faded back, the theme's buildings in its colours
    const pale: C3 = mix([196, 120, 92], PAPER, 0.5);
    if (style === "factions") {
      const f = b.owner !== undefined ? city.factions[b.owner] : undefined;
      if (!f) return { pal: [pale, pale, sh(pale, 0.72)], flat: true };
      // the zone's houses soft; what a faction holds outright, deep
      const c = hex(f.col);
      const held =
        !!b.name || b.landmark || city.edits.owners?.[b.key ?? ""] !== undefined || b.owner !== city.faction[b.cell];
      const cc = held ? sh(c, 0.82) : mix(c, PAPER, 0.5);
      return { pal: [cc, cc, sh(cc, held ? 0.5 : 0.72)], flat: true };
    }
    if (style === "districts") {
      const D = b.district ?? -1;
      if (D < 0) return { pal: [pale, pale, sh(pale, 0.72)], flat: true };
      const c = sh(hex(DIST_COL[D % DIST_COL.length]), 0.88);
      return { pal: [c, c, sh(c, 0.6)], flat: true };
    }
    if (ink) return { pal: [hex(ink), hex(ink), sh(hex(ink), 0.6)], flat: true };
    return {
      pal: [
        [194, 122, 84],
        [194, 122, 84],
        [124, 70, 48]
      ],
      flat: true
    };
  };

  // outlines first; far out the bodies then cover the lines between neighbours, leaving one edge round a terrace
  for (const b of city.buildings) {
    const poly = shapes.get(b.id) as P2[];
    if (poly.length < 3) continue;
    const { pal } = look(b);
    g.fillStyle = g.strokeStyle = css(pal[2]);
    g.lineWidth = lw * 2;
    pathOf(g, poly);
    g.fill();
    if (joined) g.stroke();
  }
  for (const b of city.buildings) {
    const poly = shapes.get(b.id) as P2[];
    if (poly.length < 3) continue;
    const { pal, flat } = look(b);
    const inner = joined ? poly : inset(poly, lw);
    if (flat) {
      g.fillStyle = css(pal[0]);
      pathOf(g, inner);
      g.fill();
      if (!joined && !b.landmark && style !== "factions") {
        g.strokeStyle = css(sh(pal[0], 0.86));
        g.lineWidth = lw;
        const [p0, p1, , p3] = inner;
        const along = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) >= Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
        const ax = along ? [(p0[0] + p3[0]) / 2, (p0[1] + p3[1]) / 2] : [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        const bx = along
          ? [(p1[0] + inner[2][0]) / 2, (p1[1] + inner[2][1]) / 2]
          : [(p3[0] + inner[2][0]) / 2, (p3[1] + inner[2][1]) / 2];
        g.beginPath();
        g.moveTo(ax[0], ax[1]);
        g.lineTo(bx[0], bx[1]);
        g.stroke();
      }
      continue;
    }
    if (b.landmark || inner.length !== 4) {
      // a hip roof: each face to its eave, lit where it faces the upper left
      const cx = inner.reduce((a, p) => a + p[0], 0) / inner.length;
      const cy = inner.reduce((a, p) => a + p[1], 0) / inner.length;
      inner.forEach((a, k) => {
        const q = inner[(k + 1) % inner.length];
        const nx = q[1] - a[1];
        const ny = -(q[0] - a[0]);
        const out = (a[0] + q[0]) / 2 - cx;
        const outy = (a[1] + q[1]) / 2 - cy;
        const f = Math.sign(nx * out + ny * outy) || 1;
        const lit = (nx * f + ny * f) * -1 > 0;
        g.fillStyle = css(lit ? pal[0] : pal[1]);
        g.strokeStyle = g.fillStyle;
        g.lineWidth = px * 0.6;
        pathOf(g, [a, q, [cx, cy]]);
        g.fill();
        g.stroke();
      });
      continue;
    }
    // a ridge along the length; the half facing the upper left is lit
    const [p0, p1, p2, p3] = inner;
    const along = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) >= Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
    const m = (a: P2, c: P2): P2 => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    const halves: [P2[], P2][] = along
      ? [
          [
            [p0, p1, m(p1, p2), m(p0, p3)],
            [p0[0] - p3[0], p0[1] - p3[1]]
          ],
          [
            [m(p0, p3), m(p1, p2), p2, p3],
            [p3[0] - p0[0], p3[1] - p0[1]]
          ]
        ]
      : [
          [
            [p0, m(p0, p1), m(p3, p2), p3],
            [p0[0] - p1[0], p0[1] - p1[1]]
          ],
          [
            [m(p0, p1), p1, p2, m(p3, p2)],
            [p1[0] - p0[0], p1[1] - p0[1]]
          ]
        ];
    for (const [h, n] of halves) {
      const lit = -n[0] - n[1] > 0;
      g.fillStyle = css(lit ? pal[0] : pal[1]);
      g.strokeStyle = g.fillStyle;
      g.lineWidth = px * 0.6;
      pathOf(g, h);
      g.fill();
      g.stroke();
    }
  }
  if (joined && s >= 3 && (style === "map" || style === "terrain"))
    for (const b of city.buildings) {
      const poly = shapes.get(b.id) as P2[];
      if (b.landmark || poly.length < 3) continue;
      g.strokeStyle = css(sh(look(b).pal[0], 1.14));
      g.lineWidth = lw * 0.7;
      pathOf(g, inset(poly, lw * 0.6));
      g.stroke();
    }
  // no cast shadows: each roof is shaded on its own lower-right side, inside its outline, as a thin hatched band
  if (style === "terrain" || style === "map") {
    const d = s >= 3 ? 1.1 : 0.7;
    const ink = style === "terrain" ? "rgba(40,20,10,0.42)" : "rgba(40,20,10,0.26)";
    for (const b of city.buildings) {
      const poly = shapes.get(b.id) as P2[];
      if (poly.length < 3) continue;
      g.save();
      pathOf(g, poly);
      g.clip();
      // the band: the roof less itself moved up and left
      g.beginPath();
      for (const P of [poly, poly.map(p => [p[0] - d, p[1] - d] as P2)])
        for (const [k, p] of P.entries()) k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
      g.clip("evenodd");
      g.strokeStyle = ink;
      if (s >= 3) {
        // hatching on the diagonal, the engraver's way
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let y1 = -Infinity;
        for (const [x, y] of poly) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
        g.lineWidth = Math.max(px, 0.18);
        g.beginPath();
        for (let t = x0 + y0 - 2; t < x1 + y1 + 2; t += 0.75) {
          g.moveTo(t - y0 + 2, y0 - 2);
          g.lineTo(t - y1 - 2, y1 + 2);
        }
        g.stroke();
      } else {
        g.fillStyle = ink;
        g.fillRect(0, 0, city.W, city.H);
      }
      g.restore();
    }
  }
  // streets, squares and walls in vector: what strays onto a street is cut away, the walls and buildings cast
  // their shadow, then the streets are laid on top, filled and edged in thin ink
  const { vertices, cells } = city.pack;
  const W2: Record<string, number> = { main: 2, street: 1.3, lane: 0.8, path: 0.7, track: 0.8 };
  // a road's edges as unbroken lines, so bends are mitred, not a row of separate strokes
  const chainsOf = (edges: [number, number][]): number[][] => {
    const adj = new Map<number, number[]>();
    for (const [a, b] of edges) {
      adj.set(a, [...(adj.get(a) ?? []), b]);
      adj.set(b, [...(adj.get(b) ?? []), a]);
    }
    const used = new Set<string>();
    const key = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const out: number[][] = [];
    const starts = [...adj.keys()].sort(
      (a, b) => ((adj.get(a)?.length ?? 0) === 2 ? 1 : 0) - ((adj.get(b)?.length ?? 0) === 2 ? 1 : 0)
    );
    for (const s0 of starts)
      for (const n0 of adj.get(s0) ?? []) {
        if (used.has(key(s0, n0))) continue;
        const ch = [s0, n0];
        used.add(key(s0, n0));
        for (let cur = n0; adj.get(cur)?.length === 2; ) {
          const nx = (adj.get(cur) as number[]).find(x => !used.has(key(cur, x)));
          if (nx === undefined) break;
          used.add(key(cur, nx));
          ch.push(nx);
          cur = nx;
        }
        out.push(ch);
      }
    return out;
  };
  const RANK: Record<string, number> = { track: 0, path: 0, lane: 1, street: 2, main: 3 };
  const ordered = [...city.roads].sort((a, b) => (RANK[a.type] ?? 0) - (RANK[b.type] ?? 0));
  // the lesser the road, the greyer, then the dustier; slight, so the plan stays one sheet of paper
  const TINT = (): Record<string, C3> =>
    style !== "terrain"
      ? { main: PAPER, street: [238, 236, 230], lane: [240, 233, 218], path: [238, 228, 208], track: [238, 228, 208] }
      : { main: PAPER, street: [234, 231, 223], lane: [238, 228, 209], path: [232, 218, 192], track: [232, 218, 192] };
  const strokeRoads = (extra: number, tint = false) => {
    for (const r of ordered) {
      const w = W2[r.type];
      if (!w) continue;
      if (tint) g.strokeStyle = TEX ? pattern(g, TEX[r.type] ?? "lane") : css(TINT()[r.type] ?? PAPER);
      g.lineWidth = w * 2 + 0.6 + extra;
      g.beginPath();
      if (r.edges)
        for (const ch of chainsOf(r.edges)) {
          const P = ch.map(v => vertices.p[v] as P2);
          for (const [k, p] of P.entries()) k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
        }
      else
        for (const [k, p] of r.pts.entries()) {
          if (k) g.lineTo(p[0], p[1]);
          else g.moveTo(p[0], p[1]);
        }
      g.stroke();
    }
  };
  // the Terrain view lays each road in its material, pixel for pixel
  const TEX: Record<string, Tex> | null =
    style === "terrain" ? { main: "main", street: "street", lane: "lane", path: "track", track: "track" } : null;
  g.imageSmoothingEnabled = false;
  const squares = cells.p.map((_: P2, i: number) => i).filter((i: number) => city.kind[i] === "square");
  const sqPoly = (i: number) => cells.v[i].map((v: number) => vertices.p[v] as P2);
  const faded = style !== "terrain";
  // straight edges, square ends, mitred bends
  g.lineCap = "square";
  g.lineJoin = "miter";
  g.miterLimit = 3;
  g.globalCompositeOperation = "destination-out";
  strokeRoads(lw * 2);
  for (const i of squares) {
    pathOf(g, sqPoly(i));
    g.fill();
  }
  g.globalCompositeOperation = "source-over";
  // the town wall: a stone band with round towers, open at each gate
  const stone: C3 = faded ? [196, 190, 180] : [160, 152, 142];
  const drawWalls = () => {
    // the wall stops at the side of any main road through it
    const mains = city.roads.filter(r => r.type !== "pier").map(r => r.pts);
    const segD = (p: P2, a: P2, b: P2) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
    };
    // open only where a road crosses: within the road's width of each gate
    void mains;
    void segD;
    const open = (p: P2) => city.gates.some(gt => Math.hypot(gt.p[0] - p[0], gt.p[1] - p[1]) < gt.r);
    const gateEnds: { p: P2; q: P2 }[] = [];
    const runs: P2[][] = [];
    for (const w of city.walls) {
      let run: P2[] = [];
      for (let k = 0; k < w.length - 1; k++) {
        const [a, b] = [w[k], w[k + 1]];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const steps = Math.max(1, Math.ceil(L / 0.5));
        for (let t = 0; t <= steps; t++) {
          const p: P2 = [a[0] + ((b[0] - a[0]) * t) / steps, a[1] + ((b[1] - a[1]) * t) / steps];
          if (open(p)) {
            if (run.length > 1) {
              runs.push(run);
              gateEnds.push({ p: run[run.length - 1], q: run[run.length - 2] });
            }
            run = [];
          } else {
            const back: P2 = [a[0] + ((b[0] - a[0]) * (t - 1)) / steps, a[1] + ((b[1] - a[1]) * (t - 1)) / steps];
            const on: P2 = [a[0] + ((b[0] - a[0]) * (t + 1)) / steps, a[1] + ((b[1] - a[1]) * (t + 1)) / steps];
            if (!run.length && (k > 0 || t > 0) && open(back)) gateEnds.push({ p, q: on });
            run.push(p);
          }
        }
      }
      if (run.length > 1) runs.push(run);
    }
    g.lineCap = "butt";
    g.lineJoin = "miter";
    for (const [lwid, col] of [
      [3.2, sh(stone, 0.7)],
      [2.2, stone]
    ] as [number, C3][]) {
      g.strokeStyle = TEX && col === stone ? pattern(g, "stone") : css(col);
      g.lineWidth = lwid;
      for (const run of runs) {
        g.beginPath();
        for (const [k, p] of run.entries()) k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
        g.stroke();
      }
    }
    // turrets: small squares at the turns; gate towers: large and dark, either side of each gate
    const dark: C3 = faded ? [150, 140, 128] : [96, 86, 76];
    // a turret is set square to the bisector of the two walls it joins
    const wallDir = (p: P2) => {
      for (const w of city.walls)
        for (let k = 1; k < w.length - 1; k++)
          if (Math.hypot(w[k][0] - p[0], w[k][1] - p[1]) < 0.01) {
            const a1 = Math.atan2(w[k][1] - w[k - 1][1], w[k][0] - w[k - 1][0]);
            const a2 = Math.atan2(w[k + 1][1] - w[k][1], w[k + 1][0] - w[k][0]);
            return Math.atan2(Math.sin(a1) + Math.sin(a2), Math.cos(a1) + Math.cos(a2));
          }
      return 0;
    };
    for (const [tx, ty] of city.towers) {
      g.save();
      g.translate(tx, ty);
      g.rotate(wallDir([tx, ty]));
      g.fillStyle = css(sh(stone, 0.72));
      g.fillRect(-1.9, -1.9, 3.8, 3.8);
      g.fillStyle = css(sh(stone, 1.06));
      g.fillRect(-1.3, -1.3, 2.6, 2.6);
      g.restore();
    }
    // gate towers: the same square turrets, darker, at the wall's ends beside the road
    for (const { p, q } of gateEnds) {
      g.save();
      g.translate(p[0], p[1]);
      g.rotate(Math.atan2(p[1] - q[1], p[0] - q[0]));
      g.fillStyle = css(sh(dark, 0.75));
      g.fillRect(-1.9, -1.9, 3.8, 3.8);
      g.fillStyle = css(dark);
      g.fillRect(-1.3, -1.3, 2.6, 2.6);
      g.restore();
    }
  };
  hard(body);
  void gs;
  // field hedges: thin, crisp, in the drawing's own scale, under the buildings
  if (style !== "districts" && style !== "factions") {
    g.strokeStyle = style !== "terrain" ? "rgb(150,156,112)" : "rgb(112,122,72)";
    g.lineWidth = Math.max(lw * 1.4, 0.45);
    g.beginPath();
    for (const [a, b] of hedgeEdges(city)) {
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
    }
    g.stroke();
  }

  // piers: timber decks with square-cut ends
  const piers = city.roads.filter(r => r.type === "pier");
  const deck = (w: number, col: C3, pat?: CanvasPattern) => {
    g.lineCap = "butt";
    g.lineJoin = "miter";
    g.strokeStyle = pat ?? css(col);
    g.lineWidth = w;
    for (const r of piers) {
      g.beginPath();
      for (const [k, p] of r.pts.entries()) k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
      g.stroke();
    }
    // where one deck meets another, fill the corner so no water shows through the joint
    g.fillStyle = pat ?? css(col);
    for (const r of piers)
      for (const p of [r.pts[0], r.pts[r.pts.length - 1]])
        if (piers.some(o => o !== r && o.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.6))) {
          g.beginPath();
          g.arc(p[0], p[1], w / 2, 0, Math.PI * 2);
          g.fill();
        }
  };
  const wood: C3 = faded ? [196, 172, 136] : [168, 132, 90];
  deck(2.4 + lw * 2, sh(wood, 0.55));
  deck(2.4, wood, TEX ? pattern(g, "wood") : undefined);
  g.lineCap = "square";
  g.lineJoin = "miter";
  // roads over the decks: a road always wins
  g.lineCap = "square";
  g.lineJoin = "miter";
  g.strokeStyle = g.fillStyle = "rgb(84,72,60)";
  strokeRoads(Math.max(lw * 2, 0.7));
  g.lineWidth = lw * 2;
  for (const i of squares) {
    pathOf(g, sqPoly(i));
    g.stroke();
  }
  g.strokeStyle = g.fillStyle = css(PAPER);
  strokeRoads(0, true);
  if (TEX) g.fillStyle = pattern(g, "main");
  for (const i of squares) {
    pathOf(g, sqPoly(i));
    g.fill();
  }
  // bridges: where a road crosses water, a stone deck between two parapets
  {
    const wetEdge = (a: number, b: number) =>
      (vertices.c[a] as number[])
        .filter(c => (vertices.c[b] as number[]).includes(c))
        .every(c => city.use[c] === "water");
    g.lineCap = "butt";
    for (const r of city.roads) {
      const w = W2[r.type];
      if (!w || r.type === "track" || r.type === "path") continue;
      for (const [a, b] of r.edges ?? []) {
        if (!wetEdge(a, b)) continue;
        const p = vertices.p[a] as P2;
        const q = vertices.p[b] as P2;
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        const nx = (-(q[1] - p[1]) / L) * (w + 0.5);
        const ny = ((q[0] - p[0]) / L) * (w + 0.5);
        g.strokeStyle = TEX ? pattern(g, "stone") : css(faded ? [226, 220, 206] : [214, 205, 188]);
        g.lineWidth = w * 2 + 0.6;
        g.beginPath();
        g.moveTo(p[0], p[1]);
        g.lineTo(q[0], q[1]);
        g.stroke();
        g.strokeStyle = css(faded ? [140, 130, 118] : [104, 94, 84]);
        g.lineWidth = Math.max(lw * 2, 0.8);
        g.beginPath();
        for (const sgn of [1, -1]) {
          g.moveTo(p[0] + nx * sgn, p[1] + ny * sgn);
          g.lineTo(q[0] + nx * sgn, q[1] + ny * sgn);
        }
        g.stroke();
      }
    }
  }
  // the walls over the lanes that end at them, open only at the gates
  drawWalls();
  g.lineCap = "square";
  g.lineJoin = "miter";
  // ponds: a clean watercolour shape on their cell, laid like a square, over the shadows
  for (let i = 0; i < cells.p.length; i++) {
    if (city.kind[i] !== "pond") continue;
    // the water sits back from the streets round it, by each street's half-width, as a block does
    let P = sqPoly(i);
    if (P.length > 2) {
      const vs = cells.v[i] as number[];
      const keys = new Map<string, number>();
      for (const r of city.roads)
        if (r.edges) for (const [a, b] of r.edges) keys.set(a < b ? `${a}|${b}` : `${b}|${a}`, (W2[r.type] ?? 1) + 0.9);
      const off = vs.map((v, e) => {
        const w = vs[(e + 1) % vs.length];
        return keys.get(v < w ? `${v}|${w}` : `${w}|${v}`) ?? 1.2;
      });
      P = inset(P, 0, off);
    }
    g.fillStyle = css(faded ? [176, 206, 216] : [150, 194, 210]);
    pathOf(g, P);
    g.fill();
    g.strokeStyle = "rgb(84,72,60)";
    g.lineWidth = Math.max(lw * 2, 0.7);
    g.stroke();
  }
  drawWalls();
  hard(body);
  if (style === "terrain" || style === "map") speckle(body, s, style === "map" ? 0.3 : 0.5);
  return { body, shadow };
}

/** The home ground as vector cells over the raster, so every cell edge stays sharp at any zoom */
export function renderGround(city: City, painted: Painted, style: Style, s: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(city.W * s);
  cv.height = Math.ceil(city.H * s);
  const g = cv.getContext("2d") as CanvasRenderingContext2D;
  g.scale(s, s);
  const { cells, vertices } = city.pack;
  const col = painted.cellCol[style];
  const n = cells.p.length;
  const poly = (i: number) => cells.v[i].map((v: number) => vertices.p[v] as P2);
  const land = (i: number) => i < n && !!col[i];
  g.lineJoin = "round";
  const H = city.height;
  // the slope under each cell, for light and shade: lit facing the upper left
  const shadeOf = (i: number) => {
    if (style !== "terrain" || city.use[i] === "water") return 1;
    let gx = 0;
    let gy = 0;
    for (const j of cells.c[i] as number[]) {
      if (j >= n || city.use[j] === "water") continue;
      const dx = cells.p[j][0] - cells.p[i][0];
      const dy = cells.p[j][1] - cells.p[i][1];
      const d2 = dx * dx + dy * dy || 1;
      gx += ((H[j] - H[i]) * dx) / d2;
      gy += ((H[j] - H[i]) * dy) / d2;
    }
    return Math.max(0.86, Math.min(1.12, 1 + (gx + gy) * 2.2));
  };
  for (let i = 0; i < n; i++) {
    const c0 = col[i];
    if (!c0) continue;
    const c = sh(c0, shadeOf(i));
    pathOf(g, poly(i));
    g.fillStyle = g.strokeStyle = css(c);
    g.lineWidth = 0.6;
    g.fill();
    g.stroke();
  }
  // closed yards are grass
  const lawn: C3 = style === "terrain" ? [164, 194, 104] : [206, 220, 176];
  g.fillStyle = css(lawn);
  for (const y of city.yards) {
    pathOf(g, y);
    g.fill();
  }
  if (style === "terrain") {
    // every cell in its own material, pixel for pixel, then lit or shaded by its slope and a touch of its own
    g.imageSmoothingEnabled = false;
    const wealth = (i: number) => city.districts.find(d => d.id === city.district[i])?.wealth ?? 0;
    const texOf = (i: number): Tex => {
      const u = city.use[i];
      if (u === "water") return "sea";
      if (u === "woods") return "under";
      if (u === "grass" || u === "pasture" || u === "wheat" || u === "tilled") return u === "grass" ? "meadow" : u;
      const k = city.kind[i];
      if (k === "square") return "main";
      if (k === "pond") return "sea";
      if (k === "park" || k === "wealthy" || wealth(i) >= 5) return "garden";
      return "yard";
    };
    const pats = new Map<Tex, CanvasPattern>();
    const pat = (t: Tex) => {
      if (!pats.has(t)) pats.set(t, pattern(g, t));
      return pats.get(t) as CanvasPattern;
    };
    for (let i = 0; i < n; i++) {
      if (!col[i]) continue;
      pathOf(g, poly(i));
      g.fillStyle = g.strokeStyle = pat(texOf(i));
      g.lineWidth = 0.6;
      g.fill();
      g.stroke();
      const f = shadeOf(i) * (0.97 + (((i * 2654435761) % 1000) / 1000) * 0.06);
      if (Math.abs(f - 1) > 0.005) {
        g.fillStyle = f < 1 ? `rgba(0,0,0,${(1 - f).toFixed(3)})` : `rgba(255,255,255,${((f - 1) * 0.8).toFixed(3)})`;
        g.fill();
      }
    }
    g.fillStyle = pat("garden");
    for (const y of city.yards) {
      pathOf(g, y);
      g.fill();
    }
    // trees, one pixel crown each, at their true size
    g.drawImage(treeLayer(city), 0, 0);
  } else speckle(cv, s, 0.45);
  // contours on the cells' own edges: a line wherever the ground crosses a level, every fifth one heavier
  {
    const STEP = 1;
    const lvl = (i: number) => Math.floor((H[i] - 20) / STEP);
    const thin: [P2, P2][] = [];
    const bold: [P2, P2][] = [];
    for (let i = 0; i < n; i++) {
      if (city.use[i] === "water") continue;
      const vs = cells.v[i] as number[];
      for (const [e, v] of vs.entries()) {
        const w = vs[(e + 1) % vs.length];
        const o = (cells.c[i] as number[]).find(j => j > i && cells.v[j]?.includes(v) && cells.v[j].includes(w));
        if (o === undefined || o >= n || city.use[o] === "water") continue;
        const [la, lb] = [lvl(i), lvl(o)];
        if (la === lb) continue;
        const seg: [P2, P2] = [vertices.p[v] as P2, vertices.p[w] as P2];
        let heavy = false;
        for (let L = Math.min(la, lb) + 1; L <= Math.max(la, lb); L++) if (L % 5 === 0) heavy = true;
        (heavy ? bold : thin).push(seg);
      }
    }
    const ink = style === "terrain" ? "rgba(60,40,22,0.38)" : "rgba(146,104,66,0.8)";
    for (const [list, w] of [
      [thin, 0.7],
      [bold, 1.3]
    ] as [[P2, P2][], number][]) {
      g.strokeStyle = ink;
      g.lineWidth = w;
      g.beginPath();
      for (const [a, b] of list) {
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
      }
      g.stroke();
    }
  }
  // on the plan views the fields are drawn as thin boundary lines on the paper
  if (style !== "terrain") {
    g.strokeStyle = "rgb(208,198,178)";
    g.lineWidth = 0.5;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      if (!col[i] || !OPEN_LAND.has(city.use[i])) continue;
      const vs = cells.v[i] as number[];
      for (const [e, v] of vs.entries()) {
        const w = vs[(e + 1) % vs.length];
        const o = (cells.c[i] as number[]).find(j => j > i && cells.v[j]?.includes(v) && cells.v[j].includes(w));
        if (o === undefined || o >= n || !col[o] || !OPEN_LAND.has(city.use[o])) continue;
        g.moveTo(vertices.p[v][0], vertices.p[v][1]);
        g.lineTo(vertices.p[w][0], vertices.p[w][1]);
      }
    }
    g.stroke();
  }
  // edges drawn inside each cell only: district or faction rims, the shore, the city's edge band
  const of = style === "districts" ? city.district : style === "factions" ? city.faction : null;
  const rimCol = (v: number): C3 | null =>
    v < 0
      ? null
      : style === "districts"
        ? sh(hex(DIST_COL[v % DIST_COL.length]), 0.75)
        : sh(mix3(hex(city.factions[v]?.col ?? "#888888"), PAPER, 0.35), 0.75);
  for (let i = 0; i < n; i++) {
    if (!col[i]) continue;
    const vs = cells.v[i] as number[];
    const edges: { a: P2; b: P2; k: "rim" | "shore" | "shallow" | "edge" }[] = [];
    for (const [e, v] of vs.entries()) {
      const w = vs[(e + 1) % vs.length];
      const o = (cells.c[i] as number[]).find(j => j !== i && cells.v[j]?.includes(v) && cells.v[j].includes(w));
      const a = vertices.p[v] as P2;
      const b = vertices.p[w] as P2;
      const wet = city.use[i] === "water";
      if (o === undefined || o >= n || city.home[o] !== 1) edges.push({ a, b, k: "edge" });
      else if (wet && city.use[o] !== "water") edges.push({ a, b, k: "shallow" });
      else if (!wet && city.use[o] === "water") edges.push({ a, b, k: "shore" });
      else if (of && land(o) && of[o] !== of[i]) edges.push({ a, b, k: "rim" });
    }
    if (!edges.length) continue;
    g.save();
    pathOf(g, poly(i));
    g.clip();
    g.lineCap = "round";
    const stroke = (k: string, c: C3, w: number, a: number) => {
      g.strokeStyle = css(c);
      g.globalAlpha = a;
      g.lineWidth = w;
      g.beginPath();
      for (const e of edges)
        if (e.k === k) {
          g.moveTo(e.a[0], e.a[1]);
          g.lineTo(e.b[0], e.b[1]);
        }
      g.stroke();
    };
    const rc = of ? rimCol(of[i]) : null;
    if (rc) stroke("rim", rc, 2, 0.55);
    stroke("shallow", style === "terrain" ? [128, 176, 196] : [158, 190, 200], 4.4, 1);
    stroke("shore", [92, 80, 68], 2, 0.7);
    // the cell's own edge band falls on its fields, never across the town
    if (!(city.use[i] === "town" || city.use[i] === "shanty"))
      for (const w of [18, 14, 10, 6]) stroke("edge", [170, 110, 90], w, 0.07);
    stroke("edge", [26, 22, 18], 4.4, 0.88);
    g.restore();
  }
  // another nation's land beyond the cell's edge: a heavy line, and their side hatched in their colour
  g.globalAlpha = 1;
  for (const b of city.borders) {
    const W = 11;
    const q: P2[] = [
      b.a,
      b.b,
      [b.b[0] + b.out[0] * W, b.b[1] + b.out[1] * W],
      [b.a[0] + b.out[0] * W, b.a[1] + b.out[1] * W]
    ];
    g.save();
    pathOf(g, q);
    g.clip();
    const c = hex(b.col);
    g.strokeStyle = css(sh(c, 0.8));
    g.globalAlpha = style === "terrain" ? 0.75 : 0.6;
    g.lineWidth = 0.7;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const [x, y] of q) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    g.beginPath();
    for (let t = x0 + y0 - 30; t < x1 + y1 + 30; t += 2.4) {
      g.moveTo(t - y0 + 30, y0 - 30);
      g.lineTo(t - y1 - 30, y1 + 30);
    }
    g.stroke();
    g.restore();
  }
  g.globalAlpha = 1;
  g.lineCap = "round";
  for (const [w, c] of [
    [6, "rgb(26,22,18)"],
    [3, ""]
  ] as [number, string][])
    for (const b of city.borders) {
      g.strokeStyle = c || css(hex(b.col));
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(b.a[0], b.a[1]);
      g.lineTo(b.b[0], b.b[1]);
      g.stroke();
    }
  // woods, dotted again over the flat cells (the Terrain view has its trees)
  const fade = 0.33;
  for (const [x, y] of style === "terrain" ? [] : painted.dots) {
    const ci = painted.CID[y * city.W + x];
    if (ci < 0 || !col[ci]) continue;
    g.globalAlpha = fade;
    g.fillStyle = "rgb(118,150,80)";
    g.fillRect(x, y, 2, 2);
    g.fillStyle = "rgb(96,120,66)";
    g.fillRect(x + 1, y + 1, 1, 1);
  }
  for (const [x, y] of style === "terrain" ? [] : city.trees) {
    const ci = painted.CID[(y | 0) * city.W + (x | 0)];
    if (ci < 0 || !col[ci]) continue;
    g.globalAlpha = fade;
    g.fillStyle = "rgb(118,150,80)";
    g.fillRect(x, y, 2, 2);
    g.fillStyle = "rgb(96,120,66)";
    g.fillRect(x + 1, y + 1, 1, 1);
  }
  g.globalAlpha = 1;
  return cv;
}
