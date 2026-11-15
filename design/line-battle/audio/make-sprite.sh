#!/bin/sh
# Cuts the volley recording into one mono sprite: the sustained fire (8.2–18.45 s) then the shouts, each after 0.1 s of silence.
# Writes ../snd-volley.js with the sprite and the offsets the game reads.
cd "$(dirname "$0")"
T=$(mktemp -d)
ffmpeg -v error -y -i volley-fire-1.mp3 -ac 1 -ar 44100 "$T/all.wav"
ffmpeg -v error -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.1 "$T/gap.wav"
i=0; L=""
for span in "8.2 10.25" "0.68 0.34" "2.28 0.38" "2.72 0.82" "5.12 0.78" "6.3 0.75"; do
  set -- $span
  ffmpeg -v error -y -ss $1 -t $2 -i "$T/all.wav" "$T/p$i.wav"
  L="$L file '$T/p$i.wav'
file '$T/gap.wav'
"; i=$((i+1))
done
printf "%s" "$L" > "$T/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$T/list.txt" -ac 1 -b:a 96k "$T/spr.mp3"
{ printf '// the volley recording as one sprite: [start, length] of the fire bed, the single shots in it, and the shouts\nconst VOLLEY_SPR="'
  base64 -w0 "$T/spr.mp3"
  printf '";\nconst VOLLEY_BED=[0,10.25],VOLLEY_SHOTS=[0.1,2.58,4.42,5.43,6.22,7.19,8.98],VOLLEY_CRIES=[[10.35,0.34],[10.79,0.38],[11.27,0.82],[12.19,0.78],[13.07,0.75]];\n'; } > ../snd-volley.js
rm -r "$T"
