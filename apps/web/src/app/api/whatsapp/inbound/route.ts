import { NextResponse } from "next/server";
import { getDictionary, DEFAULT_LOCALE } from "@vallo/i18n";
import { handleInboundReply } from "@/lib/landlord/inbound";
import { parseReply } from "@/lib/landlord/message";
import { cloudTransport, inboundMessages, inboundSignatureValid } from "@/lib/notify/whatsapp";
import { getAdminClient } from "@/lib/wallet/ledger";
import { authOrigin } from "@/lib/site";

/**
 * WHATSAPP INBOUND: ONE AUTOMATIC REPLY, AND NO HUMAN EVER. V-96.
 *
 * Meta's webhook for Vallo's WhatsApp number. GET is Meta's verification
 * handshake (`hub.verify_token` against WHATSAPP_VERIFY_TOKEN). POST carries
 * messages, signed with the app secret (`X-Hub-Signature-256`, checked in
 * constant time); an unsigned or wrongly signed body is refused.
 *
 * What a message gets:
 *   - a landlord line reply ("1 K7RX", STOP) goes to the landlord line's own
 *     handler (V-31, V-32), which answers it; this route adds nothing;
 *   - anything else gets ONE sentence, "We only talk inside Vallo, so there is
 *     always a record", with a link to Messages. Nothing is read, stored or
 *     forwarded to a person.
 *
 * FAILS CLOSED: no WHATSAPP_APP_SECRET is a 503 for every caller. The
 * response never echoes a number or a message. Reaching this path without a
 * session needs it in the proxy's public API list.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const token = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  const url = new URL(request.url);
  if (token.length === 0) return new NextResponse(null, { status: 503 });
  if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === token) {
    return new NextResponse(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse(null, { status: 403 });
}

const MAX_BODY = 64_000;

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > MAX_BODY) return NextResponse.json({ ok: false }, { status: 413 });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ ok: false }, { status: 413 });
  if (!(await inboundSignatureValid(raw, request.headers.get("x-hub-signature-256"), secret))) {
    return NextResponse.json({ ok: false, reason: "unauthorised" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const transport = cloudTransport();
  const admin = getAdminClient();
  const reply = getDictionary(DEFAULT_LOCALE).platform.whatsapp.autoReply.replace("{link}", `${await authOrigin()}/messages`);
  let replied = 0;
  for (const message of inboundMessages(payload)) {
    if (message.text && parseReply(message.text) && admin) {
      /* The landlord line's reply; it owns the answer. */
      await handleInboundReply(admin, { from: message.from, text: message.text, channel: "whatsapp" });
      continue;
    }
    const sent = await transport.sendText(message.from, reply);
    if (sent.outcome === "sent") replied += 1;
  }
  /* Meta retries anything that is not a 200; a failed auto-reply is not worth a retry storm. */
  return NextResponse.json({ ok: true, replied });
}

