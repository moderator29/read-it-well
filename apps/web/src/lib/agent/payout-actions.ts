"use server";

/**
 * Where an agent's money goes.
 *
 * public.payout_accounts has had RLS and a correct owner policy since the
 * agents_core migration and no application code at all, so an approved agent
 * could see what they had earned and had no way to tell us where to send it.
 * This is that missing half.
 *
 * Two rules shape the whole file.
 *
 * First, the stored account_name never comes from the person filing the
 * account. It is re-resolved against the bank inside the same action that
 * inserts, so a tampered form field cannot put a friendly name on a stranger's
 * NUBAN. That is also what gives R-32's payout name check something honest to
 * compare against later.
 *
 * Second, the invariants are the database's: exactly one default per agent, no
 * duplicate NUBAN per agent, ten digits, and rows scoped to the caller's own
 * agent row. None of them is restated here, because a rule enforced twice
 * drifts in one of the two places.
 *
 * Every write goes through the agent's own RLS-bound client. The service role
 * is never used: a payout account written as the service role would bypass the
 * ownership check that is the entire point.
 */

import { revalidatePath } from "next/cache";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE } from "../actions/session";
import { PaystackError, isPaystackConfigured, resolveAccountNumber } from "../payments/paystack";
import { getAgentContext } from "./listings-queries";
import {
  addPayoutAccountInputSchema,
  payoutAccountIdSchema,
  resolveAccountInputSchema,
} from "./payout-schema";

const NOT_AGENT_MESSAGE =
  "Only an approved agent can add a payout account. Apply to host and we will take it from there.";

const SERVICE_DOWN_MESSAGE =
  "We could not save that just then. Nothing was lost, please try again in a moment.";

const UNVERIFIABLE_MESSAGE =
  "Bank confirmation switches on the moment the payment keys land. Until then we will not store an account we cannot confirm belongs to you.";

export type ResolvedName = { accountName: string };

/**
 * Step one: ask the bank whose account this is.
 *
 * Nothing is stored. The agent sees the real name and decides whether it is
 * theirs, which is how every Nigerian banking app already behaves and the
 * single best mis-transfer prevention available.
 */
export async function resolvePayoutAccount(
  _prev: ActionResult<ResolvedName> | null,
  formData: FormData,
): Promise<ActionResult<ResolvedName>> {
  const context = await getAgentContext();
  if (context.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (context.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (context.state === "not-agent") return fail(NOT_AGENT_MESSAGE);

  if (!isPaystackConfigured()) return fail(UNVERIFIABLE_MESSAGE);

  const parsed = validate(resolveAccountInputSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const resolved = await resolveAccountNumber(parsed.data.accountNumber, parsed.data.bankCode);
    return ok({ accountName: resolved.accountName });
  } catch (error) {
    if (error instanceof PaystackError) {
      return fail(
        "That account could not be confirmed. Check the number and the bank, then try again.",
        { accountNumber: "We could not confirm this account." },
      );
    }
    return fail(SERVICE_DOWN_MESSAGE);
  }
}

/**
 * Step two: store it, with the name the bank gave rather than the one the form
 * carried.
 */
export async function addPayoutAccount(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const context = await getAgentContext();
  if (context.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (context.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (context.state === "not-agent") return fail(NOT_AGENT_MESSAGE);

  if (!isPaystackConfigured()) return fail(UNVERIFIABLE_MESSAGE);

  const parsed = validate(addPayoutAccountInputSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  // The name is re-resolved server side and the client's value is discarded.
  let accountName: string;
  try {
    const resolved = await resolveAccountNumber(parsed.data.accountNumber, parsed.data.bankCode);
    accountName = resolved.accountName;
  } catch (error) {
    if (error instanceof PaystackError) {
      return fail(
        "That account could not be confirmed. Check the number and the bank, then try again.",
        { accountNumber: "We could not confirm this account." },
      );
    }
    return fail(SERVICE_DOWN_MESSAGE);
  }

  const { error: insertError } = await context.supabase.from("payout_accounts").insert({
    agent_id: context.agent.id,
    bank_name: parsed.data.bankName,
    account_number: parsed.data.accountNumber,
    account_name: accountName,
  });

  if (insertError) {
    // 23505 is the per-agent unique NUBAN.
    if (insertError.code === "23505") {
      return fail("You have already added that account.", {
        accountNumber: "This account is already on your list.",
      });
    }
    // 23514 is the ten-digit check constraint.
    if (insertError.code === "23514") {
      return fail("A Nigerian account number is exactly ten digits.", {
        accountNumber: "A Nigerian account number is exactly ten digits.",
      });
    }
    if (insertError.code === "42501") {
      return fail(NOT_AGENT_MESSAGE);
    }
    return fail(SERVICE_DOWN_MESSAGE);
  }

  revalidatePath("/agent/earnings");
  return ok(null);
}

/** Make one account the one earnings are paid into. The database keeps it single. */
export async function setDefaultPayoutAccount(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const context = await getAgentContext();
  if (context.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (context.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (context.state === "not-agent") return fail(NOT_AGENT_MESSAGE);

  const parsed = validate(payoutAccountIdSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { error, count } = await context.supabase
    .from("payout_accounts")
    .update({ is_default: true }, { count: "exact" })
    .eq("id", parsed.data.accountId)
    .eq("agent_id", context.agent.id);

  if (error) return fail(SERVICE_DOWN_MESSAGE);
  // With RLS a row that is not the caller's simply is not matched, so zero rows
  // changed means "not yours", not "service failure".
  if (count === 0) return fail("We could not find that account on your list.");

  revalidatePath("/agent/earnings");
  return ok(null);
}

/** Remove an account. The database promotes the most recent survivor. */
export async function removePayoutAccount(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const context = await getAgentContext();
  if (context.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (context.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (context.state === "not-agent") return fail(NOT_AGENT_MESSAGE);

  const parsed = validate(payoutAccountIdSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { error, count } = await context.supabase
    .from("payout_accounts")
    .delete({ count: "exact" })
    .eq("id", parsed.data.accountId)
    .eq("agent_id", context.agent.id);

  if (error) return fail(SERVICE_DOWN_MESSAGE);
  if (count === 0) return fail("We could not find that account on your list.");

  revalidatePath("/agent/earnings");
  return ok(null);
}
