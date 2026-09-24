import { NextResponse } from "next/server";
import { probeCatalogue } from "@/lib/ops/catalogue-canary";
import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";

/**
 * OPS-03: the URL an EXTERNAL uptime monitor polls (docs/DEPLOY.md, "Paging a
 * human"). 200 when the published catalogue can be read through the
 * publishable key with no session and is not empty; 503 otherwise. The
 * monitor, not this app, does the paging, so a person still hears about it
 * when the app, its crons and its alert writer are all down.
 *
 * Public and unauthenticated on purpose (listed in `proxy.ts`). It answers a
 * yes or no and a reason token, never a row. Each answer is held at the edge
 * for 30 seconds; a query string (which would be a fresh cache key per
 * request) is redirected to the bare path, and each address may reach the
 * database through here 30 times a minute, so it cannot be used to drive
 * reads without limit. A monitor polls once a minute or less.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT_PER_MINUTE = 30;

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  if (url.search.length > 0) {
    return NextResponse.redirect(new URL(url.pathname, url), {
      status: 308,
      headers: { "cache-control": "public, max-age=3600" },
    });
  }

  const verdict = await consume({
    bucket: "health_catalogue",
    subject: subjectForIp(ipFromHeaders(request.headers)),
    limit: LIMIT_PER_MINUTE,
    windowSeconds: 60,
  });
  if (!verdict.allowed) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { "retry-after": String(verdict.retryAfterSeconds) } },
    );
  }

  const probe = await probeCatalogue(null);
  return NextResponse.json(
    { ok: probe.ok, reason: probe.reason, checkedAt: new Date().toISOString() },
    {
      status: probe.ok ? 200 : 503,
      headers: { "cache-control": "public, max-age=0, s-maxage=30" },
    },
  );
}
