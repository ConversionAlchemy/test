#!/bin/bash
# green at 70% strength; v2 vs v1 commanding the smaller side, and v1 vs v1 as the baseline
timeout 3000 node tour.cjs "1:v2:v1:0.7,2:v2:v1:0.7,3:v2:v1:0.7,4:v2:v1:0.7,5:v2:v1:0.7,6:v2:v1:0.7" > h_v2.txt 2>&1 &
timeout 3000 node tour.cjs "1:v1:v1:0.7,2:v1:v1:0.7,3:v1:v1:0.7,4:v1:v1:0.7,5:v1:v1:0.7,6:v1:v1:0.7" > h_v1.txt 2>&1
wait
