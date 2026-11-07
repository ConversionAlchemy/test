#!/bin/sh
# Bundles src/ into one self-contained page.
cd "$(dirname "$0")"
{ echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fluoria battle sandbox</title></head><body style="background:#000;margin:0;overflow:hidden">'
  cat src/head.html; echo '<script>'; cat src/tiles.js src/ward.js src/sim.js src/sounds.js src/space.js src/editor.js src/countmap.js src/vehicle.js src/save.js src/ui.js; echo '</script></body></html>'; } > index.html
