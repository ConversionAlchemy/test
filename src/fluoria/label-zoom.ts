// Fluoria's map lettering, atlas-style: which label groups show at which zoom, how big they are on screen, how each
// kind looks, and which give way where they overlap. Labels and icons stay Azgaar's; this styles and gates them
import { viewport } from "@/components/viewport";
import { SYMBOL, SYMBOL_BOX } from "./constants";
import { islandNoun } from "./islands";
import { cellsOfState, stateInk, TINY_FROM, TINY_STATE } from "./owners";
import { type Rank, rankOf, sizeOf } from "./settlement-size";
import { CLASS_ORDER, classOf, isCapital, type SettlementClass } from "./settlements";

const SMALL_STATE = 8; // cells under which a nation is named by its city once zoomed in

interface Tier {
  min: number; // Azgaar zoom from which the group shows
  max: number;
  px?: number; // on-screen font size at zoom 1.4; grows with the square root of the zoom, within the sandbox's bounds
  rank: number; // where labels overlap, the lower rank gives way
  fade?: number; // zoom over which it fades in and out
}

// political view shows states alone; regions add provinces and big towns; close in, everything
// sizes and steps from the sandbox: nations fade out as the land comes into view, settlements come in by size
const TIERS: Record<string, Tier> = {
  capital: { min: 1, max: Infinity, px: 19, rank: 0 },
  state: { min: 0, max: 2.1, px: 20, rank: 1, fade: 0.6 },
  city: { min: 1.4, max: Infinity, px: 16, rank: 2 },
  province: { min: 1.4, max: Infinity, px: 12, rank: 6.5 }, // after every settlement: their names come first
  town: { min: 1.8, max: Infinity, px: 14, rank: 4 },
  village: { min: 2.6, max: Infinity, px: 12.5, rank: 5 },
  hamlet: { min: 3, max: Infinity, px: 11.5, rank: 6 },
  fort: { min: 3, max: Infinity, px: 11.5, rank: 6 },
  monastery: { min: 3, max: Infinity, px: 11.5, rank: 6 },
  trading_post: { min: 3, max: Infinity, px: 11.5, rank: 6 },
  caravanserai: { min: 3, max: Infinity, px: 11.5, rank: 6 },
  route: { min: 3, max: Infinity, px: 10, rank: 7 }, // always smaller than the smallest settlement name
  river: { min: 3, max: Infinity, px: 13, rank: 8 }
};

const FADE = 0.3; // zoom over which a group fades in or out
const BURG_GROUPS = new Set([
  "capital",
  "city",
  "town",
  "village",
  "hamlet",
  "fort",
  "monastery",
  "trading_post",
  "caravanserai"
]);

/** Fluoria's zoom range for a label group, or undefined to keep Azgaar's */
export function labelTier(group: string): { min: number; max: number } | undefined {
  return TIERS[group];
}

const STYLE = `
#labels > g { opacity: 1 !important; transition: opacity 0.2s; }
/* dark ink with a hairline pale halo, as an atlas prints it */
#labels text, #labels textPath, #labels tspan {
  fill: #3a2e24 !important;
  fill-opacity: 1 !important;
  stroke: #f0e8d0 !important;
  stroke-opacity: 0.85 !important;
  stroke-width: 0.22em !important; /* in step with each label's own size */
  stroke-linejoin: round !important;
  paint-order: stroke !important;
  text-shadow: none !important;
}
/* areas in spaced capitals: states in their own deep colour (set per label), provinces muted */
#labels > g:is([data-group="state"], [data-group="province"]) :is(text, textPath, tspan) {
  stroke-width: 0.16em !important;
  stroke: #f4eede !important;
  stroke-opacity: 0.8 !important;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  font-size: inherit !important; /* one size for every nation, as the sandbox sets them */
}
#labels > g:is([data-group="capital"], [data-group="city"]) :is(text, textPath, tspan) { fill: #2a1f18 !important; }
#labels > g[data-group="state"] { opacity: calc(0.9 * var(--fl-o-state, 1)) !important; }
#labels > g[data-group="province"] :is(text, textPath, tspan) { fill: #6e5a64 !important; stroke-width: 0.24em !important; stroke-opacity: 0.7 !important; letter-spacing: 0.2em; font-size: inherit !important; }

#labels > g[data-group="river"] :is(text, textPath, tspan) {
  fill: #2c5d93 !important;
  stroke: #e9eef2 !important;
  stroke-width: 0.12em !important;
  font-style: italic;
}
/* a road's name runs along the road itself, on a faded band so it reads over the line */
#labels > g[data-group="route"] :is(text, textPath, tspan) {
  fill: #6b5a48 !important;
  fill-opacity: 0.8 !important;
  stroke: #f0ebde !important;
  stroke-opacity: 0.6 !important;
  stroke-width: 0.22em !important;
  stroke-linejoin: round !important;
  paint-order: stroke fill !important;
  dominant-baseline: central;
  font-style: italic;
  letter-spacing: 0.03em;
  cursor: pointer;
}
#labels > g[data-group="route"] text:hover :is(textPath, tspan) { fill: #000 !important; stroke-opacity: 1 !important; }
#labels text.flHidden { visibility: hidden; }
#burgIcons use { image-rendering: pixelated; }
/* settlements come in by size as you zoom: cities and capitals first, towns in a region, villages close in */
/* settlements come in by size, fading as the zoom crosses each step */
#burgIcons use[href^="#fl-town"] { opacity: var(--fl-o-townicon, 1); }
#burgIcons use[href="#fl-village"] { opacity: var(--fl-o-villageicon, 1); }
body[data-fl-tier="political"] #burgIcons use:is([href="#fl-village"], [href^="#fl-town"]) { pointer-events: none; }
body[data-fl-tier="region"] #burgIcons use[href="#fl-village"] { pointer-events: none; }
#burgIcons use:hover { filter: brightness(1.12) drop-shadow(0 0 1px #ffffff); }
#burgIcons > g > g[data-group="anchors"] { display: none; }
#burgIcons > g > g[data-group="icons"] {
  font-size: var(--fl-burg) !important;
  transform: translate(-0.5em, -0.5em) !important;
}
#burgIcons > g > g[data-group="icons"] > use { width: 1em; height: 1em; }
${Object.entries(TIERS)
  .filter(([, tier]) => tier.px)
  .map(([group]) => `#labels > g[data-group="${group}"] { font-size: var(--fl-${group}) !important; }`)
  .join("\n")}
${Object.keys(TIERS)
  .filter(group => group !== "state")
  .map(group => `#labels > g[data-group="${group}"] { opacity: var(--fl-o-${group}, 1) !important; }`)
  .join("\n")}
`;

// pixel symbols, drawn at the unit cards' pixel size: a village, town, city or citadel a white square growing with
// size (a citadel's border twice as thick), each with its class's glyph; the capital a citadel in the road red
const DARK = "#26262b";
const LIGHT = "#f4f1e8";
const CAPITAL_RED = "#a83424";
export const GLYPHS: Record<SettlementClass, string[]> = {
  barracks: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  armoury: [".###.", "#...#", "#...#", "#...#", ".###."],
  harbour: ["..#..", "#####", "..#..", "#.#.#", ".###."],
  airbase: ["..#..", "#####", "..#..", "..#..", ".###."],
  market: [".####", "#....", ".###.", "....#", "####."]
};

// every paint property on the shapes, so none of the group styles Azgaar puts on the icons leaks in
const rect = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="none" opacity="1"/>`;

/** One symbol on the box's pixel grid; a clear margin round it makes it easy to hover and drop on */
function symbol(id: string, rank: Rank | "capital", c: SettlementClass | null): string {
  const side = SYMBOL[rank];
  // the sandbox markers: a capital a dark-framed red square, towns and cities plain white squares, a village a black one
  const border = rank === "capital" ? 2 : 1;
  const o = Math.floor((SYMBOL_BOX - side) / 2);
  const fill = rank === "capital" ? CAPITAL_RED : rank === "village" ? DARK : LIGHT;
  void c; // class glyphs (GLYPHS) are kept for the burg panel, not drawn on the map
  const pixels =
    rect(o, o, side, side, DARK) + rect(o + border, o + border, side - border * 2, side - border * 2, fill);
  return `<symbol id="fl-${id}" data-v="4" viewBox="0 0 ${SYMBOL_BOX} ${SYMBOL_BOX}" overflow="visible" shape-rendering="crispEdges"><rect x="-3" y="-3" width="${SYMBOL_BOX + 6}" height="${SYMBOL_BOX + 6}" fill="none" stroke="none" pointer-events="all"/>${pixels}</symbol>`;
}

const SYMBOLS = [
  symbol("village", "village", null),
  ...(["town", "city", "citadel", "capital"] as const).flatMap(rank =>
    [null, ...CLASS_ORDER].map(c => symbol(c ? `${rank}-${c}` : rank, rank, c))
  )
].join("\n");

let styled = false;
let watched: Element | null = null;

/** Styles once; symbols and the redraw watcher again whenever a loaded map replaces the svg */
function install(): void {
  if (!styled) {
    styled = true;
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.append(style);
  }
  if (!document.querySelector("#map symbol#fl-capital-market[data-v='3']")) {
    for (const old of document.querySelectorAll("#map symbol[id^='fl-']")) old.remove();
    const defs = document.querySelector("#map defs") ?? document.querySelector("#map");
    defs?.insertAdjacentHTML("beforeend", SYMBOLS);
  }
  const viewbox = document.getElementById("viewbox");
  if (!viewbox || viewbox === watched) return;
  watched = viewbox;
  // the layers' own elements are replaced when they redraw, so watch from the viewbox
  new MutationObserver(records => {
    let icons = false;
    let labels = false;
    for (const { target, addedNodes } of records) {
      // a settlement name goes under its symbol before it is first painted, and waits for the declutter to show
      for (const node of addedNodes)
        for (const text of node instanceof SVGTextElement
          ? [node]
          : node instanceof Element
            ? node.querySelectorAll<SVGTextElement>("text[data-label-type='burg']")
            : [])
          if (text.dataset.labelType === "burg") {
            setSide(text, (text.dataset.side as Side | undefined) ?? "right");
            text.classList.add("flHidden");
          }
      const element = target as Element;
      icons ||= Boolean(element.closest?.("#burgIcons") || element.querySelector?.("#burgIcons"));
      labels ||= Boolean(element.closest?.("#labels") || element.querySelector?.("#labels"));
    }
    if (icons) restyleIcons();
    if (labels) scheduleDeclutter();
  }).observe(viewbox, { childList: true, subtree: true });
  restyleIcons();
}

function scheduleDeclutter(): void {
  clearTimeout(declutterTimer);
  declutterTimer = window.setTimeout(declutter, 120);
}

/** Font sizes in map units so each group's on-screen size follows its tier at the current zoom */
export function applyLabelZoom(scale = viewport.scale): void {
  const labels = document.getElementById("labels");
  if (!labels || !scale) return;
  install();
  // as the sandbox: a name grows with the square root of the zoom, within bounds, smoothly (no rounding)
  const grow = Math.min(1.25, Math.max(0.85, Math.sqrt(scale / 1.4)));
  for (const [group, { px }] of Object.entries(TIERS)) {
    if (!px) continue;
    const screen = group === "state" ? Math.min(24, px * Math.sqrt(scale * 0.8)) : px * grow;
    labels.style.setProperty(`--fl-${group}`, `${screen / scale}px`);
  }
  // symbols keep their size on screen, pixel for pixel with the unit cards; at the political view half that
  const art = scale < 1.4 ? 0.8 : 1; // small and crisp, as the sandbox draws them
  document.getElementById("burgIcons")?.style.setProperty("--fl-burg", `${(SYMBOL_BOX * art) / scale}px`);
  labels.style.setProperty("--fl-px", String(1 / scale));
  // each group fades in over its first steps of zoom, and out over its last
  const ramp = (min: number, max: number, fade = FADE) =>
    Math.max(0, Math.min(1, (scale - min) / fade + (min ? 0 : 1), (max - scale) / fade));
  for (const [group, { min, max, fade }] of Object.entries(TIERS))
    labels.style.setProperty(`--fl-o-${group}`, String(ramp(min, max, fade) * (group === "province" ? 0.85 : 1)));
  // a nation's name on its islands fades with its name on the mainland
  const isles = document.getElementById("flIslands");
  if (isles) isles.style.opacity = String(0.9 * ramp(0, TIERS.state.max, TIERS.state.fade));
  const icons = document.getElementById("burgIcons");
  icons?.style.setProperty("--fl-o-townicon", String(ramp(1.4, Infinity)));
  icons?.style.setProperty("--fl-o-villageicon", String(ramp(2.6, Infinity)));
  document.body.dataset.flTier = scale < 1.4 ? "political" : scale < 2.6 ? "region" : "close";
  scheduleDeclutter();
}

/** Every settlement icon becomes the atlas symbol for its size and class, whichever icon its group was given */
function restyleIcons(): void {
  for (const use of document.querySelectorAll<SVGUseElement>('#burgIcons g[data-group="icons"] > use')) {
    const burg = pack.burgs[Number(use.dataset.id)];
    if (!burg) continue;
    const href = `#fl-${symbolFor(burg)}`;
    if (use.getAttribute("href") !== href) use.setAttribute("href", href);
  }
}

function symbolFor(burg: (typeof pack.burgs)[number]): string {
  const size = sizeOf(burg);
  if (!size) return "village";
  const c = classOf(burg);
  const base = isCapital(burg) ? "capital" : size;
  return c ? `${base}-${c}` : base;
}

let declutterTimer = 0;

const SMALL_PROVINCE = 6;
let sizes: { of: unknown; n: Map<number, number> } = { of: null, n: new Map() };
function provinceSize(province: number): number {
  if (sizes.of !== pack.cells.province) {
    const n = new Map<number, number>();
    for (const p of pack.cells.province) n.set(p, (n.get(p) ?? 0) + 1);
    sizes = { of: pack.cells.province, n };
  }
  return sizes.n.get(province) ?? 0;
}

type Side = "right" | "left" | "top" | "bottom";
const ISLAND_SHIFTS = ["", "0 -1.6em", "0 1.6em", "0 -2.6em", "0 2.6em"];
const SIDES: Side[] = ["right", "left", "top", "bottom"];

/** Where labels overlap on screen, the lower rank gives way. A settlement's name sits beside its mark, right or
 * left, else above or below, whichever is clear; it keeps the side it had while that stays clear */
function declutter(): void {
  const labels = document.querySelectorAll<SVGTextElement>("#labels > g > text");
  const placed: DOMRect[] = [];
  // each mark as drawn, not its wider hit area
  for (const use of document.querySelectorAll<SVGUseElement>('#burgIcons g[data-group="icons"] > use')) {
    const box = use.getBoundingClientRect();
    if (!box.width || Number(getComputedStyle(use).opacity) <= 0.3) continue;
    const burg = pack.burgs[Number(use.dataset.id)];
    const side = burg ? SYMBOL[isCapital(burg) ? "capital" : rankOf(burg)] : SYMBOL.town;
    const half = (side / 2) * (box.width / (SYMBOL_BOX + 6)); // the symbol's hit pad is 3 units each side
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    placed.push(new DOMRect(cx - half, cy - half, half * 2, half * 2));
  }
  const items: { text: SVGTextElement; rank: number }[] = [];
  const close = (viewport.scale || 1) >= TINY_FROM;
  for (const text of labels) {
    text.classList.remove("flHidden");
    const group = (text.parentElement as HTMLElement | null)?.dataset.group ?? "";
    const state = group === "state" ? Number(text.id.replace("stateLabel", "")) : 0;
    if (state) {
      const ink = stateInk(state);
      for (const part of [text, ...text.querySelectorAll<SVGElement>("textPath, tspan")])
        part.style.setProperty("fill", ink, "important");
      // a small nation is mostly its city: its name gives way to the city's once the cities are named
      const cells = cellsOfState(state);
      if (cells < SMALL_STATE && (close || cells < TINY_STATE)) {
        text.classList.add("flHidden");
        continue;
      }
    }
    // a small province (an island) is named by its seat alone
    const province = group === "province" ? Number(text.id.replace("provinceLabel", "")) : 0;
    const island = province ? islandNoun(province) : "";
    if (island) {
      // an island is named in its owner's ink
      const ink = stateInk(pack.provinces[province]?.state ?? 0);
      for (const part of [text, ...text.querySelectorAll<SVGElement>("textPath, tspan")])
        part.style.setProperty("fill", ink, "important");
    } else if (province && provinceSize(province) < SMALL_PROVINCE) {
      text.classList.add("flHidden");
      continue;
    }
    items.push({ text, rank: TIERS[group]?.rank ?? 6 });
  }
  items.sort((a, b) => a.rank - b.rank);
  const clear = (box: DOMRect) =>
    !placed.some(
      other =>
        box.left < other.right - 1 &&
        box.right > other.left + 1 &&
        box.top < other.bottom - 1 &&
        box.bottom > other.top + 1
    );
  for (const { text } of items) {
    const group = (text.parentElement as HTMLElement | null)?.dataset.group ?? "";
    if (BURG_GROUPS.has(group) && text.dataset.labelType === "burg") {
      const before = text.dataset.side as Side | undefined;
      const order = before ? [before, ...SIDES.filter(s => s !== before)] : SIDES;
      let done = false;
      for (const side of order) {
        setSide(text, side);
        const box = text.getBoundingClientRect();
        if (!box.width) break;
        if (!clear(box)) continue;
        placed.push(box);
        done = true;
        break;
      }
      if (!done) text.classList.add("flHidden");
      continue;
    }
    // an island's name may step above or below its settlement rather than give way
    const shifts =
      group === "province" && islandNoun(Number(text.id.replace("provinceLabel", ""))) ? ISLAND_SHIFTS : [""];
    let done = false;
    for (const shift of shifts) {
      text.style.translate = shift;
      const box = text.getBoundingClientRect();
      if (!box.width) break;
      if (!clear(box)) continue;
      placed.push(box);
      done = true;
      break;
    }
    if (!done) text.classList.add("flHidden");
  }
  // forests, bays and mountains give way to settlements and every other name
  for (const text of document.querySelectorAll<SVGTextElement>("#flZones text")) {
    text.classList.remove("flHidden");
    const box = text.getBoundingClientRect();
    if (!box.width || Number(getComputedStyle(text).opacity) < 0.05) continue;
    if (clear(box)) placed.push(box);
    else text.classList.add("flHidden");
  }
}

/** Put a settlement's name on one side of its mark */
function setSide(text: SVGTextElement, side: Side): void {
  const burg = pack.burgs[Number(text.dataset.id)];
  const art = (viewport.scale || 1) < 1.4 ? 0.8 : 1; // as the marks are sized in applyLabelZoom
  const half = ((burg ? SYMBOL[isCapital(burg) ? "capital" : rankOf(burg)] : SYMBOL.town) / 2) * art + 5;
  const px = (n: number) => `calc(var(--fl-px, 1) * ${n}px)`;
  text.dataset.side = side;
  text.style.textAnchor = side === "right" ? "start" : side === "left" ? "end" : "middle";
  // beside the mark the name's middle sits level with the mark's middle
  text.style.dominantBaseline = side === "right" || side === "left" ? "central" : "";
  text.style.translate =
    side === "right"
      ? `${px(half)} 0`
      : side === "left"
        ? `${px(-half)} 0`
        : side === "top"
          ? `0 ${px(-half)}`
          : `0 calc(var(--fl-px, 1) * ${half}px + 0.8em)`;
}
