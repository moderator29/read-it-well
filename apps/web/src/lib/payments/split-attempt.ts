import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { currentPaystackMode, guaranteeReserveSubaccount, type PaystackMode, type PaystackSplit } from "./paystack";
import { bookingReference } from "./references";
import { escrowRailLive } from "./providers";
import { railForBooking, railGate } from "./router";

/**
 * Open a payment attempt with its split, or say in words why payment is not
 * available yet.
 *
 * TRACK A. A charge on Vallo can only exist with an approved agreement and a
 * split that settles the lister's share straight to the lister's subaccount
 * and the Guarantee contribution straight to the reserve subaccount. The
 * shares come from the database (`public.payment_split_for_booking`), never
 * from a client and never computed twice. The database refuses the attempt
 * row if anything is missing (`transactions_00_payment_gate`); this function
 * asks first so the person is told why in a sentence rather than a code.
 */

export type OpenedAttempt = {
  reference: string;
  amountMinor: number;
  split: PaystackSplit;
  agreementId: string;
};

export type AttemptRefusal = { refused: true; message: string };

/** The sentence for each reason payment is not available. Exported for tests. */
export const PAYMENT_NOT_AVAILABLE: Record<string, string> = {
  no_agreement:
    "Payment is not open yet. The agreement for this booking has to be confirmed by both of you and approved by Vallo first.",
  agreement_not_approved:
    "Payment opens once Vallo approves the agreement. You will get an email and a notification the moment it is approved.",
  payee_not_set_up:
    "Payment cannot open yet because the owner or agent has not finished setting up where they are paid. They have been told; please try again once they have.",
  amount_mismatch:
    "The amount on this booking does not match the approved agreement, so payment is paused. Contact support and a person will sort it out.",
  reserve_not_set_up:
    "Payments are paused while Vallo finishes setting up the Guarantee reserve account. Nothing has been charged.",
  not_found: "We could not find that booking on your account.",
  rate_not_accepted:
    "Payment is not open yet because the lister is still confirming Vallo's fee for this listing. Nothing has been charged.",
};

type SplitAnswer = {
  status: string;
  agreement_id?: string;
  amount_minor?: number;
  payee_user_id?: string;
  payee_subaccount_code?: string;
  lister_share_minor?: number;
  guarantee_minor?: number;
  commission_minor?: number;
};

/** The charge the database computed for a booking, before any row is written. */
export type SplitQuote = {
  amountMinor: number;
  agreementId: string;
  payeeUserId: string | null;
  split: PaystackSplit;
  commissionMinor: number;
  mode: PaystackMode;
  /** The rail the policy resolved, and the policy row that said so. Written at insert, never altered. */
  rail: "direct";
  railPolicyId: string;
};

/**
 * Ask the database what this booking's charge is, and refuse in a sentence
 * when it cannot be paid yet. Writes nothing, so a retry can compare the live
 * attempt against it before deciding to open another.
 *
 * THE RAIL FIRST (Session 2, 7.4). The policy decides whether this booking
 * may be paid by a Paystack split at all. Anything but a resolved DIRECT rail
 * refuses here, before a row exists: no rail, an unreachable router, and an
 * ESCROW answer, because this path can only open a direct charge and the
 * escrow rail is not live (`router.ts`, railGate).
 */
export async function quoteSplit(
  admin: AdminClient,
  booking: { id: string; total_minor: number; currency: string },
): Promise<SplitQuote | AttemptRefusal> {
  const gate = railGate(await railForBooking(admin, booking.id), "direct", await escrowRailLive());
  if (!gate.open) return { refused: true, message: gate.message };
  if (gate.rail !== "direct") return { refused: true, message: PAYMENT_NOT_AVAILABLE.not_found! };
  const railPolicyId = gate.policyId;

  const { data, error } = await admin.rpc("payment_split_for_booking" as never, { p_booking: booking.id } as never);
  if (error) {
    return { refused: true, message: "Payment is temporarily unavailable. Nothing has been charged." };
  }
  const answer = (data ?? {}) as SplitAnswer;
  if (answer.status !== "ok") {
    return {
      refused: true,
      message: PAYMENT_NOT_AVAILABLE[answer.status] ?? "Payment is not available for this booking yet.",
    };
  }
  const amountMinor = Number(answer.amount_minor);
  const listerShare = Number(answer.lister_share_minor);
  const guarantee = Number(answer.guarantee_minor);
  const commission = Number(answer.commission_minor);
  if (
    amountMinor !== booking.total_minor ||
    !Number.isSafeInteger(listerShare) ||
    !Number.isSafeInteger(guarantee) ||
    !Number.isSafeInteger(commission) ||
    listerShare + guarantee + commission !== amountMinor ||
    !answer.payee_subaccount_code ||
    !answer.agreement_id
  ) {
    return { refused: true, message: PAYMENT_NOT_AVAILABLE.amount_mismatch! };
  }
  /* D51: the Guarantee is retired at guarantee_bps = 0. The reserve account is
     demanded only when the split actually has a reserve leg, so a missing
     PAYSTACK_GUARANTEE_SUBACCOUNT no longer closes payment at zero. */
  const reserve = guarantee > 0 ? guaranteeReserveSubaccount() : null;
  if (guarantee > 0 && !reserve) return { refused: true, message: PAYMENT_NOT_AVAILABLE.reserve_not_set_up! };

  return {
    amountMinor,
    agreementId: answer.agreement_id,
    payeeUserId: answer.payee_user_id ?? null,
    commissionMinor: commission,
    mode: currentPaystackMode(),
    rail: "direct",
    railPolicyId,
    split: {
      listerSubaccount: answer.payee_subaccount_code,
      listerShareMinor: listerShare,
      reserveSubaccount: reserve,
      guaranteeMinor: guarantee,
    },
  };
}

/**
 * Write the PENDING attempt row for a quote, under a fresh reference, marked
 * with the Paystack mode that will open it.
 */
export async function insertSplitAttempt(
  admin: AdminClient,
  booking: { id: string; currency: string },
  quote: SplitQuote,
): Promise<OpenedAttempt | AttemptRefusal> {
  const reference = bookingReference();
  const attempt = await admin.from("transactions").insert({
    booking_id: booking.id,
    provider: "paystack",
    provider_ref: reference,
    amount_minor: quote.amountMinor,
    currency: booking.currency,
    status: "PENDING",
    agreement_id: quote.agreementId,
    payee_user_id: quote.payeeUserId,
    payee_subaccount_code: quote.split.listerSubaccount,
    reserve_subaccount_code: quote.split.reserveSubaccount,
    lister_share_minor: quote.split.listerShareMinor,
    guarantee_minor: quote.split.guaranteeMinor,
    commission_minor: quote.commissionMinor,
    paystack_mode: quote.mode,
    rail: quote.rail,
    rail_policy_id: quote.railPolicyId,
    checkout_opened_at: new Date().toISOString(),
  } as never);
  if (attempt.error) {
    return { refused: true, message: "Payment is temporarily unavailable. Nothing has been charged." };
  }

  return {
    reference,
    amountMinor: quote.amountMinor,
    agreementId: quote.agreementId,
    split: quote.split,
  };
}

/** Quote and open in one step, for the paths that never reuse (a saved card). */
export async function openSplitAttempt(
  admin: AdminClient,
  booking: { id: string; total_minor: number; currency: string },
): Promise<OpenedAttempt | AttemptRefusal> {
  const quote = await quoteSplit(admin, booking);
  if (isRefusal(quote)) return quote;
  return insertSplitAttempt(admin, booking, quote);
}


export function isRefusal<T extends object>(value: T | AttemptRefusal): value is AttemptRefusal {
  return "refused" in value;
}
