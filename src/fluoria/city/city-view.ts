// The city view on its own page with its editor: the map's camera steps, label placement, vertex walk for outlines
// and pathfinding, over the generated city in terrain or map style. Edits are laid over the generated city and kept
import { connectVertices, findPath } from "@/utils/pathUtils";
import { snap, type View, zoomAround } from "../camera";
import { type MapLabel, placeLabels } from "../labels";
import { renderBuildings, type Style } from "./city-build";
import { DIST_COL, furnish, mapTile, type Painted, paint, terrainTile } from "./city-draw";
import { buildCity, type City, type Edits, type Kind, type P2, type Region, type Road } from "./city-gen";

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
const PAINTS = [
  "centre",
  "old",
  "wealthy",
  "docks",
  "shanty",
  "square",
  "park",
  "pond",
  "wheat",
  "tilled",
  "pasture",
  "woods",
  "water"
];
const LTYPES = ["Bank", "Guardhouse", "Chapel", "Guild hall", "Tavern", "Office", "Market", "Landmark"];
const ROOFS = ["gold", "slate", "clay", "stone", "timber", "thatch"];
const RTYPES: Road["type"][] = ["main", "street", "lane", "pier", "track"];
const RNAME: Record<string, string> = { main: "Main", street: "Street", lane: "Lane", pier: "Pier", track: "Track" };

// tiers as on the region map: from which zoom a kind shows, its size, and who gives way
const TIERS: Record<string, { min: number; px: number; rank: number; cls: string }> = {
  dist: { min: 0, px: 17, rank: 0, cls: "dist" },
  fac: { min: 0, px: 15, rank: 0, cls: "fac" },
  land: { min: 2.6, px: 13, rank: 1, cls: "land" },
  gate: { min: 3, px: 12, rank: 2, cls: "gate" },
  main: { min: 2.8, px: 13, rank: 3, cls: "road main" },
  square: { min: 3.2, px: 12, rank: 4, cls: "land" },
  street: { min: 4.2, px: 11.5, rank: 5, cls: "road" },
  bld: { min: 5.5, px: 11, rank: 6, cls: "bld" }
};
type Label = MapLabel & { tier: string; road?: P2[] };

const PANEL = `
<div class="zone"><div class="tabs" data-g="style"><button data-v="terrain">Terrain</button><button data-v="map">Map</button><button data-v="districts">Districts</button><button data-v="factions">Factions</button></div></div>
<div class="zone"><div class="g4" data-g="tool">
<button data-v="inspect">Inspect</button><button data-v="paint">Paint</button><button data-v="district">District</button><button data-v="faction">Faction</button>
<button data-v="landmark">Landmark</button><button data-v="road">Road</button><button data-v="erase">Erase</button></div></div>
<div class="zone zc" data-pane></div>
<div class="zone"><div class="g3"><button data-a="reroll">Reroll</button><button data-a="reset">Reset</button><button data-a="export">Export for AI</button></div>
<textarea class="tbox" data-out hidden readonly></textarea></div>`;

export function mountCity(root: HTMLElement, region: Region, burg: string): void {
  const STORE = `fl-city-${burg}`;
  let edits: Edits = {};
  try {
    edits = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Edits;
  } catch {
    edits = {};
  }
  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify(edits));
    } catch {
      /* the view still works without storage */
    }
  };

  root.innerHTML = `<div class="cvStage"><canvas class="cvMap"></canvas><svg class="cvOver"><g><path class="sel"></path><path class="hl"></path><path class="hl2"></path></g></svg><svg class="cvLab"><defs></defs></svg><div class="cvTip"></div><div class="cvKey"></div></div><aside class="cvSide">${PANEL}</aside>`;
  const stage = root.querySelector(".cvStage") as HTMLDivElement;
  const side = root.querySelector(".cvSide") as HTMLElement;
  const pane = side.querySelector("[data-pane]") as HTMLDivElement;
  const cv = stage.querySelector(".cvMap") as HTMLCanvasElement;
  const over = stage.querySelector(".cvOver") as SVGSVGElement;
  const lab = stage.querySelector(".cvLab") as SVGSVGElement;
  const defs = lab.querySelector("defs") as SVGDefsElement;
  const tip = stage.querySelector(".cvTip") as HTMLDivElement;
  const hl = over.querySelector(".hl") as SVGPathElement;
  const hl2 = over.querySelector(".hl2") as SVGPathElement;
  const selP = over.querySelector(".sel") as SVGPathElement;
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
  const NS = "http://www.w3.org/2000/svg";
  const world = document.createElement("canvas");
  const wctx = world.getContext("2d") as CanvasRenderingContext2D;
  const mc = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;

  let city: City;
  let painted: Painted;
  let style: Style = "terrain";
  let curFaction = 0;
  let detail: { s: number; style: Style; body: HTMLCanvasElement; shadow: HTMLCanvasElement } | null = null;
  let detailTimer = 0;
  const groundOf = () =>
    style === "terrain"
      ? painted.terrain
      : style === "map"
        ? painted.map
        : style === "districts"
          ? painted.districts
          : painted.factions;
  const scaleFor = () => Math.max(1, Math.min(5, Math.ceil(view.zoom - 0.15)));
  const ensureDetail = (now = false) => {
    const s = scaleFor();
    if (detail && detail.s === s && detail.style === style) return;
    const make = () => {
      const r = renderBuildings(city, style, s);
      detail = { s, style, ...r };
      draw();
    };
    if (now || !detail || detail.style !== style) make();
    else {
      clearTimeout(detailTimer);
      detailTimer = window.setTimeout(make, 140);
    }
  };
  let tool = "inspect";
  let roadType: Road["type"] = "street";
  let curDistrict = 0;
  let curLandmark = -1;
  let paintKind = "old";
  let roadStart = -1;
  let selected: { kind: string; key: string; label: string; cells?: number[]; d?: string } | null = null;
  let labels: Label[] = [];
  const els = new Map<string, SVGTextElement>();

  const build = () => {
    city = buildCity(region, burg, { edits });
    furnish(city);
    painted = paint(city);
    world.width = city.W;
    world.height = city.H;
    wctx.putImageData(groundOf(), 0, 0);
    detail = null;
    makeLabels();
    renderKey();
  };
  const cellsOf = () => city.pack.cells;
  const outline = (set: Set<number>) => {
    const { cells, vertices } = city.pack;
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

  // ---- labels
  const makeLabels = () => {
    const cells = cellsOf();
    labels = [];
    for (const t of els.values()) t.remove();
    els.clear();
    defs.innerHTML = "";
    const mean = (L: number[]): P2 => [
      L.reduce((s, i) => s + cells.p[i][0], 0) / L.length,
      L.reduce((s, i) => s + cells.p[i][1], 0) / L.length
    ];
    const add = (id: string, text: string, [x, y]: P2, tier: string, road?: P2[]) => {
      const t = TIERS[tier];
      labels.push({ id, text, x, y, priority: 100 - t.rank * 10, size: t.px, minZoom: t.min, tier, road });
    };
    for (const D of city.districts) if (D.cells.length) add(`d${D.id}`, D.name, mean(D.cells), "dist");
    // a faction's name on each sizeable patch it holds
    const seenF = new Uint8Array(cells.p.length);
    for (let i = 0; i < cells.p.length; i++) {
      const f = city.faction[i];
      if (f < 0 || seenF[i]) continue;
      const patch = [i];
      seenF[i] = 1;
      for (let k = 0; k < patch.length; k++)
        for (const j of cells.c[patch[k]])
          if (!seenF[j] && city.faction[j] === f) {
            seenF[j] = 1;
            patch.push(j);
          }
      if (patch.length >= 2) add(`f${i}`, city.factions[f].name, mean(patch), "fac");
    }
    const sq = city.squareCell;
    add("sq", city.edits.names?.["q:sq"] ?? "Coin Square", cells.p[sq], "square");
    for (let i = 0; i < cells.p.length; i++) {
      if (i === sq) continue;
      const k = city.kind[i];
      const nm = city.edits.names?.[`q:${i}`];
      if (k === "park") add(`p${i}`, nm ?? "Ledger Gardens", cells.p[i], "square");
      if (k === "pond") add(`w${i}`, nm ?? "Mint Pond", cells.p[i], "square");
      if (k === "square") add(`m${i}`, nm ?? "Fish Market", cells.p[i], "square");
    }
    for (const b of city.buildings)
      if (b.name) {
        const c: P2 = b.landmark
          ? mean(b.cells ?? [b.cell])
          : [b.poly.reduce((s, p) => s + p[0], 0) / 4, b.poly.reduce((s, p) => s + p[1], 0) / 4];
        add(`b${b.id}`, b.name, [c[0], c[1]], b.landmark ? "land" : "bld");
      }
    for (const g of city.gates) add(`g${g.road}`, g.name, [g.p[0], g.p[1] - 7], "gate");
    city.roads.forEach((r, k) => {
      if (!r.name || r.pts.length < 2) return;
      const tier = r.type === "main" ? "main" : "street";
      const every = r.type === "main" ? 90 : 9999;
      let acc = every * 0.55;
      for (let i = 1; i < r.pts.length; i++) {
        acc += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
        const midStreet = r.type !== "main" && i === Math.floor(r.pts.length / 2);
        if (acc < every && !midStreet) continue;
        acc = 0;
        add(`r${k}_${i}`, r.name, r.pts[i], tier, r.pts);
      }
    });
    for (const l of labels) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("class", TIERS[l.tier].cls);
      // a territory's name in a deep shade of its own colour
      const deep = (h: string) =>
        `rgb(${[1, 3, 5].map(i => Math.round(Number.parseInt(h.slice(i, i + 2), 16) * 0.5)).join(",")})`;
      if (l.tier === "dist") t.dataset.col = deep(DIST_COL[+l.id.slice(1) % DIST_COL.length]);
      if (l.tier === "fac") t.dataset.col = deep(city.factions[city.faction[+l.id.slice(1)]]?.col ?? "#444444");
      if (l.road) {
        const p = document.createElementNS(NS, "path");
        p.id = `lp${l.id}`;
        defs.appendChild(p);
        const tp = document.createElementNS(NS, "textPath");
        tp.setAttribute("href", `#lp${l.id}`);
        tp.setAttribute("startOffset", "50%");
        tp.setAttribute("text-anchor", "middle");
        tp.textContent = l.text;
        t.appendChild(tp);
      } else {
        t.textContent = l.text;
        t.setAttribute("text-anchor", "middle");
      }
      t.setAttribute("dominant-baseline", "middle");
      lab.appendChild(t);
      els.set(l.id, t);
    }
  };
  // the stretch of a road around a label, long enough for its text, drawn left to right
  const roadWindow = (l: Label, worldLen: number): P2[] => {
    const pts = l.road as P2[];
    let i = pts.findIndex(p => p[0] === l.x && p[1] === l.y);
    if (i < 0) i = Math.floor(pts.length / 2);
    const out: P2[] = [pts[i]];
    let a = i;
    let b = i;
    let la = 0;
    let lb = 0;
    while (a > 0 && la < worldLen / 2) {
      la += Math.hypot(pts[a][0] - pts[a - 1][0], pts[a][1] - pts[a - 1][1]);
      out.unshift(pts[--a]);
    }
    while (b < pts.length - 1 && lb < worldLen / 2) {
      lb += Math.hypot(pts[b + 1][0] - pts[b][0], pts[b + 1][1] - pts[b][1]);
      out.push(pts[++b]);
    }
    if (out[0][0] > out[out.length - 1][0]) out.reverse();
    return out;
  };

  // ---- the camera: smooth zoom while scrolling, settling on a whole step once it stops
  let view: View = { x: 0, y: 0, zoom: 1 };
  const minZoom = () => Math.max(stage.clientWidth / city.W, stage.clientHeight / city.H);
  const clamp = (v: View): View => {
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const z = Math.max(minZoom(), Math.min(14, v.zoom));
    const x = Math.min(0, Math.max(sw - city.W * z, v.x));
    const y = Math.min(0, Math.max(sh - city.H * z, v.y));
    return { x: Math.round(x), y: Math.round(y), zoom: z };
  };
  // each view keeps its own labels, the way a themed map does
  const labelMode = (l: Label): "show" | "soft" | "hide" => {
    if (style === "districts") return l.tier === "dist" ? "show" : l.tier === "main" ? "soft" : "hide";
    if (style === "factions") return l.tier === "fac" ? "show" : l.tier === "main" ? "soft" : "hide";
    if (l.tier === "fac") return "hide";
    // the picture keeps to the big names; the reference map names everything
    if (style === "terrain") return l.tier === "street" || l.tier === "bld" ? "hide" : "show";
    return "show";
  };
  const labelSize = (l: Label) =>
    l.size *
    (style === "districts" && l.tier === "dist" ? 1.25 : 1) *
    Math.max(0.85, Math.min(1.5, Math.sqrt(view.zoom / 3)));
  const draw = () => {
    cv.width = stage.clientWidth;
    cv.height = stage.clientHeight;
    ctx.imageSmoothingEnabled = view.zoom < 1.5;
    ctx.fillStyle = "#141412";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(world, view.x, view.y, city.W * view.zoom, city.H * view.zoom);
    if (detail) {
      ctx.globalAlpha = style === "terrain" ? 0.6 : style === "map" ? 0 : 0.25;
      ctx.drawImage(detail.shadow, view.x, view.y, city.W * view.zoom, city.H * view.zoom);
      ctx.globalAlpha = 1;
      ctx.drawImage(detail.body, view.x, view.y, city.W * view.zoom, city.H * view.zoom);
    }
    placeMarks();
    over.setAttribute("viewBox", `0 0 ${cv.width} ${cv.height}`);
    lab.setAttribute("viewBox", `0 0 ${cv.width} ${cv.height}`);
    (over.querySelector("g") as SVGGElement).setAttribute(
      "transform",
      `translate(${view.x},${view.y}) scale(${view.zoom})`
    );
    const width = (l: Label) => {
      const px = labelSize(l);
      mc.font = `${l.tier === "dist" ? "" : "italic "}${px}px "IM Fell English"`;
      return mc.measureText(l.text).width * (l.tier === "dist" ? 1.35 : 1.05);
    };
    const shown = placeLabels(
      labels.filter(l => labelMode(l) !== "hide"),
      view,
      { width: cv.width, height: cv.height },
      l => {
        const lb = l as Label;
        const w = width(lb);
        const px = labelSize(lb);
        if (!lb.road) return { width: w, height: px };
        const win = roadWindow(lb, w / view.zoom + 8);
        const a = win[0];
        const b = win[win.length - 1];
        return {
          width: Math.max(px, Math.abs(b[0] - a[0]) * view.zoom),
          height: Math.max(px, Math.abs(b[1] - a[1]) * view.zoom)
        };
      }
    );
    const seen = new Set<string>();
    for (const l of labels) {
      const t = els.get(l.id) as SVGTextElement;
      const key = `${l.text}|${l.tier}`;
      if (!shown.has(l.id) || (l.tier !== "main" && seen.has(key))) {
        t.style.display = "none";
        continue;
      }
      seen.add(key);
      t.classList.toggle("soft", labelMode(l) === "soft");
      t.style.fill =
        (style === "districts" && l.tier === "dist") || (style === "factions" && l.tier === "fac")
          ? (t.dataset.col ?? "")
          : "";
      const px = labelSize(l);
      t.style.display = "";
      t.setAttribute("font-size", `${px}`);
      t.setAttribute("stroke-width", `${px * 0.24}`);
      if (l.road) {
        const win = roadWindow(l, width(l) / view.zoom + 8);
        const p = defs.querySelector(`#lp${CSS.escape(l.id)}`) as SVGPathElement;
        p.setAttribute("d", `M${win.map(q => `${view.x + q[0] * view.zoom},${view.y + q[1] * view.zoom}`).join("L")}`);
      } else {
        t.setAttribute("x", `${view.x + l.x * view.zoom}`);
        t.setAttribute("y", `${view.y + l.y * view.zoom}`);
      }
    }
  };
  let settle = 0;
  const zoomTo = (z: number, sx: number, sy: number) => {
    view = clamp({
      ...zoomAround(view, sx, sy, Math.max(minZoom(), Math.min(14, z))),
      zoom: Math.max(minZoom(), Math.min(14, z))
    });
    draw();
    ensureDetail();
  };
  stage.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomTo(view.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)), sx, sy);
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        const z = view.zoom;
        const whole = Math.round(z);
        if (z > 1.5 && Math.abs(z - whole) < 0.35) zoomTo(whole, sx, sy);
      }, 220);
    },
    { passive: false }
  );
  const fitToScreen = () => {
    view = clamp({ x: (stage.clientWidth - city.W * minZoom()) / 2, y: 0, zoom: minZoom() });
    draw();
  };

  // ---- the key: the city's name and up to twelve places, the player's own first, numbered on the map
  const keyEl = stage.querySelector(".cvKey") as HTMLDivElement;
  let keyed: { n: number; b: (typeof city.buildings)[number]; c: P2 }[] = [];
  const centreOf = (b: (typeof city.buildings)[number]): P2 => {
    const ids = b.landmark ? (b.cells ?? [b.cell]) : null;
    if (ids) {
      const ps = ids.map(i => city.pack.cells.p[i]);
      return [ps.reduce((a, p) => a + p[0], 0) / ps.length, ps.reduce((a, p) => a + p[1], 0) / ps.length];
    }
    return [b.poly.reduce((a, p) => a + p[0], 0) / b.poly.length, b.poly.reduce((a, p) => a + p[1], 0) / b.poly.length];
  };
  const renderKey = () => {
    const favs = (edits.favs ?? [])
      .map(k => city.buildings.find(b => b.key === k))
      .filter(Boolean) as (typeof city.buildings)[number][];
    const rank = (b: (typeof city.buildings)[number]) =>
      b.landmark ? 0 : ["Guardhouse", "Guild hall", "Chapel", "Tavern", "Office"].indexOf(b.type) + 1 || 9;
    const auto = city.buildings.filter(b => b.name && !favs.includes(b)).sort((a, b) => rank(a) - rank(b));
    keyed = [...favs, ...auto].slice(0, 12).map((b, k) => ({ n: k + 1, b, c: centreOf(b) }));
    keyEl.innerHTML = `<h3>${esc(burg)}</h3><ol>${keyed.map(e => `<li data-n="${e.n}"><i>${e.n}.</i> ${esc(e.b.name ?? e.b.type)}</li>`).join("")}</ol>`;
    for (const li of keyEl.querySelectorAll<HTMLLIElement>("li"))
      li.onclick = () => {
        const e = keyed[+(li.dataset.n as string) - 1];
        const z = Math.max(view.zoom, 4);
        view = clamp({ zoom: z, x: stage.clientWidth / 2 - e.c[0] * z, y: stage.clientHeight / 2 - e.c[1] * z });
        draw();
        ensureDetail();
      };
    marks.innerHTML = keyed
      .map(
        e =>
          `<g data-n="${e.n}"><circle r="10"></circle><text text-anchor="middle" dominant-baseline="central">${e.n}</text></g>`
      )
      .join("");
  };
  const marks = document.createElementNS(NS, "g");
  marks.setAttribute("class", "marks");
  lab.appendChild(marks);
  const placeMarks = () => {
    marks.style.display = style === "map" ? "" : "none";
    for (const g of marks.querySelectorAll<SVGGElement>("g")) {
      const e = keyed[+(g.dataset.n as string) - 1];
      if (!e) continue;
      g.setAttribute("transform", `translate(${view.x + e.c[0] * view.zoom},${view.y + e.c[1] * view.zoom})`);
    }
  };

  // ---- hover and picking
  const at = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - view.x) / view.zoom);
    const y = Math.floor((e.clientY - r.top - view.y) / view.zoom);
    if (x < 0 || y < 0 || x >= city.W || y >= city.H) return null;
    return { x, y, j: y * city.W + x, ci: painted.CID[y * city.W + x], bid: painted.BID[y * city.W + x] };
  };
  const roadNear = (x: number, y: number) => {
    let best: Road | null = null;
    let bd = 5;
    for (const r of city.roads)
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [a, b] = [r.pts[i], r.pts[i + 1]];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        const d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
        if (d < bd) {
          bd = d;
          best = r;
        }
      }
    return best;
  };
  const roadPath = (r: Road) => `M${r.pts.map(p => p.join(",")).join("L")}`;
  const describe = (e: PointerEvent) => {
    const p = at(e);
    if (!p) return null;
    const { cells } = city.pack;
    if (style === "factions" && tool === "inspect") {
      const b = p.bid ? city.buildings[p.bid - 1] : null;
      const f = b ? b.owner : p.ci >= 0 ? city.faction[p.ci] : -1;
      const F = f !== undefined && f >= 0 ? city.factions[f] : null;
      if (b)
        return {
          kind: b.landmark ? "landmark" : "building",
          key: b.key ?? "",
          label: b.name ?? b.type,
          d: b.landmark ? outline(new Set(b.cells)) : `M${b.poly.map(q => q.join(",")).join("L")}Z`,
          html: `<b>${F ? F.name : "Unclaimed"}</b><i>${b.name ?? b.type}</i>`
        };
      if (!F) return null;
      return {
        kind: "cell",
        key: `c:${p.ci}`,
        label: F.name,
        d: outline(new Set(city.faction.reduce<number[]>((a, v, i) => (v === f ? a.concat(i) : a), []))),
        cell: p.ci,
        html: `<b>${F.name}</b><i>${F.kind}</i>`
      };
    }
    if (p.bid && !(style === "districts" && tool === "inspect")) {
      const b = city.buildings[p.bid - 1];
      const D = city.districts.find(d => d.id === b.district)?.name ?? "";
      return {
        kind: b.landmark ? "landmark" : "building",
        key: b.key ?? "",
        label: b.name ?? b.type,
        d: b.landmark ? outline(new Set(b.cells)) : `M${b.poly.map(q => q.join(",")).join("L")}Z`,
        html: `<b>${b.name ?? b.type}</b><i>${b.name ? `${b.type} · ` : ""}${b.addr}</i>${D ? `<i>${D}</i>` : ""}${b.enter ? "<s>Enter</s>" : ""}`
      };
    }
    const r = roadNear(p.x + 0.5, p.y + 0.5);
    if (r && (r.name || tool !== "inspect") && style !== "districts") {
      const g = city.gates.find(q => Math.hypot(q.p[0] - p.x, q.p[1] - p.y) < 5);
      if (g)
        return {
          kind: "gate",
          key: `g:${g.road}`,
          label: g.name,
          d: `M${g.a.join(",")}L${g.b.join(",")}`,
          html: `<b>${g.name}</b><i>Gate</i>`
        };
      return {
        kind: "road",
        key: r.key,
        label: r.name ?? RNAME[r.type],
        d: roadPath(r),
        html: `<b>${r.name ?? RNAME[r.type]}</b><i>${RNAME[r.type]}</i>`
      };
    }
    // the whole district lights up from its name, or in the districts view; elsewhere the cell, inside its district's edge
    const named = city.districts.find(D => {
      const t = els.get(`d${D.id}`);
      if (!t || t.style.display === "none") return false;
      const b = t.getBoundingClientRect();
      return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    });
    if (named && tool === "inspect")
      return {
        kind: "district",
        key: `d:${named.id}`,
        label: named.name,
        d: outline(new Set(named.cells)),
        html: `<b>${named.name}</b>`
      };
    if (p.ci >= 0 && city.district[p.ci] >= 0) {
      const D = city.districts.find(d => d.id === city.district[p.ci]);
      if (D && style !== "districts")
        return {
          kind: "cell",
          key: `c:${p.ci}`,
          label: D.name,
          d: cellPath(p.ci),
          d2: outline(new Set(D.cells)),
          cell: p.ci,
          html: `<b>${KIND_NAME[city.kind[p.ci] ?? ""] ?? "Ground"}</b><i>${D.name}</i>`
        };
      if (D)
        return {
          kind: "district",
          key: `d:${D.id}`,
          label: D.name,
          d: outline(new Set(D.cells)),
          cell: p.ci,
          html: `<b>${D.name}</b><i>${KIND_NAME[city.kind[p.ci] ?? ""] ?? ""}</i>`
        };
    }
    if (p.ci >= 0 && city.home[p.ci])
      return {
        kind: "cell",
        key: `c:${p.ci}`,
        label: KIND_NAME[city.use[p.ci]] ?? city.use[p.ci],
        d: `M${cells.v[p.ci].map((v: number) => city.pack.vertices.p[v].join(",")).join("L")}Z`,
        html: `<b>${KIND_NAME[city.use[p.ci]] ?? city.use[p.ci]}</b>`
      };
    return null;
  };
  const cellPath = (i: number) =>
    `M${cellsOf()
      .v[i].map((v: number) => city.pack.vertices.p[v].join(","))
      .join("L")}Z`;

  // ---- pointer: paint tools stroke across cells, the rest pan; a short press is a click
  let drag: { x: number; y: number; v: View; moved: boolean; stroke: boolean; button: number } | null = null;
  const stroke = new Set<number>();
  stage.addEventListener("contextmenu", e => e.preventDefault());
  stage.addEventListener("pointerdown", e => {
    const strokeTool =
      (tool === "paint" || tool === "district" || tool === "landmark" || tool === "faction") && e.button === 0;
    drag = { x: e.clientX, y: e.clientY, v: view, moved: false, stroke: strokeTool, button: e.button };
    stage.setPointerCapture(e.pointerId);
    tip.style.display = "none";
    stroke.clear();
    if (strokeTool) addStroke(e);
  });
  const addStroke = (e: PointerEvent) => {
    const p = at(e);
    if (!p || p.ci < 0) return;
    if (tool !== "paint" && !(city.use[p.ci] === "town" || city.use[p.ci] === "shanty")) return;
    stroke.add(p.ci);
    selP.setAttribute("d", [...stroke].map(cellPath).join(""));
  };
  stage.addEventListener("pointermove", e => {
    if (drag) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 3) drag.moved = true;
      if (drag.stroke) addStroke(e);
      else {
        view = clamp({ x: drag.v.x + e.clientX - drag.x, y: drag.v.y + e.clientY - drag.y, zoom: view.zoom });
        draw();
      }
      return;
    }
    const d = describe(e);
    if (!d) {
      hl.setAttribute("d", "");
      hl2.setAttribute("d", "");
      tip.style.display = "none";
      return;
    }
    hl.setAttribute("d", d.d ?? "");
    hl.setAttribute("class", `hl ${d.kind}`);
    hl2.setAttribute("d", (d as { d2?: string }).d2 ?? "");
    tip.innerHTML = d.html;
    tip.style.display = "block";
    const r = stage.getBoundingClientRect();
    tip.style.left = `${Math.min(e.clientX - r.left + 14, stage.clientWidth - tip.offsetWidth - 6)}px`;
    tip.style.top = `${e.clientY - r.top + 14}px`;
  });
  stage.addEventListener("pointerleave", () => {
    tip.style.display = "none";
    hl.setAttribute("d", "");
    hl2.setAttribute("d", "");
  });
  stage.addEventListener("pointerup", e => {
    const d = drag;
    drag = null;
    if (!d) return;
    if (d.stroke && tool === "faction" && !d.moved) {
      const p = at(e);
      if (p?.bid) {
        const b = city.buildings[p.bid - 1];
        edits.owners = edits.owners ?? {};
        edits.owners[b.key ?? ""] = curFaction;
        stroke.clear();
        selP.setAttribute("d", "");
        commit();
        return;
      }
    }
    if (d.stroke) {
      applyStroke();
      selP.setAttribute("d", "");
      return;
    }
    if (!d.moved && d.button === 0) click(e);
  });

  const commit = () => {
    save();
    const keep = view;
    build();
    view = clamp(keep);
    ensureDetail(true);
    draw();
    renderPane();
  };
  const applyStroke = () => {
    if (!stroke.size) return;
    if (tool === "paint") {
      edits.cells = edits.cells ?? {};
      for (const i of stroke) edits.cells[i] = paintKind;
    } else if (tool === "district") {
      edits.districts = edits.districts ?? {};
      for (const i of stroke) edits.districts[i] = curDistrict;
    } else if (tool === "faction") {
      edits.factionCells = edits.factionCells ?? {};
      for (const i of stroke) edits.factionCells[i] = curFaction;
    } else if (tool === "landmark") {
      edits.landmarks = edits.landmarks ?? city.landmarks.map(l => ({ ...l }));
      let L = edits.landmarks.find(l => l.id === curLandmark);
      if (!L) {
        const id = Math.max(0, ...edits.landmarks.map(l => l.id)) + 1;
        L = { id, cells: [], name: `Landmark ${id}`, type: "Landmark", roof: "slate" };
        edits.landmarks.push(L);
        curLandmark = id;
      }
      const first = [...stroke][0];
      const removing = L.cells.includes(first);
      for (const i of stroke) {
        for (const o of edits.landmarks) if (o !== L) o.cells = o.cells.filter(c => c !== i);
        L.cells = removing ? L.cells.filter(c => c !== i) : [...new Set([...L.cells, i])];
      }
    }
    stroke.clear();
    commit();
  };
  const click = (e: PointerEvent) => {
    const p = at(e);
    if (!p) return;
    if (tool === "inspect") {
      const d = describe(e);
      selected = d ? { kind: d.kind, key: d.key, label: d.label, d: d.d } : null;
      selP.setAttribute("d", d?.d ?? "");
      renderPane();
    } else if (tool === "road") {
      if (p.ci < 0) return;
      if (roadStart < 0) {
        roadStart = p.ci;
        selP.setAttribute("d", cellPath(p.ci));
        renderPane();
        return;
      }
      const { use, kind } = city;
      const goal = p.ci;
      const path = findPath(
        roadStart,
        id => id === goal,
        (_c, next) => {
          const wet = use[next] === "water" || kind[next] === "pond";
          if (wet) return roadType === "pier" || roadType === "main" ? 3 : Infinity;
          return 1;
        },
        city.pack
      );
      if (path) {
        edits.roads = edits.roads ?? [];
        edits.roads.push({ type: roadType, cells: [roadStart, ...path] });
      }
      roadStart = -1;
      selP.setAttribute("d", "");
      commit();
    } else if (tool === "erase") {
      const r = roadNear(p.x + 0.5, p.y + 0.5);
      if (!r) return;
      if (r.key.startsWith("u:")) {
        const k = +r.key.slice(2);
        if (edits.roads?.[k]) edits.roads[k] = { ...edits.roads[k], cells: [] };
      } else {
        edits.erase = edits.erase ?? [];
        if (r.ekeys) edits.erase.push(...r.ekeys.map(k => `e:${k}`));
        else edits.erase.push(r.key);
      }
      commit();
    }
  };

  // ---- the panel, in the battle sandbox's look
  const swatch = (k: string) => {
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    const im = g.createImageData(24, 24);
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 24; x++) {
        const t =
          style === "map"
            ? mapTile(k)
            : k === "water"
              ? [122, 166, 186]
              : k === "pond"
                ? [146, 188, 200]
                : terrainTile(k, x, y, 0.6);
        const j = (y * 24 + x) * 4;
        im.data[j] = t[0];
        im.data[j + 1] = t[1];
        im.data[j + 2] = t[2];
        im.data[j + 3] = 255;
      }
    g.putImageData(im, 0, 0);
    return c;
  };
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  const renderPane = () => {
    for (const b of side.querySelectorAll<HTMLButtonElement>("[data-g=style] button"))
      b.classList.toggle("on", b.dataset.v === style);
    for (const b of side.querySelectorAll<HTMLButtonElement>("[data-g=tool] button"))
      b.classList.toggle("on", b.dataset.v === tool);
    let h = "";
    if (tool === "inspect") {
      if (!selected) h = `<div class="tname">${burg}</div>`;
      else {
        h = `<div class="tname">${esc(selected.label)}</div><div class="frm"><span class="fl">Name</span><input type="text" id="cvName" value="${esc(selected.label)}"></div>`;
        const b = city.buildings.find(q => q.key === selected?.key);
        if (b) {
          const fav = (edits.favs ?? []).includes(b.key ?? "");
          h += `<div class="frm"><span class="fl">Owner</span><select id="cvOwner"><option value="-1">Nobody</option>${city.factions
            .map(f => `<option value="${f.id}"${f.id === b.owner ? " selected" : ""}>${esc(f.name)}</option>`)
            .join(
              ""
            )}</select></div><div class="frm"><span class="fl">Colour</span><input type="color" id="cvCol" value="${edits.colors?.[b.key ?? ""] ?? "#c2643f"}"><button data-a="uncol">Clear</button></div><button data-a="fav" class="wide${fav ? " on" : ""}">${fav ? "In the key" : "Add to the key"}</button>`;
        }
      }
    } else if (tool === "faction") {
      h = `<div class="list">${city.factions
        .map(f => {
          const n = city.faction.filter(v => v === f.id).length;
          const nb = city.buildings.filter(b => b.owner === f.id).length;
          return `<button data-f="${f.id}" class="${f.id === curFaction ? "on" : ""}"><span><b class="dot" style="background:${f.col}"></b>${esc(f.name)}</span><em>${f.kind} · ${n} · ${nb}</em></button>`;
        })
        .join("")}</div>`;
    } else if (tool === "paint") {
      h = `<div class="pgrid">${PAINTS.map(k => `<button data-k="${k}" class="tb${k === paintKind ? " on" : ""}"><i></i>${KIND_NAME[k]}</button>`).join("")}</div>`;
    } else if (tool === "district") {
      h = `<div class="list">${city.districts
        .map(
          D =>
            `<button data-d="${D.id}" class="${D.id === curDistrict ? "on" : ""}">${esc(D.name)}<em>${D.cells.length}</em></button>`
        )
        .join(
          ""
        )}</div><div class="frm"><span class="fl">New</span><input type="text" id="cvNewD" placeholder="Name"></div>`;
    } else if (tool === "landmark") {
      const L = city.landmarks.find(l => l.id === curLandmark);
      h = `<div class="list">${city.landmarks
        .map(
          l =>
            `<button data-l="${l.id}" class="${l.id === curLandmark ? "on" : ""}">${esc(l.name)}<em>${l.cells.length}</em></button>`
        )
        .join("")}<button data-l="-1" class="${curLandmark < 0 ? "on" : ""}">New landmark</button></div>`;
      if (L)
        h += `<div class="frm"><span class="fl">Name</span><input type="text" id="cvLName" value="${esc(L.name)}">
<span class="fl">Type</span><select id="cvLType">${LTYPES.map(t => `<option${t === L.type ? " selected" : ""}>${t}</option>`).join("")}</select>
<span class="fl">Roof</span><select id="cvLRoof">${ROOFS.map(t => `<option${t === L.roof ? " selected" : ""}>${t}</option>`).join("")}</select></div>
<button data-a="ldel" class="wide">Remove landmark</button>`;
    } else if (tool === "road") {
      h = `<div class="tabs">${RTYPES.map(t => `<button data-r="${t}" class="${t === roadType ? "on" : ""}">${RNAME[t]}</button>`).join("")}</div>`;
    } else h = "";
    pane.innerHTML = h;
    for (const b of pane.querySelectorAll<HTMLButtonElement>("[data-k]")) {
      (b.querySelector("i") as HTMLElement).appendChild(swatch(b.dataset.k as string));
      b.onclick = () => {
        paintKind = b.dataset.k as string;
        renderPane();
      };
    }
    for (const b of pane.querySelectorAll<HTMLButtonElement>("[data-d]"))
      b.onclick = () => {
        curDistrict = +(b.dataset.d as string);
        renderPane();
      };
    for (const b of pane.querySelectorAll<HTMLButtonElement>("[data-l]"))
      b.onclick = () => {
        curLandmark = +(b.dataset.l as string);
        renderPane();
      };
    for (const b of pane.querySelectorAll<HTMLButtonElement>("[data-f]"))
      b.onclick = () => {
        curFaction = +(b.dataset.f as string);
        renderPane();
      };
    const own = pane.querySelector("#cvOwner") as HTMLSelectElement | null;
    if (own)
      own.onchange = () => {
        edits.owners = edits.owners ?? {};
        edits.owners[selected?.key ?? ""] = +own.value;
        commit();
      };
    const col = pane.querySelector("#cvCol") as HTMLInputElement | null;
    if (col)
      col.onchange = () => {
        edits.colors = edits.colors ?? {};
        edits.colors[selected?.key ?? ""] = col.value;
        commit();
      };
    const unc = pane.querySelector("[data-a=uncol]") as HTMLButtonElement | null;
    if (unc)
      unc.onclick = () => {
        if (edits.colors) delete edits.colors[selected?.key ?? ""];
        commit();
      };
    const fv = pane.querySelector("[data-a=fav]") as HTMLButtonElement | null;
    if (fv)
      fv.onclick = () => {
        const k = selected?.key ?? "";
        const L = edits.favs ?? [];
        edits.favs = L.includes(k) ? L.filter(x => x !== k) : [k, ...L];
        commit();
      };
    for (const b of pane.querySelectorAll<HTMLButtonElement>("[data-r]"))
      b.onclick = () => {
        roadType = b.dataset.r as Road["type"];
        roadStart = -1;
        renderPane();
      };
    const onEnter = (id: string, fn: (v: string) => void) => {
      const i = pane.querySelector(`#${id}`) as HTMLInputElement | null;
      if (i) i.onkeydown = ev => ev.key === "Enter" && i.value.trim() && fn(i.value.trim());
    };
    onEnter("cvName", v => {
      if (!selected) return;
      edits.names = edits.names ?? {};
      if (selected.kind === "landmark") {
        edits.landmarks = edits.landmarks ?? city.landmarks.map(l => ({ ...l }));
        const L = edits.landmarks.find(l => `l:${l.id}` === selected?.key);
        if (L) L.name = v;
      } else edits.names[selected.key] = v;
      selected.label = v;
      commit();
    });
    onEnter("cvNewD", v => {
      edits.newDistricts = edits.newDistricts ?? [];
      const id = Math.max(5, ...city.districts.map(d => d.id)) + 1;
      edits.newDistricts.push({ id, name: v, kind: "old" as Kind });
      curDistrict = id;
      commit();
    });
    const lmEdit = (fn: (l: NonNullable<Edits["landmarks"]>[number]) => void) => {
      edits.landmarks = edits.landmarks ?? city.landmarks.map(l => ({ ...l }));
      const L = edits.landmarks.find(l => l.id === curLandmark);
      if (L) fn(L);
      commit();
    };
    onEnter("cvLName", v => lmEdit(l => (l.name = v)));
    const ty = pane.querySelector("#cvLType") as HTMLSelectElement | null;
    if (ty) ty.onchange = () => lmEdit(l => (l.type = ty.value));
    const rf = pane.querySelector("#cvLRoof") as HTMLSelectElement | null;
    if (rf) rf.onchange = () => lmEdit(l => (l.roof = rf.value));
    const del = pane.querySelector("[data-a=ldel]") as HTMLButtonElement | null;
    if (del)
      del.onclick = () => {
        edits.landmarks = (edits.landmarks ?? city.landmarks.map(l => ({ ...l }))).filter(l => l.id !== curLandmark);
        curLandmark = -1;
        commit();
      };
  };
  for (const b of side.querySelectorAll<HTMLButtonElement>("[data-g=style] button"))
    b.onclick = () => {
      style = b.dataset.v as Style;
      stage.dataset.style = style;
      wctx.putImageData(groundOf(), 0, 0);
      ensureDetail(true);
      makeLabels();
      draw();
      renderPane();
    };
  for (const b of side.querySelectorAll<HTMLButtonElement>("[data-g=tool] button"))
    b.onclick = () => {
      tool = b.dataset.v as string;
      roadStart = -1;
      selP.setAttribute("d", "");
      renderPane();
    };
  const out = side.querySelector("[data-out]") as HTMLTextAreaElement;
  (side.querySelector("[data-a=reroll]") as HTMLButtonElement).onclick = () => {
    edits = { seed: Math.floor(Math.random() * 1e9) };
    commit();
  };
  (side.querySelector("[data-a=reset]") as HTMLButtonElement).onclick = () => {
    edits = {};
    commit();
  };
  const exp = side.querySelector("[data-a=export]") as HTMLButtonElement;
  exp.onclick = () => {
    const text = JSON.stringify({ burg, edits });
    out.value = text;
    out.hidden = false;
    out.select();
    navigator.clipboard?.writeText(text).then(
      () => {
        exp.textContent = "Copied";
        setTimeout(() => (exp.textContent = "Export for AI"), 1500);
      },
      () => undefined
    );
  };

  build();
  stage.dataset.style = style;
  addEventListener("resize", () => {
    view = clamp(view);
    draw();
  });
  document.fonts.ready.then(fitToScreen);
  fitToScreen();
  ensureDetail(true);
  renderPane();
  (window as unknown as { cityView: unknown }).cityView = {
    get city() {
      return city;
    },
    view: (z: number, x: number, y: number) => {
      view = clamp(snap({ zoom: z, x: stage.clientWidth / 2 - x * z, y: stage.clientHeight / 2 - y * z }));
      ensureDetail(true);
      draw();
    }
  };
}
