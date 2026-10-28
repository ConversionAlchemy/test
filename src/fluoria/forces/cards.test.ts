import { describe, expect, it } from "vitest";
import { CARD_H, CARD_W, cardGrid, frame, HEALTH, MAX_STRIPS, pilePixels, pileSize } from "./cards";
import KIT from "./kit.json";

const unit = (id: string) => KIT.find(k => k.id === id) as unknown as Parameters<typeof cardGrid>[0] & { id: string };

describe("cards", () => {
  it("tells the domain by the frame: land square, air top corners clipped, sea bottom ones", () => {
    expect(frame("land")[0][0]).toBe(1);
    expect(frame("air")[0][0]).toBe(0);
    expect(frame("air")[CARD_H - 1][0]).toBe(1);
    expect(frame("naval")[CARD_H - 1][0]).toBe(0);
    expect(frame("naval")[0][0]).toBe(1);
  });

  it("gives every unit type its own symbol", () => {
    const seen = new Set<string>();
    for (const k of KIT) {
      const key = cardGrid(unit(k.id))
        .map(row => row.join(""))
        .join("|");
      expect(seen.has(key), k.id).toBe(false);
      seen.add(key);
    }
  });

  it("piles show the cards under the top one as strips, one health line under all and pips on top", () => {
    const pile = { unit: unit("land_infantry_t1"), colour: "#336699", count: 3, health: 0.5, pips: 2 };
    const size = pileSize(pile);
    expect(size).toEqual({ w: CARD_W, h: 3 + CARD_H + 4 + 1, mid: 3 + CARD_H / 2 });
    const pixels = pilePixels(pile);
    const bar = pixels[size.h - 1];
    expect(bar[0]).toBe(HEALTH.hurt);
    expect(bar[CARD_W - 1]).toBe(HEALTH.lost);
    expect(pixels[1].filter(c => c === "#336699").length).toBe(2); // two pips' centres
    expect(pileSize({ count: 50, pips: 0 }).h).toBe(CARD_H + MAX_STRIPS * 2 + 1);
  });
});
