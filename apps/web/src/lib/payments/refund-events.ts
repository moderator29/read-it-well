import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { recordAlert } from "@/lib/alerts";

/**
 * Paystack's word that a refund reached the card, or did not (V-24).
 *
 * `refund.processed` and `refund.failed` close the last leg of the refund
 * clock: from the moment Paystack accepted the refund (`processor_submitted_at`,
 * written by `record_processor_refund` / `record_rent_share_refund`) to the
 * moment the money is back where it came from. The database decides which
 * row the event answers (a booking refund or a flatmate's share refund,
 * `public.record_processor_refund_outcome`) and is idempotent: a replayed
 * delivery answers `already` and moves nothing. It closes only its own
 * refund: matched by Paystack's refund id, or by the charge's reference only
 * where the row has no refund id of its own yet, and only when the amounts
 * agree (`amount_mismatch` otherwise, with the database's own alert). An id
 * that matches nothing answers not_found and raises `refund.event_unmatched`.
 *
 * Vallo holds no money, so there is nothing to credit here: this only
 * records what the processor said.
 */

export type RefundEvent = {
  status: "processed" | "failed";
  processorRefundId: string | null;
  transactionReference: string | null;
  /** What Paystack says it refunded, in kobo. The database refuses a row of another amount. */
  amountMinor: number | null;
};

function text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Read a refund.* delivery's data defensively. Null when it is not one we can use. Pure. */
export function readRefundEvent(event: string, data: unknown): RefundEvent | null {
  const status = event === "refund.processed" ? "processed" : event === "refund.failed" ? "failed" : null;
  if (!status || typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  const transaction = typeof d.transaction === "object" && d.transaction !== null ? (d.transaction as Record<string, unknown>) : {};
  const processorRefundId = text(d.id) ?? text(d.refund_id) ?? text(d.refund_reference);
  const transactionReference =
    text(d.transaction_reference) ?? text(transaction.reference) ?? text(d.reference);
  if (!processorRefundId && !transactionReference) return null;
  const amount = typeof d.amount === "string" ? Number(d.amount) : d.amount;
  const amountMinor = typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0 ? amount : null;
  return { status, processorRefundId, transactionReference, amountMinor };
}

export type RefundEventOutcome = "recorded" | "already" | "unknown" | "not_submitted" | "mismatch" | "error";

/** Record the processor's refund outcome. Never throws. */
export async function handleRefundEvent(admin: AdminClient, refund: RefundEvent): Promise<RefundEventOutcome> {
  try {
    const { data, error } = await admin.rpc("record_processor_refund_outcome" as never, {
      p_processor_refund_id: refund.processorRefundId ?? "",
      p_transaction_reference: refund.transactionReference ?? "",
      p_status: refund.status,
      p_amount_minor: refund.amountMinor,
    } as never);
    if (error) return "error";
    const status = String((data as { status?: unknown } | null)?.status ?? "");
    if (status === "ok") return "recorded";
    if (status === "already") return "already";
    if (status === "not_submitted") return "not_submitted";
    // The database raised its own alert on a wrong amount; nothing moved.
    if (status === "amount_mismatch") return "mismatch";
    if (status === "amount_missing") {
      await recordAlert({
        kind: "refund.event_unmatched",
        severity: "warning",
        detail: { status: refund.status, refund_id: refund.processorRefundId, reference: refund.transactionReference, amount: "missing" },
        subjectId: refund.processorRefundId ?? refund.transactionReference ?? "unknown",
      });
      return "unknown";
    }
    if (status === "not_found") {
      await recordAlert({
        kind: "refund.event_unmatched",
        severity: "warning",
        detail: { status: refund.status, refund_id: refund.processorRefundId, reference: refund.transactionReference },
        subjectId: refund.processorRefundId ?? refund.transactionReference ?? "unknown",
      });
      return "unknown";
    }
    return "error";
  } catch {
    return "error";
  }
}
