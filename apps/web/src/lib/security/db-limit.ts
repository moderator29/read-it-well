/**
 * SEC-09: the database counts a member's own inserts on messages, posts,
 * story comments, reports, reviews and listings, and refuses the one over
 * the limit with SQLSTATE 54000 and a sentence written for the person. Every
 * action that writes one of those shows that sentence rather than its
 * generic "try again".
 *
 * Client-safe: no server imports.
 */
export const DB_LIMIT_CODE = "54000";

export const DB_LIMIT_MESSAGE = "That is more than we accept in this time. Please wait a little and try again.";

/** The sentence to show when the database refused a write for its rate, or null. */
export function dbLimitRefusal(
  error: { code?: string | null; message?: string | null } | null | undefined,
): string | null {
  if (!error || error.code !== DB_LIMIT_CODE) return null;
  const message = (error.message ?? "").trim();
  return message.length > 0 ? message : DB_LIMIT_MESSAGE;
}
