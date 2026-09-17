import "server-only";

import { requireAdmin } from "./guard";
import {
  isNarrowed,
  lagosDayEnd,
  lagosDayStart,
  pageRange,
  takePage,
  type AdminQueueFilter,
} from "./queue-filter";

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

/**
 * How many people a name search may resolve to before it stops being a search.
 *
 * A cap is needed because the term goes into an `in()` on the next read and an
 * unbounded list of ids is an unbounded URL. It is deliberately far above any
 * plausible console search and the page says when it has been hit, so an
 * operator is never shown a partial answer that looks complete.
 */
const HOLDER_SEARCH_CAP = 200;

export type StandingRead =
  | { state: "unavailable" }
  | {
      state: "ready";
      grants: ManualGrant[];
      manualBadges: { code: string; name: string }[];
      /** True when a search, a badge chip or a date range is narrowing this read. */
      narrowed: boolean;
      /** True when the grants read came back full, so there is another page. */
      hasMore: boolean;
      /**
       * True when the NAME search hit its own cap before the grants were read.
       *
       * Separate from `hasMore`, and it has to be: paging forward walks through
       * more grants and will never reach a person the profile read did not
       * resolve. An operator who is not told this reads a complete-looking desk
       * that is missing rows for a reason no control on the screen can fix.
       */
      holderSearchCapped: boolean;
    };

/**
 * The standing desk, narrowed in the query.
 *
 * ---------------------------------------------------------------------------
 * IT WAS A HARD `.limit(100)` WITH NO WAY TO REACH ROW 101.
 *
 * Every manual grant ever made, newest first, cut off at a hundred and with no
 * search, no badge filter, no date range and no pager. This is the audit record
 * of the one badge a human being can hand out, which means it is the thing
 * somebody reads when they are asked "who gave this person that, and when". A
 * hundred rows is fine until the hundred and first grant, and then the record
 * silently stops containing the answer.
 *
 * THE SEARCH GOES THROUGH `profiles` FIRST, AND THAT ORDERING IS THE CARE.
 * `user_badges` holds a uuid, not a name, so the only way to search for a
 * person is to resolve the name to ids and then filter the grants by those ids.
 * Doing it the other way round, filtering grants in JavaScript after reading a
 * page of them, is the fault `/admin/bookings` was carrying: it looks identical
 * at zero rows and answers "who has top_contributor" with some of them at a
 * thousand. The profile read is capped, and the cap is stated on screen rather
 * than hidden, because a search that quietly matched the first 200 people
 * called Chidi would be the same lie one layer down.
 */
export async function getStandingDesk(filter?: AdminQueueFilter): Promise<StandingRead> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };

  const term = (filter?.q ?? "").trim();
  const narrowed = isNarrowed(filter);
  const empty = { narrowed, hasMore: false, holderSearchCapped: false } as const;

  try {
    const { data: badges, error: badgeError } = await access.supabase
      .from("badges")
      .select("code, name")
      .eq("manual_only", true)
      .order("code");
    if (badgeError) return { state: "unavailable" };

    const allCodes = (badges ?? []).map((b) => b.code);
    if (allCodes.length === 0) {
      return { state: "ready", grants: [], manualBadges: [], ...empty };
    }
    const manualBadges = (badges ?? []).map((b) => ({ code: b.code, name: b.name }));

    /* The chip is a badge code, checked against the codes this read is already
       restricted to. An unrecognised one is dropped rather than passed through,
       for the reason `pickStatus` exists: a hand-edited `?status=` that reaches
       `in()` returns an empty desk, which reads as "nobody holds this" rather
       than as "that is not a badge". */
    const badgeCode = allCodes.find((code) => code === filter?.status);
    const codes = badgeCode ? [badgeCode] : allCodes;

    /* Name to ids, before the grants are read. A term that matches nobody is a
       result and not a reason to fall back to everybody. */
    let holderIds: string[] | undefined;
    let holderSearchCapped = false;
    if (term.length > 0) {
      const { data: people, error: peopleError } = await access.supabase
        .from("profiles")
        .select("id")
        .ilike("display_name", `%${term}%`)
        .limit(HOLDER_SEARCH_CAP);
      if (peopleError) return { state: "unavailable" };
      holderIds = (people ?? []).map((p) => p.id);
      holderSearchCapped = holderIds.length >= HOLDER_SEARCH_CAP;
      if (holderIds.length === 0) {
        return { state: "ready", grants: [], manualBadges, ...empty };
      }
    }

    const { from, to } = pageRange(filter);
    let grantSelect = access.supabase
      .from("user_badges")
      .select("user_id, badge_code, granted_at, granted_by, reason, revoked_at")
      .in("badge_code", codes);
    if (holderIds) grantSelect = grantSelect.in("user_id", holderIds);
    /* Lagos calendar days against a timestamptz. See `lagosDayStart`: a bare
       date is read as UTC midnight, which is an hour late here, so a grant made
       at half past midnight Lagos time falls outside the day it was made on. */
    if (filter?.from) grantSelect = grantSelect.gte("granted_at", lagosDayStart(filter.from));
    if (filter?.to) grantSelect = grantSelect.lte("granted_at", lagosDayEnd(filter.to));

    const { data: pageRows, error } = await grantSelect
      .order("granted_at", { ascending: false })
      .range(from, to);
    if (error) return { state: "unavailable" };

    const page = takePage(pageRows ?? []);
    const rows = page.rows;

    // Names for both sides of the grant, in one keyed read.
    const ids = [
      ...new Set([
        ...rows.map((r) => r.user_id),
        ...rows.map((r) => r.granted_by).filter((v): v is string => Boolean(v)),
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
      narrowed,
      hasMore: page.full,
      holderSearchCapped,
      manualBadges,
      grants: rows.map((row) => ({
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
