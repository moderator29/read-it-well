import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/cron/auth";
import { handleInboundReply } from "@/lib/landlord/inbound";
import { getAdminClient } from "@/lib/wallet/ledger";

/**
 * POST /api/landlord/inbound. A landlord's SMS or WhatsApp reply, as the
 * aggregator reports it. V-31 and V-32.
 *
 * A PUBLIC API PATH, because an aggregator has no session, and guarded the
 * way every other public API path here is guarded: by a secret nobody else
 * holds. `Authorization: Bearer <LANDLORD_INBOUND_SECRET>`, compared in
 * constant time by the same helper the cron door uses.
 *
 * FAILS CLOSED. No secret configured is a 503 for every caller, including a
 * correct one, so an unconfigured deployment cannot be answered for a
 * landlord by anybody who guesses the path. No service key is also a 503.
 *
 * The body is `{ "from": "+234...", "text": "1 K7RX", "channel": "sms" }`.
 * An aggregator's own field names are mapped in the one line below that
 * reads them when the vendor is chosen (see lib/landlord/channel.ts, the
 * swap). The response is a state word and never echoes the number or the
 * text, because aggregators log responses.
 *
 * With the stub transport there is no aggregator; the loop test calls
 * `handleInboundReply` directly, which is exactly what this route calls.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.LANDLORD_INBOUND_SECRET ?? "";
  if (secret.trim().length === 0) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ ok: false, reason: "unauthorised" }, { status: 401 });
  }
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, reason: "service_role_key_missing" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const row = (body ?? {}) as Record<string, unknown>;
  const from = typeof row.from === "string" ? row.from : "";
  const text = typeof row.text === "string" ? row.text : "";
  const channel = row.channel === "whatsapp" ? "whatsapp" : "sms";
  if (!from || !text) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const outcome = await handleInboundReply(admin, { from, text, channel });
  return NextResponse.json({ ok: outcome !== "failed", outcome }, { status: outcome === "failed" ? 500 : 200 });
}
