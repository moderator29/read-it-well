"use server";

/**
 * Recovering money, from the console, by a named human.
 *
 * The owner funded their wallet, Paystack took the money, and nothing reached
 * the ledger. Getting that specific credit posted is a one-line job. Making
 * sure the next one can be recovered without an engineer, a shell and a service
 * key is this file.
 *
 * Everything here is admin-only, through requireAdmin(), which asks the
 * database for the caller's role using the caller's own RLS-bound client. There
 * is no environment variable, header or query parameter that opens this door.
 *
 * Every action is safe to run repeatedly. The unique `reference` column on
 * wallet_entries is the only thing making that true, which is deliberate: a
 * second "have we done this already" check in TypeScript would be a race and a
 * second opinion about what the ledger contains. An admin who taps recover
 * twice credits once.
 *
 * Every action leaves an audit_log row naming the admin who ran it.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { nairaExact } from "../payments/money";
import { adminRefusal, requireAdmin } from "../admin/guard";
import { getAdminClient } from "./ledger";
import { recordMoneyAudit } from "./audit";
import {
  DEFAULT_SWEEP_HOURS,
  runMoneyReconciliation,
  reconcileFundingReference,
  type MoneyReconciliationReport,
  type ReconcileResult,
} from "./reconciliation";

const SERVICE_DOWN =
  "The console could not reach the platform data just now. Nothing was changed. Please try again.";

/**
 * Recover one wallet funding by its Paystack reference.
 *
 * Ask Paystack what really happened to that charge and, if it succeeded and the
 * ledger does not have it, post the credit. The answer names the outcome in
 * plain language so an admin can act on it without reading a log.
 */
export async function recoverFundingByReference(
  reference: string,
): Promise<ActionResult<ReconcileResult | null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const trimmed = (reference ?? "").trim();
  if (trimmed.length === 0) {
    return fail("Enter the Paystack reference for the payment you are recovering.", {
      reference: "Enter a payment reference.",
    });
  }

  const admin = getAdminClient();
  if (!admin) {
    // The exact failure that lost the owner's money in the first place, now
    // said out loud instead of answered with a shrug.
    return fail(
      "The service role key is missing from this deployment, so nothing can be written to the ledger. Set SUPABASE_SERVICE_ROLE_KEY and try again.",
    );
  }

  const result = await reconcileFundingReference(admin, trimmed, {
    kind: "user",
    userId: access.user.id,
  });

  if (result.outcome === "recovered") {
    revalidatePath("/wallet");
    return ok(result);
  }

  if (result.outcome === "already_posted") {
    // Not an error. The commonest correct answer, and the admin needs to know
    // that the money is already where it should be.
    return ok(result);
  }

  if (result.outcome === "not_ours") {
    return fail(
      "That is not a Vallo wallet funding reference. Funding references look like rm-fund- followed by a uuid.",
      { reference: "That is not a wallet funding reference." },
    );
  }
  if (result.outcome === "not_successful") {
    return fail(
      `Paystack says that charge did not succeed (${result.reason}), so there is nothing to credit.`,
    );
  }
  if (result.outcome === "unmatched") {
    const amount = result.amountMinor === null ? "" : ` of ${nairaExact(result.amountMinor)}`;
    return fail(
      `That charge${amount} succeeded but cannot be matched to a Vallo account (${result.reason}). It is recorded as unmatched in the audit log. Find the account and credit it deliberately.`,
    );
  }
  if (result.outcome === "unavailable") {
    return fail("Payment keys are not configured on this deployment, so Paystack cannot be asked.");
  }
  return fail(`${SERVICE_DOWN} The reason given was: ${result.reason}`);
}

/**
 * Run the full reconciliation now, by hand.
 *
 * The scheduled job runs this on its own; this is the version an admin reaches
 * for when somebody says "my money has not arrived". `apply` false is the safe
 * read: it reports every gap and changes nothing.
 */
export async function runReconciliationNow(options?: {
  hours?: number;
  apply?: boolean;
}): Promise<ActionResult<MoneyReconciliationReport | null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const admin = getAdminClient();
  if (!admin) {
    return fail(
      "The service role key is missing from this deployment, so the ledger cannot be read or written. Set SUPABASE_SERVICE_ROLE_KEY and try again.",
    );
  }

  const hours = options?.hours ?? DEFAULT_SWEEP_HOURS;
  const apply = options?.apply ?? false;

  const report = await runMoneyReconciliation(admin, {
    hours,
    apply,
    actor: { kind: "user", userId: access.user.id },
  });

  await recordMoneyAudit(admin, {
    actor: { kind: "user", userId: access.user.id },
    action: "wallet.reconciliation.run",
    reference: null,
    outcome: report.needsAttention ? "needs_attention" : "clean",
    detail: {
      hours,
      apply,
      charges_seen: report.charges.chargesSeen,
      gaps: report.charges.gaps.length,
      recovered_minor: report.charges.recoveredMinor,
      holds_examined: report.holds.examined,
      released_minor: report.holds.releasedMinor,
      overdrawn: report.overdrawn.length,
    },
  });

  if (apply && report.charges.recoveredMinor > 0) revalidatePath("/wallet");
  return ok(report);
}
