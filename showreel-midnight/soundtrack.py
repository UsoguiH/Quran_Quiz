#!/usr/bin/env python3
"""Score + sound design for «دقيقة قبل منتصف الليل», synthesized from scratch.

    python3 soundtrack.py            → soundtrack.wav (48 kHz, 16-bit stereo, 15.000 s)

Same 128 BPM grid as film.js, and every cue below is one of the film's own
numbers. The arc: a music-box lullaby over a ticking clock and cartoon snores,
cut dead by the alarm; a comedy "take" hit; a plucked-string rush through the
lesson with the app's correct chime climbing a tone per answer, like a combo;
the flame's inhale and ignition; stop-time hits under the tagline; and a warm
IV → I on the button press. Plucked strings are Karplus–Strong. The one
sample is the app's own correct.mp3 (decoded with ffmpeg; FFMPEG overrides).
"""
import os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
B = 60 / 128
BAR = 4 * B
DUR = 8 * BAR
N = int(round(DUR * SR))
rng = np.random.default_rng(3)
HERE = os.path.dirname(os.path.abspath(__file__))
def T(i): return i * BAR
def hz(n): return 440.0 * 2 ** ((n - 69) / 12)
NOTE = {k: i for i, k in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
FLAT = {'Bb': 'A#', 'Eb': 'D#', 'Ab': 'G#'}
def mm(s): return 12 * (int(s[-1]) + 1) + NOTE[FLAT.get(s[:-1], s[:-1])]

music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); kick_env = np.zeros(N)
def t_(d): return np.arange(int(d * SR)) / SR
def add(bus, t0, sig, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
    if i < 0: sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    if j > i: bus[i:j] += sig[: j - i] * gain
def filt(x, kind, f, order=2):
    f = np.clip(np.atleast_1d(f), 20, SR / 2 - 100)
    return sosfilt(butter(order, f if len(f) > 1 else f[0], btype=kind, fs=SR, output='sos'), x, axis=0)
def sweep(x, kind, f0, f1, steps=32, bw=None):
    out = np.zeros_like(x); n = len(x); e = np.linspace(0, n, steps + 1).astype(int)
    for k in range(steps):
        f = f0 * (f1 / f0) ** (k / max(1, steps - 1))
        seg = x[max(0, e[k] - 1024): e[k + 1]]
        y = filt(seg, 'band', [f * (1 - bw), f * (1 + bw)]) if bw else filt(seg, kind, f)
        out[e[k]: e[k + 1]] = y[-(e[k + 1] - e[k]):]
    return out
def env(n, a=0.002, d=0.2, s=0.0, r=0.0, hold=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-np.maximum(0, t - a) / d))
    if hold is not None and r > 0: e *= np.clip(1 - (t - hold) / r, 0, 1)
    return e
def saw(f, t, det=0.0):
    ph = np.cumsum(np.full(len(t), f) if np.isscalar(f) else f) / SR
    return 2 * ((ph * (1 + det)) % 1) - 1
def glide(f0, f1, d, curve=4.0):
    t = t_(d); k = t / d
    f = f1 + (f0 - f1) * np.exp(-curve * k)
    return np.sin(2 * np.pi * np.cumsum(f) / SR), t

# ─────────────────────────────── instruments ───────────────────────────────
def ks(freq, d, bright=0.6, decay=0.996):
    """Karplus–Strong plucked string, block-vectorised by the period"""
    n = int(d * SR); P = max(2, int(SR / freq))
    out = np.zeros(n + P + 2)
    exc = rng.standard_normal(P)
    exc = filt(exc, 'low', 1500 + 7000 * bright)
    out[:P] = exc / (np.abs(exc).max() + 1e-9)
    i = P
    while i < n:
        j = min(n, i + P)
        k = j - i
        out[i:j] = decay * 0.5 * (out[i - P:i - P + k] + out[i - P - 1:i - P - 1 + k] if i - P - 1 >= 0 else out[i - P:i - P + k])
        i = j
    y = out[:n]
    return y * np.minimum(1, np.arange(n) / (0.002 * SR))
def pluck(t0, note, d=0.4, g=0.3, pan=0.0, bright=0.6, bus=None, decay=0.996):
    add(music if bus is None else bus, t0, ks(hz(note), d, bright, decay) * np.clip((d - t_(d)) / 0.04, 0, 1)[:int(d * SR)], g, pan)
def kick(t0, g=1.0):
    s, t = glide(190, 52, 0.32, 26)
    body = s * np.exp(-t / 0.11) + 0.3 * np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.05)
    click = filt(rng.standard_normal(len(t)), 'high', 2500) * np.exp(-t / 0.004) * 0.35
    add(music, t0, np.tanh(1.6 * (body + click)) * 0.85, g)
    i = int(t0 * SR); e = np.exp(-t_(0.3) / 0.09)
    kick_env[i:i + len(e)] = np.maximum(kick_env[i:i + len(e)], e[: max(0, min(len(e), N - i))])
def clap(t0, g=0.45):
    n = int(0.3 * SR); t = np.arange(n) / SR
    e = sum(np.exp(-np.maximum(0, t - o) / 0.006) * (t >= o) for o in (0, 0.011, 0.022)) + 0.6 * np.exp(-np.maximum(0, t - 0.03) / 0.07) * (t >= 0.03)
    add(music, t0, filt(rng.standard_normal(n) * e, 'band', [900, 4200]), g, 0.08)
def shaker(t0, g=0.05, pan=0.3):
    n = int(0.08 * SR); t = np.arange(n) / SR
    add(music, t0, filt(rng.standard_normal(n), 'band', [5000, 11000]) * np.minimum(1, t / 0.006) * np.exp(-t / 0.025), g, pan)
def hat_open(t0, g=0.06, pan=-0.25):
    n = int(0.3 * SR); t = np.arange(n) / SR
    add(music, t0, filt(rng.standard_normal(n), 'high', 7000) * np.exp(-t / 0.09), g, pan)
def snap(t0, g=0.25, pan=-0.2):
    n = int(0.08 * SR); t = np.arange(n) / SR
    add(music, t0, filt(rng.standard_normal(n), 'band', [1800, 3500]) * np.exp(-t / 0.012) + 0.4 * np.sin(2 * np.pi * 2200 * t) * np.exp(-t / 0.006), g, pan)
def bell(t0, note, g=0.2, d=0.9, pan=0.0, bus=None):
    t = t_(d); f = hz(note)
    y = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.08)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.03)) * env(len(t), 0.001, d * 0.3)
    add(sfx if bus is None else bus, t0, y, g, pan)
def musicbox(t0, note, g=0.16, pan=0.0):
    t = t_(1.4); f = hz(note)
    y = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.2) + 0.25 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / 0.06)) * env(len(t), 0.001, 0.5)
    add(music, t0, y, g, pan)
def marimba(t0, note, g=0.3, pan=0.0, bus=None):
    t = t_(0.5); f = hz(note)
    y = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.02)) * env(len(t), 0.001, 0.13)
    add(sfx if bus is None else bus, t0, y, g, pan)
def pad(t0, notes, d, g=0.06, f0=500, f1=2500):
    t = t_(d)
    L = sum(saw(hz(n), t, -0.006) + saw(hz(n), t, 0.003) for n in notes)
    R = sum(saw(hz(n), t, 0.006) + saw(hz(n), t, -0.003) for n in notes)
    e = np.minimum(1, t / 0.2) * np.clip((d - t) / 0.12, 0, 1)
    add(music, t0, np.stack([sweep(L, 'low', f0, f1), sweep(R, 'low', f0, f1)], 1) * e[:, None], g)
def stab(t0, notes, g=0.16, d=0.5, bus=None):
    t = t_(d)
    L = sum(saw(hz(n), t, -0.005) for n in notes); R = sum(saw(hz(n), t, 0.005) for n in notes)
    e = env(len(t), 0.004, 0.14, 0.2, 0.1, d - 0.1)
    add(sfx if bus is None else bus, t0, np.stack([sweep(L, 'low', 5000, 900, 12), sweep(R, 'low', 5000, 900, 12)], 1) * e[:, None], g)
def pop(t0, f0=400, f1=1100, g=0.3, d=0.09, pan=0.0):
    s, t = glide(f0, f1, d, 9); add(sfx, t0, s * env(len(t), 0.001, d * 0.4), g, pan)
def click(t0, g=0.3, f=2800, pan=0.0):
    n = int(0.03 * SR); t = np.arange(n) / SR
    add(sfx, t0, filt(rng.standard_normal(n), 'band', [f * 0.6, f * 1.6]) * np.exp(-t / 0.004) + 0.5 * np.sin(2 * np.pi * f * 0.5 * t) * np.exp(-t / 0.006), g, pan)
def tick(t0, g=0.18, f=3200, pan=0.0):
    n = int(0.05 * SR); t = np.arange(n) / SR
    add(sfx, t0, (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.51 * t)) * np.exp(-t / 0.008) + filt(rng.standard_normal(n), 'high', 4000) * np.exp(-t / 0.003) * 0.3, g, pan)
def thump(t0, g=0.5, f0=130, f1=48, d=0.3):
    s, t = glide(f0, f1, d, 14)
    add(sfx, t0, s * np.exp(-t / (d * 0.35)) + filt(rng.standard_normal(len(t)), 'low', 900) * np.exp(-t / 0.02) * 0.4, g)
def whoosh(t0, d, g=0.3, f0=400, f1=4000, p0=0.0, p1=0.0, peak=0.6):
    n = int(d * SR); k = np.arange(n) / n
    y = sweep(rng.standard_normal(n), None, f0, f1, 32, bw=0.45)
    y *= np.where(k < peak, (k / peak) ** 2, np.exp(-(k - peak) / (1 - peak) * 4))
    p = p0 + (p1 - p0) * k
    add(sfx, t0, np.stack([y * np.cos((p + 1) * np.pi / 4), y * np.sin((p + 1) * np.pi / 4)], 1) * np.sqrt(2), g)
def boing(t0, g=0.22, f0=160, f1=520, d=0.32, pan=0.0):
    t = t_(d); k = t / d
    f = f0 + (f1 - f0) * (1 - np.exp(-5 * k)) + 60 * np.sin(2 * np.pi * 22 * t) * np.exp(-t / 0.12)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    add(sfx, t0, y * env(len(t), 0.003, d * 0.45), g, pan)
def slide(t0, d, f0, f1, g=0.14, pan=0.0):
    t = t_(d); k = t / d
    f = f0 * (f1 / f0) ** (k ** 1.2) * (1 + 0.012 * np.sin(2 * np.pi * 7 * t))
    add(sfx, t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.02) * np.clip((d - t) / 0.03, 0, 1), g, pan)
def whistle(t0, notes, g=0.13, pan=0.1):
    """a tin-whistle line with portamento: notes = [(time, midi, dur)]"""
    end = max(a + d for a, _, d in notes)
    n = int((end - notes[0][0] + 0.1) * SR); t = np.arange(n) / SR + notes[0][0]
    f = np.full(n, hz(notes[0][1])); amp = np.zeros(n)
    for a, note, d in notes:
        sel = t >= a
        f[sel] = hz(note)
        amp += ((t >= a) & (t < a + d)) * 1.0
    f = filt(f, 'low', 30)                                     # portamento
    vib = 1 + 0.008 * np.sin(2 * np.pi * 6 * t) * np.clip((t - notes[0][0]) / 0.3, 0, 1)
    ph = np.cumsum(f * vib) / SR
    tone = np.sin(2 * np.pi * ph) + 0.08 * np.sin(4 * np.pi * ph)
    breath = filt(rng.standard_normal(n), 'band', [1500, 6000]) * 0.05
    a = filt(np.clip(amp, 0, 1), 'low', 40)
    add(sfx, notes[0][0], (tone + breath) * a, g, pan)
def snore(t0, d, g=0.2):
    t = t_(d); k = t / d
    buzz = saw(62 + 8 * k, t) * 0.5 + filt(rng.standard_normal(len(t)), 'low', 700)
    y = filt(buzz, 'band', [120, 900]) * np.sin(np.pi * k) ** 1.5
    add(sfx, t0, y, g)
def snore_whistle(t0, d, g=0.08):
    s, t = glide(1300, 820, d, 2.2)
    add(sfx, t0, s * np.sin(np.pi * t / d) ** 2 + filt(rng.standard_normal(len(t)), 'band', [2000, 5000]) * 0.08 * np.sin(np.pi * t / d), g, 0.2)
def fizzle(t0, g=0.08):
    n = int(0.35 * SR); t = np.arange(n) / SR
    add(sfx, t0, sweep(rng.standard_normal(n), None, 5000, 1200, 16, bw=0.4) * np.exp(-t / 0.12), g, -0.4)
def alarm(t0, d, g=0.2):
    t = t_(d)
    tone = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((2380, 1), (3120, 0.6), (4390, 0.35), (1190, 0.3)))
    hammer = (np.sin(2 * np.pi * 28 * t) > 0).astype(float)
    hammer = filt(hammer, 'low', 400)
    add(sfx, t0, tone * hammer * np.clip((d - t) / 0.04, 0, 1), g, -0.15)
def ignite(t0, g=0.5):
    n = int(0.9 * SR); t = np.arange(n) / SR
    roar = sweep(rng.standard_normal(n), None, 250, 2600, 28, bw=0.6) * np.minimum(1, t / 0.02) * np.exp(-t / 0.35)
    body = glide(90, 40, 0.9, 5)[0] * np.exp(-t / 0.25) * 0.9
    crack = np.zeros(n)
    for c in rng.uniform(0.05, 0.8, 22):
        i = int(c * SR); L = int(0.004 * SR); crack[i:i + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (0.001 * SR)) * rng.uniform(0.3, 1)
    add(sfx, t0, roar + body + filt(crack, 'high', 2000) * 0.6, g)
def inhale(t0, d, g=0.18):
    n = int(d * SR); k = np.arange(n) / n
    add(sfx, t0, sweep(rng.standard_normal(n), None, 400, 3500, 24, bw=0.5) * k ** 2.5 + np.sin(2 * np.pi * np.cumsum(200 * 4 ** k) / SR) * 0.2 * k ** 3, g)
def sample(path, semis=0):
    ff = os.environ.get('FFMPEG', 'ffmpeg')
    raw = subprocess.run([ff, '-v', 'error', '-i', path, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], check=True, capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float64) / 32768
    if semis:
        r = 2 ** (semis / 12); idx = np.arange(0, len(x) - 1, r)
        x = np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in (0, 1)], 1)
    return x

# ─────────────────────────────── the score ───────────────────────────────
ALARM = 5 * B                       # 2.344
TAKE, REAL, DASH = 2.6, 3.05, 3.5
A1, A2, A3 = T(2) + B, T(2) + 2 * B, T(2) + 3 * B
FULL = T(3)
BURST = T(3) + 2 * B                # 6.5625
PRESS = T(7) + 2.5 * B              # 14.297

# 1 · the lullaby: a music box over a soft F pad, the clock ticking, snores
pad(0, [mm('F3'), mm('A3'), mm('C4'), mm('E4')], ALARM + 0.02, 0.045, 400, 900)
for k, n in enumerate(['C6', 'A5', 'F5', 'A5', 'G5']):
    musicbox(k * B, mm(n), 0.13, (k % 2 - 0.5) * 0.4)
musicbox(0.5 * B, mm('F4'), 0.07); musicbox(2.5 * B, mm('C5'), 0.06); musicbox(4.5 * B, mm('E5'), 0.06)
for k in range(5):
    tick(k * B, 0.15, 3200, -0.3); tick(k * B + B / 2, 0.08, 2300, -0.3)
for c in range(2):
    snore(c * 2 * B + 0.02, B * 0.95, 0.16)
    snore_whistle(c * 2 * B + B + 0.02, B * 0.9, 0.07)
fizzle(2 * B, 0.07); fizzle(4 * B, 0.08)
pop(1.25, 900, 500, 0.08, 0.12, -0.4)                         # the sweat drop
thump(T(1), 0.14, 220, 120, 0.12); tick(T(1), 0.28, 2600, -0.3)

# 2 · ١١:٥٩ — the alarm, the take, the realisation, the dash
alarm(ALARM, 0.42, 0.22)
pop(ALARM + 0.02, 700, 1400, 0.1, 0.08, -0.5)                  # the flame gasps
stab(TAKE, [mm('D4'), mm('F4'), mm('A4'), mm('D5')], 0.22, 0.45)
thump(TAKE, 0.4, 110, 40, 0.5)
boing(TAKE - 0.02, 0.2, 170, 560, 0.3, 0.2)
thump(TAKE + 0.22, 0.3, 140, 60, 0.2)
pop(TAKE + 0.14, 350, 1000, 0.2, 0.1, -0.3)                    # «لحظة!»
tt = t_(0.32); add(sfx, TAKE + 0.3, filt(rng.standard_normal(len(tt)), 'band', [300, 1200]) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * tt)) * np.exp(-tt / 0.15), 0.08)
marimba(REAL, mm('E5'), 0.22); marimba(REAL + 0.16, mm('C5'), 0.22)   # uh-oh
whoosh(DASH - 0.02, 0.32, 0.34, 600, 6000, 0.5, -0.9, 0.5)
slide(DASH + 0.02, 0.26, 500, 1900, 0.09)

# the groove, bars 3–8 (F major): kick, clap, shaker, snaps, Karplus–Strong bass and chords
HARM = [  # (start, end, bass root, chord)
    (T(2), T(2) + 2 * B, 'F2', ['A3', 'C4', 'F4']), (T(2) + 2 * B, T(3), 'C2', ['G3', 'C4', 'E4']),
    (T(3), 5.98, 'D2', ['A3', 'D4', 'F4']),
    (BURST, T(4), 'F2', ['A3', 'C4', 'F4']),
    (T(4), T(4) + 2 * B, 'F2', ['A3', 'C4', 'F4']), (T(4) + 2 * B, T(5), 'A#1', ['A#3', 'D4', 'F4']),
    (T(5), T(5) + 2 * B, 'F2', ['A3', 'C4', 'F4']), (T(5) + 2 * B, T(6), 'C2', ['G3', 'C4', 'E4']),
    (T(6) + 2 * B, T(7), 'F2', ['A3', 'C4', 'F4']),
    (T(7), PRESS, 'A#1', ['A#3', 'D4', 'F4']),
]
def groove(a, b, root, chord, full=True):
    s0 = int(round((a - T(0)) / (B / 4)))
    s1 = int(round((b - T(0)) / (B / 4)))
    notes = [mm(n) for n in chord]
    for s in range(s0, s1):
        t = s * B / 4; ph = s % 16
        if ph % 4 == 0: kick(t, 0.9)
        if ph in (4, 12) and full: clap(t)
        shaker(t, 0.07 if ph % 2 else 0.045, 0.35)
        if ph % 4 == 2: hat_open(t, 0.05)
        if ph in (2, 10): snap(t, 0.12)
        if ph in (0, 3, 6, 8, 11, 14): pluck(t, mm(root) + (12 if ph in (6, 14) else 0) + (7 if ph == 11 else 0), 0.26, 0.5, 0, 0.35, decay=0.994)
        if ph in (2, 6, 10, 14):
            for j, n in enumerate(notes + [notes[-1] + 12]): pluck(t + j * 0.006, n, 0.24, 0.2, (j - 1.5) * 0.3, 0.6, decay=0.995)
for a, b, r, c in HARM: groove(a, b, r, c)

# 3 · the lesson: cards whoosh in, taps, the correct chime climbing a whole tone per answer
for tin in (3.66, A1 + 0.2, A2 + 0.2): whoosh(tin, 0.26, 0.12, 300, 2200, -0.8, 0, 0.6)
for k, A in enumerate((A1, A2, A3)):
    click(A - 0.03, 0.22, 2600, 0.3)
    add(sfx, A, sample(os.path.join(HERE, 'assets/sfx/correct.mp3'), 2 * k), 0.5)
    pop(A + 0.04, 500, 1300, 0.1, 0.07, 0.4)
    if k < 2: whoosh(A + 0.2, 0.2, 0.08, 1500, 400, 0, 0.8, 0.5); boing(A + 0.04, 0.08, 220, 480, 0.18, -0.5)
for k in range(18): tick(3.7 + k * (B / 4), 0.035, 4200, -0.6)
stab(FULL, [mm('F4'), mm('A4'), mm('C5'), mm('F5')], 0.24, 0.5)
thump(FULL, 0.45, 120, 45, 0.4)
boing(FULL, 0.18, 150, 620, 0.36, -0.5); thump(FULL + 0.36, 0.25, 130, 55, 0.2)
for k, n in enumerate(['F5', 'A5', 'C6', 'F6']): bell(FULL + 0.02 + k * 0.035, mm(n), 0.08, 0.6, (k - 1.5) * 0.3)
whoosh(5.94, 0.26, 0.28, 500, 5000, 0.6, -0.9, 0.7)

# 4 · the flame gathers itself… and roars back on the beat
inhale(6.02, BURST - 6.02, 0.22)
tt = t_(BURST - 5.98); add(music, 5.98, np.sin(2 * np.pi * hz(mm('A#1')) * tt) * 0.35 * (tt / tt[-1]) ** 2, 0.5)
ignite(BURST, 0.55)
kick(BURST, 1.1)
stab(BURST, [mm('F4'), mm('A4'), mm('C5'), mm('F5')], 0.2, 0.6)
whoosh(7.14, 0.36, 0.3, 300, 8000, 0, 0, 0.95)

# 5 · the streak: the reveal, the roll to ٤٤, the week ticking, today
thump(T(4), 0.4, 110, 40, 0.5)
for k in range(2): tick(T(4) + B - 0.08 + k * 0.05, 0.14, 2800)
for k, n in enumerate(['C6', 'F6']): bell(T(4) + B + k * 0.07, mm(n), 0.15, 0.9)
for k, n in enumerate(['F5', 'G5', 'A5', 'C6', 'D6', 'F6']): marimba(T(4) + 0.34 + k * 0.045, mm(n), 0.14, 0.6 - 0.2 * k)
pop(T(4) + 2 * B, 400, 1300, 0.22, 0.1, -0.6); bell(T(4) + 2 * B + 0.02, mm('A6'), 0.15, 1.0, -0.6); bell(T(4) + 2 * B + 0.06, mm('C7'), 0.1, 1.0, -0.6)
boing(T(4) + B + 0.02, 0.1, 200, 500, 0.25); boing(T(4) + 3 * B - 0.22, 0.08, 220, 520, 0.22)
slide(T(5) - 0.44, 0.4, 600, 1900, 0.1, 0.6)                   # he leaps in
thump(T(5), 0.45, 130, 45, 0.4)
whoosh(T(5), 0.6, 0.18, 200, 1800, 0.9, -0.2, 0.25)          # the blue sweeps in

# 6 · the duet: a whistle hook over the groove
H = T(5)
whistle(H, [(H, mm('C6'), B / 2), (H + B / 2, mm('A5'), B / 2), (H + B, mm('C6'), B / 2), (H + 1.5 * B, mm('D6'), B / 2),
            (H + 2 * B, mm('C6'), B * 0.9), (H + 3 * B, mm('G5'), B / 2), (H + 3.5 * B, mm('A5'), B / 2)], 0.12)
whoosh(H + B - 0.12, 0.42, 0.14, 800, 2500, -0.6, 0.2, 0.5)  # the flame's flip
boing(H + B - 0.12, 0.12, 200, 600, 0.3, -0.5); thump(H + B + 0.28, 0.2, 150, 70, 0.15)
boing(H + 2 * B - 0.04, 0.16, 160, 560, 0.34, 0.4); thump(H + 2 * B + 0.3, 0.3, 120, 50, 0.25)
boing(H + 3 * B - 0.04, 0.14, 180, 600, 0.34, 0); thump(H + 3 * B + 0.3, 0.35, 120, 45, 0.3)
whoosh(T(6) - 0.26, 0.3, 0.26, 500, 5000, 0.7, -0.9, 0.7)

# 7 · the tagline in stop-time: three hits, then the flame lands and the groove comes back
for k, (t, ch) in enumerate([(T(6), ['D4', 'F4', 'A4', 'D5']), (T(6) + B / 2, ['C4', 'E4', 'G4', 'C5']), (T(6) + B, ['A#3', 'D4', 'F4', 'A#4'])]):
    whoosh(t - 0.2, 0.2, 0.08, 3000, 600, 0, 0, 0.9)
    thump(t, 0.5 if k < 2 else 0.6, 130, 42, 0.4); kick(t, 0.9)
    stab(t, [mm(n) for n in ch], 0.2, 0.4)
    pluck(t, mm(['D2', 'C2', 'A#1'][k]), 0.4, 0.5, 0, 0.4)
slide(T(6) + 2 * B - 0.42, 0.4, 1800, 700, 0.08, -0.6)
boing(T(6) + 2 * B, 0.2, 140, 420, 0.3, -0.4); thump(T(6) + 2 * B, 0.3, 160, 60, 0.2)
for k in range(4): pop(T(6) + 2 * B + 0.18 + k * 0.05, 450 + k * 80, 1000 + k * 120, 0.06, 0.06, 0.5)
whoosh(T(7) - 0.36, 0.42, 0.26, 200, 3000, 0, 0, 0.85)

# 8 · the end card: he jumps up, the wordmark rises, the flame presses the button → F
thump(T(7) + 0.32, 0.35, 120, 45, 0.35)
for k, n in enumerate(['F5', 'A5', 'C6', 'F6']): bell(T(7) + 0.46 + k * 0.035, mm(n), 0.1, 0.8, (k - 1.5) * 0.35)
pop(T(7) + 0.42, 350, 1000, 0.18, 0.1, 0.5)                    # «موعدنا غداً!»
pop(T(7) + 0.62, 400, 1100, 0.12, 0.08, -0.4)
boing(PRESS - 0.36, 0.18, 170, 640, 0.34, 0.2)
kick(PRESS, 1.1); click(PRESS - 0.04, 0.4, 2200, -0.3); click(PRESS + 0.14, 0.22, 3400, -0.3)
pluck(PRESS, mm('F2'), 0.7, 0.6, 0, 0.4, decay=0.998)
pad(PRESS, [mm('F4'), mm('A4'), mm('C5'), mm('F5')], DUR - PRESS, 0.07, 3500, 1200)
stab(PRESS, [mm('F4'), mm('A4'), mm('C5'), mm('F5')], 0.18, 0.7)
for k, n in enumerate(['F5', 'A5', 'C6', 'F6', 'A6']): bell(PRESS + k * 0.03, mm(n), 0.1, 0.7, (k - 2) * 0.3)
pluck(PRESS, mm('C5'), 0.7, 0.12, 0.3, 0.8); pluck(PRESS + 0.012, mm('F5'), 0.7, 0.12, -0.3, 0.8)

# ─────────────────────────────── mix ───────────────────────────────
duck = 1 - 0.45 * kick_env
mix = music * duck[:, None] * 0.62 + sfx * 1.8
mix = filt(mix, 'high', 28)
rms = np.sqrt(filt(np.mean(mix ** 2, 1), 'low', 8).clip(1e-9))
mix *= np.minimum(1, (0.28 / rms) ** 0.35)[:, None]
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
fade = int(0.12 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
mix[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))[:, None]
mix *= 0.93 / np.max(np.abs(mix))

if os.environ.get('STEMS'):
    for name, bus in (('stem-music', music * duck[:, None] * 0.62), ('stem-sfx', sfx * 1.8)):
        with wave.open(os.path.join(HERE, name + '.wav'), 'wb') as w_:
            w_.setnchannels(2); w_.setsampwidth(2); w_.setframerate(SR)
            w_.writeframes((np.clip(bus, -1, 1) * 32767).astype('<i2').tobytes())
out = os.path.join(HERE, 'soundtrack.wav')
with wave.open(out, 'wb') as w_:
    w_.setnchannels(2); w_.setsampwidth(2); w_.setframerate(SR)
    w_.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, f'{N / SR:.3f}s', 'peak', round(float(np.max(np.abs(mix))), 3),
      'rms dBFS', round(float(20 * np.log10(np.sqrt(np.mean(mix ** 2)))), 1))
