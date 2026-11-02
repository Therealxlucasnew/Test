"""Synthesize the music bed + sound effects and mix them under the voiceover.

Usage: python audio.py <builddir>
Reads voice.wav, timeline.json and sfx.json from <builddir>; writes mix.wav.
Everything is generated procedurally (no samples), so it is royalty-free.
"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

B = Path(sys.argv[1])
SR = 48000
rng = np.random.default_rng(7)
tl = json.loads((B / "timeline.json").read_text())
sfx = json.loads((B / "sfx.json").read_text())
voice24, vsr = sf.read(B / "voice.wav", dtype="float32")
voice = resample_poly(voice24, SR // 8000, vsr // 8000).astype(np.float32)
N = int(tl["duration"] * SR) + SR // 2
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]

scene = {s["id"]: s for s in tl["scenes"]}
t_drop = scene["hook"]["phrases"][1]["s"]            # "For four months" slam
t_explode = next(w["s"] for w in scene["premiere"]["phrases"][1]["words"] if "explod" in w["w"])
t_break = scene["cta"]["phrases"][3]["s"]             # "What's your opinion?"
t_end = tl["duration"]


def filt(x, kind, f, order=2):
    sos = butter(order, f, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x)


def env(n, a, d):
    """attack/decay envelope in seconds"""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e


def put(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    x = x[: len(buf) - i]
    buf[i : i + len(x)] += g * x


# ---------------- instruments ----------------
def kick():
    n = int(.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env(n, .002, .16)
    click = filt(rng.standard_normal(n), "highpass", 3000) * env(n, .0005, .004) * .3
    return np.tanh(1.6 * (x + click))


def snare():
    n = int(.25 * SR)
    nz = filt(rng.standard_normal(n), "bandpass", [900, 6000]) * env(n, .001, .07)
    tone = np.sin(2 * np.pi * 190 * np.arange(n) / SR) * env(n, .001, .05)
    return .7 * nz + .5 * tone


def hat(open_=False):
    n = int((.18 if open_ else .05) * SR)
    return filt(rng.standard_normal(n), "highpass", 7000) * env(n, .0005, .06 if open_ else .012)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    return 2 * ((t * f) % 1) - 1


NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
# A minor: Am - F - C - G  (root midi notes + triads)
PROG = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]
BPM = 124
beat = 60 / BPM
bar = 4 * beat


def bass_note(m, dur):
    n = int(dur * SR)
    x = saw(NOTE(m), n) + .5 * np.sin(2 * np.pi * NOTE(m) * np.arange(n) / SR)
    x = filt(x, "lowpass", 420) * env(n, .004, dur * .6)
    return np.tanh(2 * x) * .6


def pad_chord(notes, dur):
    n = int(dur * SR)
    x = sum(saw(NOTE(m), n, d) for m in notes for d in (-.004, .004)) / (2 * len(notes))
    x = filt(x, "lowpass", 1400)
    a = np.minimum(1, np.arange(n) / (.25 * SR)) * np.minimum(1, (n - np.arange(n)) / (.25 * SR))
    return x * a


drums = np.zeros(N); bass = np.zeros(N); pad = np.zeros(N)
K, Sn, H, HO = kick(), snare(), hat(), hat(True)

# pad + bass follow the progression from the start
t = 0.0; k = 0
while t < t_end + bar:
    root, chord = PROG[k % 4]
    put(pad, pad_chord(chord, bar + .05), t)
    k += 1; t += bar

# beat starts on the drop, aligned so a downbeat lands on t_drop
t = t_drop; i = 0
while t < t_end - .2:
    in_break = t_break - .05 <= t < t_end - .9
    b = i % 4
    bar_idx = int((t - t_drop) // bar)
    root = PROG[(bar_idx + int(t_drop // bar)) % 4][0]
    if not in_break:
        put(drums, K, t, 1.0)
        if b in (1, 3):
            put(drums, Sn, t, .55)
        for e in (0, .5):
            put(drums, HO if e and b == 3 else H, t + e * beat, .35 if e else .18)
        for e in (0, .5):
            put(bass, bass_note(root + (12 if e and b % 2 else 0), beat * .48), t + e * beat)
    i += 1; t += beat

# intro: filtered pad + ticking hats before the drop
t = 0.25
while t < t_drop - .05:
    put(drums, H, t, .12); t += beat / 2

music = .55 * drums + .5 * bass + .35 * pad
# low-pass the intro (opens up at the drop)
intro = int(t_drop * SR)
music[:intro] = filt(music[:intro], "lowpass", 700)
# outro: everything but pad drops out on the CTA, final hit at the end
music[int(t_break * SR):] *= np.linspace(1, .55, N - int(t_break * SR))

# ---------------- sound effects ----------------
fx = np.zeros(N)


def whoosh(d=.32):
    n = int(d * SR); nz = rng.standard_normal(n); out = np.zeros(n)
    seg = int(.01 * SR); zi = None
    for s in range(0, n, seg):
        p = s / n
        fc = 400 * (12 ** p)
        sos = butter(2, [fc * .7, min(fc * 1.6, SR / 2 - 100)], btype="bandpass", fs=SR, output="sos")
        out[s:s + seg] = sosfilt(sos, nz[s:s + seg])
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return out * shape


def impact(a=1.0):
    n = int(.7 * SR); t = np.arange(n) / SR
    f = 32 + 70 * np.exp(-t * 14)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .22)
    crack = filt(rng.standard_normal(n), "lowpass", 2500) * env(n, .0005, .04)
    return np.tanh(2.2 * (body + .5 * crack)) * a


def boom():
    n = int(2.2 * SR)
    tail = filt(rng.standard_normal(n), "lowpass", 500) * env(n, .002, .7)
    return np.pad(impact(1.2), (0, n - int(.7 * SR))) * 1.1 + .6 * tail


def riser(d):
    n = int(d * SR); nz = rng.standard_normal(n); out = np.zeros(n); seg = int(.01 * SR)
    for s in range(0, n, seg):
        fc = 300 * (25 ** (s / n))
        sos = butter(2, [fc * .8, min(fc * 1.3, SR / 2 - 100)], btype="bandpass", fs=SR, output="sos")
        out[s:s + seg] = sosfilt(sos, nz[s:s + seg])
    return out * np.linspace(0, 1, n) ** 2


def blip(f0=900, f1=520, d=.07):
    n = int(d * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, d / 3)


def tick():
    n = int(.02 * SR)
    return np.sin(2 * np.pi * 2600 * np.arange(n) / SR) * env(n, .0005, .004)


def clack():
    n = int(.12 * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1150 * t) + .6 * np.sin(2 * np.pi * 2370 * t)) * env(n, .0005, .025)
    return x + filt(rng.standard_normal(n), "highpass", 2000) * env(n, .0005, .01)


def beep():
    n = int(.14 * SR)
    return np.sin(2 * np.pi * 1000 * np.arange(n) / SR) * np.minimum(1, (n - np.arange(n)) / 300) * np.minimum(1, np.arange(n) / 300)


def chime():
    """dreamy bell arpeggio (A major add9)"""
    out = np.zeros(int(1.6 * SR))
    for k, m in enumerate([81, 85, 88, 93, 95]):
        n = int(1.2 * SR); t = np.arange(n) / SR; f = NOTE(m)
        x = (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2.01 * f * t)) * env(n, .003, .45)
        put(out, x, k * .07)
    return out


def crackle(d=1.4):
    """debris / firework crackle: sparse random clicks that thin out"""
    n = int(d * SR); out = np.zeros(n)
    for k in range(140):
        u = rng.random() ** 2.2  # dense at the start
        i = int(u * (n - 400))
        c = filt(rng.standard_normal(300), "highpass", 2500) * env(300, .0003, .002) * (1 - u)
        out[i:i + 300] += c
    return out


def glitch():
    n = int(.3 * SR); x = rng.standard_normal(n)
    x = np.repeat(x[::40], 40)[:n]  # sample-and-hold "bitcrush"
    gate = (np.floor(np.arange(n) / (.03 * SR)) % 2 == 0).astype(float)
    return filt(x, "bandpass", [400, 5000]) * gate * env(n, .001, .12)


for e in sfx:
    t, ty = e["t"], e["type"]
    if ty == "whoosh": put(fx, whoosh(), t - .15, .32)
    elif ty == "impact": put(fx, impact(), t, .55 * e.get("a", 1))
    elif ty == "boom": put(fx, boom(), t, .5)
    elif ty == "pop": put(fx, blip(), t, .18)
    elif ty == "tick": put(fx, tick(), t, .12)
    elif ty == "clap": put(fx, clack(), t, .7)
    elif ty == "rec": put(fx, beep(), t, .16)
    elif ty == "glitch": put(fx, glitch(), t, .25)
    elif ty == "crackle": put(fx, crackle(), t, .5)
    elif ty == "chime": put(fx, chime(), t - .05, .35)

put(fx, riser(t_explode - scene["premiere"]["start"]), scene["premiere"]["start"], .22)
put(fx, impact(1.2), t_end - 1.0, .35)

# ---------------- mix with ducking ----------------
a = np.abs(voice)
envv = np.zeros(N); att, rel = np.exp(-1 / (.01 * SR)), np.exp(-1 / (.25 * SR))
# envelope follower (vectorised in blocks for speed)
blk = 240
lv = a[: N // blk * blk].reshape(-1, blk).max(axis=1)
e_b = np.zeros_like(lv); cur = 0.0
ab, rb = att ** blk, rel ** blk
for j, v in enumerate(lv):
    cur = ab * cur + (1 - ab) * v if v > cur else rb * cur + (1 - rb) * v
    e_b[j] = cur
envv[: len(e_b) * blk] = np.repeat(e_b, blk)
duck = 1 - .5 * np.clip(envv / .08, 0, 1)

mix = voice * 1.0 + music * .27 * duck + fx * .4
mix = np.tanh(mix * 1.1) / 1.1
mix /= max(1e-6, np.abs(mix).max()) / .89
sf.write(B / "mix.wav", mix.astype(np.float32), SR)
print("mix written", len(mix) / SR, "s")
