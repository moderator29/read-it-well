import { NextResponse } from "next/server";
import { firstRunHref } from "@/components/app/welcome/first-run-seen";

/**
 * The old intro address, kept so nothing that links here breaks.
 *
 * `/start` used to render a two-slide carousel on the way to sign up. First
 * run at `/welcome` replaces it, so this address now hands straight over,
 * carrying the intent every link to it had: the person pressed Get started,
 * so where they are going afterwards is sign up. Somebody who has already
 * been shown first run on this device goes straight through (`/welcome`
 * decides that, not this file).
 *
 * A route handler rather than a page, so the answer is a real 307 before any
 * HTML: a page would stream the root loading frame first and redirect from
 * inside the document.
 */
export function GET(request: Request) {
  return NextResponse.redirect(new URL(firstRunHref("/sign-up"), request.url), { status: 307 });
}
