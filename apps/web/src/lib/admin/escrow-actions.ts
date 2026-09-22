"use server";

/**
 * The admin resolution desk's WRITE, and only its write.
 *
 * THE DRAWING IS NOT MINE. The admin console is another session's surface in
 * full, so this file is the server action the desk calls and nothing else:
 * no component, no read, no route. When that desk grows a held-payments tab
 * it imports `ruleOnHeldPayment` and inherits every guard below rather than
 * growing a second path to the same money.
 *
 * WHY THE GUARD IS IN THREE PLACES AND THAT IS NOT DUPLICATION.
 *
 *   `requireAdmin()` here, so a non-admin is refused before a network call.
 *   The Zod schema here, so the twenty-character floor names a FIELD, which
 *   is what a form needs, rather than coming back as a status code.
 *   `private.has_role` inside `public.escrow_admin_resolve`, which is the one
 *   that actually enforces it, because it is the only one a caller cannot
 *   skip. The function keeps its grant to `authenticated` precisely so it can
 *   be the boundary; that grant is correct and is not the F-2 finding.
 *
 * TWENTY CHARACTERS IS THE FLOOR AND IT IS NOT ARBITRARY. It is roughly a
 * short sentence, and a short sentence is the least an operator owes two
 * people who both believe they are right. The old floor of four accepted
 * "yes." as a reason for moving somebody else's money.
 *
 * THE RULING REACHES BOTH PARTIES WORD FOR WORD. The database sends it to
 * both, unedited, as the body of a notification, and it is stored on the
 * agreement where both can read it. Nothing here summarises it for one side.
 *
 * A "use server" MODULE MAY EXPORT NOTHING THAT IS NOT AN ASYNC FUNCTION. A
 * non-function export from a module with this directive has taken this build
 * down twice. Every constant this file needs is declared and not exported.
 */

import { z } from "zod";

import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { getAdminClient } from "../wallet/ledger";
import { callMoneyRpc, readMoneyStatus } from "../wallet/rpc";
import { adminRefusal, requireAdmin } from "./guard";

const SERVICE_DOWN =
  "That could not be done just now and nothing was moved. Please try again shortly.";

/** The minimum a ruling can be. Restated in the database, which enforces it. */
const RULING_MINIMUM = 20;

const rulingSchema = z.object({
  id: z.uuid("That is not something we can act on."),
  /** Where the money goes. There is no third answer and no partial one yet. */
  direction: z.enum(["release", "refund"], {
    message: "Say whether the money goes to the payee or back to the payer.",
  }),
  ruling: z
    .string()
    .trim()
    .min(RULING_MINIMUM, "Both people will read this. Give them a sentence.")
    .max(2000, "Keep it under 2000 characters."),
});

/** The refusals the database can answer with, in English. */
const REFUSALS: Record<string, string> = {
  forbidden: "That is not yours to decide.",
  bad_direction: "Say whether the money goes to the payee or back to the payer.",
  needs_a_reason: "Both people will read this. Give them a sentence.",
  not_found: "That is no longer there. Refresh and look again.",
  not_disputed: "That is not under review, so there is nothing to decide.",
  already_settled: "That has already been settled, so nothing was moved.",
  no_wallet: "The person this would pay has no wallet, so nothing was moved.",
  bad_commission: "The figures on that do not add up, so nothing was moved.",
};

/** What a ruling did, in the desk's vocabulary rather than SQL's. */
export type RulingOutcome = {
  id: string;
  state: string | null;
  /** Integer kobo that moved. */
  amountMinor: number | null;
};

/**
 * Rule on a disputed held payment, as an admin.
 *
 * Returns the envelope every server action in this estate returns. A refusal
 * the database decided comes back as a sentence saying that nothing moved,
 * because the first thing anybody wants after a refused money action is to
 * know the money is where they left it.
 */
export async function ruleOnHeldPayment(input: {
  id: string;
  direction: "release" | "refund";
  ruling: string;
}): Promise<ActionResult<RulingOutcome>> {
  const parsed = validate(rulingSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const admin = getAdminClient();
  if (!admin) return fail(SERVICE_DOWN);

  /*
   * THE CALL GOES THROUGH THE SERVICE ROLE CLIENT and passes no actor, because
   * `escrow_admin_resolve` reads `auth.uid()` for itself. That is deliberate:
   * an actor this action could name is an actor this action could get wrong,
   * and a ruling attributed to the wrong operator is worse than an unsigned
   * one. The role check above is the fast refusal; the function's own check is
   * the one that decides.
   */
  const call = await callMoneyRpc(admin, "escrow", "escrow_admin_resolve", {
    p_escrow: parsed.data.id,
    p_direction: parsed.data.direction,
    p_note: parsed.data.ruling,
  }, {
    reference: null,
    amountMinor: null,
    userId: access.user.id,
  });
  if (call.outcome !== "ok") return fail(SERVICE_DOWN);

  const status = readMoneyStatus(call.data);
  if (status.status !== "ok") return fail(REFUSALS[status.status] ?? SERVICE_DOWN);

  const row = (call.data ?? {}) as Record<string, unknown>;
  return ok({
    id: typeof row["escrow_id"] === "string" ? (row["escrow_id"] as string) : parsed.data.id,
    state: status.state,
    amountMinor: typeof row["gross_minor"] === "number" ? (row["gross_minor"] as number) : null,
  });
}
