"""Shared audio helpers for the Vallo launch-video audio toolkit.

Everything here is plain numpy/scipy plus ffmpeg (for decoding MP3 and for the
EBU R128 loudness report).  No audio is ever downloaded; all sound is either
the supplied voiceover or synthesized by the scripts in this folder.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48_000  # house sample rate for SFX, music and the final mix


# --------------------------------------------------------------------------- io
def ffmpeg_decode(path: str | os.PathLike, sr: int | None = None, channels: int = 1,
                  fmt: str = "f32le") -> tuple[np.ndarray, int]:
    """Decode any file ffmpeg understands. Returns (samples, sr).

    Samples are float32 in [-1, 1] (fmt f32le) or int16 (fmt s16le), shaped
    (n,) for mono and (n, ch) otherwise.  The encoder delay of MP3s is removed
    by ffmpeg (LAME/Xing gapless info), so t=0 is the first real sample: the
    same timeline a browser or ffmpeg-based renderer uses.
    """
    if sr is None:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
             "stream=sample_rate", "-of", "csv=p=0", str(path)],
            check=True, capture_output=True, text=True)
        sr = int(probe.stdout.strip().split(",")[0])
    cmd = ["ffmpeg", "-v", "error", "-nostdin", "-i", str(path), "-ac", str(channels),
           "-ar", str(sr), "-f", fmt, "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    dtype = np.float32 if fmt == "f32le" else np.int16
    x = np.frombuffer(raw, dtype=dtype).copy()
    if channels > 1:
        x = x.reshape(-1, channels)
    return x, sr


def read_audio(path: str | os.PathLike, sr: int = SR, channels: int | None = None) -> np.ndarray:
    """Read WAV/MP3/etc. as float64 at `sr` (resampling via ffmpeg if needed).

    Returns (n,) for mono or (n, ch).  `channels` forces mono/stereo."""
    path = str(path)
    if path.lower().endswith((".wav", ".flac")):
        x, fsr = sf.read(path, dtype="float64", always_2d=True)
        if fsr != sr:
            x = resample(x, fsr, sr)
    else:
        info = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
             "stream=channels", "-of", "csv=p=0", path], check=True, capture_output=True, text=True)
        ch = int(info.stdout.strip().split(",")[0])
        x, _ = ffmpeg_decode(path, sr=sr, channels=ch)
        x = np.asarray(x, dtype=np.float64).reshape(len(x), -1)
    if channels == 1 and x.shape[1] > 1:
        x = x.mean(axis=1, keepdims=True)
    elif channels == 2 and x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    return x[:, 0] if x.shape[1] == 1 else x


def resample(x: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    if sr_in == sr_out:
        return x
    g = np.gcd(sr_in, sr_out)
    return signal.resample_poly(x, sr_out // g, sr_in // g, axis=0)


def write_wav(path: str | os.PathLike, x: np.ndarray, sr: int = SR, bits: int = 24) -> None:
    """Write float audio as PCM WAV (24-bit by default). Refuses to clip silently."""
    x = np.asarray(x, dtype=np.float64)
    peak = float(np.max(np.abs(x))) if x.size else 0.0
    if peak > 1.0:
        raise ValueError(f"{path}: sample peak {peak:.4f} > 1.0 would clip")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), x, sr, subtype={16: "PCM_16", 24: "PCM_24", 32: "FLOAT"}[bits])


def write_json(path: str | os.PathLike, obj) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


# ---------------------------------------------------------------------- levels
def db(x: float) -> float:
    return 20.0 * np.log10(max(float(x), 1e-12))


def undb(d: float) -> float:
    return 10.0 ** (d / 20.0)


def as2d(x: np.ndarray) -> np.ndarray:
    return x[:, None] if x.ndim == 1 else x


def sample_peak_db(x: np.ndarray) -> float:
    return db(np.max(np.abs(x)))


def true_peak_db(x: np.ndarray, sr: int = SR) -> float:
    """BS.1770-style true peak: 4x oversampled (8x below 96 kHz/2) max |x|."""
    over = 4 if sr >= 88200 else 8 if sr < 44100 else 4
    y = signal.resample_poly(as2d(x), over, 1, axis=0)
    return db(np.max(np.abs(y)))


def integrated_lufs(x: np.ndarray, sr: int = SR) -> float:
    import pyloudnorm as pyln
    return float(pyln.Meter(sr).integrated_loudness(as2d(x)))


def ebur128_report(path: str | os.PathLike) -> dict:
    """Integrated loudness, true peak and loudness range via ffmpeg's loudnorm
    analyser (EBU R128 / BS.1770-4). Returns floats: I (LUFS), TP (dBTP), LRA (LU)."""
    out = subprocess.run(
        ["ffmpeg", "-v", "info", "-nostdin", "-i", str(path), "-af",
         "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True).stderr
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", out, re.S)
    if not m:
        raise RuntimeError("could not parse loudnorm output")
    j = json.loads(m.group(0))
    return {"I": float(j["input_i"]), "TP": float(j["input_tp"]), "LRA": float(j["input_lra"]),
            "threshold": float(j["input_thresh"])}


def rms_envelope_db(x: np.ndarray, sr: int, win: float = 0.02, hop: float = 0.01) -> tuple[np.ndarray, np.ndarray]:
    """RMS envelope in dBFS. Returns (times_of_window_centres, db)."""
    x = as2d(x).mean(axis=1)
    w, h = int(round(win * sr)), int(round(hop * sr))
    n = max(0, (len(x) - w) // h + 1)
    c = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    starts = np.arange(n) * h
    ms = (c[starts + w] - c[starts]) / w
    t = (starts + w / 2) / sr
    return t, 10 * np.log10(np.maximum(ms, 1e-20))


def silence_map(x: np.ndarray, sr: int, noise_db: float = -35.0, min_dur: float = 0.35):
    """Exact re-implementation of ffmpeg `silencedetect=noise=..:d=..` (mono).

    A sample is quiet when |x| < 10^(noise/20); a silence is a run of quiet
    samples at least `min_dur` long. Returns (silences, islands) as lists of
    (start_s, end_s)."""
    x = as2d(x)
    quiet = np.all(np.abs(x) < undb(noise_db), axis=1)
    edges = np.diff(np.concatenate([[0], quiet.astype(np.int8), [0]]))
    starts, ends = np.where(edges == 1)[0], np.where(edges == -1)[0]
    sil = [(s / sr, e / sr) for s, e in zip(starts, ends) if (e - s) >= min_dur * sr]
    isl, prev = [], 0.0
    total = len(x) / sr
    for s, e in sil:
        if s > prev:
            isl.append((prev, s))
        prev = e
    if prev < total:
        isl.append((prev, total))
    return sil, isl


# ---------------------------------------------------------------------- shaping
def fade_in(x: np.ndarray, n: int) -> np.ndarray:
    if n <= 0:
        return x
    n = min(n, len(x))
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
    y = x.copy()
    y[:n] = (as2d(y[:n]) * ramp[:, None]).reshape(y[:n].shape)
    return y


def fade_out(x: np.ndarray, n: int) -> np.ndarray:
    """Raised-cosine fade that lands on exactly 0.0 at the last sample."""
    if n <= 0:
        return x
    n = min(n, len(x))
    ramp = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n))
    ramp[-1] = 0.0
    y = x.copy()
    y[-n:] = (as2d(y[-n:]) * ramp[:, None]).reshape(y[-n:].shape)
    return y


def remove_dc(x: np.ndarray, sr: int = SR, cutoff: float = 12.0) -> np.ndarray:
    """Zero-phase 2nd-order high-pass (removes DC and sub-sonic drift) then
    subtracts any residual mean."""
    sos = signal.butter(2, cutoff, "highpass", fs=sr, output="sos")
    y = signal.sosfiltfilt(sos, x, axis=0)
    return y - y.mean(axis=0)


def pan_mono(x: np.ndarray, pan: float) -> np.ndarray:
    """Constant-power pan of a mono signal; pan in [-1 (left), +1 (right)]."""
    th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1) * np.sqrt(2)


def power_spectrum(m: np.ndarray, sr: int):
    """Short sounds (< ~0.7 s): un-windowed periodogram of the whole thing (they
    start and end at 0, so no leakage, and a Hann window would hide the attack).
    Longer material: Welch with 8192-point Hann segments."""
    if len(m) <= 4 * 8192:
        return signal.periodogram(m, sr, window="boxcar")
    return signal.welch(m, sr, nperseg=8192)


def spectral_centroid(x: np.ndarray, sr: int) -> float:
    f, p = power_spectrum(as2d(x).mean(axis=1), sr)
    return float(np.sum(f * p) / max(np.sum(p), 1e-30))


def band_energy_share(x: np.ndarray, sr: int, lo: float, hi: float) -> float:
    f, p = power_spectrum(as2d(x).mean(axis=1), sr)
    band = (f >= lo) & (f < hi)
    return float(p[band].sum() / max(p.sum(), 1e-30))


# K-weighting (BS.1770-4) biquads at 48 kHz
_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def k_weight(x: np.ndarray, sr: int = SR) -> np.ndarray:
    if sr != 48_000:
        x = resample(x, sr, 48_000)
    y = signal.lfilter(*_K1, as2d(x), axis=0)
    return signal.lfilter(*_K2, y, axis=0)


def short_loudness(x: np.ndarray, sr: int = SR, win: float = 0.1, hop: float = 0.01) -> np.ndarray:
    """K-weighted loudness (LUFS scale) over sliding windows - `win`=0.4 is
    EBU 'momentary', 3.0 is 'short-term'; 0.1 s suits short SFX."""
    y = k_weight(x, sr)
    fs = 48_000
    ms = np.sum(y ** 2, axis=1)
    c = np.concatenate([[0.0], np.cumsum(ms)])
    w, h = int(win * fs), int(hop * fs)
    if len(ms) < w:
        return np.array([-0.691 + 10 * np.log10(max(c[-1] / w, 1e-20))])
    st = np.arange(0, len(ms) - w + 1, h)
    return -0.691 + 10 * np.log10(np.maximum((c[st + w] - c[st]) / w, 1e-20))


def mono_compat(x: np.ndarray, sr: int = SR) -> dict:
    """Stereo mono-compatibility: L/R correlation, overall mono-sum change and
    the worst 1/3-octave band drop of (L+R)/2 versus the mean L/R power
    (identical channels 0 dB, uncorrelated -3 dB, comb filtering/phase issues
    show up as deep drops)."""
    x = as2d(x)
    if x.shape[1] < 2:
        return {"channels": 1}
    L, R = x[:, 0], x[:, 1]
    corr = float(np.corrcoef(L, R)[0, 1]) if np.std(L) > 0 and np.std(R) > 0 else 1.0
    M = (L + R) / 2
    f, pl = power_spectrum(L, sr)
    _, pr = power_spectrum(R, sr)
    _, pm = power_spectrum(M, sr)
    worst, worst_f = 0.0, None
    fc = 100.0
    while fc < 10_000:
        band = (f >= fc / 2 ** (1 / 6)) & (f < fc * 2 ** (1 / 6))
        ref = (pl[band].sum() + pr[band].sum()) / 2
        if band.any() and ref > 1e-14 * max(pl.sum(), 1e-30):
            d = 10 * np.log10(max(pm[band].sum(), 1e-30) / ref)
            if d < worst:
                worst, worst_f = d, fc
        fc *= 2 ** (1 / 3)
    overall = 10 * np.log10(max(np.mean(M ** 2), 1e-30) / max((np.mean(L ** 2) + np.mean(R ** 2)) / 2, 1e-30))
    return {"lr_correlation": round(corr, 3), "mono_sum_change_db": round(overall, 2),
            "worst_third_octave_drop_db": round(worst, 2),
            "worst_band_hz": None if worst_f is None else round(worst_f)}


def click_scan(x: np.ndarray, sr: int = SR, cutoff: float = 16_000, block: float = 0.001) -> dict:
    """Discontinuity (click) detector.

    A click is a step in the waveform: it puts an isolated broadband spike into
    the >16 kHz residue.  Per 1 ms block we take the residue peak and compare it
    (a) with the median residue of the surrounding +-10 ms (isolation: stationary
    bright material such as noise or reverb scores ~0-10 dB) and (b) with the
    full-band RMS around it (audibility).  A block counts as a click when it is
    > 20 dB above its neighbourhood AND no more than 40 dB below the local
    level.  Returns the count, the worst isolation ratio and where it is."""
    x2 = as2d(x)
    sos = signal.butter(8, cutoff, "highpass", fs=sr, output="sos")
    hp = np.max(np.abs(signal.sosfiltfilt(sos, x2, axis=0)), axis=1)
    b = int(block * sr)
    nb = len(hp) // b
    if nb < 3:
        return {"clicks": 0, "worst_isolation_db": None, "at_s": None}
    pk = hp[:nb * b].reshape(nb, b).max(axis=1)
    rms = np.sqrt(np.mean(np.mean(x2[:nb * b] ** 2, axis=1).reshape(nb, b), axis=1))
    k = 10
    pad_pk = np.pad(pk, k, mode="edge")
    pad_rms = np.pad(rms, 5, mode="edge")
    med = np.array([np.median(np.concatenate([pad_pk[i:i + k], pad_pk[i + k + 1:i + 2 * k + 1]]))
                    for i in range(nb)])
    loc = np.array([pad_rms[i:i + 11].max() for i in range(nb)])
    iso = 20 * np.log10(np.maximum(pk, 1e-15) / np.maximum(med, 1e-15))
    rel = 20 * np.log10(np.maximum(pk, 1e-15) / np.maximum(loc, 1e-15))
    audible = pk > 1e-6
    hits = (iso > 20) & (rel > -40) & audible
    i = int(np.argmax(np.where(audible, iso, -300)))
    return {"clicks": int(hits.sum()), "worst_isolation_db": round(float(iso[i]), 1),
            "at_s": round(i * block, 3),
            "first_click_s": round(float(np.argmax(hits)) * block, 3) if hits.any() else None}
