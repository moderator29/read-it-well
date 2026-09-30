/**
 * The short reference an error screen shows, so a member has something to
 * quote to support and support can find the report (C13).
 *
 * A server error arrives at a boundary with Next's `digest`, a long hex id
 * that is also on the crash report (`context.digest`, see
 * `lib/observability/report.ts`) and in the server log. Eight characters of
 * it are enough to find the report by prefix and short enough to read out on
 * a phone call, so the screen shows `A1B2C3D4`, not the whole string.
 *
 * A client render error has no digest. For that one a reference is made in
 * the browser (`C-` and six characters), remembered against the error object
 * so the screen and the report carry the same one, and sent as the report's
 * digest. Nothing about the person or the page is in it.
 */

/** An error, or anything carrying a digest (Next hands boundaries both). */
export type WithDigest = { digest?: string | undefined; message?: string };

const SHORT = 8;
const made = new WeakMap<object, string>();

/** The first eight characters of a digest, upper-cased; null when there is none. */
export function shortReference(digest: string | null | undefined): string | null {
  if (!digest) return null;
  const clean = digest.replace(/[^a-z0-9-]/gi, "");
  if (!clean) return null;
  if (/^C-/i.test(clean)) return clean.toUpperCase();
  return clean.slice(0, SHORT).toUpperCase();
}

function randomTail(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * The digest to report and to show for this error: Next's own when it has
 * one, otherwise a client reference made once for this error object.
 */
export function digestFor(error: WithDigest | null | undefined): string {
  if (error?.digest) return error.digest;
  if (error && typeof error === "object") {
    const existing = made.get(error);
    if (existing) return existing;
    const ref = `C-${randomTail()}`;
    made.set(error, ref);
    return ref;
  }
  return `C-${randomTail()}`;
}

/** What the screen shows: the short form of `digestFor`. */
export function referenceFor(error: WithDigest | null | undefined): string {
  return shortReference(digestFor(error)) ?? "";
}
