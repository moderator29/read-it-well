"""
The films' rows, in beats, on the one clock (timeline.json: 104 BPM from t = 0).

    python3 scripts/marketing/video/rows.py        # prints the time table and the checks

Every row starts and ends on a beat, so every cut lands on the music. The
scene modules use the same beat numbers (ctx.beat(k)); STORYBOARD.md's time
column is printed from here, never typed by hand.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
T = json.loads((HERE / "timeline.json").read_text())
BEAT = T["music"]["beat"]

# (row, first beat, last beat, what the voice says in it)
ROWS = [
    ("01", 0, 4, "(music)"),
    ("02", 4, 7, "Finding a place in Nigeria"),
    ("03", 7, 12, "shouldn't feel like a gamble."),
    ("04", 12, 15, "Meet Vallo."),
    ("05", 15, 20, "Homes, hotels, shortlets and restaurants…"),
    ("06", 20, 26, "all in one app, with one account."),
    ("07", 26, 29, "Looking for a home to rent or buy?"),
    ("08", 29, 32, "Search across Nigeria,"),
    ("09", 32, 36, "filter by exactly what you need,"),
    ("10", 36, 40, "and see the full move-in cost before you ever make a call."),
    ("11", 40, 44, "(pause)"),
    ("12", 44, 48, "Rent, fees, caution deposit…"),
    ("13", 48, 53, "all added up, right there."),
    ("14", 53, 58, "Talk straight to the owner, the landlord or the agent,"),
    ("15", 58, 61, "right inside the app."),
    ("16", 61, 64, "Share listings in the chat,"),
    ("17", 64, 67, "plan an inspection,"),
    ("18", 67, 71, "and keep every conversation in one place."),
    ("19", 71, 74, "Planning a trip?"),
    ("20", 74, 79, "Browse hotels, shortlets and resorts…"),
    ("21", 79, 82, "pick your dates…"),
    ("22", 82, 85, "and book a room in a few taps."),
    ("23", 85, 88, "Going out tonight?"),
    ("24", 88, 94, "Find a restaurant you love and reserve your table in seconds."),
    ("25", 94, 100, "Owners, hosts, hotels and restaurants with the verified mark"),
    ("26", 100, 105, "have been checked by a real person at Vallo…"),
    ("27", 105, 109, "so you know who you're dealing with."),
    ("28", 109, 112, "And when it's time to pay…"),
    ("29", 112, 115, "Vallo never holds your money."),
    ("30", 115, 121, "Your payment goes straight to the owner, the host or the business,"),
    ("31", 121, 126, "through a licensed payment processor."),
    ("32", 126, 129, "Got a question?"),
    ("33", 129, 134, "Ask the AI assistant about prices, areas or how renting works…"),
    ("34", 134, 138, "any time of day."),
    ("35", 138, 142, "And Vallo speaks your language:"),
    ("36", 142, 148, "English, Hausa, Yorùbá and Igbo."),
    ("37", 148, 153, "Have a property, a hotel or a restaurant?"),
    ("38", 153, 156, "Put it on Vallo and welcome"),
    ("39", 156, 160, "guests from across the country."),
    ("40", 160, 166, "Vallo. Real estate, done right."),
    ("41", 166, 171, "(silent: no voice, music tail)"),
    ("42", 171, 176, "(silent: no voice, music tail)"),
]


def t(k):
    return k * BEAT


if __name__ == "__main__":
    problems = []
    prev_end = 0
    for row, a, b, voice in ROWS:
        if a != prev_end:
            problems.append(f"row {row} starts at beat {a}, the row before ends at {prev_end}")
        prev_end = b
        d = t(b) - t(a)
        flag = "" if 1.4 <= d <= 3.5 else "  <-- length"
        if flag:
            problems.append(f"row {row} is {d:.2f} s")
        print(f"| {row} | {t(a):6.2f}–{t(b):6.2f} ({d:.2f} s, beats {a}–{b}) | {voice}{flag}")
    if abs(t(prev_end) - T["duration"]) > 1e-3:
        problems.append(f"rows end at {t(prev_end):.3f}, the film at {T['duration']:.3f}")
    for w0 in range(0, 120, 30):
        n = sum(1 for _, a, _, _ in ROWS if w0 <= t(a) < w0 + 30)
        print(f"rows starting in {w0}–{w0 + 30} s: {n}")
    print("\n".join(problems) or "checks: every row on the beat grid, 1.4–3.5 s, no gaps, ends with the film")
