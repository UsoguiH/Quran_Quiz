#!/usr/bin/env python3
"""Score + sound design for the Qudrati showreel, synthesized from scratch.

    python3 soundtrack.py            → soundtrack.wav (48 kHz, 16-bit stereo, 15.000 s)

128 BPM, eight bars, one bar per shot — the same grid as showreel.js, so every
cue below is the timeline's own number. The melody lives in the sound design:
path nodes, gems, rank ticks and the end-card pills are pitched on the chord
underneath them. The one sample is the app's own correct-answer chime
(assets/sfx/correct.mp3, decoded with ffmpeg; set FFMPEG if it isn't on PATH).
"""
import os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
B = 60 / 128
BAR = 4 * B
DUR = 8 * BAR
N = int(round(DUR * SR))
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))

def T(i): return i * BAR
def hz(n): return 440.0 * 2 ** ((n - 69) / 12)          # MIDI → Hz
NOTE = {k: i for i, k in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
def m(name):                                                # 'C4' → 60
    return 12 * (int(name[-1]) + 1) + NOTE[name[:-1]]

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
kick_env = np.zeros(N)

def t_(d): return np.arange(int(d * SR)) / SR
def add(bus, t0, sig, gain=1.0, pan=0.0):
    """mix a mono (or stereo) signal in at t0 seconds, equal-power pan"""
    i = int(round(t0 * SR))
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
    if i < 0: sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    if j > i: bus[i:j] += sig[: j - i] * gain

def filt(x, kind, f, order=2):
    f = np.clip(np.atleast_1d(f), 20, SR / 2 - 100)
    sos = butter(order, f if len(f) > 1 else f[0], btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)

def sweep_lp(x, f0, f1, steps=48):
    """a lowpass whose cutoff glides exponentially from f0 to f1"""
    out = np.zeros_like(x); n = len(x); edges = np.linspace(0, n, steps + 1).astype(int)
    for k in range(steps):
        f = f0 * (f1 / f0) ** (k / (steps - 1))
        seg = x[max(0, edges[k] - 2048): edges[k + 1]]
        y = filt(seg, 'low', f)
        out[edges[k]: edges[k + 1]] = y[-(edges[k + 1] - edges[k]):]
    return out

def env(n, a=0.002, d=0.2, s=0.0, r=0.0, hold=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    dec = np.exp(-np.maximum(0, t - a) / d)
    e = e * (s + (1 - s) * dec)
    if hold is not None and r > 0:
        e *= np.clip(1 - (t - hold) / r, 0, 1)
    return e

def saw(f, t, detune=0.0):
    ph = np.cumsum(np.full(len(t), f) if np.isscalar(f) else f) / SR
    return 2 * ((ph * (1 + detune)) % 1) - 1

def sine_glide(f0, f1, d, curve=4.0):
    t = t_(d); k = t / d
    f = f1 + (f0 - f1) * np.exp(-curve * k) if curve > 0 else f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR), t

# ─────────────────────────────── instruments ───────────────────────────────
def kick(t0, g=1.0):
    s, t = sine_glide(190, 54, 0.3, 26)
    body = s * np.exp(-t / 0.11) + 0.3 * np.sin(2 * np.pi * np.cumsum(np.full(len(t), 110.0)) / SR) * np.exp(-t / 0.05)
    click = filt(rng.standard_normal(len(t)), 'high', 2500) * np.exp(-t / 0.004) * 0.35
    add(music, t0, np.tanh(1.6 * (body + click)) * 0.9, g)
    i = int(t0 * SR); e = np.exp(-t_(0.3) / 0.09)          # sidechain source
    kick_env[i:i + len(e)] = np.maximum(kick_env[i:i + len(e)], e[: max(0, min(len(e), N - i))])

def clap(t0, g=0.5):
    n = int(0.3 * SR); t = np.arange(n) / SR; x = rng.standard_normal(n)
    e = sum(np.exp(-np.maximum(0, t - o) / 0.006) * (t >= o) for o in (0, 0.011, 0.022)) + 0.6 * np.exp(-np.maximum(0, t - 0.03) / 0.07) * (t >= 0.03)
    y = filt(x * e, 'band', [900, 4200])
    add(music, t0, y, g, 0.08)

def hat(t0, g=0.14, open_=False, pan=0.25):
    d = 0.16 if open_ else 0.035
    n = int((d * 3) * SR); t = np.arange(n) / SR
    y = filt(rng.standard_normal(n), 'high', 7500) * np.exp(-t / d)
    add(music, t0, y, g, pan)

def bass(t0, note, d, g=0.42):
    t = t_(d + 0.05); f = hz(note)
    x = 0.6 * saw(f, t) + 0.35 * saw(2 * f, t, 0.003) + 0.5 * np.sin(2 * np.pi * f * t)
    x = sweep_lp(x, 2400, 700, 8) * env(len(t), 0.004, 0.16, 0.4, 0.04, d)
    add(music, t0, np.tanh(1.3 * x), g)

def pluck_chord(t0, notes, d=0.22, g=0.1, bright=3200):
    t = t_(d + 0.25)
    L = sum(saw(hz(n), t, -0.004) for n in notes); R = sum(saw(hz(n), t, 0.004) for n in notes)
    e = env(len(t), 0.003, d * 0.5, 0.0)
    y = np.stack([filt(L * e, 'low', bright), filt(R * e, 'low', bright)], 1)
    add(music, t0, y, g)

def pad(t0, notes, d, g=0.07, f0=500, f1=3000):
    t = t_(d)
    L = sum(saw(hz(n), t, -0.006) + saw(hz(n), t, 0.003) for n in notes)
    R = sum(saw(hz(n), t, 0.006) + saw(hz(n), t, -0.003) for n in notes)
    e = np.minimum(1, t / 0.25) * np.clip((d - t) / 0.15, 0, 1)
    add(music, t0, np.stack([sweep_lp(L, f0, f1), sweep_lp(R, f0, f1)], 1) * e[:, None], g)

def bell(t0, note, g=0.22, d=0.9, pan=0.0, bus=None):
    t = t_(d); f = hz(note)
    y = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.08)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.03)) * env(len(t), 0.001, d * 0.3)
    add(sfx if bus is None else bus, t0, y, g, pan)

def marimba(t0, note, g=0.3, pan=0.0):
    t = t_(0.5); f = hz(note)
    y = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.02)) * env(len(t), 0.001, 0.13)
    add(sfx, t0, y, g, pan)

def pop(t0, f0=400, f1=1100, g=0.35, d=0.09, pan=0.0):
    s, t = sine_glide(f0, f1, d, 9)
    add(sfx, t0, s * env(len(t), 0.001, d * 0.4), g, pan)

def click(t0, g=0.3, f=2800, pan=0.0):
    n = int(0.03 * SR); t = np.arange(n) / SR
    y = filt(rng.standard_normal(n), 'band', [f * 0.6, f * 1.6]) * np.exp(-t / 0.004) + 0.5 * np.sin(2 * np.pi * f * 0.5 * t) * np.exp(-t / 0.006)
    add(sfx, t0, y, g, pan)

def thump(t0, g=0.5, f0=130, f1=48, d=0.3):
    s, t = sine_glide(f0, f1, d, 14)
    y = s * np.exp(-t / (d * 0.35)) + filt(rng.standard_normal(len(t)), 'low', 900) * np.exp(-t / 0.02) * 0.4
    add(sfx, t0, y, g)

def whoosh(t0, d, g=0.3, f0=400, f1=4000, pan0=0.0, pan1=0.0, peak=0.6):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    x = rng.standard_normal(n)
    y = np.zeros(n); steps = 32; edges = np.linspace(0, n, steps + 1).astype(int)
    for s in range(steps):
        f = f0 * (f1 / f0) ** (s / (steps - 1))
        seg = x[max(0, edges[s] - 1024): edges[s + 1]]
        yy = filt(seg, 'band', [f * 0.6, f * 1.5])
        y[edges[s]: edges[s + 1]] = yy[-(edges[s + 1] - edges[s]):]
    e = np.where(k < peak, (k / peak) ** 2, np.exp(-(k - peak) / (1 - peak) * 4))
    y *= e
    p = pan0 + (pan1 - pan0) * k
    add(sfx, t0, np.stack([y * np.cos((p + 1) * np.pi / 4), y * np.sin((p + 1) * np.pi / 4)], 1) * np.sqrt(2), g)

def slide_whistle(t0, d, f0=1900, f1=420, g=0.16):
    t = t_(d); k = t / d
    f = f0 * (f1 / f0) ** (k ** 1.3) * (1 + 0.012 * np.sin(2 * np.pi * 7 * t))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.03) * np.clip((d - t) / 0.03, 0, 1)
    add(sfx, t0, y, g, 0.0)

def stab(t0, notes, g=0.16, d=0.5):
    """a bright brass-ish hit: detuned saws through a closing filter"""
    t = t_(d)
    L = sum(saw(hz(n), t, -0.005) for n in notes); R = sum(saw(hz(n), t, 0.005) for n in notes)
    e = env(len(t), 0.004, 0.16, 0.25, 0.1, d - 0.1)
    add(sfx, t0, np.stack([sweep_lp(L, 5000, 900, 12), sweep_lp(R, 5000, 900, 12)], 1) * e[:, None], g)

def riser(t0, d, g=0.22):
    t = t_(d); k = t / d
    x = rng.standard_normal(len(t))
    y = np.zeros(len(t)); steps = 40; edges = np.linspace(0, len(t), steps + 1).astype(int)
    for s in range(steps):
        f = 300 * (9000 / 300) ** (s / (steps - 1))
        seg = x[max(0, edges[s] - 1024): edges[s + 1]]
        yy = filt(seg, 'band', [f * 0.7, f * 1.4]); y[edges[s]: edges[s + 1]] = yy[-(edges[s + 1] - edges[s]):]
    tone = np.sin(2 * np.pi * np.cumsum(200 * (8 ** k)) / SR) * 0.25
    add(sfx, t0, (y + tone) * k ** 2.2, g)

def sample(path):
    ff = os.environ.get('FFMPEG', 'ffmpeg')
    raw = subprocess.run([ff, '-v', 'error', '-i', path, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float64) / 32768

# ─────────────────────────────── the score ───────────────────────────────
CH = {  # bar → (bass root, chord voicing)
    0: ('F2', ['A3', 'C4', 'F4']), 1: ('C2', ['G3', 'C4', 'E4']), 2: ('G2', ['G3', 'B3', 'D4']),
    3: ('A2', ['A3', 'C4', 'E4']), 4: ('F2', ['A3', 'C4', 'F4']), 5: ('G2', ['G3', 'B3', 'D4']),
    6: ('C2', ['G3', 'C4', 'E4']), 7: ('F2', ['A3', 'C4', 'F4']),
}
END_HIT = T(7) + 2.5 * B            # the URL button bottoms out: 14.297 s

# bar 1: a filtered pad opening up, a riser into the drop
pad(T(0), [m(n) for n in CH[0][1]] + [m('F3')], BAR + 0.05, 0.06, 350, 2600)
riser(T(1) - 0.9, 0.9, 0.26)
for k in range(4): hat(T(0) + k * B + B / 2, 0.06)

# bars 2–8: the groove
for bar in range(1, 8):
    root, voicing = CH[bar]
    notes = [m(n) for n in voicing]
    for s in range(16):
        t = T(bar) + s * B / 4
        if t >= END_HIT - 1e-6: break
        if s % 4 == 0: kick(t)
        if s in (4, 12): clap(t)
        if s % 4 == 2: hat(t, 0.075, True, -0.2)
        elif s % 2 == 1: hat(t, 0.035, False, 0.3)
        if s in (2, 6, 10, 14): bass(t, m(root) + (12 if s == 14 else 0), B / 2 - 0.02)
        if s in (0, 3, 6, 10, 12): pluck_chord(t, notes + [notes[0] + 12], 0.2, 0.17, 4800)
    if bar == 1:  # weight on the drop
        thump(T(1), 0.55, 110, 34, 0.7)

# the final hit: F → C on the button press, then it rings to the last frame
kick(END_HIT, 1.1)
bass(END_HIT, m('C2'), 0.7, 0.5)
pad(END_HIT, [m('C4'), m('E4'), m('G4'), m('C5')], DUR - END_HIT, 0.085, 4000, 1200)
stab(END_HIT, [m('C4'), m('E4'), m('G4'), m('C5')], 0.2, 0.7)
for k, n in enumerate(['C5', 'E5', 'G5', 'C6']): bell(END_HIT + k * 0.035, m(n), 0.13, 0.8, (k - 1.5) * 0.3)
add(sfx, END_HIT, filt(rng.standard_normal(int(0.7 * SR)), 'high', 5000) * np.exp(-t_(0.7) / 0.18), 0.12)

# ─────────────────────────────── sound design ───────────────────────────────
# S1 · the start node
pop(0.02, 260, 820, 0.42, 0.14)
pop(B - 0.05, 600, 1500, 0.26, 0.08)
click(2 * B - 0.05, 0.4, 2200); thump(2 * B - 0.03, 0.22, 200, 90, 0.12)
click(2.5 * B, 0.25, 3400)
whoosh(2.5 * B + 0.02, 0.4, 0.12, 1200, 3000)
whoosh(T(1) - 0.64, 0.66, 0.34, 250, 7000, 0, 0, 0.92)

# S2 · the path: nodes pop in on sixteenths, then each completed lesson rings up the scale
for i in range(8): pop(T(1) + 0.04 + i * 0.05 + 0.05, 350 + i * 40, 900 + i * 90, 0.12, 0.06, -0.3)
pop(T(1) + 0.3, 700, 1600, 0.16, 0.07)
for k, n in enumerate(['C5', 'D5', 'E5', 'G5', 'A5', 'C6']):
    tk = T(1) + B + k * (B / 2) - 0.02
    marimba(tk, m(n), 0.32, -0.35 + 0.1 * k)
    if k == 3: thump(tk, 0.18, 180, 90, 0.12)          # the chest on the path
whoosh(T(2) - 0.34, 0.4, 0.3, 500, 5000, -0.7, 0.8, 0.75)

# S3 · the question
for i in range(4): click(T(2) + 0.3 + i * 0.055, 0.1, 1800 + i * 200, -0.3)
pop(T(2) + B - 0.02, 500, 1000, 0.2, 0.06, -0.2); click(T(2) + B - 0.02, 0.18, 3000, -0.2)
click(T(2) + 2 * B - 0.03, 0.34, 2400, -0.2); thump(T(2) + 2 * B - 0.02, 0.16, 180, 90, 0.1)
add(sfx, T(2) + 2 * B + 0.01, sample(os.path.join(HERE, 'assets/sfx/correct.mp3')), 0.8)
whoosh(T(2) + 2 * B + 0.08, 0.35, 0.1, 300, 1500, -0.3, -0.3, 0.5)

# S4 · the four strips land like a drum fill, then each icon pops up the chord (Am)
for i in range(4):
    whoosh(T(3) - 0.36 + i * 0.055, 0.25, 0.07, 800, 250, 0.7 - 0.45 * i, 0.7 - 0.45 * i, 0.8)
    thump(T(3) - 0.14 + i * 0.055, 0.2, 140, 60, 0.16)
for i, n in enumerate(['A4', 'C5', 'E5', 'A5']):
    marimba(T(3) + 0.03 + i * 0.09, m(n), 0.26, 0.7 - 0.45 * i)
    pop(T(3) + 0.02 + i * 0.09, 400, 1200, 0.1, 0.07, 0.7 - 0.45 * i)
for k in range(10): click(T(3) + 0.2 + k * 0.06, 0.05, 4200, 0.0)
bell(T(3) + 2 * B + 0.05, m('E6'), 0.1, 0.5, -0.7)          # the gem glint
for i in range(4): whoosh(T(4) - 0.62 + i * 0.05, 0.3, 0.06, 300, 1600, 0.7 - 0.45 * i, 0.7 - 0.45 * i, 0.85)

# S5 · he falls, lands on the downbeat, hops on beats 2 and 3
slide_whistle(T(4) - 0.36, 0.34)
thump(T(4), 0.5, 130, 48, 0.45)
stab(T(4) + 0.01, [m('F4'), m('A4'), m('C5'), m('F5')], 0.2, 0.45)
pop(T(4) + B * 0.5, 300, 900, 0.18, 0.1, 0.6); pop(T(4) + B * 0.85, 300, 900, 0.18, 0.1, -0.6)
for k in range(8): click(T(4) + B * 0.55 + k * 0.07, 0.04, 4000, 0.4 * (-1) ** k)
for land, air, g in ((T(4) + 2 * B, 0.32, 0.4), (T(4) + 3 * B, 0.26, 0.3)):
    pop(land - air - 0.02, 200, 520, 0.12, 0.12)
    thump(land, g, 110, 45, 0.3)

# S6 · the sheet rises, the chest hops, opens on beat 1, fifty gems
whoosh(T(5) - 0.38, 0.42, 0.18, 250, 2500, 0, 0, 0.8)
thump(T(5) - 0.03 + 0.58 * 0.5, 0.3, 160, 70, 0.18)
o = T(5) + B
thump(o, 0.3, 200, 80, 0.15); click(o, 0.25, 1500)
for k, n in enumerate(['G5', 'B5', 'D6', 'G6', 'B6', 'D7']): bell(o + 0.02 + k * 0.04, m(n), 0.1, 0.9, (k - 2.5) * 0.25)
whoosh(o + 0.1, 0.28, 0.16, 2000, 9000, 0, 0, 0.6)
w = o + 0.26
gem_notes = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'G6']
for k, n in enumerate(gem_notes):
    tk = w + 0.02 + k * 0.03 + 0.34
    bell(tk, m(n), 0.09, 0.4, ((k % 4) - 1.5) * 0.4)
for k in range(12): click(w + 0.12 + k * 0.05, 0.04, 5200, 0.0)
riser(T(6) - 0.34, 0.34, 0.16)

# S7 · the tiers roll past, landing on beat 2 with the app's own rank-up fanfare
pop(T(6) + 0.04, 300, 800, 0.15, 0.1)
steps = [T(6) + 0.3, T(6) + 0.5, T(6) + 0.7, T(6) + 2 * B - 0.05]
for k, tk in enumerate(steps): click(tk, 0.24, 1600 + 400 * k, 0.4 - 0.25 * k); marimba(tk, m(['E4', 'G4', 'B4', 'C5'][k]), 0.16)
land = steps[3] + 0.05
thump(land, 0.45, 130, 45, 0.4)
for k, f in enumerate([523, 659, 784, 1047, 1319, 1047, 1568]):   # sndRankUp in app.js
    n = 69 + 12 * np.log2(f / 440)
    bell(land + 0.02 + k * 0.055, n, 0.12 if k < 6 else 0.16, 0.5 if k < 6 else 0.9)
stab(land + 0.02, [m('C4'), m('E4'), m('G4'), m('C5')], 0.13, 0.4)
whoosh(land, 0.5, 0.16, 400, 3000, 0, 0, 0.3)
whoosh(T(7) - 0.42, 0.25, 0.1, 2000, 500, 0, 0, 0.3)
whoosh(T(7) - 0.32, 0.36, 0.26, 300, 6000, 0, 0, 0.9)

# S8 · he jumps in, the wordmark rises, three pills, the button
pop(T(7) - 0.04, 180, 700, 0.2, 0.2)
thump(T(7) + 0.34, 0.45, 120, 45, 0.35)
for k, n in enumerate(['F5', 'A5', 'C6']):
    bell(T(7) + 0.52 + k * 0.03, m(n), 0.12, 0.7, (k - 1) * 0.4)
for k, n in enumerate(['F5', 'A5', 'C6']):
    marimba(T(7) + 0.72 + k * 0.1, m(n), 0.24, -0.5 + 0.5 * k)
    pop(T(7) + 0.72 + k * 0.1, 400, 1100, 0.14, 0.06, -0.5 + 0.5 * k)
whoosh(T(7) + 0.95, 0.3, 0.1, 3000, 800, -0.3, -0.3, 0.5)
click(END_HIT - 0.05, 0.45, 2200, -0.3)
click(END_HIT + 0.08, 0.25, 3400, -0.3)

# ─────────────────────────────── mix ───────────────────────────────
duck = 1 - 0.5 * kick_env                       # sidechain pump on the bed
chord_bus = music.copy()
mix = chord_bus * duck[:, None] * 0.62 + sfx * 1.9
mix = filt(mix, 'high', 28)
# gentle glue: a slow RMS compressor, then a soft clip
rms = np.sqrt(filt(np.mean(mix ** 2, 1), 'low', 8).clip(1e-9))
gain = np.minimum(1, (0.28 / rms) ** 0.35)
mix *= gain[:, None]
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
fade = int(0.12 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
mix[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))[:, None]
mix *= 0.93 / np.max(np.abs(mix))

if os.environ.get('STEMS'):                      # debug: the two buses, pre-master
    for name, bus in (('stem-music', chord_bus * duck[:, None] * 0.62), ('stem-sfx', sfx * 1.9)):
        with wave.open(os.path.join(HERE, name + '.wav'), 'wb') as w_:
            w_.setnchannels(2); w_.setsampwidth(2); w_.setframerate(SR)
            w_.writeframes((np.clip(bus, -1, 1) * 32767).astype('<i2').tobytes())

out = os.path.join(HERE, 'soundtrack.wav')
with wave.open(out, 'wb') as w_:
    w_.setnchannels(2); w_.setsampwidth(2); w_.setframerate(SR)
    w_.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, f'{N / SR:.3f}s', 'peak', round(float(np.max(np.abs(mix))), 3),
      'rms dBFS', round(float(20 * np.log10(np.sqrt(np.mean(mix ** 2)))), 1))
