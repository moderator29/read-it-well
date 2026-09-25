import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, STAFF_SCOPES, type StaffScope } from "./guard";

/**
 * TRACK K: WHO HOLDS STAFF ACCESS, AND WHAT THEY HAVE DONE. Super admin only.
 * The grants are read through the caller's own client (the RLS policy lets
 * a super admin read every row); the names and the recent actions through the
 * service reads the console already uses.
 */
export type StaffRow = {
  userId: string;
  name: string;
  scopes: StaffScope[];
  note: string | null;
  grantedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  handbookAcknowledgedAt: string | null;
  actionsLast30: number;
};

export type StaffDesk =
  | { state: "ok"; rows: StaffRow[]; recent: { at: string; actor: string; action: string; entity: string }[] }
  | { state: "forbidden" }
  | { state: "unavailable" };

export async function readStaffDesk(now = Date.now()): Promise<StaffDesk> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "forbidden" };
  if (!access.isSuperAdmin) return { state: "forbidden" };
  /* staff_grants and staff_handbook_acks are newer than the generated types. */
  const db = access.supabase as unknown as SupabaseClient;
  try {
    const grants = await db.from("staff_grants").select("*").order("granted_at", { ascending: false }).limit(200);
    if (grants.error) return { state: "unavailable" };
    const rows = (grants.data ?? []) as Record<string, unknown>[];
    const ids = rows.map((r) => String(r.user_id));
    const since = new Date(now - 30 * 86_400_000).toISOString();
    const [profiles, acks, actions] = ids.length
      ? await Promise.all([
          db.from("profiles").select("id, display_name").in("id", ids),
          db.from("staff_handbook_acks").select("user_id, version, acknowledged_at").in("user_id", ids),
          db.from("audit_log").select("actor_id, action, entity_type, created_at").in("actor_id", ids).gte("created_at", since),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];
    const name = new Map(
      ((profiles.data ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name ?? ""]),
    );
    const ackAt = new Map<string, string>();
    for (const a of (acks.data ?? []) as { user_id: string; acknowledged_at: string }[]) {
      const prev = ackAt.get(a.user_id);
      if (!prev || prev < a.acknowledged_at) ackAt.set(a.user_id, a.acknowledged_at);
    }
    const acts = (actions.data ?? []) as { actor_id: string; action: string; entity_type: string; created_at: string }[];
    const count = new Map<string, number>();
    for (const a of acts) count.set(a.actor_id, (count.get(a.actor_id) ?? 0) + 1);
    return {
      state: "ok",
      rows: rows.map((r) => ({
        userId: String(r.user_id),
        name: name.get(String(r.user_id)) || "A member",
        scopes: ((r.scopes as string[]) ?? []).filter((s): s is StaffScope => STAFF_SCOPES.includes(s as StaffScope)),
        note: (r.note as string | null) ?? null,
        grantedAt: String(r.granted_at),
        revokedAt: (r.revoked_at as string | null) ?? null,
        revokeReason: (r.revoke_reason as string | null) ?? null,
        handbookAcknowledgedAt: ackAt.get(String(r.user_id)) ?? null,
        actionsLast30: count.get(String(r.user_id)) ?? 0,
      })),
      recent: acts
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 50)
        .map((a) => ({ at: a.created_at, actor: name.get(a.actor_id) || "A member", action: a.action, entity: a.entity_type })),
    };
  } catch {
    return { state: "unavailable" };
  }
}
