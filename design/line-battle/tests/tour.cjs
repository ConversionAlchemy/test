// tournament: games given as seed:greenBrain:redBrain:greenFactor; prints one JSON line per game
const { chromium } = require('playwright');
(async () => {
  const games = process.argv[2].split(',').map(g => g.split(':')), Wset = process.argv[3] ? JSON.parse(process.argv[3]) : null;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://" + require("path").join(__dirname, "..", "index.html") + "'); await p.waitForTimeout(300);
  for (const [seed, gb, rb, gf] of games) {
    const r = await p.evaluate(([seed, gb, rb, gf, Wset]) => {
      __lb.setPaused(true); __lb.scen({ kind: 'random', seed: +seed }); __lb.me('none'); __lb.brain.green = gb; __lb.brain.red = rb;
      if (Wset) Object.assign(__lb.W, Wset);
      const f = +gf;
      for (const side of ['green', 'red']) { const k = side === 'green' ? f : 1 / f; if (k < 1) for (const r of __lb.regsNow().filter(r => r.side === side && !r.gun)) { const L = r.men.filter(m => m.alive), n = Math.round(L.length * (1 - k)); for (const m of L.slice(0, n)) m.alive = false; r.n0 = L.length - n; } }
      const tot = s => __lb.regsNow().filter(r => r.side === s && !r.gun).reduce((a, r) => a + r.n0, 0);
      const G0 = tot('green'), R0 = tot('red');
      __lb.setPaused(false);
      let t = 0, stuck = 0;
      const live = s => __lb.regsNow().filter(r => r.side === s && !r.gun && !r.rout && r.men.some(m => m.alive));
      for (; t < 300; t += 2) { __lb.sim(2); if (!live('green').length || !live('red').length) break; }
      const left = s => live(s).reduce((a, r) => a + r.men.filter(m => m.alive).length, 0);
      const g = left('green') / G0, rd = left('red') / R0;
      return { seed: +seed, gb, rb, gf: f, t, green: +g.toFixed(2), red: +rd.toFixed(2), win: g > rd + 0.05 ? 'green' : rd > g + 0.05 ? 'red' : 'draw' };
    }, [seed, gb, rb, gf, Wset]);
    console.log(JSON.stringify(r));
  }
  if (errs.length) console.log('errs', errs.slice(0, 3));
  await b.close();
})();
