import "server-only";

/**
 * The money path speaks.
 *
 * Before this module there were zero console calls anywhere in lib/wallet,
 * lib/payments, lib/bookings or the Paystack webhook, while 36 lived elsewhere
 * in the application. That is how a funded wallet showed a balance of zero for
 * days with nothing anywhere to say why: every failure branch in the webhook
 * answered HTTP 200, the processor's delivery log stayed green, and the read
 * path caught its own error and returned an empty wallet.
 *
 * So every branch that decides the fate of money now says so, exactly once, on
 * one line, in a shape that can be grepped and alerted on.
 *
 * WHAT MAY NEVER APPEAR HERE. No card numbers, no bank account numbers, no
 * secret keys, no signatures, no email addresses, no raw webhook bodies. A
 * payment reference is safe and is the whole point: it is the key every other
 * system in this story indexes on, ours and Paystack's alike, so a support
 * conversation can start from a single line of log. User ids are safe: they
 * are opaque and already travel in every other server log line.
 *
 * Amounts ARE logged, in integer kobo, because "the ledger disagrees with the
 * processor by 250000" is the sentence reconciliation exists to produce.
 */

/** Where in the money path a line came from. */
export type MoneySurface =
  | "webhook"
  | "verify"
  | "reconcile"
  | "fund"
  | "withdraw"
  | "transfer"
  | "escrow";

/**
 * What happened. Deliberately small and closed: an alert rule wants a fixed
 * vocabulary, not free text that drifts every time somebody adds a branch.
 *
 *  - received     a delivery or a request arrived and is about to be judged
 *  - posted       money moved, the ledger changed, this is the happy line
 *  - duplicate    the idempotency key had already been used, nothing moved,
 *                 and that is correct rather than a problem
 *  - ignored      deliberately not our business, for example a Paystack event
 *                 for a reference shape we do not issue
 *  - rejected     failed a guard we wrote on purpose, for example a bad
 *                 signature or a non naira charge
 *  - unconfigured the environment is incomplete, which is the failure that
 *                 started all of this and now has its own name
 *  - failed       something threw. Money may be in an unknown state. This is
 *                 the line that should page somebody.
 */
export type MoneyOutcome =
  | "received"
  | "posted"
  | "duplicate"
  | "ignored"
  | "rejected"
  | "unconfigured"
  | "failed";

export type MoneyLogFields = {
  surface: MoneySurface;
  outcome: MoneyOutcome;
  /** What decided the outcome. Short, stable, machine readable, snake_case. */
  reason: string;
  /** Our payment reference. Safe to log and the key everything joins on. */
  reference?: string | null;
  /** Integer kobo. Never a float, never a formatted string. */
  amountMinor?: number | null;
  /** Opaque identifiers, safe to log. */
  userId?: string | null;
  walletId?: string | null;
  /** The processor's event name, when a webhook is what triggered this. */
  event?: string | null;
};

const PREFIX = "[money]";

function line(fields: MoneyLogFields): string {
  const parts: string[] = [
    PREFIX,
    fields.surface,
    fields.outcome,
    `reason=${fields.reason}`,
  ];
  if (fields.event) parts.push(`event=${fields.event}`);
  if (fields.reference) parts.push(`ref=${fields.reference}`);
  if (typeof fields.amountMinor === "number") parts.push(`kobo=${fields.amountMinor}`);
  if (fields.userId) parts.push(`user=${fields.userId}`);
  if (fields.walletId) parts.push(`wallet=${fields.walletId}`);
  return parts.join(" ");
}

/**
 * Record one decision in the money path.
 *
 * Never throws. A logger that can fail is a logger that takes the payment down
 * with it, which would be a worse bug than the silence it exists to fix.
 */
export function logMoney(fields: MoneyLogFields): void {
  try {
    const text = line(fields);
    if (fields.outcome === "failed") {
      console.error(text);
      return;
    }
    if (fields.outcome === "rejected" || fields.outcome === "unconfigured") {
      console.warn(text);
      return;
    }
    /*
     * The project's no-console rule allows warn and error only, and it is right
     * to: a stray console.log in a component is noise. This one line is the
     * exception the rule did not anticipate. "posted" is the line that says
     * money moved, and it has to be recorded at a level that is NOT an alert,
     * or every successful payment pages somebody and the channel becomes
     * unreadable within a day. Downgrading it to a warning would be worse than
     * having no line at all, and deleting it would restore the silence this
     * module exists to end.
     */
    // eslint-disable-next-line no-console
    console.info(text);
  } catch {
    // Deliberately empty. See above.
  }
}

/**
 * The message of a thrown value, with no stack and no object graph.
 *
 * Used to give a "failed" line something specific to say without risking a
 * secret arriving inside a serialised error from a client library.
 */
export function failureReason(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim().slice(0, 200);
  }
  return "unknown_error";
}
