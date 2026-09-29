import { NextResponse } from "next/server";
import { resolvePasscodeGate, writeUnlock } from "@/lib/passcode/state";

/**
 * THE UNLOCK SLIDES HERE. docs/PASSCODE.md.
 *
 * The browser posts here while the member is active (at most once a minute)
 * and once after a fresh sign-in. A valid unlock is re-signed with a new
 * fifteen-minute expiry and its original issue time; a sign-in in the last
 * five minutes mints one. Anything else answers `locked` and writes nothing.
 *
 * A route handler rather than a server action on purpose: a cookie written by
 * a server action makes Next re-render the route, and a heartbeat must not
 * re-render the page the member is reading. Closed to a stranger by the
 * proxy like every API path not listed as public.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const { view, userId, unlock } = await resolvePasscodeGate();
  const headers = { "cache-control": "no-store" };
  if (view.kind === "open" || !userId) return NextResponse.json({ state: "signed-out" }, { status: 401, headers });
  if (view.kind !== "unlocked") return NextResponse.json({ state: "locked" }, { headers });
  const written = await writeUnlock(userId, unlock?.issuedAt);
  return NextResponse.json({ state: "unlocked", slid: written }, { headers });
}
