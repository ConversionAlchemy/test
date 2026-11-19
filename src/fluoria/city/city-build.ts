// Buildings drawn as shapes, then snapped back to hard pixels at the zoom they are seen at: neat edges at every distance,
// still the pixel look. Far out a terrace reads as one block; close in every house has its own outline
import { connectVertices } from "@/utils/pathUtils";
import { DIST_COL, TYPE_INK } from "./city-draw";
import type { Building, City, P2 } from "./city-gen";

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
const css = (c: C3) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export type Style = "terrain" | "map" | "districts" | "factions" | "plan";

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

function inset(poly: P2[], d: number): P2[] {
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
    return { a: [a[0] + nx * d, a[1] + ny * d] as P2, dx: (b[0] - a[0]) / L, dy: (b[1] - a[1]) / L };
  });
  return poly.map((p, k) => {
    const l1 = lines[(k + n - 1) % n];
    const l2 = lines[k];
    const den = l1.dx * l2.dy - l1.dy * l2.dx;
    if (Math.abs(den) < 1e-3) return l2.a;
    const t = ((l2.a[0] - l1.a[0]) * l2.dy - (l2.a[1] - l1.a[1]) * l2.dx) / den;
    const q: P2 = [l1.a[0] + l1.dx * t, l1.a[1] + l1.dy * t];
    return Math.hypot(q[0] - p[0], q[1] - p[1]) > d * 3 ? l2.a : q;
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
  const joined = s < 4 || style === "plan" || style === "map" || style === "terrain";
  const shapes = new Map<number, P2[]>();
  for (const b of city.buildings) shapes.set(b.id, b.landmark ? landmarkShape(city, b) : b.poly);

  const look = (b: Building): { pal: [C3, C3, C3]; flat: boolean } => {
    const ink = TYPE_INK[b.type];
    const own = city.edits.colors?.[b.key ?? ""];
    if (own && style !== "districts" && style !== "factions")
      return { pal: [hex(own), hex(own), sh(hex(own), 0.45)], flat: true };
    if (style === "plan" || style === "map" || style === "terrain") {
      // one red, shaded by who lives there: deep in the rich quarters, faded in the shanty
      const k = city.kind[b.cell] ?? "";
      const c: C3 = b.landmark
        ? b.type === "Bank"
          ? [196, 150, 60]
          : [74, 50, 38]
        : ink && style === "map"
          ? sh(hex(ink), 0.92)
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
  // streets, squares and walls in vector: what strays onto a street is cut away, the walls and buildings cast
  // their shadow, then the streets are laid on top, filled and edged in thin ink
  const { vertices, cells } = city.pack;
  const W2: Record<string, number> = { main: 2, street: 1.3, lane: 0.8, path: 0.7, track: 0.8 };
  const townish = (c: number) => c < city.use.length && city.use[c] === "town";
  const atWall = (v: number) =>
    city.walls.length > 0 &&
    vertices.c[v].some(townish) &&
    vertices.c[v].some((c: number) => c < city.use.length && !townish(c) && city.use[c] !== "water");
  const strokeRoads = (extra: number) => {
    for (const r of city.roads) {
      const w = W2[r.type];
      if (!w) continue;
      g.lineWidth = w * 2 + 0.6 + extra;
      g.beginPath();
      if (r.edges)
        for (const [a, b] of r.edges) {
          // a street that runs up to the wall stops short of it; only main roads pass, at their gates
          let p = vertices.p[a] as P2;
          let q = vertices.p[b] as P2;
          const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
          const cut = Math.min(2.6, L * 0.45);
          if (r.type !== "main" && atWall(a)) p = [p[0] + ((q[0] - p[0]) / L) * cut, p[1] + ((q[1] - p[1]) / L) * cut];
          if (r.type !== "main" && atWall(b)) q = [q[0] + ((p[0] - q[0]) / L) * cut, q[1] + ((p[1] - q[1]) / L) * cut];
          g.moveTo(p[0], p[1]);
          g.lineTo(q[0], q[1]);
        }
      else
        for (const [k, p] of r.pts.entries()) {
          if (k) g.lineTo(p[0], p[1]);
          else g.moveTo(p[0], p[1]);
        }
      g.stroke();
    }
  };
  const squares = cells.p.map((_: P2, i: number) => i).filter((i: number) => city.kind[i] === "square");
  const sqPoly = (i: number) => cells.v[i].map((v: number) => vertices.p[v] as P2);
  const faded = style !== "terrain";
  g.lineCap = g.lineJoin = "round";
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
    const open = (p: P2) => city.gates.some(gt => Math.hypot(gt.p[0] - p[0], gt.p[1] - p[1]) < 3.4);
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
            if (run.length > 1) runs.push(run);
            run = [];
          } else run.push(p);
        }
      }
      if (run.length > 1) runs.push(run);
    }
    for (const [lwid, col] of [
      [3.2, sh(stone, 0.7)],
      [2.2, stone]
    ] as [number, C3][]) {
      g.strokeStyle = css(col);
      g.lineWidth = lwid;
      for (const run of runs) {
        g.beginPath();
        for (const [k, p] of run.entries()) k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
        g.stroke();
      }
    }
    // turrets: small squares at the turns; gate towers: large and dark, either side of each gate
    const dark: C3 = faded ? [150, 140, 128] : [96, 86, 76];
    for (const [tx, ty] of city.towers) {
      g.fillStyle = css(sh(stone, 0.72));
      g.fillRect(tx - 1.9, ty - 1.9, 3.8, 3.8);
      g.fillStyle = css(sh(stone, 1.06));
      g.fillRect(tx - 1.3, ty - 1.3, 2.6, 2.6);
    }
    for (const gt of city.gates)
      for (const [tx, ty] of [gt.a, gt.b]) {
        g.fillStyle = css(sh(dark, 0.75));
        g.beginPath();
        g.arc(tx, ty, 3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = css(dark);
        g.beginPath();
        g.arc(tx, ty, 2.3, 0, Math.PI * 2);
        g.fill();
      }
  };
  drawWalls();
  hard(body);
  // shadows to the lower right, cast by buildings and walls before the streets go down
  const off = style === "terrain" ? 1 : 0.9;
  gs.setTransform(1, 0, 0, 1, 0, 0);
  gs.drawImage(body, off * s, off * s);
  gs.globalCompositeOperation = "source-in";
  gs.fillStyle = "#000";
  gs.fillRect(0, 0, shadow.width, shadow.height);
  gs.globalCompositeOperation = "source-over";
  hard(shadow);
  g.strokeStyle = g.fillStyle = "rgb(84,72,60)";
  strokeRoads(Math.max(lw * 2, 0.7));
  g.lineWidth = lw * 2;
  for (const i of squares) {
    pathOf(g, sqPoly(i));
    g.stroke();
  }
  g.strokeStyle = g.fillStyle = css(PAPER);
  strokeRoads(0);
  for (const i of squares) {
    pathOf(g, sqPoly(i));
    g.fill();
  }
  // piers: timber decks with square-cut ends
  const piers = city.roads.filter(r => r.type === "pier");
  const deck = (w: number, col: C3) => {
    g.lineCap = "butt";
    g.lineJoin = "miter";
    g.strokeStyle = css(col);
    g.lineWidth = w;
    for (const r of piers) {
      g.beginPath();
      for (const [k, p] of r.pts.entries()) k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
      g.stroke();
    }
  };
  const wood: C3 = faded ? [196, 172, 136] : [168, 132, 90];
  deck(2.4 + lw * 2, sh(wood, 0.55));
  deck(2.4, wood);
  g.lineCap = "round";
  g.lineJoin = "round";
  drawWalls();
  hard(body);
  if (style === "terrain" || style === "map") speckle(body, s, style === "map" ? 0.3 : 0.5);
  return { body, shadow };
}
