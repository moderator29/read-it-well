/**
 * The database's content scanner (SEC-05) refuses a write it cannot hold for
 * review — a review, a host reply, a name, a handle — with SQLSTATE RM004 and
 * a sentence written for the person. Surfaces that can hold (posts, stories,
 * comments, events, listings) hold instead and never raise it.
 *
 * Client-safe: no server imports.
 */
export const CONTENT_REFUSED_CODE = "RM004";

const FALLBACK =
  "That uses words our content standards do not allow. Please reword it and try again.";

/** The sentence to show when the write was refused for its content, or null. */
export function contentRefusal(
  error: { code?: string | null; message?: string | null } | null | undefined,
): string | null {
  if (!error || error.code !== CONTENT_REFUSED_CODE) return null;
  const message = (error.message ?? "").trim();
  return message.length > 0 ? message : FALLBACK;
}
