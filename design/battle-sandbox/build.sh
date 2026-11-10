#!/bin/sh
# Bundles src/ into one self-contained page.
cd "$(dirname "$0")"
node tests/materials.cjs >/dev/null || { node tests/materials.cjs; exit 1; }
{ echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fluoria battle sandbox</title></head><body style="background:#000;margin:0;overflow:hidden">'
  cat src/head.html; echo '<script>'; cat src/tiles.js src/materials.js src/ward.js src/region-data.js src/sim/core.js src/sim/world.js src/sim/wear.js src/sim/maps.js src/sim/stores.js src/sim/towns.js src/sim/units.js src/sim/combat.js src/sim/render.js src/sim/control.js src/sim/ai.js src/sim/loop.js src/sounds.js src/space.js src/editor.js src/countmap.js src/vehicle.js src/save.js; tac src/ui.js | awk 'f||!/^\}\)\(\);$/{print;next}{f=1}' | tac; cat src/region.js; echo '})();'; echo '</script></body></html>'; } > index.html
