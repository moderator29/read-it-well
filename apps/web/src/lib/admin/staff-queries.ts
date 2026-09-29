import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { requireAdmin, STAFF_SCOPES, type StaffScope } from "./guard";
import { isStaffPosition, type StaffPosition } from "./staff-positions";

/**
 * TRACK K: WHO HOLDS STAFF ACCESS, AND WHAT THEY HAVE DONE. Super admin only.
 * The grants are read through the caller's own client (the RLS policy lets
 * a super admin read every row); the names and the recent actions through the
 * service reads the console already uses.
 */
export type StaffRow = {
  userId: string;
  name: string;
  /** "admin" and "super_admin" hold every desk through their role; "staff" holds a grant. */
  kind: "super_admin" | "admin" | "staff";
  position: StaffPosition | null;
  scopes: StaffScope[];
  grantedBy: string | null;
  revokedBy: string | null;
  /** The later of their last sign-in and their last audited action. */
  lastActiveAt: string | null;
  note: string | null;
  grantedAt: string | null;
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
    const [grants, roles] = await Promise.all([
      db.from("staff_grants").select("*").order("granted_at", { ascending: false }).limit(200),
      db.from("user_roles").select("user_id, role, granted_at").in("role", ["admin", "super_admin"]),
    ]);
    if (grants.error) return { state: "unavailable" };
    const rows = (grants.data ?? []) as Record<string, unknown>[];
    /* Admins and super admins hold every desk through their role, so they are
       on the directory too: a team needs to see everybody who can act. */
    const roleRows = (roles.data ?? []) as { user_id: string; role: string; granted_at: string | null }[];
    const roleOf = new Map<string, "super_admin" | "admin">();
    const roleSince = new Map<string, string | null>();
    for (const r of roleRows) {
      if (r.role === "super_admin" || !roleOf.has(r.user_id)) roleOf.set(r.user_id, r.role as "super_admin" | "admin");
      if (!roleSince.has(r.user_id)) roleSince.set(r.user_id, r.granted_at ?? null);
    }
    const grantIds = rows.map((r) => String(r.user_id));
    const actorIds = rows.flatMap((r) => [r.granted_by, r.revoked_by]).filter((v): v is string => typeof v === "string");
    const ids = [...new Set([...grantIds, ...roleOf.keys()])];
    const nameIds = [...new Set([...ids, ...actorIds])];
    const since = new Date(now - 30 * 86_400_000).toISOString();
    const [profiles, acks, actions] = ids.length
      ? await Promise.all([
          db.from("profiles").select("id, display_name").in("id", nameIds),
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
    const lastAct = new Map<string, string>();
    for (const a of acts) {
      count.set(a.actor_id, (count.get(a.actor_id) ?? 0) + 1);
      const prev = lastAct.get(a.actor_id);
      if (!prev || prev < a.created_at) lastAct.set(a.actor_id, a.created_at);
    }
    /* Last sign-in lives in auth, which only the service role reads. The
       caller is already proved a super admin above. */
    const lastSignIn = new Map<string, string>();
    try {
      const service = createAdminClient();
      await Promise.all(
        ids.slice(0, 100).map(async (id) => {
          const { data } = await service.auth.admin.getUserById(id);
          if (data?.user?.last_sign_in_at) lastSignIn.set(id, data.user.last_sign_in_at);
        }),
      );
    } catch {
      /* The directory still renders without it. */
    }
    const lastActive = (id: string): string | null => {
      const a = lastAct.get(id) ?? null;
      const b = lastSignIn.get(id) ?? null;
      if (!a) return b;
      if (!b) return a;
      return a > b ? a : b;
    };
    const who = (id: unknown) => (typeof id === "string" ? name.get(id) || "A member" : null);
    const grantRows: StaffRow[] = rows
      .filter((r) => !roleOf.has(String(r.user_id)))
      .map((r) => ({
        userId: String(r.user_id),
        name: name.get(String(r.user_id)) || "A member",
        kind: "staff",
        position: isStaffPosition(r.position) ? r.position : null,
        scopes: ((r.scopes as string[]) ?? []).filter((s): s is StaffScope => STAFF_SCOPES.includes(s as StaffScope)),
        grantedBy: who(r.granted_by),
        revokedBy: who(r.revoked_by),
        lastActiveAt: lastActive(String(r.user_id)),
        note: (r.note as string | null) ?? null,
        grantedAt: String(r.granted_at),
        revokedAt: (r.revoked_at as string | null) ?? null,
        revokeReason: (r.revoke_reason as string | null) ?? null,
        handbookAcknowledgedAt: ackAt.get(String(r.user_id)) ?? null,
        actionsLast30: count.get(String(r.user_id)) ?? 0,
      }));
    const adminRows: StaffRow[] = [...roleOf.entries()].map(([id, role]) => ({
      userId: id,
      name: name.get(id) || "A member",
      kind: role,
      position: null,
      scopes: [...STAFF_SCOPES],
      grantedBy: null,
      revokedBy: null,
      lastActiveAt: lastActive(id),
      note: null,
      grantedAt: roleSince.get(id) ?? null,
      revokedAt: null,
      revokeReason: null,
      handbookAcknowledgedAt: ackAt.get(id) ?? null,
      actionsLast30: count.get(id) ?? 0,
    }));
    return {
      state: "ok",
      rows: [...adminRows.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "super_admin" ? -1 : 1)), ...grantRows],
      recent: acts
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 50)
        .map((a) => ({ at: a.created_at, actor: name.get(a.actor_id) || "A member", action: a.action, entity: a.entity_type })),
    };
  } catch {
    return { state: "unavailable" };
  }
}
