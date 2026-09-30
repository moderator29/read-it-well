import "server-only";

import { createAdminClient } from "../supabase/admin";
import { requireAdmin } from "./guard";
import type { RosterKey } from "./key-roster-rules";

/**
 * Each console person's platform keys (C14): label, added, last proved. Read
 * with the service role after the super admin check, because the keys live
 * in `money_credentials`, which a member reads only for themselves. Only the
 * label and dates leave this function: never a credential id or a public key.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export async function readKeyRoster(userIds: readonly string[]): Promise<Map<string, RosterKey[]> | null> {
  const access = await requireAdmin();
  if (access.state !== "admin" || !access.isSuperAdmin) return null;
  if (userIds.length === 0) return new Map();
  try {
    const db = createAdminClient() as Loose;
    const { data, error } = await db
      .from("money_credentials")
      .select("user_id, label, created_at, last_used_at")
      .in("user_id", [...userIds])
      .order("created_at", { ascending: true });
    if (error) return null;
    const out = new Map<string, RosterKey[]>();
    for (const row of (data ?? []) as { user_id: string; label: string | null; created_at: string; last_used_at: string | null }[]) {
      const list = out.get(row.user_id) ?? [];
      list.push({ label: row.label, createdAt: row.created_at, lastUsedAt: row.last_used_at });
      out.set(row.user_id, list);
    }
    return out;
  } catch {
    return null;
  }
}
