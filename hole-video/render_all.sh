#!/bin/bash
# Render all frames with N parallel browser workers, then encode.
cd "$(dirname "$0")"
FPS=30; N=${N:-3}
TOTAL=$(node -e "console.log(Math.round(42.0*$FPS))")
CHUNK=$(( (TOTAL + N - 1) / N ))
for ((w=0; w<N; w++)); do
  s=$((w*CHUNK)); e=$(( (w+1)*CHUNK )); [ $e -gt $TOTAL ] && e=$TOTAL
  node render.mjs frames $s $e $FPS > "frames/log_$w.txt" 2>&1 &
done
wait
echo "frames done: $(ls frames/*.jpg | wc -l) / $TOTAL"
