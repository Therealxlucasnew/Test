"""Generate the voiceover with Kokoro TTS and write timeline.json.

Each phrase is synthesized separately so phrase boundaries are exact;
word timings inside a phrase are interpolated by word length.
Usage: python tts.py <model.onnx> <voices.bin> <outdir>
"""
import json, re, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

model, voices, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
here = Path(__file__).parent
script = json.loads((here / "script.json").read_text())

VOICE, SPEED, SR = "am_michael", 1.18, 24000
PHRASE_GAP, SCENE_GAP, LEAD_IN = 0.09, 0.14, 0.25
kokoro = Kokoro(model, voices)

audio = [np.zeros(int(LEAD_IN * SR), np.float32)]
t = LEAD_IN
timeline = []
for scene in script:
    sc = {"id": scene["id"], "start": t, "phrases": []}
    for i, ph in enumerate(scene["phrases"]):
        # a phrase is either plain text or {"say": spoken text, "show": caption text}
        text = ph["say"] if isinstance(ph, dict) else ph
        shown = ph["show"] if isinstance(ph, dict) else ph
        samples, sr = kokoro.create(text, voice=VOICE, speed=SPEED, lang="en-us", trim=False)
        assert sr == SR
        # trim silence ourselves: keep 10 ms before the first sound and 40 ms of tail,
        # so word endings are not clipped (Kokoro's built-in trim can cut them)
        idx = np.where(np.abs(samples) > 0.012)[0]
        samples = samples[max(idx[0] - 240, 0): min(idx[-1] + 960, len(samples))]
        dur = len(samples) / SR
        words = shown.split()
        weights = [len(re.sub(r"[^\w]", "", w)) + 1.5 for w in words]
        # numerals are spoken much longer than they are written ("149" = "one hundred and forty-nine")
        weights = [wgt * 3 if re.search(r"\d", w) else wgt for w, wgt in zip(words, weights)]
        total = sum(weights)
        wt, acc = [], t + 0.04
        for w, wgt in zip(words, weights):
            d = (dur - 0.08) * wgt / total
            wt.append({"w": w, "s": round(acc, 3), "e": round(acc + d, 3)})
            acc += d
        sc["phrases"].append({"text": shown, "s": round(t, 3), "e": round(t + dur, 3), "words": wt})
        audio.append(samples.astype(np.float32))
        t += dur
        gap = PHRASE_GAP if i < len(scene["phrases"]) - 1 else SCENE_GAP
        audio.append(np.zeros(int(gap * SR), np.float32))
        t += gap
    sc["end"] = t
    timeline.append(sc)

tail = 1.4  # let the CTA breathe at the end
audio.append(np.zeros(int(tail * SR), np.float32))
total = t + tail
v = np.concatenate(audio)
sf.write(out / "voice.wav", v / np.abs(v).max() * 0.95, SR)
(out / "timeline.json").write_text(json.dumps({"duration": round(total, 3), "scenes": timeline}, indent=1))
print(f"duration {total:.2f}s")
for s in timeline:
    print(f'{s["id"]:10s} {s["start"]:6.2f} -> {s["end"]:6.2f}')
