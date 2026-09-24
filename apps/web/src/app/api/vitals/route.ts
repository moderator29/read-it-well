import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitiseVitals } from "@/lib/observability/vitals";

/**
 * FIELD SPEED INGEST. V-80.
 *
 * One small JSON body per sampled page view, sent with `sendBeacon` as the
 * page is hidden. Always answers 204: a phone must never retry, and a failed
 * write costs one sample. The body is re-read by `sanitiseVitals`, which keeps
 * only a route template, the numbers, the connection class and Save-Data. No
 * user id, no session, no IP, no agent is written (the migration
 * `20260924160200_v80_...sql` says why).
 *
 * Behind the sign-in wall like every API route not named in the proxy's
 * public list, so signed-out doors are not measured yet; adding this path to
 * `PUBLIC_API_PATHS` is the one change that would measure them, and it is
 * the proxy owner's call.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_048;

/* One sample per page view is the most a phone sends; this bounds a process
   against a script that ignores that. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 600;
let windowStart = 0;
let windowCount = 0;

export async function POST(request: Request): Promise<NextResponse> {
  const done = new NextResponse(null, { status: 204 });
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= MAX_PER_WINDOW) return done;
  windowCount += 1;

  let rows;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return done;
    rows = sanitiseVitals(JSON.parse(raw));
  } catch {
    return done;
  }
  if (!rows) return done;

  try {
    const admin = createAdminClient() as unknown as {
      from: (t: string) => { insert: (rows: unknown[]) => Promise<{ error: unknown }> };
    };
    await admin.from("web_vitals_samples").insert(rows);
  } catch {
    /* No service key, or the table is not there yet: one sample lost. */
  }
  return done;
}
