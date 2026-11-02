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
- Fire sticks to units and eats the outer rings; hot plate cracks; sewer water puts it out.
- Shock spears lodged in metal or stone count down and blow; several in a shock trooper overload him.
- Rod launchers fire an iron rod. It gets about two-thirds into a stone wall and can punch through a metal door. In a unit it stops halfway: straight on that kills light troops, but guards and shock troopers often survive it, and it glances off their plate at shallow angles. It throws the target back and can pin them to a wall. Recoil shoves the shooter; civilians and homeguard are thrown much further and wounded.
- Plasma rod launchers fire the rod white-hot. While hot it goes through units without glancing off and burns through one wall and 20–40% of the next, where it cools and sticks; it also cools in flight, though one shot in five sticks in a shock trooper's plate. Once cool it acts like a plain rod.
- The simulation runs at a fixed 60 steps a second whatever the frame rate.

## Maps

Goldbank back room, Havenport warehouse (Imperial raid), Havenport tavern, Havenport sewer (lone ranger), Goldbank Aurum heist (30×42, mirrored, pannable), Goldbank counting house (sheathed arrest), Astia proving yard (rod launcher test range).

## Planned

- Wall collapse: a wall cell under about 8% left, or any isolated fragment, crumbles to rubble; pillars give way earlier.
- Fire spreading between units.
- Squads on the region map opening this view for fights; goods as literal arms and Solari, recruitment and Reaper mercenary prices, black market through Goldbank and Havenport.
