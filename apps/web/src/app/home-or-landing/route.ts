import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/actions/session";

/**
 * "Home", resolved by who is asking.
 *
 * There are two homes in this product and only one word for them. `/` is the
 * landing page, which exists to explain RentMe to somebody who has never seen
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
