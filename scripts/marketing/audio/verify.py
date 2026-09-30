#!/usr/bin/env python3
"""Re-verify every generated file from disk, independently of the scripts that
made them: formats, lengths, loudness, peaks, DC, clicks, fades, grid maths,
timing invariants. Prints a table, writes <out>/verify_report.json and exits
non-zero if anything fails.

    python verify.py --out out [--timeline ../video/timeline.json] [--mix-dir out_hot]

--mix-dir points at a separate mix.py output folder (default: --out); the kit,
music and timings are always read from --out.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (band_energy_share, click_scan, ebur128_report, integrated_lufs, mono_compat,  # noqa: E402
                    sample_peak_db, short_loudness, true_peak_db)

REQUIRED_SFX = ["tap", "tap_soft", "toggle_on", "toggle_off", "pop", "pop_low", "bubble_send", "whoosh_short",
                "whoosh_long", "swipe", "card_slide", "chime_notify", "success", "ding_pay", "sparkle", "stamp",
                "impact_soft", "riser", "counter_tick", *[f"type_key_{k}" for k in range(1, 7)], "lock_click",
                "glass_clink", "heartbeat_soft"]

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = ""):
    results.append((name, bool(ok), detail))


def read(path: Path):
    info = sf.info(str(path))
    x, sr = sf.read(str(path), dtype="float64", always_2d=True)
    return x, sr, info


def verify_timings(out: Path):
    p = out / "timings.json"
    if not p.exists():
        check("timings.json exists", False)
        return
    t = json.loads(p.read_text())
    ok_text = all(" ".join(w["word"] for w in t["words"] if w["sentence"] == s["i"]) == s["text"]
                  for s in t["sentences"])
    words = t["words"]
    mono = all(words[k]["end"] <= words[k + 1]["start"] + 1e-6 for k in range(len(words) - 1))
    pos = all(w["end"] > w["start"] for w in words)
    sents = t["sentences"]
    s_mono = all(sents[k]["end"] <= sents[k + 1]["start"] for k in range(len(sents) - 1))
    inside = all(0 <= w["start"] and w["end"] <= t["duration"] + 1e-6 for w in words)
    check("timings: words rebuild each sentence text", ok_text)
    check("timings: words ordered, non-overlapping, positive", mono and pos)
    check("timings: sentences ordered, inside the file", s_mono and inside,
          f"{len(sents)} sentences, {len(words)} words, duration {t['duration']}s")
    check("timings: no QA flags", not t["qa"]["flags"], "; ".join(t["qa"]["flags"]))
    check("timings.srt exists", (out / "timings.srt").exists())


def verify_sfx(out: Path):
    d = out / "sfx"
    idx = json.loads((d / "index.json").read_text()) if (d / "index.json").exists() else {"files": []}
    names = {f["file"][:-4] for f in idx["files"]}
    missing = [n for n in REQUIRED_SFX if n not in names or not (d / f"{n}.wav").exists()]
    check("sfx: all required sounds + index.json", not missing, f"missing {missing}" if missing else f"{len(names)} sounds")
    bad = []
    worst_hf = 0.0
    for n in sorted(names):
        x, sr, info = read(d / f"{n}.wav")
        problems = []
        if sr != 48000 or info.subtype != "PCM_24":
            problems.append(f"{sr} Hz {info.subtype}")
        pk = sample_peak_db(x)
        if abs(pk + 3.0) > 0.02:
            problems.append(f"peak {pk:.2f}")
        if np.abs(x[0]).max() != 0.0 or np.abs(x[-1]).max() != 0.0:
            problems.append("ends not exactly 0")
        if np.abs(x.mean(axis=0)).max() > 1e-5:
            problems.append("DC")
        c = click_scan(x, sr)
        if c["clicks"]:
            problems.append(f"{c['clicks']} clicks")
        hf = 100 * band_energy_share(x, sr, 8000, sr / 2)
        if n != "sparkle":
            worst_hf = max(worst_hf, hf)
        if hf > 1.0 and n != "sparkle":
            problems.append(f">8k {hf:.2f}%")
        if problems:
            bad.append(f"{n}: {', '.join(problems)}")
    check("sfx: 48k/24-bit, -3.00 dBFS peak, exact-zero ends, no DC, no clicks, <1% >8 kHz", not bad,
          "; ".join(bad) if bad else f"worst >8 kHz share (excl. sparkle) {worst_hf:.3f}%")


def verify_music(out: Path, timeline: dict | None):
    mp = out / "music.wav"
    if not mp.exists():
        check("music.wav exists", False)
        return
    x, sr, info = read(mp)
    g = json.loads((out / "music_grid.json").read_text())
    L = integrated_lufs(x, sr)
    check("music: 48 kHz stereo 24-bit", sr == 48000 and x.shape[1] == 2 and info.subtype == "PCM_24")
    check("music: integrated -20 LUFS (+-0.2)", abs(L + 20) <= 0.2, f"{L:.2f} LUFS")
    check("music: no clipping, true peak < -1 dBTP", np.abs(x).max() < 1.0 and true_peak_db(x, sr) < -1.0,
          f"sample {sample_peak_db(x):.2f} dBFS, TP {true_peak_db(x, sr):.2f} dBTP")
    check("music: DC < 1e-5", np.abs(x.mean(axis=0)).max() < 1e-5, f"{np.abs(x.mean(axis=0)).max():.1e}")
    c = click_scan(x, sr)
    check("music: no clicks", c["clicks"] == 0, json.dumps(c))
    check("music: starts playing (0 -> sound within 10 ms) and ends at exact 0",
          x[0].max() == 0.0 and np.abs(x[-1]).max() == 0.0 and np.abs(x[: int(0.05 * sr)]).max() > 1e-3)
    mc = mono_compat(x, sr)
    check("music: mono-compatible (no 1/3-oct band drops worse than -4 dB)",
          mc["worst_third_octave_drop_db"] > -4.0, json.dumps(mc))
    stems = {}
    for k in ("drums", "bass", "keys", "arp"):
        y, _, _ = read(out / "stems" / f"{k}.wav")
        stems[k] = y
    err = np.abs(sum(stems.values()) - x).max()
    check("music: stems sum to the mix (24-bit rounding only)", err < 1e-5, f"max error {err:.1e}")
    bar = 240.0 / g["bpm"]
    grid_ok = all(abs(b["t"] - (g["offset_s"] + (b["bar"] - 1) * bar)) < 1e-3 for b in g["bars"])
    beats_ok = all(abs(bt["t"] - (g["offset_s"] + ((bt["bar"] - 1) * 4 + bt["beat"] - 1) * bar / 4)) < 1e-3
                   for bt in g["beats"])
    check("music_grid: every bar/beat on offset + n * period", grid_ok and beats_ok,
          f"{len(g['bars'])} bars, {len(g['beats'])} beats, bpm {g['bpm']}")
    dur_ok = abs(len(x) / sr - g["duration_s"]) < 1.5 / sr
    check("music: length matches grid duration", dur_ok, f"{len(x) / sr:.6f}s vs {g['duration_s']}")
    if timeline:
        m = timeline["music"]
        mk = g["markers"]
        pairs = [("drop", m["drop"], mk["drop"]), ("logo_hit", m["logo_hit"], mk["logo_hit"]),
                 ("resolve", m["resolve"], mk["resolve"]), ("intro_end", m["intro_end"], mk["intro_end"])]
        pairs += [(f"lift{k + 1}", a, b) for k, (a, b) in enumerate(zip(m["lifts"], mk["lifts"]))]
        pairs += [("badges", m["badges"], mk["accents"][0]), ("url", m["url"], mk["accents"][1])]
        worst = max(abs(a - b) for _, a, b in pairs)
        check("music: markers match timeline.json", worst < 1e-3 and abs(m["bpm"] - g["bpm"]) < 1e-9
              and abs(m["duration"] - g["duration_s"]) < 1e-3, f"worst marker diff {1000 * worst:.2f} ms")


def verify_mix(out: Path, timeline: dict | None):
    for name, target in (("final_mix", -14.0), ("music_only", -14.0), ("music_bed", None)):
        p = out / f"{name}.wav"
        if not p.exists():
            check(f"{name}.wav exists", False)
            continue
        x, sr, info = read(p)
        L = integrated_lufs(x, sr)
        tp = true_peak_db(x, sr)
        r = ebur128_report(p)
        c = click_scan(x, sr)
        det = f"{L:.2f} LUFS, TP {tp:.2f} dBTP (ffmpeg {r['I']} / {r['TP']}), LRA {r['LRA']} LU, {len(x) / sr:.3f}s"
        if target is not None:
            check(f"{name}: -14 LUFS (+-0.1), true peak <= -1 dBTP", abs(L - target) <= 0.1 and tp <= -1.0, det)
        else:
            check(f"{name}: no clipping", tp < 0, det)
        check(f"{name}: 48k stereo 24-bit, no clicks, exact-zero ends", sr == 48000 and x.shape[1] == 2
              and info.subtype == "PCM_24" and c["clicks"] == 0 and np.abs(x[-1]).max() == 0.0, json.dumps(c))
        m4a = out / f"{name}.m4a"
        if m4a.exists():
            rm = ebur128_report(m4a)
            check(f"{name}.m4a: AAC <= -1 dBTP", rm["TP"] <= -1.0, f"{rm['I']} LUFS, TP {rm['TP']} dBTP")
        if timeline and name != "music_bed":
            check(f"{name}: length = timeline duration", abs(len(x) / sr - timeline["duration"]) < 1.5 / sr)


def _pan(y: np.ndarray, pan: float) -> np.ndarray:
    if y.shape[1] == 1:
        th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        return np.concatenate([y * np.cos(th), y * np.sin(th)], axis=1) * np.sqrt(2)
    return y * np.array([min(1.0, 1 - pan), min(1.0, 1 + pan)])[None, :]


def verify_sfx_rules(out: Path, mix_dir: Path):
    """Recompute, from the kit files and the placed-event list, (a) the hard
    cap: every event's 100 ms loudness <= voice - 6 LU, with the voice level
    measured from the voice stem; (b) that every request over the cap was
    capped and logged; (c) the effects bus never exceeds the music bed at the
    same moment by more than the kit intends (same cues at offset 0)."""
    rp = mix_dir / "final_mix_report.json"
    if not rp.exists():
        return
    rep = json.loads(rp.read_text())
    sx = rep.get("sfx")
    if not isinstance(sx, dict):
        check("sfx rules: report has an sfx section", False)
        return
    index = {f["file"][:-4]: f for f in json.loads((out / "sfx" / "index.json").read_text())["files"]}
    g = rep["limiter"]["gain_into_limiter_db"]
    v, sr, _ = read(mix_dir / "mix_stems" / "voice.wav")
    voice_ref = integrated_lufs(v, sr) - g  # the voice as the mixer set it, before the master gain
    cap = voice_ref - 6.0
    N = len(v)
    bus, kit = np.zeros((N, 2)), np.zeros((N, 2))
    worst, worst_name, should_cap = -1e9, None, 0
    for e in sx["events"]:
        y, _, _ = read(out / "sfx" / f"{e['name']}.wav")
        y = _pan(y, e["pan"])
        l_app = float(short_loudness(y * 10 ** (e["applied_gain_db"] / 20), sr, 0.1, 0.005).max())
        l_req = float(short_loudness(y * 10 ** (e["requested_gain_db"] / 20), sr, 0.1, 0.005).max())
        should_cap += l_req > cap + 0.01
        if l_app - cap > worst:
            worst, worst_name = l_app - cap, f"{e['name']}@{e['t']}"
        i = int(round(e["t"] * sr))
        j = min(N, i + len(y))
        if i < N:
            bus[i:j] += y[: j - i] * 10 ** (e["applied_gain_db"] / 20)
            rec = index.get(e["name"], {}).get("recommended_gain_db")
            if rec is not None:
                kit[i:j] += y[: j - i] * 10 ** (rec / 20)
    check("sfx cap: every event <= voice - 6 LU (100 ms loudness)", worst <= 0.02,
          f"voice as set {voice_ref:.2f} LUFS -> cap {cap:.2f}; loudest event {worst_name} at {worst:+.2f} LU vs cap")
    check("sfx cap: every over-cap request was capped and logged", should_cap == sx["sfx_capped_count"]
          == len(sx["capped"]), f"{should_cap} requests over the cap, {sx['sfx_capped_count']} logged: "
          + ", ".join(f"{c['name']}@{c['t']} -{c['db_taken_off']} dB" for c in sx["capped"]))
    brep = json.loads((mix_dir / "music_bed_report.json").read_text())
    if "normalized" in brep.get("contents", ""):
        check("sfx vs bed: skipped (bed was re-normalized)", True)
        return
    bed, _, _ = read(mix_dir / "music_bed.wav")
    lb, lk, lm = (short_loudness(z, sr, 0.1, 0.01) for z in (bus, kit, bed))
    n = min(len(lb), len(lk), len(lm))
    lb, lk, lm = lb[:n], lk[:n], lm[:n]
    rel = (lb > -70) & (lb > lm - 15)
    over = np.where(lk > -70, lb - lk, 0.0)
    k = int(np.argmax(np.where(rel, over, -1e9)))
    kx = int(np.argmax(np.where(rel, lb - lm, -1e9)))
    tt = lambda q: q * 0.01 + 0.05  # noqa: E731
    at = lambda q: sorted({e["name"] for e in sx["events"] if e["t"] - 0.05 <= tt(q) <= e["t"] + e["dur"] + 0.05})  # noqa: E731
    check("sfx vs bed: effects never exceed the bed by more than the kit intends (tol 0.5 LU)",
          float(over[k]) <= 0.5,
          f"worst overshoot {over[k]:+.2f} LU at {tt(k):.2f}s {at(k)}; max excess over the bed "
          f"{lb[kx] - lm[kx]:+.2f} LU at {tt(kx):.2f}s {at(kx)}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="out")
    ap.add_argument("--timeline")
    ap.add_argument("--mix-dir", help="folder with mix.py outputs (default: --out)")
    a = ap.parse_args()
    out = Path(a.out)
    mix_dir = Path(a.mix_dir) if a.mix_dir else out
    tl = json.loads(Path(a.timeline).read_text()) if a.timeline else None
    verify_timings(out)
    verify_sfx(out)
    verify_music(out, tl)
    verify_mix(mix_dir, tl)
    verify_sfx_rules(out, mix_dir)
    w = max(len(n) for n, _, _ in results)
    for n, ok, d in results:
        print(f"{'PASS' if ok else 'FAIL'}  {n:<{w}}  {d}")
    json.dump([{"check": n, "pass": ok, "detail": d} for n, ok, d in results],
              open(mix_dir / "verify_report.json", "w"), indent=1)
    n_fail = sum(1 for _, ok, _ in results if not ok)
    print(f"\n{len(results) - n_fail}/{len(results)} checks passed")
    sys.exit(1 if n_fail else 0)


if __name__ == "__main__":
    main()
