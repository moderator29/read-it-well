"use server";

/**
 * V-86. Flatmates' shares of a move-in: the lead names a co-tenant by the
 * email on their Vallo account and a share; the co-tenant pays it wallet to
 * wallet into the lead's wallet.
 *
 * Adding and removing are the lead's own session calls to definer doors that
 * check who is asking. Paying MOVES MONEY, so it goes through `pay_rent_share`,
 * which wraps the ordinary wallet transfer and is reachable by the service
 * role only; this action applies the wallet flag and the money limits first,
 * exactly as the Send page does, and names the signed-in payer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { parseNairaToKobo } from "../agent/listings-schema";
import { isFeatureEnabled } from "../flags";
import { guardMoney } from "../security/money-limits";
import { findUserByEmail, getAdminClient } from "../wallet/ledger";
import { callMoneyRpc } from "../wallet/rpc";

const SERVICE_DOWN = "That did not go through. Nothing was changed. Try again in a moment.";

const WORDS: Record<string, string> = {
  not_found: "We could not find that on your tenancy.",
  void: "This move-in was cancelled or refunded, so nothing is shared on it.",
  bad_person: "Add a flatmate, not yourself or the lister.",
  bad_amount: "Enter a share above zero.",
  exceeds_total: "That would leave you no share of your own. Make it smaller.",
  already_added: "That person already has a share on this move-in.",
  already_paid: "That share has already been paid.",
  insufficient: "There is not enough in your wallet for your share.",
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

export async function payRentShare(input: { contributorId: string }): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ contributorId: uuid }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  if (!(await isFeatureEnabled("wallet"))) return fail("The wallet is switched off for a moment. Nothing was sent. Try again shortly.");
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const limit = await guardMoney("transferToUser", session.user.id);
  if (!limit.allowed) return fail(limit.message);
  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);
  const call = await callMoneyRpc(
    admin,
    "transfer",
    "pay_rent_share",
    { p_contributor: parsed.data.contributorId, p_payer: session.user.id },
    { userId: session.user.id },
  );
  if (call.outcome !== "ok" || typeof call.data !== "object" || call.data === null) return fail(SERVICE_DOWN);
  const status = String((call.data as Record<string, unknown>).status);
  if (status !== "ok") return fail(WORDS[status] ?? SERVICE_DOWN);
  revalidatePath(`/rent/share/${parsed.data.contributorId}`);
  revalidatePath("/wallet");
  return ok(null);
}
