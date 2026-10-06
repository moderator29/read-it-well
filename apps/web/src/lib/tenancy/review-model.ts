

import type { TenancyReviewInput } from "./review";

export const TRI = ["yes", "no", "not_sure"] as const;

export const EXTRA_TO = ["agent", "caretaker", "landlord", "other"] as const;

/** The row the insert sends. Kobo from naira by multiplication only. */
export function tenancyReviewRow(input: TenancyReviewInput, tenantId: string): Record<string, unknown> {
  return {
    rent_payment_id: input.paymentId,
    tenant_id: tenantId,
    /* Not null in the table and overwritten by the fill trigger from the
       charge itself; supplied only so the insert is complete. */
    listing_id: input.paymentId,
    lister_id: tenantId,
    paid_extra: input.paidExtra,
    extra_minor: input.paidExtra === "yes" && input.extraNaira ? input.extraNaira * 100 : null,
    extra_to: input.paidExtra === "yes" ? (input.extraTo ?? null) : null,
    as_listed: input.asListed,
    agent_on_time: input.agentOnTime,
    again: input.again,
    rating: input.rating,
    body: input.body && input.body.length > 0 ? input.body : null,
  };
}

/** The screen's copy of the insert policy: a paid charge, a month after move-in. */
export function tenancyReviewOpen(input: {
  bookingStatus: string | null;
  moveIn: string;
  today: string;
}): boolean {
  if (input.bookingStatus !== "CONFIRMED" && input.bookingStatus !== "COMPLETED") return false;
  const move = Date.parse(`${input.moveIn}T00:00:00Z`);
  const now = Date.parse(`${input.today}T00:00:00Z`);
  if (!Number.isFinite(move) || !Number.isFinite(now)) return false;
  return now - move >= 30 * 86_400_000;
}
