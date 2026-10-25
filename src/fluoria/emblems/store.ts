// A pixel emblem is kept as one tiny lossless PNG in the map's custom icons; the nation's coat of arms points at it
import { CustomIcons, IMAGE_FRAME } from "@/components/icons";
import { Layers } from "@/components/layers";
import { EmblemRenderer } from "@/renderers/emblems/renderer";
import { fluoriaEmblems, frame, SIZE } from "./art";

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

/** Every nation named like a Fluoria nation and still without pixel art gets its emblem */
export function applyFluoriaEmblems(): number {
  const art = fluoriaEmblems();
  let applied = 0;
  for (const state of pack.states) {
    if (!state.i || state.removed || CustomIcons.get(iconId(state.i))) continue;
    const px = art.get(state.name.trim().toLowerCase());
    if (!px) continue;
    setEmblem(state.i, px, false);
    applied++;
  }
  if (applied) Layers.draw("emblems");
  return applied;
}
