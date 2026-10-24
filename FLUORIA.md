# Fluoria

Fluoria is a fork of Azgaar's Fantasy Map Generator, extended into one connected tool for a roleplay world: the world map, every city in it, and every building in those cities, all in one pixel-art style and all editable.

This file is the design brief. Every session working on Fluoria reads it first. Decisions recorded here are settled unless Osh changes them.

## The idea in one paragraph

Azgaar makes the world. Watabou's tools make cities, villages and houses. Today they are separate websites joined by a link. Fluoria joins them properly: click a city on the world map and open it, zoom down to a street, click a building and step inside. Everything shares one pixel-art look, everything can be painted and edited, and changes flow back up (build more houses and the city's population rises).

## Three views, two buttons

| View | What it shows | How you get there |
| --- | --- | --- |
| World | Azgaar's map. Zoomed out: states, borders, roads. Zoomed in: region detail (forests, hills, fields, rugged coasts, towns as roof clusters). | Opens on load |
| City | One city or village. Zooms from the whole town down to a single street. | Click a city, then **Open city** in its panel |
| Interior | One building, floor by floor. | Click a building, then **Enter** on its card |

- World and region are one view at different zooms, not two views.
- City and street are one view at different zooms, not two views.
- A breadcrumb shows where you are: `Fluoria › Portsbridge › The Honest Weight`. Click any part to jump back; Escape goes up one level.
- Moving between views uses a short zoom or fade (about half a second), so it feels like going in, not switching screens.
- Each view loads only its own data. The world never holds streets; a city never holds rooms.

## Art direction

Reference images are in `design/previews/`. The region preview (`2-region.png`) is the benchmark Osh likes most; every view should feel like it.

- **Pixel art, chunky.** Every view is drawn at a low internal resolution and scaled up with nearest-neighbour (no smoothing). Zoom goes in whole-number steps (1×, 2×, 3×, 4×); below 1× a pre-shrunk image is used, so pixels never blur or shimmer.
- **One palette for everything** (see below). Light comes from the top-left in every view.
- **Font: VT323** (Google Fonts, OFL licence), for everything: place names, room names, numbers, buttons. Rendered without smoothing.
- **No grid look.** Buildings keep their real angles and irregular shapes from Watabou. Roofs are shaded along their own ridge line, with tile rows. Ground textures vary (several versions per tile, chosen by position, plus a gentle large-scale colour shift) so repetition never shows.
- **Layers, not combinations.** Ground (grass, dirt, cobbles, flagstones, mud, sand, water) + overlays (blood, scorch, craters, rubble, puddles, snow) + objects (buildings, walls, trees, carts). Battle damage is an overlay on any ground.
- **Interior surroundings are solid black**, so the building stands alone.
- **Labels never collide.** They move apart and hide by importance as you zoom.

### Palette

| Token | RGB | Use |
| --- | --- | --- |
| deep / water / water2 / foam | 46,74,112 · 58,92,132 · 66,102,142 · 132,168,196 | Sea, lakes, shore |
| sand / sand2 | 196,182,134 · 178,164,118 | Beaches |
| g1–g4 | 92,124,62 · 104,138,70 · 82,112,56 · 120,152,80 | Grass |
| dirt / dirt2 / dirt3 | 138,110,74 · 120,94,62 · 156,128,88 | Dirt, tracks, town ground |
| cob1–cob3 / gap | 150,146,136 · 132,128,120 · 166,162,150 · 88,84,80 | Cobbles |
| clay / clay2 / clay3 | 156,82,60 · 128,64,48 · 176,102,74 | Clay roofs |
| slate / slate2 / slate3 | 80,88,108 · 64,70,88 · 98,106,126 | Slate roofs |
| thatch / thatch2 / thatch3 | 178,150,94 · 150,124,74 · 196,172,112 | Thatch roofs |
| stone / stone2 / stone3 | 124,120,112 · 100,96,90 · 146,142,132 | Walls, quays |
| tree / tree2 / tree3 | 60,94,50 · 44,72,40 · 82,118,62 | Trees |
| field1–3 | 176,160,90 · 150,150,78 · 130,146,70 | Farmland |
| wood / wood2 | 118,86,56 · 92,66,42 | Piers, furniture, beams |
| gold / gold2 | 214,172,60 · 166,126,36 | Coins, highlights |
| blood / blood2 / scorch | 128,22,26 · 92,14,18 · 56,48,42 | Overlays |
| ink | 36,32,38 | Outlines, text |

The exact values live in `design/prototype/common.py` until the real renderer has its own palette module.

## World view

- Built on Azgaar's own data and generators; nothing about states, cultures, burgs or population is reinvented.
- **Half the size.** Fluoria is 1440 × 872 map pixels at 3 miles per pixel. Set the distance scale to 1.5 miles per pixel. No data changes; the world simply measures half as large, and the extra zoom is spent on detail.
- **Region detail when zoomed in:** forests, hills, farmland near towns, beaches, rugged coastlines, towns drawn as roof clusters, state colour as a light tint with dashed borders.
- **One simple paint toolbar** replacing Azgaar's scattered editors, calling Azgaar's existing functions underneath:
  - Terrain brushes: water, deep water, land, mountains, hills, forest, farmland, marsh.
  - City stamp: click to place a village, town or city.
  - Roads, state borders and cultures, painted the same way.
- Forest and farmland are cosmetic and always safe to paint. Changing land and water changes Azgaar's cells and can disturb nearby states and rivers, so that tool warns first (as Azgaar's heightmap editor does).

## City view

- **Source of a city:** a Watabou export first, our own generator later. Both produce the same data, so the editor treats them identically.
- **Watabou import** (tested, see `design/samples/`):
  - City generator (`generator: "mfcg"`) and village generator (`generator: "vg"`) both export GeoJSON with: buildings (exact polygons), roads (with widths), walls, palisade, piers ("planks"), squares, greens, fields, trees, named districts, water and earth.
  - Coordinates have north up (flip y when drawing).
  - Portsbridge: Azgaar population 14,101 → 1,821 buildings (about 8 people per building). Willard's Pass: 1,759 → 158 buildings.
  - Azgaar already builds the matching Watabou link for each burg in `src/generators/burgs-generator.ts` (`createWatabouCityLinks`, `createWatabouVillageLinks`, `createWatabouDwellingLinks`), passing seed, population, coast, river, walls, citadel, temple, plaza and shanty town. Reuse this so imported towns match the world.
- **Editing:**
  - Paint a district and choose its type (housing, slums, market, port, temple, rich quarter, fields). The generator fills it with streets and buildings in Watabou's style.
  - Add, remove and move buildings by hand; draw roads.
  - Lock anything hand-edited so regenerating never overwrites it.
- **Population follows what is built.** Each building houses people by its size and district type (slums pack people in, rich quarters do not). The total shows live and is written back to the burg in Azgaar. If Azgaar's population grows, the city view offers to grow the town outward at its edges instead of regenerating it.
- Each city is saved in its own file, not inside the `.map`, to keep the world fast.

## Interior view

- **Source of a building:** a Dwellings export first, our own generator later.
- **Dwellings import** (tested, see `design/samples/house_by_the_lake.json`): floors, each with named rooms as grid cells (`i`, `j`), doors (cell edge and direction), windows, stairs (up or down, with direction), and the front door (`exit`). No furniture and no front view.
- We add:
  - Furniture generated from room names (kitchen: oven and work table; common room: tables, stools, hearth; and so on), editable afterwards.
  - The front view (elevation) generated from footprint, floor count and roof type, shown on the building card.
  - Floor buttons (cellar, ground, upper, attic), a faint 1 m grid, and snapping.
- Thick stone walls with corner piers, windows as light slots, boards and flagstones, hearth and candle glow. Surroundings solid black.

## Our own generators

- Azgaar's generators are MIT licensed: we build on them directly.
- Watabou's current tools are closed source; only an older version of his city generator is public (GPL). We do not copy his code. We follow his published method (spiral-seeded Voronoi wards → streets along ward edges → blocks cut recursively into plots → buildings) and output the same data his exports contain. A first version of this method is in `design/prototype/city2.py`.

## Coins and armies (last)

Built last, but designed for from the start:

- Characters are letter coins (first letter of their name), built on Azgaar's markers. They scale with zoom and carry across views: in the world they show which city they are in; in the city they stand on their street; inside they snap to a floor cell.
- Regiments are drawn to scale in the city view (one dot per 25 soldiers, in blocks), using the existing unit icons and colours.

## Phases

Each phase ends with something Osh can open and use.

1. **Groundwork.** This brief, previews, samples, import prototype; Azgaar running from the fork.
2. **Pixel engine.** Shared renderer: palette, VT323, textures, connected tiles, overlays, whole-number zoom.
3. **World view.** Azgaar's map in the pixel style with region detail; halved scale; paint toolbar.
4. **City view.** Open city; Watabou import; pixel rendering; zoom to street; district painting and building edits; population written back; per-city save files.
5. **Interior view.** Enter building; Dwellings import; generated furniture and front view; floors; snapping.
6. **Extras.** Pixel emblem editor (grid, X/Y mirror, shape stamps), UX polish, battles inside the city view.
7. **Coins and armies.**

## Status

- Phase 1, groundwork: done.
- Phase 2, pixel engine: first version in `src/fluoria/` (palette, noise, terrain and overlay types, the pixel raster, brushes, camera, labels, and the PixiJS stage). Try it on the test bench: open the app with `?view=pixel` added to the address, or run `Controllers.PixelView.open()` in the console.

## Working rules for this fork

- Follow Azgaar's own rules in `CONTEXT.md` (TypeScript, Biome, layering, no new production dependencies without permission).
- Fluoria code lives in its own folders where possible, so Azgaar's updates can still be merged.
- Never run Playwright tests without asking.
