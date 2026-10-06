#!/usr/bin/env python3
"""Deliverable 3 - parametric, original music bed for the Vallo launch films.

Warm, optimistic tech-launch bed with a light Amapiano/Afrobeats lilt: soft
four-on-the-floor kick, 16th shaker, rim on 2 and 4, a pitched "log drum"
bass with a sub underneath, lush detuned pads (mid/side, so mono-safe) and
Karplus-Strong plucks (an arpeggio and a lighter motif). D major, 104 BPM.
Written to sit under a voice: pads and plucks are low-passed, 300 Hz-3 kHz is
kept sparse, there is no lead melody.

Everything is generated from numbers in this file (wavetable/sine/noise/
Karplus-Strong synthesis and a synthetic reverb) - no samples, no loops,
nothing downloaded - so it is original and royalty-free by construction.

Structure = bar markers (1-based bars, bar n's downbeat at offset + (n-1)*bar):

  bar 1 .. intro_end    intro: music already playing at t=0 (a one-bar
                        pre-roll is rendered and cut, so reverb and pads are
                        in motion), filtered and warm, opening up
  intro_end .. drop     sparse, filtered (the voice enters); a riser into
                        the drop and a one-beat stop on the last beat
  drop                  hit + the groove starts (progression A)
  lifts[0..]            each lift steps the energy up (level gain + layers):
                        rim + arpeggio, then congas and a warmer progression
                        (B), then clap and a grounded progression (C), then
                        the peak (open hats, busiest log drum)
  logo_hit              short stop (last half-beat before it), then a big
                        hit on the suspended dominant (A9sus4) that rings
  resolve               the final chord (Dmaj9); from here a soft outro:
                        pads + a light pluck motif, gentle accents on the
                        `accents` bars, fade to exact silence over `fade` s

Harmony: intro Bm9-Bm9-F#m11 | A: Gmaj9 A6 F#m11 Bm9 | B (warmer): Bm9 Gmaj9
Dmaj9 A6 | C: Dmaj9 Gmaj9 Bm9 A6 | peak Gmaj9 | logo A9sus4 | resolve Dmaj9,
Gadd9/D, Dmaj9. Each section restarts its progression on its first bar; the
top pad voice holds A4 and inner voices move by step.

    python music.py --out out                                  # film defaults
    python music.py --out out --timeline ../video/timeline.json  # markers from the film
    python music.py --out out --bpm 104 --duration 101.538 --drop 6.923 --lifts 25.385 41.538 ...

Writes out/music.wav (48 kHz stereo 24-bit, -20 LUFS), out/stems/{drums,bass,
keys,arp}.wav (they sum exactly to music.wav), out/music_grid.json (every beat
and bar with its chord and section) and out/music_qa.json.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np
from scipy import signal

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (SR, as2d, band_energy_share, click_scan, db, integrated_lufs,  # noqa: E402
                    mono_compat, remove_dc, sample_peak_db, short_loudness, spectral_centroid,
                    true_peak_db, undb, write_json, write_wav)

BPM = 104.0
BAR_S = 240.0 / BPM


def film_bar(n: int) -> float:
    return (n - 1) * BAR_S


# ============================================================ parameters
@dataclass
class MusicParams:
    """All times in seconds on the film timeline; markers must sit on bar lines."""
    bpm: float = BPM
    offset: float = 0.0                         # downbeat of bar 1
    duration: float = film_bar(45)              # 44 bars = 101.538 s: ends on bar 45's downbeat
    intro_end: float = film_bar(2)              # voice enters
    drop: float = film_bar(4)                   # "Meet Vallo"
    lifts: list = field(default_factory=lambda: [film_bar(12), film_bar(19), film_bar(29), film_bar(40)])
    logo_hit: float | None = film_bar(41)       # "Vallo."
    resolve: float = film_bar(42)               # final chord, under "done right."
    accents: list = field(default_factory=lambda: [film_bar(43), film_bar(44)])  # badges, web address
    fade: float = 1.2
    drop_stop_beats: float = 1.0                # stop before the drop
    logo_stop_beats: float = 0.5                # stop before the logo hit
    transpose: int = 0                          # semitones relative to D major
    target_lufs: float = -20.0
    seed: int = 7

    @classmethod
    def from_timeline(cls, path: str | Path) -> "MusicParams":
        m = json.loads(Path(path).read_text())["music"]
        p = cls(bpm=float(m["bpm"]), offset=0.0, duration=float(m["duration"]),
                intro_end=float(m["intro_end"]), drop=float(m["drop"]), lifts=[float(t) for t in m["lifts"]],
                logo_hit=float(m["logo_hit"]) if m.get("logo_hit") is not None else None,
                resolve=float(m["resolve"]),
                accents=[float(m[k]) for k in ("badges", "url") if m.get(k) is not None])
        return p


# ============================================================ harmony
# MIDI (C4 = 60). Top voice stays on A4 where it can; inner voices move by step.
CHORDS = {
    "Gmaj9": {"bass": 43, "pad": [59, 62, 66, 69]},   # G | B D F# A
    "A6": {"bass": 45, "pad": [61, 64, 66, 69]},      # A | C# E F# A
    "F#m11": {"bass": 42, "pad": [59, 61, 64, 69]},   # F# | B C# E A
    "Bm9": {"bass": 47, "pad": [61, 62, 66, 69]},     # B | C# D F# A
    "Dmaj9": {"bass": 38, "pad": [61, 64, 66, 69]},   # D | C# E F# A
    "A9sus4": {"bass": 45, "pad": [59, 62, 64, 67]},  # A | B D E G
    "Gadd9/D": {"bass": 38, "pad": [59, 62, 67, 69]},  # D | B D G A
}
PROG = {
    1: ["Gmaj9", "A6", "F#m11", "Bm9"],   # A: IV V iii vi - hopeful, floating
    2: ["Gmaj9", "A6", "F#m11", "Bm9"],
    3: ["Bm9", "Gmaj9", "Dmaj9", "A6"],   # B: vi IV I V - warmer
    4: ["Dmaj9", "Gmaj9", "Bm9", "A6"],   # C: I IV vi V - grounded
    5: ["Gmaj9"],                          # peak: IV, then V at the logo, I at the resolve
}
INTRO_PROG = ["Bm9", "Bm9", "F#m11"]       # last intro/pre bar leads into the drop
LOGO_CHORD = "A9sus4"
OUTRO_PROG = ["Dmaj9", "Gadd9/D", "Dmaj9"]
LEAD_IN = {"Gmaj9": "Bm9", "Bm9": "A6", "Dmaj9": "A6", "A9sus4": "Gmaj9", "A6": "Gmaj9", "F#m11": "Dmaj9"}

LOG_PATTERNS = {  # 16th step, semitones above the chord's bass
    1: [(0, 0), (6, 0), (10, 7)],
    2: [(0, 0), (3, 0), (6, 12), (10, 7), (14, 0)],
    3: [(0, 0), (3, 0), (6, 12), (10, 7), (13, 12), (14, 0)],
    4: [(0, 0), (3, 0), (6, 12), (8, 0), (10, 7), (13, 12), (14, 0)],
    5: [(0, 0), (3, 0), (6, 12), (8, 0), (10, 7), (11, 12), (13, 12), (14, 0)],
}
ARP_STEPS = [0, 3, 6, 8, 11, 14]            # 3-3-2 feel
ARP_STEPS_WARM = [0, 2, 4, 6, 8, 10, 12, 14]
MOTIF_STEPS = [(0, 3), (6, 1), (8, 2), (14, 3)]  # (16th step, index into the chord's upper tones)
SHAKER_VEL = [0.45, 0.25, 0.8, 0.3]
PERC_STEPS = [(3, 1.0), (7, 0.8), (11, 1.0), (14, 0.75)]
LEVEL_GAIN_DB = {"intro": -2.5, "pre": -2.5, 1: -2.0, 2: -1.3, 3: -1.0, 4: 0.3, 5: 1.0, "logo": 0.5, "outro": -1.0}
PAD_CUTOFF = {"pre": 950, 1: 1300, 2: 1450, 3: 1400, 4: 1650, 5: 1850, "logo": 2000, "outro": 1500}

# Mix balance: every element is rendered separately, its gated loudness is
# measured and set to this many LU relative to the pads.
BALANCE_LU = {
    "pads": 0.0, "chord_hits": -4.0, "logdrum": -1.0, "sub": -6.0,
    "kick": -4.0, "shaker": -5.5, "rim": -10.0, "clap": -12.5, "perc": -12.0, "hats": -15.0, "fx": -9.0,
    "arp": -6.0, "motif": -7.5,
}
STEM_OF = {"pads": "keys", "chord_hits": "keys", "logdrum": "bass", "sub": "bass", "kick": "drums",
           "shaker": "drums", "rim": "drums", "clap": "drums", "perc": "drums", "hats": "drums", "fx": "drums",
           "arp": "arp", "motif": "arp"}


def mtof(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


# ============================================================ structure
def plan_bars(p: MusicParams) -> dict:
    bar = 240.0 / p.bpm
    beat = bar / 4
    t_of = lambda n: p.offset + (n - 1) * bar  # noqa: E731

    warnings = []

    def bar_at(t, what):
        x = (t - p.offset) / bar + 1
        n = int(round(x))
        if abs(x - n) * bar > 0.002:
            warnings.append(f"{what} at {t:.3f}s is not on a bar line; snapped to bar {n} ({t_of(n):.3f}s)")
        return n

    n_bars = int(round((p.duration - p.offset) / bar))
    last = n_bars  # bars 1..last are inside the file
    b_intro = bar_at(p.intro_end, "intro_end")
    b_drop = bar_at(p.drop, "drop")
    lifts = sorted(bar_at(t, "lift") for t in p.lifts)
    b_logo = bar_at(p.logo_hit, "logo_hit") if p.logo_hit is not None else None
    b_res = bar_at(p.resolve, "resolve")
    accents = [bar_at(t, "accent") for t in p.accents]

    bars = {}
    intro_bars = list(range(0, b_drop))  # bar 0 = pre-roll (rendered, then cut)
    for k, n in enumerate(intro_bars):
        chord = INTRO_PROG[min(len(INTRO_PROG) - 1, max(0, k - (len(intro_bars) - len(INTRO_PROG))))]
        bars[n] = {"chord": chord, "section": "intro" if n < b_intro else "pre", "level": "intro" if n < b_intro else "pre"}
    groove_end = b_logo if b_logo is not None else b_res
    edges = [b_drop] + [lb for lb in lifts if b_drop < lb < groove_end] + [groove_end]
    for lvl, (s0, s1) in enumerate(zip(edges[:-1], edges[1:]), start=1):
        prog = PROG.get(min(lvl, 5), PROG[4])
        for k, n in enumerate(range(s0, s1)):
            bars[n] = {"chord": prog[k % len(prog)], "section": f"groove-{lvl}", "level": min(lvl, 5), "sec_start": s0}
    if b_logo is not None:
        for n in range(b_logo, b_res):
            bars[n] = {"chord": LOGO_CHORD, "section": "logo", "level": "logo"}
    for k, n in enumerate(range(b_res, last + 1)):
        bars[n] = {"chord": OUTRO_PROG[min(k, len(OUTRO_PROG) - 1)] if k < len(OUTRO_PROG) else "Dmaj9",
                   "section": "outro", "level": "outro"}
    # turnarounds: a section never repeats its last chord into the next section's first
    order = sorted(bars)
    for a, b in zip(order[:-1], order[1:]):
        if bars[a]["section"] != bars[b]["section"] and bars[a]["chord"] == bars[b]["chord"] \
                and bars[a]["section"].startswith("groove"):
            bars[a]["chord"] = LEAD_IN.get(bars[b]["chord"], bars[a]["chord"])
    # stops, risers, accents
    if b_drop - 1 in bars:
        bars[b_drop - 1]["stop_step"] = int(round(16 - 4 * p.drop_stop_beats))
    if b_logo is not None and b_logo - 1 in bars:
        bars[b_logo - 1]["stop_step"] = int(round(16 - 4 * p.logo_stop_beats))
    for n in lifts:
        if n - 1 in bars and bars[n - 1]["section"].startswith("groove"):
            bars[n - 1]["pre_lift"] = True
    for n in accents:
        if n in bars:
            bars[n]["accent"] = True
    return {"bars": bars, "bar": bar, "beat": beat, "t_of": t_of, "last": last, "b_intro": b_intro,
            "b_drop": b_drop, "lifts": lifts, "b_logo": b_logo, "b_res": b_res, "accents": accents,
            "warnings": warnings}


# ============================================================ dsp helpers
# ============================================================ dsp helpers
def n_of(t: float) -> int:
    return int(round(t * SR))


def stft_filter(x: np.ndarray, gain_fn, nfft: int = 2048) -> np.ndarray:
    """Time-varying filter: gain_fn(freqs, frame_times) -> gain matrix."""
    hop = nfft // 4
    f, t, Z = signal.stft(x, SR, nperseg=nfft, noverlap=nfft - hop, boundary="even")
    _, y = signal.istft(Z * gain_fn(f, t), SR, nperseg=nfft, noverlap=nfft - hop, boundary=True)
    y = y[:len(x)]
    return np.pad(y, (0, len(x) - len(y)))


def lowpass_curve(cut_at):
    """Butterworth-like (4th order) magnitude with a cutoff that follows cut_at(t)."""
    def g(f, t):
        fc = np.maximum(cut_at(t), 20.0)[None, :]
        return 1.0 / np.sqrt(1.0 + (f[:, None] / fc) ** 8)
    return g


def butter(x, kind, freq, order=2):
    return signal.sosfilt(signal.butter(order, freq, kind, fs=SR, output="sos"), x, axis=0)


def adsr(n: int, a: float, r: float, hold_n: int) -> np.ndarray:
    """Attack (raised cosine), hold to hold_n, release (raised cosine) to 0 at n."""
    env = np.ones(n)
    na = min(n_of(a), n)
    if na > 1:
        env[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    nr = n - hold_n
    if nr > 1:
        env[hold_n:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    env[-1] = 0.0
    return env


def add_at(buf: np.ndarray, i: int, y: np.ndarray, gain: float = 1.0):
    if i >= len(buf):
        return
    j = min(len(buf), i + len(y))
    if i < 0:
        y = y[-i:]
        j = min(len(buf), len(y))
        i = 0
    buf[i:j] += gain * y[: j - i]


class Wavetables:
    """Band-limited saw cycles per MIDI note (harmonics below `top` Hz)."""

    def __init__(self, top: float = 3000.0, size: int = 4096):
        self.size, self.top, self.cache = size, top, {}

    def get(self, m: float) -> np.ndarray:
        key = round(m, 3)
        if key not in self.cache:
            f = mtof(m)
            k = np.arange(self.size) / self.size
            h_max = max(1, int(self.top / f))
            tab = sum(np.sin(2 * np.pi * h * k) / h * (0.92 ** (h - 1)) for h in range(1, h_max + 1))
            self.cache[key] = np.append(tab, tab[0])
        return self.cache[key]

    def osc(self, m: float, n: int, cents: float, phase0: float) -> np.ndarray:
        tab = self.get(m)
        inc = mtof(m) * 2 ** (cents / 1200) / SR * self.size
        ph = (phase0 * self.size + inc * np.arange(n)) % self.size
        i = ph.astype(int)
        fr = ph - i
        return tab[i] * (1 - fr) + tab[i + 1] * fr


def reverb_ir(t60: float, rng, predelay: float = 0.02, damp: float = 0.45) -> np.ndarray:
    n = n_of(t60 * 1.15)
    t = np.arange(n) / SR
    shared_low = butter(rng.standard_normal(n), "lowpass", 250)  # mono bass in the tail
    chans = []
    for _ in range(2):
        w = rng.standard_normal(n)
        low = shared_low + butter(butter(w, "lowpass", 600), "highpass", 250)
        mid = butter(w, "bandpass", [600, 4000])
        high = butter(w, "highpass", 4000)
        y = (low * 10 ** (-3 * t / (t60 * 1.1)) + mid * 10 ** (-3 * t / t60)
             + 0.5 * high * 10 ** (-3 * t / (t60 * damp)))
        k = n_of(0.006)
        y[:k] *= np.linspace(0, 1, k)
        chans.append(np.concatenate([np.zeros(n_of(predelay)), y]))
    ir = np.stack(chans, axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve_st(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    x2 = as2d(x)
    if x2.shape[1] == 1:
        x2 = np.repeat(x2, 2, axis=1)
    y = np.stack([signal.fftconvolve(x2[:, c], ir[:, c])[: len(x2)] for c in range(2)], axis=1)
    return y


def ms_to_lr(mid: np.ndarray, side: np.ndarray) -> np.ndarray:
    return np.stack([mid + side, mid - side], axis=1)


# ============================================================ instruments
def kick(rng, vel: float) -> np.ndarray:
    d = 0.45
    t = np.arange(n_of(d)) / SR
    f = 52 + 75 * np.exp(-t / 0.026)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)
    click = butter(rng.standard_normal(len(t)), "bandpass", [700, 2500]) * np.exp(-t / 0.004) * 0.12
    y = np.tanh(1.3 * (body + click)) / np.tanh(1.3)
    y[: n_of(0.001)] *= np.linspace(0, 1, n_of(0.001))
    y[-n_of(0.02):] *= np.linspace(1, 0, n_of(0.02))
    return vel * y


def log_drum(m: float, n_len: int, vel: float) -> tuple[np.ndarray, np.ndarray]:
    """Amapiano-style pitched 'log drum': fast downward pitch glide into the
    note, woody 2nd harmonic, plus a pure sub an octave down."""
    n = max(n_len, n_of(0.12))
    t = np.arange(n) / SR
    f0 = mtof(m)
    f = f0 * 2 ** ((2.5 / 12) * np.exp(-t / 0.028))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.28 * np.sin(2 * ph + 0.3) + 0.08 * np.sin(3 * ph)
    env = np.exp(-t / 0.22)
    y = np.tanh(1.6 * tone * env) / np.tanh(1.6)
    knock = np.sin(2 * np.pi * 2.02 * f0 * t) * np.exp(-t / 0.018) * 0.25
    y = y + knock
    sub = np.sin(2 * np.pi * np.cumsum(np.full(n, f0 / 2)) / SR) * np.exp(-t / 0.5)
    for s in (y, sub):
        s[: n_of(0.002)] *= np.linspace(0, 1, n_of(0.002))
        r = min(n_of(0.03), n // 3)
        s[-r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return vel * y, vel * 0.55 * sub


def shaker(rng, vel: float) -> np.ndarray:
    d = 0.09
    n = n_of(d)
    t = np.arange(n) / SR
    w = butter(rng.standard_normal(n), "bandpass", [3800, 9000], order=2)
    env = (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.022)
    env[-n_of(0.01):] *= np.linspace(1, 0, n_of(0.01))
    return vel * w * env / 3.0


def rim(rng, vel: float) -> np.ndarray:
    d = 0.12
    t = np.arange(n_of(d)) / SR
    y = (np.sin(2 * np.pi * 1720 * t) * np.exp(-t / 0.007) + 0.5 * np.sin(2 * np.pi * 3210 * t) * np.exp(-t / 0.004)
         + 0.35 * np.sin(2 * np.pi * 480 * t) * np.exp(-t / 0.012))
    y += butter(rng.standard_normal(len(t)), "bandpass", [2000, 6000]) * np.exp(-t / 0.002) * 0.3
    y[: n_of(0.0005)] *= np.linspace(0, 1, n_of(0.0005))
    y[-n_of(0.01):] *= np.linspace(1, 0, n_of(0.01))
    return vel * butter(y, "lowpass", 6000)


def clap(rng, vel: float) -> np.ndarray:
    d = 0.25
    n = n_of(d)
    t = np.arange(n) / SR
    w = butter(rng.standard_normal(n), "bandpass", [900, 3200], order=4)
    env = np.zeros(n)
    for k, off in enumerate([0.0, 0.009, 0.018]):
        i = n_of(off)
        seg = np.exp(-(t[: n - i]) / (0.006 if k < 2 else 0.05)) * (1 - np.exp(-t[: n - i] / 0.0007))
        env[i:] += seg * (0.7 if k < 2 else 1.0)
    env[-n_of(0.02):] *= np.linspace(1, 0, n_of(0.02))
    return vel * w * env / 3.0


def conga(m: float, vel: float) -> np.ndarray:
    d = 0.3
    t = np.arange(n_of(d)) / SR
    f = mtof(m) * (1 + 0.12 * np.exp(-t / 0.01))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.075)
    y += 0.3 * np.sin(2 * np.pi * 1.5 * np.cumsum(f) / SR) * np.exp(-t / 0.03)
    y[: n_of(0.0015)] *= np.linspace(0, 1, n_of(0.0015))
    y[-n_of(0.02):] *= np.linspace(1, 0, n_of(0.02))
    return vel * y


def swell(rng, dur: float, cutoff_end: float = 5000.0) -> np.ndarray:
    """Reverse-cymbal-like noise swell that ends (short 8 ms fade) at its last sample."""
    n = n_of(dur)
    t = np.arange(n) / SR
    w = rng.standard_normal((n, 2))
    fc = 400 * (cutoff_end / 400) ** (t / dur)
    y = np.stack([stft_filter(w[:, c], lowpass_curve(lambda tt: np.interp(tt, t, fc))) for c in range(2)], axis=1)
    env = (t / dur) ** 3
    y *= env[:, None]
    y[-n_of(0.008):] *= np.linspace(1, 0, n_of(0.008))[:, None]
    return y / (np.max(np.abs(y)) + 1e-12)


def ks_pluck(m: float, vel: float, rng, t60: float = 1.3, dur: float = 1.4, bright: float = 2600) -> np.ndarray:
    """Karplus-Strong string with an all-pass fractional delay (exact tuning)."""
    f = mtof(m)
    L = SR / f
    N = int(L - 1.0)
    dfr = L - N - 0.5
    c = (1 - dfr) / (1 + dfr)
    rho = math.exp(-6.91 / (t60 * f))
    a = np.zeros(N + 3)
    a[0], a[1] = 1.0, c
    a[N] += -0.5 * rho * c
    a[N + 1] += -0.5 * rho * (1 + c)
    a[N + 2] += -0.5 * rho
    n = n_of(dur)
    exc = np.zeros(n)
    burst = butter(rng.standard_normal(N + 64), "lowpass", bright, order=4)[64:]
    burst -= burst.mean()
    exc[:N] = burst * np.hanning(N)
    y = signal.lfilter([1.0, c], a, exc)
    y[-n_of(0.05):] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_of(0.05)))
    return vel * y / (np.max(np.abs(y)) + 1e-12)




def music_riser(rng, dur: float, bpm: float) -> np.ndarray:
    """Riser that ends exactly on the next downbeat: pink-ish noise opening
    300 Hz -> 6 kHz plus a D3 -> D4 tone, 16th-note pulses counted back from
    the end, loudest at the very end (8 ms cut)."""
    n = n_of(dur)
    t = np.arange(n) / SR
    prog = t / dur
    fc = 300 * (6000 / 300) ** prog
    nz = np.stack([stft_filter(rng.standard_normal(n), lowpass_curve(lambda tt: np.interp(tt, t, fc)))
                   for _ in range(2)], axis=1)
    f = mtof(50) * 2 ** (prog ** 1.6)
    ph = 2 * np.pi * np.cumsum(f) / SR
    ton = sum(np.sin(h * ph) / h for h in range(1, 6))
    six = 60 / bpm / 4
    pulse = 0.75 + 0.25 * np.cos(2 * np.pi * (dur - t) / six)
    amp = (10 ** (-24 * (1 - prog) / 20)) * pulse
    y = (0.6 * nz + 0.35 * ton[:, None]) * amp[:, None]
    y[: n_of(0.08)] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n_of(0.08))))[:, None]
    y[-n_of(0.008):] *= np.linspace(1, 0, n_of(0.008))[:, None]
    return y / (np.max(np.abs(y)) + 1e-12)


def wash(rng, dur: float = 2.2) -> np.ndarray:
    """Soft cymbal-like air after a hit (decaying filtered noise, stereo)."""
    n = n_of(dur)
    t = np.arange(n) / SR
    y = np.stack([butter(butter(rng.standard_normal(n), "highpass", 2500), "lowpass", 7500) for _ in range(2)], axis=1)
    env = np.exp(-t / 0.55) * (1 - np.exp(-t / 0.01))
    env[-n_of(0.05):] *= np.linspace(1, 0, n_of(0.05))
    return y * env[:, None] / 3.0


def sub_hit(m: float, dur: float = 2.0) -> np.ndarray:
    t = np.arange(n_of(dur)) / SR
    y = np.sin(2 * np.pi * np.cumsum(mtof(m) * (1 + 0.6 * np.exp(-t / 0.06))) / SR) * np.exp(-t / 0.55)
    y[: n_of(0.003)] *= np.linspace(0, 1, n_of(0.003))
    y[-n_of(0.05):] *= np.linspace(1, 0, n_of(0.05))
    return y


def open_hat(rng, vel: float) -> np.ndarray:
    n = n_of(0.16)
    t = np.arange(n) / SR
    y = butter(butter(rng.standard_normal(n), "highpass", 5500), "lowpass", 9500)
    env = (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.05)
    env[-n_of(0.015):] *= np.linspace(1, 0, n_of(0.015))
    return vel * y * env / 3.0


# ============================================================ render
def render(p: MusicParams, keep_elements: bool = False) -> dict:
    rng = np.random.default_rng(p.seed)
    S = plan_bars(p)
    bars, bar, beat, t_of = S["bars"], S["bar"], S["beat"], S["t_of"]
    six = beat / 4
    PRE = bar                                   # one bar of pre-roll, cut at the end
    N = n_of(p.duration)
    NT = n_of(p.duration + PRE)
    tr = p.transpose
    ix = lambda t: n_of(t + PRE)  # noqa: E731  internal sample index of film time t
    el = {k: np.zeros((NT, 2)) for k in BALANCE_LU}

    def put(name, t, y, pan=0.0, gain=1.0):
        y = as2d(y)
        i = ix(t)
        if y.shape[1] == 1:
            th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
            add_at(el[name][:, 0], i, y[:, 0], gain * np.cos(th) * np.sqrt(2))
            add_at(el[name][:, 1], i, y[:, 0], gain * np.sin(th) * np.sqrt(2))
        else:
            add_at(el[name][:, 0], i, y[:, 0], gain)
            add_at(el[name][:, 1], i, y[:, 1], gain)

    stops = []  # (t0, t1) windows where the groove stops
    for n, info in bars.items():
        if "stop_step" in info:
            stops.append((t_of(n) + info["stop_step"] * six, t_of(n + 1)))

    def upper(chord):
        return [m + 12 + tr for m in CHORDS[chord]["pad"]]

    # ---------------- per-bar events
    for n in sorted(bars):
        info = bars[n]
        t0, sec, lvl = t_of(n), info["section"], info["level"]
        if t0 >= p.duration:
            continue
        chord = info["chord"]
        root = CHORDS[chord]["bass"] + tr
        stop = info.get("stop_step", 16)
        groove = isinstance(lvl, int)
        for step in range(16):
            ts = t0 + step * six
            if step >= stop or ts >= p.duration:
                continue
            beat_i, sub = divmod(step, 4)
            # kick
            if (groove and sub == 0) or (sec == "pre" and step == 0):
                put("kick", ts, kick(rng, (1.0 if beat_i == 0 else 0.85) if groove else 0.55))
            # shaker
            if groove:
                v = SHAKER_VEL[sub]
                if info.get("pre_lift") and step >= 8:  # 32nd-note fill into a lift
                    for k2 in (0, 1):
                        put("shaker", ts + k2 * six / 2, shaker(rng, v * (0.6 + 0.4 * (step - 8) / 7)),
                            0.3 if (step + k2) % 2 else -0.3)
                else:
                    put("shaker", ts, shaker(rng, v * (1 + rng.uniform(-0.08, 0.08))), 0.3 if step % 2 else -0.3)
            elif sec == "pre" and step % 2 == 0:
                put("shaker", ts, shaker(rng, 0.5 if step % 4 == 2 else 0.3), 0.3 if step % 4 else -0.3)
            # rim / clap / congas / hats
            if groove and lvl >= 2 and step in (4, 12):
                put("rim", ts, rim(rng, 1.0), 0.1)
            if groove and lvl >= 2 and step == 15 and n % 2 == 1:
                put("rim", ts, rim(rng, 0.4), 0.1)
            if groove and lvl >= 4 and step in (4, 12):
                put("clap", ts, clap(rng, 1.0), -0.05)
            if groove and lvl >= 3:
                for st, v in PERC_STEPS:
                    if st == step:
                        put("perc", ts, conga(62 + tr if st in (3, 11) else 57 + tr, v),
                            -0.35 if st in (3, 11) else 0.35)
            if groove and lvl >= 5 and sub == 2:
                put("hats", ts, open_hat(rng, 1.0), 0.2)
        # log drum + sub
        stop_t = t0 + stop * six
        if groove:
            evs = [(t0 + st * six, root + o) for st, o in LOG_PATTERNS[lvl] if st < stop]
            for k, (ts, m) in enumerate(evs):
                nxt = evs[k + 1][0] if k + 1 < len(evs) else min(t0 + bar, stop_t)
                y, sw = log_drum(m, n_of(nxt - ts) + n_of(0.03), 1.0 if abs(ts - t0) < 1e-9 else 0.82)
                put("logdrum", ts, butter(y, "lowpass", 1200))
                put("sub", ts, sw)
        elif sec == "pre":
            ln = stop_t - t0
            t = np.arange(n_of(ln)) / SR
            s_ = np.sin(2 * np.pi * mtof(root - 12) * t) * adsr(len(t), 0.08, 0.12, max(0, len(t) - n_of(0.12)))
            put("sub", t0, 0.5 * s_)
        # motif (light plucks): intro, pre, first groove section, outro
        if sec in ("intro", "pre", "outro") or (groove and lvl == 1):
            tones = upper(chord)
            for st, k in MOTIF_STEPS:
                ts = t0 + st * six
                if st >= stop or ts >= p.duration or (groove and st not in (0, 8)):
                    continue
                if ts > p.duration - p.fade - 0.1:
                    continue  # nothing new starts inside the final fade
                m = tones[k] if n % 2 == 0 else tones[(k + 1) % 4]
                vel = 0.8 if st == 0 else 0.6
                put("motif", ts, ks_pluck(m, vel, rng, t60=1.4, dur=1.5, bright=2000), -0.15 if st % 8 else 0.15)
        # arpeggio
        if groove and lvl >= 2:
            tones = upper(chord)
            steps = ARP_STEPS_WARM if lvl == 3 else ARP_STEPS
            for k, st in enumerate(steps):
                ts = t0 + st * six
                if st >= stop or ts >= p.duration:
                    continue
                m = tones[(k + (n % 2)) % len(tones)]
                vel = (0.9 if st in (0, 8) else 0.65) * (0.8 if lvl == 3 else 1.0)
                put("arp", ts, ks_pluck(m, vel, rng, t60=1.1, dur=1.3, bright=1900 if lvl == 3 else 2600))

    # ---------------- hits, accents, risers
    def strum(t, chord, vel, spread=0.014, t60=2.4, dur=2.6, extra=()):
        notes = [CHORDS[chord]["bass"] + 12 + tr] + [m + tr for m in CHORDS[chord]["pad"]] + list(extra)
        for k, m in enumerate(notes):
            put("chord_hits", t + k * spread, ks_pluck(m, vel, rng, t60=t60, dur=dur, bright=2600),
                -0.35 + 0.7 * k / max(1, len(notes) - 1))

    b_drop, b_logo, b_res = S["b_drop"], S["b_logo"], S["b_res"]
    t_drop = t_of(b_drop)
    put("kick", t_drop, kick(rng, 1.15))
    put("sub", t_drop, 0.9 * sub_hit(CHORDS[bars[b_drop]["chord"]]["bass"] - 12 + tr))
    strum(t_drop, bars[b_drop]["chord"], 0.8)
    put("fx", t_drop, 0.5 * wash(rng, 1.6))
    riser = music_riser(rng, t_drop - t_of(b_drop - 1), p.bpm)     # one bar, into the drop
    put("fx", t_drop - len(riser) / SR, riser * 0.9)
    put("fx", S["t_of"](S["b_intro"]) - 2 * beat, swell(rng, 2 * beat, 3000) * 0.35)  # air into the voice entry
    for lb in S["lifts"]:
        if lb < (b_logo or b_res):
            put("fx", t_of(lb) - 2 * beat, swell(rng, 2 * beat, 3500) * 0.55)
    if b_logo is not None:
        t_logo = t_of(b_logo)
        put("fx", t_logo - beat, swell(rng, beat, 6500) * 1.0)
        put("kick", t_logo, kick(rng, 1.25))
        put("sub", t_logo, 1.2 * sub_hit(CHORDS[LOGO_CHORD]["bass"] - 12 + tr, 2.2))
        strum(t_logo, LOGO_CHORD, 1.0, spread=0.01, t60=3.0, dur=3.0, extra=(74 + tr,))
        put("fx", t_logo, wash(rng, 2.4))
    t_res = t_of(b_res)
    put("kick", t_res, kick(rng, 0.7))
    put("sub", t_res, 0.6 * sub_hit(CHORDS[bars[b_res]["chord"]]["bass"] - 12 + tr, 2.2))
    strum(t_res, bars[b_res]["chord"], 0.65, spread=0.03, t60=3.0, dur=3.0)
    for ab in S["accents"]:
        ta = t_of(ab)
        if ta >= p.duration:
            continue
        put("sub", ta, 0.35 * sub_hit(38 - 12 + tr, 1.6))
        strum(ta, bars[ab]["chord"], 0.45, spread=0.035, t60=2.6, dur=min(2.6, p.duration - ta))
        put("chord_hits", ta + 0.02, ks_pluck(86 + tr, 0.35, rng, t60=1.6, dur=min(1.8, p.duration - ta), bright=3500), 0.25)

    # ---------------- pads: common tones held across bar lines, M/S detuned saws
    wt = Wavetables(top=2800)
    note_bars: dict[int, set[int]] = {}
    for n, info in bars.items():
        notes = set(CHORDS[info["chord"]]["pad"])
        if info["level"] == 3:  # warmer world: add low body (root + fifth, octave 3)
            b_ = CHORDS[info["chord"]]["bass"]
            notes |= {b_ + 12, b_ + 19}
        if info["section"] in ("logo", "outro"):
            notes.add(74)
        for m in notes:
            note_bars.setdefault(m + tr, set()).add(n)
    mid = np.zeros(NT)
    side = np.zeros(NT)
    for m, bl_ in note_bars.items():
        bl_ = sorted(bl_)
        runs, cur = [], [bl_[0]]
        for x_ in bl_[1:]:
            if x_ == cur[-1] + 1:
                cur.append(x_)
            else:
                runs.append(cur)
                cur = [x_]
        runs.append(cur)
        for run in runs:
            ta = t_of(run[0])
            tb = min(p.duration, t_of(run[-1] + 1))
            rel = 1.0
            n = n_of(min(p.duration, tb + rel) - ta)
            if n <= 0:
                continue
            env = adsr(n, 0.3 if run[0] > 0 else 0.05, rel, min(n_of(tb - ta), n))
            vm = sum(wt.osc(m, n, c, rng.uniform()) for c in (-6.0, 0.0, 6.5)) / 3
            vs = (wt.osc(m, n, 11.0, rng.uniform()) - wt.osc(m, n, -12.0, rng.uniform())) / 2
            w = (0.9 if m >= 66 + tr else 1.0) * (0.55 if m < 55 + tr else 1.0)
            add_at(mid, ix(ta), vm * env * w)
            add_at(side, ix(ta), vs * env * w * 0.55)

    def cut_at(tq):
        tq = np.asarray(tq, dtype=float) - PRE
        out = np.empty_like(tq)
        for k, tv in enumerate(tq):
            n = int(math.floor((tv - p.offset) / bar)) + 1
            info = bars.get(n, bars[max(bars)] if n > max(bars) else bars[min(bars)])
            sec, lvl = info["section"], info["level"]
            if sec == "intro":
                base = 300 * (950 / 300) ** np.clip((tv + PRE) / (t_of(S["b_intro"]) + PRE), 0, 1)
            elif sec == "pre":
                base = 950 if n < b_drop - 1 else 950 * (1300 / 950) ** np.clip((tv - t_of(n)) / bar, 0, 1)
            elif sec == "outro":
                base = PAD_CUTOFF["outro"] * (0.6 ** np.clip((tv - t_res) / max(p.duration - t_res, 1e-3), 0, 1))
            elif sec == "logo":
                base = PAD_CUTOFF["logo"]
            else:
                base = PAD_CUTOFF[lvl]
            out[k] = base * (1 + 0.06 * math.sin(2 * math.pi * 0.09 * tv))
        return out
    el["pads"] = ms_to_lr(stft_filter(mid, lowpass_curve(cut_at)), stft_filter(side, lowpass_curve(cut_at)))

    # plucks: soft top end (smooth attacks, nothing bright under the voice)
    el["arp"] = butter(el["arp"], "lowpass", 5000, order=4)
    el["motif"] = butter(el["motif"], "lowpass", 4500, order=4)
    el["chord_hits"] = butter(el["chord_hits"], "lowpass", 6000, order=4)

    # ---------------- stops: duck sustained parts (pads, sub, motif tails) in the stop windows
    stop_env = np.ones(NT)
    r_out, r_in = n_of(0.02), n_of(0.01)
    for a, b in stops:
        i0, i1 = ix(a), ix(b)
        stop_env[i0:i1] = undb(-30)
        stop_env[i0 - r_out:i0] = np.linspace(1, undb(-30), r_out)        # 20 ms out, ending on the stop
        stop_env[i1:i1 + r_in] = np.linspace(undb(-30), 1, r_in)           # 10 ms back in from the downbeat
    for k in ("pads", "sub", "logdrum", "motif", "arp", "shaker"):
        el[k] *= stop_env[:, None]

    # ---------------- energy steps per section (+ one-beat crescendo into each change)
    gcurve = np.zeros(NT)
    prev = None
    for n in sorted(bars):
        g_ = LEVEL_GAIN_DB[bars[n]["level"]]
        i0, i1 = max(0, ix(t_of(n))), min(NT, ix(t_of(n + 1)))
        if i0 >= NT:
            break
        gcurve[i0:i1] = g_
        if prev is not None and g_ != prev and i0 > 0:
            # up: one-beat crescendo into the bar line; down: 30 ms glide after it
            if g_ > prev:
                r0 = max(0, i0 - n_of(beat))
                gcurve[r0:i0] = np.linspace(prev, g_, i0 - r0)
            else:
                r1 = min(NT, i0 + n_of(0.03))
                gcurve[i0:r1] = np.linspace(prev, g_, r1 - i0)
        prev = g_
    energy = 10 ** (gcurve / 20)

    # ---------------- trim pre-roll, balance by measured loudness
    cut = n_of(PRE)
    measured = {}
    for k in el:
        y = el[k] * (energy[:, None] if k not in ("fx", "chord_hits") else 1.0)
        el[k] = y
    ref = integrated_lufs(el["pads"][cut:], SR)
    for k, y in el.items():
        if np.max(np.abs(y[cut:])) <= 0:
            continue
        lk = integrated_lufs(y[cut:], SR)
        measured[k] = round(lk, 1)
        if np.isfinite(lk):
            el[k] = y * undb(ref + BALANCE_LU[k] - lk)

    # ---------------- reverb (returns live inside each stem, so stems sum to the mix)
    ir = reverb_ir(2.1, rng)
    stems = {s: np.zeros((NT, 2)) for s in ("drums", "bass", "keys", "arp")}
    for k, y in el.items():
        stems[STEM_OF[k]] += y
    stems["keys"] += 0.25 * convolve_st(el["pads"] + el["chord_hits"], ir)
    stems["arp"] += 0.35 * convolve_st((el["arp"] + el["motif"]).mean(axis=1), ir)
    stems["drums"] += 0.22 * convolve_st(el["rim"] + el["clap"] + 0.5 * el["perc"], ir)

    # ---------------- master: tidy lows, cut the pre-roll, fades, loudness
    fade = np.ones(N)
    fn = n_of(p.fade)
    fade[N - fn:] = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fn))
    fade[-1] = 0.0
    fin = n_of(0.01)  # 'already playing' at frame one: only a click-proof 10 ms ramp
    fade[:fin] *= np.linspace(0, 1, fin)
    for k in stems:
        y = remove_dc(butter(stems[k], "highpass", 28))[cut:cut + N]
        stems[k] = y * fade[:, None]
    mix = sum(stems.values())
    gain = undb(p.target_lufs - integrated_lufs(mix, SR))
    for k in stems:
        stems[k] *= gain
    mix = sum(stems.values())
    grid = grid_json(p, S, stops)
    grid["element_loudness_before_balance_lufs"] = measured
    out = {"mix": mix, "stems": stems, "grid": grid}
    if keep_elements:  # for debugging: every element after balance, pre-roll cut
        out["elements"] = {k: v[cut:cut + N] for k, v in el.items()}
    return out


def grid_json(p: MusicParams, S: dict, stops: list) -> dict:
    t_of, beat, bar = S["t_of"], S["beat"], S["bar"]
    bars_out, beats = [], []
    for n in sorted(S["bars"]):
        info = S["bars"][n]
        tb = t_of(n)
        if -1e-9 <= tb < p.duration - 1e-9:
            bars_out.append({"bar": n, "t": round(tb, 4), "chord": info["chord"], "section": info["section"],
                             **({"stop_from": round(tb + info["stop_step"] * beat / 4, 4)} if "stop_step" in info else {}),
                             **({"accent": True} if info.get("accent") else {})})
            for k in range(4):
                t = tb + k * beat
                if t < p.duration - 1e-9:
                    beats.append({"t": round(t, 4), "bar": n, "beat": k + 1})
    return {
        "bpm": p.bpm, "beat_s": round(beat, 6), "bar_s": round(bar, 6), "time_signature": "4/4",
        "offset_s": p.offset,
        "offset_note": "bar n (1-based) starts at offset_s + (n-1)*bar_s; beat k (0-based) at offset_s + k*beat_s",
        "key": "D major" if p.transpose == 0 else f"D major {p.transpose:+d} st",
        "markers": {"intro_end": round(t_of(S["b_intro"]), 4), "drop": round(t_of(S["b_drop"]), 4),
                    "lifts": [round(t_of(b), 4) for b in S["lifts"]],
                    "logo_hit": None if S["b_logo"] is None else round(t_of(S["b_logo"]), 4),
                    "resolve": round(t_of(S["b_res"]), 4), "accents": [round(t_of(b), 4) for b in S["accents"]],
                    "stops": [[round(a, 4), round(b, 4)] for a, b in stops],
                    "fade": [round(p.duration - p.fade, 4), round(p.duration, 4)]},
        "duration_s": round(p.duration, 6), "bars_in_file": S["last"],
        "warnings": S["warnings"],
        "bars": bars_out, "beats": beats, "params": asdict(p),
    }


# ============================================================ QA
def qa(mix: np.ndarray, stems: dict, grid: dict) -> dict:
    s_sum = sum(stems.values())
    edge = lambda y: float(np.max(np.abs(y)))  # noqa: E731
    sections, cur, start = [], None, 0.0
    for b in grid["bars"]:
        if b["section"] != cur:
            if cur is not None:
                sections.append((cur, start, b["t"]))
            cur, start = b["section"], b["t"]
    sections.append((cur, start, grid["duration_s"]))
    sec_l = {}
    for name, a, b in sections:
        seg = mix[n_of(a):n_of(b)]
        sec_l[f"{name} {a:.2f}-{b:.2f}"] = round(integrated_lufs(seg, SR), 1) if b - a >= 0.4 else None
    mom = short_loudness(mix, SR, 0.4, 0.05)
    def mom_at(t):
        return round(float(mom[min(len(mom) - 1, max(0, int((t - 0.4) / 0.05)))]), 1)
    mk = grid["markers"]
    hits = {}
    for name, t in [("drop", mk["drop"]), ("logo_hit", mk["logo_hit"]), ("resolve", mk["resolve"])]:
        if t is None:
            continue
        hits[name] = {"before": mom_at(t - 0.02), "after": mom_at(t + 0.35)}
    stop_lvl = []
    for a, b in mk["stops"]:
        seg = mix[n_of(a + 0.05):n_of(b - 0.02)]
        stop_lvl.append(round(db(np.sqrt(np.mean(seg ** 2))), 1) if len(seg) else None)
    return {
        "integrated_lufs": round(integrated_lufs(mix, SR), 2),
        "sample_peak_dbfs": round(sample_peak_db(mix), 2),
        "true_peak_dbtp": round(true_peak_db(mix, SR), 2),
        "clipping_samples": int(np.sum(np.abs(mix) >= 1.0)),
        "dc_offset": [float(f"{v:.1e}") for v in mix.mean(axis=0)],
        "spectral_centroid_hz": round(spectral_centroid(mix, SR)),
        "band_share_pct": {k: round(100 * band_energy_share(mix, SR, lo, hi), 2) for k, (lo, hi) in {
            "sub_<60": (0, 60), "low_60-300": (60, 300), "speech_300-3k": (300, 3000),
            "presence_3k-8k": (3000, 8000), "air_>8k": (8000, 24000)}.items()},
        "mono_compat": mono_compat(mix, SR),
        "click_scan": click_scan(mix, SR),
        "first_sample": edge(mix[:1]), "first_10ms_peak_dbfs": round(db(edge(mix[: n_of(0.01)])), 1),
        "level_at_0.1s_momentary_lufs": mom_at(0.4),
        "last_sample": edge(mix[-1:]), "last_100ms_peak_dbfs": round(db(edge(mix[-n_of(0.1):])), 1),
        "section_lufs": sec_l,
        "hits_momentary_lufs": hits,
        "stop_windows_rms_dbfs": stop_lvl,
        "stems_sum_error_max": float(np.max(np.abs(s_sum - mix))),
        "stem_lufs": {k: round(integrated_lufs(v, SR), 1) for k, v in stems.items() if np.max(np.abs(v)) > 0},
        "samples": len(mix), "duration_s": round(len(mix) / SR, 6),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="out")
    ap.add_argument("--timeline", help="timeline.json: take bpm and all markers from its 'music' block")
    ap.add_argument("--params", help="JSON with MusicParams fields (applied after --timeline)")
    for k in ("bpm", "offset", "duration", "intro_end", "drop", "logo_hit", "resolve", "fade", "target_lufs"):
        ap.add_argument(f"--{k.replace('_', '-')}", type=float)
    ap.add_argument("--lifts", type=float, nargs="*")
    ap.add_argument("--accents", type=float, nargs="*")
    ap.add_argument("--transpose", type=int)
    ap.add_argument("--seed", type=int)
    a = ap.parse_args()
    p = MusicParams.from_timeline(a.timeline) if a.timeline else MusicParams()
    if a.params:
        for k, v in json.loads(Path(a.params).read_text()).items():
            setattr(p, k, v)
    for k in ("bpm", "offset", "duration", "intro_end", "drop", "logo_hit", "resolve", "fade", "target_lufs",
              "lifts", "accents", "transpose", "seed"):
        v = getattr(a, k)
        if v is not None:
            setattr(p, k, v)
    out = Path(a.out)
    r = render(p)
    write_wav(out / "music.wav", r["mix"], SR, 24)
    for k, v in r["stems"].items():
        write_wav(out / "stems" / f"{k}.wav", v, SR, 24)
    write_json(out / "music_grid.json", r["grid"])
    q = qa(r["mix"], r["stems"], r["grid"])
    write_json(out / "music_qa.json", q)
    g = r["grid"]
    print(f"music: {g['duration_s']:.3f}s = {g['bars_in_file']} bars at {g['bpm']} BPM (bar {g['bar_s']:.4f}s), "
          f"offset {g['offset_s']}s")
    print("  markers:", json.dumps(g["markers"]))
    for w in g["warnings"]:
        print("  WARNING:", w)
    print("  QA:", json.dumps(q))


if __name__ == "__main__":
    main()
