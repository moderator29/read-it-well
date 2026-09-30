import { NextResponse } from "next/server";
import { recordFunnelStep } from "@/lib/funnel/record";
import { asDoor, BEACON_STEPS, isFunnelStep } from "@/lib/funnel/steps";
import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";

/**
 * A6. The funnel beacon. `navigator.sendBeacon` posts `{ step, door }`; the
 * visit id rides in the session cookie. Only the browser-side steps are
 * accepted here (landing view, get started, the sign-up form's steps); the
 * others are recorded by the server where they happen. Always 204, so a
 * page learns nothing from it, and rate limited per address so it cannot be
 * used to fill the table.
 */
export const dynamic = "force-dynamic";

const EMPTY = () => new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    const text = await request.text();
    body = text.length <= 512 ? JSON.parse(text) : null;
  } catch {
    return EMPTY();
  }
  const step = (body as { step?: unknown } | null)?.step;
  if (!isFunnelStep(step) || !BEACON_STEPS.includes(step)) return EMPTY();
  const verdict = await consume({
    bucket: "funnel_beacon",
    subject: subjectForIp(ipFromHeaders(request.headers)),
    limit: 60,
    windowSeconds: 600,
  });
  if (!verdict.allowed) return EMPTY();
  await recordFunnelStep(step, asDoor((body as { door?: unknown }).door));
  return EMPTY();
}
