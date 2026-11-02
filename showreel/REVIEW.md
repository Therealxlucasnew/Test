# Review: "Say it, see it" showreel

Output: `renders/claude-showreel.mp4`. 40 s, 1920×1080, 30 fps, H.264 + AAC.

## Creative calls
- Built storyline A, "Say it, see it": each spoken key word becomes its picture (word → MOVE, brief → strike, line → wave, TYPE, chart, globe, DEPTH, GLITCH, all six at once, film strip, end card).
- Not built: B "Zoom forever" (endless zoom through worlds) and C "11:58 pm" (a late-night brief that unfolds into the video). Both are in `STORYLINES.md`.
- Look: four flat colour fields (orange #FF5A1F, ink #141414, bone #EEE8DC, blue #2340FF), Archivo Black display, Montserrat 700 secondary. Every scene enters through an object from the one before (the O swells, the strike opens, the wave flattens, the columns become bars, the chart's last point irises open, the landing pin irises open, the last film frame floods).
- The globe uses real Natural Earth 110m land data, bundled locally in `assets/js/land.js`. The Tokyo → San Francisco route is illustrative.
- "128 plays this week" is a demo number, not a claim.
- No Claude logo is drawn. The end card is the wordmark set in type.

## Sound
- Voiceover: Kokoro (am_michael) generated locally, one file per line, normalised.
- Sound effects: the 21 bundled Pixabay effects (`assets/sfx`), each placed so its peak lands one frame after its picture.
- **No music bed.** HeyGen isn't signed in, and the network blocks Hugging Face (MusicGen), Openverse and the PyTorch index. To add music: run `npx hyperframes auth login`, or drop a track into `assets/` and add an `<audio id="bgm">` at volume ≈0.14.
- Measured on the render, not heard: −15.1 LUFS integrated, true peak −2.7 dBTP, no clipping.

## Checked
- `hyperframes check`: 0 errors.
- Snapshots at every QA time in `SPEC.md`, every seam (±0.2 s), the phone-width sheet, and a 12-frame contact sheet from the rendered MP4.
- Fixed during review: two crossfades went muddy (orange→blue, blue→bone), so both are now hard-edged wipes. A stray orange bar showed at the start of S2, and S2 opened on ~1 s of empty frame.

## Warnings kept on purpose
- `line_unread` on "DEPTH" / "GLITCH" in the film strip (S10). The strip is a fast montage of earlier frames and isn't meant to be read.
- `duplicate_audio_track` info on sfx lanes: short effects that touch on the same lane, no audible layering.

## Weakest shot / next time
- S10 (film strip): the strip's empty tail shows at the right as it settles. Next time, end the strip on its last frame or trim the strip width.
- The voice is a small local model, decent but a little flat. A HeyGen voice would sound more natural.
- A music bed would lift the whole film the most. S4 (TYPE) is already cut on a 120 BPM grid, ready for a track.
