import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/actions/session";
import { FIRST_RUN_COOKIE, isFirstRunSeen } from "@/components/app/welcome/first-run-seen";
import { isShellRequest, shellStartPath } from "@/lib/native/shell";

/**
 * "Home", resolved by who is asking.
 *
 * There are two homes in this product and only one word for them. `/` is the
 * landing page, which exists to explain Vallo to somebody who has never seen
 * it. `/home` is the first screen inside the platform, which is what "home"
 * means to anybody who has signed in.
 *
 * Every dead end offered "Back to home" and half of them pointed at `/`. So a
 * signed-in person who hit a 404 was thrown out of the product and onto the
 * marketing page, which reads as being logged out. The owner put it plainly:
 * that button should never take them to the landing page.
 *
 * The 404 page can answer this for itself because it renders on the server.
 * The error boundaries cannot: an error boundary is a client component by
 * requirement, so it has no session to read and the auth cookies are httpOnly
 * by design. Rather than give the two cases different answers, or have a
 * client guess from something it should not be able to see, both ask here.
 *
 * A redirect, not a page. There is nothing to render and nothing to cache: the
 * answer depends entirely on the caller's own cookies.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession();
  const url = new URL(request.url);
  /*
   * THE STORE SHELL NEVER GETS THE LANDING PAGE (V-11). `?app=1`, or the
   * shell's own user agent mark, resolves to `/home`, `/welcome` or
   * `/sign-in`, and never to `/`. See `lib/native/shell.ts` for why this is
   * decided here rather than by pointing `server.url` at a path.
   */
  if (isShellRequest({ userAgent: request.headers.get("user-agent"), app: url.searchParams.get("app") })) {
    const seen = isFirstRunSeen((await cookies()).get(FIRST_RUN_COOKIE)?.value);
    const start = shellStartPath({ signedIn: session.state === "signed-in", firstRunSeen: seen });
    return NextResponse.redirect(new URL(start, request.url), { status: 307 });
  }
  /* Unconfigured is landing too, and deliberately so. With no platform keys
     nothing inside can load, so sending somebody to `/home` would swap one
     dead end for another. */
  const target = session.state === "signed-in" ? "/home" : "/";
  return NextResponse.redirect(new URL(target, request.url), {
    /* 307, not 308. Where somebody belongs changes when they sign in or out,
       so this answer must never be cached by a browser as permanent. */
    status: 307,
  });
}
