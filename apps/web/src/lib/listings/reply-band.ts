/**
 * B7: THE REPLY-TIME BAND, AS WORDS. Pure and client-safe.
 *
 * `public.lister_reply_band` answers 'hour', 'hours', 'day' or null, and
 * only when the lister has at least 8 counted conversations in 90 days
 * (`REPLY_BAND_MIN_SAMPLE`, the founder's default). Anything else, including
 * a value this file does not know, is no line at all: the line is absent
 * rather than "New", and a slow band is absent rather than shown.
 */
export type ReplyBand = "hour" | "hours" | "day";

/** Mirrors the SQL's minimum, for the explanation and the tests. */
export const REPLY_BAND_MIN_SAMPLE = 8;

export function parseReplyBand(value: unknown): ReplyBand | null {
  return value === "hour" || value === "hours" || value === "day" ? value : null;
}

export function replyBandText(
  value: unknown,
  copy: { hour: string; hours: string; day: string },
): string | null {
  const band = parseReplyBand(value);
  return band ? copy[band] : null;
}
