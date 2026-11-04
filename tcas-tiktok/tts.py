"""Generate the voiceover with Kokoro TTS and write timeline.json.

Each phrase is synthesized separately so phrase boundaries are exact; word
timings inside a phrase are interpolated by word length. A phrase is plain
text or a dict:
  {"say": spoken text, "show": caption text, "voice": ..., "speed": ...,
   "fx": "radio", "callout": true}
Callouts (the cockpit voice) are radio-filtered and flagged in the timeline.
Usage: python tts.py <model.onnx> <voices.bin> <outdir>
"""
import json, re, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt
from kokoro_onnx import Kokoro

model, voices, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
script = json.loads((Path(__file__).parent / "script.json").read_text())

VOICE, SPEED, SR = "af_heart", 1.2, 24000
PHRASE_GAP, SCENE_GAP, LEAD_IN, CALLOUT_PAD = 0.09, 0.14, 0.25, 0.22
kokoro = Kokoro(model, voices)
rng = np.random.default_rng(3)


def radio(x):
    """cockpit/aural-warning style: band-limited, a little gritty, with hiss"""
    x = sosfilt(butter(4, [350, 3200], btype="bandpass", fs=SR, output="sos"), x)
    x = np.tanh(x * 3.0) / np.tanh(3.0)
    hiss = sosfilt(butter(2, [1500, 6000], btype="bandpass", fs=SR, output="sos"), rng.standard_normal(len(x))) * 0.012
    return (x + hiss).astype(np.float32)


audio = [np.zeros(int(LEAD_IN * SR), np.float32)]
t = LEAD_IN
timeline = []
for scene in script:
    sc = {"id": scene["id"], "start": t, "phrases": []}
    for i, ph in enumerate(scene["phrases"]):
        d = ph if isinstance(ph, dict) else {"say": ph}
        text, shown = d["say"], d.get("show", d["say"])
        callout = d.get("callout", False)
        if callout:  # breathe before the cockpit voice
            audio.append(np.zeros(int(CALLOUT_PAD * SR), np.float32)); t += CALLOUT_PAD
        samples, sr = kokoro.create(text, voice=d.get("voice", VOICE), speed=d.get("speed", SPEED), lang="en-us", trim=False)
        assert sr == SR
        # trim silence ourselves: 10 ms lead, 40 ms tail so word endings survive
        idx = np.where(np.abs(samples) > 0.012)[0]
        samples = samples[max(idx[0] - 240, 0): min(idx[-1] + 960, len(samples))]
        samples = samples / np.abs(samples).max() * 0.9
        if d.get("fx") == "radio":
            samples = radio(samples) * 0.95
        dur = len(samples) / SR
        words = shown.split(" ")
        weights = [len(re.sub(r"[^\w]", "", w)) + 1.5 for w in words]
        weights = [wgt * 3 if re.search(r"\d", w) else wgt for w, wgt in zip(words, weights)]
        total = sum(weights)
        wt, acc = [], t + 0.03
        for w, wgt in zip(words, weights):
            dd = (dur - 0.06) * wgt / total
            wt.append({"w": w, "s": round(acc, 3), "e": round(acc + dd, 3)})
            acc += dd
        sc["phrases"].append({"text": shown, "s": round(t, 3), "e": round(t + dur, 3), "words": wt, "callout": callout})
        audio.append(samples.astype(np.float32))
        t += dur
        gap = PHRASE_GAP if i < len(scene["phrases"]) - 1 else SCENE_GAP
        if callout:
            gap += 0.25
        audio.append(np.zeros(int(gap * SR), np.float32))
        t += gap
    sc["end"] = t
    timeline.append(sc)

tail = 1.6
audio.append(np.zeros(int(tail * SR), np.float32))
total = t + tail
v = np.concatenate(audio)
sf.write(out / "voice.wav", v / np.abs(v).max() * 0.95, SR)
(out / "timeline.json").write_text(json.dumps({"duration": round(total, 3), "scenes": timeline}, indent=1))
print(f"duration {total:.2f}s")
for s in timeline:
    print(f'{s["id"]:8s} {s["start"]:6.2f} -> {s["end"]:6.2f}')
