import { Palette, type RGB } from "./palette";

export const Terrain = {
  DeepWater: 0,
  Water: 1,
  Sand: 2,
  Grass: 3,
  Forest: 4,
  Hills: 5,
  Mountains: 6,
  Farmland: 7,
  Marsh: 8,
  Dirt: 9,
  Cobbles: 10,
  River: 11,
  DryGrass: 12,
  Desert: 13,
  Taiga: 14,
  Jungle: 15,
  Tundra: 16,
  Snow: 17
} as const;

export type TerrainId = (typeof Terrain)[keyof typeof Terrain];

interface TerrainInfo {
  id: TerrainId;
  name: string;
  water: boolean;
  swatch: RGB; // brush colour in the toolbar
}

export const TERRAINS: readonly TerrainInfo[] = [
  { id: Terrain.DeepWater, name: "Deep water", water: true, swatch: Palette.deep },
  { id: Terrain.Water, name: "Water", water: true, swatch: Palette.water2 },
  { id: Terrain.Sand, name: "Sand", water: false, swatch: Palette.sand },
  { id: Terrain.Grass, name: "Grass", water: false, swatch: Palette.g2 },
  { id: Terrain.Forest, name: "Forest", water: false, swatch: Palette.tree },
  { id: Terrain.Hills, name: "Hills", water: false, swatch: Palette.g4 },
  { id: Terrain.Mountains, name: "Mountains", water: false, swatch: Palette.stone },
  { id: Terrain.Farmland, name: "Farmland", water: false, swatch: Palette.field1 },
  { id: Terrain.Marsh, name: "Marsh", water: false, swatch: Palette.g3 },
  { id: Terrain.Dirt, name: "Dirt road", water: false, swatch: Palette.dirt3 },
  { id: Terrain.Cobbles, name: "Cobbles", water: false, swatch: Palette.cob1 },
  { id: Terrain.River, name: "River", water: true, swatch: Palette.water },
  { id: Terrain.DryGrass, name: "Dry grass", water: false, swatch: Palette.field2 },
  { id: Terrain.Desert, name: "Desert", water: false, swatch: Palette.sand2 },
  { id: Terrain.Taiga, name: "Taiga", water: false, swatch: Palette.tree2 },
  { id: Terrain.Jungle, name: "Jungle", water: false, swatch: Palette.tree3 },
  { id: Terrain.Tundra, name: "Tundra", water: false, swatch: Palette.stone3 },
  { id: Terrain.Snow, name: "Snow", water: false, swatch: Palette.snow }
];

export const isWater = (t: number): boolean => t === Terrain.DeepWater || t === Terrain.Water || t === Terrain.River;

/** Sea and lakes: what beaches and surf form against. Rivers are water but get neither */
export const isOpenWater = (t: number): boolean => t === Terrain.DeepWater || t === Terrain.Water;

/** Thin painted lines that must stay unbroken, so edges never borrow into or out of them */
export const isLine = (t: number): boolean => t === Terrain.Dirt || t === Terrain.Cobbles || t === Terrain.River;

// Overlays sit on top of any ground (FLUORIA.md › Layers, not combinations)
export const Overlay = { None: 0, Scorch: 1, Blood: 2, Rubble: 3, Crater: 4 } as const;
export type OverlayId = (typeof Overlay)[keyof typeof Overlay];

export const OVERLAYS: readonly { id: OverlayId; name: string; swatch: RGB }[] = [
  { id: Overlay.Scorch, name: "Scorch", swatch: Palette.scorch },
  { id: Overlay.Blood, name: "Blood", swatch: Palette.blood },
  { id: Overlay.Rubble, name: "Rubble", swatch: Palette.cob3 },
  { id: Overlay.Crater, name: "Crater", swatch: Palette.crater }
];
