"""Procedural sound design + score for the hole video. Writes soundtrack.wav (48 kHz stereo).
Every cue is timed against src/timeline.js."""
import numpy as np, wave

SR = 48000
DUR = 42.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

dry = np.zeros((N, 2))
wet = np.zeros((N, 2))  # reverb send
music = np.zeros((N, 2))

# ---- timeline anchors (keep in sync with timeline.js) ----
CLIMB_END = 28.95 + 4 * 0.62 + 6 * 0.44
T_GRAB = CLIMB_END + 0.4
T_OVER = T_GRAB + 0.38
T_DOWN = T_OVER + 0.45


def tt(d):
    return np.arange(int(round(d * SR))) / SR


def noise(d):
    return rng.standard_normal(int(round(d * SR)))


def band(x, lo=None, hi=None, order=2):
    """Zero-phase FFT band filter with smooth (butterworth-like) skirts."""
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(x)
    g = np.ones_like(f)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * g, n)


def env(d, a=0.005, decay=0.2, hold=0.0):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4))
    e *= np.where(t < a + hold, 1, np.exp(-(t - a - hold) / decay))
    return e


def place(buf, sig, t0, gain=1.0, pan=0.0, send=0.0):
    i = int(t0 * SR)
    if i < 0:
        sig = sig[-i:]
        i = 0
    if i >= N or len(sig) == 0:
        return
    s = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(s), 0] += s * l * 1.414
    buf[i : i + len(s), 1] += s * r * 1.414
    if send:
        wet[i : i + len(s), 0] += s * l * send
        wet[i : i + len(s), 1] += s * r * send


def norm(x):
    m = np.max(np.abs(x))
    return x / m if m > 0 else x


def saw(freq, d, detune=0.0):
    t = tt(d)
    ph = (freq * (1 + detune)) * t
    return 2 * (ph - np.floor(ph + 0.5))


def sweep_sine(f0, f1, d, curve=3.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * curve)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ================= SFX library =================
def boom(d=1.2, f0=90, f1=32, gain=1.0):
    s = sweep_sine(f0, f1, d, 6) * env(d, 0.002, d * 0.35)
    s += band(noise(d), None, 300) * env(d, 0.001, 0.12) * 0.8
    return s * gain


def thud(d=0.35):
    s = sweep_sine(140, 50, d, 18) * env(d, 0.001, 0.08)
    s += band(noise(d), 80, 900) * env(d, 0.001, 0.05) * 0.6
    return s


def debris(d=1.2, density=40, bright=3000):
    s = np.zeros(int(round(d * SR)))
    for _ in range(int(density * d)):
        i = int(rng.random() ** 1.6 * max(1, len(s) - 2000))
        L = int(SR * (0.004 + rng.random() * 0.012))
        s[i : i + L] += band(noise(L / SR), 600, bright) * env(L / SR, 0.0005, 0.004) * (0.3 + rng.random())
    return s * np.exp(-tt(d) / (d * 0.5))


def crunch():  # leaf footstep
    d = 0.16
    s = band(noise(d), 1200, 7000) * env(d, 0.002, 0.03)
    s += debris(d, 120, 6000) * 0.5
    s += sweep_sine(120, 60, d, 30) * env(d, 0.001, 0.03) * 0.5
    return s


def whoosh(d=0.35, lo=800, hi=6000, peak=0.6):
    t = tt(d)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    e = e * np.where(t / d < peak, (t / d / peak) ** 1.5, 1)
    return band(noise(d), lo, hi) * e


def crack():
    d = 0.09
    s = band(noise(d), 1500, 9000) * env(d, 0.0003, 0.012)
    s += band(noise(d), 300, 2000) * env(d, 0.0005, 0.03) * 0.7
    return s


def buzzer():  # "wah wah" fail
    out = []
    for f, d in [(233, 0.22), (175, 0.42)]:
        s = saw(f, d) + 0.5 * saw(f * 1.01, d)
        s = band(s, 80, 1800) * env(d, 0.01, d * 0.6, d * 0.3)
        out.append(s)
    return np.concatenate(out)


def growl(d=2.6, base=48, rough=11):
    t = tt(d)
    jitter = np.cumsum(rng.standard_normal(len(t))) / SR * 30
    am = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * (rough + 3 * np.sin(t * 1.7)) * t + jitter))
    s = band(noise(d), 40, 420, 3) * am * 1.6
    s += np.sin(2 * np.pi * np.cumsum(base + 6 * np.sin(t * 3.1) + jitter * 0.5) / SR) * am * 0.8
    s += band(saw(base * 2, d), 60, 500) * am * 0.4
    e = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8)
    return s * np.clip(e, 0, 1)


def hiss(d=1.0):
    t = tt(d)
    s = band(noise(d), 2500, 9000) * env(d, 0.03, 0.35, 0.1)
    s += growl(d, 70, 22) * 0.7
    s += band(saw(310, d) + saw(317, d), 400, 3000) * env(d, 0.02, 0.25) * 0.25
    return s


def screech(d=0.9):
    t = tt(d)
    f = 1500 * np.exp(-t * 1.2) + 500
    s = np.sin(2 * np.pi * np.cumsum(f + 60 * np.sin(t * 90)) / SR)
    s = np.sign(s) * np.abs(s) ** 0.4  # harsh
    s = band(s, 300, 5000) * env(d, 0.01, 0.3, 0.15)
    s += band(noise(d), 2000, 8000) * env(d, 0.005, 0.2) * 0.5
    return s + growl(d, 90, 30) * 0.6


def heartbeat():
    d = 0.5
    one = lambda: sweep_sine(70, 40, 0.16, 25) * env(0.16, 0.002, 0.05)
    s = np.zeros(int(round(d * SR)))
    a = one(); s[: len(a)] += a
    b = one() * 0.75; i = int(0.24 * SR); s[i : i + len(b)] += b
    return band(s, 20, 180)


def breath(d=0.55, inhale=True):
    t = tt(d)
    e = np.sin(np.pi * t / d) ** (1.5 if inhale else 0.8)
    return band(noise(d), 400 if inhale else 250, 2600) * e


def click(d=0.01):
    return band(noise(d), 2000, 12000) * env(d, 0.0002, 0.002)


def tone(f, d, a=0.005, r=0.02):
    t = tt(d)
    e = np.minimum(1, t / a) * np.minimum(1, (d - t) / r)
    return np.sin(2 * np.pi * f * t) * np.clip(e, 0, 1)


def strings_cluster(freqs, d, swell=1.0, trem=7):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t)) for f in freqs)
    s += sum(band(saw(f, d, 0.003), 100, 2500) * 0.3 for f in freqs)
    tr = 0.75 + 0.25 * np.sin(2 * np.pi * trem * t)
    e = np.clip(t / swell, 0, 1) ** 2 * np.clip((d - t) / 0.3, 0, 1)
    return s * tr * e / len(freqs)


def braam(d=2.5, f=55):
    t = tt(d)
    s = sum(saw(f * m, d, dt) for m, dt in [(1, 0), (1, 0.006), (2, -0.004), (1.5, 0.003), (0.5, 0)])
    cutoff_env = np.exp(-t / 0.7)
    lo = band(s, 30, 300)
    hi = band(s, 300, 2400)
    out = lo + hi * cutoff_env
    return out * env(d, 0.03, d * 0.45, 0.2) / 3


def riser(d=2.0):
    t = tt(d)
    e = (t / d) ** 2.2
    s = band(noise(d), 1500, 12000) * e * 0.6
    f = 200 * (8 ** (t / d))
    s += np.sin(2 * np.pi * np.cumsum(f) / SR) * e * 0.3
    return s


def reverse_cymbal(d=0.6):
    s = band(noise(d), 3000, 14000) * (tt(d) / d) ** 3
    return s


# ================= AMBIENCE =================
# forest night: wind + crickets (surface) — before the fall, and after the escape
def forest(d):
    t = tt(d)
    w = band(noise(d), 120, 700) * (0.6 + 0.4 * np.sin(t * 0.7)) * 0.25
    c = np.zeros_like(t)
    for k in range(int(d * 2.2)):
        st = rng.random() * (d - 0.4)
        f = 4200 + rng.random() * 900
        L = 0.18
        tc = tt(L)
        chirp = np.sin(2 * np.pi * f * tc) * (np.sin(2 * np.pi * 28 * tc) > 0.2) * np.sin(np.pi * tc / L)
        i = int(st * SR)
        c[i : i + len(chirp)] += chirp * (0.03 + rng.random() * 0.04)
    return w + c


place(dry, forest(2.0) * np.clip((2.0 - tt(2.0)) / 0.4, 0, 1), 0.0, 0.9)
place(dry, forest(DUR - T_GRAB) * np.clip(tt(DUR - T_GRAB) / 0.5, 0, 1), T_GRAB, 0.75)

# hole room tone (deep, hollow)
d = T_GRAB - 1.7
rt = band(noise(d), 50, 260) * (0.7 + 0.3 * np.sin(tt(d) * 0.4)) * 0.22
rt *= np.clip(tt(d) / 0.8, 0, 1) * np.clip((d - tt(d)) / 0.5, 0, 1)
place(dry, rt, 1.7, 1.0)
# ending: the hole hums
place(dry, band(noise(DUR - 36.6), 40, 200) * 0.25, 36.6)

# ================= HOOK =================
place(dry, boom(1.4, 85, 28), 0.0, 0.7, 0, 0.4)
place(music, braam(1.4, 36.7), 0.0, 0.5)
for k, ts in enumerate([0.08, 0.55, 1.03]):
    place(dry, crunch(), ts, 0.5, -0.2 + 0.4 * (k % 2))
place(dry, crunch(), 1.4, 0.55)
# suspense tick (low pulse) under the hook
for k in range(3):
    place(music, heartbeat(), 0.1 + k * 0.5, 0.35)
place(music, strings_cluster([220, 233.1, 329.6], 1.5, 1.2), 0.0, 0.35)
# creak + crack
c = sum(crack() * 0.0 for _ in range(1))
for k in range(9):
    place(dry, crack(), 1.45 + k * 0.022 + rng.random() * 0.01, 0.35 + rng.random() * 0.3, rng.random() - 0.5, 0.3)
creak = band(saw(70, 0.3) * (1 + 0.5 * np.sin(2 * np.pi * 13 * tt(0.3))), 100, 1500) * env(0.3, 0.02, 0.1)
place(dry, creak, 1.46, 0.35)
# break + crumble
place(dry, band(noise(1.0), 100, 2500) * env(1.0, 0.003, 0.25), 1.7, 0.7, 0, 0.3)
place(dry, debris(1.6, 60), 1.72, 0.6, 0.2, 0.4)
place(dry, boom(0.6, 70, 40), 1.7, 0.4)
# fall whoosh (rising)
d = 1.15
t = tt(d)
w = band(noise(d), 150, 1200) * (t / d) ** 2 + band(noise(d), 800, 5000) * (t / d) ** 3 * 0.6
place(dry, w, 1.7, 0.9, 0, 0.4)
# "AAH" — a quick vocal-ish yelp falling away (formant-filtered buzz)
d = 0.9
t = tt(d)
f0 = 420 * np.exp(-t * 0.5)
buzz = saw(1, d)  # placeholder shape
ph = np.cumsum(f0) / SR
buzz = 2 * (ph - np.floor(ph + 0.5))
voice = band(buzz, 600, 1100, 3) * 1.0 + band(buzz, 1500, 2600, 3) * 0.5
voice *= env(d, 0.03, 0.35, 0.2)
place(dry, voice, 1.72, 0.22, 0, 0.6)

# IMPACT 2.85
place(dry, boom(1.6, 95, 30), 2.85, 1.1, 0, 0.5)
place(dry, thud(0.4), 2.85, 0.9)
place(dry, debris(2.0, 50), 2.9, 0.7, 0.1, 0.4)
place(dry, reverse_cymbal(0.5), 2.35, 0.25)
# groan
d = 0.7
ph = np.cumsum(110 * (1 - 0.15 * tt(d))) / SR
g = 2 * (ph - np.floor(ph + 0.5))
groan = (band(g, 350, 700, 3) + band(g, 900, 1300, 3) * 0.4) * env(d, 0.08, 0.25, 0.25)
place(dry, groan, 3.85, 0.18, 0, 0.5)
place(dry, groan[::-1] * 0.6, 4.5, 0.12, 0, 0.5)
# getting up: dirt shuffles
for ts in [4.4, 4.75, 5.1, 5.3]:
    place(dry, band(noise(0.25), 500, 4000) * env(0.25, 0.02, 0.08), ts, 0.25, rng.random() - 0.5)

# ================= CAPTION POPS =================
caps = [(0.05, 0), (1.5, 1), (2.9, 1), (4.45, 0), (5.58, 0), (13.65, 0), (14.34, 1), (17.85, 1), (18.62, 0),
        (19.7, 1), (22.55, 0), (23.72, 1), (25.65, 1), (27.05, 0), (28.25, 1), (30.3, 1), (31.5, 0), (T_DOWN + 0.05, 1),
        (37.0, 0), (38.15, 1)]
for ts, slam in caps:
    place(dry, whoosh(0.18, 2500, 9000, 0.7), ts - 0.06, 0.12)
    if slam:
        place(dry, sweep_sine(110, 45, 0.3, 12) * env(0.3, 0.001, 0.09), ts, 0.45)
        place(dry, click(0.02), ts, 0.25)

# attempt badges: reverse cymbal into a hit
for ts in [6.45, 10.75, 16.8]:
    place(dry, reverse_cymbal(0.5), ts - 0.5, 0.35)
    place(dry, boom(0.8, 120, 45), ts, 0.55, 0, 0.3)
    place(dry, click(0.03), ts, 0.4)
# FAIL buzzers
for ts in [9.98, 15.5, 20.7]:
    place(dry, buzzer(), ts, 0.28)
    place(dry, thud(0.3), ts, 0.4)

# ================= ATTEMPT 1: JUMP =================
for take, land in [(6.89, 7.48), (8.12, 8.71), (9.29, 9.88)]:
    place(dry, band(noise(0.15), 300, 3000) * env(0.15, 0.005, 0.04), take, 0.3)
    place(dry, breath(0.3, False), take, 0.12, 0, 0.3)
    place(dry, thud(0.35), land, 0.75, 0, 0.3)
    place(dry, debris(0.4, 30), land, 0.3)
# heavy breathing while bent over
for k in range(3):
    place(dry, breath(0.35, k % 2 == 0), 10.0 + k * 0.32, 0.15, 0, 0.3)

# ================= ATTEMPT 2: CLIMB =================
for ts in [11.0, 11.15]:
    place(dry, crunch(), ts, 0.3)
place(dry, band(noise(0.2), 300, 2500) * env(0.2, 0.005, 0.05), 11.45, 0.3)
for ts in [11.68, 12.25, 12.75, 13.05, 13.3, 13.95]:
    sc = band(noise(0.3), 700, 3500) * env(0.3, 0.02, 0.1)
    place(dry, sc, ts, 0.35, 0.3, 0.2)
    place(dry, debris(0.6, 20), ts + 0.02, 0.25, 0.3, 0.2)
for ts in [12.3, 12.9, 13.6]:
    place(dry, breath(0.35, False), ts, 0.15, 0, 0.3)
# creak before the snap
cr = band(saw(55, 0.5) * (1 + np.sin(2 * np.pi * 21 * tt(0.5))), 150, 1800) * env(0.5, 0.1, 0.2)
place(dry, cr, 13.85, 0.3, 0.3, 0.3)
# SNAP
for k in range(5):
    place(dry, crack(), 14.32 + k * 0.012, 0.9 - k * 0.12, 0.3, 0.5)
place(dry, boom(0.5, 200, 70), 14.32, 0.4)
place(dry, debris(1.5, 70), 14.34, 0.7, 0.3, 0.5)
w = band(noise(0.7), 200, 2000) * (tt(0.7) / 0.7) ** 2
place(dry, w, 14.5, 0.7, 0, 0.3)
place(dry, boom(1.2, 90, 30), 15.2, 1.0, 0, 0.5)
place(dry, thud(0.4), 15.2, 0.8)
place(dry, debris(1.5, 40), 15.22, 0.6, 0, 0.3)
place(dry, groan, 15.55, 0.18, 0, 0.5)

# ================= ATTEMPT 3: PHONE =================
place(dry, band(noise(0.3), 800, 5000) * env(0.3, 0.05, 0.1), 16.95, 0.2)
place(dry, click(0.015), 17.15, 0.4)
place(dry, tone(1320, 0.06) * 0.5, 17.2, 0.2)
# special-information tones: "we're sorry, your call cannot be completed"
for f, ts, d in [(913.8, 17.75, 0.27), (1370.6, 18.03, 0.27), (1776.7, 18.31, 0.38)]:
    place(dry, tone(f, d), ts, 0.16)
for k in range(3):
    place(dry, tone(480, 0.25) + tone(620, 0.25), 18.75 + k * 0.5, 0.06)
# HELP!!! (shout echo)
for k, ts in enumerate([19.7, 20.1]):
    d = 0.55
    t = tt(d)
    f0 = 330 + 60 * np.sin(np.pi * t / d) - 40 * t
    ph = np.cumsum(f0) / SR
    g = 2 * (ph - np.floor(ph + 0.5))
    sh = band(g, 450, 900, 3) * 1.0 + band(g, 1600, 2400, 3) * 0.6 + band(noise(d), 2000, 6000) * 0.08
    sh *= env(d, 0.02, 0.18, 0.25)
    place(dry, sh, ts, 0.22 - 0.06 * k, 0, 0.9)
place(dry, boom(1.0, 80, 35), 19.7, 0.45, 0, 0.6)

# ================= MUSIC BED: attempts (2.9 – 21.2) =================
bpm = 92
beat = 60 / bpm
t0, t1 = 3.0, 21.15
nb = int((t1 - t0) / (beat / 2))
for k in range(nb):
    ts = t0 + k * beat / 2
    root = [36.71, 36.71, 43.65, 41.2][(k // 16) % 4]  # D1 D1 F1 E1
    d = beat / 2 * 0.9
    s = band(saw(root * 2, d) + saw(root * 2.005, d), 40, 380 + 250 * (k % 4 == 0)) * env(d, 0.004, 0.12)
    lvl = 0.22 if 5.5 < ts < 20.9 else 0.12
    place(music, s, ts, lvl)
    if k % 4 == 0:
        place(music, sweep_sine(120, 42, 0.3, 14) * env(0.3, 0.002, 0.12), ts, 0.4 if ts > 6.4 else 0.25)
    if k % 8 == 4 and ts > 6.4:
        place(music, band(noise(0.15), 1500, 7000) * env(0.15, 0.002, 0.05), ts, 0.12)
# tension pad over the attempts
place(music, strings_cluster([146.8, 155.6, 220.0], 18.0, 3.0, 5), 3.0, 0.3)

# ================= SCARY (21.2 – 27.0) =================
# lamp flicker: clicks + buzz
for ts in [21.6, 21.66, 21.76, 21.82, 21.9, 22.1]:
    place(dry, click(0.012), ts, 0.5)
    b = band(saw(120, 0.06), 100, 3000) * 0.5
    place(dry, b, ts, 0.15)
place(dry, thud(0.2) * 0.3, 21.88, 0.5)  # taps the lamp
place(dry, thud(0.2) * 0.3, 22.04, 0.5)
# growl #1 from the tunnel
place(dry, growl(2.6), 22.55, 0.9, -0.5, 0.7)
# heartbeat, accelerating
ts = 22.6
bpm_h = 70
while ts < 28.6:
    place(music, heartbeat(), ts, 0.75)
    bpm_h = min(118, bpm_h + 4)
    ts += 60 / bpm_h
# eyes open stinger
place(music, strings_cluster([392, 415.3, 587.3, 622.3], 2.2, 0.15, 11), 23.6, 0.55)
place(dry, boom(1.6, 70, 28), 23.62, 0.8, 0, 0.5)
place(dry, reverse_cymbal(0.7), 22.95, 0.3)
# close-up: low drone swell
place(music, strings_cluster([73.4, 77.8, 110], 2.0, 1.5, 3), 24.45, 0.6)
# lit tunnel: HISS + lunge along the floor
place(dry, hiss(1.2), 25.62, 0.8, -0.4, 0.6)
place(dry, boom(1.0, 120, 40), 25.62, 0.7, 0, 0.4)
place(dry, band(noise(0.4), 300, 3000) * env(0.4, 0.02, 0.12), 25.75, 0.4, -0.3)
place(dry, growl(1.3, 40, 8), 26.2, 0.6, -0.6, 0.6)
# backing away: scuffs + breathing
for k in range(4):
    place(dry, breath(0.25, k % 2 == 0), 26.2 + k * 0.22, 0.18, 0, 0.3)
place(dry, crunch(), 26.3, 0.3)

# ================= REALIZATION (27.0 – 28.6) =================
place(music, strings_cluster([293.7, 440, 587.3], 1.6, 0.8, 0), 27.0, 0.4)  # hopeful open fifth
place(dry, whoosh(0.4, 1500, 9000), 27.62, 0.25)
place(dry, tone(1760, 0.5) * env(0.5, 0.002, 0.15) + tone(2640, 0.5) * env(0.5, 0.002, 0.1) * 0.4, 27.72, 0.15)
place(dry, braam(1.6, 73.4), 28.25, 0.6, 0, 0.4)

# ================= CLIMB (28.6 – 34.85): driving percussion =================
def kick():
    return sweep_sine(160, 45, 0.35, 20) * env(0.35, 0.001, 0.1)


def snare():
    d = 0.2
    return band(noise(d), 1200, 8000) * env(d, 0.001, 0.05) + sweep_sine(220, 160, d, 30) * env(d, 0.001, 0.04) * 0.4


def tom(f):
    return sweep_sine(f * 1.6, f, 0.4, 10) * env(0.4, 0.001, 0.14)


ts = 28.6
k = 0
while ts < T_OVER - 0.02:
    u = (ts - 28.6) / (T_OVER - 28.6)
    bpm_c = 128 + 34 * u
    st = 60 / bpm_c / 2  # 8ths
    if k % 2 == 0:
        place(music, kick(), ts, 0.8)
    if k % 4 == 2:
        place(music, snare(), ts, 0.45)
    if u > 0.35:
        place(music, band(noise(0.06), 6000, 14000) * env(0.06, 0.001, 0.015), ts, 0.12)  # hats
    if k % 8 == 7:
        place(music, tom(90), ts, 0.5)
        place(music, tom(70), ts + st / 2, 0.5)
    # low ostinato
    note = [73.4, 73.4, 87.3, 73.4, 98.0, 73.4, 110.0, 103.8][k % 8]
    s = band(saw(note, st * 0.8) + saw(note * 1.006, st * 0.8), 40, 600 + 1400 * u) * env(st * 0.8, 0.003, 0.08)
    place(music, s, ts, 0.28)
    ts += st
    k += 1
place(music, strings_cluster([293.7, 349.2, 440, 587.3], T_OVER - 30.3, 2.5, 9), 30.3, 0.4)
place(dry, riser(2.4), T_OVER - 2.4, 0.5)
# climbing foley: scrapes at each step
for ts in np.arange(29.0, CLIMB_END, 0.3):
    place(dry, band(noise(0.12), 900, 4000) * env(0.12, 0.005, 0.03), ts + rng.random() * 0.05, 0.16, rng.random() * 0.8 - 0.4)
for ts in np.arange(29.0, CLIMB_END, 0.62):
    place(dry, breath(0.3, False), ts, 0.13, 0, 0.2)
# the arm bursts out
place(dry, hiss(0.9), 30.2, 0.7, -0.4, 0.5)
place(dry, boom(1.0, 100, 35), 30.22, 0.6)
place(dry, growl(3.2, 52, 14), 30.6, 0.45, -0.2, 0.5)
# grab the rim, LUNGE + snap shut
place(dry, thud(0.3), T_GRAB, 0.6)
place(dry, debris(1.2, 50), T_GRAB, 0.4)
place(dry, screech(1.0), T_OVER - 0.12, 0.9, 0, 0.5)
place(dry, boom(2.2, 110, 26), T_OVER - 0.05, 1.2, 0, 0.6)
place(dry, braam(2.6, 55), T_OVER - 0.05, 0.75, 0, 0.5)
place(dry, crack(), T_OVER + 0.15, 0.3)  # jaws/claws snapping shut
place(dry, thud(0.2), T_OVER + 0.15, 0.6)
place(dry, thud(0.4), T_DOWN, 0.6)

# ================= ESCAPE / ENDING =================
for k in range(6):
    place(dry, breath(0.45, k % 2 == 0), T_DOWN + 0.2 + k * 0.42, 0.22, 0.1, 0.2)
place(music, strings_cluster([146.8, 220, 293.7, 370], 2.0, 0.6, 0), T_DOWN + 0.05, 0.35)  # relief (D major)
# into the hole... eyes
place(music, strings_cluster([587.3, 622.3, 880, 932.3], 2.5, 1.2, 13), 36.6, 0.3)
place(dry, growl(2.0, 44, 9), 37.9, 0.5, 0, 0.6)
place(dry, boom(1.8, 70, 25), 38.12, 0.9, 0, 0.5)
place(music, strings_cluster([392, 415.3, 554.4, 587.3], 1.3, 0.05, 15), 38.12, 0.5)
# end card: deep braam + outro pulse
place(dry, braam(2.6, 41.2), 39.55, 0.9, 0, 0.5)
place(dry, boom(2.2, 80, 25), 39.55, 0.7, 0, 0.4)
for k in range(5):
    place(music, heartbeat(), 40.0 + k * 0.42, 0.45)

# ================= MIX =================
# reverb: exponentially decaying noise impulse response (hole echo)
L = int(1.9 * SR)
ir = rng.standard_normal((L, 2)) * np.exp(-np.arange(L) / (0.42 * SR))[:, None]
ir[: int(0.025 * SR)] = 0  # predelay
for c in range(2):
    ir[:, c] = band(ir[:, c], 150, 5000)
ir /= np.sqrt(np.sum(ir ** 2, axis=0))
nfft = 1 << int(np.ceil(np.log2(N + L)))
rev = np.zeros_like(wet)
for c in range(2):
    rev[:, c] = np.fft.irfft(np.fft.rfft(wet[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N]

# duck the music under big hits a little
mix = dry + rev * 0.55 + music * 0.85
# gentle bus compression via soft clip
mix = mix / np.max(np.abs(mix)) * 1.6
mix = np.tanh(mix) / np.tanh(1.6)
# fade in/out
fade = np.ones(N)
fade[: int(0.02 * SR)] = np.linspace(0, 1, int(0.02 * SR))
fade[-int(0.8 * SR):] = np.linspace(1, 0, int(0.8 * SR)) ** 1.5
mix *= fade[:, None] * 0.93

with wave.open("soundtrack.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("soundtrack.wav", DUR, "s", "peak", np.max(np.abs(mix)))
