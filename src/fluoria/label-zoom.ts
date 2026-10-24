// Fluoria's label tiers: which label groups show at which zoom, and how big they are on screen.
// Labels stay Azgaar's; this only sets CSS variables their groups read, and gates groups by zoom
import { viewport } from "@/components/viewport";

interface Tier {
  min: number; // Azgaar zoom from which the group shows
  max: number;
  px?: number; // on-screen font size when it first shows; none keeps Azgaar's, which path labels are fitted to
}

// political view shows states alone; regions add provinces and big towns; close in, everything
const TIERS: Record<string, Tier> = {
  state: { min: 0, max: 6 },
  province: { min: 1.6, max: 12 },
  capital: { min: 1.6, max: Infinity, px: 20 },
  city: { min: 1.6, max: Infinity, px: 17 },
  town: { min: 4.5, max: Infinity, px: 16 },
  village: { min: 4.5, max: Infinity, px: 15 },
  hamlet: { min: 6, max: Infinity, px: 14 },
  fort: { min: 6, max: Infinity, px: 14 },
  monastery: { min: 6, max: Infinity, px: 14 },
  trading_post: { min: 6, max: Infinity, px: 14 },
  caravanserai: { min: 6, max: Infinity, px: 14 },
  river: { min: 8, max: Infinity, px: 13 },
  route: { min: 8, max: Infinity, px: 13 }
};

const GROWTH = 0.3; // labels grow with zoom, much slower than the map
const MAX_GROWTH = 2;

/** Fluoria's zoom range for a label group, or undefined to keep Azgaar's */
export function labelTier(group: string): { min: number; max: number } | undefined {
  return TIERS[group];
}

const STYLE = `
#labels > g { opacity: 1 !important; }
#labels text, #labels textPath, #labels tspan {
  fill: #2a2a30 !important;
  fill-opacity: 1 !important;
  stroke: #ffffff !important;
  stroke-opacity: 1 !important;
  stroke-width: 0.2em !important; /* in step with each label's own size */
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
  for (const [group, { min, px }] of Object.entries(TIERS)) {
    if (!px) continue;
    const growth = Math.min(MAX_GROWTH, (scale / Math.max(1, min)) ** GROWTH);
    const screen = Math.round(px * Math.max(1, growth));
    labels.style.setProperty(`--fl-${group}`, `${screen / scale}px`);
  }
  document.body.dataset.flTier = scale < 1.6 ? "political" : scale < 4.5 ? "region" : "close";
}
