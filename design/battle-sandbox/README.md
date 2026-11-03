# Battle sandbox

A pixel interior battle prototype for Fluoria: one self-contained page (`index.html`), built from `src/` with `./build.sh`. Open the page in a browser; no server needed.

- `src/head.html`: markup and styles.
- `src/tiles.js`: 16px tile textures and palettes.
- `src/sim.js`: the simulation (physics, damage, weapons, doors, fire, lighting, sound, UI).

## Controls

| Input | Action |
|---|---|
| Click | Select a unit (Ctrl adds); click a door's hinge to open it, elsewhere to lock; click a crate to open it |
| Drag | Box-select, or drag a unit or item |
| Hold | Aim and fire, or wind up a throw; the crosshair fills from inner to outer |
| WASD | Move selected units; selected units turn to face the cursor |
| 1–6 | Pick a slot: 1 primary, 2 secondary, 3 grenade, 4 heavy, 5–6 pack |
| R | Reload from spare ammo |
| T | Lancer: switch between firing bolts and throwing |
| Q | Sheathe or draw |
| E / Esc | Deselect |
| F / G | Switch hand / drop |
| Space + drag, middle drag | Pan the camera on big maps |
| Shift + drag | Lift anything and carry it over walls; drop it outside the map to delete it |
| Click a slab | Select it: hold Q or E to turn it; drag to move it |
| Double-click an item | Select it: hold to fire or throw it from where it lies; drag to move it |
| Right-click | Unit or door options |
| Tools: Rope, Chain | Drag onto a unit, or click the tool then a unit, to tie it to the nearest wall; Esc cancels |
| Side headings | Click Weapons, Cover, Tools, Markers or Inspector to fold it away |
| Inspector (right column) | Shows the selected unit, or an opened chest, desk, shelf or rack with the selected unit beneath it when it stands beside it. Click an item to move it to the other box, drag it across, drag it out to drop it, Shift+click to drop it; click a unit's slot to draw it |

## Rules worth knowing

- Everyone starts sheathed; the first shot or blast draws every weapon.
- Armour is per pixel. Shock troopers are weak at the back, commandos strong only at the front. Hit angle and distance change penetration.
- Muskets 12 rounds, pistols 18, blunderbusses 8, Lancers 4 bolts, Bolters 3, shown as loaded/spare. Units carry one of each gun.
- Inventory slots are fixed: one primary gun or spear, one secondary pistol, grenades, a heavy grenade, and one or two pack slots for spare spears, Solari and the rest. Civilians and homeguard have no secondary slot, so a pistol becomes their primary. A unit won't pick up a second primary while it holds one.
- Items on the floor are picked up automatically if there is room. Solari are an item. Dragging an item onto a unit that already carries one of the same kind refills it instead: a gun's magazine and spare ammo to full, spears and Lancers to four, grenades to the unit's starting count.
- Doors slide along their own line into the wall beside them, leaving a lip showing to click shut again, and don't block anyone while open; double doors part to both sides together; hitting the lock bursts it, hitting the hinge drops the leaf. Heavy doors are two cells long and thicker.
- Fire catches a unit on the side that touched it and works inward; it only spreads round the whole body after long contact or when standing in it. It eats the outer rings; hot plate cracks; sewer water puts it out.
- Hot stone and metal cool slowly through yellow, orange and red, and give off steam while they do.
- Thrown spears glance off when they strike a surface at a shallow angle and lodge along their line of flight when they strike it squarely.
- Commandos hit 15% harder with every weapon, 35% with the blunderbuss. Their muskets fire two rounds a pull and their pistols two. A commando can carry two pistols and dual-wield them, four shots a pull, each from its own magazine; a pistol dropped on a commando becomes their drawn weapon, and R reloads both.
- Commandos throw furthest, hardest and straightest; about one spear throw in five is well placed enough to punch through a shock trooper's front plate.
- Spears stack like grenades; a stack holds four, anyone armed with them starts with four, and loose spears top the stack up.
- The Lancer is a short black-metal staff with an iron tip heated purple by plasma. It is thrown, and holding the wind-up charges the tip: more charge means deeper penetration, a bigger burst and a harder shove. Against metal plate it drives in along its line of flight, blows a little plate off and stays wedged, its tip glowing and burning the plate around it as it cools, then goes dark for good; an uncharged hit often wounds a heavy, a full charge usually kills. Against flesh and cloth it only pierces a little and scorches. Hitting a wall it explodes and breaks into rod pieces on the floor. A missed throw lands and cools. Holding the charge past full blows the tip in the thrower's hands and that Lancer breaks into rod pieces. Lancers stack four to a slot like spears, and carriers start with four.
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
