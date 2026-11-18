// The city view on its own page: the map's camera steps, its label placement and its vertex walk for district
// outlines, over the generated city in terrain or map style
import { connectVertices } from "@/utils/pathUtils";
import { fitView, snap, stepZoom, type View, zoomAround } from "../camera";
import { type MapLabel, placeLabels } from "../labels";
import { furnish, paint, TYPE_INK } from "./city-draw";
import { buildCity, type City, type P2, type Region } from "./city-gen";

const KIND_NAME: Record<string, string> = {
  centre: "City centre",
  wealthy: "Wealthy quarter",
  old: "Old town",
  docks: "Docks",
  shanty: "Shanty town",
  square: "Square",
  park: "Park",
  pond: "Pond",
  woods: "Woods",
  wheat: "Wheat",
  tilled: "Ploughed field",
  pasture: "Pasture",
  water: "Water"
};

// tiers as on the region map: from which zoom a kind shows, its size at zoom 1, and who gives way
const TIERS: Record<string, { min: number; px: number; rank: number; cls: string }> = {
  city: { min: 0, px: 26, rank: 0, cls: "city" },
  dist: { min: 0, px: 15, rank: 1, cls: "dist" },
  land: { min: 2, px: 12, rank: 2, cls: "land" },
  main: { min: 2, px: 11, rank: 3, cls: "road" },
  square: { min: 2, px: 11, rank: 4, cls: "land" },
  street: { min: 3, px: 10, rank: 5, cls: "road" },
  bld: { min: 4, px: 10, rank: 6, cls: "bld" }
};

export function mountCity(root: HTMLElement, region: Region, burg: string): City {
  const city = buildCity(region, burg);
  furnish(city);
  const painted = paint(city);
  const { W, H, pack } = city;
  const { cells, vertices } = pack;

  const world = document.createElement("canvas");
  world.width = W;
  world.height = H;
  const wctx = world.getContext("2d") as CanvasRenderingContext2D;
  let style: "terrain" | "map" = "terrain";
  const show = () => wctx.putImageData(style === "terrain" ? painted.terrain : painted.map, 0, 0);
  show();

  root.innerHTML = `<canvas class="cvMap"></canvas><svg class="cvOver"></svg><svg class="cvLab"></svg>
<div class="cvBar"><button data-s="terrain" class="on">Terrain</button><button data-s="map">Map</button></div><div class="cvTip"></div>`;
  const cv = root.querySelector(".cvMap") as HTMLCanvasElement;
  const over = root.querySelector(".cvOver") as SVGSVGElement;
  const lab = root.querySelector(".cvLab") as SVGSVGElement;
  const tip = root.querySelector(".cvTip") as HTMLDivElement;
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
  const NS = "http://www.w3.org/2000/svg";

  // district outlines by the map's own vertex walk, so a district lights up whole
  const outline = (set: Set<number>) => {
    const done = new Set<number>();
    let d = "";
    for (const i of set) {
      if (done.has(i) || !cells.c[i].some((j: number) => !set.has(j))) continue;
      const start = cells.v[i].find((v: number) => vertices.c[v].some((c: number) => !set.has(c)));
      if (start === undefined) continue;
      const chain = connectVertices({
        vertices,
        startingVertex: start,
        ofSameType: c => set.has(c),
        addToChecked: c => done.add(c),
        closeRing: true
      });
      d += `M${chain.map(v => vertices.p[v].join(",")).join("L")}Z`;
    }
    return d;
  };
  const distPath = city.districts.map(D => outline(new Set(D.cells)));

  // labels
  const labels: (MapLabel & { tier: string; r?: number })[] = [];
  const mean = (L: number[]): P2 => [
    L.reduce((s, i) => s + cells.p[i][0], 0) / L.length,
    L.reduce((s, i) => s + cells.p[i][1], 0) / L.length
  ];
  const add = (id: string, text: string, [x, y]: P2, tier: string, r?: number) => {
    const t = TIERS[tier];
    labels.push({ id, text, x, y, priority: 100 - t.rank * 10, size: t.px, minZoom: t.min, tier, r });
  };
  for (const D of city.districts) if (D.cells.length) add(`d${D.id}`, D.name, mean(D.cells), "dist");
  add("sq", "Coin Square", cells.p[city.squareCell], "square");
  for (let i = 0; i < cells.p.length; i++) {
    if (city.kind[i] === "park") add(`p${i}`, "Ledger Gardens", cells.p[i], "square");
    if (city.kind[i] === "pond") add(`w${i}`, "Mint Pond", cells.p[i], "square");
    if (city.kind[i] === "square" && i !== city.squareCell) add(`m${i}`, "Fish Market", cells.p[i], "square");
  }
  for (const b of city.buildings)
    if (b.name) {
      const c: P2 = [b.poly.reduce((s, p) => s + p[0], 0) / 4, b.poly.reduce((s, p) => s + p[1], 0) / 4];
      add(`b${b.id}`, b.name, [c[0], c[1] + (b.landmark ? 15 : 8)], b.landmark ? "land" : "bld");
    }
  city.roads.forEach((r, k) => {
    if (!r.name) return;
    const tier = r.type === "main" ? "main" : "street";
    const every = r.type === "main" ? 70 : 9999;
    let acc = every * 0.6;
    for (let i = 1; i < r.pts.length; i++) {
      acc += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
      if (acc < every && !(r.type !== "main" && i === Math.floor(r.pts.length / 2))) continue;
      acc = 0;
      const a = r.pts[Math.max(0, i - 2)];
      const b = r.pts[Math.min(r.pts.length - 1, i + 2)];
      let an = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      if (an > 90) an -= 180;
      if (an < -90) an += 180;
      add(`r${k}_${i}`, r.name, r.pts[i], tier, an);
    }
  });
  const els = new Map<string, SVGTextElement>();
  for (const l of labels) {
    const t = document.createElementNS(NS, "text");
    t.textContent = l.text;
    t.setAttribute("class", TIERS[l.tier].cls);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    lab.appendChild(t);
    els.set(l.id, t);
  }
  const mc = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;

  let view: View = { x: 0, y: 0, zoom: 1 };
  const clamp = (v: View): View => {
    const sw = root.clientWidth;
    const shh = root.clientHeight;
    const x = Math.min(0, Math.max(sw - W * v.zoom, v.x));
    const y = Math.min(0, Math.max(shh - H * v.zoom, v.y));
    return snap({
      x: W * v.zoom < sw ? (sw - W * v.zoom) / 2 : x,
      y: H * v.zoom < shh ? (shh - H * v.zoom) / 2 : y,
      zoom: v.zoom
    });
  };
  const draw = () => {
    cv.width = root.clientWidth;
    cv.height = root.clientHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#141412";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(world, view.x, view.y, W * view.zoom, H * view.zoom);
    over.setAttribute("viewBox", `0 0 ${cv.width} ${cv.height}`);
    lab.setAttribute("viewBox", `0 0 ${cv.width} ${cv.height}`);
    const g = over.querySelector("g");
    if (g) g.setAttribute("transform", `translate(${view.x},${view.y}) scale(${view.zoom})`);
    const size = (l: MapLabel) => Math.max(l.size * 0.9, Math.min(l.size * 1.6, l.size * Math.sqrt(view.zoom / 2)));
    const shown = placeLabels(labels, view, { width: cv.width, height: cv.height }, l => {
      const px = size(l);
      mc.font = `italic ${px}px "IM Fell English"`;
      const w = mc.measureText(l.text).width * ((l as unknown as { tier: string }).tier === "dist" ? 1.3 : 1);
      const a = (((l as { r?: number }).r ?? 0) * Math.PI) / 180;
      return {
        width: Math.abs(w * Math.cos(a)) + Math.abs(px * Math.sin(a)),
        height: Math.abs(w * Math.sin(a)) + Math.abs(px * Math.cos(a))
      };
    });
    const seen = new Set<string>();
    for (const l of labels) {
      const t = els.get(l.id) as SVGTextElement;
      const key = `${l.text}|${l.tier}`;
      if (!shown.has(l.id) || (l.tier !== "main" && seen.has(key))) {
        t.style.display = "none";
        continue;
      }
      seen.add(key);
      const x = view.x + l.x * view.zoom;
      const y = view.y + l.y * view.zoom;
      const px = size(l);
      t.style.display = "";
      t.setAttribute("x", `${x}`);
      t.setAttribute("y", `${y}`);
      t.setAttribute("font-size", `${px}`);
      t.setAttribute("stroke-width", `${px * 0.22}`);
      const r = (l as { r?: number }).r;
      t.setAttribute("transform", r ? `rotate(${r} ${x} ${y})` : "");
    }
  };
  // the view always covers the screen: below the first whole step it scales smoothly, like the region map's far zoom
  const minZoom = () => Math.max(root.clientWidth / W, root.clientHeight / H);
  const fitToScreen = () => {
    const f = fitView(W, H, root.clientWidth, root.clientHeight);
    view = clamp({ ...f, zoom: minZoom() });
    draw();
  };

  // hover: a building, else the whole district under the cell, else the cell
  over.innerHTML = `<g><path class="hl"></path></g>`;
  const hl = over.querySelector(".hl") as SVGPathElement;
  root.addEventListener("pointermove", e => {
    if (drag) return;
    const r = root.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - view.x) / view.zoom);
    const y = Math.floor((e.clientY - r.top - view.y) / view.zoom);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const j = y * W + x;
    const bid = painted.BID[j];
    const ci = painted.CID[j];
    let html = "";
    if (bid) {
      const b = city.buildings[bid - 1];
      hl.setAttribute("d", `M${b.poly.map(p => p.join(",")).join("L")}Z`);
      hl.setAttribute("class", "hl b");
      const D = b.district !== undefined && b.district >= 0 ? city.districts[b.district].name : "";
      html = `<b>${b.name ?? b.type}</b><i>${b.name ? `${b.type} · ` : ""}${b.addr}</i>${D ? `<i>${D}</i>` : ""}${b.enter ? "<s>Enter</s>" : ""}`;
    } else if (ci >= 0 && city.district[ci] >= 0) {
      const D = city.districts[city.district[ci]];
      hl.setAttribute("d", distPath[D.id]);
      hl.setAttribute("class", "hl d");
      html = `<b>${D.name}</b><i>${KIND_NAME[city.kind[ci] ?? ""] ?? ""}</i>`;
    } else if (ci >= 0 && city.home[ci]) {
      hl.setAttribute("d", `M${cells.v[ci].map((v: number) => vertices.p[v].join(",")).join("L")}Z`);
      hl.setAttribute("class", "hl c");
      html = `<b>${KIND_NAME[city.use[ci]] ?? city.use[ci]}</b>`;
    } else {
      hl.setAttribute("d", "");
      tip.style.display = "none";
      return;
    }
    tip.innerHTML = html;
    tip.style.display = "block";
    tip.style.left = `${Math.min(e.clientX - r.left + 14, root.clientWidth - tip.offsetWidth - 6)}px`;
    tip.style.top = `${e.clientY - r.top + 14}px`;
  });
  root.addEventListener("pointerleave", () => {
    tip.style.display = "none";
    hl.setAttribute("d", "");
  });
  let drag: { x: number; y: number; v: View } | null = null;
  root.addEventListener("pointerdown", e => {
    if ((e.target as HTMLElement).closest(".cvBar")) return;
    drag = { x: e.clientX, y: e.clientY, v: view };
    root.setPointerCapture(e.pointerId);
    tip.style.display = "none";
  });
  root.addEventListener("pointermove", e => {
    if (!drag) return;
    view = clamp({ x: drag.v.x + e.clientX - drag.x, y: drag.v.y + e.clientY - drag.y, zoom: view.zoom });
    draw();
  });
  root.addEventListener("pointerup", () => {
    drag = null;
  });
  root.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      const r = root.getBoundingClientRect();
      const z = Math.max(minZoom(), stepZoom(view.zoom, e.deltaY < 0 ? 1 : -1));
      view = clamp(zoomAround(view, e.clientX - r.left, e.clientY - r.top, z));
      draw();
    },
    { passive: false }
  );
  for (const b of root.querySelectorAll<HTMLButtonElement>(".cvBar button"))
    b.onclick = () => {
      style = b.dataset.s as "terrain" | "map";
      root.dataset.style = style;
      for (const o of root.querySelectorAll(".cvBar button")) o.classList.toggle("on", o === b);
      show();
      draw();
    };
  addEventListener("resize", fitToScreen);
  document.fonts.ready.then(fitToScreen);
  fitToScreen();
  (window as unknown as { cityView: unknown }).cityView = {
    city,
    view: (z: number, x: number, y: number) => {
      view = clamp(snap({ zoom: z, x: root.clientWidth / 2 - x * z, y: root.clientHeight / 2 - y * z }));
      draw();
    }
  };
  void TYPE_INK;
  return city;
}
