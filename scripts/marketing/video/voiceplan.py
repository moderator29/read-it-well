"""
Places the voiceover on the films' timeline and writes timeline.json, the one
clock both films, the captions and the mix share.

    python3 scripts/marketing/video/voiceplan.py <timings.json>

The music runs at 104 BPM from t = 0 (beat 0.5769 s, bar 2.3077 s). Each
sentence keeps its own natural gap to the one before (never shorter), and
the sentences that open a scene are moved onto the grid so the cut and the
voice arrive together:

- "Meet Vallo" on bar 4, with the drop;
- the key words of the three signature moments on a bar line:
  "Rent" (bar 12), "Vallo never holds" (bar 29), "guests" (bar 40);
- "Planning a trip?" on bar 19, "Have a property" on bar 38 and the
  closing "Vallo." on bar 41;
- every other scene-opening sentence on the next beat.

Nothing is cut from the voice; only pauses are added.
"""
import json
import math
import sys
from pathlib import Path

BPM = 104
BEAT = 60 / BPM
BAR = 4 * BEAT


def bar(n):
    """Time of bar n's downbeat, counting bars from 1."""
    return (n - 1) * BAR


def next_beat(t):
    return math.ceil(t / BEAT - 1e-6) * BEAT


timings = json.loads(Path(sys.argv[1]).read_text())
S = {s["i"]: s for s in timings["sentences"]}
W = timings["words"]


def word_offset(i, word):
    """Seconds from sentence i's start to the start of its first `word`."""
    for w in W:
        if w["sentence"] == i and w["word"].strip(",.…?").lower() == word.lower():
            return w["start"] - S[i]["start"]
    raise KeyError((i, word))


# How each sentence is placed. ("at", t): starts at t. ("word", w, t): its word w
# lands at t. "beat": the next beat after its natural start. "natural": right
# after the sentence before, with the recorded gap. The second number is the
# least pause before it, in seconds (the recorded gap if larger).
RULES = {
    1: (("at", bar(2)), 0),
    2: (("at", bar(4)), 0),
    3: (("at", 15 * BEAT), 0),
    4: ("beat", 0),
    5: ("natural", 0),
    6: (("word", "Rent", bar(12)), 0.75),
    7: ("beat", 0.9),
    8: ("natural", 0),
    9: (("at", bar(19)), 0.5),
    10: ("natural", 0),
    11: ("beat", 0),
    12: ("natural", 0),
    13: ("beat", 0),
    14: (("word", "Vallo", bar(29)), 0.6),
    15: ("natural", 0),
    16: ("beat", 0.7),
    17: ("natural", 0),
    18: ("beat", 0),
    19: (("at", bar(38)), 0.5),
    20: (("word", "guests", bar(40)), 0),
    21: (("at", bar(41)), 0.55),
    22: ("beat", 0.6),
}

plan = []
prev_end = None
for i in sorted(S):
    s = S[i]
    rule, least = RULES[i]
    earliest = None if prev_end is None else prev_end + max(s["start"] - S[i - 1]["end"], least)
    if rule == "natural":
        start = earliest
    elif rule == "beat":
        start = next_beat(earliest - 0.06)
    elif rule[0] == "at":
        start = rule[1]
    else:
        start = rule[2] - word_offset(i, rule[1])
    if earliest is not None and start < earliest - 0.08:
        raise SystemExit(f"sentence {i} would start {earliest - start:.2f} s too early")
    plan.append({"i": i, "src_start": round(s["start"], 4), "src_end": round(s["end"], 4), "dst_start": round(start, 4)})
    prev_end = start + (s["end"] - s["start"])

shift = {p["i"]: p["dst_start"] - p["src_start"] for p in plan}
sentences = [
    {"i": p["i"], "start": round(p["dst_start"], 4), "end": round(p["dst_start"] + p["src_end"] - p["src_start"], 4), "text": S[p["i"]]["text"]}
    for p in plan
]
words = [
    {"start": round(w["start"] + shift[w["sentence"]], 4), "end": round(w["end"] + shift[w["sentence"]], 4), "word": w["word"], "sentence": w["sentence"]}
    for w in W
]
voice_end = sentences[-1]["end"]
music = {
    "bpm": BPM,
    "beat": BEAT,
    "bar": BAR,
    "intro_end": bar(2),
    "drop": bar(4),
    "lifts": [bar(12), bar(19), bar(29), bar(40)],
    "logo_hit": bar(41),
    "resolve": bar(42),
    "badges": bar(43),
    "url": bar(44),
    "duration": bar(45),
}
out = {
    "fps": 60,
    "duration": music["duration"],
    "voice": {"plan": plan, "end": round(voice_end, 4)},
    "music": music,
    "sentences": sentences,
    "words": words,
}
path = Path(__file__).with_name("timeline.json")
path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
for s in sentences:
    print(f"S{s['i']:>2} {s['start']:7.3f} to {s['end']:7.3f}  bar {s['start'] / BAR + 1:6.2f}  {s['text'][:60]}")
print(f"voice ends {voice_end:.3f}; film {music['duration']:.3f} s; wrote {path}")
