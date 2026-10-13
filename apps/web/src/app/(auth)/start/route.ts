import { NextResponse } from "next/server";

/**
 * Get started (the landing capsule, the header, the menu): the sign-up door.
 *
 * The person pressed Get started, so where they are going is sign up. The
 * door itself decides whether this device meets the onboarding first (once,
 * `app/(auth)/sign-in/first-run-gate.ts`, the founder, 7 October), so this
 * address hands straight over and a device that has seen it takes one hop.
 *
 * A route handler rather than a page, so the answer is a real 307 before any
 * HTML: a page would stream the root loading frame first and redirect from
 * inside the document.
 */
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/sign-up", request.url), { status: 307 });
}
