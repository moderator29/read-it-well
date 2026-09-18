/**
 * The idempotency subject every payment path on one booking shares, so two
 * concurrent attempts on the same booking collide as in-flight rather than
 * both charging. A plain module rather than an export of `checkout.ts`,
 * because a "use server" file may export only async functions.
 */
export function bookingPaymentSubject(bookingId: string): string {
  return `booking:${bookingId}`;
}
