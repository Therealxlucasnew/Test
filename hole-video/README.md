# Fell In A Hole — TikTok short (procedural three.js)

A 42s vertical (1080×1920, 30fps) horror/escape short, built entirely in code:
three.js scene + character rig with IK, eased keyframe camera, TikTok-style captions,
post FX (bloom, grain, vignette, chromatic aberration) and a fully synthesized soundtrack.

## Story
Hook (fall) → Attempt #1 JUMP (fail) → Attempt #2 CLIMB the roots (snap, fail) →
Attempt #3 CALL FOR HELP (no signal, fail) → something in the tunnel → the CHIMNEY CLIMB →
last-second lunge → "it's still down there" → end card.

## Build
```bash
npm install                 # three + fonts
./render_all.sh             # renders frames/ with 3 headless Chromium workers (N=… to change)
python3 audio.py            # synthesizes soundtrack.wav
./encode.sh                 # -> out/fell-in-a-hole.mp4
```
Preview single frames: `node render.mjs stills 1.5,7.2,30 0.5` → `stills/`.

## Files
- `src/timeline.js` – the whole story as data: character keys, camera moves (ease-out), creature, FX
- `src/man.js` – character rig + 2-bone IK + face
- `src/world.js` – hole cross-section, soil shader, lights, particles
- `src/creature.js` – eyes, jaw, reaching arm
- `src/overlay.js` – captions, ATTEMPT badges, FAIL stamps, end card
- `audio.py` – sound design + score (numpy)
