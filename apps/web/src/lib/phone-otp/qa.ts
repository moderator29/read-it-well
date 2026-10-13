import "server-only";

import { QA_ACCOUNT_IDS } from "../admin/reads/shapes";
import { hasServiceRole } from "../security/service-rpc";
import { createAdminClient } from "../supabase/admin";

/**
 * TESTERS ARE NEVER ASKED FOR A PHONE (founder's ruling, 13 October 2026).
 *
 * The two QA accounts sign in by email and must never be stopped at a phone
 * gate, in the app or in the database. This is the app's half, read on the
 * SERVER from the signed-in session's user id (never from anything the
 * client sends): `public.qa_accounts`, the table `private.is_qa_account`
 * reads, through the service role because a member cannot read that table.
 *
 * The console's own list of the two ids (`QA_ACCOUNT_IDS`) is the floor: a
 * read that fails, or a deployment with no service key, still never blocks
 * them. It can only ever say yes for those two ids, so it widens nothing.
 */
export async function isQaTester(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  if ((QA_ACCOUNT_IDS as readonly string[]).includes(userId)) return true;
  if (!hasServiceRole()) return false;
  try {
    const { data, error } = await (createAdminClient() as unknown as {
      from(t: string): {
        select(c: string): {
          eq(c: string, v: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
        };
      };
    })
      .from("qa_accounts")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return !error && Boolean(data);
  } catch {
    return false;
  }
}
