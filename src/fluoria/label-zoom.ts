// Fluoria's label tiers: which label groups show at which zoom, and how big they are on screen.
// Labels stay Azgaar's; this only sets CSS variables their groups read, and gates groups by zoom
import { viewport } from "@/components/viewport";

interface Tier {
  min: number; // Azgaar zoom from which the group shows
  max: number;
  px?: number; // on-screen font size when it first shows; none keeps Azgaar's, which path labels are fitted to
  outline?: number; // on-screen outline width, thinner for small or path-fitted text
}

// political view shows states alone; regions add provinces and big towns; close in, everything
const TIERS: Record<string, Tier> = {
  state: { min: 0, max: 6, outline: 4 },
  province: { min: 1.6, max: 12, outline: 3.5 },
  capital: { min: 1.6, max: Infinity, px: 20 },
  city: { min: 1.6, max: Infinity, px: 17 },
  town: { min: 4.5, max: Infinity, px: 16 },
  village: { min: 4.5, max: Infinity, px: 15 },
  hamlet: { min: 6, max: Infinity, px: 14 },
  fort: { min: 6, max: Infinity, px: 14 },
  monastery: { min: 6, max: Infinity, px: 14 },
  trading_post: { min: 6, max: Infinity, px: 14 },
  caravanserai: { min: 6, max: Infinity, px: 14 },
  river: { min: 8, max: Infinity, px: 13, outline: 4 },
  route: { min: 8, max: Infinity, px: 13, outline: 4 }
};

const GROWTH = 0.3; // labels grow with zoom, much slower than the map
const MAX_GROWTH = 2;
const OUTLINE_PX = 5; // stroke width on screen; half of it shows outside the letters

/** Fluoria's zoom range for a label group, or undefined to keep Azgaar's */
export function labelTier(group: string): { min: number; max: number } | undefined {
  return TIERS[group];
}

const STYLE = `
#labels text {
  fill: #2a2a30 !important;
  stroke: #ffffff !important;
  stroke-width: var(--fl-outline) !important;
  stroke-linejoin: round !important;
  paint-order: stroke !important;
  text-shadow: none !important;
}
body[data-fl-tier="political"] #burgIcons { display: none; }
body[data-fl-tier="region"] #burgIcons > g:not([data-group="capital"], [data-group="city"]) { display: none; }
${Object.entries(TIERS)
  .filter(([, tier]) => tier.px)
  .map(([group]) => `#labels > g[data-group="${group}"] { font-size: var(--fl-${group}) !important; }`)
  .join("\n")}
${Object.entries(TIERS)
  .filter(([, tier]) => tier.outline)
  .map(([group]) => `#labels > g[data-group="${group}"] text { stroke-width: var(--fl-o-${group}) !important; }`)
  .join("\n")}
`;

let styled = false;

/** Font sizes in map units so each group's on-screen size follows its tier at the current zoom */
export function applyLabelZoom(scale = viewport.scale): void {
  const labels = document.getElementById("labels");
  if (!labels || !scale) return;
  if (!styled) {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.append(style);
    styled = true;
  }
  for (const [group, { min, px, outline }] of Object.entries(TIERS)) {
    if (outline) labels.style.setProperty(`--fl-o-${group}`, `${outline / scale}px`);
    if (!px) continue;
    const growth = Math.min(MAX_GROWTH, (scale / Math.max(1, min)) ** GROWTH);
    const screen = Math.round(px * Math.max(1, growth));
    labels.style.setProperty(`--fl-${group}`, `${screen / scale}px`);
  }
  labels.style.setProperty("--fl-outline", `${OUTLINE_PX / scale}px`);
  document.body.dataset.flTier = scale < 1.6 ? "political" : scale < 4.5 ? "region" : "close";
}
