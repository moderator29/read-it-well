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
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/home";

  // Only a plain, same-site absolute path is allowed onward.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/home";

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

  return NextResponse.redirect(new URL(next, url.origin));
}
