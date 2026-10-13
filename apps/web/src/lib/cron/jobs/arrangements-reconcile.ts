import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import type { AdminClient } from "../rpc";
import { recordAlert } from "../../alerts";
import { lagosToday } from "../../bookings/schema";
import type { Db } from "../../money/member-wallet";
import { reconcileArrangements, type ReconcileSummary } from "../../money/provider-arrangements";
import { paylukContext } from "../../payments/providers/payluk";

/**
 * The escrow webhook's safety net. Every arrangement still waiting on the
 * payment partner's word (preparing, unknown, payment processing, release
 * asked, disputed) is read back, at most three a run (the key allows ten
 * requests a minute across everything), and the partner's answer is recorded
 * through the same door the webhook uses (`provider_arrangement_observe`).
 * Recording only: never gated by `payments_payluk_on` or PAYMENTS_KILL_PAYLUK.
 * With no key for this deployment there is nothing to ask, and the run says so.
 */
export function arrangementsVerdict(summary: ReconcileSummary, configured: boolean): JobVerdict {
  const counts = { read: summary.read, moved: summary.moved, unchanged: summary.skipped, failed: summary.failed };
  return {
    outcome: summary.failed > 0 ? "attention" : "ok",
    counts,
    detail: configured ? {} : { reason: "no_partner_key" },
    alert: summary.failed > 0 ? { kind: "cron.arrangements_reconcile_failed", severity: "warning", detail: counts } : null,
  };
}

export async function arrangementsReconcile(admin: AdminClient): Promise<JobVerdict> {
  const ctx = paylukContext();
  if (!ctx) return arrangementsVerdict({ read: 0, moved: 0, skipped: 0, failed: 0 }, false);
  const summary = await reconcileArrangements(
    {
      db: admin as unknown as Db,
      ctx,
      todayLagos: lagosToday,
      alert: async (kind, detail) => {
        await recordAlert({ kind, severity: "critical", detail });
      },
    },
    3,
  );
  return arrangementsVerdict(summary, true);
}
