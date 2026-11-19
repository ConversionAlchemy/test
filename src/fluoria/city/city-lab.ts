// the settlement lab: every settlement on real Azgaar maps, or any kind of place from a few settings

import type { Region } from "./city-gen";
import { mountCity } from "./city-view";
import { LAYOUTS, type Params, regionOf, sizeOf, synthRegion, type World } from "./settlement";

declare const REGION: Region;
declare const WORLDS: World[];

const PRESETS: Record<string, Partial<Params> | null> = {
  Goldbank: null,
  "Port city": {
    size: "city",
    walled: true,
    fort: false,
    hill: true,
    shanty: true,
    roads: "y",
    coast: 270,
    river: false
  },
  "Walled crossroads": {
    size: "town",
    walled: true,
    fort: false,
    hill: false,
    shanty: true,
    roads: "cross",
    coast: null,
    river: false
  },
  "Market town": {
    size: "town",
    walled: false,
    fort: false,
    hill: true,
    shanty: false,
    roads: "t",
    coast: null,
    river: false
  },
  "River town": {
    size: "town",
    walled: true,
    fort: true,
    hill: false,
    shanty: false,
    roads: "through",
    coast: null,
    river: true
  },
  "Fishing village": {
    size: "village",
    walled: false,
    fort: false,
    hill: false,
    shanty: false,
    roads: "end",
    coast: 90,
    river: false
  },
  Village: {
    size: "village",
    walled: false,
    fort: false,
    hill: false,
    shanty: false,
    roads: "through",
    coast: null,
    river: false
  },
  "Village + fort": {
    size: "village",
    walled: false,
    fort: true,
    hill: false,
    shanty: false,
    roads: "t",
    coast: null,
    river: false
  },
  Hamlet: {
    size: "hamlet",
    walled: false,
    fort: false,
    hill: false,
    shanty: false,
    roads: "bend",
    coast: null,
    river: false,
    woods: true
  }
};

const P: Params = {
  name: "Ashford",
  size: "town",
  walled: true,
  fort: false,
  hill: true,
  shanty: true,
  roads: "cross",
  turn: 0,
  coast: null,
  river: false,
  woods: false,
  seed: 1
};
let mode: "world" | "manual" | "goldbank" = "world";
let wi = 0;
let bi = 0;
const burgsOf = (w: World) => [...w.burgs].sort((a, b) => b.pop - a.pop);

const lab = document.getElementById("lab") as HTMLElement;
const host = document.getElementById("city") as HTMLElement;
const title = document.getElementById("title");
const COMPASS: (number | null)[] = [315, 0, 45, 270, null, 90, 225, 180, 135];
const btns = (key: string, vals: [string, string][]) =>
  vals.map(([v, l]) => `<button data-k="${key}" data-v="${v}">${l}</button>`).join("");

lab.innerHTML = `
<div class="zone"><select data-world>${WORLDS.map((w, k) => `<option value="${k}">Map ${k + 1} · seed ${w.seed}</option>`).join("")}</select><canvas class="mini" width="480" height="300"></canvas><select data-burg></select><div class="pgrid"><button data-a="prev">Prev</button><button data-a="next">Next</button></div><div class="fl info"></div></div>
<div class="zone"><select data-preset>${Object.keys(PRESETS)
  .map(k => `<option>${k}</option>`)
  .join("")}</select><input type="text" data-name></div>
<div class="zone"><div class="fl">Size</div><div class="g4">${btns("size", [
  ["hamlet", "Hamlet"],
  ["village", "Village"],
  ["town", "Town"],
  ["city", "City"]
])}</div></div>
<div class="zone"><div class="fl">Roads</div><div class="g4">${btns("roads", [
  ["none", "None"],
  ["end", "End"],
  ["through", "Thru"],
  ["bend", "Bend"],
  ["t", "T"],
  ["y", "Y"],
  ["cross", "Cross"],
  ["star", "Star"]
])}</div><input type="range" min="0" max="355" step="5" data-turn></div>
<div class="zone"><div class="fl">Coast</div><div class="g3 compass">${COMPASS.map(
  c =>
    `<button data-k="coast" data-v="${c ?? ""}">${c === null ? "-" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][c / 45]}</button>`
).join("")}</div></div>
<div class="zone"><div class="g3">${["walled", "fort", "river", "hill", "shanty", "woods"]
  .map(
    k =>
      `<button data-t="${k}">${{ walled: "Walls", fort: "Fort", river: "River", hill: "Hill", shanty: "Slums", woods: "Woods" }[k]}</button>`
  )
  .join("")}</div></div>
<div class="zone"><div class="pgrid"><button data-a="seed">New seed</button><button data-a="random">Random</button></div></div>`;

const mini = lab.querySelector(".mini") as HTMLCanvasElement;
const burgSel = lab.querySelector("[data-burg]") as HTMLSelectElement;
const info = lab.querySelector(".info") as HTMLElement;
let fit = { k: 1, x: 0, y: 0 };
const drawMini = () => {
  const w = WORLDS[wi];
  const g = mini.getContext("2d") as CanvasRenderingContext2D;
  let x1 = 0;
  let y1 = 0;
  for (const c of w.cells)
    for (const p of c.p) {
      x1 = Math.max(x1, p[0]);
      y1 = Math.max(y1, p[1]);
    }
  const k = Math.min(mini.width / x1, mini.height / y1);
  fit = { k, x: (mini.width - x1 * k) / 2, y: (mini.height - y1 * k) / 2 };
  g.fillStyle = "#9cbccb";
  g.fillRect(0, 0, mini.width, mini.height);
  for (const c of w.cells) {
    if (c.h < 20) continue;
    const t = Math.min(1, (c.h - 20) / 50);
    g.fillStyle = [5, 6, 7, 8, 9].includes(c.b)
      ? `rgb(${120 - t * 30},${150 - t * 30},${92 - t * 20})`
      : `rgb(${190 - t * 40},${196 - t * 50},${130 - t * 30})`;
    g.beginPath();
    for (const [j, p] of c.p.entries()) g[j ? "lineTo" : "moveTo"](fit.x + p[0] * k, fit.y + p[1] * k);
    g.fill();
    g.strokeStyle = g.fillStyle;
    g.stroke();
  }
  g.strokeStyle = "rgba(120,60,40,.7)";
  g.lineWidth = 1;
  for (const r of w.routes) {
    g.beginPath();
    for (const [j, p] of r.pts.entries()) g[j ? "lineTo" : "moveTo"](fit.x + p[0] * k, fit.y + p[1] * k);
    g.stroke();
  }
  const sel = burgsOf(w)[bi];
  for (const b of w.burgs) {
    const r = b.cap ? 4 : b.rank === "village" ? 1.6 : 2.6;
    g.fillStyle = b === sel ? "#f0c85a" : "#2a231a";
    g.fillRect(fit.x + b.x * k - r, fit.y + b.y * k - r, r * 2, r * 2);
  }
  if (sel) {
    g.strokeStyle = "#f0c85a";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(fit.x + sel.x * k, fit.y + sel.y * k, 9, 0, Math.PI * 2);
    g.stroke();
  }
};
const fillBurgs = () => {
  burgSel.innerHTML = burgsOf(WORLDS[wi])
    .map((b, k) => `<option value="${k}">${b.n} · ${sizeOf(b)} · ${Math.round(b.pop * 1000).toLocaleString()}</option>`)
    .join("");
};
mini.addEventListener("click", e => {
  const r = mini.getBoundingClientRect();
  const x = (((e.clientX - r.left) / r.width) * mini.width - fit.x) / fit.k;
  const y = (((e.clientY - r.top) / r.height) * mini.height - fit.y) / fit.k;
  const L = burgsOf(WORLDS[wi]);
  let best = -1;
  let bd = Infinity;
  for (const [k, b] of L.entries()) {
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  if (best < 0) return;
  mode = "world";
  bi = best;
  go();
});
const sync = () => {
  const real = mode !== "manual";
  for (const b of lab.querySelectorAll<HTMLButtonElement>("[data-k]")) {
    const k = b.dataset.k as keyof Params;
    const v = P[k];
    b.classList.toggle("on", !real && String(v ?? "") === b.dataset.v);
  }
  for (const b of lab.querySelectorAll<HTMLButtonElement>("[data-t]"))
    b.classList.toggle("on", !real && !!P[b.dataset.t as keyof Params]);
  (lab.querySelector("[data-turn]") as HTMLInputElement).value = String(P.turn);
  (lab.querySelector("[data-name]") as HTMLInputElement).value = mode === "goldbank" ? "Goldbank" : P.name;
  burgSel.value = String(bi);
  const b = burgsOf(WORLDS[wi])[bi];
  info.textContent =
    mode === "world" && b
      ? [
          sizeOf(b),
          b.cap && "capital",
          b.port && "port",
          b.walls && "walls",
          b.citadel && "citadel",
          b.plaza && "plaza",
          b.temple && "temple",
          b.shanty && "shanty"
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
  drawMini();
};
const go = () => {
  sync();
  if (mode === "world") {
    const w = WORLDS[wi];
    const b = burgsOf(w)[bi];
    const { region, spec } = regionOf(w, b);
    if (title) title.textContent = b.n;
    try {
      localStorage.removeItem(`fl-city-${b.n}`);
    } catch {
      /* no storage */
    }
    mountCity(host, region, b.n, spec);
    return;
  }
  const name = mode === "goldbank" ? "Goldbank" : P.name || "Ashford";
  if (title) title.textContent = name;
  if (mode === "goldbank") mountCity(host, REGION, "Goldbank");
  else {
    try {
      localStorage.removeItem(`fl-city-${name}`);
    } catch {
      /* no storage */
    }
    mountCity(host, synthRegion(P), name, P);
  }
};

lab.addEventListener("click", e => {
  const b = (e.target as HTMLElement).closest("button");
  if (!b) return;
  if (b.dataset.a === "prev" || b.dataset.a === "next") {
    const L = burgsOf(WORLDS[wi]).length;
    bi = mode === "world" ? (bi + (b.dataset.a === "next" ? 1 : L - 1)) % L : bi;
    mode = "world";
    go();
    return;
  }
  mode = "manual";
  if (b.dataset.k) {
    const k = b.dataset.k;
    const v = b.dataset.v as string;
    if (k === "coast") P.coast = v === "" ? null : +v;
    else (P as unknown as Record<string, string>)[k] = v;
  } else if (b.dataset.t) {
    const k = b.dataset.t as "walled";
    P[k] = !P[k];
  } else if (b.dataset.a === "seed") P.seed = (Math.random() * 1e6) | 0;
  else if (b.dataset.a === "random") {
    const pick = <T>(a: readonly T[]) => a[(Math.random() * a.length) | 0];
    P.size = pick(["hamlet", "village", "town", "city"] as const);
    P.roads = pick(Object.keys(LAYOUTS) as Params["roads"][]);
    P.turn = pick([0, 15, 30, 45, 60, 75]);
    P.coast = Math.random() < 0.4 ? pick([0, 45, 90, 135, 180, 225, 270, 315]) : null;
    for (const k of ["walled", "fort", "river", "hill", "shanty", "woods"] as const) P[k] = Math.random() < 0.4;
    P.seed = (Math.random() * 1e6) | 0;
  }
  go();
});
burgSel.addEventListener("change", () => {
  mode = "world";
  bi = +burgSel.value;
  go();
});
lab.querySelector("[data-world]")?.addEventListener("change", e => {
  mode = "world";
  wi = +(e.target as HTMLSelectElement).value;
  bi = 0;
  fillBurgs();
  go();
});
lab.querySelector("[data-turn]")?.addEventListener("change", e => {
  mode = "manual";
  P.turn = +(e.target as HTMLInputElement).value;
  go();
});
lab.querySelector("[data-name]")?.addEventListener("change", e => {
  mode = "manual";
  P.name = (e.target as HTMLInputElement).value.trim() || "Ashford";
  go();
});
lab.querySelector("[data-preset]")?.addEventListener("change", e => {
  const k = (e.target as HTMLSelectElement).value;
  const pr = PRESETS[k];
  mode = pr ? "manual" : "goldbank";
  if (pr) Object.assign(P, { turn: 0, woods: false, ...pr, name: k === "Village + fort" ? "Harrowby" : P.name });
  go();
});
(lab.querySelector("[data-preset]") as HTMLSelectElement).value = "Walled crossroads";
Object.assign(P, PRESETS["Walled crossroads"]);
fillBurgs();
go();
(window as unknown as { lab: Params }).lab = P;
