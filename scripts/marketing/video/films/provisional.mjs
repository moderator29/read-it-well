/**
 * A PROVISIONAL CLOCK, so a film can be built before its voice exists.
 *
 *   node films/provisional.mjs <proj> <script.txt>
 *
 * The films hang every beat on a sentence or a word of the voiceover
 * (`s(i)`, `w(i, "word")`), which normally comes from the aligner. This lays
 * the same shape out from the script alone, at the rate the two long films
 * were actually spoken (2.3 words a second, a 0.8 s breath between
 * sentences, a word's length in proportion to its letters), so the whole
 * film can be built, checked and looked at while the recording is still
 * being made.
 *
 * When the real recording lands, run the aligner over it and every beat
 * re-anchors itself: nothing in the film refers to a number of seconds.
 *
 *   python3 ../audio/mix.py align --voice <file.mp3> --script <script.txt>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const [proj, scriptPath] = process.argv.slice(2);
if (!proj || !scriptPath) {
  console.error("usage: node films/provisional.mjs <proj> <script.txt>");
  process.exit(1);
}

const RATE = 2.3;          /* words a second, as the long films were spoken */
const GAP = 0.8;           /* the breath between two sentences */
const LEAD = 0.6;          /* the quiet before the first word */
const TAIL = 2.4;          /* the room the ending needs after the last word */
const BPM = 104;

/* Sentences are the script's own lines; a blank line is a longer breath. */
const raw = readFileSync(scriptPath, "utf8");
const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

const sentences = [];
const words = [];
let t = LEAD;
lines.forEach((text, k) => {
  const i = k + 1;
  const parts = text.split(/\s+/).filter(Boolean);
  /* a sentence's length is its words at the rate, with longer words longer */
  const weight = parts.map((w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, "").length));
  const total = weight.reduce((a, b) => a + b, 0);
  const dur = parts.length / RATE;
  const start = t;
  let at = t;
  parts.forEach((w, j) => {
    const d = (weight[j] / total) * dur;
    words.push({ sentence: i, word: w, start: +at.toFixed(3), end: +(at + d * 0.92).toFixed(3) });
    at += d;
  });
  t = start + dur;
  sentences.push({ i, start: +start.toFixed(3), end: +t.toFixed(3), text });
  t += GAP;
});

const duration = +(t - GAP + TAIL).toFixed(3);
const beat = 60 / BPM;
const out = {
  fps: 60,
  duration,
  provisional: true,
  voice: { plan: [], end: +(t - GAP).toFixed(3) },
  music: { bpm: BPM, beat: +beat.toFixed(6), bar: +(beat * 4).toFixed(6) },
  sentences,
  words,
};
const dir = join(HERE, proj);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "timeline.json"), JSON.stringify(out, null, 1));
console.log(`${proj}: ${sentences.length} sentences, ${words.length} words, ${duration.toFixed(1)} s (provisional)`);
