"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { requireAdmin, ADMIN_FORBIDDEN_MESSAGE } from "./guard";

/**
 * Sweeping stuck withdrawal holds, which is a money movement and is treated as
 * one.
 *
 * WHAT IT ACTUALLY DOES. A withdrawal that never got its transfer webhook
 * leaves a PENDING debit on the wallet forever, and available balance is
 * settled minus pending debits, so the owner is short that amount with nothing
 * on any screen explaining why. The sweep flips those PENDING rows to FAILED,
 * which returns the money to the owner's spendable balance. It does not send
 * anybody money and it does not cancel a transfer that is genuinely in flight:
 * only PENDING rows move, so a webhook landing mid sweep is unaffected.
 *
 * AUTHORISATION, TWICE. `requireAdmin()` here is the first lock and the weaker
 * one, because it is code in this process. The real one is inside
 * `public.admin_expire_stale_withdrawal_holds`, which is SECURITY DEFINER and
 * checks `private.has_role(auth.uid(), 'admin' | 'super_admin')` before it does
 * anything, returning `{"status":"forbidden"}` otherwise. `anon` holds no
 * EXECUTE on it. Deleting this file would not let a stranger sweep a hold.
 *
 * The database also writes the audit row, inside the same transaction as the
 * sweep, so the record cannot drift from what happened.
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

export type SweepOutcome = { expired: number };

export async function expireStaleWithdrawalHolds(input: {
  olderThanMinutes: number;
}): Promise<ActionResult<SweepOutcome>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(ADMIN_FORBIDDEN_MESSAGE);

  const parsed = validate(expireHoldsSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const { data, error } = await access.supabase.rpc("admin_expire_stale_withdrawal_holds", {
      p_older_than_minutes: parsed.data.olderThanMinutes,
    });
    if (error) return fail(SERVICE_DOWN);

    const status = readStatus(data);
    if (status === "ok") {
      revalidatePath("/admin/payments");
      revalidatePath("/admin/money");
      return ok({ expired: readCount(data, "expired") });
    }
    if (status === "forbidden") return fail(ADMIN_FORBIDDEN_MESSAGE);
    return fail(SERVICE_DOWN);
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
