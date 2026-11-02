# Fluoria design material

Reference for the brief in `../FLUORIA.md`.

- `previews/`: the agreed look for each view. `2-region.png` is the benchmark. `3-city-mockup.png` is our own generator imitating Watabou's method; `6-portsbridge-import.png` and `7-willards-pass-import.png` are real Watabou exports drawn in our style.
- `samples/`: real exports used to design and test the importers.
  - `portsbridge.json`: Watabou city generator (mfcg 0.11.5), GeoJSON.
  - `willards-pass.json`: Watabou village generator (vg 1.6.9), GeoJSON.
  - `house_by_the_lake.json`: Watabou Dwellings, three floors.
  - `zone-source.png`: screenshot of the Havenport–Goldbank–Portsbridge zone, traced by `zone.py`.
- `prototype/`: the Python scripts that drew the previews. They are sketches for the look, not app code. VT323 is bundled under the SIL Open Font License (`fonts/OFL.txt`).
- `battle-sandbox/`: the pixel interior battle prototype, one self-contained page. See its README.

Run the prototypes with Python 3, numpy, Pillow, shapely and scipy:

```
cd design/prototype
python3 region.py                     # writes out/2-region.png
python3 zone.py                       # writes out/11-zone.png from samples/zone-source.png
python3 goldbank.py                   # writes out/12-goldbank.png, the city view and its panel
python3 city_cells.py                 # writes out/13-goldbank-cells.png, the city as 16 px texture cells
python3 import_city.py ../samples/portsbridge.json out/portsbridge.png "Portsbridge" "{n} buildings" 5.6
```

The last argument of `import_city.py` is map units per pixel (lower zooms in).
