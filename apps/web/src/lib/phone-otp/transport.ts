/**
 * HOW A CODE REACHES A PHONE (V-50): AN INTERFACE, AND THE FOUNDER'S VENDOR
 * BEHIND IT.
 *
 * The entry prefers a WhatsApp authentication template where the number is on
 * WhatsApp and the transactional SMS route otherwise. Both are a contract the
 * founder signs (founder question 7), so the product is built against this
 * interface and ships with two implementations that are not a vendor:
 *
 *   unconfigured  the production default until a vendor is wired. It sends
 *                 nothing and says so, and the flag stays off, so no screen
 *                 ever asks for a code that cannot arrive.
 *   capturing     for tests: it records what it was asked to send, so the
 *                 whole flow (issue, deliver, confirm) is proven end to end.
 *
 * THE ONE SWAP. Implement `OtpTransport` for the chosen aggregator, return it
 * from `otpTransport()` when its key is present, and turn the flag on.
 *
 * NEVER TO A LOCK SCREEN. A code is not sent as a push notification, because a
 * lock screen is readable by whoever holds the phone. SMS and WhatsApp are the
 * channels the entry names; a push channel must never implement this.
 */

export type SendResult = { ok: true } | { ok: false; reason: "unconfigured" | "failed" };

export interface OtpTransport {
  readonly name: string;
  send(phoneE164: string, message: string): Promise<SendResult>;
}

export const unconfiguredTransport: OtpTransport = {
  name: "unconfigured",
  async send() {
    return { ok: false, reason: "unconfigured" };
  },
};

export type CapturedMessage = { to: string; message: string };

export function capturingTransport(outbox: CapturedMessage[]): OtpTransport {
  return {
    name: "capturing",
    async send(to, message) {
      outbox.push({ to, message });
      return { ok: true };
    },
  };
}

/** The transport this deployment uses. No vendor is wired yet. */
export function otpTransport(): OtpTransport {
  return unconfiguredTransport;
}
