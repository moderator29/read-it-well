/**
 * A PATH ON OUR OWN ORIGIN, OR NOTHING. V-53 fix.
 *
 * Every push href, button href and native tap destination passes through
 * here. Testing for a leading "//" was not enough: a browser reads
 * "/\evil.com" as "//evil.com", and strips a tab or newline, so "/\t/evil.com"
 * leaves the origin too. So the value must start with one "/", may carry no
 * backslash and no control character, and must still be on the same origin
 * once the URL parser has resolved it against a placeholder origin.
 * `public/sw.js` carries the same rule in plain JavaScript (`safePushHref`).
 */
const BASE = "https://vallo.invalid";

export function sameOriginPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.length > 2_000) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(trimmed)) return null;
  let resolved: URL;
  try {
    resolved = new URL(trimmed, BASE);
  } catch {
    return null;
  }
  if (resolved.origin !== BASE) return null;
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
