import { termiiConfig, termiiNumber, termiiPost, type TermiiConfig, type TermiiFetch } from "../phone-otp/termii";
import type { OutboundMessage, PrincipalChannel, SendOutcome } from "./channel";

/**
 * THE LANDLORD LINE OVER TERMII (V-31, V-32). Step 1 of the swap in
 * `channel.ts`, selected by `LANDLORD_LINE_TRANSPORT=sms`.
 *
 * It owns no HTTP of its own: the request is `termiiPost`, the same call the
 * phone codes make, with the same `TERMII_API_KEY` and `TERMII_SENDER_ID`.
 *
 * ONE ROUTE, THE DND ONE. Unlike the code transport there is no fallback to
 * the generic route: the generic route drops messages to numbers on MTN and
 * Airtel Do-Not-Disturb while Termii still answers "sent", and a question
 * recorded as delivered starts the 21 day "Not reconfirmed" clock. A refused
 * question is recorded as failed instead, which is honest.
 *
 * Never logs `to` or `body`; the reasons it returns are fixed words.
 *
 * WHAT HAS NOT MET TERMII. The request shape and the reading of the answer are
 * the ones the phone codes use, and the tests run against recorded shapes of
 * that answer, not against Termii. Nothing here has sent a real message: the
 * sender ID "Vallo" is awaiting Termii's approval, and the DND route must be
 * enabled on the account.
 */
export class SmsChannel implements PrincipalChannel {
  readonly name = "sms" as const;
  private readonly config: TermiiConfig | null;

  constructor(
    env: Record<string, string | undefined> = process.env,
    private readonly fetcher: TermiiFetch = fetch,
  ) {
    this.config = termiiConfig(env);
  }

  async send(message: OutboundMessage): Promise<SendOutcome> {
    if (!this.config) return { ok: false, reason: "not_configured" };
    const to = termiiNumber(message.to);
    if (!to) return { ok: false, reason: "unsupported_number" };
    const attempt = await termiiPost(this.config, to, message.body, "dnd", this.fetcher);
    if (!attempt.ok) return { ok: false, reason: attempt.reason === "network" ? "network_error" : "provider_refused" };
    /* Termii accepted it. An acceptance without an id is still a send; the
       reference says it has none rather than inventing one. */
    return { ok: true, ref: attempt.messageId ?? "termii-no-id" };
  }
}
