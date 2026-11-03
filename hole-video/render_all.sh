#!/bin/bash
# Render all frames with N parallel browser workers.  Env: PAGE (default index.html), FRAMES (default frames), DUR (default 42)
cd "$(dirname "$0")"
FPS=30; N=${N:-3}; DUR=${DUR:-42.0}; FRAMES=${FRAMES:-frames}
TOTAL=$(node -e "console.log(Math.round($DUR*$FPS))")
CHUNK=$(( (TOTAL + N - 1) / N ))
mkdir -p "$FRAMES"
for ((w=0; w<N; w++)); do
  s=$((w*CHUNK)); e=$(( (w+1)*CHUNK )); [ $e -gt $TOTAL ] && e=$TOTAL
  FRAMES=$FRAMES node render.mjs frames $s $e $FPS > "$FRAMES/log_$w.txt" 2>&1 &
done
wait
echo "frames done: $(ls $FRAMES/*.jpg | wc -l) / $TOTAL"
