# Battle sandbox

A pixel interior battle prototype for Fluoria: one self-contained page (`index.html`), built from `src/` with `./build.sh`. Open the page in a browser; no server needed.

- `src/head.html`: markup and styles.
- `src/tiles.js`: 16px tile textures and palettes.
- `src/sim.js`: the simulation (physics, damage, weapons, doors, fire, lighting, sound, UI).
- `src/editor.js`: map and texture editing, mods.
- `src/ui.js`: the screen: corner clock, tool panel, popups, hotbar.

## Screen

- Corner: the brass clock runs and pauses time (Space taps it; hold Space for slow-mo while held) (paused on load); red key resets to the last save; 1×/½× is slow-mo; the sigil opens Map settings.
- Tools (right panel): Command (select and control units; the panel shows the chosen unit's hotbar and toggles, with a nearby chest's contents above it, Shift+click a slot to put it in the chest; the camera follows a unit under direct control when it's the only one selected), Spawner (units, weapons, items, cover; the dropper copies a placed unit and places copies until Esc), Tiler (tiles, furniture, doors; the dropper picks a tile off the map), Sign (pick a material, place a plate; a sign with no text isn't kept), Painter (blood, scorch, soot, dirt, water, paint), Vacuum, Sponge, Wand, Tether (rope or chain: hover shows a green node on a unit, a wall face or a floor centre; click one end, stretch, click the other; past its reach it drags the unit along; Esc cancels, or returns to Command when nothing is being tied).
- Keys: Esc Command (from any tool), B Spawner, N Tiler, P Painter, L Sign, K Tether, M Wand, U Vacuum, O Sponge.
- Bottom: map, Save, Asset Editor and Map settings popups (drag by the title, ✕ or Esc closes).
- Map settings: name, location, owner, size, wall tops, new, delete, export, import. Doors with no keys of their own open for the owner's side; chests belong to no one.
- Furniture: tables (any size, no storage), seats, desks, and storage (chest, iron chest, rack, shelves, vault shelf). Desks and storage come in pieces of at most 2×2, filled from the top-left, each with its own rim and inventory.
- Spawned conscripts sometimes turn out in the Imperial striped guard.

## Controls

| Input | Action |
|---|---|
| Click | Select a unit (Ctrl adds); click a door's hinge to open it, elsewhere to lock; click a crate to open it |
| Drag | Box-select, or drag a unit or item |
| Hold | Aim and fire, or wind up a throw; the crosshair fills from inner to outer |
| WASD | Move selected units; selected units turn to face the cursor |
| 1–4 | Pick a weapon: 1 primary, 2 secondary, 3 grenade, 4 heavy |
| R | Reload from spare ammo |
| Q | Sheathe or draw; over a group, if any weapon is out all are put away, otherwise all are drawn |
| T | Form up: the selected units snap into squads of up to 8 (4 across, 2 deep) by kind, side by side, three to a row, centred where they stood |
| H | Toggle a group between facing the cursor and facing back the way they were |
| Double-click | Select a unit's squad from the last form-up, or its kind close by |
| E / Esc | Deselect |
| F / G | Switch hand / drop |
| Space + drag, middle drag | Pan the camera on big maps |
| Shift + drag | Lift anything and carry it over walls; drop it outside the map to delete it |
| Click a slab | Select it: hold Q or E to turn it; drag to move it |
| Double-click an item | Select it: hold to fire or throw it from where it lies; drag to move it |
| Right-click | Unit or door options; Refill ammo restores what the unit was last kitted with (its starting kit, plus anything you gave it) and fills every gun; works on a group too |
| Tools: Rope, Chain | Drag onto a unit, or click the tool then a unit, to tie it to the nearest wall; Esc cancels |
| Inspector (right column) | Shows the selected unit, or an opened chest, desk, shelf or rack with the selected unit beneath it when it stands beside it. Click an item to move it to the other box, drag it across, drag it out to drop it, Shift+click to drop it; click a unit's slot to draw it |

## Carrier

- `src/vehicle.js`: the tracked carrier and its test maps: the Carrier circuit (the start map: a looping road, an inspection stand of officers and nobles, and a parking apron with two empty iron carriers and a steel one crewed bar its driver) and the smaller Carrier yard. Each carrier's chest over the engine is a real chest in the hull's metal (steel or iron), shown and opened like any chest when its inside is in view, and stocked with a plasma cell, musket shot, bolter rods, grenades and a sidearm. On the circuit (a test, not used elsewhere yet), three carriers stand on the apron (a new steel one, a battleworn iron one and a derelict iron one), and five squads parade across the road from the stand: two fresh, one veteran, two worn, with worn armour (aged metal, scuffs, dents, heat, soot, chipped rims) and some veterans bare-headed. Any unit's armour wears in play through its metal in the material table: hits dent it where they land, blasts soot and heat the side facing them, fire scorches it, and marching slowly ages it. Its hull, chest and engine sit in the slab grid, so shots, blasts, sight and units meet it like any slab. The tracks sit low like furniture: units bump into them, shots pass over to the hull. Its rear double doors and cockpit door are ordinary doors riding on the hull (lock, keys, lock lamp, hinge and lock weak points, sliding into the armour). A carrier can spawn new, in service, veteran, battleworn or derelict (rusted through), played out through the same wear it collects in use: driving ages the roof plates, the running engine soots the vent, blasts nearby scorch, pit, heat and dent the roof, and gunfire chips the side armour, leaving it weaker.
- Click the carrier to select its driver; E takes control and WASD drives (speed and turning build up gently, pivots in place; off the throttle it coasts, Shift brakes hard with a hiss, and there's no dash from the driver's seat). It rides over hedges and furniture (not doors), wearing each two conditions as soon as it covers more than half of it. G sits in the free seat within reach that the unit faces (a G key shows on it, soft yellow for the driver's) or stands back up. Starting turns the key, a hiss as the engine catches, and it can move once it has; shutting down gives a long falling hiss. X from the driver's seat rings or stops the alarm bell (it stops when the power goes or the carrier is destroyed). V from a seat switches between the interior and the roof, until that unit gets up or is deselected.
- Right-click the carrier with units selected to send them aboard; with none selected it offers Unload, Driver out and Commander out. Units file through the rear doors one at a time, pushing them open like any door.
- The roof hides the crew unless a selected unit is aboard. The roof vent breathes dark mist while the engine runs, more while driving, fading after the driver leaves. Moving tracks press faint tread marks into the ground, and the hull casts a soft shadow like a wall's. Each running carrier has its own engine sound: idle, a growl that rises with speed, and a drive drone and ratchet that come in when turning.
- The engine core is the weak point: a bolter rod through the side, or a blast inside next to the engine, breaks it; after a short fuse of sparks, plasma arcs and the drive drone climbing over a swelling rumble it blows a ragged hole round the engine, leaving the rest of the hull standing, charred near the hole, smoking for a while. The core glows with the engine's power. Hull, chest and casing take their strength from the material table like any metal, and keep their scars: hits age the metal the way walls age, and very hot hits leave temper colours.
- Units under direct control get a line of key hints at the bottom, only for what they can do right now.
- With AI on, an AI driver turns toward the nearest foe, drives nose-first, stops short and lets its squad out.

## Materials

Everything in the game is made of a material, and the material decides how it behaves. Read this before adding a surface, a material or an effect.

- Materials live in two places only: `ELEM` in `src/tiles.js` (each element, Earth, Stone, Wood, Metal and Cloth, with its materials: colour, strength, shine, how it ages) and `src/materials.js` (each material class: hit class, footstep and hit sounds, the debris it throws, and what the hit class means for strength, friction and welding). `matInfo(element, material)` returns all of it in one record.
- A surface (wall, floor, furniture, door, carrier hull, unit armour) stores only which material it is. It never picks its own colours, sounds, sparks or wear; it asks the table. A new metal added to `ELEM.Metal` therefore works everywhere at once.
- Wear, damage, sounds and effects should come from the event that caused them (hit, blast, heat, fire, scrape, step, break) and the material that took it, through shared code, not per object.
- Previews: the Fluoria lab page shows the material table as a tree (element, material, variants) with how each one looks, wears and sounds; check a new material there.

## Rules worth knowing

- Everyone starts sheathed; the first shot or blast draws every weapon.
- Armour is per pixel. Shock troopers are weak at the back, commandos strong only at the front. Hit angle and distance change penetration.
- Muskets 12 rounds, pistols 18, blunderbusses 8, Lancers 4 bolts, Bolters 3, shown as loaded/spare. Units carry one of each gun.
- Inventory slots are fixed: one primary gun or spear, one secondary pistol, grenades, a heavy grenade, and one or two pack slots for spare spears, Solari and the rest. Civilians and homeguard have no secondary slot, so a pistol becomes their primary. A unit won't pick up a second primary while it holds one.
- Items on the floor are picked up automatically if there is room. Solari are an item. Dragging an item onto a unit gives a full kit of it (guns loaded with full spares, spears and Lancers a stack of four, grenades to the limit); if the unit already carries one, it refills that instead: a gun's magazine and spare ammo to full, spears and Lancers to four, grenades to the limit. A unit carries at most three grenades and one heavy grenade; commandos double that.
- Doors slide along their own line into the wall beside them, leaving a lip showing to click shut again, and don't block anyone while open; double doors part to both sides together; hitting the lock bursts it, hitting the hinge drops the leaf. Heavy doors are two cells long and thicker.
- Fire catches a unit on the side that touched it and works inward; it only spreads round the whole body after long contact or when standing in it. It eats the outer rings; hot plate cracks; sewer water puts it out.
- Hot stone and metal cool slowly through yellow, orange and red, and give off steam while they do.
- Thrown spears glance off when they strike a surface at a shallow angle and lodge along their line of flight when they strike it squarely.
- Commandos hit 15% harder with every weapon, 35% with the blunderbuss. Their muskets fire two rounds a pull and their pistols two. A commando can carry two pistols and dual-wield them, four shots a pull, each from its own magazine; a pistol dropped on a commando becomes their drawn weapon, and R reloads both.
- Commandos throw furthest, hardest and straightest; about one spear throw in five is well placed enough to punch through a shock trooper's front plate.
- Spears stack like grenades; a stack holds four, anyone armed with them starts with four, and loose spears top the stack up.
- The Lancer is a short black-metal staff with an iron tip heated purple by plasma. It is thrown, and holding the wind-up charges the tip: more charge means deeper penetration, a bigger burst and a harder shove. Against metal plate it drives in along its line of flight, blows a little plate off and stays wedged, its tip glowing and burning the plate around it as it cools, then goes dark for good; it goes deeper and chips a bigger chunk the more it is charged, but never kills a heavy outright in one hit. Against flesh and cloth it only pierces a little and scorches. Hitting a wall it explodes and breaks into rod pieces on the floor. A missed throw lands and cools. Holding the charge past full blows the tip in the thrower's hands and that Lancer breaks into rod pieces. Lancers stack four to a slot like spears, and carriers start with four.
- The plasma gun is a short dark gun with one glowing purple pixel at the muzzle. Every pull fires three purple bolts in a row, six to a cell (commandos carry 27 shots in all), with no charging; it can't be thrown. Each bolt that hits stone or metal cuts a thin straight line about 12 pixels deep along its path. Imperial commandos carry one by default.
- Spears are a short plain metal line. A spear that wedges into a unit or a wall stays where it struck (turning with the unit), shows only its front part, and can't be pulled out or reused.
- Default arms by side and class: Imperium conscripts and musketeers carry muskets, Praetorians a spear or, about three in ten, a Lancer, with a blunderbuss as sidearm, commandos a plasma gun and pistol, shocktroopers spears; Sanctis guards muskets, Eternals Lancers; Goldbank muskets, Aurum Knights Lancers, Gilded Hands blunderbuss and pistol; Reapers pistols, cutthroats blunderbusses, raiders muskets, blademasters spears, Reaper commandos two pistols; Havenport and Portsbridge guards pistols, riflemen and heavies muskets; Great Keys wardens spears. Civilians start unarmed.
- The Weapons list runs from most to least valuable, grenades last.
- The Bolter fires iron rods from a three-rod chamber, visible down the barrel slot. Tap to fire a cold rod: it gets about two-thirds into a stone wall, stops halfway in a unit (killing light troops straight on), and guard riflemen's and shock troopers' plate catches it or glances it off, sparking and sometimes starting a fire or tearing plate away. Hold to heat every rod in the chamber, dull red to orange to white: released orange, a hot rod goes through units and about one wall's thickness plus a fifth to two-fifths more, leaving a glowing cut, a scorch line, smoke and embers, and cools in flight; released white, all the rods fire fused into one heavy slug that goes through about two walls and hits much harder. Rods cool in the chamber when not held. Holding past white makes the whole gun glow, and it can burst in the shooter's hands. Only guard riflemen, shock troopers and commandos can charge it; anyone else holding it only fires cold rods; its recoil throws them and makes them drop it every shot. Rods lose energy over distance and push a unit into a wall to crush it there. Carriers walk slower, slower still while aiming.
- Textures are built from a few elements (wood, stone, metal, soil, grass), each with one core texture; variants are a tint plus an overlay laid on the cell grid with no offsets: half-cell planks, full-cell flagstones, key-pattern marble tiles, metal plates with an outer bezel, riveted plates and sunken panels, white and green marble, framed panels, riveted plates, dark iron, brass and tread plate. Every surface gets a soft edge where it meets a different one. Half walls fill half a cell; slabs and doors are half a cell thick.
- Walls darken towards black from about three pixels in from their faces, so only their edges show; damage exposes new edges.
- A broad soft light stays fixed to the screen, so it moves only when the camera pans; metal, marble, gold and armour brighten as it passes. Slab and door edges are lit from the same side whatever way they face, so paired doors match.
- Furniture and fixtures (tables, desks, vault shelving, chests, rifle racks) are part of the room: they sit above the floor, block walking, and bullets pass over them. Click one to open it in the inspector; a selected unit standing beside it shows underneath to trade with. Blasts break them, and one broken badly spills what it holds. There are no loose crates.
- Doorways split down the middle: each half carries on the floor of the room on its side, with a threshold strip under the door itself.
- A unit can be tied to the nearest wall with rope or chain (Tools, or right-click). The line runs straight from a ring on the wall face; it gives a little, then stops the unit. Rope snaps from any nearby blast, chain only from a close one; either snaps if the ring's wall is shot or broken.
- Chairs are part of the floor, so a unit can stand on one to sit. Desks and rooms are laid out on odd widths so a desk's chair sits dead centre.
- Doors snap to the middle of their wall line and meet the wall ends. Rugs are laid on marble with a woven border; desks are dark mahogany with a brass inlay line.
- A blast strong enough breaks laid floors and shows dark gritty foundation; a heavy grenade breaks a wide patch, a grenade a small one.
- Explosions leave scorch rays: dark streaks of random length and thickness spreading out from the blast, tapering to points, over floor and furniture alike, and they stay. Furniture broken by a blast gets real cut edges (shaded to the light) and, for wood, short splinters along the grain.
- Blasts on grass or soil tear up the grass, dig a soft crater, throw soil round it and scorch the ground; the crater stays.
- Slabs placed from the Cover list are free barricades: no hinge, no lock, never open. Units push them by walking into them, slowed by the weight: wood a little, metal more, the heavy slab most, armoured units less than light ones.
- Units are drawn from pixel sprites, front up, turned to face the way the unit faces; damage, burns and death still mark each pixel. Each side has its own look per class (civilian, base, riflemen, heavy, shock, commando); the class names come from Imperial ranks. Sides: Imperium, Sanctis, Goldbank, Reapers, Havenport, Portsbridge Trade Company, Great Keys, plus neutral civilians. Markers picks a Faction, then a Type from that faction's roster: Military first (Conscript, Musketeer, Praetorian…), then Civilians. Neutrals are civilians only, under plain trade names (Townsman, Labourer, Moneylender…) so none read as a faction. Arms lists Unarmed, then Spears, Firearms and Heavy arms, cheapest first, and starts on the type's default kit.
| Side | Civilian | Base | Riflemen | Heavy | Shock | Commando |
|---|---|---|---|---|---|---|
| Imperium | Officer, Imperial Clerk, Imperial Striped Guard, Imperial Noble | Conscript | Musketeer | Praetorian | Shocktrooper | Commando |
| Sanctis | Emperor, Hierarch, Acolyte | Sanctis Guard | Sanctis Guard | Eternal | Eternal | Eternal |
| Goldbank | Clerk, Head Clerk, Banker, Bank Lord | Watchman | Stockman | Aurum Guard | Aurum Knight | Gilded Hand |
| Reapers | — | Thug | Cutthroat | Raider | Blademaster | Reaper |
| Havenport | Dockhand, Harbourmaster | Harbour Watch | Marine | Harbour Guard | | |
| Portsbridge | Factor, Company Clerk | Company Guard | Company Rifles | Company Ironside | | |
| Great Keys | Burgher, Fisher | Key Warden | Keys Rifles | Gatekeeper | | |
| Neutral | Peasant, Merchant, Priest, Noble | | | | | |

Neutral civilians wear muted browns, ochres, rusts and greys (eight variants, picked per person) so they never read as a faction, even when they use a faction's civilian look. Imperial Striped Guards carry spears and officers pistols by default.
- Footsteps sound like the ground: hollow on planks, a hard tap on stone, brighter on marble, a clank on metal plate, a swish on grass, a crunch on soil, muffled on rugs; armoured units add a chink.
- Debris that has come to rest lies under units; flying debris, sparks, smoke and light stay above them.
- The simulation runs at a fixed 60 steps a second whatever the frame rate.

## Maps

Goldbank back room, Havenport warehouse (Imperial raid), Havenport tavern, Havenport sewer (lone ranger), Goldbank Aurum heist (30×47, mirrored, pannable; key-pattern marble in the pillared room, a marble star medallion in the great hall, vault shelving, white paving with planters and a hedge), Goldbank counting house (44×26, the Aurum's hidden back half: a dark-wood library lined with bookshelves around a walled counting room with long ebony table and gold shelves; the green board room and the red board room off either end; a black-green marble gallery with gold half-wall buttresses out to the Aurum, rooms in dark planks or black-green marble slabs; below it the guard post with two locked cells behind it (one prisoner chained), the armoury, the chief accountant's ledger office in plush green, and the iron strongroom of black-deal gold reached only through a hidden full-thickness door from the ledger office; a two-door airlock from the guard post out to the back alley), Astia proving yard (outdoor, everyone unarmed, one Bolter on the ground with crates of rods, muskets, grenades and heavy grenades: a lane of every unit type, a long lane, eight material lanes with a target behind each, every target tied to the backstop (heavier troops and every other lane in chain, the rest in rope) — stone, half stone, double stone, wood, half wood, metal, half metal and a heavy door — a yard of every floor, wall and half-wall texture, and a grass field with a soil patch, loose grenades and barricades for blast tests). Small scene maps: Sanctis council chamber (the Emperor with his Eternals and Hierarchs, Imperial nobles and officers with striped guards, Goldbank lords and bankers at the table), Portsbridge old road (company wagon with escort, Reapers in the bushes), Great Keys guild alley (a brawl outside the guild door), Emperor's Dock stockyard (prisoners in barred cells, some chained, awaiting a ship or a buyer; the garrison drawn up in three ranks for inspection by the Imperial Overseer and his officers). The Havenport tavern now has Reapers drinking in it.

## AI

The AI button hands one side to the computer (for now only the Havenport warehouse, where it plays the Reapers). Each reset its leader rolls fresh orders: hold position, defend a zone (main floor, back room, bomb stash), protect the stash or the leader, or attack. Units stay sheathed until they see an enemy or hear the alarm, then turn, aim and fire, reload, throw a grenade at a bunch of enemies, hold fire when a friend is in the way, open unlocked doors on their way, and fall back to the back room when badly hurt. If the leader goes down, some of them pull back. Hover a name to see its order.

## Linked maps

The counting house and the Aurum are joined: the passage west out of the Aurum's great hall and the passage east out of the counting house fade into the dark with the other place's name beside them. A unit walking off the end arrives at the other map's passage; if it was selected the view follows it. Each map keeps its state (bodies, damage, doors, contents) while you are on another; Reset rebuilds only the current one.

## Planned

- Wall collapse: a wall cell under about 8% left, or any isolated fragment, crumbles to rubble; pillars give way earlier.
- Fire spreading between units.
- Squads on the region map opening this view for fights; goods as literal arms and Solari, recruitment and Reaper mercenary prices, black market through Goldbank and Havenport.

Hold the mouse to charge a Lancer and release to throw it. Keep holding past full charge and it overcharges in the hand.

Bullets hitting stone, wood, metal or armour each have their own sound; blunderbuss pellets sound as a scatter of separate hits.

Any unit can carry two pistols, one in each of the first two slots, and fires both together; commandos still fire their faster bursts. Reserve rounds are shared evenly between the pair.

A unit short of rounds strips them from a matching gun lying nearby or in an open chest, and the gun is used up.

The hand button under a unit's inventory turns off picking up new weapons (off from the start for civilians and anyone placed unarmed); with it off the unit still takes ammo and tops up grenades and spears it already carries.

The plasma gun holds three shots, one burst, then vents with a hiss.

Shift dashes the selected units along WASD, or the way they face: up to 2.5 tiles for commandos, less the heavier the unit. One dash (two for commandos) then a 10 s recharge, shown as a thin bar under the name. AI units sidestep thrown weapons.

AI mode (the AI button) hands every other side to the computer; your side is the one selected when you switch it on. It needs no setup per map:
- rooms, doors and blasted holes are read from the map and re-read every two seconds;
- units see in a cone (walls and closed doors block it), hear shots, explosions, footsteps, dashes, reloads and dry clicks through walls (thicker walls muffle more), remember what they saw, and share it with friends nearby;
- each side weighs its strength (class, weapon, ammo, wounds) against the enemies it knows of: no contact keeps it calm, a noise sends it to look, better odds make it hunt, slightly worse odds make it hold, bad odds send it to the safest room to lock the doors and hold;
- a side with a protected unit (Protect, under the inventory) defends that unit's room and locks its doors;
- hunters shoot out a locked door that stands in their way; unarmed units go for the nearest loose weapon.

With AI on you see only what your units see: the rest keeps its last picture and fades to black over five seconds. Sounds you hear through walls show as faint rings. Your units that are not selected fire at enemies they can see if they have a gun drawn.

Hold C to crouch: slower, no dash, dimmed. A crouched unit behind a desk or table can't be seen or shot past it, and can't see or shoot over it either; stand to fire.

Right-click a cell to send the selected units there; they find their own way through doors. With AI on only your units take orders, and only to places your side has seen; a faint line shows each order, red if refused. E takes direct control (WASD, aim at the cursor, hold to fire, green outline); E again hands it back. Only units under direct control turn to the cursor. Units walk a half-tile grid that keeps them clear of walls and furniture and cut corners where the way is clear. Units shooting round a corner switch hands so the gun clears the edge.

A unit that is hopelessly outmatched with an enemy close by surrenders: it drops its weapon and becomes a neutral captive. With AI on, your units not under direct control hold where they are, turn towards enemies the team can see, and fight with what they carry: guns, spears, Lancers, and grenades when no friend is near the target.

Units who see a lit grenade or heavy grenade in blast range run clear of it, picking the way out that keeps furthest from known enemies (commandos dash if they can). A unit left with no usable weapon or rounds takes a spare from a friend beside it: half his rounds for the same gun, one spear from a stack, or his lesser weapon if he carries two; in a fight AI units walk to the nearest friend with a spare or a loose weapon.

Autonomous (under the inventory) lets one of your units act on its own with the same rules as the AI: look into noises, hunt, hold or fall back with its side. A right-click order still comes first, and E still takes direct control. Your units never surrender.

Your own units recover their dash in 1.2 seconds. Blast scorch is darkest at the centre and fades out softly; big blasts have a wider dark core.

A unit turns slightly further than the cursor so its weapon's line, not its body's centre, passes through the cursor; shots follow the same line. Near a wall the weapon is first drawn back towards the body and is only raised if that isn't enough. Raising and lowering make a soft, muffled rustle.

Grenades: a unit throws one when it pays off: two or more enemies inside the blast, an enemy in cover, or a heavy (the heavy grenade is kept for groups or a heavy in cover). Never at a spot with a friend in the blast, never closer than a safe distance (about 3 tiles, 4.5 for the heavy grenade), only along a clear throw, and at most one per unit every 3 s and one per side every second. A unit with nothing else left throws at a lone enemy under the same safety rules.

Keys: a door locked from the start belongs to the side whose units stand beside it, and a door a unit locks belongs to its side. Units with the key unlock it as they pass; others have to break it.

Units turn at a set speed rather than snapping: commandos fastest (about a quarter second for a half turn), shocktroopers slowest (about half a second); AI units fire only once they face the target. Grenades go to tight groups of two or more. A unit whose way is barred by a door locked against it breaks in: a friend with the key nearby unlocks it, otherwise it shoots or forces the door until the lock gives, and anyone stuck behind it joins in.

Every gun reloads itself a moment after its chamber runs dry, if there are spare rounds; R still reloads early. With AI on, nothing about a unit you cannot see shows: no weapon stuck in it, no glow, no flames. Your autonomous units know every enemy your side can see, and your side's strength counts all your units.

With AI on, units call out what they are doing above their heads when they change their mind (Push!, Hold here, Fall back!, Locking up, Breaking in, Grenade!, Run!, Reloading, Empty!, Need arms, Here, I yield, There!, Moving, On it). Urgent ones show in amber. Only one callout at a time per unit; a side calls out a change of plan once, through its senior unit. Enemy callouts show only while you can see them.

A room where enemies were seen or heard is marked hostile until someone has stood in it a few seconds and found nobody. Once the shooting stops, a side with two or more fighters sends its stronger half in to clear the nearest hostile room ("Clear that room", "Moving in") while the rest cover it.

Leader (under the inventory): one per side, shown by a small gold triangle before the name. While he stands his side fights a little bolder and he gives its orders; when he falls the side is shaken for half a minute ("He's down!").

Units at close quarters fire even if their weapon cannot swing round fully, and an order to a spot already taken by someone ends when the unit gets close.

Every side always has one leader. The back room starts with Rook leading Goldbank and Ivo, now an Imperial officer with a pistol, leading the Imperium. When a leader falls the role passes to the best unit left (highest tier, then strongest), who calls "On me!".

Units start on Autonomous; switch it off per unit to keep one on hold.

Shots and throws from a group pass over units of the shooters' own side, except the one you aimed at.

Slow-mo (Z), in the top bar, runs the battle at a third of normal speed and draws streaks behind bullets and bolts.

With AI on and one of your units selected, what it sees stays at full brightness and what only its allies see is dimmed slightly.

A held weapon that would hit a wall, door or slab is raised: it shows as a small dot at the unit's side, blocks nothing, and is lowered again as soon as there is room. A raised weapon cannot fire until it can be lowered.

Holding the mouse keeps a gun firing shot after shot, reloads included, until you let go (thrown weapons and charged weapons still fire once per press).

Captives, and anyone who surrenders, count as neutral: nobody targets them and they target nobody. A freed captive stays neutral until it attacks someone, then it is back on its own side.

A unit blocked by a friend no longer shoves him: the friend steps aside (unless under your direct control). Idle units only patrol when the room is not crowded.

Name colours show diplomacy relative to your side (the one you control with AI on, otherwise the one you last selected): light green yours, blue allies, red enemies, white neutrals and captives, dimmed for the dead. Relations follow the regional map adjusted to the lore (Goldbank with the Imperium, Portsbridge and Sanctis; the Imperium with Sanctis and Great Keys; Havenport and Portsbridge at odds; Reapers enemies of Holverland only); sides with no relation are enemies when they share a battlefield. The back room and the council room set allies against each other. Allies never target each other and show through your fog.

Units ignore neutrals' footsteps and other routine noise from anyone who is not an enemy. A side falling back fills its chosen room only as far as it comfortably holds; the rest hold where they are. Units pick spots apart from each other inside a room.


With several units selected, right-clicking one of them opens a menu for all of them: Free, Captured, Dead, Restore health, Duplicate and Delete. Dead units can be right-clicked too.

While you control a unit (E), clicking a name label fires instead of selecting, and a right-click or stray click on the floor does not drop it; Esc does. A unit you let go of stands still for a second before acting on its own again.

V: the selected units look at the cursor (Shift+V: all face that way). A faint blue line shows it. Units on a move order look there when they arrive; your idle units hold the look until an enemy shows; autonomous units hold it for 4 s. A move order that stops getting closer for about a second ends where the unit stands, so crowds settle instead of shuffling.

## Editors

The top bar switches between Play, Map Editor and Asset Editor. Both editors pause the game and turn the AI off; Play turns it back on if it was on.

Base maps and textures can't be changed. Saving one always makes a mod: a separate copy marked "Mod" that remembers what it came from. Mods are kept in the browser and, when you're signed in, in your own private store on the page, so they survive a cleared browser. They can also be exported, imported or copied as code.

Tiles are organised as Element → Material → Variation, and every one can be laid as a floor or a wall:
- Earth: Meadow grass, Packed dirt, Wheat, Hedge — Plain, Worn.
- Metal: Steel, Iron, Brass, Gold, Umbra — Panels, Riveted plate, Smooth. Each metal has its own panel design. Umbra is the dark commando metal; its walls are as strong as iron and its door is lighter.
- Stone: Greystone, Sandstone, Limestone, Goldstone, Aurelian marble, Verdant marble, Nightstone — Block, Flagstones, Slabs, Paving, Key tile. Key tiles draw a soft meander band along the edge of the floor area.
- Wood: Oak, Pine, Teak, Walnut, Mahogany, Ebony — Planks, Boards, Polished. Polished is the furniture finish (dark rim, light bevel, inlay line; gold-toned on mahogany and ebony) drawn around each whole area, so a polished floor or wall matches the tables and desks.
- Cloth: Crimson, Verdant, Imperial purple — Plain, Bordered, Diamond weave.
Each stone, wood and metal also has two variations of its own, crude for common materials and ornate for rare ones:
- Stone: Greystone rubble and setts; Sandstone ashlar and crazy paving; Limestone herringbone and basketweave; Goldstone rosette and lattice; Aurelian marble checker and medallion; Verdant marble quatrefoil and banded; Nightstone starfield and opus sectile.
- Wood: Pine rough sawn and split logs; Oak herringbone and pegged boards; Teak ship deck and basketweave; Walnut chevron and brick parquet; Mahogany strung inlay and Versailles; Ebony marquetry and fretwork.
- Metal: Iron cast grating and hammered; Steel tread plate and louvred; Brass filigree and studded grille; Gold engraved and scaled; Umbra runed and veined.
Footsteps follow the tile's element: stone, marble, wood, metal, cloth, grass or dirt, mods included.
The old texture names still work and now draw with their new tile. The Atelier map shows every tile, door and piece of furniture.

Plank floors run as full-length boards across each floor area. Stone slabs is a floor with one bevelled slab per cell.

**Map Editor.** Map tools sits above Weapons, with Tiles, Doors, Furniture and Size. Tiles has Element, Material and Variation selectors, Floor/Wall, a preview you click to arm, and the last eight tiles you used. The bottom bar names the tile under the cursor.
- Strokes, rectangles and fills show as a grey plan while you drag. On release the tiles go down one by one in drawing order, each with dust and its own sound. Plops speed up from 70 ms to 30 ms apart; big areas place up to 12 tiles per plop, still one sound each plop. Undo takes back the whole batch.
- Interior / Outdoor / Auto (saved with the map). Interior maps darken the inside of thick walls; outdoor maps show wall tops. Auto picks outdoor when much of the floor is grass or earth or the map edge is open. Every wall, hedges included, casts the same shadow onto the floor.
- Wall tops (on by default) shows the tops of all walls while editing. It's a view setting only.
- WASD pans the view.
- Clean: each tool has its own cursor with a yellow working tip. Vacuum (hold) pulls loose debris, spent shot, the specks and grit thrown out by blasts, and lingering smoke and dust in with a hum; every piece it catches rattles, so silence means the area is clear. Broad scorch and blood are left for the sponge. Sponge works as you move it and puts out fire and embers with a hiss and a puff of steam: water sounds and a faint damp trail that dries within a few seconds; it lifts blood, scorch, flames and stains, the soot on a carrier's roof and on troops' armour, squeaks once when a cell comes clean, and keeps squeaking softly as you rub clean floor. Wand highlights the cells under it; drag over an area and on release each damaged cell is restored in turn with one chime and lingering coloured sparkles. Brush size sets the tool size.
- Stone and metal walls add a soft low thud when placed.
- Placing tiles gives a soft dust puff in the tile's colours and a quiet sound for its material (stone, tile, wood, metal, cloth, earth). Fills ripple out from where you clicked.
- The grid shows on light and dark floors; the hovered cell has a black and white border.
- Pick a tile to arm it as a brush. Drag to paint, Ctrl-drag to fill a rectangle, Shift-click to flood-fill, and right-click to paint the map's main floor. Brush sizes are 1, 2 or 3 cells.
- Click a door type onto a doorway to place a door; it lines up with the wall. Right-clicking a door gives Locked and key options.
- Ctrl+Z and Ctrl+Y undo and redo painting. Esc drops the brush.
- Weapons, Cover, Items, Tethers and Markers work as in Play. Items (Solari and ammo) can be dropped on a unit, onto furniture or onto the floor. Dropping a weapon or item on a chest, shelf or desk stores it there.
- Save writes the current scenario: tiles, units with their gear and status, doors, cover, items and containers. On a base map, Save makes a new mod map. New starts a blank room.

**Asset Editor.** Textures are listed as Floors, Walls and Furniture, each with base (locked) and mod entries.
- Layers (the default): base colour with Hue, Saturation and Light; material (stone, marble, wood, metal, plaster, cloth, grass, soil, flat); layout (none, planks, slabs, flagstones, bricks, tiles, or any pattern) with joint width and depth; Variation with Shuffle; edge wear, scuffs and cracks; and a 16×16 stamp painted once per cell. Layered textures are drawn across the whole map like the built-in ones, so they join up with no visible repeat. Base textures open as the nearest layer recipe; Compare shows the original.
- Paint: the pixel editor below. Switching to Paint turns the current layers into pixels.
- Tools: pen, fill, line, rectangle (Shift for filled), pick (Alt-click with any tool also picks), select, and mirror X/Y. Arrow keys shift the texture to check seams.
- Hue, Saturation and Light sliders adjust the whole texture. Click a palette colour to paint with it; right-click it to recolour every pixel close to it.
- Patterns: the base patterns behind the built-in textures, plus your own. Click one to lay it over the texture (Overlay keeps the colours, Fill uses the texture's own tone ramp), at 1× or 2× with optional variation. Select an area and save it as a pattern.
- Previews show the texture tiled, in a room with a unit for scale, and in the dark. Compare adds the original.
- Unsaved edits stay as drafts while you switch textures. Saved mods appear in the Map Editor straight away.
- Copy code gives a short snippet of the texture; Load code reads one back.


Sponge sounds use short clips from freesound.org: "working with a plunger" by tosha73, "tube squeak multiple" by uwesoundboiz and "shoe sole rubber squeak" by pipelyd.
