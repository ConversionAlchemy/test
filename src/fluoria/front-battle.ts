// A front battle on the region map, as Hearts of Iron shows one: each side's cards line its border with the other,
// facing across it. Every tick a card fires at the enemy cards beside it, split between them, harder at a card it
// reaches from more than one cell (a flank), softer at one standing on its own land. Losses knock pixels off the cards;
// a card that breaks splits, greys and falls back a cell; a card with no foe beside it steps into an empty enemy
// cell in front. Start it with ?front=1 on a map link, or front.start()
import type { Regiment } from "@/generators/military-generator";
import { domainOf, health, powerOf, troopsOf } from "./forces/forces";
import { canStand } from "./movement";
import { cellCentre, mainCell, neighbours } from "./one-grid";
import { stackAll } from "./units";
import { afterMove, atWar, clearLosses, fallBack, moveToCell } from "./war";

const TICK = 0.7; // seconds between volleys at 1×
const HIT = 0.05; // share of its own power a card deals a tick
const BREAK = 0.3; // health under which a card breaks
const MAX_CARDS = 12;

interface Front {
  a: number;
  b: number;
  regs: Regiment[];
  clashes: [number, number][];
  timer: number;
  speed: number;
  running: boolean;
}
let front: Front | null = null;

const living = () => pack.states.filter(s => s?.i && !s.removed);
const stateOf = (cell: number) => pack.cells.state[cell];
const land = (cell: number) => pack.cells.h[cell] >= 20;
const fighting = (r: Regiment) => !r.broken && troopsOf(r) > 0 && domainOf(r) === "land" && !r.garrison;

/** Cells of `a` touching `b` */
function borderOf(a: number, b: number): number[] {
  const out = new Set<number>();
  for (let c = 0; c < pack.cells.i.length; c++) {
    if (stateOf(c) !== a || !land(c)) continue;
    const m = mainCell(c);
    if (neighbours(m).some(n => land(n) && stateOf(n) === b)) out.add(m);
  }
  return [...out];
}

/** The two neighbours with the longest land border, at war ones first */
function pickPair(): [number, number] | null {
  const S = living().map(s => s.i);
  let best: [number, number] | null = null;
  let score = 0;
  for (const a of S)
    for (const b of S) {
      if (a >= b) continue;
      const n = borderOf(a, b).length;
      if (!n) continue;
      const armies = [a, b].every(s => (pack.states[s].military ?? []).filter(fighting).length >= 4);
      const v = n * (atWar(a, b) ? 3 : 1) * (armies ? 2 : 0.2);
      if (v > score) {
        score = v;
        best = [a, b];
      }
    }
  return best;
}

/** Cells ordered along the front's long axis, then thinned to `n` evenly spaced */
function along(cells: number[], n: number, axis: [number, number]): number[] {
  const key = (c: number) => {
    const [x, y] = cellCentre(c);
    return x * axis[0] + y * axis[1];
  };
  const sorted = [...cells].sort((p, q) => key(p) - key(q));
  if (sorted.length <= n) return sorted;
  return Array.from({ length: n }, (_, k) => sorted[Math.round(((k + 0.5) * sorted.length) / n - 0.5)]);
}

function axisOf(cells: number[]): [number, number] {
  const P = cells.map(cellCentre);
  const mx = P.reduce((s, p) => s + p[0], 0) / P.length;
  const my = P.reduce((s, p) => s + p[1], 0) / P.length;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const [x, y] of P) {
    xx += (x - mx) ** 2;
    xy += (x - mx) * (y - my);
    yy += (y - my) ** 2;
  }
  const a = 0.5 * Math.atan2(2 * xy, xx - yy);
  return [Math.cos(a), Math.sin(a)];
}

/** Lay both sides' strongest land cards along their border with each other, and set them at war */
export function start(a?: number, b?: number): boolean {
  stop();
  const pair = a && b ? ([a, b] as [number, number]) : pickPair();
  if (!pair) return false;
  [a, b] = pair;
  if (!atWar(a, b)) States.setRelation(a, b, "Enemy");
  const ba = borderOf(a, b);
  const bb = borderOf(b, a);
  const axis = axisOf([...ba, ...bb]);
  const regs: Regiment[] = [];
  for (const [side, cells] of [
    [a, ba],
    [b, bb]
  ] as const) {
    const army = (pack.states[side].military ?? [])
      .filter(fighting)
      .sort((p, q) => powerOf(q.u) - powerOf(p.u))
      .slice(0, MAX_CARDS);
    const spots = along(cells, army.length, axis);
    army.slice(0, spots.length).forEach((r, k) => {
      if (!canStand(r, spots[k])) return;
      moveToCell(r, spots[k]);
      r.full = Math.max(r.full ?? 0, powerOf(r.u));
      r.broken = false;
      regs.push(r);
    });
  }
  front = { a, b, regs, clashes: [], timer: 0, speed: 1, running: false };
  stackAll();
  draw();
  bar();
  look();
  return true;
}

/** The camera on the front, close enough that each card stands on its own */
function look(): void {
  if (!front?.regs.length) return;
  const xs = front.regs.map(r => r.x);
  const ys = front.regs.map(r => r.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const fit = Math.min(innerWidth / (x1 - x0 + 60), innerHeight / (y1 - y0 + 60));
  zoomTo((x0 + x1) / 2, (y0 + y1) / 2, Math.min(12, Math.max(5.5, fit)), 1200);
}

export function stop(): void {
  if (!front) return;
  clearInterval(front.timer);
  for (const r of front.regs) r.broken = false;
  front = null;
  document.getElementById("flFront")?.remove();
  document.getElementById("flFrontBar")?.remove();
  stackAll();
}

function play(on: boolean): void {
  if (!front) return;
  front.running = on;
  clearInterval(front.timer);
  if (on) front.timer = window.setInterval(tick, (TICK * 1000) / front.speed);
  bar();
}

const foesBeside = (r: Regiment) => {
  const near = new Set(neighbours(mainCell(r.cell)));
  return (front?.regs ?? []).filter(o => o.state !== r.state && fighting(o) && near.has(mainCell(o.cell)));
};

/** Take a share of a regiment's men, spread over its units */
function lose(r: Regiment, share: number): void {
  for (const [name, n] of Object.entries(r.u))
    r.u[name] = Math.max(0, Math.floor(n * (1 - share) + (Math.random() < 0.5 ? 0 : 0.5)));
}

function tick(): void {
  if (!front) return;
  const hits = new Map<Regiment, number>();
  const clashes: [number, number][] = [];
  const live = front.regs.filter(fighting);
  for (const r of live) {
    const foes = foesBeside(r);
    if (!foes.length) continue;
    const power = powerOf(r.u) * HIT * (0.7 + Math.random() * 0.6);
    for (const o of foes) {
      // a foe reached from several of our cells is flanked; one on its own ground fights better
      const from = new Set(foesBeside(o).map(q => mainCell(q.cell))).size;
      const flank = 1 + 0.35 * (from - 1);
      const home = stateOf(mainCell(o.cell)) === o.state ? 0.85 : 1;
      hits.set(o, (hits.get(o) ?? 0) + (power / foes.length) * flank * home);
      clashes.push([mainCell(r.cell), mainCell(o.cell)]);
    }
  }
  for (const [o, dmg] of hits) lose(o, Math.min(0.5, dmg / Math.max(1, powerOf(o.u))));
  // broken cards split, grey and fall back; empty ones are gone
  for (const r of live) {
    if (troopsOf(r) && health(r) >= BREAK) continue;
    r.broken = true;
    const foe = foesBeside(r)[0];
    const at = foe ? fallBack(r, cellCentre(mainCell(foe.cell))) : null;
    if (at !== null && at !== r.cell) moveToCell(r, at);
  }
  clearLosses(
    front.regs.filter(r => !troopsOf(r)),
    "battle of the front"
  );
  front.regs = front.regs.filter(r => troopsOf(r) > 0);
  // a card with nobody beside it steps into an empty enemy cell next to it
  for (const r of front.regs.filter(fighting)) {
    if (foesBeside(r).length || Math.random() > 0.35) continue;
    const enemy = r.state === front.a ? front.b : front.a;
    const taken = new Set(front.regs.map(q => mainCell(q.cell)));
    const next = neighbours(mainCell(r.cell)).find(
      c => land(c) && stateOf(c) === enemy && !taken.has(c) && canStand(r, c)
    );
    if (next === undefined) continue;
    moveToCell(r, next);
    if (afterMove(r)) window.dispatchEvent(new Event("fl:occupation"));
  }
  front.clashes = clashes;
  stackAll();
  draw();
  bar();
  const left = (s: number) => front?.regs.filter(r => r.state === s && fighting(r)).length ?? 0;
  if (!left(front.a) || !left(front.b)) play(false);
}

/** Where cards are locked in fire: a short pulsing bar across the border between them */
function draw(): void {
  if (!front) return;
  const viewbox = document.getElementById("viewbox");
  if (!viewbox) return;
  let g = document.getElementById("flFront") as Element | null;
  if (!g) {
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.id = "flFront";
    g.setAttribute("pointer-events", "none");
  }
  viewbox.append(g); // above the cards
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const [p, q] of front.clashes) {
    const key = p < q ? `${p}-${q}` : `${q}-${p}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const [x0, y0] = cellCentre(p);
    const [x1, y1] = cellCentre(q);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (-(y1 - y0) / d) * 2.2;
    const ny = ((x1 - x0) / d) * 2.2;
    parts.push(
      `<line x1="${mx - nx}" y1="${my - ny}" x2="${mx + nx}" y2="${my + ny}" stroke="#1b1b1b" stroke-width="1.6"/>` +
        `<line x1="${mx - nx}" y1="${my - ny}" x2="${mx + nx}" y2="${my + ny}" stroke="#f6d36a" stroke-width="0.8" class="flClash"/>`
    );
  }
  g.innerHTML = parts.join("");
}

/** Play, pause and speed, and each side's men left */
function bar(): void {
  if (!front) return;
  let el = document.getElementById("flFrontBar");
  if (!el) {
    el = document.createElement("div");
    el.id = "flFrontBar";
    document.body.append(el);
    el.addEventListener("click", e => {
      const k = (e.target as HTMLElement).closest<HTMLElement>("[data-k]")?.dataset.k;
      if (!front || !k) return;
      if (k === "play") play(!front.running);
      if (k === "speed") {
        front.speed = front.speed >= 4 ? 1 : front.speed * 2;
        play(front.running);
      }
      if (k === "stop") stop();
    });
  }
  const men = (s: number) => front?.regs.filter(r => r.state === s).reduce((n, r) => n + troopsOf(r), 0) ?? 0;
  const side = (s: number) =>
    `<span class="flFrontSide" style="--c:${pack.states[s].color}">${pack.states[s].name} ${men(s)}</span>`;
  el.innerHTML = `<button data-k="play">${front.running ? "❚❚" : "▶"}</button><button data-k="speed">${front.speed}×</button>${side(front.a)}${side(front.b)}<button data-k="stop">✕</button>`;
}

const STYLE = `
#flFrontBar { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 20; display: flex; gap: 6px; align-items: center; background: #26272a; border: 1px solid #46464d; padding: 4px 8px; font: 18px VT323, monospace; color: #e4e1d6; }
#flFrontBar button { font: inherit; color: inherit; background: #1b1b1e; border: 1px solid #46464d; padding: 1px 9px; cursor: pointer; }
.flFrontSide { border-left: 3px solid var(--c); padding-left: 5px; }
.flClash { animation: flClash 0.7s steps(2) infinite; }
@keyframes flClash { 50% { opacity: 0.2; } }
`;
{
  const s = document.createElement("style");
  s.textContent = STYLE;
  document.head.append(s);
}

/** ?front=1 on a map link: lay the front once the map is up */
if (new URL(location.href).searchParams.get("front")) {
  const wait = window.setInterval(() => {
    if (typeof pack === "undefined" || !pack.states?.length || !document.getElementById("armies")?.children.length)
      return;
    clearInterval(wait);
    window.setTimeout(() => start(), 1500);
  }, 500);
}

/** Walk a regiment into a cell as a move would: occupation, province seats and capitals follow */
function march(r: Regiment, cell: number): boolean {
  moveToCell(r, cell);
  const changed = afterMove(r);
  if (changed) window.dispatchEvent(new Event("fl:occupation"));
  stackAll();
  return changed;
}

(window as unknown as { front: object }).front = { start, stop, play, tick, march, state: () => front };
