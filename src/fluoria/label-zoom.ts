// Fluoria's map lettering, atlas-style: which label groups show at which zoom, how big they are on screen, how each
// kind looks, and which give way where they overlap. Labels and icons stay Azgaar's; this styles and gates them
import { viewport } from "@/components/viewport";
import { cellsOfState, stateInk, TINY_FROM, TINY_STATE } from "./owners";
import { type Size, sizeOf } from "./settlement-size";
import { CLASS_ORDER, classOf, isCapital, type SettlementClass } from "./settlements";

const SMALL_STATE = 8; // cells under which a nation is named by its city once zoomed in

interface Tier {
  min: number; // Azgaar zoom from which the group shows
  max: number;
  px?: number; // on-screen font size when it first shows; none keeps Azgaar's, which path labels are fitted to
  rank: number; // where labels overlap, the lower rank gives way
}

// political view shows states alone; regions add provinces and big towns; close in, everything
const TIERS: Record<string, Tier> = {
  state: { min: 0, max: 4.5, rank: 0 },
  capital: { min: 1.6, max: Infinity, px: 20, rank: 1 },
  city: { min: 1.6, max: Infinity, px: 17, rank: 2 },
  province: { min: 1.6, max: 12, rank: 3 },
  town: { min: 4.5, max: Infinity, px: 16, rank: 4 },
  village: { min: 4.5, max: Infinity, px: 15, rank: 5 },
  hamlet: { min: 6, max: Infinity, px: 14, rank: 6 },
  fort: { min: 6, max: Infinity, px: 14, rank: 6 },
  monastery: { min: 6, max: Infinity, px: 14, rank: 6 },
  trading_post: { min: 6, max: Infinity, px: 14, rank: 6 },
  caravanserai: { min: 6, max: Infinity, px: 14, rank: 6 },
  route: { min: 8, max: Infinity, px: 13, rank: 7 },
  river: { min: 8, max: Infinity, px: 13, rank: 8 }
};

const GROWTH = 0.3; // labels grow with zoom, much slower than the map
const MAX_GROWTH = 2;
const ICON_PX = [
  [0, 9],
  [1.6, 11],
  [4.5, 14],
  [8, 16]
] as const; // settlement symbols on screen

/** Fluoria's zoom range for a label group, or undefined to keep Azgaar's */
export function labelTier(group: string): { min: number; max: number } | undefined {
  return TIERS[group];
}

const STYLE = `
#labels > g { opacity: 1 !important; }
/* dark ink with a hairline pale halo, as an atlas prints it */
#labels text, #labels textPath, #labels tspan {
  fill: #26262b !important;
  fill-opacity: 1 !important;
  stroke: #f4f0e4 !important;
  stroke-opacity: 0.85 !important;
  stroke-width: 0.1em !important; /* in step with each label's own size */
  stroke-linejoin: round !important;
  paint-order: stroke !important;
  text-shadow: none !important;
}
/* areas in spaced capitals: states in their own deep colour (set per label), provinces muted */
#labels > g:is([data-group="state"], [data-group="province"]) :is(text, textPath, tspan) {
  stroke-width: 0.07em !important;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
#labels > g[data-group="province"] :is(text, textPath, tspan) { fill: #5b5246 !important; }
#labels > g[data-group="province"] { opacity: 0.85 !important; }
#labels > g[data-group="river"] :is(text, textPath, tspan) {
  fill: #2c5d93 !important;
  stroke: #e9eef2 !important;
  stroke-width: 0.12em !important;
  font-style: italic;
}
#labels > g[data-group="route"] :is(text, textPath, tspan) {
  fill: #6e4a28 !important;
  stroke: #efe7da !important;
  stroke-width: 0.12em !important;
}
#labels text.flHidden { visibility: hidden; }
body[data-fl-tier="political"] #burgIcons { display: none; }
body[data-fl-tier="region"] #burgIcons > g:not([data-group="capital"], [data-group="city"]) { display: none; }
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
`;

// atlas symbols in a 1×1 box centred on the settlement: a village a black dot; towns, cities and citadels white squares
// growing in size, each with its class's pixel glyph; the capital a square in the road red
const DARK = "#26262b";
const LIGHT = "#f4f1e8";
const CAPITAL_RED = "#a83424";
const HALF: Record<Size | "capital", number> = { town: 0.24, city: 0.32, citadel: 0.4, capital: 0.42 };
const GLYPHS: Record<SettlementClass, string[]> = {
  barracks: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  armoury: [".###.", "#...#", "#...#", "#...#", ".###."],
  harbour: ["..#..", "#####", "..#..", "#.#.#", ".###."],
  airbase: ["..#..", "#####", "..#..", "..#..", ".###."],
  market: [".####", "#....", ".###.", "....#", "####."]
};

function glyph(c: SettlementClass, half: number, ink: string): string {
  const px = (half * 2 * 0.6) / 5;
  const x0 = -2.5 * px;
  return GLYPHS[c]
    .flatMap((row, y) =>
      [...row].map((cell, x) =>
        cell === "#"
          ? `<rect x="${(x0 + x * px).toFixed(3)}" y="${(x0 + y * px).toFixed(3)}" width="${(px + 0.002).toFixed(3)}" height="${(px + 0.002).toFixed(3)}" fill="${ink}" stroke="none"/>`
          : ""
      )
    )
    .join("");
}

// every paint property is set on the shapes, so nothing leaks in from the group styles Azgaar puts on the icons
function symbol(id: string, half: number, fill: string, c: SettlementClass | null, ink: string): string {
  return `<symbol id="fl-${id}" viewBox="-0.5 -0.5 1 1" overflow="visible"><rect x="${-half}" y="${-half}" width="${half * 2}" height="${half * 2}" fill="${fill}" stroke="${DARK}" stroke-width="0.09"/>${c ? glyph(c, half, ink) : ""}</symbol>`;
}

const SYMBOLS = [
  `<symbol id="fl-village" viewBox="-0.5 -0.5 1 1" overflow="visible"><circle r="0.13" fill="${DARK}" stroke="${LIGHT}" stroke-width="0.05"/></symbol>`,
  ...(["town", "city", "citadel", "capital"] as const).flatMap(size =>
    [null, ...CLASS_ORDER].map(c =>
      symbol(
        c ? `${size}-${c}` : size,
        HALF[size],
        size === "capital" ? CAPITAL_RED : LIGHT,
        c,
        size === "capital" ? LIGHT : DARK
      )
    )
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
  if (!document.getElementById("fl-capital-market")) {
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
    for (const { target } of records) {
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
  for (const [group, { min, px }] of Object.entries(TIERS)) {
    if (!px) continue;
    const growth = Math.min(MAX_GROWTH, (scale / Math.max(1, min)) ** GROWTH);
    const screen = Math.round(px * Math.max(1, growth));
    labels.style.setProperty(`--fl-${group}`, `${screen / scale}px`);
  }
  let icon: number = ICON_PX[0][1];
  for (const [from, size] of ICON_PX) if (scale >= from) icon = size;
  icon = Math.round(icon * Math.min(1.8, Math.max(1, (scale / 2) ** 0.3))); // and keeps growing a little closer in
  document.getElementById("burgIcons")?.style.setProperty("--fl-burg", `${icon / scale}px`);
  document.body.dataset.flTier = scale < 1.6 ? "political" : scale < 4.5 ? "region" : "close";
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

/** Where labels overlap on screen, the lower rank gives way; settlement names sit under their symbols */
function declutter(): void {
  const labels = document.querySelectorAll<SVGTextElement>("#labels > g > text");
  const placed: DOMRect[] = [];
  const items: { text: SVGTextElement; rank: number }[] = [];
  const close = (viewport.scale || 1) >= TINY_FROM;
  for (const text of labels) {
    text.classList.remove("flHidden");
    const group = (text.parentElement as HTMLElement | null)?.dataset.group ?? "";
    if (text.dataset.labelType === "burg") landSide(text);
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
    items.push({ text, rank: TIERS[group]?.rank ?? 6 });
  }
  items.sort((a, b) => a.rank - b.rank);
  for (const { text } of items) {
    const box = text.getBoundingClientRect();
    if (!box.width) continue;
    const pad = 1;
    const hit = placed.some(
      other =>
        box.left < other.right - pad &&
        box.right > other.left + pad &&
        box.top < other.bottom - pad &&
        box.bottom > other.top + pad
    );
    if (hit) text.classList.add("flHidden");
    else placed.push(box);
  }
}

/** A settlement's name always sits under its symbol, so a garrison's count can sit above */
function landSide(text: SVGTextElement): void {
  if (text.dataset.flUnder) return; // a unit card stands on it: the name already sits below the card
  text.style.translate = "0 1.5em";
}
