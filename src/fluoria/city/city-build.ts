// Buildings drawn as shapes, then snapped back to hard pixels at the zoom they are seen at: neat edges at every distance,
// still the pixel look. Far out a terrace reads as one block; close in every house has its own outline
import { connectVertices } from "@/utils/pathUtils";
import { Palette as P } from "../palette";
import { TYPE_INK } from "./city-draw";
import type { Building, City, P2 } from "./city-gen";

type C3 = readonly [number, number, number];
const sh = (c: C3, f: number): C3 => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
const mix = (a: C3, b: C3, t: number): C3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];
const hex = (h: string): C3 => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16)
];
const css = (c: C3) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const ROOF: Record<string, [C3, C3, C3]> = {
  slate: [P.slate3, P.slate, P.slate2],
  clay: [P.clay3, P.clay, P.clay2],
  thatch: [P.thatch3, P.thatch, P.thatch2],
  gold: [P.gold, P.gold2, sh(P.gold2, 0.68)],
  stone: [P.stone3, P.stone, P.stone2],
  timber: [P.wood, P.wood2, sh(P.wood2, 0.72)]
};
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
  return inset(poly, 3);
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
  const joined = s < 4;
  const shapes = new Map<number, P2[]>();
  for (const b of city.buildings) shapes.set(b.id, b.landmark ? landmarkShape(city, b) : b.poly);

  const paper: C3 = [236, 228, 208];
  const look = (b: Building): { pal: [C3, C3, C3]; flat: boolean } => {
    const ink = TYPE_INK[b.type];
    if (style === "terrain") return { pal: ROOF[b.roof] ?? ROOF.clay, flat: false };
    if (style === "factions") {
      const f = b.owner !== undefined ? city.factions[b.owner] : undefined;
      if (!f)
        return {
          pal: [
            [214, 206, 190],
            [214, 206, 190],
            [150, 142, 128]
          ],
          flat: true
        };
      const c = hex(f.col);
      return { pal: [mix(c, paper, 0.25), mix(c, paper, 0.25), sh(c, 0.55)], flat: true };
    }
    if (style === "districts") {
      if (ink) return { pal: [hex(ink), hex(ink), sh(hex(ink), 0.6)], flat: true };
      return {
        pal: [
          [196, 186, 168],
          [196, 186, 168],
          [116, 106, 92]
        ],
        flat: true
      };
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

  // shadows to the lower right
  gs.fillStyle = "#000";
  for (const [, poly] of shapes) {
    if (poly.length < 3) continue;
    pathOf(
      gs,
      poly.map(p => [p[0] + 1.4, p[1] + 1.4] as P2)
    );
    gs.fill();
  }
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
  hard(body);
  hard(shadow);
  return { body, shadow };
}
