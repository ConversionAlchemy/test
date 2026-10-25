// A pixel emblem is kept as one tiny lossless PNG in the map's custom icons; the nation's coat of arms points at it
import { CustomIcons, IMAGE_FRAME } from "@/components/icons";
import { Layers } from "@/components/layers";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { fluoriaEmblems, frame, SIZE } from "./art";
import { randomEmblem } from "./patterns";

export const iconId = (stateId: number) => `custom-px-s${stateId}`;

export function toPng(px: string[]): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  px.forEach((colour, i) => {
    ctx.fillStyle = colour;
    ctx.fillRect(i % SIZE, Math.floor(i / SIZE), 1, 1);
  });
  return canvas.toDataURL("image/png");
}

export function fromPng(url: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0, SIZE, SIZE);
      const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
      const px: string[] = [];
      for (let i = 0; i < data.length; i += 4)
        px.push(`#${[data[i], data[i + 1], data[i + 2]].map(v => v.toString(16).padStart(2, "0")).join("")}`);
      resolve(frame(px));
    };
    image.onerror = reject;
    image.src = url;
  });
}

/** The nation's pixel emblem, if it has one */
export function emblemOf(stateId: number): Promise<string[]> | null {
  const icon = CustomIcons.get(iconId(stateId));
  return icon ? fromPng(icon.content) : null;
}

/** Save pixels into a nation: its coat of arms becomes the picture, square, unshielded */
export function setEmblem(stateId: number, px: string[], redraw = true): void {
  const state = pack.states[stateId];
  if (!state) return;
  const id = iconId(stateId);
  const content = toPng(frame(px.slice()));
  if (CustomIcons.get(id)) CustomIcons.update(id, { content });
  else CustomIcons.add({ id, kind: "image", content, viewBox: IMAGE_FRAME });
  const { size, x, y } = state.coa ?? {};
  state.coa = { icon: id, size, x, y };
  if (!redraw) return;
  EmblemRenderer.remove(`stateCOA${stateId}`);
  void EmblemRenderer.trigger(`stateCOA${stateId}`, state.coa);
  Layers.draw("emblems");
}

/** Every nation still without pixel art gets one, once: its Fluoria emblem by name, else one made from its colour */
export function applyFluoriaEmblems(): number {
  const art = fluoriaEmblems();
  let applied = 0;
  for (const state of pack.states) {
    const own = state.coa && "icon" in state.coa && state.coa.icon === iconId(state.i);
    if (!state.i || state.removed || (own && CustomIcons.get(iconId(state.i)))) continue;
    const seed = state.i * 7919 + (Number(String(options.map.seed).slice(-6)) || 0);
    const px = art.get(state.name.trim().toLowerCase()) ?? randomEmblem(state.color?.slice(0, 7) ?? "", seed);
    setEmblem(state.i, px, false);
    applied++;
  }
  if (applied) Layers.draw("emblems");
  return applied;
}

/** Emblems made before every one carried a charge: a bare field is made again, once */
export async function enrichPlainEmblems(): Promise<number> {
  let made = 0;
  for (const state of pack.states) {
    if (!state.i || state.removed || !(state.coa && "icon" in state.coa && state.coa.icon === iconId(state.i)))
      continue;
    const icon = CustomIcons.get(iconId(state.i));
    if (!icon) continue;
    const px = await fromPng(icon.content).catch(() => null);
    if (!px) continue;
    const inner = new Set(px.filter((_, k) => k % SIZE && k % SIZE !== SIZE - 1 && k >= SIZE && k < SIZE * (SIZE - 1)));
    if (inner.size > 1) continue;
    const seed = state.i * 7919 + (Number(String(options.map.seed).slice(-6)) || 0) + 1;
    setEmblem(state.i, randomEmblem(state.color?.slice(0, 7) ?? "", seed), false);
    made++;
  }
  if (made) Layers.draw("emblems");
  return made;
}
