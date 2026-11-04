# TCAS: the box that stops mid-air collisions (TikTok, 3D)

A ~50 second vertical (1080×1920, 30 fps) 3D explainer about TCAS, the
Traffic Collision Avoidance System on airliners. It ends with the question
"Would you trust the computer, or the controller?"

**Final video:** [`tcas_tiktok.mp4`](tcas_tiktok.mp4)

## Story

| # | Beat | Voiceover | Visual |
|---|------|-----------|--------|
| 1 | Hook | Two airliners. Same altitude. Closing at 900 knots. Head on. | Chase cam, FL350 tags, closure counter, cockpit view with target brackets |
| 2 | Stakes | At this speed, you have less than a minute. | Ticking "time to impact" |
| 3 | Reveal | What saves them is a box you've probably never heard of. TCAS. | Orbit around the jet, glowing antenna |
| 4 | Name | The Traffic Collision Avoidance System. | Acronym unpacks word by word |
| 5 | How | Every second, it pings the transponder of every plane nearby, and calculates one number: seconds until impact. | Radar bubbles, TCAS traffic symbols |
| 6 | TA | 48 seconds out, the first warning. *"Traffic, traffic."* | Cockpit traffic display, amber circle |
| 7 | RA | 35 seconds out, it takes command. *"Climb, climb."* | Red square, climb arrow on the vertical-speed scale, the jet pitches up |
| 8 | Coordination | The two planes talk to each other. One is told to climb, the other to descend. | Data-link beam, opposite manoeuvres, fly-by |
| 9 | Rule | Pilots must obey, even if air traffic control says the opposite. | TCAS vs ATC cards |
| 10 | Why | 2002, Überlingen, Germany: one crew followed the controller instead of TCAS. 71 people died. | Night scene, both jets descending, fade to "71 lives lost" |
| 11 | Today | Every large airliner carries it. *"Clear of conflict."* | Golden hour, green resolution |
| 12 | CTA | Would you trust the computer, or the controller? | Computer vs controller, "comment below" |

Lines in *italics* are the cockpit voice (radio-filtered male voice). The narrator is Kokoro `af_heart`.

**Facts used:** above 20,000 ft, TCAS II gives a Traffic Advisory about 48 s and a
Resolution Advisory about 35 s before the closest point of approach (FAA). On
1 July 2002, the Tu-154 crew over Überlingen followed ATC's "descend" instead of
their TCAS "climb", while the DHL 757 followed its TCAS "descend". 71 people died.
ICAO then made it explicit that pilots must follow an RA even against ATC.
The 3D scenes are illustrative: distances and speeds are compressed for the camera.

## How it's made

Everything is generated from code: no stock footage, no photos, no samples.

| File | What it does |
|------|--------------|
| `script.json` | Voiceover, split into scenes and phrases (callouts flagged) |
| `tts.py` | Kokoro TTS → `voice.wav` + `timeline.json` (phrase and word timings); radio filter for callouts |
| `index.html` + `main.js` | Three.js scene (procedural airliners, sky, cloud sea, contrails, radar bubbles, data link) plus an HTML overlay with TCAS symbology and captions; `render(t)` is a pure function of time |
| `render.cjs` | Serves the folder locally, steps `render(t)` frame by frame in headless Chromium (WebGL), pipes JPEGs to ffmpeg |
| `audio.py` | Procedural tense score (drone, filtered bass ostinato, drums), radar pings, alert tones, doppler fly-by, ducked under the voice |

### Rebuild

```bash
npm install                                          # three.js
B=build
python tts.py kokoro-v1.0.onnx voices-v1.0.bin $B    # voice.wav, timeline.json
node render.cjs $B/timeline.json $B/video.mp4        # video.mp4, sfx.json  (add --range a:b to split across workers)
python audio.py $B                                   # mix.wav
ffmpeg -i $B/video.mp4 -i $B/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart tcas_tiktok.mp4
```

Preview frames with `node render.cjs $B/timeline.json stills/ --stills 3,10,30`.
