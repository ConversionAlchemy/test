#!/bin/sh
# Bundles the line battle into one page: the sandbox's sound engine (core sound + space.js), its musket reload clip, then the game
cd "$(dirname "$0")"
SB=../battle-sandbox/src
{ cat head.html; echo '<script>'
  echo 'const $=id=>document.getElementById(id);let OUTD=true,W=1e9,H=1e9,sel=new Set(),bodies=[],tick=0;const CLS={stone:{rubble:"stone"}},clsAt=()=>"stone";'
  cat snd-core.js snd-reload.js snd-volley.js snd-field.js $SB/space.js game.js; echo '</script>'; } > index.html
# the sound library page: every sound, numbered, to pick from
{ cat lib-head.html; echo '<script>'
  echo 'const $=id=>document.getElementById(id);let OUTD=true,W=1e9,H=1e9,sel=new Set(),bodies=[],tick=0;const CLS={stone:{rubble:"stone"}},clsAt=()=>"stone";'
  cat snd-core.js snd-volley.js snd-field.js $SB/sounds.js $SB/space.js lib.js; echo '</script>'; } > sound-library.html
