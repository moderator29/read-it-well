/**
 * MAKES A FINISHED FILM: picture, sound, the music-only version, a contact
 * sheet and the measured quality bar.
 *
 *   node scripts/marketing/video/make.mjs --film mobile|desktop [--ending soon|live]
 *     [--workers 3] [--scale 1] [--fps 60] [--from 0] [--to <end>] [--out <dir>]
 *
 * 1. engine/render.mjs renders the silent picture and the film's sound cues.
 * 2. audio/mix.py mixes the voice (placed by timeline.json), the music and
 *    the cues: the final mix and the music-only mix (-14 LUFS, -1 dBTP).
 * 3. ffmpeg muxes <film>-<ending>.mp4 and <film>-<ending>-music-only.mp4.
 * 4. The quality bar: frozen stretches (ffmpeg freezedetect), loudness and
 *    true peak of the finished file, and a contact sheet (5 frames a second).
 *
 * The audio kit's generated files live outside the repo (AUDIO_OUT, default
 * the session scratchpad): voice.mp3, out/music.wav, out/sfx/, out/timings.json.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MARKETING = resolve(HERE, "..");
const args = process.argv.slice(2);
const opt = (name, fallback = null) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const film = opt("film", "mobile");
const ending = opt("ending", "soon");
const SCRATCH = "/tmp/claude-0/-home-user-read-it-well/e877abda-8aaf-57c8-a7aa-c0953c2acde6/scratchpad";
const AUDIO = process.env.AUDIO_OUT ?? join(SCRATCH, "audio");
const OUT = resolve(opt("out", join(SCRATCH, "films")));
mkdirSync(OUT, { recursive: true });
const name = `vallo-${film}-${ending}`;

if (ending === "live") {
  for (const f of ["app-store-black.svg", "google-play-black.svg"]) {
    if (!existsSync(join(HERE, "assets", "badges", f))) {
      console.error(`The live ending needs the official badge file assets/badges/${f}. Render --ending soon, or add the file unmodified.`);
      process.exit(2);
    }
  }
}

const run = (cmd, argv, { capture = false } = {}) => new Promise((ok, fail) => {
  const p = spawn(cmd, argv, { stdio: ["ignore", capture ? "pipe" : "inherit", capture ? "pipe" : "inherit"] });
  let text = "";
  if (capture) { p.stdout.on("data", (d) => (text += d)); p.stderr.on("data", (d) => (text += d)); }
  p.on("close", (code) => (code === 0 ? ok(text) : fail(new Error(`${cmd} exited ${code}\n${text.slice(-2000)}`))));
});

const started = Date.now();
const picture = join(OUT, `${name}.video.mp4`);
const passOn = ["workers", "scale", "fps", "from", "to"].flatMap((k) => (opt(k) != null ? [`--${k}`, opt(k)] : []));
await run("node", [join(HERE, "engine", "render.mjs"), "--film", film, "--ending", ending, "--out", picture, ...passOn]);
const cues = join(OUT, `sfx-${film}.json`);

const mixDir = join(OUT, `${name}-audio`);
await run("python3", [
  join(MARKETING, "audio", "mix.py"), "mix",
  "--voice", join(AUDIO, "voice.mp3"),
  "--timeline", join(HERE, "timeline.json"),
  "--music", join(AUDIO, "out", "music.wav"),
  "--sfx-events", cues,
  "--sfx-dir", join(AUDIO, "out", "sfx"),
  "--timings", join(AUDIO, "out", "timings.json"),
  "--out", mixDir,
]);

const from = Number(opt("from", 0));
const final = join(OUT, `${name}.mp4`);
const musicOnly = join(OUT, `${name}-music-only.mp4`);
for (const [audio, file] of [[join(mixDir, "final_mix.m4a"), final], [join(mixDir, "music_only.m4a"), musicOnly]]) {
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", picture, "-ss", String(from), "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", file]);
}

/* The quality bar, measured. */
const freeze = await run("ffmpeg", ["-hide_banner", "-i", final, "-vf", "freezedetect=n=0.0015:d=0.5", "-map", "0:v", "-f", "null", "-"], { capture: true });
const frozen = [...freeze.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)/g)].map((m) => ({ start: +m[1], seconds: +m[2] }));
const loud = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", final, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"], { capture: true });
const summary = loud.slice(loud.lastIndexOf("Summary:"));
const integrated = +(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1] ?? NaN);
const truePeak = +(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1] ?? NaN);
const sheet = join(OUT, `${name}-sheet.jpg`);
const cols = film === "desktop" ? 10 : 16;
await run("ffmpeg", ["-y", "-loglevel", "error", "-i", final, "-vf", `fps=5,scale=${film === "desktop" ? 192 : 108}:-1,tile=${cols}x${Math.ceil((Number(opt("to", 101.54)) - from) * 5 / cols)}:padding=2:color=0x222222`, "-frames:v", "1", "-q:v", "3", sheet]);

const duration = Number(opt("to", 101.538)) - from;
const quality = {
  film,
  ending,
  seconds: +duration.toFixed(3),
  frozen_over_half_second: frozen,
  frozen_total_seconds: +frozen.reduce((a, f) => a + f.seconds, 0).toFixed(2),
  frozen_budget_seconds: +((duration / 30) * 1).toFixed(2),
  loudness_lufs: integrated,
  true_peak_dbfs: truePeak,
  files: { final, musicOnly, sheet },
  minutes: +((Date.now() - started) / 60000).toFixed(1),
};
writeFileSync(join(OUT, `${name}-quality.json`), JSON.stringify(quality, null, 2) + "\n");
console.log(JSON.stringify(quality, null, 2));
