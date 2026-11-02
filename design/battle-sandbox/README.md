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
| WASD | Move selected units |
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

## Rules worth knowing

- Everyone starts sheathed; the first shot or blast draws every weapon.
- Armour is per pixel. Shock troopers are weak at the back, commandos strong only at the front. Hit angle and distance change penetration.
- Muskets 12 rounds, pistols 18, blunderbusses 8, Lancers 4 bolts, Bolters 3, shown as loaded/spare. Units carry one of each gun.
- Inventory slots are fixed: one primary gun or spear, one secondary pistol, grenades, a heavy grenade, and one or two pack slots for spare spears, Solari and the rest. Civilians and homeguard have no secondary slot, so a pistol becomes their primary. A unit won't pick up a second primary while it holds one.
- Items on the floor are picked up automatically if there is room. Solari are an item.
- Doors slide along their own line into the wall beside them; double doors part to both sides together; hitting the lock bursts it, hitting the hinge drops the leaf. Heavy doors are two cells long and thicker.
- Fire catches a unit on the side that touched it and works inward; it only spreads round the whole body after long contact or when standing in it. It eats the outer rings; hot plate cracks; sewer water puts it out.
- Hot stone and metal cool slowly through yellow, orange and red, and give off steam while they do.
- Thrown spears glance off when they strike a surface at a shallow angle and lodge along their line of flight when they strike it squarely.
- Commandos hit 15% harder with every weapon, 35% with the blunderbuss. Their muskets fire two rounds a pull and their pistols two. A commando can carry two pistols and dual-wield them, four shots a pull, each from its own magazine; a pistol dropped on a commando becomes their drawn weapon, and R reloads both.
- Commandos throw furthest, hardest and straightest; about one spear throw in five is well placed enough to punch through a shock trooper's front plate.
- Spears stack like grenades; a stack holds four, anyone armed with them starts with four, and loose spears top the stack up.
- The Lancer is a short dark-metal spear with a plasma emitter behind its head. It fires blue bolts that blast on impact and spark off metal, four to a load, reloaded from cell boxes. A Lancer lying loose fires its bolts first and can be thrown once it is empty. Press T to throw a held one early: with bolts still in it, it bursts in a plasma blast on contact, bigger the more bolts are left. Once it is fired out the head goes plain steel and it throws like a plain spear.
- The Bolter fires iron rods from a three-rod chamber, visible down the barrel slot. Tap to fire a cold rod: it gets about two-thirds into a stone wall, stops halfway in a unit (killing light troops straight on), and guard riflemen's and shock troopers' plate catches it or glances it off, sparking and sometimes starting a fire or tearing plate away. Hold to heat every rod in the chamber, dull red to orange to white: released orange, a hot rod goes through units and about one wall's thickness plus a fifth to two-fifths more, leaving a glowing cut, a scorch line, smoke and embers, and cools in flight; released white, all the rods fire fused into one heavy slug that goes through about two walls and hits much harder. Rods cool in the chamber when not held. Holding past white makes the whole gun glow, and it can burst in the shooter's hands. Only guard riflemen, shock troopers and commandos can charge it; anyone else holding it only fires cold rods; its recoil throws them and makes them drop it every shot. Rods lose energy over distance and push a unit into a wall to crush it there. Carriers walk slower, slower still while aiming.
- Textures are built from a few elements (wood, stone, metal, soil, grass), each with one core texture; variants are a tint plus an overlay laid on the cell grid with no offsets: half-cell planks, full-cell flagstones and metal plates, white and green marble, framed panels, riveted plates, dark iron, brass and tread plate. Every surface gets a soft edge where it meets a different one. Half walls fill half a cell; slabs and doors are half a cell thick.
- Walls darken towards black from about three pixels in from their faces, so only their edges show; damage exposes new edges.
- A broad soft light stays fixed to the screen, so it moves only when the camera pans; metal, marble, gold and armour brighten as it passes. Slab and door edges are lit from the same side whatever way they face, so paired doors match.
- Furniture and fixtures (tables, desks, chairs, vault shelving, chests, rifle racks) are part of the room: they sit above the floor, block walking, and bullets pass over them. Click one with a unit beside it to open it; its contents show next to the unit's inventory and items move by clicking. Blasts break them, and one broken badly spills what it holds. There are no loose crates.
- Doorways have a threshold stone under the door, marble with a gold line where the rooms are marble.
- Doors snap to the middle of their wall line and meet the wall ends. Rugs are laid on marble with a woven border; desks are dark mahogany with a brass inlay line.
- A blast strong enough breaks laid floors and shows dark gritty foundation; a heavy grenade breaks a wide patch, a grenade a small one.
- Blasts on grass or soil tear up the grass, dig a soft crater, throw soil round it and scorch the ground; the crater stays.
- Slabs placed from the Cover list are free barricades: no hinge, no lock, never open. Units push them by walking into them, slowed by the weight: wood a little, metal more, the heavy slab most, armoured units less than light ones.
- The simulation runs at a fixed 60 steps a second whatever the frame rate.

## Maps

Goldbank back room, Havenport warehouse (Imperial raid), Havenport tavern, Havenport sewer (lone ranger), Goldbank Aurum heist (30×47, mirrored, pannable; marble star medallions, vault shelving, white paving with planters and a hedge), Goldbank counting house (sheathed arrest), Pirate airship boarding (six commandos, two of them dual-wielding pistols plus a Lancer and a Bolter, cross two gangplanks onto a pirate deck of twelve crew up to guard riflemen; anything that goes over the rail into open sky is lost), Astia proving yard (outdoor, everyone unarmed, one Bolter on the ground with crates of rods, muskets, grenades and heavy grenades: a lane of every unit type, a long lane, eight material lanes with a target behind each — stone, half stone, double stone, wood, half wood, metal, half metal and a heavy door — a yard of every floor, wall and half-wall texture, and a grass field with a soil patch, loose grenades and barricades for blast tests).

## Planned

- Wall collapse: a wall cell under about 8% left, or any isolated fragment, crumbles to rubble; pillars give way earlier.
- Fire spreading between units.
- Squads on the region map opening this view for fights; goods as literal arms and Solari, recruitment and Reaper mercenary prices, black market through Goldbank and Havenport.
