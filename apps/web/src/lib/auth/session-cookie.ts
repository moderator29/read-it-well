/**
 * WHETHER A REQUEST LOOKS SIGNED IN, FROM COOKIE NAMES ALONE.
 *
 * The landing's top capsule hides its Sign in and Sign up buttons from a
 * visitor who is already signed in (the founder, 7 October 2026). The
 * landing must not wait on an auth round trip to draw its header, so this
 * reads only the names of the cookies the request carries, the same test
 * `proxy.ts` (`carriesSessionCookie`) and `home-or-landing` (`guessSignedIn`)
 * already use: a Supabase session cookie is `sb-<project>-auth-token`, split
 * into `.0`, `.1` chunks when it is long.
 *
 * One refinement: `sb-<project>-auth-token-code-verifier` is written while a
 * sign-in is still in flight, before there is any session, so it is not
 * counted. A stale session cookie can still make a signed-out visitor look
 * signed in; that visitor keeps Sign in and Sign up in the capsule's menu,
 * so nothing is lost. This is a presentation hint and never an auth decision:
 * every guard keeps its own check.
 *
 * Client-safe: a pure function.
 */
export function carriesSessionCookie(names: readonly string[]): boolean {
  return names.some((name) => name.startsWith("sb-") && name.includes("-auth-token") && !name.endsWith("-code-verifier"));
}
