import "server-only";

import { callSecurityRpc } from "@/lib/security/service-rpc";

/**
 * ONE ATTEMPT OPENS AT A TIME PER BOOKING, WHATEVER THE KEY.
 *
 * A LEASE, NOT AN IDEMPOTENT ANSWER. `withIdempotency` exists to remember an
 * answer and replay it, and every call site records only an `ok` result
 * (`money-limits-call-sites.test.ts`). This needs the opposite: a mutex that
 * never remembers anything. A remembered "ok" here would hand the next tap,
 * from any tab or any payment method, the previous checkout for the lease's
 * whole life. So this uses the same claim table directly: claim a fixed key
 * for the booking, run, and always release. Nothing is ever recorded. If the
 * process dies, the claim expires after `LEASE_SECONDS`.
 *
 * Why not `pg_advisory_xact_lock`: it lasts one database call, and opening an
 * attempt spans several database calls and a call to Paystack.
 *
 * When the claim table cannot be reached, the work runs unguarded, as every
 * idempotent path here does. The backstop is then the database: only one
 * attempt can ever settle (the booking lock in settle_booking_charge and the
 * one-success index), and a second charge is marked refund-due and returned to
 * the card in full.
 */

const LEASE_SCOPE = "booking.payment.open";
const LEASE_KEY = "open";
const LEASE_SECONDS = 60;

export type LeaseRun<T> = { status: "done"; result: T } | { status: "busy" };

function claimState(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const state = (data as Record<string, unknown>).state;
  return typeof state === "string" ? state : null;
}

export async function withBookingOpenLease<T>(subject: string, work: () => Promise<T>): Promise<LeaseRun<T>> {
  const claimed = await callSecurityRpc("claim_idempotency", {
    scope: LEASE_SCOPE,
    subject,
    key: LEASE_KEY,
    ttl_seconds: LEASE_SECONDS,
  });
  const state = claimed.ok ? claimState(claimed.data) : null;
  if (state === "in_flight") return { status: "busy" };
  /* Unreachable store (state null): run unguarded, see above. "fresh" is ours
     to hold; "replay" cannot happen because nothing is ever recorded, and is
     treated as fresh. */
  try {
    return { status: "done", result: await work() };
  } finally {
    if (state !== null) {
      await callSecurityRpc("release_idempotency", { scope: LEASE_SCOPE, subject, key: LEASE_KEY });
    }
  }
}
