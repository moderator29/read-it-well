"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { logMoney } from "../payments/observability";
import { getAdminClient } from "./ledger";
import { callMoneyRpc, readMoneyStatus } from "./rpc";
import { nairaAmountSchema } from "./schema";

/**
 * Savings pots: create one, put money in, take money out.
 *
 * ===========================================================================
 * THESE ACTIONS DO NOT DO ARITHMETIC, AND THAT IS THE WHOLE DESIGN.
 * ===========================================================================
 *
 * Every one of them hands off to a Postgres function that takes a `for update`
 * lock on the wallet row, reads the balance INSIDE that lock, and writes both
 * the ledger entry and the pot balance before releasing it. Reading a balance
 * over PostgREST and then posting an entry over PostgREST is two round trips
 * with nothing between them, so two taps on a slow connection both read the
 * same balance, both find it sufficient, and both post.
 *
 * So there is no balance check in this file. If one ever appears here it is
 * wrong, because a check outside the lock is a check that can be raced.
 *
 * ===========================================================================
 * THE MIGRATION MAY NOT BE APPLIED, AND THAT IS HANDLED RATHER THAN ASSUMED.
 * ===========================================================================
 *
 * `callMoneyRpc` answers `missing` instead of throwing when a function is not
 * in the database yet. Every action here treats that as "this is not switched
 * on" and says so plainly. `missing` is NEVER treated as success - a pot move
 * that did not happen must not report that it did.
 *
 * ===========================================================================
 * NOTHING HERE EARNS ANYTHING.
 * ===========================================================================
 *
 * A pot is the owner's own money, one step further from being spent. There is
 * no interest, no yield, no lock-in and no penalty, the schema has no column
 * that could express one, and no copy in this file implies otherwise. Taking
 * money back out is one call and needs nobody's permission.
 */

const POT_PREFIX = "rm-pot-";

const NOT_ENABLED =
  "Savings pots are not switched on for this account yet. Your balance is untouched.";

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the pot a name.")
    .max(40, "Keep the name under 40 characters."),
  /* Optional, because a target is a private note to themselves rather than a
     commitment. An empty string means no target, not a target of zero. */
  target: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

const moveSchema = z.object({
  potId: z.string().uuid("Pick a pot."),
  amount: nairaAmountSchema,
});

/* ------------------------------------------------------------------ create */

export async function createPot(
  _prev: ActionResult<{ id: string } | null>,
  formData: FormData,
): Promise<ActionResult<{ id: string } | null>> {
  if (!(await isFeatureEnabled("wallet"))) return fail(NOT_ENABLED);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(createSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  /* The target goes through the SAME naira parser the amounts use, so "50,000"
     and "50000" mean the same thing here as they do everywhere else on this
     screen. Its own parse rather than a field on the schema above, because a
     bad target must name the target field and not the amount field. */
  let targetMinor: number | null = null;
  if (parsed.data.target !== undefined) {
    const target = nairaAmountSchema.safeParse(parsed.data.target);
    if (!target.success) {
      return fail("That target is not an amount we can read.", {
        target: "Enter a target like 500000, or leave it empty.",
      });
    }
    targetMinor = target.data;
  }

  /*
   * Created through the SIGNED-IN SESSION rather than the service role.
   *
   * The insert policy is `user_id = auth.uid() and balance_minor = 0`, so RLS
   * both decides ownership and refuses a pot that tries to be born holding
   * money. Using the admin client here would bypass exactly the check that
   * makes this safe.
   */
  const inserter = session.supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => {
        select: (columns: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { code?: string; message?: string } | null;
          }>;
        };
      };
    };
  };

  const { data, error } = await inserter
    .from("wallet_pots")
    .insert({
      user_id: session.user.id,
      name: parsed.data.name,
      ...(targetMinor === null ? {} : { target_minor: targetMinor }),
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42P01" || error?.code === "PGRST205") return fail(NOT_ENABLED);
    return fail("That pot could not be created. Please try again.");
  }

  revalidatePath("/wallet");
  return ok({ id: data.id });
}

/* -------------------------------------------------------------------- move */

export async function moveIntoPot(
  _prev: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  return move(formData, "in");
}

export async function moveOutOfPot(
  _prev: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  return move(formData, "out");
}

async function move(formData: FormData, direction: "in" | "out"): Promise<ActionResult<null>> {
  if (!(await isFeatureEnabled("wallet"))) return fail(NOT_ENABLED);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(moveSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  const reference = `${POT_PREFIX}${randomUUID()}`;
  const fn = direction === "in" ? "move_into_pot" : "move_out_of_pot";

  const result = await callMoneyRpc(
    admin,
    "fund",
    fn,
    {
      owner_user: session.user.id,
      pot: parsed.data.potId,
      amount: parsed.data.amount,
      move_reference: reference,
    },
    { reference, amountMinor: parsed.data.amount, userId: session.user.id },
  );

  /* `missing` is the migration not being applied. Never success. */
  if (result.outcome === "missing") return fail(NOT_ENABLED);
  if (result.outcome === "failed") {
    return fail("That did not go through, and your balance is untouched. Please try again.");
  }

  const status = readMoneyStatus(result.data);

  if (status.status === "insufficient") {
    return fail(
      direction === "in"
        ? "There is not that much available in your wallet to set aside."
        : "There is not that much in this pot.",
      { amount: "Try a smaller amount." },
    );
  }
  if (status.status === "no_pot") return fail("That pot no longer exists.");
  if (status.status === "no_wallet") return fail("Your wallet is not open yet.");
  if (status.status !== "ok" && status.status !== "duplicate") {
    return fail("That did not go through, and your balance is untouched. Please try again.");
  }

  logMoney({
    surface: "fund",
    outcome: status.status === "duplicate" ? "duplicate" : "posted",
    reason: direction === "in" ? "pot_hold" : "pot_release",
    reference,
    amountMinor: parsed.data.amount,
    userId: session.user.id,
  });

  revalidatePath("/wallet");
  return ok(null);
}
