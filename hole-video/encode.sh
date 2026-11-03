#!/bin/bash
# Encode rendered frames + soundtrack into a TikTok-ready MP4 (1080x1920, 30fps, H.264 + AAC, -14 LUFS)
cd "$(dirname "$0")"
mkdir -p out
ffmpeg -y -loglevel error -stats \
  -framerate 30 -i frames/%05d.jpg -i soundtrack.wav \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -level 4.2 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -shortest out/fell-in-a-hole.mp4
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of compact out/fell-in-a-hole.mp4
