import { createHash, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { getDictionary, DEFAULT_LOCALE } from "@vallo/i18n";
import { handleInboundReply } from "@/lib/landlord/inbound";
import { parseReply } from "@/lib/landlord/message";
import { cloudTransport, inboundMessages, inboundSignatureValid } from "@/lib/notify/whatsapp";
import { consume } from "@/lib/security/rate-limit";
import { getAdminClient } from "@/lib/wallet/ledger";
import { siteUrl } from "@/lib/site";

/**
 * WHATSAPP INBOUND: ONE AUTOMATIC REPLY, AND NO HUMAN EVER. V-96.
 *
 * Meta's webhook for Vallo's WhatsApp number. GET is Meta's verification
 * handshake (`hub.verify_token` against WHATSAPP_VERIFY_TOKEN, compared in
 * constant time). POST carries messages, signed with the app secret
 * (`X-Hub-Signature-256`, checked in constant time); an unsigned or wrongly
 * signed body is refused.
 *
 * What a message gets:
 *   - a landlord line reply ("1 K7RX", STOP) goes to the landlord line's own
 *     handler (V-31, V-32), which answers it; this route adds nothing;
 *   - anything else gets ONE sentence, "We only talk inside Vallo, so there is
 *     always a record", with a link to Messages, at most once a day per
 *     sender (counted by a hash of the number, never the number). Nothing is
 *     read, stored or forwarded to a person.
 *
 * Meta redelivers anything it did not see a 200 for, so the answer is 200 at
 * once and the work runs after the response (`after`); each message id
 * (wamid) is handled once however often it is delivered: its hash is
 * inserted into `whatsapp_inbound_seen` (on conflict do nothing), and only
 * the insert that made the row acts. When that cannot be written, nothing is
 * sent: a missed reply is better than a doubled one.
 *
 * FAILS CLOSED: no WHATSAPP_APP_SECRET is a 503 for every caller. The
 * response never echoes a number or a message.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameText(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  const url = new URL(request.url);
  if (token.length === 0) return new NextResponse(null, { status: 503 });
  if (url.searchParams.get("hub.mode") === "subscribe" && sameText(url.searchParams.get("hub.verify_token") ?? "", token)) {
    return new NextResponse(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse(null, { status: 403 });
}

const MAX_BODY = 64_000;
const DAY = 86_400;

const hashed = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);

/** True only for the delivery that inserted this message id's row. */
async function firstSighting(admin: NonNullable<ReturnType<typeof getAdminClient>>, wamid: string): Promise<boolean> {
  try {
    const { data, error } = await (admin as unknown as {
      from: (t: string) => {
        upsert: (row: object, options: object) => { select: (c: string) => PromiseLike<{ data: unknown; error: unknown }> };
      };
    })
      .from("whatsapp_inbound_seen")
      .upsert({ wamid_hash: hashed(wamid) }, { onConflict: "wamid_hash", ignoreDuplicates: true })
      .select("wamid_hash");
    return !error && Array.isArray(data) && data.length === 1;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > MAX_BODY) return NextResponse.json({ ok: false }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY) return NextResponse.json({ ok: false }, { status: 413 });
  if (!(await inboundSignatureValid(raw, request.headers.get("x-hub-signature-256"), secret))) {
    return NextResponse.json({ ok: false, reason: "unauthorised" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const messages = inboundMessages(payload);
  after(async () => {
    const transport = cloudTransport();
    const admin = getAdminClient();
    const reply = getDictionary(DEFAULT_LOCALE).platform.whatsapp.autoReply.replace("{link}", `${siteUrl()}/messages`);
    for (const message of messages) {
      /* Once per message, however many times Meta delivers it. */
      if (!message.id || !admin || !(await firstSighting(admin, message.id))) continue;
      if (message.text && parseReply(message.text) && admin) {
        /* The landlord line's reply; it owns the answer. */
        await handleInboundReply(admin, { from: message.from, text: message.text, channel: "whatsapp" });
        continue;
      }
      /* One automatic reply a day per sender, counted by a hash of the number. */
      const today = await consume({ bucket: "whatsapp_auto_reply", subject: `wa:${hashed(message.from)}`, limit: 1, windowSeconds: DAY });
      if (!today.allowed || today.degraded) continue;
      await transport.sendText(message.from, reply);
    }
  });
  return NextResponse.json({ ok: true });
}
