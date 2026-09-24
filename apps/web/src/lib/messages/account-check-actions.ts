"use server";

import { resolveSession } from "../actions/session";
import type { AccountCheckOutcome, AccountCheckView } from "./account-check";

/**
 * The receiver's card asks once more for a check that had not landed when
 * the message arrived live (V-04). Read under the caller's own RLS, whose
 * policy answers only for messages the caller did NOT send, so this cannot be
 * used by a sender to learn the answer about their own number.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OUTCOMES: readonly AccountCheckOutcome[] = ["match", "no_match", "unresolved", "no_verified_name", "limited"];

type UntypedFrom = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: { outcome: string; shares_a_name: boolean | null } | null; error: unknown }>;
      };
    };
  };
};

export async function readAccountCheck(messageId: string): Promise<AccountCheckView | null> {
  if (typeof messageId !== "string" || !UUID_RE.test(messageId)) return null;
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data } = await (session.supabase as unknown as UntypedFrom)
      .from("message_account_checks")
      .select("outcome, shares_a_name")
      .eq("message_id", messageId)
      .maybeSingle();
    const outcome = data?.outcome;
    return OUTCOMES.includes(outcome as AccountCheckOutcome)
      ? { outcome: outcome as AccountCheckOutcome, sharesAName: data?.shares_a_name ?? null }
      : null;
  } catch {
    return null;
  }
}
