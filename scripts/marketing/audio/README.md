# Vallo launch films: audio toolkit

Everything the two launch films need for sound, generated and checked by code:
word/sentence timings for the ElevenLabs voiceover, a synthesized UI sound kit,
an original music bed fitted to the films' timeline, and the mixer that
produces the deliverables. Nothing is sampled or downloaded: the SFX and music
come from sines, noise, Karplus-Strong strings and a synthetic reverb, so they
are original and royalty-free by construction.

Generated audio never lives in the repo. Run everything from a scratch work
directory; outputs go to `out/` there.

| Script | Deliverable | Main outputs |
|---|---|---|
| `timings.py` | 1. voice timings | `out/timings.json`, `out/timings.srt` |
| `sfx.py` | 2. SFX kit | `out/sfx/*.wav`, `out/sfx/index.json` |
| `music.py` | 3. music bed | `out/music.wav`, `out/stems/*.wav`, `out/music_grid.json`, `out/music_qa.json` |
| `mix.py` | 4. mixer | `out/final_mix.wav/.m4a`, `out/music_only.wav/.m4a`, `out/music_bed.wav/.m4a`, `out/*_report.json` |
| `verify.py` | checks all of the above from disk | `out/verify_report.json` |
| `common.py` | shared DSP/IO/loudness helpers | |
| `vo_script.txt` | the script the voice was read from | |

## Setup

```sh
pip install -r scripts/marketing/audio/requirements.txt   # plus ffmpeg on PATH
A=/path/to/repo/scripts/marketing/audio                    # this folder
T=/path/to/repo/scripts/marketing/video/timeline.json      # the films' clock
mkdir -p work && cd work && cp /path/to/voice.mp3 voice.mp3
```

## Rebuild everything

```sh
python3 $A/timings.py --voice voice.mp3 --out out                  # ~45 s
python3 $A/sfx.py --out out/sfx                                    # ~5 s
python3 $A/music.py --out out --timeline $T                        # ~65 s
python3 $A/mix.py mix --voice voice.mp3 --timeline $T --music out/music.wav \
    --sfx-events $A/examples/sfx_events.timeline_test.json --sfx-dir out/sfx \
    --timings out/timings.json --out out                           # ~2 min
python3 $A/verify.py --out out --timeline $T                       # ~1 min, exits 1 on any failure

# cap test: deliberately hot cues (toggle_on +15, chime_notify +14, a hot gain_db override)
python3 $A/mix.py mix --voice voice.mp3 --timeline $T --music out/music.wav \
    --sfx-events $A/examples/sfx_events.hot_test.json --sfx-dir out/sfx --timings out/timings.json --out out_hot
python3 $A/verify.py --out out --mix-dir out_hot --timeline $T      # cap checks pass; bed check FAILS by design
```

`examples/`: `sfx_events.timeline_test.json` (15 cues on the film's markers, all at
offset 0), `sfx_events.hot_test.json` (the same plus three over-hot cues and one
quiet one), `voice_plan.demo.json` (`mix.py plan` output: 3 s intro, +0.5 s after
sentence 2).

All steps are deterministic (seeded), so re-running reproduces the same files.
`timeline.json` is produced by `../video/voiceplan.py` from `out/timings.json`;
if the timings change, rebuild it before mixing.

## 1. Timings (`timings.py`)

pocketsphinx 5.0.3, fully offline:

1. The MP3 is decoded with ffmpeg (encoder delay removed: t = 0 is the first real
   sample; the file decodes to 87.600 s, ffprobe's 87.64 s includes the 25 ms delay).
2. Speech islands from an exact re-implementation of `silencedetect=noise=-35dB:d=0.35`
   (24 islands, identical to ffmpeg's output).
3. Every island is recognized with the default English LM (no script).
4. A dynamic programme maps script words onto islands, scoring each candidate chunk
   by phone-level edit distance to the recognizer's output, duration at the measured
   syllable rate, and whether the island edge falls on punctuation. Script words the
   audio never reaches come out as `unspoken`.
5. Island-level forced alignment finds sentence splits inside islands; then every
   sentence is force-aligned on its own window (two passes: FSG word alignment, then
   state-level Viterbi so trailing silence is not glued onto the last word; windows over
   6 s are cut at pauses because the state aligner underflows on long windows). Word
   edges are snapped to the RMS envelope (-55 dBFS).
6. QA: sentence edges vs the silence map, per-sentence speech rate, script-vs-recognizer
   score gap per island, very short (reduced) words, island-vs-sentence agreement, word
   starts vs the recognizer's own segmentation, a whole-file alignment cross-check, and
   an explicit test of unspoken lines against the tail of the audio.

Pronunciations added for ASCII tokens: vallo (V AE/AA/AH L OW), shortlets, move-in,
AI as letters (EY AY), yoruba (Y AO R UW B AA ...), igbo (IY B OW, IH G B OW), hausa.
Unknown words get a guessed pronunciation (compound split or letter rules) and are listed.

`timings.json`: `duration`, `sentences` `[{i, start, end, text}]` (i is 1-based),
`words` `[{start, end, word, sentence}]` (joining a sentence's words with spaces
reproduces its text, punctuation included), `notes`, plus `unspoken`, `phrases`
(split at punctuation, handy for kinetic type), `silence_map` and `qa`.
`timings.srt` holds sentence captions (held up to 0.4 s, never overlapping the next).

**Finding:** the voice ends with "Vallo. Real estate, done right." (speech ends at
87.45 s, 0.15 s of silence follows). "Coming soon on iPhone and Android." is not in
the audio: the recognizer hears "yeah low" / "real estate" / "done right" in the last
three islands; forcing "coming soon on iphone and android" onto the final island
cannot be aligned, and on the last 3 s it scores -39.3/frame against -13.1 for the
spoken text; the tail lasts 2.67 s against 2.73 s expected for the spoken text and
5.09 s if the last line were there. Everything else matches the script word for word.
Median rate 4.6 syllables/s. Word starts agree with the independent recognizer to a
median of 3 ms (p90 17 ms, 171 words).

## 2. SFX kit (`sfx.py`)

48 kHz / 24-bit WAV. Every file: DC removed, 0.8-3 ms raised-cosine attack (first
sample exactly 0), tail trimmed 60 dB under peak, raised-cosine fade to an exact 0
last sample, sample peak -3.00 dBFS. Tonal sounds are in D major like the music.
`index.json` lists duration, channels, sample/true peak, 100 ms loudness, a
description, the recommended gain under the voice, and QA (DC, clicks, >8 kHz share,
600 Hz-4 kHz share, spectral centroid, loudness lost on a phone speaker, mono
compatibility).

`recommended_gain_db` = target minus the file's 100 ms K-weighted loudness as placed
in a stereo mix (mono centred), with the voice at -16 LUFS as `mix.py` sets it:
taps/clicks/ticks 13-16 LU under the voice, pops/toggles ~12, whooshes/slides 9-11,
chimes ~9, stamp ~8, logo hit and riser end 6.5. `calibrated_peak_100ms_lufs` is the
resulting level. Nothing is calibrated above voice - 6.5 LU, so a cue at `offset_db` 0
never meets the mixer's cap (voice - 6 LU).

| name | s | ch | gain dB | description |
|---|---|---|---|---|
| `tap` | 0.20 | mono | -11.2 | Soft rounded UI tap: small wooden 'tock' with a light body |
| `tap_soft` | 0.20 | mono | -15.4 | Softer, duller tap for secondary touches |
| `toggle_on` | 0.30 | mono | -17.3 | Switch on: small click + rising fifth pip (E5 to B5) |
| `toggle_off` | 0.30 | mono | -17.2 | Switch off: small click + falling, duller pip (B5 to E5) |
| `pop` | 0.35 | mono | -16.4 | Bright bubble pop (upward chirp) for chips/badges appearing |
| `pop_low` | 0.35 | mono | -17.3 | Lower, rounder bubble pop for larger elements appearing |
| `bubble_send` | 0.38 | stereo | -15.6 | Message sent: short upward swoosh into a bubble pop |
| `whoosh_short` | 0.34 | stereo | -15.2 | Short air whoosh left-to-right; peak at 0.19 s |
| `whoosh_long` | 0.79 | stereo | -15.2 | Long, deeper whoosh left-to-right; peak at 0.44 s |
| `swipe` | 0.22 | stereo | -16.4 | Light finger swipe, right-to-left |
| `card_slide` | 0.41 | stereo | -13.6 | Card sliding into place, ending on a light settle |
| `chime_notify` | 1.92 | stereo | -17.8 | Two bell notes rising a fourth (A5 to D6), ~1.2 s tail |
| `success` | 1.50 | stereo | -16.8 | Three rising marimba notes (D5 F#5 A5) |
| `ding_pay` | 1.95 | stereo | -17.3 | One bright bell (D6 with a fifth shimmer) |
| `sparkle` | 0.94 | stereo | -19.2 | Short shimmer of high D-major pentatonic pings |
| `stamp` | 0.38 | stereo | -10.4 | Badge stamp: soft rubber thud with a small contact click |
| `impact_soft` | 2.03 | stereo | -12.2 | Deep, warm logo hit: sub drop + D-major body + short dark reverb |
| `riser` | 2.50 | stereo | -12.2 | 2.5 s build, loudest at the end and cut there: place its END on the downbeat |
| `counter_tick` | 0.08 | mono | -13.8 | Tiny tick for count-ups (3-6 dB lower for fast runs) |
| `type_key_1..6` | 0.16 | mono | -11.8 to -13.8 | Quiet keyboard clicks (cycle for typing) |
| `lock_click` | 0.18 | mono | -13.2 | Two-stage latch: tick then soft clunk |
| `glass_clink` | 0.58 | stereo | -20.0 | Tiny glass clink |
| `heartbeat_soft` | 0.75 | mono | -14.4 | Soft lub-dub; sub-heavy, felt more than heard on phones |

## 3. Music bed (`music.py`)

104 BPM, D major, 4/4, t = 0 is bar 1 beat 1 (`offset_s` 0), 44 bars = 101.538 s
ending on bar 45's downbeat. Soft four-on-the-floor kick, 16th shaker, rim on 2 and 4,
a pitched Amapiano-style log drum over a sub, detuned wavetable pads in mid/side
(mono-safe), Karplus-Strong plucks (a 3-3-2 arpeggio and a lighter motif). Pads and
plucks are low-passed; nothing melodic competes with the voice.

Structure (defaults = the films' timeline; `--timeline` reads the same markers):

| bars | section | chords | what happens |
|---|---|---|---|
| 1 | intro | Bm9 | already playing at t = 0 (a pre-roll bar is rendered and cut), filter opening |
| 2-3 | pre | Bm9, F#m11 | voice enters; sparse and filtered; riser into bar 4; stop on bar 3 beat 4 |
| 4-11 | groove 1 | Gmaj9 A6 F#m11 Bm9 | drop on bar 4 ("Meet Vallo"): hit + groove |
| 12-18 | groove 2 | same loop | lift: rim, arpeggio, busier log drum |
| 19-28 | groove 3 | Bm9 Gmaj9 Dmaj9 A6 | lift, warmer world: congas, lower pad body |
| 29-39 | groove 4 | Dmaj9 Gmaj9 Bm9 A6 | lift: clap, brighter arp |
| 40 | peak | Gmaj9 | lift: open hats, busiest log drum; stop on the last half-beat |
| 41 | logo | A9sus4 | big hit ("Vallo."): kick, sub drop, wide strum, air |
| 42-44 | outro | Dmaj9, Gadd9/D, Dmaj9 | resolve under "done right."; pads + motif; accents on bars 43 and 44; fade to exact 0 over the last 1.2 s |

Each lift is ~1 LU louder than the section before it (section loudness intro -26.1,
pre -24.2, then -21.9, -20.4, -19.6, -18.5, -18.1 LUFS; logo -20.1, outro -22.6).
Every element is rendered separately and balanced by measured loudness against the
pads (`BALANCE_LU`), so the balance stays stable when the synthesis changes.
Parameters: `--bpm --offset --duration --intro-end --drop --lifts --logo-hit --resolve
--accents --fade --transpose --target-lufs --seed` or `--params file.json`; markers
must be on bar lines (off-grid ones are snapped with a warning).

`music_grid.json`: `bpm`, `beat_s`, `bar_s`, `offset_s`, `markers` (intro_end, drop,
lifts, logo_hit, resolve, accents, stop windows, fade), and every `bar` (number, time,
chord, section) and `beat` (time, bar, beat). Stems `drums`, `bass`, `keys` (pads +
chord hits), `arp` (arpeggio + motif) each carry their own reverb return and sum
exactly to `music.wav`.

## 4. Mixer (`mix.py`)

See the docstring for the full chain. In short: voice placed by the plan, levelled and
peak-limited (its peak-to-loudness ratio goes from 17.5 to 11.2 dB) and set to
-16 LUFS; music ducked -9 dB by a look-ahead envelope follower (attack 60 ms, hold
250 ms, release 450 ms, 25 ms smoother); SFX cues placed and capped; bus compression
1.6:1; true-peak limiter at -1.0 dBTP and gain iterated to -14.0 LUFS (pyloudnorm).

**SFX cues** are `{name, t, offset_db, pan}` as the film engine writes them.
`offset_db` is relative to the sound's `recommended_gain_db` in `sfx/index.json`
(0 = the kit's calibrated level); `gain_db`, if present, is an absolute override.
Cues may also be anchored to the timeline's words or sentences instead of `t`.

**Hard cap.** No cue may be louder than the voice minus 6 LU, measured as the maximum
K-weighted loudness over 100 ms windows, against the voice as the mixer sets it
(-16 LUFS integrated; its median 100 ms loudness in speech is -16.1). The ducked music
plays no part. Each cue is capped before summing; every capped cue is printed and
listed in `final_mix_report.json` → `sfx.capped` (name, t, dB taken off), and
`sfx_capped_count` is in every `*_report.json`.

**Bed check.** In every 100 ms window where the effects are within 15 LU of the bed:
overshoot = (L_effects - L_bed) - (L_same cues at offset 0 - L_bed). It passes when no
overshoot exceeds 0.5 LU, i.e. the effects never stand further above (or less far
below) the music at that moment than the kit's calibration intends. The report gives
the worst overshoot, the largest excess over the bed, the offending moments with their
cues, and per cue its level, the bed level at its peak and the intended excess.
Outputs `final_mix`, `music_only` (music + SFX, no voice, same normalization) and
`music_bed` (the pure bed at -20 LUFS), each as WAV (48 kHz/24-bit) and M4A (AAC
256k; re-encoded from a re-limited copy if AAC overshoots, so the M4A is <= -1 dBTP
too), each with a loudness report.

Helpers: `mix.py plan` builds a voice plan from timings.json (cuts mid-pause, adds
gaps with `--gap-after SENTENCE:SECONDS`); `mix.py shift` moves timings.json onto
the film timeline (`shift_timings()` in code) so captions follow the edited voice.
With `--timeline` and `--timings`, the mixer checks that timings.json shifted by the
plan reproduces the timeline's sentences and words (currently within 0.5 ms).

## What the numbers say (current build)

- final mix: -14.00 LUFS (ffmpeg -14.07), -1.05 dBTP, LRA 3.1 LU, 101.538 s; M4A
  -14.09 LUFS / -1.07 dBTP. Voice -13.1 LUFS in the mix, music under it 12.5 LU lower;
  ducking averages -8.9 dB during speech, swings 0.5 dB (median) inside a sentence;
  master limiter at most 0.9 dB of gain reduction. 15 cues at offset 0: none capped,
  loudest cue -22.6 LUFS (cap -22.0), bed check passes (worst overshoot 0.0 LU; the
  effects never exceed the bed, the closest is 2.0 LU under it).
- music only: -14.00 LUFS, -1.05 dBTP, LRA 3.4 LU; M4A -14.09 / -1.03 dBTP.
- cap test (`out_hot`): toggle_on +15 asked -13.0 LUFS, capped -9.04 dB; chime_notify
  +14 asked -11.0, capped -10.99 dB; tap with gain_db 0 asked -17.8, capped -4.23 dB;
  tap_soft -3 untouched. Loudest cue exactly at the -22.0 cap. The bed check fails as
  it should: after capping those cues are still +7.0, +6.0 and +3.0 LU above the kit's
  calibration relative to the music (the chime ends up 1.4 LU over the bed).
- bed: -20.00 LUFS, -4.49 dBTP, LRA 4.3 LU; centroid 518 Hz; energy <60 Hz 17 %,
  60-300 Hz 52 %, 300 Hz-3 kHz 27 %, 3-8 kHz 2.6 %, >8 kHz 0.8 %; L/R correlation
  0.71, worst 1/3-octave mono-sum drop -2.1 dB (not phasey); no clicks anywhere.
- `verify.py`: 32/32 checks pass on `out`; on `out_hot`, 31/32 (the bed check is the one
  that fails, by design).

## Limits

- Nobody has listened to any of this: all judgments are numerical. The SFX
  descriptions say what was synthesized, not how it sounds on a given speaker.
- pocketsphinx word boundaries inside continuous speech are good to a few tens of
  ms; a handful can be ~0.1 s off (e.g. "a | real" in sentence 13). Sentence and
  pause edges are snapped to the audio energy and are tighter.
- Three reduced articles ("for a home", "through a licensed", "or a restaurant") are
  30 ms schwas; they are in the audio, just barely.
- ffmpeg's loudnorm and pyloudnorm differ by up to ~0.07 LU; the -14.00 target is
  pyloudnorm's.
