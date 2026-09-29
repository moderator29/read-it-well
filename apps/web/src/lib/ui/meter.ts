/**
 * THE SEGMENTED METER'S MATHS (references 33 and 34, spec section 10).
 *
 * Ten rounded bars; the number lit is the value, the colour is the level, and
 * a word beside it names the band. This file decides the count and the level
 * and nothing else, so every card that draws a meter lights the same number of
 * bars for the same fact, and the arithmetic is tested rather than trusted.
 *
 * WHAT A METER IS ALLOWED TO ENCODE. Only a fact the platform holds:
 *
 *   ratingFill       an average star rating, out of five, onto ten bars
 *   countFill        a real count (listings a figure came from), one bar each,
 *                    capped at ten; the word beside it prints the true count
 *   CONFIDENCE_FILL  a confidence BAND the database computed, drawn as three,
 *                    six or nine bars. It is a picture of the band's word and
 *                    never printed as a number, so it cannot read as a
 *                    percentage nobody computed.
 *
 * Pure, so the suite can load it (`vitest.config.ts` cannot import a `.tsx`).
 */

/** Every meter on the platform has this many bars. */
export const METER_SEGMENTS = 10;

export type MeterLevel = "none" | "low" | "mid" | "high";

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * How many of `segments` bars a `value` out of `max` lights.
 *
 * Rounded to the nearest bar, clamped to the track, and never zero for a value
 * above zero: a real, small figure that drew an empty track would read as
 * "nothing", which is a different and untrue statement.
 */
export function meterFill(value: number, max: number, segments: number = METER_SEGMENTS): number {
  const v = finite(value);
  const m = finite(max);
  if (m <= 0 || v <= 0 || segments <= 0) return 0;
  const lit = Math.round((Math.min(v, m) / m) * segments);
  return Math.max(1, Math.min(segments, lit));
}

/**
 * The level a lit count reads as, which decides the colour.
 * 0 is none, 1 to 3 low, 4 to 6 mid, 7 and up high (on a ten bar track;
 * other lengths scale by the same thirds).
 */
export function meterLevel(filled: number, segments: number = METER_SEGMENTS): MeterLevel {
  const f = Math.max(0, Math.min(segments, Math.round(finite(filled))));
  if (f === 0 || segments <= 0) return "none";
  const share = f / segments;
  if (share <= 0.3) return "low";
  if (share <= 0.6) return "mid";
  return "high";
}

/** The bars themselves, lit first, for a renderer that maps over them. */
export function meterBars(filled: number, segments: number = METER_SEGMENTS): boolean[] {
  const f = Math.max(0, Math.min(segments, Math.round(finite(filled))));
  return Array.from({ length: Math.max(0, segments) }, (_, index) => index < f);
}

/** An average rating out of five, onto the ten bar track: 4.8 lights ten, 3.2 lights six. */
export function ratingFill(average: number | null): number {
  if (average === null) return 0;
  return meterFill(average, 5);
}

/** One bar per item of a real count, up to the track's length. */
export function countFill(count: number): number {
  const c = Math.floor(finite(count));
  return Math.max(0, Math.min(METER_SEGMENTS, c));
}

/**
 * A confidence band as bars. Three, six, nine: never ten, because no estimate
 * on this platform is certain, and never a number on the card.
 */
export const CONFIDENCE_FILL: Record<"low" | "medium" | "high", number> = {
  low: 3,
  medium: 6,
  high: 9,
};
