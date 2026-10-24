// Eager, tiny: wires Azgaar's layer and zoom events to the pixel map, which loads (with PixiJS) on first draw
import { Layers } from "@/components/layers";
import { applyLabelZoom } from "./label-zoom";
import { setPixelMapDimmer, setPixelMapSync } from "./pixel-map-sync";
import { snapAll, stackAll } from "./units";

type PixelMapModule = typeof import("./pixel-map")["PixelMapLayer"];

let loaded: PixelMapModule | null = null;
let loading: Promise<PixelMapModule> | null = null;

const load = (): Promise<PixelMapModule> => {
  loading ??= import("./pixel-map").then(m => {
    loaded = m.PixelMapLayer;
    const map = loaded;
    setPixelMapSync(() => {
      map.sync();
      applyLabelZoom();
    });
    setPixelMapDimmer(map.dim);
    return loaded;
  });
  return loading;
};

Layers.onDraw(ids => {
  if (ids.includes("labels")) applyLabelZoom();
  if (ids.includes("military") && Layers.isOn("military")) {
    if (snapAll())
      queueMicrotask(() => Layers.draw("military")); // every regiment stands at its cell's centre
    else stackAll();
  }
  void load().then(map => map.drawn(ids));
});
Layers.subscribe(() => loaded?.toggled());
