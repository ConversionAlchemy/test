// Generates fresh Azgaar maps in the running dev server and saves each as a city-view world (region-from-pack.ts),
// for the settlement lab. Usage: npm run dev, then node scripts/city-worlds.mjs out.json 4242 1717 ...
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const [out = "city-worlds.json", ...seeds] = process.argv.slice(2);
const base = process.env.FMG_URL ?? "http://localhost:5173/Fantasy-Map-Generator/";
const browser = await chromium.launch();
const worlds = [];
for (const seed of seeds.length ? seeds : ["4242"]) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`${base}?seed=${seed}`, { timeout: 120000 });
  await page.waitForFunction(() => window.pack?.burgs?.length > 2 && window.pack.religions && window.fluoriaCityWorld, null, {
    timeout: 120000
  });
  const world = await page.evaluate(() => window.fluoriaCityWorld());
  console.log(seed, `${world.burgs.length} settlements`);
  worlds.push(world);
  await page.close();
}
writeFileSync(out, JSON.stringify(worlds));
await browser.close();
