"use server";

/**
 * V-86. Flatmates' shares of a move-in: the lead names a co-tenant by the
 * email on their Vallo account and a share; the co-tenant pays it wallet to
 * wallet into the lead's wallet.
 *
 * Inviting, answering and removing are session calls to definer doors that
 * check who is asking. Paying a share, and the lead returning one when the
 * move-in falls through, MOVE MONEY, so they go through `pay_rent_share` and
 * `return_rent_share`, which wrap the ordinary wallet transfer and are
 * reachable by the service role only, via `callMoneyDoor`: the wallet flag,
 * the account hold, the money limits and the money history, exactly as the
 * Send page.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { parseNairaToKobo } from "../agent/listings-schema";
import { findUserByEmail, getAdminClient } from "../wallet/ledger";
import { callMoneyDoor } from "./money-door";

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
  insufficient: "There is not enough in your wallet for this.",
  not_accepted: "Accept the share first, then pay it.",
  not_open: "This move-in can no longer take shares: it has been paid, cancelled or refunded.",
  rate_limited: "You have invited a lot of people today. Try again tomorrow.",
  bad_answer: "Choose accept or decline.",
  already_answered: "You have already answered this invitation.",
  not_void: "A share is returned only if the move-in is cancelled or refunded.",
  not_paid: "That share was never paid, so there is nothing to return.",
  already_returned: "That share has already been returned.",
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

export async function payRentShare(input: { contributorId: string }): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ contributorId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const result = await callMoneyDoor({
    fn: "pay_rent_share",
    args: (userId) => ({ p_contributor: parsed.data.contributorId, p_payer: userId }),
    amountMinor: null,
    action: "tenancy.share.paid",
    words: WORDS,
    detail: { contributor_id: parsed.data.contributorId },
  });
  if (!result.ok) return fail(result.error);
  revalidatePath(`/rent/share/${parsed.data.contributorId}`);
  revalidatePath("/wallet");
  return ok(null);
}

export async function returnRentShare(input: { tenancyId: string; contributorId: string }): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ tenancyId: uuid, contributorId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const result = await callMoneyDoor({
    fn: "return_rent_share",
    args: (userId) => ({ p_contributor: parsed.data.contributorId, p_lead: userId }),
    amountMinor: null,
    action: "tenancy.share.returned",
    words: WORDS,
    detail: { contributor_id: parsed.data.contributorId },
  });
  if (!result.ok) return fail(result.error);
  revalidatePath(`/tenancy/${parsed.data.tenancyId}`);
  revalidatePath("/wallet");
  return ok(null);
}
