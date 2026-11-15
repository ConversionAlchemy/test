#!/bin/bash
# score a W config for v2 against v1: seeds both ways; prints mean (v2 left - v1 left) and wins
CFG="$1"; SEEDS="${2:-1 2 3 4}"; TAG="${3:-x}"
A=""; B=""
for s in $SEEDS; do A="$A$s:v2:v1:1,"; B="$B$s:v1:v2:1,"; done
timeout 2400 node tour.cjs "${A%,}" "$CFG" > ev_${TAG}_a.txt 2>&1 &
timeout 2400 node tour.cjs "${B%,}" "$CFG" > ev_${TAG}_b.txt 2>&1
wait
cat ev_${TAG}_a.txt ev_${TAG}_b.txt | grep '^{' | node -e '
const L=require("fs").readFileSync(0,"utf8").trim().split("\n").map(JSON.parse);
let d=0,w=0,l=0;for(const g of L){const v2=g.gb==="v2"?g.green:g.red,v1=g.gb==="v2"?g.red:g.green;d+=v2-v1;if(v2>v1+0.05)w++;else if(v1>v2+0.05)l++;}
console.log(process.argv[1],"games",L.length,"mean",(d/L.length).toFixed(3),"won",w,"lost",l);' "$TAG $CFG"
