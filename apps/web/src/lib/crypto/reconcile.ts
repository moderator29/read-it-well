import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { JobVerdict } from "@/lib/bookings/lifecycle";
import type { AdminClient } from "@/lib/supabase/service";
import { derivedEventId, type CryptoRampProvider, type ProviderEvent } from "./provider";
import { applyEvent } from "./service";
import { isCryptoState, type CryptoState } from "./state-machine";

/**
 * The crypto reconcile job: the webhook's safety net.
 *
 * A webhook can be lost (our outage, theirs, a secret rotated on one side).
 * Every run reads the crypto payments still moving, asks the PROVIDER where
 * each one is, and applies the answer through the same idempotent door the
 * webhook uses. A report already applied is a duplicate and moves nothing, so
 * the job and the webhook can race freely.
 *
 * It also closes quotes nobody accepted: a `quoted` row past its expiry has no
 * deposit address, so nothing can arrive, and it becomes `expired` without a
 * provider call. An `awaiting_payment` row past expiry is asked about, never
 * assumed: a transfer may be confirming at the provider.
 */

export const RECONCILE_BATCH = 25;

type DueRow = {
  reference: string;
  provider: string;
  provider_payment_id: string | null;
  state: string;
  quote_expires_at: string;
};

export type ReconcileCounts = {
  checked: number;
  applied: number;
  unchanged: number;
  expiredQuotes: number;
  failures: number;
};

export async function reconcileCryptoPayments(
  admin: AdminClient,
  provider: CryptoRampProvider | null,
  now: number = Date.now(),
): Promise<ReconcileCounts> {
  const counts: ReconcileCounts = { checked: 0, applied: 0, unchanged: 0, expiredQuotes: 0, failures: 0 };
  const loose = admin as unknown as SupabaseClient;
  const { data, error } = await loose.rpc("crypto_payments_due_for_check", { p_limit: RECONCILE_BATCH });
  if (error) throw new Error(`crypto_payments_due_for_check: ${error.message}`);

  for (const row of (data ?? []) as DueRow[]) {
    if (!isCryptoState(row.state)) continue;
    counts.checked += 1;
    try {
      const state: CryptoState = row.state;
      if (state === "quoted") {
        if (Date.parse(row.quote_expires_at) > now) {
          counts.unchanged += 1;
          continue;
        }
        const closed = await applyEvent(admin, provider ?? placeholderProvider(row.provider), {
          eventId: `reconcile:quote-expired:${row.reference}`,
          reference: row.reference,
          providerPaymentId: null,
          state: "expired",
          facts: { reason: "quote_not_accepted" },
        }, "reconcile", { notify: false });
        if (closed.outcome === "applied") counts.expiredQuotes += 1;
        else counts.unchanged += 1;
        continue;
      }
      if (!provider || provider.id !== row.provider || !row.provider_payment_id || !provider.isConfigured()) {
        counts.unchanged += 1;
        continue;
      }
      const report: ProviderEvent | null = await provider.getPayment(row.provider_payment_id, row.reference);
      if (!report) {
        counts.unchanged += 1;
        continue;
      }
      /* A deterministic id per observed status, so running every hour on an
         unchanged payment records it once, not once an hour. */
      const event: ProviderEvent = {
        ...report,
        eventId: derivedEventId("reconcile", row.reference, report.state, report.facts),
      };
      const applied = await applyEvent(admin, provider, event, "reconcile");
      if (applied.outcome === "applied" || applied.outcome === "updated") counts.applied += 1;
      else counts.unchanged += 1;
    } catch {
      counts.failures += 1;
    }
  }
  return counts;
}

/** A stand-in used only to expire an unaccepted quote when no provider is configured any more. */
function placeholderProvider(id: string): CryptoRampProvider {
  return {
    id: id as "yellowcard",
    displayName: "the provider",
    isConfigured: () => false,
    isDirectSettlementReady: () => false,
    platformDestinations: () => null,
    quote: async () => {
      throw new Error("unconfigured");
    },
    createPayment: async () => {
      throw new Error("unconfigured");
    },
    getPayment: async () => null,
    verifyWebhook: () => false,
    parseWebhook: () => null,
  };
}

export function reconcileVerdict(counts: ReconcileCounts): JobVerdict {
  const attention = counts.failures > 0;
  return {
    outcome: attention ? "attention" : "ok",
    counts: { ...counts },
    detail: {},
    alert: attention
      ? { kind: "cron.crypto_reconcile.failures", severity: "warning", detail: { failures: counts.failures, checked: counts.checked } }
      : null,
  };
}
