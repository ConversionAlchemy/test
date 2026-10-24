// Deterministic hash noise: the same pixel always gets the same variant, so nothing flickers on redraw

/** Integer hash of a grid position to [0, 1) */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1), features roughly `scale` pixels apart */
export function valueNoise(x: number, y: number, scale: number, seed = 0): number {
  const fx = x / scale;
  const fy = y / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = smooth(fx - ix);
  const ty = smooth(fy - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** Fractal value noise: octaves halve in scale and weight */
export function fbm(x: number, y: number, scale: number, octaves = 3, seed = 0): number {
  let sum = 0;
  let weight = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x, y, scale, seed + o * 101) * weight;
    total += weight;
    weight /= 2;
    scale /= 2;
  }
  return sum / total;
}

/** Small seeded generator for one-off stamps */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
