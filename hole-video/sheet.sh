#!/bin/bash
# usage: ./sheet.sh out.jpg t1 t2 ...   (stills must exist)
out=$1; shift
inputs=(); filters=""; i=0
for t in "$@"; do inputs+=(-i "stills/${PREFIX}t_$(printf '%.2f' $t).jpg"); filters+="[$i:v]scale=360:640,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='$t':x=8:y=8:fontsize=26:fontcolor=lime[v$i];"; i=$((i+1)); done
for ((k=0;k<i;k++)); do filters+="[v$k]"; done
ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "${filters}hstack=inputs=$i" -q:v 3 "$out"
