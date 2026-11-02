# "Everybody Loves Rasmus": TikTok explainer

A ~59 second vertical (1080×1920, 30 fps) motion-graphics video in English
about the Danish TV 2 prank show *Alle elsker Rasmus* and the backlash that
followed. It ends with the question "What's your opinion?"

**Final video:** [`rasmus_tiktok.mp4`](rasmus_tiktok.mp4)

## The story, as narrated

| # | Beat | Voiceover |
|---|------|-----------|
| 1 | Hook | Imagine this. For four months, everyone around you is lying to your face. And you have absolutely no idea. |
| 2 | Who | Meet Danish comedian Rasmus Wallbridge. |
| 3 | The dream | He thought he was living his dream, making his own movie, a Danish Scary Movie-style parody, with his friend Martin Johannes Larsen. |
| 4 | The twist | But the dream was fake. Martin was in on it, with a hidden camera in his lapel pin. |
| 5 | Scale | 149 people were in on the joke. Friends. Colleagues. Even big Danish celebrities. |
| 6 | The show | It was all for a TV 2 show called *Everybody Loves Rasmus* (*Alle elsker Rasmus*). |
| 7 | Premiere | It premiered on October 26th, and Denmark exploded. |
| 8 | Backlash | Comedians and TV hosts called it bullying. One critic called it psychological torture. |
| 9 | Pulled | Within days, TV 2 pulled the entire show and apologized unconditionally, admitting it failed to protect him. |
| 10 | Apologies | Stars who took part are now saying sorry too. One said he should have known better and said no. |
| 11 | Rasmus | And Rasmus? He says he's not in a place to join the debate right now. |
| 12 | CTA | So, harmless prank, or way too far? What's your opinion? |

Sources (late Oct to early Nov 2026): TV 2 ("TV 2 trækker 'Alle elsker Rasmus'
tilbage og sender undskyldning", "Wallbridge reagerer efter omfattende kritik af
TV 2", "Over 100 tv-folk var med…"), DR ("TV 2 fjerner 'Alle Elsker Rasmus'
efter massiv kritik", "TV 2-program vækker vrede: 'Jeg synes, det er mobning'"),
Soundvenue ("Flere stjerner undskylder for at medvirke i 'Alle elsker Rasmus'")
and Danish Dispatch ("TV 2 Apologises to Comedian Secretly Filmed for Four Months").

## How it's made

Everything is generated from code. There is no stock footage, no photos and no
music samples, so there are no rights issues.

| File | What it does |
|------|--------------|
| `script.json` | Voiceover text, split into scenes and phrases |
| `tts.py` | Generates the voiceover with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (voice `af_heart`) and writes `timeline.json` with phrase and word timings |
| `index.html` | The motion-graphics "stage": every scene is a pure function of time `render(t)`, with word-synced kinetic captions |
| `render.cjs` | Steps through `render(t)` frame by frame in headless Chromium (Playwright) and pipes the frames to ffmpeg |
| `audio.py` | Synthesizes a 124 BPM beat (drops on "four months"), whooshes, impacts, a dreamy chime, a riser plus boom and debris crackle on "Denmark exploded", then ducks it all under the voice |
| `narration.txt` | The full voiceover as one block of text, ready to paste into ElevenLabs or any other TTS |

### Rebuild

```bash
B=build                                   # any scratch dir
pip install kokoro-onnx soundfile scipy
# models: kokoro-v1.0.onnx + voices-v1.0.bin from the kokoro-onnx GitHub releases
python tts.py kokoro-v1.0.onnx voices-v1.0.bin $B   # -> voice.wav, timeline.json
node render.cjs $B/timeline.json $B/video.mp4        # -> video.mp4, sfx.json
python audio.py $B                                   # -> mix.wav
ffmpeg -i $B/video.mp4 -i $B/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart rasmus_tiktok.mp4
```

Preview individual frames with `node render.cjs $B/timeline.json stills/ --stills 3,10,30`.

TikTok's UI covers the top ~150 px, the bottom ~450 px and the right edge, so
all key text sits between y≈200 and y≈1450.
