import "server-only";

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
  granted_by: string | null;
  badges: {
    code: string;
    name: string;
    description: string;
    object_name: string;
    tier: number;
    manual_only: boolean;
  } | null;
};

export async function readProfileBadges(
  supabase: SupabaseClient<Database>,
  userId: string,
  locale: Locale,
): Promise<ProfileBadge[] | null> {
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select("badge_code, granted_at, granted_by, badges ( code, name, description, object_name, tier, manual_only )")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false })
      .limit(24);
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
        earned: isEarnedGrant({ grantedBy: row.granted_by, manualOnly: row.badges.manual_only }),
      }));
  } catch {
    return null;
  }
}
