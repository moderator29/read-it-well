import { NextResponse } from "next/server";
import { probeCatalogue } from "@/lib/ops/catalogue-canary";

/**
 * OPS-03: the URL an EXTERNAL uptime monitor polls (docs/DEPLOY.md, "Paging a
 * human"). 200 when the published catalogue can be read through the
 * publishable key with no session and is not empty; 503 otherwise. The
 * monitor, not this app, does the paging, so a person still hears about it
 * when the app, its crons and its alert writer are all down.
 *
 * Public and unauthenticated on purpose (listed in `proxy.ts`). It answers a
 * yes or no and a reason token, never a row. Two head counts and a one-row
 * read per call, and the CDN holds each answer for 30 seconds, so polling it
 * costs the database almost nothing and hammering it costs little more.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const probe = await probeCatalogue(null);
  return NextResponse.json(
    { ok: probe.ok, reason: probe.reason, checkedAt: new Date().toISOString() },
    {
      status: probe.ok ? 200 : 503,
      headers: { "cache-control": "public, max-age=0, s-maxage=30" },
    },
  );
}
