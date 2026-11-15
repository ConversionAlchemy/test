// Sizes shared by the map's pixel art: unit cards and settlement symbols are drawn at the same pixel size
import type { Rank } from "./settlement-size";

/** Screen pixels per art pixel, at every zoom */
export const ART_PX = 2;

/** A settlement symbol's side in art pixels; citadels and capitals have a 2 px border */
export const SYMBOL: Record<Rank | "capital", number> = { village: 5, town: 9, city: 11, citadel: 11, capital: 13 };
export const SYMBOL_BOX = 15; // the largest: every symbol is drawn in a box this size

/** Garrison and cargo pips: 3×3 art pixels, up to 4 */
export const PIP = 3;
export const MAX_PIPS = 4;
