import { normalisePhone } from "../phone";
import { parseReply } from "./message";
import { callLandlordRpc } from "./rpc";

/**
 * AN SMS OR WHATSAPP REPLY FROM A LANDLORD, AS AN AGGREGATOR REPORTS IT.
 *
 * The route in `app/api/landlord/inbound` authenticates the aggregator and
 * hands the sender's number and the text here. This reads the text with
 * `parseReply`, normalises the number to the E.164 form `listing_mandates`
 * stores, and asks the database, which matches on that number AND the
 * question's own reply code, so a forwarded text cannot answer for another
 * flat, and which applies the answer (a "let" takes every copy down in the
 * same transaction).
 *
 * The outcome is a word, never an echo of the number or the text, because the
 * route returns it to the aggregator and aggregators log responses.
 *
 * With the stub transport there is no aggregator, and this is exactly the
 * function a test calls to simulate one.
 */

export type InboundInput = { from: string; text: string; channel: "sms" | "whatsapp" };

export type InboundOutcome =
  | "answered"
  | "stopped"
  | "unknown"
  | "ambiguous"
  | "used"
  | "invalid"
  | "closed"
  | "failed";

const KNOWN: ReadonlySet<string> = new Set(["answered", "stopped", "unknown", "ambiguous", "used", "invalid", "closed"]);

export async function handleInboundReply(db: unknown, input: InboundInput): Promise<InboundOutcome> {
  const phone = normalisePhone(input.from);
  if (!phone) return "invalid";
  const reply = parseReply(input.text);
  if (!reply) return "invalid";

  const call =
    reply.kind === "stop"
      ? await callLandlordRpc(db, "landlord_line_stop_number", { p_phone: phone, p_channel: input.channel })
      : await callLandlordRpc(db, "landlord_line_inbound", {
          p_phone: phone,
          p_code: reply.code,
          p_digit: reply.digit,
          p_channel: input.channel,
        });
  if (call.error) return "failed";
  const state = (call.data as { state?: unknown } | null)?.state;
  return typeof state === "string" && KNOWN.has(state) ? (state as InboundOutcome) : "failed";
}
