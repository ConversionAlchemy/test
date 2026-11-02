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
| T | Shock spear: bolt or throw |
| Q | Sheathe or draw |
| E / Esc | Deselect |
| F / G | Switch hand / drop |
| Space + drag, middle drag | Pan the camera on big maps |
| Right-click | Unit or door options |

## Rules worth knowing

- Everyone starts sheathed; the first shot or blast draws every weapon.
- Armour is per pixel. Shock troopers are weak at the back, commandos strong only at the front. Hit angle and distance change penetration.
- Muskets 12 rounds, pistols 18, blunderbusses 8, shock spears 4 bolts, rod launchers 6, plasma rod launchers 3, shown as loaded/spare. Units carry one of each gun.
- Items on the floor and in open crates are picked up automatically if there is room. Crates hold one kind of item. Solari are an item.
- Doors swing on their hinge; double doors open together; hitting the lock bursts it, hitting the hinge drops the leaf. Heavy doors are two cells long and thicker.
- Fire catches a unit on the side that touched it and works inward; it only spreads round the whole body after long contact or when standing in it. It eats the outer rings; hot plate cracks; sewer water puts it out.
- Hot stone and metal cool slowly through yellow, orange and red, and give off steam while they do.
- Shock spears lodged in metal or stone count down and blow; several in a shock trooper overload him.
- Rod launchers fire an iron rod. It gets about two-thirds into a stone wall and can punch through a metal door. In a unit it stops halfway, which kills light troops straight on. Guard riflemen's and shock troopers' plate catches it or glances it off; only about one shot in fourteen goes through. Hits on plate always spark, and three times in ten the sparks start a small fire. It throws the target back and can pin them to a wall. Recoil shoves the shooter; civilians and homeguard are thrown much further and wounded, and a civilian drops it half the time. The launcher is heavy: carriers walk slower and slower still while aiming, elite units less so. A unit thrown into a wall is driven into it and crushed flat on that side, leaving blood on the wall; worst for the lightly armoured. Hitting metal heats it with sparks and one time in ten the rod bursts in a spray of sparks and small fires; glancing hits tear chunks of plate off.
- Rods lose energy over distance: past a few cells they hit softer, push less and pin less, down to about a third at long range.
- Plasma rod launchers fire the rod white-hot. While hot it goes through units without glancing off and burns through about one wall's thickness of stone or plate plus 20–40% more, then cools and sticks, leaving a glowing cut, a scorch line, smoke and embers on the ground where it hit; it also cools in flight, though one shot in five sticks in a shock trooper's plate. Once cool it acts like a plain rod. Civilians and homeguard firing it may set themselves alight.
- The simulation runs at a fixed 60 steps a second whatever the frame rate.

## Maps

Goldbank back room, Havenport warehouse (Imperial raid), Havenport tavern, Havenport sewer (lone ranger), Goldbank Aurum heist (30×42, mirrored, pannable), Goldbank counting house (sheathed arrest), Astia proving yard (outdoor test range: a lane of every unit type, a long lane where the plasma rod has cooled, and lanes of stone, double stone, wood, metal, half slab and heavy door with a target behind each).

## Planned

- Wall collapse: a wall cell under about 8% left, or any isolated fragment, crumbles to rubble; pillars give way earlier.
- Fire spreading between units.
- Squads on the region map opening this view for fights; goods as literal arms and Solari, recruitment and Reaper mercenary prices, black market through Goldbank and Havenport.
