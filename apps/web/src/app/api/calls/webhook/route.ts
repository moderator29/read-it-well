import { NextResponse } from "next/server";
import { getCallProvider } from "@/lib/calls/provider";
import { callRpc } from "@/lib/calls/rpc";
import { handleProviderWebhook, providerEventArgs } from "@/lib/calls/webhook";
import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";
import { getAdminClient } from "@/lib/supabase/service";

/**
 * POST /api/calls/webhook. The media provider's room and participant events.
 *
 * Open to the internet with no session (listed in `PUBLIC_API_PATHS` in
 * `src/proxy.ts`), guarded by the provider's signature over the raw body,
 * which `lib/calls/webhook.ts` verifies before anything is parsed. Configure
 * it in the LiveKit Cloud dashboard as `https://www.vallospaces.com/api/calls/webhook`
 * (VIDEO-CALLING-PRODUCTION-CHECKLIST.md).
 *
 * Nothing about the request is logged but the outcome and the provider's
 * event id: no body, no header, no identity.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bad signatures from one address before it is turned away for a while. */
const BAD_SIGNATURE_LIMIT = 30;
const BAD_SIGNATURE_WINDOW_SECONDS = 300;

export async function POST(request: Request): Promise<NextResponse> {
  const provider = getCallProvider();
  const admin = getAdminClient();
  if (!provider || !admin) {
    return NextResponse.json({ ok: false, error: "calls are not configured" }, { status: 503 });
  }
  const ip = ipFromHeaders(request.headers);
  const raw = await request.text();
  const verdict = await handleProviderWebhook(
    {
      provider,
      record: (event) => callRpc(admin, "call_provider_event", providerEventArgs(event)),
      closeRoom: (room) => provider.endRoom(room),
    },
    raw,
    request.headers.get("authorization"),
  );

  if (verdict.status === 401) {
    const limit = await consume({
      bucket: "calls_webhook_bad_signature",
      subject: subjectForIp(ip),
      limit: BAD_SIGNATURE_LIMIT,
      windowSeconds: BAD_SIGNATURE_WINDOW_SECONDS,
    });
    if (!limit.allowed) {
      return NextResponse.json({ ok: false }, { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (verdict.status === 503) {
    console.warn(`[calls] webhook not recorded event=${verdict.eventId ?? "-"}`);
  }
  return NextResponse.json({ ok: verdict.status === 200, outcome: verdict.outcome }, { status: verdict.status });
}
