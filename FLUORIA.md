# Fluoria

Fluoria is a fork of Azgaar's Fantasy Map Generator, extended into one connected tool for a roleplay world: the world map, every city in it, and every building in those cities, all in one pixel-art style and all editable.

This file is the design brief. Every session working on Fluoria reads it first. Decisions recorded here are settled unless Osh changes them.

## The idea in one paragraph

Azgaar makes the world. Watabou's tools make cities, villages and houses. Today they are separate websites joined by a link. Fluoria joins them properly: click a city on the world map and open it, zoom down to a street, click a building and step inside. Everything shares one pixel-art look, everything can be painted and edited, and changes flow back up (build more houses and the city's population rises).

## Three views, two buttons

| View | What it shows | How you get there |
| --- | --- | --- |
| World | Azgaar's map, drawn in pixels inside Azgaar's own UI. Zoomed out: states, borders, roads. Zoomed in: region detail (finer forests, hills, coasts). | Opens on load |
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
- **Everything is seen from straight above**, mountains included. Relief comes from elevation: slopes facing the light brighten, slopes facing away darken, in hard steps. Mountains are a rock texture (mottled stone, scree, cracks, moss lower down), hills are rough grass, and snow covers whatever is high enough. No side-view peaks or icons.
- **Font: VT323** (Google Fonts, OFL licence), for everything: place names, room names, numbers, buttons. Rendered without smoothing.
- **No grid look.** Buildings keep their real angles and irregular shapes from Watabou. Roofs are shaded along their own ridge line, with tile rows. Ground textures vary (several versions per tile, chosen by position, plus a gentle large-scale colour shift) so repetition never shows.
- **Layers, not combinations.** Ground (grass, dirt, cobbles, flagstones, mud, sand, water) + overlays (blood, scorch, craters, rubble, puddles, snow) + objects (buildings, walls, trees, carts). Battle damage is an overlay on any ground.
- **Interior surroundings are solid black**, so the building stands alone.
- **Labels never collide.** They move apart and hide by importance as you zoom.

### Palette

| Token | RGB | Use |
| --- | --- | --- |
| deep / water / water2 / foam | 28,54,94 · 34,63,106 · 42,74,120 · 120,150,178 | Sea, lakes, shore |
| sand / sand2 | 222,206,150 · 204,186,130 | Beaches |
| g1–g4 | 176,180,104 · 192,192,116 · 160,168,94 · 206,200,128 | Grass |
| dirt / dirt2 / dirt3 | 138,110,74 · 120,94,62 · 156,128,88 | Dirt, tracks, town ground |
| cob1–cob3 / gap | 150,146,136 · 132,128,120 · 166,162,150 · 88,84,80 | Cobbles |
| clay / clay2 / clay3 | 156,82,60 · 128,64,48 · 176,102,74 | Clay roofs |
| slate / slate2 / slate3 | 80,88,108 · 64,70,88 · 98,106,126 | Slate roofs |
| thatch / thatch2 / thatch3 | 178,150,94 · 150,124,74 · 196,172,112 | Thatch roofs |
| stone / stone2 / stone3 | 140,130,116 · 112,104,94 · 168,160,146 | Walls, quays, mountains |
| tree / tree2 / tree3 | 82,122,56 · 58,94,44 · 112,152,70 | Trees |
| field1–3 | 214,186,120 · 198,178,110 · 184,174,100 | Farmland, dry plains |
| wood / wood2 | 118,86,56 · 92,66,42 | Piers, furniture, beams |
| gold / gold2 | 214,172,60 · 166,126,36 | Coins, highlights |
| blood / blood2 / scorch | 128,22,26 · 92,14,18 · 56,48,42 | Overlays |
| ink | 36,32,38 | Outlines, text |
| atlas / atlas2 / atlasCoast | 204,226,240 · 196,220,237 · 64,104,150 | Atlas views: sea, coastline |

The exact values live in `design/prototype/common.py` until the real renderer has its own palette module.

## World view

- Built on Azgaar's own data and generators; nothing about states, cultures, burgs or population is reinvented.
- **Half the size.** Fluoria is 1440 × 872 map pixels at 3 miles per pixel. Set the distance scale to 1.5 miles per pixel. No data changes; the world simply measures half as large, and the extra zoom is spent on detail.
- **Elevation and snow come from Azgaar**, not from us: each cell's height (`pack.cells.h`, sea level at 20) becomes the pixel elevation that drives relief shading, and snow follows Azgaar's own cold and glacier cells. We turn its data into texture; we don't invent terrain.
- **Keep it like Azgaar, improved.** Settlements are Azgaar's markers (a square for capitals, circles by size for the rest), never drawn as towns: towns are only drawn in the city view. No farmland or roofs are invented around them.
- **Every land texture sits on real elevation.** Deep water is lowest, mountains highest; sand, grassland, hills and forest sit at their own heights, and two places at the same height can differ only by biome. All of it comes from Azgaar's heights and biomes.
- **Roads are Azgaar's routes, not paint.** Three levels: main roads (red, 2 px), smaller roads (1 px), paths (1 px dotted); sea lanes dotted on water. Fixed widths, never brushed. Drawing a road creates a route that runs up to a settlement's marker but never across it; once drawn it is edited by dragging its nodes, and the select tool renames or deletes it, as in Azgaar's route editor. What is drawn in the region view is the same route the world view shows.
- **Sculpt the world, and the look follows.** No terrain-type or sand brushes. Four painted quantities, all Azgaar's own: elevation (raise, lower, smooth, flatten), temperature (warmer, colder) and moisture (wetter, drier). Azgaar's biome table turns temperature and moisture into the biome under the brush (hot and dry is desert, hot and wet is jungle, cold is taiga or glacier). Sand forms on coasts, snow on high cold ground and wetlands on low wet ground automatically. A biome override brush covers exceptions, as Azgaar's Biomes editor does. Painted temperature and moisture are stored as adjustments on top of the world's climate settings, so changing the equator temperature later doesn't erase them. Rivers follow elevation and moisture, as in Azgaar: a "rerun rivers" action regenerates them after big changes, and they can also be drawn by hand like roads.
- **One UI: Azgaar's.** No separate pixel view. Azgaar's menu stays, restyled dark grey in VT323, with the tabs Map, Style, Settings, Tools and Lore. No 3D scene or globe.
- **Region detail when zoomed in:** finer forests, hills, beaches and rugged coastlines, state colour as a light tint with dashed borders. No shadows, rocks or reeds yet.
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
- Phase 2, pixel engine: done, in `src/fluoria/` (palette, noise, terrain and overlay types, the pixel raster, brushes, camera, labels, and the PixiJS stage). The sample coast is still available with `?view=pixel-test`.
- Phase 3, world view: in progress. Azgaar's map is drawn in pixels by default, inside Azgaar's own UI (`src/fluoria/pixel-map.ts`), under the SVG, so every click and editor stays Azgaar's. The menu is dark grey in VT323.
  - Tabs: Map, Data, Tools, Settings, Lore. Style has no button; Ctrl+click on a toggle still opens it.
  - Map tab: a view (Terrain, Political, Military (darkened terrain, each nation's colour over its land), and Provinces, Cultures, Religions under More views; the map always opens on Terrain) and three toggles (Roads, Military, Markers). Labels, settlements, rivers, lakes, ice, cells and the scale bar are always on; emblems, journeys, zones, wind rose, grid, vignette and rulers always off. Terrain is the hand-painted look (light land, deep navy sea, relief lit from the north-west) with nation ribbons inside borders and a faint nation tint zoomed out; every other view is an atlas page (pale sea, a coordinate grid, sea names from Azgaar's water features, flat light nation colours, thin borders, a crisp coastline).
  - Data tab: a topic (population, temperature, moisture, elevation, production, trade, land) shows its overlay and opens Data Charts on the matching chart; pressing Plot moves the map with the chart (overlay by metric, region outlines by entity), and closing the charts puts the map back. Below, Azgaar's overviews. Tools keeps only the making tools.
  - Detail pyramid (`world.ts` gathers a `WorldModel` once per map; `world-model.ts` paints; `tile-worker.ts` and `tile-pool.ts` run it on background workers): a quick quarter-scale first look, the whole map at 1 game pixel per map pixel in a painted style, then 2, 4 and 8 for the tiles on screen, textures richer at each step. Tiles fade in; the region level fills in around the view while idle.
  - One grid (`one-grid.ts`): every cell, land or sea, is a cell of Azgaar's even grid. New maps are packed without split coasts; older maps keep their packed cells, and the coastal slivers fold into the cell on the grid point (settlements in them move there, or to the nearest free cell of their state, once, on load). Drawing, hover, clicks, movement, roads and boarding all go through the one grid. Port cells are half land, half sea: fleets moor in them and armies board there. Small rocks out at sea are decoration only.
  - One look per cell: each pixel takes its cell's ground, snow and region from the nearest grid point to a slightly warped point, so cell edges (coasts included) are ragged and everything inside a cell matches. Snow is per cell (glacier biome, or high and freezing). Relief stays smooth across cells.
  - Borders: a dark line with a band of the state's colour inside; thin dark lines in the atlas views.
  - Labels (`label-zoom.ts`), atlas-style, all VT323: dark ink with a hairline pale halo. State names in spaced capitals in a deep shade of the state's colour, province names muted; settlement names sized by rank; rivers blue italic and roads brown, closest zoom only. Every piece of a state's land of 5+ cells carries its name, smaller pieces from zoom 3; states under 4 cells are named from zoom 3. Where labels overlap on screen the lower rank hides; port names sit on the land side.
  - Settlement symbols: national capital a square with a dot, regional capital a hollow square, city a filled circle, town a smaller circle, village a dot; ports are the hollow form of their size.
  - Owners (`owners.ts`): coastlines carry a band of the owner's colour; Map › Fix colours separates neighbours (across straits too) that look alike.
  - Hover line (`cell-line.ts`), in Azgaar's tooltip: settlement (population), port, province, owner (naming a vassal's overlord, and how it stands to the nation in focus), terrain, population off settlements, temperature, height. At sea: open sea, sea lane or lake, and temperature.
  - Clicks: zoomed out (under 1.5) hovering lights up a nation and a click opens it; zoomed in a click on bare ground clears the screen (cards, menus, panel, selected unit). Right-click on bare ground leads up a ladder: nation, province, settlement, cell details (the full cell card), then the usual actions.
  - Nation panel (`nation-panel.ts`): docked left until dragged by its bar, then it floats where it was left (remembered, as is minimised); emblem (opens the emblem studio), name (renamed in place), government, colour (24 suggested: 12 striking, 12 muted), Locate; capital, culture, religion; population, area, settlements, provinces, treasury (§2,312, the only gold on screen), Military (troops and fleets; opens the Military tab), vassals; tabs Overview, Economy (treasury and taxes, tariffs in Azgaar's dialog), Diplomacy (allies, enemies, overlord, vassals, neutral folded; release or break free), Military, Notes; Charts and the full editor below. Back and forward between nations. Opens from a zoomed-out click, a state's name, or the right-click ladder; closes on its X, Escape, or zooming in.
  - Focus (`nation.ts`): while the panel is open the nation is in focus: others dim, allies green, enemies red with stripes, vassals and overlord barely dimmed.
  - Diplomacy is kept to Ally, Neutral, Enemy, Vassal and Suzerain: Azgaar's friendly, suspicious, rival and unknown become neutral on load, and the diplomacy editor offers only these five.
  - Units (`forces/`): Azgaar's unit types are the 39 kit units (land infantry, assault, cavalry, armour; air and naval trade, scout, combat, bomber, transport; three tiers each), with the approved 17×17 icons. Older maps convert once (militia → Homeguard, guard → Riflemen, elite → Guard riflemen, navy → Gunboat, air-fleet → Gunship) and every regiment is kept within the rules: one domain, at most 12 slots (one per 500 infantry or assault, 250 cavalry, 10 armour, one ship or airship), a transport on its own; bigger ones are split into several in the same cell. Every regiment is a card at every zoom: far out 23×23 (icon only, the cell's total troops below), close in 29×29 (power in a light tint, troops, slots, in a 3×5 pixel font; strength bar green to red). A single unit's card is pale; a transport is always a full card. Base names by kind (1st Army, 2nd Fleet) follow what a regiment is; only a name of its own shows on the map. A cell holds at most 4 units and 12 slots of a nation and its allies, vassals and overlord (a transport counts 1, cargo nothing); older maps spread any extras to nearby cells once. Units sharing a cell are a stack, the strongest in front with a 2-pixel strip per unit behind; only its arrow (grey, white on hover, pointing back while open) opens it into a tight row to the right, the stack darkened behind. Hovering a card, stack or settlement lists what's inside beside it (a stack one line per group); the panel lingers a second and its rows drag out onto the map like folder rows. Folder buttons are pixel icons. Fleets stack and count by the sea grid cell they stand on. Drag any unit at any time; a click selects (Shift adds), a double-click opens its folder (one at a time; Shift-double-click opens one beside it); clicking ground or Escape clears everything. Hover brightens a unit; a picked regiment greys out the rest. A regiment destroyed leaves a fallen marker. Folder rows have a gear to change a unit's type, tier and count; empty slots are a checkered outline. Releasing an army sends its people home.
  - Folders (`regiment-editor.ts`): Azgaar's regiment dialog, one row per slot with empty slots up to the cap. Rows drag between open folders, onto the map (its own cell or a neighbour with room light up), onto a regiment there and into a transport's cargo; a regiment dragged onto another merges or loads. Buttons: attack, merge, disband (a transport: unload), encamp (refills the strength bar on friendly ground with no enemy beside), raise, notes, delete. An empty slot adds a unit; a double-click edits a count.
  - Transports carry land units as cargo: 2, 3 or 4 units by tier, weakest units of all; ships load at the coast or in a port, airships beside any land cell; a loaded transport fights alone and its cargo is lost with it. Escorts are separate fleets in the same cell.
  - Strength: each regiment keeps its full-strength power; the bar is power now over that.
  - Sea (`sea-grid.ts`): fleets stand on, move across and dim by the even grid. A fleet still records the packed cell under it.
  - Cells: faint lines from zoom 1.5, clearer with a unit selected; hover brightens a cell.
  - Movement (`movement.ts`) counts cells: off road as many steps as the slowest unit (cavalry 2, the rest 1), or along roads 4 (main road), 3 (road), 2 (path), armour at most 2, each step costed by its road, never both; at sea 3 cells, 12 along the cells of a sea lane; airships 6–8 cells over anything, ending within 10 cells of a settlement of their own nation or an ally (vassals and overlords count), over any ground. A cell with an enemy army is attacked, not entered.
  - War (`war.ts`): attacks only on a neighbouring cell, through Azgaar's battle screen shown as Clear totals (start, lost, left per unit type); only units nearby may join. The loser falls back a cell, away from the winner; cut off, it surrenders (eliminate, capture, release). A land army ending its move on enemy ground occupies it (stripes in the occupier's colour, the rightful owner kept); annex a cell or give it back from its menu, or integrate every occupation from the nation panel, whose diplomacy rows offer ally, declare war, make peace, make vassal, annex, release and break free.
  - Roads (`road-geometry.ts`, `road-mode.ts`) are a layer over the terrain, redrawn on every edit (Azgaar's own route editors included): main roads red, roads ochre, both with a dark edge; paths dotted umber; sea lanes pale dashes. Zoomed out only main roads show, roads from 1.5, paths from 3. Every node is a cell centre (or the settlement in it), joined by straight segments with lightly rounded corners, except at settlements, which a road runs through exactly; a one-cell stub past the last settlement is dropped. Widths and settlement symbols grow gently with zoom. Sea lanes keep to open ocean (water not touching land) except where they leave and reach a port. Road mode (Tools › Draw, or R) shows the nodes; drag across cells to build a road at the chosen level (skipped cells filled across land); right-click a segment to change its level or delete it, the route splitting around it. Outside road mode the right-click menu offers the same for the clicked segment.
  - Settlements (`settlements.ts`, `settlement-size.ts`): towns (4 slots), cities and province seats (8) and capitals (12) keep a garrison. Close in, a garrison's troop count shows beside its settlement's symbol; every settlement's name sits below its symbol, ports included; a nation under 8 cells is named by its city once zoomed in; hovering the count, symbol or name lists the units; a click opens the settlement folder; dropping an army or a folder row on it stations the troops there. The folder replaces Azgaar's burg editor, all in one: the nation's emblem (opens the nation), name, size (a dropdown; a garrison that no longer fits marches its extra out), population and money edited in place (the capital also shows the nation's), a send-funds arrow, buildings as icons, goods, then the garrison and the armies standing there as nested folders like the Military tab; pixel buttons Recruit, Form Army, Locate, Notes, Lock, Delete. Double-clicking an army in one of its own settlements opens the settlement with that army unfolded; an army's folder says where it stands (At …). Buildings are Azgaar's toggles renamed: Barracks (citadel) §250 for infantry, assault and cavalry; Harbour (port) §500, coastal only, for ships; Armour Depot (temple) §450 and Airbase (shanty) §800, city or larger; Market (plaza) §150. Tier follows size (town 1, city 2, capital 3). Recruiting takes people from the settlement (up to all of them) and money at per-slot prices (infantry 20/30/40 … bombers 70/110/170); a capital's money is its nation's treasury (one figure; on load a capital's own purse joins it). Send Funds (the arrow after the money, in a settlement folder or the nation panel) is an Azgaar-style dialog: From (the capital or a town), To (an own settlement or another nation's capital), Amount and Send, the last three transfers with undo; either end can be picked on the map (a foreign town picks its capital). Money shows as § in Azgaar's panels too. A garrison is a hidden regiment tied to its settlement; it defends its own cell and never falls back. Older maps put lone units beside their towns into garrisons once.
  - Markers (`draw-markers.ts`, `markers-editor.ts`): a pixel token (circle a person, diamond an event, square a place or thing) with one letter or digit, in its allegiance's colour (grey with none), snapped to its cell; its panel has name, shape, letter, allegiance, Notes (open by default) and Inventory (treasury and item rows).
  - Emblem studio (`emblems/`): a 33×33 pixel editor with a fixed border (tools, brushes 1/3/5, mirror about the centre pixel, stamps, templates, the Fluoria library); Save writes into the nation as one tiny PNG among the map's custom icons. The 28 Fluoria emblems are applied by nation name to nations without pixel art.
  - Loading screen: Fluoria · pass · commit.
  - Click-to-place tools work on bare ground again (a transparent sheet in the viewbox); settlements and markers are placed at the cell centre, with a preview that shows the cell and why a cell is refused. Labels sit above regiments.
  - Battles bring in everyone in both cells and friends in the cells around them (untick any before the first round); dropping a unit on an enemy starts one. Attack mode and battles switch to the military view and back. In the military view units sit above labels and roads and labels can't be picked up; a settlement's name steps below any card on it. Cell lines are a little thicker on land and half as strong at sea, and quieter still in the military view, where the ground is darkened under bright nation colours, borders and pale coastlines; the hover line ends with the cell's area. The nation panel's numbers are a list. Azgaar's lists and editors (overviews, Edit Good, Compare Prices and the rest) use the same dark grey rows and headers.
  - Nation panel Military tab: armies and garrisons as folders with unit icons, sort and filter by category, drag units between them or armies into order, rename in place, release; the Military tile shows troops (power). New nations get a pixel emblem made from their colour, once.
  - Armies: select rows in a folder (click, Shift, Ctrl) and drag them together; while dragging, the cells a unit may land on light up and the one under the pointer brightens. A ++ before a row's gear upgrades it one tier (the tooltip gives the cost, or why not). Recruiting lists tier 1 units grouped by category. An army can be assigned to any nation (a dropdown or a ⌖ pick): its card keeps its nation's colour with a band of the new one across the top. Airships move on the even grid, open sea included, within range of a friendly settlement. The hover panel goes on a drag, scroll or click elsewhere, and sits above an open stack. Send Funds sends on one click (or Enter); All is gone.
  - Units as chips: every unit is its own chip, the same size on screen at any zoom: its pixel icon (without the tier marks), its power grade 1–9 (each step about double) and its count, with its tier as small pips on the chip's left edge; the right corner cut shows the kind (air top, ship bottom). A cell holds 4 chips, every nation's together (cargo and garrisons don't count), drawn as one column sharing edges: transports, air, land, ships; above a settlement's symbol. Hover lights one chip; Shift-click chooses more, Ctrl or Cmd-click chooses a nation's whole column, and dragging a chosen chip moves them all (each as far as it can reach). Past ~70 mi on the ruler each nation's part of a cell folds into one chip with its strongest unit's icon, an ×N badge and a layer below per extra unit; dragging it moves them all. Transports carry 4 (tier buys power and protection), show two layers on top, and open with their arrow into a hold of slots; they stand open while a unit that could board is dragged. Chips hold fewer, stronger troops: infantry 80/60/40, assault 50/40/25, cavalry 40/30/20, armour 4/2/1 vehicles, one ship or airship; prices rise steeply by tier. Older maps convert slot for slot, each chip a unit of its own. Only infantry garrisons, and only when dropped on the settlement's symbol (it lights up); anything else recruited or marched out stands on the map one chip each, and older garrisons' ships and airships step out once. A click anywhere in a settlement's cell, or on a unit in it, opens the settlement. Roads light up under the pointer; a click doesn't edit them, their right-click menu does.
  - Unit cards (pass 23): land units stand as vertical cards (role symbol, black power grade, tier as 1–3 bars at the foot); aircraft and ships lie as horizontal cards, square on the left, the right end shaped by role (air: scout arrow, combat swept, bomber reverse, trade blunt; naval: scout curved bow, combat raked, trade blunt), tier as bars at that end. Symbols: infantry X, assault filled X, cavalry horseshoe, armour track, scout a scanning <, combat +, bomber bomb, trade crate. A thin health bar sits under each card; no troop count on the map. In a cell aircraft, ships and transports stack on top and land units stand in a row beneath, transports first then the highest tier. A lone unit shows its name above it close in (land by name, aircraft and ships by nickname). Hovering a card, or a cargo card in a hold, shows a small tooltip (name, type, tier, troops, health). Transports are a hull round a hold of 2, 3 or 4 bays by tier, the front holding grade and tier; their hold always shows close in. Drag a land card onto a transport to board (the bay lights), drag a cargo card onto the shore beside to land it; refused drops say why and the unit returns. Far out a nation's units in a cell fold into one plain chip of symbols, a transport into its outline with its cargo's symbols. A picked unit gets a white outline and the rest darken; transports never do.
  - Settlements (pass 23): four sizes, Village, Town, City, Citadel; one citadel per nation is its capital (the star in its panel). Each town or larger takes one class: Barracks (infantry, assault, cavalry), Armoury (armour), Harbour (ships, coastal only), Airbase (airships) or Market; its size caps the tier it raises (town 1, city 2, citadel 3). Changing class costs its price with half the old one back; growing costs §300/§800/§2,000 a step and, the first time, tops manpower up to 150/400/1,000; shrinking gives half back. Any settlement with manpower and money raises Homeguard. Manpower replaces population: recruiting takes it, released troops bring it home. Map symbols: a village a black dot, towns to citadels white squares growing with their class glyph, the capital a red square. The settlement panel follows the nation panel: ◀ ▶ through the nation's settlements, emblem, name ✎, owner, size (cost shown, confirmed), capital star, lock; Treasury and Manpower as boxes with ▲▼ (Shift ×10) drawing on a settlement picked below (capital by default), the Goldbank (loan; mercenaries at §2 a man) and other nations; a military summary; tabs Military (filter, sort, foldable garrison and armies), Economy (class, goods), Notes; Recruit and Delete at the foot. The nation panel shows the capital's treasury block and foldable armies and garrisons. Send Funds is gone. Right-click shows a bar of pixel buttons for what is under the pointer: Open, Recruit, Nation, Add army, Add marker, Measure, Edit route.
  - Next: generals as markers on armies; portraits; the economy pass (income over time, upkeep, market income); the default Fluoria map; then march orders and a turn button; scout detection, bombers, submarines and airbases; the Shape and Draw tools with the slope rule; halving the distance scale; the minimap. Pinned: a fixed money supply with a bank, transfers, a ledger and pay day; six simple goods.

## Working rules for this fork

- Follow Azgaar's own rules in `CONTEXT.md` (TypeScript, Biome, layering, no new production dependencies without permission).
- Fluoria code lives in its own folders where possible, so Azgaar's updates can still be merged.
- Never run Playwright tests without asking.
