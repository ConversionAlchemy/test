// Eager, tiny: wires Azgaar's layer and zoom events to the pixel map, which loads (with PixiJS) on first draw
import { Layers } from "@/components/layers";
import { setPixelMapSync } from "./pixel-map-sync";

type PixelMapModule = typeof import("./pixel-map")["PixelMapLayer"];

let loaded: PixelMapModule | null = null;
let loading: Promise<PixelMapModule> | null = null;

const load = (): Promise<PixelMapModule> => {
  loading ??= import("./pixel-map").then(m => {
    loaded = m.PixelMapLayer;
    setPixelMapSync(loaded.sync);
    return loaded;
  });
  return loading;
};

Layers.onDraw(ids => void load().then(map => map.drawn(ids)));
Layers.subscribe(() => loaded?.toggled());
