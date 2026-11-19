// the settlement lab: any kind of place, generated from a few settings, to stress-test the city generator

import type { Region } from "./city-gen";
import { mountCity } from "./city-view";
import { LAYOUTS, type Params, synthRegion } from "./settlement";

declare const REGION: Region;

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
let real = false;

const lab = document.getElementById("lab") as HTMLElement;
const host = document.getElementById("city") as HTMLElement;
const title = document.getElementById("title") as HTMLElement;
const COMPASS: (number | null)[] = [315, 0, 45, 270, null, 90, 225, 180, 135];
const btns = (key: string, vals: [string, string][]) =>
  vals.map(([v, l]) => `<button data-k="${key}" data-v="${v}">${l}</button>`).join("");

lab.innerHTML = `
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

const sync = () => {
  for (const b of lab.querySelectorAll<HTMLButtonElement>("[data-k]")) {
    const k = b.dataset.k as keyof Params;
    const v = P[k];
    b.classList.toggle("on", !real && String(v ?? "") === b.dataset.v);
  }
  for (const b of lab.querySelectorAll<HTMLButtonElement>("[data-t]"))
    b.classList.toggle("on", !real && !!P[b.dataset.t as keyof Params]);
  (lab.querySelector("[data-turn]") as HTMLInputElement).value = String(P.turn);
  (lab.querySelector("[data-name]") as HTMLInputElement).value = real ? "Goldbank" : P.name;
};
const go = () => {
  sync();
  const name = real ? "Goldbank" : P.name || "Ashford";
  title.textContent = name;
  if (real) mountCity(host, REGION, "Goldbank");
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
  real = false;
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
lab.querySelector("[data-turn]")?.addEventListener("change", e => {
  real = false;
  P.turn = +(e.target as HTMLInputElement).value;
  go();
});
lab.querySelector("[data-name]")?.addEventListener("change", e => {
  real = false;
  P.name = (e.target as HTMLInputElement).value.trim() || "Ashford";
  go();
});
lab.querySelector("[data-preset]")?.addEventListener("change", e => {
  const k = (e.target as HTMLSelectElement).value;
  const pr = PRESETS[k];
  real = !pr;
  if (pr) Object.assign(P, { turn: 0, woods: false, ...pr, name: k === "Village + fort" ? "Harrowby" : P.name });
  go();
});
(lab.querySelector("[data-preset]") as HTMLSelectElement).value = "Walled crossroads";
Object.assign(P, PRESETS["Walled crossroads"]);
go();
(window as unknown as { lab: Params }).lab = P;
