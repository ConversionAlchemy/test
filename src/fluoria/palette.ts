// The one palette every Fluoria view draws from (FLUORIA.md › Palette)
export type RGB = readonly [number, number, number];

export const Palette = {
  deep: [46, 74, 112],
  water: [58, 92, 132],
  water2: [66, 102, 142],
  foam: [132, 168, 196],
  sand: [196, 182, 134],
  sand2: [178, 164, 118],
  g1: [92, 124, 62],
  g2: [104, 138, 70],
  g3: [82, 112, 56],
  g4: [120, 152, 80],
  dirt: [138, 110, 74],
  dirt2: [120, 94, 62],
  dirt3: [156, 128, 88],
  cob1: [150, 146, 136],
  cob2: [132, 128, 120],
  cob3: [166, 162, 150],
  gap: [88, 84, 80],
  clay: [156, 82, 60],
  clay2: [128, 64, 48],
  clay3: [176, 102, 74],
  slate: [80, 88, 108],
  slate2: [64, 70, 88],
  slate3: [98, 106, 126],
  thatch: [178, 150, 94],
  thatch2: [150, 124, 74],
  thatch3: [196, 172, 112],
  stone: [124, 120, 112],
  stone2: [100, 96, 90],
  stone3: [146, 142, 132],
  snow: [228, 230, 232],
  tree: [60, 94, 50],
  tree2: [44, 72, 40],
  tree3: [82, 118, 62],
  field1: [176, 160, 90],
  field2: [150, 150, 78],
  field3: [130, 146, 70],
  wood: [118, 86, 56],
  wood2: [92, 66, 42],
  gold: [214, 172, 60],
  gold2: [166, 126, 36],
  blood: [128, 22, 26],
  blood2: [92, 14, 18],
  scorch: [56, 48, 42],
  crater: [48, 40, 34],
  ink: [36, 32, 38],
  paper: [236, 230, 214],
  night: [14, 13, 15]
} as const satisfies Record<string, RGB>;

export type Swatch = keyof typeof Palette;

export const shade = (c: RGB, f: number): RGB => [clamp(c[0] * f), clamp(c[1] * f), clamp(c[2] * f)];

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  clamp(a[0] + (b[0] - a[0]) * t),
  clamp(a[1] + (b[1] - a[1]) * t),
  clamp(a[2] + (b[2] - a[2]) * t)
];

/** RGBA packed for a little-endian Uint32Array over ImageData */
export const packRGB = (c: RGB): number => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;

export const css = (c: RGB): string => `rgb(${c[0]},${c[1]},${c[2]})`;

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}
