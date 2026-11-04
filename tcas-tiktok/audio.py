"""Synthesize the tense music bed + sound effects and mix them under the voice.

Usage: python audio.py <builddir>   (reads voice.wav, timeline.json, sfx.json; writes mix.wav)
Everything is generated procedurally, so it is royalty-free.
"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

B = Path(sys.argv[1]); SR = 48000
rng = np.random.default_rng(11)
tl = json.loads((B / "timeline.json").read_text())
sfx = json.loads((B / "sfx.json").read_text())
v24, vsr = sf.read(B / "voice.wav", dtype="float32")
voice = resample_poly(v24, 2, 1).astype(np.float32)
N = int(tl["duration"] * SR) + SR // 2
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
sc = {s["id"]: s for s in tl["scenes"]}
T = np.arange(N) / SR


def filt(x, kind, f, order=2): return sosfilt(butter(order, f, btype=kind, fs=SR, output="sos"), x)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
def put(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    if i < 0: x, i = x[-i:], 0
    x = x[: len(buf) - i]; buf[i:i + len(x)] += g * x
def ramp(t0, t1, a, b):
    """piecewise-linear automation curve over the whole timeline"""
    return np.interp(T, [0, t0, t1, T[-1] + 1], [a, a, b, b])
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
def saw(f, n): return 2 * ((np.arange(n) / SR * f) % 1) - 1

t_close = sc["hook"]["phrases"][2]["s"]
t_ta, t_ra = sc["ta"]["start"], sc["ra"]["start"]
t_uber, t_clear, t_cta = sc["uber"]["start"], sc["clear"]["start"], sc["cta"]["start"]
t_rule = sc["rule"]["start"]
END = tl["duration"]

# --- drone (A minor), swelling with tension, dark in the Überlingen part
drone = sum(filt(saw(NOTE(m), N), "lowpass", 260) for m in (33, 40, 45)) / 3
drone *= ramp(0, 1.5, .2, .55) * np.where(T < t_clear, 1, np.exp(-(T - t_clear) * 2.5))
# --- pulsing 8th-note bass ostinato, filter opens as the danger rises
BPM = 120; beat = 60 / BPM
bass = np.zeros(N); t = .25
pattern = [45, 45, 57, 45, 45, 55, 45, 52]
k = 0
while t < t_clear:
    n = int(beat / 2 * .8 * SR)
    put(bass, saw(NOTE(pattern[k % 8] - 12), n) * env(n, .003, .09), t); t += beat / 2; k += 1
cut = np.interp(T, [0, t_ta, t_ra + 2, t_uber, t_clear], [350, 900, 2200, 500, 300])
# time-varying low-pass, block-wise
bass_f = np.zeros(N); blk = 2400
for i in range(0, N, blk):
    bass_f[i:i + blk] = filt(bass[max(0, i - 4800):i + blk], "lowpass", float(cut[i]))[-len(bass[i:i + blk]):]
bass_f *= np.where((T > t_uber) & (T < t_clear), .45, 1)
# --- drums: kick from "closing", 16th hats during TA/RA, out for Überlingen
drums = np.zeros(N)
def kick():
    n = int(.4 * SR); t_ = np.arange(n) / SR; f = 42 + 120 * np.exp(-t_ * 30)
    return np.tanh(1.8 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .15))
def hat(d=.04): n = int(d * SR); return filt(rng.standard_normal(n), "highpass", 7500) * env(n, .0005, d / 4)
def snare(): n = int(.22 * SR); return .7 * filt(rng.standard_normal(n), "bandpass", [1000, 6000]) * env(n, .001, .06)
K = kick(); t = t_close; i = 0
while t < t_uber - .1:
    put(drums, K, t, .9)
    if i % 2: put(drums, snare(), t, .4)
    sub = 4 if t_ta <= t < t_rule else 2
    for e in range(sub): put(drums, hat(), t + e * beat / sub, .16 if e else .22)
    t += beat; i += 1
# --- calm resolution pad (A major) for "clear of conflict" and the outro
pad = np.zeros(N); n = int((END - t_clear + .5) * SR)
chord = sum(saw(NOTE(m), n) for m in (57, 61, 64, 69)) / 4
chord = filt(chord, "lowpass", 1600) * np.minimum(1, np.arange(n) / (.6 * SR))
put(pad, chord, t_clear, .55)
# --- jet ambience (brown-ish noise)
amb = filt(np.cumsum(rng.standard_normal(N)) * .02, "bandpass", [40, 500]); amb /= np.abs(amb).max()
amb *= np.where((T > t_uber) & (T < t_clear), .35, 1) * .18

music = .32 * drone + .5 * bass_f + .55 * drums + .35 * pad
music *= np.where(T > END - 1.2, np.clip((END - T) / 1.2, 0, 1), 1)

# --- sound effects
fx = np.zeros(N)
def whoosh(d=.34):
    n = int(d * SR); nz = rng.standard_normal(n); out = np.zeros(n); seg = int(.01 * SR)
    for s in range(0, n, seg):
        fc = 300 * (14 ** (s / n)); out[s:s + seg] = sosfilt(butter(2, [fc * .7, min(fc * 1.6, SR / 2 - 100)], btype="bandpass", fs=SR, output="sos"), nz[s:s + seg])
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2
def impact(a=1.0):
    n = int(.7 * SR); t_ = np.arange(n) / SR; f = 30 + 70 * np.exp(-t_ * 14)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .22)
    return np.tanh(2.2 * (body + .5 * filt(rng.standard_normal(n), "lowpass", 2500) * env(n, .0005, .04))) * a
def ping():
    n = int(1.4 * SR); t_ = np.arange(n) / SR
    x = np.sin(2 * np.pi * 1450 * t_) * env(n, .002, .18) + .4 * np.sin(2 * np.pi * 2900 * t_) * env(n, .002, .06)
    out = x.copy(); d = int(.28 * SR); out[d:] += .35 * x[:-d]; return out
def blip(f0=900, f1=520, d=.07):
    n = int(d * SR); t_ = np.arange(n) / SR; f = f0 + (f1 - f0) * t_ / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, d / 3)
def alarm():
    out = np.zeros(int(.5 * SR))
    for k_, f in enumerate((988, 784)):
        n = int(.16 * SR); x = np.sign(np.sin(2 * np.pi * f * np.arange(n) / SR)) * .5
        put(out, filt(x, "lowpass", 3000) * np.minimum(1, (n - np.arange(n)) / 400), k_ * .19)
    return out
def flyby(d=2.2):
    n = int(d * SR); t_ = np.arange(n) / SR; c = d * .45
    f = 260 + 220 * np.tanh(-(t_ - c) * 4)            # doppler drop
    tone = saw(1, n) * 0; tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    roar = filt(rng.standard_normal(n), "bandpass", [200, 4000])
    shape = np.exp(-((t_ - c) / .45) ** 2)
    return (0.6 * roar + 0.35 * tone) * shape
def chime():
    out = np.zeros(int(1.8 * SR))
    for k_, m in enumerate((69, 73, 76, 81)):
        n = int(1.3 * SR); t_ = np.arange(n) / SR; f = NOTE(m + 12)
        put(out, (np.sin(2 * np.pi * f * t_) + .3 * np.sin(2 * np.pi * 2.01 * f * t_)) * env(n, .003, .5), k_ * .08)
    return out
def sub():
    n = int(3.0 * SR); t_ = np.arange(n) / SR
    return np.sin(2 * np.pi * (38 + 10 * np.exp(-t_ * 3)) * t_) * env(n, .01, .9)
def tick(): n = int(.03 * SR); return np.sin(2 * np.pi * 2200 * np.arange(n) / SR) * env(n, .0005, .006)

for e in sfx:
    t_, ty = e["t"], e["type"]
    if ty == "whoosh": put(fx, whoosh(), t_ - .15, .3)
    elif ty == "impact": put(fx, impact(), t_, .5 * e.get("a", 1))
    elif ty == "pop": put(fx, blip(), t_, .16)
    elif ty == "ping": put(fx, ping(), t_, .22)
    elif ty == "alarm": put(fx, alarm(), t_ - .35, .18)
    elif ty == "flyby": put(fx, flyby(), t_ - 1.0, .9)
    elif ty == "chime": put(fx, chime(), t_, .3)
    elif ty == "sub": put(fx, sub(), t_, .6)
    elif ty == "tick": put(fx, tick(), t_, .25)

# --- mix with ducking under the voice
a = np.abs(voice); blk = 240
lv = a[: N // blk * blk].reshape(-1, blk).max(axis=1); eb = np.zeros_like(lv); cur = 0.0
ab, rb = np.exp(-blk / (.01 * SR)), np.exp(-blk / (.25 * SR))
for j, v in enumerate(lv):
    cur = ab * cur + (1 - ab) * v if v > cur else rb * cur + (1 - rb) * v; eb[j] = cur
envv = np.zeros(N); envv[: len(eb) * blk] = np.repeat(eb, blk)
duck = 1 - .5 * np.clip(envv / .08, 0, 1)
mix = voice + (music * .3 + amb) * duck + fx * .45
mix = np.tanh(mix * 1.1) / 1.1
mix /= np.abs(mix).max() / .89
sf.write(B / "mix.wav", mix.astype(np.float32), SR)
r = lambda x: round(20 * np.log10(np.sqrt((x[5 * SR:40 * SR] ** 2).mean()) + 1e-9), 1)
print("mix written", round(len(mix) / SR, 2), "s | voice", r(voice), "music", r((music * .3 + amb) * duck), "fx", r(fx * .45))
