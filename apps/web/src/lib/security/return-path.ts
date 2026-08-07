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
export function safeReturnPath(pathname: string, search: string): string | null {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  const full = `${pathname}${search}`;
  return full.includes("\\") ? null : full;
}
