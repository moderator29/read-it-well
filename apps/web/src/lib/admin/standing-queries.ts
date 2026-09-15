import "server-only";

import { requireAdmin } from "./guard";

/**
 * Read side of the standing desk.
 *
 * One badge on this platform is granted by a person rather than earned by a
 * trigger: top_contributor, which carries manual_only. The database refuses a
 * manual badge whose granted_by is null (RM021), so a grant always names the
 * admin who made it at the moment it is written.
 *
 * This read filters to manual badges, so every row in it was granted by hand,
 * full stop. It used to treat a null granted_by as "earned"; it now treats it
 * as "the signer has left", which is the only thing it can mean here. See
 * `grantedBySignerGone` below for why that changed.
 *
 * Everything reads through the admin's own RLS-bound client, so the console's
 * power is the power their policies give them and nothing more.
 */

export type ManualGrant = {
  userId: string;
  /** Who holds it, as a person rather than a uuid. */
  holder: string;
  badgeCode: string;
  badgeName: string;
  grantedAt: string;
  /** The admin who signed for it, or null when nobody's name is on the row. */
  grantedByName: string | null;
  /**
   * True when the signer's account has since been closed.
   *
   * This list only ever contains manual badges, and the database refuses to
   * insert one without a granter (RM021), so every row here was signed by
   * somebody at the moment it was written. A null `granted_by` therefore means
   * that person has left, not that the badge was earned. The two used to be
   * indistinguishable and the screen read the second one, which was safe only
   * while no admin had ever closed their account.
   *
   * Since 20260805154210 an admin can close their account, which is a right
   * under the NDPA rather than a feature, and the foreign key releases these
   * rows on the way out. So the distinction is now real and is drawn here.
   */
  grantedBySignerGone: boolean;
  reason: string | null;
  revoked: boolean;
};

export type StandingRead =
  | { state: "unavailable" }
  | { state: "ready"; grants: ManualGrant[]; manualBadges: { code: string; name: string }[] };

export async function getStandingDesk(): Promise<StandingRead> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };

  try {
    const { data: badges, error: badgeError } = await access.supabase
      .from("badges")
      .select("code, name")
      .eq("manual_only", true)
      .order("code");
    if (badgeError) return { state: "unavailable" };

    const codes = (badges ?? []).map((b) => b.code);
    if (codes.length === 0) return { state: "ready", grants: [], manualBadges: [] };

    const { data: rows, error } = await access.supabase
      .from("user_badges")
      .select("user_id, badge_code, granted_at, granted_by, reason, revoked_at")
      .in("badge_code", codes)
      .order("granted_at", { ascending: false })
      .limit(100);
    if (error) return { state: "unavailable" };

    // Names for both sides of the grant, in one keyed read.
    const ids = [
      ...new Set([
        ...(rows ?? []).map((r) => r.user_id),
        ...(rows ?? []).map((r) => r.granted_by).filter((v): v is string => Boolean(v)),
      ]),
    ];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await access.supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      for (const p of profiles ?? []) {
        if (p.display_name) names.set(p.id, p.display_name);
      }
    }

    const badgeName = new Map((badges ?? []).map((b) => [b.code, b.name]));

    return {
      state: "ready",
      manualBadges: (badges ?? []).map((b) => ({ code: b.code, name: b.name })),
      grants: (rows ?? []).map((row) => ({
        userId: row.user_id,
        holder: names.get(row.user_id) ?? "A Vallo member",
        badgeCode: row.badge_code,
        badgeName: badgeName.get(row.badge_code) ?? row.badge_code,
        grantedAt: row.granted_at,
        grantedByName: row.granted_by ? (names.get(row.granted_by) ?? "An administrator") : null,
        grantedBySignerGone: row.granted_by === null,
        reason: row.reason,
        revoked: row.revoked_at !== null,
      })),
    };
  } catch {
    return { state: "unavailable" };
  }
}
