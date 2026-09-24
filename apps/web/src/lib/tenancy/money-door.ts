import "server-only";

import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { accountHoldRefusal, holdRefusalForFailure } from "../security/account-hold-guard";
import { guardMoney } from "../security/money-limits";
import { recordMoneyAudit } from "../wallet/audit";
import { getAdminClient } from "../wallet/ledger";
import { callMoneyRpc } from "../wallet/rpc";

/**
 * THE ONE PATH FOR THE AFTER-THE-GATE DOORS THAT MOVE MONEY: a caution
 * return (V-36), a flatmate's share and its return (V-86). Each wraps the
 * ordinary wallet transfer in the database and is service-role only, so every
 * one of them passes the same gates as the Send page, in the same order as
 * `transferToUserWork`:
 *
 *   the wallet flag, the session, the account hold (V-19), the money limits,
 *   then the call naming the signed-in user; a failure the hold trigger raised
 *   is said as the hold, a failure that may have reached the database is
 *   said as unconfirmed, and only a call that moved money is written to the
 *   money history (a repeat that found it already moved was written the first
 *   time).
 */
export const WALLET_OFF = "The wallet is switched off for a moment. Nothing was sent. Try again shortly.";
const SERVICE_DOWN = "That did not go through. Nothing was sent. Try again in a moment.";
/** The call may have reached the database, so nothing is promised either way. */
export const UNCONFIRMED = "We could not confirm it went through. Check your wallet before trying again.";

export async function callMoneyDoor(input: {
  fn: string;
  /** Builds the arguments once the signed-in user is known. */
  args: (userId: string) => Record<string, unknown>;
  amountMinor: number | null;
  action: string;
  words: Record<string, string>;
  detail?: Record<string, string | number | boolean | null>;
}): Promise<ActionResult<Record<string, unknown>>> {
  if (!(await isFeatureEnabled("wallet"))) return fail(WALLET_OFF);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const hold = await accountHoldRefusal(session.supabase);
  if (hold) return fail(hold);
  const limit = await guardMoney("transferToUser", session.user.id);
  if (!limit.allowed) return fail(limit.message);
  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  const call = await callMoneyRpc(admin, "transfer", input.fn, input.args(session.user.id), {
    amountMinor: input.amountMinor,
    userId: session.user.id,
  });
  if (call.outcome === "failed") {
    const held = await holdRefusalForFailure(session.supabase, call.reason);
    return fail(held ?? UNCONFIRMED);
  }
  if (call.outcome !== "ok") return fail(SERVICE_DOWN);
  if (typeof call.data !== "object" || call.data === null) return fail(UNCONFIRMED);
  const answer = call.data as Record<string, unknown>;
  const status = String(answer.status);
  const reference = typeof answer.reference === "string" ? answer.reference : null;
  if (reference && status === "ok") {
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: input.action,
      reference,
      amountMinor: typeof answer.amount_minor === "number" ? answer.amount_minor : input.amountMinor,
      subjectUserId: session.user.id,
      outcome: status,
      detail: { atomic: true, ...(input.detail ?? {}) },
    });
  }
  if (status !== "ok") return fail(input.words[status] ?? SERVICE_DOWN);
  return ok(answer);
}
