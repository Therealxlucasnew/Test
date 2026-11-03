#!/bin/bash
# Voiceover pipeline: Kokoro TTS -> line timing -> mix -> re-render frames (captions) -> encode
set -e
cd "$(dirname "$0")"
node tts_kokoro.mjs          # vo/lines/NN.wav  (offline Kokoro-82M voice)
python3 vo_build.py          # vo/vo.wav + vo/vo_timing.json (karaoke caption timings)
python3 audio.py             # soundtrack.wav with VO + ducking
rm -rf frames && mkdir frames && ./render_all.sh
./encode.sh
