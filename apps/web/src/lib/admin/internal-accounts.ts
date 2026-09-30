import "server-only";

import { createAdminClient } from "../supabase/admin";
import { isSupabaseConfigured } from "../supabase/env";
import { QA_ACCOUNT_IDS } from "./reads/shapes";
import { internalNotIn, mergeInternalIds } from "./internal-ids";

/**
 * WHO IS LEFT OUT OF EVERY FIGURE (C10).
 *
 * One list, read in one place: the QA accounts the founder named
 * (`QA_ACCOUNT_IDS`), everybody with a staff grant that is not revoked, and
 * everybody on `public.internal_accounts` (the super admin's "Leave out of
 * figures" switch on the staff page, migration
 * 20260930084516_c10_internal_accounts.sql). Until that table exists the read
 * of it fails quietly and the first two still apply.
 *
 * Read with the service role because a plain admin cannot read other
 * people's staff grants under RLS, and a partial list here would put staff
 * back into the numbers. Only ids leave this function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export async function readInternalIds(): Promise<string[]> {
  const extra: string[] = [];
  if (isSupabaseConfigured() && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0) {
    try {
      const db = createAdminClient() as Loose;
      const [grants, marked] = await Promise.all([
        db.from("staff_grants").select("user_id").is("revoked_at", null),
        db.from("internal_accounts").select("user_id"),
      ]);
      for (const row of (grants?.data ?? []) as { user_id: string }[]) extra.push(row.user_id);
      for (const row of (marked?.data ?? []) as { user_id: string }[]) extra.push(row.user_id);
    } catch {
      /* The QA list still applies. */
    }
  }
  return mergeInternalIds(QA_ACCOUNT_IDS, extra);
}

/** The PostgREST `.not(column, "in", ...)` value for every statistic. */
export async function readInternalNotIn(): Promise<string> {
  return internalNotIn(await readInternalIds());
}

/** Is this one person internal? For the view counter. */
export async function isInternalAccount(userId: string): Promise<boolean> {
  return (await readInternalIds()).includes(userId);
}

/** Whether `internal_accounts` is installed, for the staff page's switch. */
export async function internalFlagsInstalled(): Promise<{ installed: boolean; people: { id: string; name: string; reason: string }[] }> {
  try {
    const db = createAdminClient() as Loose;
    const { data, error } = await db.from("internal_accounts").select("user_id, reason").order("marked_at", { ascending: true });
    if (error) return { installed: false, people: [] };
    const rows = (data ?? []) as { user_id: string; reason: string }[];
    const names = new Map<string, string>();
    if (rows.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", rows.map((r) => r.user_id));
      for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) names.set(p.id, p.display_name ?? "");
    }
    return {
      installed: true,
      people: rows.map((r) => ({ id: r.user_id, name: names.get(r.user_id) || "Unnamed account", reason: r.reason })),
    };
  } catch {
    return { installed: false, people: [] };
  }
}
