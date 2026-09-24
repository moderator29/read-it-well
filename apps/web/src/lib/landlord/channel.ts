/**
 * THE PRINCIPAL CHANNEL: ONE INTERFACE, ONE STUB, AND THE ONE SWAP.
 *
 * Which SMS aggregator carries the landlord line, and whether a WhatsApp
 * Business number sits beside it, are the founder's decisions (FOUNDER
 * question 2). Nothing else in the landlord line knows or cares which one
 * wins: the drain calls `send` and records what it was told, and the reply
 * arrives either through the tokenised page, which needs no vendor at all, or
 * through `/api/landlord/inbound`, which any aggregator can post to.
 *
 * ---------------------------------------------------------------------------
 * THE STUB SENDS NOTHING, AND THE DATABASE KNOWS IT SENT NOTHING.
 *
 * `StubChannel` keeps what it was handed in memory, so a test can read the
 * link out of the body and answer through the page, and reports success with a
 * `stub-` reference. The drain then records the message in
 * `principal_messages` with `channel = 'stub'`. That word matters: the 21 day
 * "Not reconfirmed" sweep counts only questions delivered on a real channel,
 * so switching the line on before a vendor is chosen can never punish a
 * listing for a landlord who was never actually asked.
 *
 * ---------------------------------------------------------------------------
 * THE SWAP, when the founder has chosen:
 *
 *   1. Write `SmsChannel implements PrincipalChannel` in its own file beside
 *      this one: `name = "sms"`, and `send` POSTs `{ to, body }` to the
 *      aggregator's transactional (DND-exempt) route with its key from the
 *      environment, returning `{ ok: true, ref: <their message id> }` or
 *      `{ ok: false, reason }`. Never log `to` or `body`.
 *   2. Add one branch to `selectPrincipalChannel` below for
 *      `LANDLORD_LINE_TRANSPORT=sms`.
 *   3. Point the aggregator's inbound webhook at `/api/landlord/inbound` with
 *      the header `x-landlord-inbound-secret: <LANDLORD_INBOUND_SECRET>`.
 *
 * Nothing else changes: not the drain, not the page, not the database.
 */

export type ChannelName = "stub" | "sms" | "whatsapp";

export type OutboundMessage = {
  /** The question this message asks, so a transport can tag it. */
  askId: string;
  /** The principal's number, E.164. Never logged, never stored by a transport. */
  to: string;
  body: string;
};

export type SendOutcome = { ok: true; ref: string } | { ok: false; reason: string };

export interface PrincipalChannel {
  readonly name: ChannelName;
  send(message: OutboundMessage): Promise<SendOutcome>;
}

/** Records, never sends. See the header. */
export class StubChannel implements PrincipalChannel {
  readonly name = "stub" as const;
  readonly sent: OutboundMessage[] = [];

  async send(message: OutboundMessage): Promise<SendOutcome> {
    this.sent.push(message);
    return { ok: true, ref: `stub-${this.sent.length}` };
  }
}

/**
 * The channel this deployment uses. Only the stub exists today, so every
 * configuration resolves to it; a `LANDLORD_LINE_TRANSPORT` naming a vendor
 * with no implementation also resolves to the stub rather than to a guess, and
 * `transportConfigured` says so to the job, which reports it.
 */
export function selectPrincipalChannel(env: Record<string, string | undefined> = process.env): PrincipalChannel {
  const wanted = (env.LANDLORD_LINE_TRANSPORT ?? "").trim().toLowerCase();
  switch (wanted) {
    default:
      return new StubChannel();
  }
}

/** True when a real transport is selected. False means messages are recorded, not sent. */
export function transportConfigured(channel: PrincipalChannel): boolean {
  return channel.name !== "stub";
}
