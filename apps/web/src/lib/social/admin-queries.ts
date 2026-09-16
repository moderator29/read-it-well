import "server-only";

/**
 * What the console needs to work Around.
 *
 * Read through the admin's own RLS-bound client, so an operator who somehow
 * reached this module without the role gets nothing rather than everything.
 * The guard in the page is the front door; this is the lock behind it.
 */

import { requireAdmin } from "../admin/guard";
import { Constants } from "../supabase/database.types";
import {
  lagosDayEnd,
  lagosDayStart,
  pickStatus,
  type AdminQueueFilter,
} from "../admin/queue-filter";
import type { AreaStatus } from "./areas-schema";

export type ProposedAreaView = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  city: string;
  stateCode: string;
  blurb: string | null;
  createdAt: string;
  proposedBy: string | null;
  proposerHandle: string | null;
};

export type ModeratorApplicationView = {
  id: string;
  areaId: string;
  areaName: string;
  areaSlug: string;
  userId: string;
  handle: string | null;
  displayLabel: string | null;
  reason: string;
  createdAt: string;
};

export type OpenAreaView = {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: AreaStatus;
  memberCount: number;
  moderatorCount: number;
};

export type SocialQueue = {
  proposed: ProposedAreaView[];
  applications: ModeratorApplicationView[];
  open: OpenAreaView[];
};

const EMPTY: SocialQueue = { proposed: [], applications: [], open: [] };

/**
 * The Around desk, narrowed by the console's shared queue frame.
 *
 * ---------------------------------------------------------------------------
 * THREE BUCKETS, TWO TABLES, AND NO PAGER.
 *
 * "Places waiting", "people who asked to look after one" and "places that are
 * open" are three questions, ordered by two different columns - `created_at`
 * oldest first for the two queues, `member_count` highest first for the list -
 * and one cursor cannot walk that. So this queue gets the search, the status
 * chips and the date range, which is what an operator asked for, and does not
 * get a Next that would have to mean something different depending on which
 * panel the reader's eye was on. Same call as the applications and listings
 * queues, for the same reason.
 *
 * THE STATUS CHIPS ARE `area_status` AND EACH BUCKET TAKES THE INTERSECTION.
 * Every bucket here is already pinned to particular statuses by definition, so
 * a chosen status narrows within that rather than across it: picking PAUSED
 * empties the two queues and leaves the paused places, which reads correctly.
 * ARCHIVED and REJECTED belong to no bucket today and return nothing, which is
 * the same honest outcome DRAFT has on the applications queue: the chip list is
 * built from the enum so it cannot go stale, and an operator who picks one
 * learns something true.
 *
 * THE MODERATOR APPLICATIONS ARE SEARCHED THROUGH THEIR AREA. The term is a
 * place name, and the application row carries only an `area_id`, so the ids are
 * resolved first and the applications filtered by them - the same two-query
 * shape `getBookingBoard` and the escrow desk use, rather than a filter on an
 * embedded resource that nobody here can run against a database to confirm.
 */
export async function getSocialQueue(filter?: AdminQueueFilter): Promise<SocialQueue> {
  const access = await requireAdmin();
  if (access.state !== "admin") return EMPTY;
  const db = access.supabase;

  /* Stripped of the characters PostgREST's `or` grammar reads as structure: a
     comma splits one condition into two and a bracket opens a group, so a place
     name containing either would produce a filter the database rejects. */
  const term = (filter?.q ?? "").replace(/[,()*"\\]/g, "").trim();
  const status = pickStatus(Constants.public.Enums.area_status, filter?.status);
  const inBucket = <T extends AreaStatus>(bucket: readonly T[]): T[] =>
    status ? bucket.filter((value) => value === status) : [...bucket];

  /* Which areas the search term matches, resolved once and reused by all three
     buckets. `null` means no search, which is different from "no match": the
     empty array below short-circuits rather than sending `in ()` to Postgres. */
  let areaMatches: string[] | null = null;
  if (term.length > 0) {
    const { data: matched } = await db
      .from("areas")
      .select("id")
      .or(`name.ilike.%${term}%,city.ilike.%${term}%`)
      .limit(200);
    areaMatches = (matched ?? []).map((row) => row.id);
    if (areaMatches.length === 0) return EMPTY;
  }

  /*
   * The date range, and the matched-area predicate, attached only when they
   * exist. `.in("id", [])` is not how you say "no filter" - it is how you say
   * "nothing", and PostgREST would honour it exactly - so a query with no
   * search never sees the id predicate at all.
   *
   * `column` is the id column to match against, which differs by table: the two
   * `areas` reads filter their own `id`, the applications read filters
   * `area_id`.
   */
  const narrow = <
    T extends {
      gte: (c: string, v: string) => T;
      lte: (c: string, v: string) => T;
      in: (c: string, v: string[]) => T;
    },
  >(
    builder: T,
    column: string,
  ): T => {
    let next = builder;
    if (areaMatches) next = next.in(column, areaMatches);
    if (filter?.from) next = next.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) next = next.lte("created_at", lagosDayEnd(filter.to));
    return next;
  };

  const proposedStatuses = ["PROPOSED"] as const;
  const openStatuses = ["ACTIVE", "PAUSED"] as const;

  const [proposedRes, applicationsRes, openRes] = await Promise.all([
    narrow(
      db
        .from("areas")
        .select("id, slug, name, kind, city, state_code, blurb, created_at, created_by")
        .in("status", inBucket(proposedStatuses)),
      "id",
    )
      // Oldest first. A queue sorted newest first is a queue where the oldest
      // item rots quietly, which is exactly the failure R-93 names.
      .order("created_at", { ascending: true })
      .limit(100),
    narrow(
      db
        .from("area_moderator_applications")
        .select("id, area_id, user_id, reason, created_at, areas(name, slug)")
        .eq("status", "PENDING"),
      "area_id",
    )
      .order("created_at", { ascending: true })
      .limit(100),
    narrow(
      db
        .from("areas")
        .select("id, slug, name, city, status, member_count")
        .in("status", inBucket(openStatuses)),
      "id",
    )
      .order("member_count", { ascending: false })
      .limit(100),
  ]);

  // One lookup for every handle the two queues need, rather than a query per row.
  const userIds = [
    ...new Set(
      [
        ...(proposedRes.data ?? []).map((row) => row.created_by),
        ...(applicationsRes.data ?? []).map((row) => row.user_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const handles = new Map<string, { handle: string; label: string | null }>();
  if (userIds.length > 0) {
    const { data } = await db
      .from("social_profiles")
      .select("user_id, handle, display_label")
      .in("user_id", userIds);
    for (const row of data ?? []) {
      handles.set(row.user_id, { handle: row.handle, label: row.display_label });
    }
  }

  const openAreaIds = (openRes.data ?? []).map((row) => row.id);
  const moderatorCounts = new Map<string, number>();
  if (openAreaIds.length > 0) {
    const { data } = await db
      .from("area_members")
      .select("area_id")
      .eq("role", "MODERATOR")
      .in("area_id", openAreaIds);
    for (const row of data ?? []) {
      moderatorCounts.set(row.area_id, (moderatorCounts.get(row.area_id) ?? 0) + 1);
    }
  }

  return {
    proposed: (proposedRes.data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      city: row.city,
      stateCode: row.state_code,
      blurb: row.blurb,
      createdAt: row.created_at,
      proposedBy: row.created_by,
      proposerHandle: row.created_by ? (handles.get(row.created_by)?.handle ?? null) : null,
    })),
    applications: (applicationsRes.data ?? []).map((row) => {
      const area = row.areas as unknown as { name: string; slug: string } | null;
      return {
        id: row.id,
        areaId: row.area_id,
        areaName: area?.name ?? "a place",
        areaSlug: area?.slug ?? "",
        userId: row.user_id,
        handle: handles.get(row.user_id)?.handle ?? null,
        displayLabel: handles.get(row.user_id)?.label ?? null,
        reason: row.reason,
        createdAt: row.created_at,
      };
    }),
    open: (openRes.data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.city,
      status: row.status as AreaStatus,
      memberCount: row.member_count,
      moderatorCount: moderatorCounts.get(row.id) ?? 0,
    })),
  };
}
