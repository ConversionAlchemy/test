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
| 1–6 | Pick an inventory slot |
| R | Reload from spare ammo |
| T | Lancer: switch between firing bolts and throwing |
| Q | Sheathe or draw |
| E / Esc | Deselect |
| F / G | Switch hand / drop |
| Space + drag, middle drag | Pan the camera on big maps |
| Shift + drag | Lift anything and carry it over walls; drop it outside the map to delete it |
| Click a slab | Select it: WASD slides it, hold the mouse to turn it to face the pointer |
| Click an item | Select it: WASD nudges it, hold to fire or throw it from where it lies |
| Right-click | Unit or door options |

## Rules worth knowing

- Everyone starts sheathed; the first shot or blast draws every weapon.
- Armour is per pixel. Shock troopers are weak at the back, commandos strong only at the front. Hit angle and distance change penetration.
- Muskets 12 rounds, pistols 18, blunderbusses 8, Lancers 4 bolts, Bolters 3, shown as loaded/spare. Units carry one of each gun.
- Items on the floor and in open crates are picked up automatically if there is room. Crates hold one kind of item. Solari are an item.
- Doors swing on their hinge; double doors open together; hitting the lock bursts it, hitting the hinge drops the leaf. Heavy doors are two cells long and thicker.
- Fire catches a unit on the side that touched it and works inward; it only spreads round the whole body after long contact or when standing in it. It eats the outer rings; hot plate cracks; sewer water puts it out.
- Hot stone and metal cool slowly through yellow, orange and red, and give off steam while they do.
- Thrown spears glance off when they strike a surface at a shallow angle and lodge along their line of flight when they strike it squarely.
- Commandos hit 15% harder with every weapon, 35% with the blunderbuss. Their muskets fire two rounds a pull; their pistols keep firing about six shots a second while the mouse is held, spreading wider the longer the burst, until released or empty.
- Commandos throw furthest, hardest and straightest; about one spear throw in five is well placed enough to punch through a shock trooper's front plate.
- Spears stack like grenades; a stack holds four, anyone armed with them starts with four, and loose spears top the stack up.
- The Lancer is a short dark-metal spear with a plasma emitter behind its head. It fires blue bolts that blast on impact and spark off metal, four to a load, reloaded from cell boxes. Press T to throw it early: with bolts still in it, it bursts in a plasma blast on contact, bigger the more bolts are left. Once it is fired out the head goes plain steel and it throws like a plain spear.
- The Bolter fires iron rods from a three-rod chamber, visible down the barrel slot. Tap to fire a cold rod: it gets about two-thirds into a stone wall, stops halfway in a unit (killing light troops straight on), and guard riflemen's and shock troopers' plate catches it or glances it off, sparking and sometimes starting a fire or tearing plate away. Hold to heat every rod in the chamber, dull red to orange to white: released orange, a hot rod goes through units and about one wall's thickness plus a fifth to two-fifths more, leaving a glowing cut, a scorch line, smoke and embers, and cools in flight; released white, all the rods fire fused into one heavy slug that goes through about two walls and hits much harder. Rods cool in the chamber when not held. Holding past white makes the whole gun glow, and it can burst in the shooter's hands. Only guard riflemen, shock troopers and commandos can charge it; anyone else holding it only fires cold rods; its recoil throws them and makes them drop it every shot. Rods lose energy over distance and push a unit into a wall to crush it there. Carriers walk slower, slower still while aiming.
- Slabs placed from the Cover list are free barricades: no hinge, no lock, never open. Units push them by walking into them, slowed by the weight: wood a little, metal more, the heavy slab most, armoured units less than light ones.
- The simulation runs at a fixed 60 steps a second whatever the frame rate.

## Maps

Goldbank back room, Havenport warehouse (Imperial raid), Havenport tavern, Havenport sewer (lone ranger), Goldbank Aurum heist (30×42, mirrored, pannable), Goldbank counting house (sheathed arrest), Astia proving yard (outdoor test range, everyone unarmed, one Bolter on the ground with spare rods in a crate: a lane of every unit type, a long lane where a hot rod has cooled, and lanes of stone, double stone, wood, metal, half slab and heavy door with a target behind each).

## Planned

- Wall collapse: a wall cell under about 8% left, or any isolated fragment, crumbles to rubble; pillars give way earlier.
- Fire spreading between units.
- Squads on the region map opening this view for fights; goods as literal arms and Solari, recruitment and Reaper mercenary prices, black market through Goldbank and Havenport.
