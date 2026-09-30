#!/usr/bin/env python3
"""Deliverable 4 - voice + music + SFX mixer for the Vallo launch films.

Chain (all 48 kHz):
  voice   plan segments placed on the film timeline (edges widened into the
          surrounding silence by <= 20/60 ms, 5 ms fades), 70 Hz high-pass,
          leveller (2.5:1, 5/120 ms) + true-peak limiter at loudness + 11 dB,
          -16 LUFS as a centred stereo track
  music   bed at its rendered level (-20 LUFS), ducked under the voice by a
          look-ahead sidechain envelope follower: -9 dB, attack 60 ms, hold
          250 ms (gaps between words never release), release 450 ms, plus a
          25 ms smoother, so it breathes between sentences but never pumps
  sfx     each cue at its gain/pan: offset_db relative to the kit's
          recommended_gain_db (sfx/index.json; 0 = calibrated level) or an
          absolute gain_db override; then a HARD CAP per cue before summing:
          no cue louder than the voice minus 6 LU (max K-weighted loudness
          over 100 ms windows, against the voice as the mixer sets it,
          -16 LUFS; the ducked music plays no part). Every capped cue is
          logged (name, t, dB taken off) and counted in the reports. A bed
          check then verifies that the effects bus never exceeds the music
          bed at the same moment by more than the kit intends (the same cues
          at offset 0), in 100 ms windows, tolerance 0.5 LU.
  master  mild bus compression (1.6:1, soft knee, top 20 % of the programme)
          -> true-peak limiter (4x oversampled, look-ahead, -1.0 dBTP) and
          gain iterated to -14.0 LUFS integrated (pyloudnorm)

Outputs in --out:
  final_mix.wav/.m4a   voice + ducked music + SFX, -14 LUFS, <= -1 dBTP
  music_only.wav/.m4a  music + SFX, no voice (no ducking), same normalization
  music_bed.wav/.m4a   the pure bed at its rendered -20 LUFS (--bed-lufs to change)
  *_report.json        loudness report for each (integrated, true peak, LRA,
                       ffmpeg EBU R128 cross-check, clicks, sfx_capped_count;
                       the final mix also has voice/ducking/bus/limiter stats,
                       every placed cue, the capped cues and the bed check)
  mix_stems/           voice, ducked music and SFX at the final gain (pre-bus)
  M4A is AAC 256k; if AAC overshoots the ceiling it is re-encoded from a copy
  re-limited just below it, so the M4A is also <= -1 dBTP.

Voice plan: timeline.json ({"voice": {"plan": [...]}}), a JSON list, or
{"segments": [...]}, each {"src_start", "src_end", "dst_start"} (+ any extra
keys such as "i"): a piece of the voice file (source seconds) placed at
dst_start on the film timeline. `mix.py plan` builds one from timings.json
(cut mid-pause; --gap-after 2:0.5 adds 0.5 s after sentence 2); `mix.py
shift` moves timings.json onto the film timeline for captions.

SFX cues: JSON list, as the film engine writes them:
    {"name": "tap", "t": 12.34, "offset_db": 0, "pan": 0.0}
offset_db is dB relative to that sound's recommended_gain_db (default 0);
"gain_db" is an absolute override and wins if present; pan -1..1 (mono files:
constant-power pan, stereo files: balance). Instead of "t", a cue may be
anchored to timeline.json's words/sentences: {"name": "stamp", "word":
"verified", "sentence": 13, "offset": 0.0} or {"sentence": 21, "anchor": "start"}.

    python mix.py mix --voice voice.mp3 --timeline ../video/timeline.json --music out/music.wav \
                      --sfx-events events.json --sfx-dir out/sfx --timings out/timings.json --out out
    python mix.py mix ... --music-auto          # render the bed from the timeline markers first
    python mix.py plan  --timings out/timings.json --intro 3.0 --gap-after 2:0.5 --out plan.json
    python mix.py shift --timings out/timings.json --plan plan.json --out out/final_timings.json
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (SR, as2d, click_scan, db, ebur128_report, integrated_lufs, read_audio,  # noqa: E402
                    sample_peak_db, short_loudness, true_peak_db, undb, write_json, write_wav)

VOICE_LUFS = -16.0
TARGET_LUFS = -14.0
CEILING_DBTP = -1.0


# ================================================================ voice plan
def load_plan(path_or_obj) -> list[dict]:
    """Voice plan from a list, {"segments": [...]}, a plan JSON file, or a
    timeline.json ({"voice": {"plan": [...]}}). Extra keys (e.g. "i") are kept."""
    obj = path_or_obj
    if isinstance(path_or_obj, (str, Path)):
        obj = json.loads(Path(path_or_obj).read_text())
    if isinstance(obj, dict) and "voice" in obj:
        obj = obj["voice"]["plan"]
    segs = obj["segments"] if isinstance(obj, dict) else obj
    out = []
    for s in segs:
        d = dict(s)
        d.update(src_start=float(s["src_start"]), src_end=float(s["src_end"]), dst_start=float(s["dst_start"]))
        if d["src_end"] <= d["src_start"]:
            raise ValueError(f"segment with src_end <= src_start: {s}")
        out.append(d)
    return sorted(out, key=lambda d: d["dst_start"])


def make_plan(timings: dict, intro: float = 3.0, extra_gaps: dict[int, float] | None = None) -> dict:
    """One segment per sentence group, cut mid-pause between sentences.
    extra_gaps: {sentence_i: seconds} inserted after that sentence."""
    extra_gaps = extra_gaps or {}
    sents = timings["sentences"]
    dur = timings["duration"]
    cuts = [0.0]
    for a, b in zip(sents[:-1], sents[1:]):
        if a["i"] in extra_gaps:
            cuts.append(round((a["end"] + b["start"]) / 2, 3))
    cuts.append(dur)
    segs, shift = [], intro
    for k, (s0, s1) in enumerate(zip(cuts[:-1], cuts[1:])):
        segs.append({"src_start": s0, "src_end": s1, "dst_start": round(s0 + shift, 3)})
        # the gap belongs to the sentence ending just before cut s1
        before = [s for s in sents if s["end"] <= s1]
        if k < len(cuts) - 2 and before:
            shift += extra_gaps.get(before[-1]["i"], 0.0)
    return {"note": f"intro {intro}s; extra gaps after sentences {extra_gaps}", "segments": segs}


def shift_time(t: float, plan: list[dict]) -> float:
    """Map a voice-file time to the video timeline. Times inside a cut-out
    region snap to the nearest kept edge."""
    best, bd = None, float("inf")
    for s in plan:
        if s["src_start"] - 1e-9 <= t <= s["src_end"] + 1e-9:
            return s["dst_start"] + (t - s["src_start"])
        for edge in (s["src_start"], s["src_end"]):
            if abs(t - edge) < bd:
                bd, best = abs(t - edge), s["dst_start"] + (edge - s["src_start"])
    return best


def shift_timings(timings: dict, plan: list[dict]) -> dict:
    """Return a copy of timings.json with every sentence/word/phrase time moved
    onto the video timeline defined by the voice plan."""
    out = json.loads(json.dumps(timings))
    for key in ("sentences", "words", "phrases"):
        for item in out.get(key, []):
            item["start"] = round(shift_time(item["start"], plan), 3)
            item["end"] = round(shift_time(item["end"], plan), 3)
    out["duration"] = round(max(s["dst_start"] + s["src_end"] - s["src_start"] for s in plan), 3)
    out["timeline"] = "video (shifted by voice plan)"
    out["voice_plan"] = plan
    for k in ("silence_map", "qa"):
        out.pop(k, None)
    out["notes"] = ("Shifted copy of timings.json: all times are on the video timeline. "
                    + timings.get("notes", ""))
    return out


def write_srt(path: Path, sentences: list[dict], hold: float = 0.4):
    def ts(t):
        ms = int(round(max(t, 0) * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    lines = []
    for n, s in enumerate(sentences):
        end = s["end"] + hold
        if n + 1 < len(sentences):
            end = min(end, sentences[n + 1]["start"] - 0.04)
        lines += [str(n + 1), f"{ts(s['start'])} --> {ts(max(end, s['end']))}", s["text"], ""]
    path.write_text("\n".join(lines), encoding="utf-8")


# ================================================================ building blocks
def place_voice(voice: np.ndarray, plan: list[dict], total: int, pre: float = 0.02, post: float = 0.06,
                fade: float = 0.005) -> np.ndarray:
    """Copy each plan segment of the voice file onto the timeline. Segments
    are widened by up to `pre`/`post` s of the (near-silent) surrounding audio
    so natural onsets and decays survive - never into another segment's source
    or destination range - and every edge gets a 5 ms raised-cosine fade."""
    out = np.zeros(total)
    nf = int(fade * SR)
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, nf))
    for s in plan:
        ln = s["src_end"] - s["src_start"]
        others = [o for o in plan if o is not s]
        lo_src = max([o["src_end"] for o in others if o["src_end"] <= s["src_start"] + 1e-9], default=0.0)
        hi_src = min([o["src_start"] for o in others if o["src_start"] >= s["src_end"] - 1e-9], default=len(voice) / SR)
        lo_dst = max([o["dst_start"] + o["src_end"] - o["src_start"] for o in others
                      if o["dst_start"] + o["src_end"] - o["src_start"] <= s["dst_start"] + 1e-9], default=-1e9)
        hi_dst = min([o["dst_start"] for o in others if o["dst_start"] >= s["dst_start"] + ln - 1e-9], default=1e9)
        pre_e = max(0.0, min(pre, s["src_start"] - lo_src, s["dst_start"] - lo_dst))
        post_e = max(0.0, min(post, hi_src - s["src_end"], hi_dst - (s["dst_start"] + ln)))
        a = int(round((s["src_start"] - pre_e) * SR))
        b = min(len(voice), int(round((s["src_end"] + post_e) * SR)))
        seg = voice[a:b].copy()
        if len(seg) > 2 * nf:
            seg[:nf] *= ramp
            seg[-nf:] *= ramp[::-1]
        d = int(round((s["dst_start"] - pre_e) * SR))
        if d >= total or d + len(seg) <= 0:
            continue
        if d < 0:
            seg, d = seg[-d:], 0
        e = min(total, d + len(seg))
        out[d:e] += seg[: e - d]
    return out


def voice_chain(v: np.ndarray, target_lufs: float = -16.0) -> tuple[np.ndarray, dict]:
    """Broadcast-style VO dynamics before the bus: a gentle leveller (2.5:1 on
    the loudest 30 % of syllables, 5 ms/120 ms) and a true-peak limiter at
    loudness + 11 dB, so the master limiter is not doing the voice's job
    (the ElevenLabs file has a 17.8 dB peak-to-loudness ratio)."""
    st = lambda y: np.stack([y, y], axis=1)  # noqa: E731  (centred: identical L/R)
    v = v * undb(target_lufs - integrated_lufs(st(v), SR))
    plr_in = true_peak_db(st(v), SR) - target_lufs
    y2, gr, thr = bus_compressor(st(v), threshold_db=None, ratio=2.5, knee_db=6.0, attack=0.005, release=0.12,
                                 percentile=70)
    y = y2[:, 0] * undb(target_lufs - integrated_lufs(y2, SR))
    y2, lim = true_peak_limiter(st(y), ceiling_db=target_lufs + 11.0, attack=0.0015, hold=0.02)
    y = y2[:, 0] * undb(target_lufs - integrated_lufs(y2, SR))
    info = {"plr_in_db": round(plr_in, 1), "plr_out_db": round(true_peak_db(st(y), SR) - target_lufs, 1),
            "leveller_threshold_dbfs": round(thr, 1), "leveller_max_gr_db": round(float(gr.min()), 2),
            "leveller_mean_gr_in_speech_db": round(float(gr[gr < -0.01].mean()) if (gr < -0.01).any() else 0.0, 2),
            "peak_limiter_max_gr_db": round(db(float(lim.min())), 2)}
    return y, info


def one_pole(x: np.ndarray, tau_up: float, tau_down: float, rate: float) -> np.ndarray:
    """Asymmetric one-pole smoother (tau_up when rising, tau_down when falling)."""
    au = math.exp(-1.0 / (tau_up * rate)) if tau_up > 0 else 0.0
    ad = math.exp(-1.0 / (tau_down * rate)) if tau_down > 0 else 0.0
    y = np.empty_like(x)
    acc = x[0]
    for i, v in enumerate(x):
        a = au if v > acc else ad
        acc = a * acc + (1 - a) * v
        y[i] = acc
    return y


def duck_curve(voice: np.ndarray, depth_db: float = -9.0, attack: float = 0.06, release: float = 0.45,
               hold: float = 0.25, lookahead: float = 0.06, thr_lo: float = -42.0, thr_hi: float = -30.0,
               rate: int = 1000) -> np.ndarray:
    """Sidechain envelope follower -> music gain in dB (per audio sample).

    Voice level (10 ms RMS, dBFS, voice already at -16 LUFS) is mapped softly
    to a target duck between thr_lo (no duck) and thr_hi (full depth); the
    target is held for `hold` s (so gaps between words never release), moved
    `lookahead` s earlier (the duck is complete when the voice starts), then
    smoothed with attack/release one-poles and a final 25 ms smoother."""
    hop = SR // rate
    n = len(voice) // hop + 1
    pad = np.pad(voice, (0, n * hop - len(voice) + hop))
    frames = pad[: (n + 1) * hop].reshape(-1, hop)[:n]
    ms = (frames ** 2).mean(axis=1)
    w = int(0.01 * rate)
    ms = np.convolve(ms, np.ones(w) / w, mode="same")
    lvl = 10 * np.log10(np.maximum(ms, 1e-12))
    tgt = depth_db * np.clip((lvl - thr_lo) / (thr_hi - thr_lo), 0, 1)
    h = int(hold * rate)
    held = -maximum_filter_trailing(-tgt, h)            # hold the deepest duck for `hold`
    la = int(lookahead * rate)
    held = np.concatenate([held[la:], np.full(la, held[-1])])  # look-ahead
    g = one_pole(held, release, attack, rate)            # rising gain = release, falling = attack
    g = one_pole(g, 0.025, 0.025, rate)
    t_ctrl = np.arange(n) * hop
    return np.interp(np.arange(len(voice)), t_ctrl, g)


def maximum_filter_trailing(x: np.ndarray, n: int) -> np.ndarray:
    """y[i] = max(x[i-n+1 .. i])."""
    from scipy.ndimage import maximum_filter1d
    if n <= 1:
        return x
    return maximum_filter1d(x, size=n, origin=(n - 1) // 2)


def bus_compressor(x: np.ndarray, threshold_db: float | None = None, ratio: float = 1.6, knee_db: float = 6.0,
                   attack: float = 0.015, release: float = 0.2, rate: int = 1000,
                   percentile: float = 80) -> tuple[np.ndarray, np.ndarray, float]:
    """Mild stereo-linked RMS (10 ms) compressor with a soft knee.
    threshold None = 80th percentile of the active detector level, i.e. only
    the loudest fifth of the programme is touched. Returns (y, gr_db, thr)."""
    hop = SR // rate
    pw = np.max(x ** 2, axis=1)
    n = len(pw) // hop + 1
    pad = np.pad(pw, (0, n * hop - len(pw) + hop))
    ms = pad[: (n + 1) * hop].reshape(-1, hop)[:n].mean(axis=1)
    w = int(0.01 * rate)
    ms = np.convolve(ms, np.ones(w) / w, mode="same")
    lvl = 10 * np.log10(np.maximum(ms, 1e-12))
    if threshold_db is None:
        active = lvl[lvl > lvl.max() - 50]
        threshold_db = float(np.percentile(active, percentile))
    over = lvl - threshold_db
    gr = np.where(over <= -knee_db / 2, 0.0,
                  np.where(over >= knee_db / 2, over * (1 / ratio - 1),
                           (1 / ratio - 1) * (over + knee_db / 2) ** 2 / (2 * knee_db)))
    gr = one_pole(gr, release, attack, rate)  # gain coming back up = release
    g = np.interp(np.arange(len(x)), np.arange(n) * hop, gr)
    return x * undb_arr(g)[:, None], g, threshold_db


def undb_arr(g: np.ndarray) -> np.ndarray:
    return 10 ** (g / 20)


def true_peak_limiter(x: np.ndarray, ceiling_db: float = -1.0, attack: float = 0.004,
                      hold: float = 0.05) -> tuple[np.ndarray, np.ndarray]:
    """Look-ahead brick-wall limiter on the 4x-oversampled (true) peak.

    req[i] = gain that keeps sample i's true peak under the ceiling. The gain
    is the minimum of req over [i - attack - hold, i + attack] (look-ahead +
    hold) smoothed by a Hann-weighted average over +-attack; every value in
    that average is <= req[i], so the ceiling holds, and the gain moves in
    smooth ~4 ms ramps with a 50 ms hold (no distortion from fast release)."""
    from scipy.ndimage import minimum_filter1d
    up = signal.resample_poly(x, 4, 1, axis=0)
    tp = np.max(np.abs(up), axis=1)[: 4 * len(x)].reshape(-1, 4).max(axis=1)
    req = np.minimum(1.0, undb(ceiling_db) / np.maximum(tp, 1e-12))
    A, H = max(1, int(attack * SR)), int(hold * SR)
    h = minimum_filter1d(req, size=2 * A + H + 1, origin=H // 2)
    win = np.hanning(2 * A + 3)[1:-1]
    hp = np.pad(h, A, mode="edge")  # no zero-padding dip at the file edges
    g = np.convolve(hp, win / win.sum(), mode="valid")
    g = np.minimum(g, 1.0)
    return x * g[:, None], g


def load_sfx(sfx_dir: Path, name: str) -> np.ndarray:
    p = sfx_dir / f"{name}.wav"
    if not p.exists():
        raise FileNotFoundError(f"SFX '{name}' not found in {sfx_dir}")
    return as2d(read_audio(p, SR))


def resolve_event_time(ev: dict, timings: dict | None) -> float:
    if "t" in ev:
        return float(ev["t"]) + float(ev.get("offset", 0.0))
    if timings is None:
        raise ValueError(f"event {ev} is anchored to timings but no --timings given")
    off = float(ev.get("offset", 0.0))
    if "word" in ev:
        target = ev["word"].lower().strip(".,!?…:;")
        cands = [w for w in timings["words"] if w["word"].lower().strip(".,!?…:;") == target
                 and ("sentence" not in ev or w["sentence"] == ev["sentence"])]
        occ = int(ev.get("occurrence", 1))
        if len(cands) < occ:
            raise ValueError(f"word anchor not found: {ev}")
        w = cands[occ - 1]
        return (w["end"] if ev.get("anchor") == "end" else w["start"]) + off
    if "sentence" in ev:
        s = next(s for s in timings["sentences"] if s["i"] == ev["sentence"])
        return (s["end"] if ev.get("anchor") == "end" else s["start"]) + off
    raise ValueError(f"event needs t, word or sentence: {ev}")


# ================================================================ mastering
def master(bus: np.ndarray, target_lufs: float = TARGET_LUFS, ceiling_dbtp: float = CEILING_DBTP) -> tuple[np.ndarray, dict]:
    """Mild bus compression, then gain + true-peak limiting iterated until the
    integrated loudness is on target (the limiter costs a little loudness)."""
    comp, gr, thr = bus_compressor(bus)
    gain_db = target_lufs - integrated_lufs(comp, SR)
    y, lim = comp, np.ones(len(comp))
    for _ in range(8):
        y, lim = true_peak_limiter(comp * undb(gain_db), ceiling_dbtp - 0.05)
        L = integrated_lufs(y, SR)
        if abs(L - target_lufs) < 0.02:
            break
        gain_db += target_lufs - L
    y[0] = 0.0
    y[-1] = 0.0
    info = {"bus_compressor": {"ratio": 1.6, "knee_db": 6, "threshold_dbfs_rms": round(thr, 1),
                               "max_gain_reduction_db": round(float(gr.min()), 2),
                               "mean_gain_reduction_db": round(float(gr.mean()), 2)},
            "limiter": {"ceiling_dbtp": ceiling_dbtp, "gain_into_limiter_db": round(gain_db, 2),
                        "max_gain_reduction_db": round(db(float(lim.min())), 2),
                        "pct_time_over_0.5db_gr": round(100 * float(np.mean(lim < undb(-0.5))), 2),
                        "pct_time_over_2db_gr": round(100 * float(np.mean(lim < undb(-2.0))), 2)}}
    return y, info


def encode_m4a(y: np.ndarray, wav: Path, m4a: Path, ceiling_dbtp: float = CEILING_DBTP) -> dict:
    """AAC 256k from the WAV. AAC decoding can overshoot true peaks a little on
    dense, limited material; if the decoded M4A is over the ceiling, encode from
    a copy re-limited below it (peaks only, loudness barely moves), searching
    for the highest pre-encode ceiling that passes (bracket + bisection)."""
    tmp = m4a.with_name(f".{m4a.stem}_enc.wav")

    def enc(c):
        src = wav
        if c is not None:
            write_wav(tmp, true_peak_limiter(y, c)[0], SR, 32)
            src = tmp
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-c:a", "aac", "-b:a", "256k",
                        "-movflags", "+faststart", str(m4a)], check=True)
        return ebur128_report(m4a)

    r = enc(None)
    best, best_r, used = None, r, ceiling_dbtp
    if r["TP"] > ceiling_dbtp:
        hi, lo = ceiling_dbtp, None          # hi fails, lo passes
        c = ceiling_dbtp - (r["TP"] - ceiling_dbtp) - 0.05
        last = None
        for _ in range(7):
            rc = enc(c)
            last = c
            if rc["TP"] <= ceiling_dbtp:
                lo, best, best_r = c, c, rc
            else:
                hi = c
            if lo is None:
                c = c - (rc["TP"] - ceiling_dbtp) - 0.1
            elif hi - lo > 0.08:
                c = (hi + lo) / 2
            else:
                break
        if best is None:
            raise RuntimeError(f"could not bring {m4a.name} under {ceiling_dbtp} dBTP")
        if last != best:  # the file on disk holds the last (failing) try: re-encode the best one
            best_r = enc(best)
        used = best
    if tmp.exists():
        tmp.unlink()
    best_r["pre_encode_ceiling_dbtp"] = round(used, 2)
    return best_r


def loudness_report(y: np.ndarray, wav: Path, m4a: Path | None, extra: dict | None = None) -> dict:
    r = {"file": str(wav), "duration_s": round(len(y) / SR, 6), "samples": len(y), "sample_rate": SR,
         "integrated_lufs": round(integrated_lufs(y, SR), 2),
         "true_peak_dbtp": round(true_peak_db(y, SR), 2),
         "sample_peak_dbfs": round(sample_peak_db(y), 2),
         "ebur128_ffmpeg": ebur128_report(wav),
         "max_short_term_lufs": round(float(short_loudness(y, SR, 3.0, 0.1).max()), 1),
         "max_momentary_lufs": round(float(short_loudness(y, SR, 0.4, 0.1).max()), 1),
         "clicks": click_scan(y, SR),
         "first_sample": float(np.abs(y[0]).max()), "last_sample": float(np.abs(y[-1]).max())}
    r["loudness_range_lu"] = r["ebur128_ffmpeg"]["LRA"]
    if m4a is not None:
        r["m4a"] = {"file": str(m4a), **encode_m4a(y, wav, m4a)}
    if extra:
        r.update(extra)
    return r


# ================================================================ main mix
SFX_CAP_LU = 6.0          # hard rule: no event louder than the voice minus this
BED_TOLERANCE_LU = 0.5    # bed check: allowed overshoot of the kit's intent
BED_AUDIBLE_LU = 15.0     # bed check ignores moments where the effects sit > 15 LU under the bed


def pan_event(y: np.ndarray, pan: float) -> np.ndarray:
    """Mono: constant-power pan (loudness independent of pan). Stereo: balance."""
    if y.shape[1] == 1:
        th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        return np.concatenate([y * np.cos(th), y * np.sin(th)], axis=1) * math.sqrt(2)
    return y * np.array([min(1.0, 1 - pan), min(1.0, 1 + pan)])[None, :]


def peak_l100(y: np.ndarray) -> tuple[float, float]:
    """Max K-weighted loudness over 100 ms windows (5 ms hop) and the centre
    time (s, from the start of y) of that window."""
    sl = short_loudness(y, SR, 0.1, 0.005)
    k = int(np.argmax(sl))
    return float(sl[k]), min(len(y) / SR, k * 0.005 + 0.05)


def event_gain(ev: dict, index: dict) -> tuple[float, str, float | None]:
    """(gain dB, mode, kit gain dB). gain_db = absolute override; otherwise
    recommended_gain_db + offset_db (default 0 = the kit's calibrated level)."""
    rec = index.get(ev["name"], {}).get("recommended_gain_db")
    if "gain_db" in ev:
        return float(ev["gain_db"]), "absolute gain_db", rec
    if rec is None:
        return -12.0 + float(ev.get("offset_db", 0.0)), "uncalibrated (-12 dB + offset)", None
    return rec + float(ev.get("offset_db", 0.0)), "offset_db", rec


def build_sfx_bus(events: list[dict], sfx_dir: Path, timeline: dict | None, N: int,
                  voice_ref_lufs: float = VOICE_LUFS) -> tuple[np.ndarray, np.ndarray, list, list]:
    """Place every event, capping each one BEFORE summing so that its 100 ms
    loudness never exceeds voice_ref_lufs - SFX_CAP_LU (the voice as the mixer
    sets it; the ducked music plays no part). Also builds the same cue sheet
    at the kit's calibrated levels (offset 0), used by the bed check.
    Returns (bus, kit_bus, placed, capped)."""
    bus, kit_bus = np.zeros((N, 2)), np.zeros((N, 2))
    index = {}
    idx_path = sfx_dir / "index.json"
    if idx_path.exists():
        index = {f["file"][:-4]: f for f in json.loads(idx_path.read_text())["files"]}
    cap = voice_ref_lufs - SFX_CAP_LU
    placed, capped = [], []
    for ev in events:
        t = resolve_event_time(ev, timeline)
        gain, mode, rec = event_gain(ev, index)
        pan = float(ev.get("pan", 0.0))
        y = pan_event(load_sfx(sfx_dir, ev["name"]), pan)
        i = int(round(t * SR))
        if i >= N or i + len(y) <= 0:
            continue
        l_req, t_peak = peak_l100(undb(gain) * y)
        take = max(0.0, l_req - cap) if l_req > cap + 0.005 else 0.0
        applied = gain - take
        a0 = max(0, -i)
        j = min(N, i + len(y))
        bus[max(i, 0):j] += undb(applied) * y[a0: a0 + j - max(i, 0)]
        if rec is not None:
            kit_bus[max(i, 0):j] += undb(rec) * y[a0: a0 + j - max(i, 0)]
        row = {"name": ev["name"], "t": round(t, 3), "mode": mode, "requested_gain_db": round(gain, 2),
               "applied_gain_db": round(applied, 2), "pan": pan, "dur": round(len(y) / SR, 3),
               "peak_l100_lufs": round(l_req - take, 2), "peak_at_s": round(t + t_peak, 3),
               "kit_peak_l100_lufs": None if rec is None else round(l_req - (gain - rec), 2)}
        if "offset_db" in ev and "gain_db" not in ev:
            row["offset_db"] = float(ev["offset_db"])
        placed.append(row)
        if take > 0:
            capped.append({"name": ev["name"], "t": round(t, 3), "db_taken_off": round(take, 2),
                           "requested_peak_l100_lufs": round(l_req, 2), "capped_to_lufs": round(cap, 2)})
    return bus, kit_bus, placed, capped


def bed_check(bus: np.ndarray, kit_bus: np.ndarray, bed: np.ndarray, placed: list) -> dict:
    """Does the effects bus ever exceed the music bed, at the same moment, by
    more than the kit intends?  In every 100 ms window (10 ms hop):
      excess   = L(effects bus) - L(bed)
      intended = L(same cues at the kit's calibrated levels) - L(bed)
    and the overshoot is excess - intended. Windows where the effects are more
    than BED_AUDIBLE_LU under the bed (masked) or silent are skipped. Passes
    when no overshoot exceeds BED_TOLERANCE_LU. (The kit's calibration puts
    every sound 2.5-12 LU under the bed's nominal -20 LUFS.)"""
    lb = short_loudness(bus, SR, 0.1, 0.01)
    lk = short_loudness(kit_bus, SR, 0.1, 0.01)
    lm = short_loudness(bed, SR, 0.1, 0.01)
    n = min(len(lb), len(lk), len(lm))
    lb, lk, lm = lb[:n], lk[:n], lm[:n]
    rel = (lb > -70) & (lb > lm - BED_AUDIBLE_LU)
    t = np.arange(n) * 0.01 + 0.05
    excess = lb - lm
    over = np.where(lk > -70, lb - lk, 0.0)
    out = {"definition": "per 100 ms window: (L_effects - L_bed) - (L_effects_at_kit_levels - L_bed); "
                         f"windows with effects > {BED_AUDIBLE_LU:g} LU under the bed are ignored",
           "tolerance_lu": BED_TOLERANCE_LU, "windows_checked": int(rel.sum())}
    if not rel.any():
        return {**out, "pass": True, "worst_overshoot_lu": None, "max_excess_over_bed_lu": None, "offending": []}

    def events_at(tt):
        return sorted({p["name"] for p in placed if p["t"] - 0.05 <= tt <= p["t"] + p["dur"] + 0.05})
    k_w = int(np.argmax(np.where(rel, over, -1e9)))
    k_x = int(np.argmax(np.where(rel, excess, -1e9)))
    bad = rel & (over > BED_TOLERANCE_LU)
    offending = []
    if bad.any():
        idx = np.where(bad)[0]
        start = prev = idx[0]
        for i in list(idx[1:]) + [None]:
            if i is None or i - prev > 5:
                seg = slice(start, prev + 1)
                offending.append({"from_s": round(float(t[start]), 2), "to_s": round(float(t[prev]), 2),
                                  "overshoot_lu": round(float(over[seg].max()), 2),
                                  "excess_over_bed_lu": round(float(excess[seg].max()), 2),
                                  "events": events_at(float(t[(start + prev) // 2]))})
                if i is not None:
                    start = i
            if i is not None:
                prev = i
    for p in placed:  # per-event view at the event's own peak window
        k = min(n - 1, max(0, int(round((p["peak_at_s"] - 0.05) / 0.01))))
        p["bed_l100_at_peak_lufs"] = round(float(lm[k]), 2)
        p["excess_over_bed_lu"] = round(p["peak_l100_lufs"] - float(lm[k]), 2)
        if p["kit_peak_l100_lufs"] is not None:
            p["kit_intended_excess_lu"] = round(p["kit_peak_l100_lufs"] - float(lm[k]), 2)
    return {**out, "pass": not bad.any(),
            "worst_overshoot_lu": round(float(over[k_w]), 2), "worst_at_s": round(float(t[k_w]), 2),
            "worst_events": events_at(float(t[k_w])),
            "max_excess_over_bed_lu": round(float(excess[k_x]), 2), "max_excess_at_s": round(float(t[k_x]), 2),
            "max_excess_events": events_at(float(t[k_x])), "offending": offending}


def mix(voice_path: str, plan: list[dict], music: np.ndarray | None, events: list[dict], sfx_dir: Path,
        timeline: dict | None, out: Path, music_gain_db: float = 0.0, duck_db: float = -9.0,
        duration: float | None = None, write_stems: bool = True, bed_lufs: float | None = None) -> dict:
    voice_src = read_audio(voice_path, SR, channels=1)
    voice_end = max(s["dst_start"] + s["src_end"] - s["src_start"] for s in plan)
    total_s = duration or max(voice_end + 1.0, (len(music) / SR) if music is not None else 0.0)
    N = int(round(total_s * SR))
    out.mkdir(parents=True, exist_ok=True)

    # -- voice on the timeline: high-pass, leveller + peak limiter, -16 LUFS (centred)
    v = place_voice(voice_src, plan, N)
    v = signal.sosfilt(signal.butter(2, 70, "highpass", fs=SR, output="sos"), v)
    v, vinfo = voice_chain(v, VOICE_LUFS)
    vinfo["source_integrated_lufs"] = round(integrated_lufs(voice_src, SR), 2)
    voice_st = np.stack([v, v], axis=1)

    # -- music bed (native level) and its ducked copy
    if music is None:
        music = np.zeros((N, 2))
    music = as2d(music)
    if music.shape[1] == 1:
        music = np.repeat(music, 2, axis=1)
    music = music[:N] if len(music) >= N else np.pad(music, ((0, N - len(music)), (0, 0)))
    music = music * undb(music_gain_db)
    g_duck = duck_curve(v, depth_db=duck_db)
    music_d = music * undb_arr(g_duck)[:, None]

    # -- sfx: each event capped at voice - 6 LU (100 ms loudness) before summing
    sfx_bus, kit_bus, placed, capped = build_sfx_bus(events, sfx_dir, timeline, N, VOICE_LUFS)
    for c in capped:
        print(f"CAPPED {c['name']:14s} t={c['t']:8.3f}s  -{c['db_taken_off']:.2f} dB "
              f"(asked {c['requested_peak_l100_lufs']:.1f} LUFS, cap {c['capped_to_lufs']:.1f})")
    bchk = bed_check(sfx_bus, kit_bus, music, placed)
    vl100 = short_loudness(voice_st, SR, 0.1, 0.01)
    sfx_rep = {"events": placed, "cap": {"rule": f"no event louder than the voice minus {SFX_CAP_LU:g} LU, "
                                                 "measured as the max K-weighted loudness over 100 ms windows",
                                         "voice_reference_lufs": VOICE_LUFS,
                                         "voice_median_l100_in_speech_lufs": round(float(np.median(
                                             vl100[vl100 > vl100.max() - 40])), 2),
                                         "cap_lufs": VOICE_LUFS - SFX_CAP_LU},
               "capped": capped, "sfx_capped_count": len(capped),
               "bus_peak_l100_lufs": round(float(short_loudness(sfx_bus, SR, 0.1, 0.01).max()), 2)
               if np.any(sfx_bus) else None,
               "bed_check": bchk}

    # -- 1. final mix, 2. music + sfx (no voice, no ducking), 3. pure bed
    final, m_final = master(voice_st + music_d + sfx_bus)
    music_only, m_music = master(music + sfx_bus)
    bed = music.copy()
    if bed_lufs is not None:
        bed, _ = master(bed, bed_lufs)
    for name, y in (("final_mix", final), ("music_only", music_only), ("music_bed", bed)):
        write_wav(out / f"{name}.wav", y, SR, 24)
    if write_stems:
        g_total = undb(m_final["limiter"]["gain_into_limiter_db"])
        for name, y in (("voice", voice_st), ("music_ducked", music_d), ("sfx", sfx_bus)):
            write_wav(out / "mix_stems" / f"{name}.wav", np.clip(y * g_total, -1, 1), SR, 24)

    # -- reports
    speech = np.zeros(N, bool)
    sents = (timeline or {}).get("sentences", [])
    for s in sents:
        speech[int(s["start"] * SR): int(s["end"] * SR)] = True
    within, gap_rise = [], []
    for s in sents:
        a, b = int((s["start"] + 0.15) * SR), int((s["end"] - 0.1) * SR)
        if b - a > SR * 0.3:
            within.append(float(g_duck[a:b].max() - g_duck[a:b].min()))
    for s0, s1 in zip(sents[:-1], sents[1:]):
        a, b = int(s0["end"] * SR), int(s1["start"] * SR)
        if b > a:
            gap_rise.append(float(g_duck[a:b].max() - g_duck[a]))
    g_total = undb(m_final["limiter"]["gain_into_limiter_db"])
    voice_in_final = integrated_lufs(voice_st * g_total, SR)
    music_under = integrated_lufs(music_d[speech] * g_total, SR) if speech.sum() > SR else None
    duck_rep = {"depth_db": duck_db, "attack_s": 0.06, "hold_s": 0.25, "release_s": 0.45, "lookahead_s": 0.06,
                "mean_gain_in_speech_db": round(float(g_duck[speech].mean()), 2) if speech.any() else None,
                "max_gain_swing_within_a_sentence_db": round(max(within), 2) if within else None,
                "median_gain_swing_within_a_sentence_db": round(float(np.median(within)), 2) if within else None,
                "max_rise_between_sentences_db": round(max(gap_rise), 2) if gap_rise else None,
                "max_gain_slope_db_per_s": round(float(np.max(np.abs(np.diff(g_duck))) * SR), 1)}
    reports = {
        "final_mix": loudness_report(final, out / "final_mix.wav", out / "final_mix.m4a", {
            "contents": "voice + ducked music + SFX", **m_final, "voice": {**vinfo, "normalized_to_lufs": VOICE_LUFS,
            "in_final_mix_lufs": round(voice_in_final, 2)},
            "music_under_voice_lufs": None if music_under is None else round(music_under, 2),
            "voice_to_music_under_speech_lu": None if music_under is None else round(voice_in_final - music_under, 1),
            "ducking": duck_rep, "sfx_capped_count": len(capped), "sfx": sfx_rep, "music_gain_db": music_gain_db,
            "voice_plan": plan}),
        "music_only": loudness_report(music_only, out / "music_only.wav", out / "music_only.m4a", {
            "contents": "music bed + SFX, no voice, no ducking", **m_music, "sfx_capped_count": len(capped),
            "sfx": {k: sfx_rep[k] for k in ("cap", "capped", "sfx_capped_count", "bed_check")}}),
        "music_bed": loudness_report(bed, out / "music_bed.wav", out / "music_bed.m4a", {
            "contents": "pure music bed" + (f" normalized to {bed_lufs} LUFS" if bed_lufs is not None else
                                             " at its rendered bed level (music.py target, -20 LUFS)"),
            "sfx_capped_count": 0, "sfx": "none (the bed has no effects)"}),
    }
    for k, r in reports.items():
        write_json(out / f"{k}_report.json", r)
    return reports


def parse_gaps(items: list[str]) -> dict[int, float]:
    out = {}
    for it in items or []:
        k, v = it.split(":")
        out[int(k)] = float(v)
    return out


def check_timeline_against_timings(timeline: dict, timings: dict, plan: list[dict]) -> dict:
    """Shift our own timings.json by the plan and compare with the timeline's
    already-shifted sentences/words (catches a stale timeline)."""
    sh = shift_timings(timings, plan)
    ds = [max(abs(a["start"] - b["start"]), abs(a["end"] - b["end"]))
          for a, b in zip(sh["sentences"], timeline["sentences"])]
    dw = [max(abs(a["start"] - b["start"]), abs(a["end"] - b["end"]))
          for a, b in zip(sh["words"], timeline["words"])]
    return {"sentences_compared": len(ds), "words_compared": len(dw),
            "max_sentence_diff_ms": round(1000 * max(ds), 1) if ds else None,
            "max_word_diff_ms": round(1000 * max(dw), 1) if dw else None}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    pp = sub.add_parser("plan", help="build a voice plan from timings.json")
    pp.add_argument("--timings", required=True)
    pp.add_argument("--intro", type=float, default=3.0)
    pp.add_argument("--gap-after", nargs="*", default=[], help="SENTENCE:SECONDS, e.g. 2:0.5 13:0.8")
    pp.add_argument("--out", required=True)
    sp = sub.add_parser("shift", help="move timings onto the video timeline")
    sp.add_argument("--timings", required=True)
    sp.add_argument("--plan", required=True, help="plan JSON or timeline.json")
    sp.add_argument("--out", required=True)
    mp = sub.add_parser("mix", help="render final mix, music-only and bed")
    mp.add_argument("--voice", required=True)
    mp.add_argument("--timeline", help="timeline.json: voice plan, shifted sentences/words, music markers")
    mp.add_argument("--plan", help="voice plan JSON (if no --timeline)")
    mp.add_argument("--music", help="music bed WAV (48 kHz stereo)")
    mp.add_argument("--music-auto", action="store_true", help="render the bed now (from --timeline markers)")
    mp.add_argument("--music-params", help="JSON of music.py MusicParams fields (with --music-auto)")
    mp.add_argument("--music-gain-db", type=float, default=0.0)
    mp.add_argument("--duck-db", type=float, default=-9.0)
    mp.add_argument("--bed-lufs", type=float, help="normalize the pure bed too (default: keep -20 LUFS)")
    mp.add_argument("--sfx-events", help="SFX events JSON")
    mp.add_argument("--sfx-dir", default="out/sfx")
    mp.add_argument("--timings", help="timings.json of the voice file (without --timeline: shifted and written; "
                                      "with it: cross-checked against the timeline)")
    mp.add_argument("--duration", type=float, help="final length (default: timeline/music length)")
    mp.add_argument("--out", default="out")
    a = ap.parse_args()

    if a.cmd == "plan":
        t = json.loads(Path(a.timings).read_text())
        write_json(a.out, make_plan(t, a.intro, parse_gaps(a.gap_after)))
        print(f"wrote {a.out}")
        return
    if a.cmd == "shift":
        t = json.loads(Path(a.timings).read_text())
        sh = shift_timings(t, load_plan(a.plan))
        write_json(a.out, sh)
        write_srt(Path(a.out).with_suffix(".srt"), sh["sentences"])
        print(f"wrote {a.out} and {Path(a.out).with_suffix('.srt')}")
        return

    out = Path(a.out)
    timeline = json.loads(Path(a.timeline).read_text()) if a.timeline else None
    if timeline is None and not a.plan:
        sys.exit("need --timeline or --plan")
    plan = load_plan(timeline if timeline else a.plan)
    duration = a.duration or (timeline["duration"] if timeline else None)
    anchors = timeline
    if a.timings:
        tm = json.loads(Path(a.timings).read_text())
        if timeline:
            chk = check_timeline_against_timings(timeline, tm, plan)
            print("timeline vs timings.json shifted by its plan:", chk)
        else:
            anchors = shift_timings(tm, plan)
            write_json(out / "final_timings.json", anchors)
            write_srt(out / "final_timings.srt", anchors["sentences"])
    music = None
    if a.music_auto:
        import music as music_mod
        p = music_mod.MusicParams.from_timeline(a.timeline) if a.timeline else music_mod.MusicParams()
        if a.music_params:
            for k, v in json.loads(Path(a.music_params).read_text()).items():
                setattr(p, k, v)
        r = music_mod.render(p)
        music = r["mix"]
        write_wav(out / "music.wav", music, SR, 24)
        write_json(out / "music_grid.json", r["grid"])
        print(f"music rendered: {r['grid']['duration_s']:.3f}s, markers {r['grid']['markers']}")
    elif a.music:
        music = read_audio(a.music, SR, channels=2)
    events = json.loads(Path(a.sfx_events).read_text()) if a.sfx_events else []
    reps = mix(a.voice, plan, music, events, Path(a.sfx_dir), anchors, out, a.music_gain_db, a.duck_db,
               duration, bed_lufs=a.bed_lufs)
    for k, r in reps.items():
        m4 = r.get("m4a", {})
        print(f"{k:11s} I {r['integrated_lufs']:6.2f} LUFS  TP {r['true_peak_dbtp']:6.2f} dBTP  LRA {r['loudness_range_lu']:4.1f} LU"
              f"  dur {r['duration_s']:.3f}s  clicks {r['clicks']['clicks']}  | m4a I {m4.get('I')} TP {m4.get('TP')}"
              f" (encoded from a {m4.get('pre_encode_ceiling_dbtp')} dBTP limit)")
    f = reps["final_mix"]
    print("voice:", f["voice"])
    print("music under voice:", f["music_under_voice_lufs"], "LUFS; voice-to-music", f["voice_to_music_under_speech_lu"], "LU")
    print("ducking:", f["ducking"])
    print("final bus:", f["bus_compressor"], f["limiter"])
    print("music-only bus:", reps["music_only"]["bus_compressor"], reps["music_only"]["limiter"])
    sx = f["sfx"]
    bc = sx["bed_check"]
    print(f"sfx: {len(sx['events'])} events, {sx['sfx_capped_count']} capped at {sx['cap']['cap_lufs']} LUFS "
          f"(voice {sx['cap']['voice_reference_lufs']} - {SFX_CAP_LU:g}); bus peak {sx['bus_peak_l100_lufs']} LUFS")
    print(f"bed check: {'PASS' if bc['pass'] else 'FAIL'}  worst overshoot {bc['worst_overshoot_lu']} LU at "
          f"{bc.get('worst_at_s')}s {bc.get('worst_events')}; max excess over bed {bc['max_excess_over_bed_lu']} LU "
          f"at {bc.get('max_excess_at_s')}s {bc.get('max_excess_events')}")
    for o in bc["offending"]:
        print("   over kit intent:", o)


if __name__ == "__main__":
    main()
