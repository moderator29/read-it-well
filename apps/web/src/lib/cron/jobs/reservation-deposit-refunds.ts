import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobVerdict } from "../../bookings/lifecycle";
import type { AdminClient } from "../rpc";
import { isPaystackConfigured } from "../../payments/paystack";
import { sendDueDepositRefunds } from "../../reservations/deposit-settlement";

/**
 * D75. Hourly: send every table deposit refund the restaurant's rule decided
 * (a guest who cancelled in time, a venue that cancelled, a charge that could
 * not be applied) back to the card, once each (the refund claim). And close
 * checkouts nobody paid within two hours as abandoned; a late payment on one
 * still settles, or goes back to the card.
 */
export async function reservationDepositRefunds(admin: AdminClient): Promise<JobVerdict> {
  const db = admin as unknown as SupabaseClient;
  const cutoff = new Date(Date.now() - 2 * 3_600_000).toISOString();
  await db
    .from("reservation_deposits")
    .update({ status: "abandoned", decided_at: new Date().toISOString(), outcome_reason: "checkout_not_paid" })
    .eq("status", "pending")
    .lt("created_at", cutoff);
  if (!isPaystackConfigured()) {
    return { outcome: "ok", counts: { due: 0 }, detail: { skipped: "paystack_not_configured" }, alert: null };
  }
  const run = await sendDueDepositRefunds(admin);
  if (run === null) {
    return {
      outcome: "attention",
      counts: { due: 0 },
      detail: { read: "failed" },
      alert: { kind: "cron.reservation_deposit_refunds", severity: "warning", detail: { read: "reservation_deposits failed" } },
    };
  }
  return {
    outcome: run.held > 0 ? "attention" : "ok",
    counts: { due: run.due, sent: run.sent, held: run.held },
    detail: {},
    alert: run.held > 0 ? { kind: "cron.reservation_deposit_refunds", severity: "warning", detail: { held: run.held } } : null,
  };
}
