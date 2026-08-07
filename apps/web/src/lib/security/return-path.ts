/**
 * Where to send somebody back to after they sign in.
 *
 * Lifted out of `middleware.ts` so it can be unit tested. It is the only piece
 * of that file which is pure, and it is also the only piece of it that is a
 * security control in its own right, which is a poor combination for something
 * that had no test. The middleware imports it and behaves exactly as before.
 *
 * Returned as a path, never a URL, and re-checked on the way out. A `next`
 * parameter that accepts an absolute address is an open redirect: an attacker
 * sends `/sign-in?next=https://rentme.ng.evil.example` and the sign-in page
 * somebody trusted hands them to somebody else. The two leading-slash cases
 * matter as much as the scheme, because `//evil.example` is protocol-relative
 * and a browser reads it as a host.
 *
 * The backslash rule is not decoration either. A URL parser treats `\` as a
 * path separator, so `/\evil.example` and `/\\evil.example` are read by the
 * browser as the same protocol-relative address that `//evil.example` is. This
 * exact hole was found and closed in the auth callback once already.
 */
/**
 * The characters a URL parser DELETES rather than rejects.
 *
 * This is the hole the first version of this guard had, and it is worth stating
 * exactly, because the shape is counterintuitive. TAB, LF and CR are stripped
 * out of a URL by the WHATWG parser BEFORE it resolves anything. So a string
 * that this function inspects as `/<TAB>/evil.example`, sees beginning with a
 * single slash, and passes, is handed to the browser as `//evil.example`, which
 * is protocol-relative, which is a host.
 *
 * Measured, not assumed:
 *
 *     new URL("/\t/evil.example", "https://rentme.ng")  ->  https://evil.example/
 *     new URL("/\n/evil.example", "https://rentme.ng")  ->  https://evil.example/
 *     new URL("/\r/evil.example", "https://rentme.ng")  ->  https://evil.example/
 *
 * The rest of the C0 range is refused with them. None of it has any business in
 * a path this application generates, the cost of refusing it is nothing, and
 * enumerating "the three that are stripped today" invites the next parser
 * change to reopen this.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeReturnPath(pathname: string, search: string): string | null {
  const full = `${pathname}${search}`;

  /* Checked on the WHOLE string, before anything else, because the query is
     just as attacker controlled as the path and a redirect is built from
     both. */
  if (CONTROL_CHARACTERS.test(full)) return null;

  /*
   * And on the percent-encoded forms, decoded once.
   *
   * A guard that only reads raw bytes is bypassed by whatever decodes later.
   * `%09`, `%0a` and `%0d` are the same three characters, and one decode is
   * enough because this value is written into a query parameter and read back
   * once, not passed through a chain. A malformed sequence throws, and a `next`
   * value that is not valid percent-encoding is not one worth honouring.
   */
  let decoded: string;
  try {
    decoded = decodeURIComponent(full);
  } catch {
    return null;
  }
  if (CONTROL_CHARACTERS.test(decoded)) return null;

  if (!pathname.startsWith("/")) return null;
  /* Both the raw and the decoded form, so `/%2fevil.example` cannot become
     `//evil.example` after the fact. */
  if (pathname.startsWith("//") || decoded.startsWith("//")) return null;
  if (full.includes("\\") || decoded.includes("\\")) return null;

  return full;
}
