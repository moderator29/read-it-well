import { z } from "zod";

/**
 * THE TENANCY REVIEW (V-59), THE PURE HALF.
 *
 * The one question the market's racket hides from: did the tenant pay
 * anything to anybody beyond what they paid on Vallo? It is asked first, a
 * month after moving in (the extra ask happens at the door), before any
 * stars. The answer to it is private and counted; only the count of tenants
 * who paid NOTHING more is ever public.
 *
 * The values mirror `public.tenancy_reviews` exactly, and the "how much, to
 * whom" pair belongs to a yes and only to a yes, as the table's check says.
 */

export const TRI = ["yes", "no", "not_sure"] as const;
export const EXTRA_TO = ["agent", "caretaker", "landlord", "other"] as const;

export const tenancyReviewSchema = z
  .object({
    paymentId: z.string().uuid("That tenancy could not be found."),
    paidExtra: z.enum(["no", "yes"]),
    /** Whole naira as typed; stored as kobo. */
    extraNaira: z.number().int().positive().max(1_000_000_000).optional(),
    extraTo: z.enum(EXTRA_TO).optional(),
    asListed: z.enum(TRI),
    agentOnTime: z.enum(TRI),
    again: z.enum(TRI),
    rating: z.number().int().min(1).max(5),
    body: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.paidExtra === "yes" || (v.extraNaira === undefined && v.extraTo === undefined), {
    message: "How much and to whom only belong to a yes.",
  });

export type TenancyReviewInput = z.infer<typeof tenancyReviewSchema>;

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
