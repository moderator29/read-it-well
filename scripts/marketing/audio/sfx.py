#!/usr/bin/env python3
"""Deliverable 2 - synthesized UI / motion SFX kit for the Vallo launch video.

Every sound is built from sines, filtered noise, modal (damped-partial) models
and a synthetic reverb - nothing is sampled or downloaded, so the kit is
royalty-free by construction.  Tonal sounds are tuned to D major (the key of
the music bed) so they sit in the track.

Mastering applied to every file: DC removal, 0.5-1 ms raised-cosine attack
(first sample exactly 0), tail trimmed where it falls 70 dB below peak, a
raised-cosine fade to an exact 0.0 last sample, sample peak normalized to
-3.00 dBFS, written as 48 kHz / 24-bit WAV.

    python sfx.py --out out/sfx

Writes out/sfx/*.wav and out/sfx/index.json (duration, peaks, loudness,
high-frequency share, a description and a recommended gain under the voice).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from scipy import signal

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (SR, as2d, band_energy_share, click_scan, db, fade_in, fade_out,  # noqa: E402
                    mono_compat, pan_mono, remove_dc, sample_peak_db, short_loudness,
                    spectral_centroid, true_peak_db, undb, write_json, write_wav)

PEAK_DBFS = -3.0


# =============================================================== building blocks
def n_of(dur: float) -> int:
    return int(round(dur * SR))


def tt(dur: float) -> np.ndarray:
    return np.arange(n_of(dur)) / SR


def note(name: str) -> float:
    """'D5' -> Hz (A4 = 440)."""
    names = {"C": -9, "C#": -8, "Db": -8, "D": -7, "D#": -6, "Eb": -6, "E": -5, "F": -4, "F#": -3,
             "Gb": -3, "G": -2, "G#": -1, "Ab": -1, "A": 0, "A#": 1, "Bb": 1, "B": 2}
    pc, octv = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pc] + 12 * (octv - 4)) / 12)


def end_taper(y: np.ndarray, frac: float = 0.1, max_s: float = 0.03) -> np.ndarray:
    """Raised-cosine taper over the end so a finite-length source never stops
    mid-ring (a truncated ring is a click)."""
    m = max(2, min(int(len(y) * frac), n_of(max_s)))
    return fade_out(y, m)


def decay(dur: float, tau: float, attack: float = 0.001) -> np.ndarray:
    """Raised-cosine attack, exponential decay (time constant tau), and a taper
    that lands on exactly 0 at the end of `dur`."""
    t = tt(dur)
    env = np.exp(-np.maximum(t - attack, 0) / tau)
    na = max(1, n_of(attack))
    env[:na] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    return end_taper(env)


def chirp(f0: float, f1: float, dur: float, sweep: float, total: float | None = None,
          phase: float = 0.0) -> np.ndarray:
    """Sine whose frequency glides exponentially from f0 to f1 over `sweep` s,
    then holds f1 until `total` s."""
    t = tt(total or dur)
    k = np.clip(t / max(sweep, 1e-6), 0, 1)
    f = f0 * (f1 / f0) ** (1 - (1 - k) ** 2)  # fast start, eases into f1
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def modal(f0: float, ratios, amps, taus, dur: float, attack: float = 0.0015, rng=None,
          detune: float = 0.0) -> np.ndarray:
    """Sum of exponentially damped partials (bars, bells, glass)."""
    t = tt(dur)
    y = np.zeros_like(t)
    rng = rng or np.random.default_rng(0)
    for r, a, tau in zip(ratios, amps, taus):
        f = f0 * r * (1 + detune * rng.uniform(-1, 1))
        if f >= SR / 2 * 0.9:
            continue
        y += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
    return end_taper(fade_in(y, n_of(attack)))


def noise(dur: float, rng, color: str = "white") -> np.ndarray:
    n = n_of(dur)
    w = rng.standard_normal(n)
    if color == "pink":  # Voss-McCartney-ish via 1/f spectral shaping
        spec = np.fft.rfft(w)
        f = np.fft.rfftfreq(n, 1 / SR)
        spec[1:] /= np.sqrt(f[1:] / 20.0)
        spec[0] = 0
        w = np.fft.irfft(spec, n)
    return w / (np.std(w) + 1e-12)


def filt(x: np.ndarray, kind: str, freq, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, freq, kind, fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def resonator(x: np.ndarray, f: float, q: float) -> np.ndarray:
    """Constant-peak-gain 2-pole resonant band-pass (for clicks with a 'body')."""
    b, a = signal.iirpeak(f, q, fs=SR)
    return signal.lfilter(b, a, x)


def sweep_bandpass(x: np.ndarray, fc: np.ndarray, q: float, nfft: int = 1024) -> np.ndarray:
    """Time-varying band-pass via STFT: every frame gets a Gaussian (on a log
    frequency axis) centred on fc(t). `fc` is sampled per output sample."""
    hop = nfft // 4
    f, t, Z = signal.stft(x, SR, nperseg=nfft, noverlap=nfft - hop, boundary="even")
    idx = np.clip((t * SR).astype(int), 0, len(fc) - 1)
    centre = fc[idx][None, :]
    width = np.log2(1 + 1 / q)  # octaves at ~ -3 dB
    lf = np.log2(np.maximum(f, 1.0))[:, None]
    g = np.exp(-0.5 * ((lf - np.log2(centre)) / width) ** 2)
    _, y = signal.istft(Z * g, SR, nperseg=nfft, noverlap=nfft - hop, boundary=True)
    y = y[:len(x)]
    return np.pad(y, (0, len(x) - len(y)))


def glide(dur: float, points) -> np.ndarray:
    """Piecewise log-linear curve through (time_fraction, value) points."""
    t = np.linspace(0, 1, n_of(dur))
    xs = [p[0] for p in points]
    ys = np.log([p[1] for p in points])
    return np.exp(np.interp(t, xs, ys))


def env_curve(dur: float, points) -> np.ndarray:
    t = np.linspace(0, 1, n_of(dur))
    return np.interp(t, [p[0] for p in points], [p[1] for p in points])


def place(dst: np.ndarray, src: np.ndarray, at: float, gain: float = 1.0) -> np.ndarray:
    i = n_of(at)
    need = i + len(src)
    if need > len(dst):
        dst = np.concatenate([dst, np.zeros((need - len(dst),) + dst.shape[1:])])
    dst[i:i + len(src)] += gain * src
    return dst


def reverb_ir(t60: float, rng, predelay: float = 0.012, damp: float = 0.5, length: float | None = None,
              stereo: bool = True) -> np.ndarray:
    """Synthetic room: decorrelated noise with frequency-dependent exponential
    decay (lows last longer, highs die at `damp` x t60), unit energy."""
    n = n_of(length or t60 * 1.2)
    t = np.arange(n) / SR
    chans = []
    shared_low = filt(rng.standard_normal(n), "lowpass", 300)  # bass stays mono (no LF cancellation)
    for _ in range(2 if stereo else 1):
        w = rng.standard_normal(n)
        low = shared_low + filt(filt(w, "lowpass", 500), "highpass", 300)
        high = filt(w, "highpass", 3500)
        mid = filt(w, "bandpass", [500, 3500])
        y = (low * 10 ** (-3 * t / (t60 * 1.1)) + mid * 10 ** (-3 * t / t60)
             + 0.6 * high * 10 ** (-3 * t / (t60 * damp)))
        y = fade_in(y, n_of(0.004))
        y = np.concatenate([np.zeros(n_of(predelay)), y])
        chans.append(y)
    ir = np.stack(chans, axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / ir.shape[1])


def add_reverb(x: np.ndarray, ir: np.ndarray, wet_db: float, dry: float = 1.0) -> np.ndarray:
    x2 = as2d(x)
    if x2.shape[1] == 1:
        x2 = np.repeat(x2, ir.shape[1], axis=1)
    wet = np.stack([signal.fftconvolve(x2[:, c], ir[:, c]) for c in range(ir.shape[1])], axis=1)
    out = np.zeros_like(wet)
    out[:len(x2)] += dry * x2
    return out + undb(wet_db) * wet


def soft_sat(x: np.ndarray, drive: float = 1.5) -> np.ndarray:
    return np.tanh(drive * x) / np.tanh(drive)


# =============================================================== the sounds
# Each generator returns (audio, description, target) where target is the
# 100 ms K-weighted loudness peak (LUFS scale) the sound should reach under a
# voice normalized to -16 LUFS; the recommended gain is target - measured.
def modes(spec, dur: float, attack: float = 0.0004) -> np.ndarray:
    """Damped sinusoids [(freq, amp, tau), ...] - wood/plastic/metal 'tocks'."""
    t = tt(dur)
    y = sum(a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t) for f, a, tau in spec)
    return end_taper(fade_in(y, n_of(attack)))


def contact(dur: float, rng, lo: float, hi: float, tau: float = 0.0008) -> np.ndarray:
    return filt(noise(dur, rng), "bandpass", [lo, hi]) * decay(dur, tau, 0.0002)


def s_tap(rng):
    d = 0.2
    y = modes([(1150, 1.0, 0.009), (2700, 0.3, 0.0035)], d)
    y += 0.7 * chirp(320, 190, d, 0.012) * decay(d, 0.018, 0.0008)
    y += 0.12 * contact(d, rng, 2000, 5000)
    return filt(y, "lowpass", 6500), "Soft rounded UI tap: small wooden 'tock' with a light body", -29


def s_tap_soft(rng):
    d = 0.2
    y = modes([(720, 1.0, 0.010), (1650, 0.22, 0.005)], d, attack=0.0008)
    y += 0.6 * chirp(230, 150, d, 0.014) * decay(d, 0.02, 0.001)
    y += 0.06 * contact(d, rng, 1000, 2500)
    return filt(y, "lowpass", 4000, order=4), "Softer, duller tap for secondary touches", -31


def s_toggle(rng, up: bool):
    d = 0.3
    f0, f1 = (note("E5"), note("B5")) if up else (note("B5"), note("E5"))
    tone = chirp(f0, f1, d, 0.03) * decay(d, 0.05 if up else 0.042, 0.0015)
    tone += 0.18 * chirp(2 * f0, 2 * f1, d, 0.03) * decay(d, 0.02, 0.0015)
    clk = modes([(2400, 0.5, 0.003), (3900, 0.15, 0.002)], d)
    y = filt(tone + 0.5 * clk, "lowpass", 5000 if up else 3200)
    desc = ("Switch on: small click + rising fifth pip (E5 to B5)" if up
            else "Switch off: small click + falling, duller pip (B5 to E5)")
    return y, desc, -28


def s_pop(rng, low: bool):
    d = 0.35
    if low:
        y = chirp(230, 520, d, 0.03) * decay(d, 0.065, 0.0012)
        y += 0.4 * chirp(460, 1040, d, 0.03) * decay(d, 0.03, 0.0012)
        desc, tgt = "Lower, rounder bubble pop for larger elements appearing", -27
    else:
        y = chirp(380, 840, d, 0.022) * decay(d, 0.042, 0.0008)
        y += 0.25 * chirp(760, 1680, d, 0.022) * decay(d, 0.018, 0.0008)
        desc, tgt = "Bright bubble pop (upward chirp) for chips/badges appearing", -27
    y += 0.08 * contact(d, rng, 1000, 3000, 0.002)
    return filt(y, "lowpass", 5500), desc, tgt


def s_bubble_send(rng):
    d = 0.34
    sw_fc = glide(d, [(0, 900), (0.35, 3000), (1, 3000)])
    swoosh = sweep_bandpass(noise(d, rng, "pink"), sw_fc, 2.0) * env_curve(
        d, [(0, 0), (0.25, 1), (0.36, 0.2), (0.6, 0), (1, 0)])
    pop = chirp(460, 1180, 0.3, 0.03) * decay(0.3, 0.05, 0.001)
    pop += 0.2 * chirp(920, 2360, 0.3, 0.03) * decay(0.3, 0.02, 0.001)
    y = place(0.35 * swoosh, pop, 0.085)
    return pan_mono(filt(y, "lowpass", 6500), 0.15), "Message sent: short upward swoosh into a bubble pop", -26


def s_whoosh(rng, dur: float, lo: float, peak: float, end: float, pan=(-0.6, 0.6), layers=1):
    fc = glide(dur, [(0, lo), (0.55, peak), (1, end)])
    env = env_curve(dur, [(0, 0), (0.55, 1), (0.8, 0.35), (1, 0)]) ** 1.6
    y = sweep_bandpass(noise(dur, rng, "pink"), fc, 1.3) * env
    if layers > 1:  # darker body underneath for the long one
        y = y + 0.7 * sweep_bandpass(noise(dur, rng, "pink"), fc * 0.35, 1.0) * env
    y = filt(y, "lowpass", 7000, order=4)
    th = (np.linspace(pan[0], pan[1], len(y)) + 1) * np.pi / 4  # moving constant-power pan
    return np.stack([y * np.cos(th), y * np.sin(th)], axis=1) * np.sqrt(2)


def s_whoosh_short(rng):
    return (s_whoosh(rng, 0.35, 450, 2600, 900),
            "Short air whoosh, left-to-right (0.35 s) for quick transitions", -26)


def s_whoosh_long(rng):
    return (s_whoosh(rng, 0.8, 250, 2200, 600, pan=(-0.8, 0.8), layers=2),
            "Long, deeper whoosh, left-to-right (0.8 s) for scene changes", -25)


def s_swipe(rng):
    d = 0.22
    y = sweep_bandpass(noise(d, rng, "pink"), glide(d, [(0, 1200), (1, 4200)]), 1.8)
    y = filt(y * env_curve(d, [(0, 0), (0.3, 1), (1, 0)]) ** 1.3, "lowpass", 7000, order=4)
    th = (np.linspace(0.3, -0.5, len(y)) + 1) * np.pi / 4
    return (np.stack([y * np.cos(th), y * np.sin(th)], axis=1) * np.sqrt(2),
            "Light finger swipe, right-to-left, for carousels/swipes", -27)


def s_card_slide(rng):
    d = 0.3
    fr = sweep_bandpass(noise(d, rng, "pink"), glide(d, [(0, 700), (1, 1500)]), 1.2)
    grain = 1 + 0.25 * np.sin(2 * np.pi * 37 * tt(d)) * np.sin(2 * np.pi * 11 * tt(d))
    fr = fr * grain * env_curve(d, [(0, 0), (0.55, 1), (0.85, 0.4), (1, 0)])
    settle = modes([(520, 0.6, 0.02), (1300, 0.25, 0.008)], 0.2) + 0.7 * chirp(190, 130, 0.2, 0.02) * decay(0.2, 0.025, 0.001)
    y = place(0.55 * filt(fr, "lowpass", 2600), 0.8 * settle, 0.24)
    return pan_mono(y, 0.1), "Card sliding into place: soft friction ending on a light settle", -27


def bell(f0: float, dur: float, rng, bright: float = 1.0, tau: float = 0.55) -> np.ndarray:
    return modal(f0, [1, 2.0, 2.76, 4.07, 5.4], [1, 0.25 * bright, 0.12 * bright, 0.06 * bright, 0.035 * bright],
                 [tau, tau * 0.55, tau * 0.33, tau * 0.2, tau * 0.13], dur, attack=0.0012, rng=rng)


def s_chime_notify(rng):
    ir = reverb_ir(0.9, rng, predelay=0.015, damp=0.45)
    y = place(0.85 * bell(note("A5"), 1.4, rng, tau=0.4), bell(note("D6"), 1.4, rng, tau=0.5), 0.13)
    y = add_reverb(filt(y, "lowpass", 7000), ir, -14)
    return y, "Notification chime: two bell notes rising a fourth (A5 to D6), ~1.2 s tail", -25


def s_success(rng):
    ir = reverb_ir(0.8, rng, predelay=0.01, damp=0.4)
    y = np.zeros(1)
    for k, (nm, dt) in enumerate([("D5", 0.0), ("F#5", 0.085), ("A5", 0.17)]):
        f = note(nm)
        bar = modal(f, [1, 3.93, 9.2], [1, 0.22, 0.05], [0.24 if k < 2 else 0.4, 0.06, 0.02],
                    1.0, attack=0.001, rng=rng)
        mallet = filt(noise(1.0, rng), "lowpass", 1800) * decay(1.0, 0.004, 0.0005) * 0.12
        y = place(y, (bar + mallet) * (0.8 + 0.1 * k), dt)
    y = add_reverb(filt(y, "lowpass", 6500), ir, -16)
    return y, "Success: three rising marimba notes (D5 F#5 A5, a D-major arpeggio)", -25


def s_ding_pay(rng):
    ir = reverb_ir(1.0, rng, predelay=0.012, damp=0.5)
    y = bell(note("D6"), 1.6, rng, bright=1.2, tau=0.5)
    y += 0.25 * modal(note("A6"), [1, 2.0], [1, 0.2], [0.22, 0.1], 1.6, rng=rng)  # fifth shimmer on top
    y = add_reverb(filt(y, "lowpass", 7500), ir, -15)
    return y, "Payment 'ding': one bright bell (D6 with a fifth shimmer), clean decay", -24


def s_sparkle(rng):
    d = 0.75
    y = np.zeros((n_of(d), 2))
    pent = ["D7", "E7", "F#7", "A7", "B7", "D8", "E8"]
    for t0 in np.sort(rng.beta(1.6, 2.4, 14) * 0.5):
        f = note(pent[rng.integers(len(pent))])
        ping = np.sin(2 * np.pi * f * tt(0.3)) * decay(0.3, rng.uniform(0.04, 0.09), 0.001)
        y = place(y, pan_mono(ping * rng.uniform(0.4, 1.0), rng.uniform(-0.8, 0.8)), float(t0))
    shape = env_curve(d, [(0, 0), (0.3, 1), (1, 0)]) ** 2
    air = np.stack([filt(noise(d, rng), "highpass", 6000), filt(noise(d, rng), "highpass", 6000)], axis=1)
    y[:len(air)] += 0.05 * air * shape[:, None]  # independent L/R air: no comb filtering in mono
    ir = reverb_ir(0.7, rng, predelay=0.008, damp=0.6)
    return add_reverb(y, ir, -12), "Short shimmer: high D-major pentatonic pings with a little air", -27


def s_stamp(rng):
    d = 0.4
    thud = soft_sat(chirp(150, 90, d, 0.04) * decay(d, 0.045, 0.0015), 2.0)
    slap = filt(noise(d, rng), "bandpass", [300, 1500]) * decay(d, 0.016, 0.001)
    rubber = modes([(520, 1.0, 0.028), (1250, 0.4, 0.011), (2050, 0.12, 0.006)], d, attack=0.001)
    clk = modes([(2600, 1.0, 0.004), (4100, 0.3, 0.002)], 0.05)
    y = 0.6 * thud + 0.9 * slap + 0.7 * rubber
    y = place(y, 0.4 * clk, 0.003)
    ir = reverb_ir(0.22, rng, predelay=0.005, damp=0.5)
    y = add_reverb(filt(y, "lowpass", 6000), ir, -16)
    return y, "Badge stamp: soft rubber thud with a small contact click", -24


def s_impact_soft(rng):
    d = 1.5
    sub = soft_sat(chirp(68, 43, d, 0.25) * decay(d, 0.32, 0.003), 1.4)
    chord = sum(a * np.sin(2 * np.pi * note(n) * tt(d) + rng.uniform(0, 6.28))
                for n, a in [("D2", 0.45), ("A2", 0.35), ("D3", 0.35), ("F#3", 0.25), ("A3", 0.22),
                             ("D4", 0.16), ("F#4", 0.1), ("A4", 0.07), ("D5", 0.04)])
    chord = filt(chord * decay(d, 0.42, 0.004), "lowpass", 2500)
    # felt-mallet 'whomp' so the hit still reads on phone speakers (no sub there)
    whomp = modes([(310, 1.0, 0.07), (720, 0.5, 0.035), (1350, 0.2, 0.015)], d, attack=0.002)
    hit = filt(noise(d, rng, "pink"), "lowpass", 3000) * decay(d, 0.03, 0.001)
    y = 0.9 * sub + 0.55 * chord + 0.55 * whomp + 0.4 * hit
    ir = reverb_ir(1.1, rng, predelay=0.018, damp=0.35)
    y = add_reverb(filt(y, "lowpass", 5000), ir, -11)
    return y, "Deep, warm logo hit: sub drop + soft D-major body + short dark reverb (~1.5 s)", -19


def s_riser(rng, bpm: float = 104.0):
    d = 2.5
    t = tt(d)
    prog = t / d
    amp = (10 ** (-30 * (1 - prog) / 20)) * (0.2 + 0.8 * prog ** 1.5)
    fc = glide(d, [(0, 350), (1, 5000)])
    nzL = sweep_bandpass(noise(d, rng, "pink"), fc, 1.4)  # independent L/R noise:
    nzR = sweep_bandpass(noise(d, rng, "pink"), fc, 1.4)  # wide but mono-safe
    f = note("D3") * 2 ** (prog ** 1.7)  # D3 -> D4 glide
    ton = np.zeros_like(t)
    for det in (-0.006, 0.0, 0.0065):
        ph = 2 * np.pi * np.cumsum(f * (1 + det)) / SR
        for h in range(1, 9):
            ton += np.sin(h * ph) / h * np.exp(-h * (1.2 - prog) * 0.9)
    ton /= 3
    six = 60 / bpm / 4  # 16th-note pulse locked to the grid counted back from the end
    rate = np.where(prog < 0.6, 1.0, 2.0)
    pulse = 0.72 + 0.28 * np.cos(2 * np.pi * (d - t) / six * rate)
    L = (0.55 * nzL + 0.5 * ton) * amp * pulse
    R = (0.55 * nzR + 0.5 * ton) * amp * pulse
    y = filt(np.stack([L, R], axis=1), "lowpass", 7000, order=4)
    return y, ("Build-up riser 2.5 s (noise + gliding D3-D4 tone, 16th pulses at 104 BPM), loudest at "
               "the very end and cut off there - place its END on the downbeat (t_start = downbeat - 2.5)"), -21


def s_counter_tick(rng):
    d = 0.08
    y = modes([(2200, 1.0, 0.004), (4700, 0.2, 0.002), (1100, 0.35, 0.005)], d)
    return filt(y, "lowpass", 7000), "Tiny soft tick for number count-ups (drop 3-6 dB more for very fast runs)", -32


def s_type_key(rng, k: int):
    r = np.random.default_rng(100 + k)
    d = 0.16
    f1 = r.uniform(1400, 2400)
    y = modes([(f1, 1.0, r.uniform(0.004, 0.007)), (f1 * r.uniform(2.3, 2.9), 0.4, 0.003)], d)
    fb = r.uniform(180, 260)
    y += 0.35 * chirp(fb, fb * 0.7, d, 0.01) * decay(d, 0.012, 0.0008)
    y += 0.2 * contact(d, rng, 2000, 6000, 0.0006)
    if k % 2 == 0:  # key release on some variants
        y = place(y, 0.35 * modes([(f1 * 1.15, 1.0, 0.003)], 0.05), r.uniform(0.04, 0.065))
    return filt(y, "lowpass", 7000), f"Quiet keyboard click, variant {k} (cycle 1-6 for typing)", -32


def s_lock_click(rng):
    d = 0.2
    c1 = modes([(3100, 1.0, 0.003), (5200, 0.3, 0.002)], d) + 0.3 * contact(d, rng, 2500, 6000, 0.0005)
    c2 = modes([(1050, 1.0, 0.012), (2300, 0.4, 0.006)], d) + 0.5 * chirp(200, 150, d, 0.01) * decay(d, 0.02, 0.001)
    y = place(0.6 * c1, c2, 0.042)
    return filt(y, "lowpass", 7000), "Secure lock click: two-stage latch (tick then soft clunk)", -28


def s_glass_clink(rng):
    y = modal(1580, [1, 2.32, 4.25, 4.9], [1, 0.45, 0.18, 0.08], [0.13, 0.07, 0.04, 0.03], 0.4,
              attack=0.0006, rng=rng, detune=0.002)
    y += 0.1 * contact(0.4, rng, 2000, 6000, 0.0015)
    ir = reverb_ir(0.35, rng, predelay=0.006, damp=0.6)
    return add_reverb(filt(y, "lowpass", 7800), ir, -18), "Tiny glass clink (restaurant/dining moments)", -27


def s_heartbeat_soft(rng):
    d = 0.75

    def beat(f0, f1, tau):
        b = chirp(f0, f1, 0.35, 0.05) * decay(0.35, tau, 0.004)
        b += 0.35 * chirp(2.4 * f0, 2.4 * f1, 0.35, 0.05) * decay(0.35, tau * 0.5, 0.004)
        b += 0.3 * filt(noise(0.35, rng), "lowpass", 300) * decay(0.35, tau * 0.6, 0.004)
        b = soft_sat(b, 2.2)
        return b + 0.5 * modes([(185, 1.0, 0.03), (390, 0.6, 0.02), (620, 0.25, 0.01)], 0.35, attack=0.003)
    y = place(np.zeros(n_of(d)), beat(62, 44, 0.07), 0.0)
    y = place(y, beat(70, 50, 0.06), 0.27, 0.75)
    return (filt(y, "lowpass", 1500), "Soft heartbeat (lub-dub), optional emotional beat; sub-heavy, so it is "
            "felt more than heard on phone speakers", -26)


GENERATORS = {
    "tap": s_tap,
    "tap_soft": s_tap_soft,
    "toggle_on": lambda r: s_toggle(r, True),
    "toggle_off": lambda r: s_toggle(r, False),
    "pop": lambda r: s_pop(r, False),
    "pop_low": lambda r: s_pop(r, True),
    "bubble_send": s_bubble_send,
    "whoosh_short": s_whoosh_short,
    "whoosh_long": s_whoosh_long,
    "swipe": s_swipe,
    "card_slide": s_card_slide,
    "chime_notify": s_chime_notify,
    "success": s_success,
    "ding_pay": s_ding_pay,
    "sparkle": s_sparkle,
    "stamp": s_stamp,
    "impact_soft": s_impact_soft,
    "riser": s_riser,
    "counter_tick": s_counter_tick,
    **{f"type_key_{k}": (lambda r, k=k: s_type_key(r, k)) for k in range(1, 7)},
    "lock_click": s_lock_click,
    "glass_clink": s_glass_clink,
    "heartbeat_soft": s_heartbeat_soft,
}
# sounds whose END matters (riser): keep the full length, only a tiny fade-out
HARD_END = {"riser": 0.006}


# =============================================================== mastering + QA
def master(name: str, x: np.ndarray) -> np.ndarray:
    x = remove_dc(np.asarray(x, dtype=np.float64))
    x2 = as2d(x)
    peak = np.max(np.abs(x2))
    env = np.max(np.abs(x2), axis=1)
    if name not in HARD_END:  # trim the tail where it falls 60 dB under the peak
        above = np.where(env > peak * undb(-60))[0]
        end = min(len(x2), above[-1] + n_of(0.01)) if len(above) else len(x2)
        x2 = x2[:end]
        fo = min(n_of(0.04), max(n_of(0.005), len(x2) // 4))
    else:
        fo = n_of(HARD_END[name])
    env = np.max(np.abs(x2), axis=1)
    first = int(np.argmax(env > peak * undb(-60)))  # no leading silence
    x2 = x2[first:]
    x2 = fade_in(x2, n_of(0.003 if name in ("whoosh_long", "riser", "sparkle") else 0.0008))
    x2 = fade_out(x2, fo)
    w = np.hanning(len(x2))  # remove residual DC with a window that keeps both ends at 0
    x2 = x2 - x2.mean(axis=0) * (w / w.mean())[:, None]
    x2 *= undb(PEAK_DBFS) / np.max(np.abs(x2))
    x2[0] = 0.0
    x2[-1] = 0.0
    return x2[:, 0] if x2.shape[1] == 1 else x2


def qa_row(name: str, x: np.ndarray, desc: str, target: float) -> dict:
    x2 = as2d(x)
    mono = x2.mean(axis=1)
    placed = np.repeat(x2, 2, axis=1) if x2.shape[1] == 1 else x2  # as mix.py places it (centred)
    sl = short_loudness(placed, SR, 0.1, 0.005)
    peak100 = float(sl.max())
    env = np.max(np.abs(x2), axis=1)
    lead = int(np.argmax(env > undb(PEAK_DBFS - 40)))
    pk_i = int(np.argmax(env))
    after = np.where(env[pk_i:] > undb(PEAK_DBFS - 40))[0]
    tail40 = (pk_i + after[-1]) / SR if len(after) else 0.0
    row = {
        "file": f"{name}.wav",
        "duration_s": round(len(x2) / SR, 3),
        "channels": x2.shape[1],
        "peak_dbfs": round(sample_peak_db(x2), 2),
        "true_peak_dbtp": round(true_peak_db(x2, SR), 2),
        "loudness_peak_100ms_lufs": round(peak100, 1),
        "recommended_gain_db": round(target - peak100, 1),
        "description": desc,
        "qa": {
            "dc_offset": float(f"{float(np.abs(x2.mean(axis=0)).max()):.1e}"),
            "first_sample": float(np.abs(x2[0]).max()), "last_sample": float(np.abs(x2[-1]).max()),
            "attack_ms_to_-40dB_under_peak": round(1000 * lead / SR, 2),
            "audible_until_s_(-40dB)": round(tail40, 3),
            "tail_last5ms_rms_dbfs": round(db(np.sqrt(np.mean(x2[-n_of(0.005):] ** 2))), 1),
            "click_scan": click_scan(x2, SR),
            "energy_above_8k_pct": round(100 * band_energy_share(mono, SR, 8000, SR / 2), 3),
            "energy_600_4k_pct": round(100 * band_energy_share(mono, SR, 600, 4000), 1),
            "spectral_centroid_hz": round(spectral_centroid(mono, SR)),
        },
    }
    hp300 = signal.sosfilt(signal.butter(4, 300, "highpass", fs=SR, output="sos"), x2, axis=0)
    row["qa"]["phone_speaker_loss_db"] = round(float(short_loudness(hp300, SR, 0.1, 0.005).max()) - peak100, 1)
    if x2.shape[1] == 2:
        row["qa"]["mono_compat"] = mono_compat(x2, SR)
    return row


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="out/sfx")
    ap.add_argument("--only", nargs="*", help="render just these names")
    ap.add_argument("--bpm", type=float, default=104.0, help="tempo the riser pulses lock to")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for k, (name, gen) in enumerate(GENERATORS.items()):
        if a.only and name not in a.only:
            continue
        rng = np.random.default_rng(1000 + k)
        if name == "riser":
            y, desc, tgt = s_riser(rng, a.bpm)
        else:
            y, desc, tgt = gen(rng)
        y = master(name, y)
        write_wav(out / f"{name}.wav", y, SR, 24)
        row = qa_row(name, y, desc, tgt)
        rows.append(row)
        q = row["qa"]
        mc = q.get("mono_compat", {})
        print(f"{name:15s} {row['duration_s']:6.3f}s ch{row['channels']} pk {row['peak_dbfs']:6.2f} "
              f"tp {row['true_peak_dbtp']:6.2f} L100 {row['loudness_peak_100ms_lufs']:6.1f} "
              f"gain {row['recommended_gain_db']:6.1f} >8k {q['energy_above_8k_pct']:6.3f}% "
              f"mid {q['energy_600_4k_pct']:5.1f}% cent {q['spectral_centroid_hz']:5d} "
              f"clicks {q['click_scan']['clicks']} ({q['click_scan']['worst_isolation_db']}) dc {q['dc_offset']:.0e} "
              f"aud {q['audible_until_s_(-40dB)']:.2f} phone {q['phone_speaker_loss_db']:5.1f}"
              + (f" mono {mc['worst_third_octave_drop_db']:5.1f}dB@{mc['worst_band_hz']} r={mc['lr_correlation']:.2f}" if mc else ""))
    index = {
        "format": "48 kHz, 24-bit PCM WAV",
        "peak_normalization_dbfs": PEAK_DBFS,
        "gain_note": ("recommended_gain_db = target - loudness_peak_100ms_lufs, where the loudness is the "
                      "K-weighted 100 ms window (the ear's integration time for short sounds) measured as the "
                      "file sits in a stereo mix (mono files centred). Targets assume the voice normalized to "
                      "-16 LUFS as mix.py does before its -14 LUFS master (its median 100 ms loudness is then "
                      "about -16): UI taps/clicks/ticks land 13-16 LU under the voice, pops and toggles ~12, "
                      "swipes/slides/whooshes 9-11, chimes/dings ~9, the badge stamp ~8, the riser's end ~5 "
                      "and the logo hit ~3 LU under. Film builds can override per event with gain_db."),
        "files": rows,
    }
    if not a.only:
        write_json(out / "index.json", index)
    print(f"\nwrote {len(rows)} sounds to {out}")


if __name__ == "__main__":
    main()
