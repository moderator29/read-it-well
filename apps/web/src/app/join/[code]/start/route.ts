import { NextResponse } from "next/server";
import { INVITE_COOKIE, INVITE_COOKIE_SECONDS, normaliseInviteCode } from "@/lib/referral/code";

/**
 * A5. The invite door's "Create your account": leaves the code in a
 * first-party cookie for sign-up to record, then goes to sign-up. A code that
 * is not well formed is simply not kept; the person still reaches sign-up.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = normaliseInviteCode((await params).code);
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
