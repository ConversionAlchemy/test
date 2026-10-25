// The one palette every Fluoria view draws from (FLUORIA.md › Palette)
export type RGB = readonly [number, number, number];

export const Palette = {
  deep: [28, 54, 94],
  water: [34, 63, 106],
  water2: [42, 74, 120],
  foam: [120, 150, 178],
  sand: [222, 206, 150],
  sand2: [204, 186, 130],
  g1: [176, 180, 104],
  g2: [192, 192, 116],
  g3: [160, 168, 94],
  g4: [206, 200, 128],
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
  stone: [140, 130, 116],
  stone2: [112, 104, 94],
  stone3: [168, 160, 146],
  snow: [228, 230, 232],
  tree: [82, 122, 56],
  tree2: [58, 94, 44],
  tree3: [112, 152, 70],
  field1: [214, 186, 120],
  field2: [198, 178, 110],
  field3: [184, 174, 100],
  wood: [118, 86, 56],
  wood2: [92, 66, 42],
  gold: [214, 172, 60],
  gold2: [166, 126, 36],
  blood: [128, 22, 26],
  blood2: [92, 14, 18],
  scorch: [56, 48, 42],
  crater: [48, 40, 34],
  ink: [36, 32, 38],
  atlas: [204, 226, 240],
  atlas2: [196, 220, 237],
  atlasCoast: [64, 104, 150],
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
