import "server-only";
import { reportReadError } from "@/lib/observability/read-error";
import { reportError } from "@/lib/observability/report";

import type { SupabaseClient } from "@supabase/supabase-js";
import { intlTag, type Locale } from "@vallo/i18n/core";
import type { Database } from "@/lib/supabase/database.types";
import { isEarnedGrant, type ProfileBadge } from "../badges/badge-model";

/**
 * A PERSON'S BADGES, FOR THE ROW ON THEIR PAGE.
 *
 * A READ OF TWO EXISTING TABLES, NOT A NEW QUERY. `user_badges` and `badges`
 * are what `lib/social/profile-extras.ts` already reads for the admin-granted
 * chips; that read keeps only `manual_only` badges on purpose ("an earned
 * badge belongs in the badges surface") and there was no such surface. This is
 * the surface's read: the same two tables, under the same row-level security
 * (`user_badges_select` already hides a revoked grant from everybody but its
 * holder and an admin, and this asks `revoked_at is null` on top), carrying
 * the three columns the row needs that the chip read never selected:
 * `description`, `tier` and `granted_by`.
 *
 * It sits here and not in `lib/social/` because `lib/` is Session 2's; it
 * should move there when Session 2 next touches `profile-extras.ts`, and the
 * report says so.
 *
 * Returns null when the read fails, which is different from an empty list:
 * empty means "no badges" and draws nothing, null means "could not read" and
 * lets the caller fall back to the older chips rather than lose a badge an
 * admin granted.
 *
 * Nothing here is invented: every name, line and date is the database's, and a
 * badge with no row is not drawn.
 */
type BadgeRow = {
  badge_code: string;
  granted_at: string;
  /** Absent on the signed-out read, which may not select it. */
  granted_by?: string | null;
  badges: {
    code: string;
    name: string;
    description: string;
    object_name: string;
    tier: number;
    manual_only: boolean;
  } | null;
};

/*
 * THE SIGNED-OUT READ (auditor A2, 6 October 2026).
 *
 * Migration 20260924020430 took `granted_by` away from the anonymous role
 * (a signed-out reader learns which badge a person holds, not which staff
 * account gave it); anon keeps user_id, badge_code, granted_at and
 * revoked_at. Selecting `granted_by` as anon is therefore a permission error,
 * which this read turned into null, so a signed-out visitor to /u/[handle]
 * never saw an earned badge.
 *
 * Without `granted_by`, "earned" is derived from `manual_only` alone. That is
 * sound because the database refuses a manual badge with no granter (RM021,
 * `private.guard_manual_badge`) and awards every other badge from a recorded
 * event with `granted_by` null: a `manual_only` badge is always a hand-given
 * one, and a badge that is not manual_only is awarded by the sweep. The one
 * case it cannot tell apart is an admin hand-granting an automatic badge,
 * which no code path does today; the signed-in read keeps the exact test.
 * Session 2 request R-60 asks for a definer view that exposes
 * (user_id, badge_code, granted_at, earned) so the anonymous read can stop
 * inferring.
 */
export async function readProfileBadges(
  supabase: SupabaseClient<Database>,
  userId: string,
  locale: Locale,
  /** False for a signed-out reader, who may not select `granted_by`. */
  signedIn = true,
): Promise<ProfileBadge[] | null> {
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select(
        `badge_code, granted_at, ${signedIn ? "granted_by, " : ""}badges ( code, name, description, object_name, tier, manual_only )`,
      )
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false })
      .limit(24);
    await reportReadError("read.badges.readProfileBadges", error);
    if (error || !data) return null;

    const date = new Intl.DateTimeFormat(intlTag[locale], { dateStyle: "long", timeZone: "Africa/Lagos" });
    return (data as unknown as BadgeRow[])
      .filter((row): row is BadgeRow & { badges: NonNullable<BadgeRow["badges"]> } => Boolean(row.badges))
      .map((row) => ({
        code: row.badges.code,
        name: row.badges.name,
        description: row.badges.description,
        objectName: row.badges.object_name,
        tier: row.badges.tier,
        grantedAt: row.granted_at,
        grantedLabel: date.format(new Date(row.granted_at)),
        earned: isEarnedGrant({
          /* Signed out: no granter column, so a non-manual badge counts as earned (see above). */
          grantedBy: signedIn ? (row.granted_by ?? null) : null,
          manualOnly: row.badges.manual_only,
        }),
      }));
  } catch (error) {
    await reportError({ error, context: { kind: "read.profile_badges" } });
    return null;
  }
}
