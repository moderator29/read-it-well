import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { guaranteeReserveSubaccount, type PaystackSplit } from "./paystack";
import { bookingReference } from "./references";

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

export async function openSplitAttempt(
  admin: AdminClient,
  booking: { id: string; total_minor: number; currency: string },
): Promise<OpenedAttempt | AttemptRefusal> {
  const reserve = guaranteeReserveSubaccount();
  if (!reserve) return { refused: true, message: PAYMENT_NOT_AVAILABLE.reserve_not_set_up! };

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

  const reference = bookingReference();
  const attempt = await admin.from("transactions").insert({
    booking_id: booking.id,
    provider: "paystack",
    provider_ref: reference,
    amount_minor: amountMinor,
    currency: booking.currency,
    status: "PENDING",
    agreement_id: answer.agreement_id,
    payee_user_id: answer.payee_user_id ?? null,
    payee_subaccount_code: answer.payee_subaccount_code,
    reserve_subaccount_code: reserve,
    lister_share_minor: listerShare,
    guarantee_minor: guarantee,
    commission_minor: commission,
  } as never);
  if (attempt.error) {
    return { refused: true, message: "Payment is temporarily unavailable. Nothing has been charged." };
  }

  return {
    reference,
    amountMinor,
    agreementId: answer.agreement_id,
    split: {
      listerSubaccount: answer.payee_subaccount_code,
      listerShareMinor: listerShare,
      reserveSubaccount: reserve,
      guaranteeMinor: guarantee,
    },
  };
}

export function isRefusal(value: OpenedAttempt | AttemptRefusal): value is AttemptRefusal {
  return "refused" in value;
}
