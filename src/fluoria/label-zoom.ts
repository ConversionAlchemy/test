// Fluoria's map lettering, atlas-style: which label groups show at which zoom, how big they are on screen, how each
// kind looks, and which give way where they overlap. Labels and icons stay Azgaar's; this styles and gates them
import { viewport } from "@/components/viewport";
import { ART_PX, SYMBOL, SYMBOL_BOX } from "./constants";
import { cellsOfState, stateInk, TINY_FROM, TINY_STATE } from "./owners";
import { type Rank, rankOf, sizeOf } from "./settlement-size";
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
#burgIcons use { image-rendering: pixelated; }
body[data-fl-tier="political"] #burgIcons use[href="#fl-village"] { display: none; }
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
`;

// pixel symbols, drawn at the unit cards' pixel size: a village, town, city or citadel a white square growing with
// size (a citadel's border twice as thick), each with its class's glyph; the capital a citadel in the road red
const DARK = "#26262b";
const LIGHT = "#f4f1e8";
const CAPITAL_RED = "#a83424";
const GLYPHS: Record<SettlementClass, string[]> = {
  barracks: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  armoury: [".###.", "#...#", "#...#", "#...#", ".###."],
  harbour: ["..#..", "#####", "..#..", "#.#.#", ".###."],
  airbase: ["..#..", "#####", "..#..", "..#..", ".###."],
  market: [".####", "#....", ".###.", "....#", "####."]
};
const CENTRE = ["###", "###", "###"]; // a city with no class

// every paint property on the shapes, so none of the group styles Azgaar puts on the icons leaks in
const rect = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="none" opacity="1"/>`;

/** One symbol on the box's pixel grid; a clear margin round it makes it easy to hover and drop on */
function symbol(id: string, rank: Rank | "capital", c: SettlementClass | null): string {
  const side = SYMBOL[rank];
  const border = side >= SYMBOL.citadel ? 2 : 1;
  const o = (SYMBOL_BOX - side) / 2;
  const fill = rank === "capital" ? CAPITAL_RED : LIGHT;
  const ink = rank === "capital" ? LIGHT : DARK;
  const art = c ? GLYPHS[c] : rank === "city" ? CENTRE : null;
  let pixels = rect(o, o, side, side, DARK) + rect(o + border, o + border, side - border * 2, side - border * 2, fill);
  if (art && side - border * 2 >= art.length + 2) {
    const g = (SYMBOL_BOX - art.length) / 2;
    art.forEach((row, y) => {
      for (const [x, cell] of [...row].entries()) if (cell === "#") pixels += rect(g + x, g + y, 1, 1, ink);
    });
  }
  return `<symbol id="fl-${id}" data-v="3" viewBox="0 0 ${SYMBOL_BOX} ${SYMBOL_BOX}" overflow="visible" shape-rendering="crispEdges"><rect x="-3" y="-3" width="${SYMBOL_BOX + 6}" height="${SYMBOL_BOX + 6}" fill="none" stroke="none" pointer-events="all"/>${pixels}</symbol>`;
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
  // symbols keep their size on screen, pixel for pixel with the unit cards; at the political view half that
  const art = scale < 1.6 ? 1 : ART_PX;
  document.getElementById("burgIcons")?.style.setProperty("--fl-burg", `${(SYMBOL_BOX * art) / scale}px`);
  labels.style.setProperty("--fl-px", String(1 / scale));
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

/** A settlement's name sits under its symbol; its units and garrison pips stand above */
function landSide(text: SVGTextElement): void {
  const burg = pack.burgs[Number(text.dataset.id)];
  const side = burg ? SYMBOL[isCapital(burg) ? "capital" : rankOf(burg)] : SYMBOL.town;
  text.style.translate = `0 calc(var(--fl-px, 1) * ${(side / 2) * ART_PX + 2}px + 0.8em)`;
}
