"""Mixes a reel's soundtrack: the music bed plus the film's sound cues.

    python reel_mix.py --music v1/music.wav --cues sfx-v1.json --sfx-dir out/sfx \
        --out v1/final --uplift-db 5 --target-lufs -14

The cues come from the renderer (sfx-<reel>.json: name, t, offset_db, pan). Each
sound is placed at its time at its kit gain (index.json recommended_gain_db,
calibrated for a voice-led mix) plus `offset_db` plus `uplift-db`, which lifts
the kit for a mix with no voice. The result is normalized to the target
loudness and held under -1 dBTP. Writes <out>.wav and <out>.m4a.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SR, integrated_lufs, read_audio, true_peak_db, undb, write_wav  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--music", required=True)
    ap.add_argument("--cues", required=True)
    ap.add_argument("--sfx-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--uplift-db", type=float, default=5.0)
    ap.add_argument("--target-lufs", type=float, default=-14.0)
    a = ap.parse_args()

    music = read_audio(a.music, sr=SR, channels=2)
    n = len(music)
    sfx_dir = Path(a.sfx_dir)
    index = {f["file"][:-4]: f for f in json.loads((sfx_dir / "index.json").read_text())["files"]}
    bus = np.zeros_like(music)
    cache: dict[str, np.ndarray] = {}
    placed = 0
    for cue in json.loads(Path(a.cues).read_text()):
        name = cue["name"]
        if name not in index:
            print(f"skip unknown cue {name}")
            continue
        if name not in cache:
            cache[name] = read_audio(str(sfx_dir / index[name]["file"]), sr=SR, channels=1)
        x = cache[name]
        gain = undb(index[name]["recommended_gain_db"] + cue.get("offset_db", 0.0) + a.uplift_db)
        pan = float(np.clip(cue.get("pan", 0.0), -1, 1))
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        i0 = int(round(cue["t"] * SR))
        if i0 < 0 or i0 >= n:
            continue
        seg = x[: n - i0] * gain * np.sqrt(2)
        bus[i0 : i0 + len(seg), 0] += seg * l
        bus[i0 : i0 + len(seg), 1] += seg * r
        placed += 1
    mix = music + bus
    lufs = integrated_lufs(mix)
    mix = mix * undb(a.target_lufs - lufs)
    tp = true_peak_db(mix)
    if tp > -1.0:
        mix = mix * undb(-1.0 - tp)
    out = Path(a.out)
    write_wav(f"{out}.wav", mix)
    lufs_t = a.target_lufs if a.target_lufs <= -15 else -16.0
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{out}.wav", "-af", f"loudnorm=I={lufs_t}:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "256k", f"{out}.m4a"], check=True)
    print(f"{placed} cues, {integrated_lufs(mix):.1f} LUFS, true peak {true_peak_db(mix):.1f} dBTP, {len(mix) / SR:.2f} s -> {out}.m4a")


if __name__ == "__main__":
    main()
