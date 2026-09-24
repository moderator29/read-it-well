import "server-only";

import { cachedBanks, resolveBankAccountName } from "@/lib/payments/bank-resolve";
import { consume } from "@/lib/security/rate-limit";
import { hasServiceRole } from "@/lib/security/service-rpc";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runAccountCheck,
  type AccountCheckDeps,
  type AccountCheckInput,
  type AccountCheckRow,
  type VerifiedName,
} from "./account-check";
import { isAccountMoment } from "./account-moment";

/**
 * THE PRODUCTION WIRING OF THE ACCOUNT CHECK (V-04). Every decision is in
 * `account-check.ts` and proven there with a stub resolver; this file only
 * connects it to the processor, the rate limiter and the database.
 *
 * THE ONE SWAP. `resolve` is `resolveBankAccountName` from
 * `lib/payments/bank-resolve.ts`, the same single door every payout path uses.
 * With no processor key it answers `unconfigured`, the check stores
 * `unresolved`, and the receiver's card says nothing about ownership. Nothing
 * here needs changing when the key is present.
 *
 * FAILS CLOSED. The rate limiter fails OPEN by design for ordinary writes
 * (`rate-limit.ts`: a person should not be refused because the store blinked),
 * but an allowance that opens when the store is down is an oracle that opens
 * when the store is down. So a degraded verdict counts as refused here.
 */

/** Resolutions one conversation may spend per day. Two numbers is a deal; ten is a directory. */
export const ACCOUNT_CHECKS_PER_CONVERSATION_PER_DAY = 3;

type Untyped = {
  from(table: string): {
    upsert(row: AccountCheckRow, options: { onConflict: string }): Promise<{ error: unknown }>;
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: { agent_id: string | null; context_kind: string | null } | null }>;
      };
    };
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
};

function productionDeps(): AccountCheckDeps {
  const admin = createAdminClient() as unknown as Untyped;
  return {
    resolve: (input) => resolveBankAccountName(input),
    banks: async () => (await cachedBanks()).map((bank) => ({ code: bank.code, name: bank.name })),
    verifiedNames: async (listerUserId) => {
      const { data, error } = await admin.rpc("lister_verified_names", { p_user: listerUserId });
      if (error || !Array.isArray(data)) return [];
      return (data as { kind: string; name: string | null }[])
        .filter((row) => typeof row.name === "string" && (row.kind === "person" || row.kind === "business"))
        .map((row): VerifiedName => ({ kind: row.kind as VerifiedName["kind"], name: row.name as string }));
    },
    consume: async (conversationId) => {
      const verdict = await consume({
        bucket: "account_check",
        subject: `conversation:${conversationId}`,
        limit: ACCOUNT_CHECKS_PER_CONVERSATION_PER_DAY,
        windowSeconds: 86_400,
      });
      return verdict.allowed && !verdict.degraded;
    },
    save: async (row) => {
      await admin.from("message_account_checks").upsert(row, { onConflict: "message_id" });
    },
  };
}

/**
 * Called by `sendMessage` after the insert, through `after()`, so it never
 * delays or blocks the message. Swallows every failure: the worst outcome of
 * this function is a card that says nothing about ownership, never a message
 * that did not send.
 */
export async function checkAccountAfterSend(
  input: Omit<AccountCheckInput, "listerUserId">,
): Promise<void> {
  if (!isAccountMoment(input.body)) return;
  if (!hasServiceRole()) return;
  try {
    /* The lister side of the thread, and only on a listing thread: a stay's
       host or a restaurant has no "verified lister" to compare with. */
    const admin = createAdminClient() as unknown as Untyped;
    const { data: conversation } = await admin
      .from("conversations")
      .select("agent_id, context_kind")
      .eq("id", input.conversationId)
      .maybeSingle();
    if (!conversation || conversation.context_kind !== "listing") return;
    await runAccountCheck(productionDeps(), { ...input, listerUserId: conversation.agent_id });
  } catch {
    /* Nothing is logged: the body holds an account number (rule 16). */
  }
}
