import "server-only";

import { fail, type ActionResult } from "../actions/envelope";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MoneyIntent } from "../security/money-intent";
import { MONEY_BETWEEN_PEOPLE_RETIRED } from "./money-copy";

/**
 * RETIRED, 25 SEPTEMBER 2026: VALLO NEVER HOLDS CUSTOMER MONEY.
 *
 * This was the one path for the after-the-gate doors that moved money
 * between two people's Vallo wallets: a caution returned by a lister (V-36),
 * a flatmate's share of the move-in and its return (V-86). Each was a wallet
 * transfer, which means Vallo held the money in between. There is no wallet
 * now, so the door refuses every call and says what to do instead. The
 * caution register itself (what is owed, what was deducted and why, the
 * move-out report) still works: it is a record, not a movement.
 *
 * The signature is kept so the callers keep compiling while their screens
 * draw the sentence instead of the button (`MONEY_BETWEEN_PEOPLE_RETIRED`).
 */
export { MONEY_BETWEEN_PEOPLE_RETIRED };

export const UNCONFIRMED = "We could not confirm it went through. Nothing was sent.";

export async function callMoneyDoor(input: {
  fn: string;
  args: (userId: string) => Record<string, unknown>;
  amountMinor: number | null;
  action: string;
  words: Record<string, string>;
  detail?: Record<string, string | number | boolean | null>;
  intent: (supabase: SupabaseClient) => Promise<MoneyIntent | null>;
  stepUp?: unknown;
}): Promise<ActionResult<Record<string, unknown>>> {
  void input;
  return fail(MONEY_BETWEEN_PEOPLE_RETIRED);
}
