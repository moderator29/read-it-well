"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { createAdminClient } from "../supabase/admin";
import { writeAudit } from "./audit";
import { adminRefusal, requireAdmin, ADMIN_FORBIDDEN_MESSAGE } from "./guard";
import { removeSavedMethodSchema } from "./schema";
import { getAdminClient } from "../wallet/ledger";
import { sweepStaleWithdrawalHolds } from "../wallet/reconciliation";

/**
 * Sweeping stuck withdrawal holds, which is a money movement and is treated as
 * one.
 *
 * WHAT IT ACTUALLY DOES. A withdrawal that never got its transfer webhook
 * leaves a PENDING debit on the wallet, and available balance is settled minus
 * pending debits, so the owner is short that amount until it resolves.
 *
 * MON-02. It used to call `public.admin_expire_stale_withdrawal_holds`, which
 * failed every PENDING hold past an age, whatever the processor said. A
 * transfer that had in fact paid out was released as well, and the member was
 * paid twice. It now runs `sweepStaleWithdrawalHolds`, the same code as the
 * scheduled sweep: every hold is verified with Paystack first; a paid transfer
 * is completed, a failed or reversed one released, one Paystack has never seen
 * released only once it is old enough (NEVER_STARTED_MIN_AGE_MINUTES), and an
 * unanswered one is left alone. Each resolution is audited with this admin as
 * the actor.
 *
 * AUTHORISATION. `requireAdmin()` reads the caller's roles through their own
 * client; the sweep then runs with the service role, as the scheduled one does.
 */

const SERVICE_DOWN =
  "That could not be recorded just now. Nothing was changed. Please try again.";

function readEnvelope(data: unknown): Record<string, unknown> | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

function readStatus(data: unknown): string {
  const envelope = readEnvelope(data);
  const status = envelope?.["status"];
  return typeof status === "string" ? status : "";
}

function readCount(data: unknown, key: string): number {
  const envelope = readEnvelope(data);
  const value = envelope?.[key];
  return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
}

/* ------------------------------------------------- sweeping withdrawal holds */

const expireHoldsSchema = z.object({
  /*
   * The window, in minutes, and the floor is deliberate.
   *
   * Thirty is the sweeper's own window and the default the screen offers. Ten
   * is the smallest value this action will accept, because a sweep with a
   * window of one minute would fail withdrawals that are simply still in
   * flight, and turning a working transfer into a FAILED entry is the exact
   * harm the window exists to prevent.
   */
  olderThanMinutes: z
    .number()
    .int("Choose a whole number of minutes.")
    .min(10, "A window under ten minutes would fail withdrawals that are still in flight.")
    .max(10080, "Choose a window inside the last week."),
});

export type SweepOutcome = {
  /** Holds handed back to their owners (failed, reversed or never started). */
  expired: number;
  /** Holds whose transfer had paid out, now completed rather than released. */
  completed: number;
  /** Holds Paystack could not settle either way, left as they were. */
  leftPending: number;
};

export async function expireStaleWithdrawalHolds(input: {
  olderThanMinutes: number;
}): Promise<ActionResult<SweepOutcome>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(ADMIN_FORBIDDEN_MESSAGE);

  const parsed = validate(expireHoldsSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const admin = getAdminClient();
  if (!admin) return fail(SERVICE_DOWN);

  try {
    const report = await sweepStaleWithdrawalHolds(admin, {
      olderThanMinutes: parsed.data.olderThanMinutes,
      apply: true,
      actor: { kind: "user", userId: access.user.id },
    });
    if (report.unavailable) return fail(SERVICE_DOWN);
    revalidatePath("/admin/payments");
    revalidatePath("/admin/money");
    const count = (action: string) => report.resolutions.filter((r) => r.action === action).length;
    return ok({
      expired: count("released"),
      completed: count("completed"),
      leftPending: count("left_pending") + count("failed"),
    });
  } catch {
    return fail(SERVICE_DOWN);
  }
}

/* --------------------------------------------------- retiring the examples */

const retireExamplesSchema = z.object({
  listingIds: z
    .array(z.string().trim().uuid("We could not identify one of those listings."))
    .min(1, "Choose at least one example to retire.")
    .max(200, "Retire these in batches of two hundred or fewer."),
});

export type RetireOutcome = { retired: number };

/**
 * Taking the example listings off the catalogue.
 *
 * The 42 seeded properties exist so the product is not empty while it fills up,
 * and they have to be removable the day it does. Retiring sets the status to
 * SUSPENDED rather than deleting: the rows stay, the catalogue stops showing
 * them, and a mistake is one status change to undo rather than a restore from
 * backup.
 *
 * `public.admin_retire_demo_listings` carries `is_demo is true` in its own WHERE
 * clause, so this path cannot take a real listing off the catalogue whatever it
 * is handed, and it checks `private.has_role(auth.uid(), 'admin' | 'super_admin')`
 * before it touches a row.
 */
export async function retireExampleListings(input: {
  listingIds: string[];
}): Promise<ActionResult<RetireOutcome>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(ADMIN_FORBIDDEN_MESSAGE);

  const parsed = validate(retireExamplesSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const { data, error } = await access.supabase.rpc("admin_retire_demo_listings", {
      p_listing_ids: parsed.data.listingIds,
    });
    if (error) return fail(SERVICE_DOWN);

    const status = readStatus(data);
    if (status === "ok") {
      revalidatePath("/admin/examples");
      revalidatePath("/admin/listings");
      return ok({ retired: readCount(data, "retired") });
    }
    if (status === "nothing_selected") {
      return fail("Choose at least one example to retire.");
    }
    if (status === "forbidden") return fail(ADMIN_FORBIDDEN_MESSAGE);
    return fail(SERVICE_DOWN);
  } catch {
    return fail(SERVICE_DOWN);
  }
}

/* --------------------------------------- removing a saved method for someone */

/**
 * Take a saved card or a bank account off a person's list because they asked.
 *
 * The same soft delete the owner's own `removePaymentMethod` and
 * `removeBankAccount` perform, through the service role because the row is
 * not the operator's and the owner's policy would hide it. What makes that
 * safe is everything around the write: the guard in front, a reason that
 * names who asked and how, an audit line carrying the row id and the reason
 * and nothing about the card or the account, and a notification to the owner
 * so a removal they did not ask for is a removal they hear about.
 */
async function removeSavedMethod(
  table: "payment_methods" | "bank_accounts",
  input: { id: string; reason: string },
): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(removeSavedMethodSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail(SERVICE_DOWN);
  }

  const { data: row, error: readError } = await admin
    .from(table)
    .select("id, user_id, deleted_at")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!row) return fail("That entry is no longer there. Search again to see the current list.");
  if (row.deleted_at) return fail("That entry was already removed. Nothing was changed.");

  const { error: writeError, count } = await admin
    .from(table)
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", row.id)
    .is("deleted_at", null);
  if (writeError) return fail(SERVICE_DOWN);
  if (count === 0) return fail("That entry was already removed. Nothing was changed.");

  const isCard = table === "payment_methods";
  try {
    await writeAudit(admin, {
      actorId: access.user.id,
      action: isCard ? "payment_method.removed_by_admin" : "bank_account.removed_by_admin",
      entityType: isCard ? "payment_method" : "bank_account",
      entityId: row.id,
      detail: { owner_id: row.user_id, reason: parsed.data.reason },
    });
    await admin.from("notifications").insert({
      user_id: row.user_id,
      kind: "wallet",
      title: isCard ? "A saved card was removed" : "A bank account was removed",
      body: isCard
        ? "A member of the Vallo team removed a saved card from your account at your request. If you did not ask for this, reply to support straight away."
        : "A member of the Vallo team removed a bank account from your account at your request. If you did not ask for this, reply to support straight away.",
      href: "/settings/payments",
    });
  } catch {
    // Best effort. The row is already gone from the person's list.
  }

  revalidatePath("/admin/payments");
  revalidatePath("/settings/payments");
  return ok(null);
}

export async function removePaymentMethodAsAdmin(input: {
  id: string;
  reason: string;
}): Promise<ActionResult<null>> {
  return removeSavedMethod("payment_methods", input);
}

export async function removeBankAccountAsAdmin(input: {
  id: string;
  reason: string;
}): Promise<ActionResult<null>> {
  return removeSavedMethod("bank_accounts", input);
}
