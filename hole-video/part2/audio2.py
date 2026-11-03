"""Part 2 sound design + score. Reuses the synth helpers from ../audio.py. Writes part2/soundtrack.wav"""
import os, re, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "..", "audio.py")).read()
helpers = src[: src.index("# ================= AMBIENCE")]
forest_def = src[src.index("def forest(d):"): src.index("place(dry, forest(2.0)")]
drums = src[src.index("def kick():"): src.index("ts = 28.6")]
mix = src[src.index("# ================= MIX"):]
helpers = helpers.replace("DUR = 42.0", "DUR = 45.0")
exec(helpers + forest_def + drums)

def mixs(*xs):
    n = max(len(x) for x in xs)
    return sum(np.pad(x, (0, n - len(x))) for x in xs)

RING_ON = [24.75 + i * 0.42 for i in range(8)]
LAMP_ON = 23.72
BURN = 31.97

# ================= AMBIENCE =================
place(dry, forest(3.1) * np.clip((3.1 - tt(3.1)) / 0.3, 0, 1), 0.0, 0.9)
place(dry, forest(4.9), 15.8, 0.8)
# cabin room tone + clock
room = band(noise(DUR), 60, 400) * 0.06
place(dry, room, 0, 1)
for k in range(int((9.45 - 3.0) / 0.5)):
    place(dry, mixs(click(0.012) * 0.6, tone(2600, 0.02) * 0.15), 3.0 + k * 0.5, 0.35, 0.6)

# ================= HOOK =================
place(dry, boom(1.5, 85, 26), 0.0, 0.8, 0, 0.4)
place(music, braam(1.6, 36.7), 0.0, 0.5)
place(music, strings_cluster([220, 233.1, 311.1], 3.0, 1.5, 6), 0.0, 0.3)
# bone-crack head snap + stinger
for k in range(4):
    place(dry, crack(), 1.72 + k * 0.03, 0.5, -0.3, 0.3)
place(music, strings_cluster([587.3, 622.3, 830.6], 1.2, 0.05, 14), 1.75, 0.45)
place(dry, growl(1.2, 50, 10), 1.8, 0.35, -0.3, 0.5)
place(dry, boom(1.0, 60, 30), 1.9, 0.4)  # distant thunder

# ================= SCRATCHING =================
for k in range(14):
    ts = 4.6 + k * 0.11 + rng.random() * 0.05
    d = 0.09 + rng.random() * 0.08
    sc = band(noise(d), 1800, 6500) * env(d, 0.01, d * 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 45 * tt(d)))
    place(dry, sc, ts, 0.45, 0.2, 0.3)
for k in range(10):
    ts = 5.4 + k * 0.08
    d = 0.07
    place(dry, band(noise(d), 2000, 7000) * env(d, 0.005, 0.03), ts, 0.4, 0.1, 0.3)
place(dry, thud(0.25), 5.95, 0.4)  # knock from below
place(dry, heartbeat(), 4.8, 0.5)
place(dry, heartbeat(), 5.5, 0.55)

# ================= ATTEMPT BADGES / FAIL =================
for ts in [6.25, 11.05, 15.85]:
    place(dry, reverse_cymbal(0.5), ts - 0.5, 0.35)
    place(dry, boom(0.8, 120, 45), ts, 0.55, 0, 0.3)
for ts in [10.3, 15.0, 19.9]:
    place(dry, buzzer(), ts, 0.28)
    place(dry, thud(0.3), ts, 0.35)
# caption pops
for ts, slam in [(9.5, 1), (24.15, 1), (31.97, 1)]:
    place(dry, whoosh(0.18, 2500, 9000, 0.7), ts - 0.06, 0.12)
    if slam:
        place(dry, sweep_sine(110, 45, 0.3, 12) * env(0.3, 0.001, 0.09), ts, 0.45)

# ================= BARRICADE =================
for ts in np.arange(6.5, 7.0, 0.15):
    place(dry, band(noise(0.08), 200, 1500) * env(0.08, 0.002, 0.02), ts, 0.35)  # footsteps on boards
d = 8.65 - 7.05
scrape = band(noise(d), 120, 1400) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * tt(d)))) * np.clip(tt(d) / 0.1, 0, 1)
place(dry, scrape, 7.05, 0.5, -0.3, 0.2)
place(dry, thud(0.4), 8.65, 0.8, -0.5, 0.3)
place(dry, breath(0.7, False), 9.0, 0.22, 0, 0.3)
# CRASH
place(dry, boom(1.8, 100, 28), 9.48, 1.2, 0, 0.5)
for k in range(10):
    place(dry, crack(), 9.48 + k * 0.015, 0.6, rng.random() - 0.5, 0.5)
place(dry, debris(2.0, 60), 9.5, 0.7, 0, 0.4)
place(dry, screech(1.0), 9.8, 0.75, 0, 0.5)

# ================= MUSIC BED (attempts) =================
bpm = 96
beat = 60 / bpm
t0, t1 = 6.2, 20.7
for k in range(int((t1 - t0) / (beat / 2))):
    ts = t0 + k * beat / 2
    if 11.4 < ts < 15.75:  # under the bed: silence except heartbeat
        continue
    root = [36.71, 36.71, 43.65, 41.2][(k // 16) % 4]
    d = beat / 2 * 0.9
    s = band(saw(root * 2, d) + saw(root * 2.005, d), 40, 400 + 250 * (k % 4 == 0)) * env(d, 0.004, 0.12)
    place(music, s, ts, 0.2)
    if k % 4 == 0:
        place(music, sweep_sine(120, 42, 0.3, 14) * env(0.3, 0.002, 0.12), ts, 0.35)
place(music, strings_cluster([146.8, 155.6, 220.0], 14.0, 3.0, 5), 6.2, 0.25)

# ================= UNDER THE BED =================
ts = 11.5
bh = 80
while ts < 15.7:
    place(music, heartbeat(), ts, 0.8)
    bh = min(130, bh + 3)
    ts += 60 / bh
for k in range(8):
    place(dry, breath(0.25, k % 2 == 0), 11.6 + k * 0.28, 0.12, 0, 0.2)
place(dry, whoosh(0.3, 600, 3000) * 0.5, 11.38, 0.4)  # the dive
place(dry, thud(0.3), 11.45, 0.5)
place(music, strings_cluster([392, 415.3, 554.4, 587.3], 1.6, 0.1, 13), 14.2, 0.55)  # eyes open
place(dry, boom(1.2, 70, 28), 14.2, 0.6, 0, 0.4)
place(dry, growl(1.4, 46, 9), 14.4, 0.6, 0.3, 0.4)
place(dry, hiss(1.0), 15.25, 0.8, 0.3, 0.4)

# ================= THE CAR =================
place(dry, thud(0.2), 15.82, 0.4)  # door shut
place(dry, click(0.02), 17.2, 0.6)
d = 18.25 - 17.2
tc = tt(d)
crank = band(noise(d), 80, 700) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 8.5 * tc))) * np.clip(1 - tc / d * 0.6, 0, 1)
crank += band(saw(52, d), 40, 300) * 0.4 * (0.5 + 0.5 * np.sin(2 * np.pi * 8.5 * tc))
place(dry, crank, 17.2, 0.55, 0, 0.1)
place(dry, click(0.02), 18.28, 0.5)
place(dry, click(0.02), 18.38, 0.4)
place(dry, thud(0.3), 18.55, 0.7)  # slams the wheel
horn = band(saw(392, 0.22) + saw(494, 0.22), 200, 3000) * env(0.22, 0.01, 0.2, 0.12)
place(dry, horn, 18.56, 0.25)
# thunder + reveal
th = band(noise(3.0), 30, 400) * env(3.0, 0.02, 1.0) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 3 * tt(3.0))))
place(dry, th, 19.0, 1.0, 0, 0.3)
place(dry, crack() * 2, 19.0, 0.6)
place(music, strings_cluster([392, 415.3, 587.3, 622.3], 1.2, 0.05, 12), 19.0, 0.55)
place(dry, th * 0.7, 19.55, 1.0, 0, 0.3)
place(dry, boom(1.2, 140, 50), 19.55, 0.9)  # lands on the roof
metal = band(noise(0.6), 800, 5000) * env(0.6, 0.002, 0.15) + sum(np.sin(2 * np.pi * f * tt(0.6)) * env(0.6, 0.001, 0.25) * 0.3 for f in [420, 667, 1130])
place(dry, metal, 19.55, 0.6, 0, 0.3)
place(dry, screech(0.9), 19.6, 0.7, 0, 0.4)

# ================= REMEMBER / FLASHBACK =================
for k in range(5):
    place(dry, breath(0.35, k % 2 == 0), 20.8 + k * 0.32, 0.2, 0, 0.3)
place(dry, reverse_cymbal(0.6), 21.15, 0.4)
place(dry, whoosh(0.5, 300, 8000), 21.7, 0.4)
place(music, strings_cluster([293.7, 349.2, 440], 1.3, 0.2, 0), 21.75, 0.3)
place(dry, whoosh(0.5, 300, 8000), 22.85, 0.35)
place(dry, click(0.015), LAMP_ON, 0.7)
place(dry, tone(1760, 0.4) * env(0.4, 0.002, 0.12), LAMP_ON, 0.15)

# ================= THE LIGHT CIRCLE =================
notes = [293.7, 329.6, 370.0, 440.0, 493.9, 587.3, 659.3, 740.0]
for i, ts in enumerate(RING_ON):
    place(dry, click(0.012), ts, 0.5)
    fw = band(noise(0.35), 200, 1500) * env(0.35, 0.03, 0.12)
    place(dry, fw, ts, 0.2)
    place(music, tone(notes[i], 0.6) * env(0.6, 0.005, 0.25) + tone(notes[i] * 2, 0.6) * env(0.6, 0.005, 0.15) * 0.3, ts, 0.18)
place(music, strings_cluster([146.8, 220, 293.7, 370], 3.8, 2.5, 0), 24.4, 0.35)  # hopeful D major swell
place(dry, braam(1.8, 73.4), 24.15, 0.45, 0, 0.4)

# ================= STANDOFF =================
place(dry, boom(1.6, 80, 26), 28.45, 0.8, 0, 0.5)
place(dry, growl(2.5, 48, 12), 28.5, 0.6, 0.3, 0.5)
place(music, strings_cluster([196, 207.7, 293.7, 311.1], 3.5, 0.8, 9), 28.45, 0.4)
for ts in np.arange(29.4, 31.4, 0.105):  # claws skittering on the boards
    place(dry, band(noise(0.03), 2500, 9000) * env(0.03, 0.001, 0.008), ts + rng.random() * 0.02, 0.25, np.sin(ts * 3) * 0.7)
ts = 29.4
k = 0
while ts < BURN - 0.02:
    u = (ts - 29.4) / (BURN - 29.4)
    st = 60 / (120 + 60 * u) / 2
    if k % 2 == 0:
        place(music, kick(), ts, 0.7)
    if k % 4 == 2:
        place(music, snare(), ts, 0.4)
    if u > 0.5:
        place(music, tom(80 + 40 * u), ts, 0.35)
    ts += st
    k += 1
place(dry, riser(2.0), BURN - 2.0, 0.5)
# BURN
place(dry, boom(2.0, 110, 26), BURN, 1.1, 0, 0.6)
place(dry, screech(1.2), BURN, 0.9, 0, 0.5)
d = 2.2
sizzle = band(noise(d), 3000, 12000) * env(d, 0.01, 0.6, 0.2) * (0.6 + 0.4 * (rng.random(int(round(d * SR))) > 0.97))
place(dry, sizzle, BURN, 0.5, 0, 0.3)
place(dry, debris(1.0, 80, 9000), BURN, 0.35)
place(dry, hiss(1.2), BURN + 0.5, 0.7, 0, 0.5)
place(dry, growl(1.6, 42, 8), 33.0, 0.5, 0.3, 0.5)
for ts in np.arange(33.2, 34.4, 0.1):
    place(dry, band(noise(0.03), 2500, 9000) * env(0.03, 0.001, 0.008), ts, 0.2, 0.4)
place(dry, debris(0.8, 40), 34.2, 0.4)
# relief
place(music, strings_cluster([146.8, 220, 293.7, 370], 2.0, 0.8, 0), 34.8, 0.32)
for k in range(4):
    place(dry, breath(0.5, k % 2 == 0), 34.9 + k * 0.45, 0.16, 0, 0.2)

# ================= POWER OUT =================
for ts in [36.42, 36.55, 36.62, 36.8, 36.86]:
    place(dry, band(saw(120, 0.08), 100, 4000) * 0.6, ts, 0.25)
    place(dry, click(0.01), ts, 0.4)
for i in range(8):
    place(dry, mixs(click(0.015), crack() * 0.3), 37.0 + i * 0.07, 0.45, np.cos(i) * 0.6)
d = 1.0
whine = np.sin(2 * np.pi * np.cumsum(400 * np.exp(-tt(d) * 3.5) + 30) / SR) * env(d, 0.005, 0.4)
place(dry, whine, 37.0, 0.3)
place(dry, boom(1.6, 60, 22), 37.55, 0.6, 0, 0.4)
place(dry, band(noise(DUR - 37.6), 30, 160) * 0.12, 37.6, 1)
for i, ts in enumerate([38.65, 38.85, 38.95, 39.0, 39.1, 39.2]):
    place(music, tone(1567 + i * 93, 0.4) * env(0.4, 0.002, 0.18), ts, 0.07, np.sin(i * 2) * 0.8)
place(dry, growl(1.2, 40, 9), 38.9, 0.6, 0, 0.5)
# JUMP SCARE
place(dry, screech(1.0), 39.6, 1.2, 0, 0.5)
place(dry, boom(1.2, 120, 30), 39.7, 1.2, 0, 0.5)
place(dry, braam(0.9, 55), 39.7, 0.8)
# end card
place(dry, braam(3.0, 41.2), 40.15, 0.7, 0, 0.5)
for k in range(8):
    place(music, heartbeat(), 40.6 + k * 0.5, 0.45)

exec(mix.replace('"vo/vo.wav"', '"' + os.path.join(HERE, "vo", "vo.wav") + '"').replace('open("soundtrack.wav", "wb")', 'open("' + os.path.join(HERE, "soundtrack.wav") + '", "wb")').replace('wave.open("soundtrack.wav", "wb")', 'wave.open("' + os.path.join(HERE, "soundtrack.wav") + '", "wb")').replace('os.path.exists("vo/vo.wav")', 'os.path.exists("' + os.path.join(HERE, "vo", "vo.wav") + '")').replace('wave.open("vo/vo.wav")', 'wave.open("' + os.path.join(HERE, "vo", "vo.wav") + '")'))
