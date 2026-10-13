/**
 * VOICE NOTES: THE TWO PURE PIECES (north star 15.4).
 *
 * Nigerian property conversations happen in voice notes, so a voice note in a
 * thread has to say how long it is and what it sounds like before it is
 * played. Both come from the REAL audio, never from a template:
 *
 *   `peaksFrom`        reduces decoded samples to a fixed number of bars, each
 *                      the loudest sample in its slice, scaled so the loudest
 *                      bar of THIS recording is full height. A silent
 *                      recording is flat, honestly flat.
 *   `formatDuration`   "0:07", "1:05", "12:30", for a length in milliseconds.
 *
 * Where the row carries stored peaks and a duration (request W5-3 asks
 * Session 2 for them), the component uses those and decodes nothing. Where it
 * does not, the component decodes the file in the browser when it scrolls into
 * view. Where that fails too, it draws a plain track and no bars, and the
 * duration only once the player knows it: never an invented waveform, never a
 * made-up length.
 */

/** Bars across the waveform. Enough to read as a voice, few enough to be a row. */
export const VOICE_BARS = 40;

/** The smallest drawn bar, as a fraction of full height, so a quiet bar is still a mark. */
export const MIN_BAR = 0.08;

export function peaksFrom(samples: ArrayLike<number>, bars: number = VOICE_BARS): number[] {
  if (bars <= 0 || samples.length === 0) return [];
  const out: number[] = [];
  const slice = samples.length / bars;
  for (let i = 0; i < bars; i += 1) {
    const from = Math.floor(i * slice);
    const to = Math.max(from + 1, Math.floor((i + 1) * slice));
    let peak = 0;
    for (let j = from; j < to && j < samples.length; j += 1) {
      const v = Math.abs(samples[j]!);
      if (v > peak) peak = v;
    }
    out.push(peak);
  }
  const loudest = Math.max(...out);
  /* A silent recording stays flat rather than dividing zero by zero. */
  if (loudest === 0) return out.map(() => MIN_BAR);
  return out.map((p) => Math.max(MIN_BAR, p / loudest));
}

/** "0:07", "1:05", "12:30". Null and negative lengths read as nothing at all. */
export function formatDuration(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return null;
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
