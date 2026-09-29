"use server";

/**
 * V-86. Flatmates' shares of a move-in: the lead names a co-tenant by the
 * email on their Vallo account and a share; the co-tenant accepts or
 * declines, and pays their own share by card straight to the landlord or
 * agent (`share-checkout.ts`). Vallo never holds any of it.
 *
 * Inviting, answering and removing are session calls to definer doors that
 * check who is asking. Cancelling the group's move-in before it is fully
 * paid (`rent_split_cancel_as`, service role, the lead named from the
 * session) cancels the charge and sends every share already paid back to
 * the card it came from, through Paystack (`share-refunds.ts`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { parseNairaToKobo } from "../agent/listings-schema";
import { findUserByEmail, getAdminClient } from "@/lib/supabase/service";
import { isPaystackConfigured } from "../payments/paystack";
import { submitShareRefunds } from "./share-refunds";

const SERVICE_DOWN = "That did not go through. Nothing was changed. Try again in a moment.";

const WORDS: Record<string, string> = {
  not_found: "We could not find that on your tenancy.",
  void: "This move-in was cancelled or refunded, so nothing is shared on it.",
  bad_person: "Add a flatmate, not yourself or the lister.",
  bad_amount: "Enter a share above zero.",
  exceeds_total: "That would leave you no share of your own. Make it smaller.",
  already_added: "That person already has a share on this move-in.",
  declined_before: "That person declined a share of this move-in, so they cannot be asked again.",
  already_paid: "That share has already been paid.",
  locked: "A share has been paid, so the shares can no longer change.",
  complete: "The move-in is already paid in full, so it cannot be cancelled here. Contact support.",
  payment_in_flight: "A payment on this move-in is still going through. Try again in a few minutes.",
  not_accepted: "Accept the share first, then pay it.",
  not_open: "This move-in can no longer take shares: it has been paid, cancelled or refunded.",
  rate_limited: "You have invited a lot of people today. Try again tomorrow.",
  bad_answer: "Choose accept or decline.",
  already_answered: "You have already answered this invitation.",
};

const uuid = z.uuid("That could not be identified.");

export async function addRentContributor(input: {
  tenancyId: string;
  email: string;
  shareNaira: string;
}): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({ tenancyId: uuid, email: z.email("Enter the email on their Vallo account."), shareNaira: z.string() }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const share = parseNairaToKobo(parsed.data.shareNaira);
  if (share === null || share <= 0) return fail(WORDS.bad_amount as string, { shareNaira: WORDS.bad_amount as string });
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);
  const person = await findUserByEmail(parsed.data.email);
  if (!person) {
    return fail("No Vallo account uses that email address. Ask your flatmate to sign up first.", {
      email: "No account uses this address.",
    });
  }
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("add_rent_contributor", {
      p_rent_payment: parsed.data.tenancyId,
      p_user: person.id,
      p_share: share,
    });
    const status = !error && data && typeof data === "object" ? String((data as Record<string, unknown>).status) : null;
    if (status !== "ok") return fail(WORDS[status ?? ""] ?? SERVICE_DOWN);
    revalidatePath(`/tenancy/${parsed.data.tenancyId}`);
    return ok(null);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

export async function removeRentContributor(input: { tenancyId: string; contributorId: string }): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ tenancyId: uuid, contributorId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("remove_rent_contributor", {
      p_contributor: parsed.data.contributorId,
    });
    const status = !error && data && typeof data === "object" ? String((data as Record<string, unknown>).status) : null;
    if (status !== "ok") return fail(WORDS[status ?? ""] ?? SERVICE_DOWN);
    revalidatePath(`/tenancy/${parsed.data.tenancyId}`);
    return ok(null);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

export async function answerRentShare(input: {
  contributorId: string;
  answer: "accepted" | "declined";
}): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ contributorId: uuid, answer: z.enum(["accepted", "declined"]) }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("answer_rent_share", {
      p_contributor: parsed.data.contributorId,
      p_answer: parsed.data.answer,
    });
    const status = !error && data && typeof data === "object" ? String((data as Record<string, unknown>).status) : null;
    if (status !== "ok") return fail(WORDS[status ?? ""] ?? SERVICE_DOWN);
    revalidatePath(`/rent/share/${parsed.data.contributorId}`);
    return ok(null);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

/**
 * The lead cancels the group's move-in before it is fully paid. Every share
 * already paid is refunded to the card it came from; the refunds are sent to
 * Paystack now, and the hourly job retries any that did not go.
 */
export async function cancelSplitMoveIn(input: { tenancyId: string; note?: string }): Promise<ActionResult<{ refunds: number }>> {
  const parsed = validate(
    z.object({ tenancyId: uuid, note: z.string().trim().max(500, "Keep it under 500 characters.").optional() }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);
  try {
    const { data, error } = await admin.rpc("rent_split_cancel_as" as never, {
      p_actor: session.user.id,
      p_rent_payment: parsed.data.tenancyId,
      p_note: parsed.data.note && parsed.data.note.length > 0 ? parsed.data.note : null,
    } as never);
    const answer = !error && data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    const status = answer ? String(answer.status) : null;
    if (status !== "ok" || !answer) return fail(WORDS[status ?? ""] ?? SERVICE_DOWN);
    const due = Array.isArray(answer.refunds)
      ? (answer.refunds as Record<string, unknown>[]).flatMap((row) =>
          typeof row.refund_id === "string" && typeof row.reference === "string" && Number.isSafeInteger(Number(row.amount_minor))
            ? [{ refund_id: row.refund_id, reference: row.reference, amount_minor: Number(row.amount_minor) }]
            : [],
        )
      : [];
    if (due.length > 0 && isPaystackConfigured()) {
      await submitShareRefunds(admin, due, { kind: "user", userId: session.user.id });
    }
    revalidatePath(`/tenancy/${parsed.data.tenancyId}`);
    return ok({ refunds: due.length });
  } catch {
    return fail(SERVICE_DOWN);
  }
}
