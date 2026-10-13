import { NextResponse } from "next/server";
import { INVITE_COOKIE, INVITE_COOKIE_SECONDS, normaliseInviteCode } from "@/lib/referral/code";

/**
 * AN INVITE LINK GOES THROUGH THE ONE ONBOARDING (the founder, 7 October
 * 2026: "In referral remove that").
 *
 * `/join/<code>` used to be its own get-started screen: a gift, "You were
 * invited to Vallo", a paragraph, Create your account and I already have an
 * account. That was a second get-started beside the carousel, so it is gone.
 * The link now keeps the code in a first-party cookie for sign-up to record
 * (A5, `lib/referral/server.ts` reads it, the auth action checks it again) and
 * hands the person to the sign-up door, which shows the onboarding first on a
 * device that has never seen it (`app/(auth)/sign-in/first-run-gate.ts`), then
 * the sign-up page. A code that is not well formed is simply not kept; the
 * person still reaches sign-up.
 *
 * A 303 with no-store: the answer sets a cookie and must never be cached.
 */
export function inviteHandOff(request: Request, raw: string): NextResponse {
  const code = normaliseInviteCode(raw);
  const response = NextResponse.redirect(new URL("/sign-up", request.url), { status: 303 });
  response.headers.set("cache-control", "no-store");
  if (code) {
    response.cookies.set(INVITE_COOKIE, code, {
      path: "/",
      maxAge: INVITE_COOKIE_SECONDS,
      sameSite: "lax",
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
    });
  }
  return response;
}
