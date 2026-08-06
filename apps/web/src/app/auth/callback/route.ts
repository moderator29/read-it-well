import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * The auth callback.
 *
 * Every route out of Supabase Auth lands here: an OAuth handshake, a
 * confirmation link from a sign-up email, a magic link, a recovery link. The
 * code in the query string is exchanged for a real session, which sets the
 * cookies the rest of the platform reads, and then the person is sent on to
 * wherever they were heading.
 *
 * `next` is validated as a same-site path before being used. An open redirect
 * here would let a forged link carry a freshly signed-in user to somebody
 * else's domain, which is exactly the kind of thing a phishing message wants.
 */

/**
 * Resolve `next` against our own origin and refuse anything that lands
 * elsewhere.
 *
 * The prefix test this replaced, "starts with / and not with //", reads as
 * though it covers the protocol-relative case, and it does. What it does not
 * cover is the backslash: the URL parser treats `\` as a path separator for
 * http and https, so `/\evil.example` passes both halves of that test and then
 * resolves to `https://evil.example/`. Chained to a real sign-in it is a
 * working open redirect, and the sign-in is not hard to arrange, because the
 * Supabase authorize endpoint accepts any `redirect_to` under an allowed host
 * and the path and query of that URL belong to whoever built the link.
 *
 * So the check is no longer a guess about which characters are dangerous.
 * The candidate is resolved exactly as the redirect will resolve it, and it is
 * only used when the result is on this origin. Anything else, including a
 * value the parser refuses outright, falls back to home.
 *
 * It returns the finished absolute URL rather than a path, and that is the
 * point rather than a convenience. Handing back a path means resolving it a
 * second time at the redirect, and the second resolution does not have to
 * agree with the first: `/..//evil.example` resolves onto this origin with the
 * path `//evil.example`, which is protocol-relative all over again the moment
 * anything resolves it afresh. One resolution, checked, then used as it stands.
 */
function safeRedirectUrl(raw: string, origin: string): URL {
  const home = new URL("/home", origin);
  if (!raw.startsWith("/")) return home;
  try {
    const resolved = new URL(raw, origin);
    return resolved.origin === origin ? resolved : home;
  } catch {
    return home;
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/home";

  // Only a value that resolves onto this origin is allowed onward.
  const next = safeRedirectUrl(rawNext, url.origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/sign-in?notice=unconfigured", url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?notice=link-invalid", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // An expired or reused link is the common case, and it deserves a plain
    // explanation on the sign-in screen rather than a stack trace.
    return NextResponse.redirect(new URL("/sign-in?notice=link-expired", url.origin));
  }

  return NextResponse.redirect(next);
}
