import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";

/**
 * The listings review desk's own reads. READ ONLY.
 *
 * Everything here goes through the admin's own RLS-bound client from
 * `requireAdmin`, never the service role: `listings_admin_all`,
 * `agents_select_admin`, `agent_applications_select_admin`,
 * `profiles_select_admin`, `agent_verification_checks_admin_all`,
 * `audit_log_admin_select` and the admin branch of `listing_amenities_select`
 * are what let these rows through, so row level security decides.
 *
 * NO TOTAL IS THE LENGTH OF A LIMITED LIST. Counts are `count: "exact",
 * head: true` reads; the review times read every audit row in their window,
 * a thousand at a time until the window is exhausted.
 *
 * The listing itself (photos, walkthrough, checklist, costs) still comes from
 * Session A's `getListingSubmissions`; these reads add what that one does not
 * return, and never restate it.
 */

type Db = SupabaseClient<Database>;
type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type Read<T> = { state: "ok"; data: T } | { state: "unavailable" };
const UNAVAILABLE = { state: "unavailable" } as const;

export const LISTING_STATUSES: readonly ListingStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "MORE_INFO_REQUIRED",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
  "SUSPENDED",
];

async function adminDb(): Promise<Db | null> {
  const access = await requireAdmin();
  return access.state === "admin" ? access.supabase : null;
}

/* ------------------------------------------------------------ status counts */

/**
 * Exact counts per listing status, real listings and example listings apart.
 *
 * Examples (`is_demo`) are counted separately and never folded into the real
 * figure, so a desk can show real supply and say how many examples it left
 * out. Sixteen head-only count reads in parallel.
 */
export type ListingStatusCounts = {
  real: Record<ListingStatus, number>;
  examples: Record<ListingStatus, number>;
};

export async function getListingStatusCounts(): Promise<Read<ListingStatusCounts>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  try {
    const reads = LISTING_STATUSES.flatMap((status) =>
      [false, true].map(async (demo) => {
        const { count, error } = await db
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", status)
          .eq("is_demo", demo);
        if (error) throw error;
        return { status, demo, count: count ?? 0 };
      }),
    );
    const rows = await Promise.all(reads);
    return { state: "ok", data: foldStatusCounts(rows) };
  } catch {
    return UNAVAILABLE;
  }
}

export function emptyStatusRecord(): Record<ListingStatus, number> {
  return Object.fromEntries(LISTING_STATUSES.map((status) => [status, 0])) as Record<
    ListingStatus,
    number
  >;
}

/** Pure: the sixteen counts folded into the two records. */
export function foldStatusCounts(
  rows: readonly { status: ListingStatus; demo: boolean; count: number }[],
): ListingStatusCounts {
  const real = emptyStatusRecord();
  const examples = emptyStatusRecord();
  for (const row of rows) {
    const target = row.demo ? examples : real;
    target[row.status] += row.count;
  }
  return { real, examples };
}

/* ------------------------------------------------------------ review times */

export type ReviewTimes = {
  decisions: number;
  medianMinutes: number | null;
  meanMinutes: number | null;
};

export type ListingReviewTimes = {
  thisWeek: ReviewTimes;
  lastWeek: ReviewTimes;
  /** The most recent review decision ever recorded, or null if none ever was. */
  lastDecisionAt: string | null;
};

const DAY = 86_400_000;
const PAGE = 1000;

/**
 * Submitted to decided, over the last two rolling weeks.
 *
 * `listings.reviewed_at` is overwritten on every decision, so it holds no
 * history. The audit log does: `reviewListing` appends one `listing.review`
 * row per decision. Each is paired with its listing's `submitted_at`; a
 * decision older than the listing's current submission (it was resubmitted
 * since) is left out rather than counted as a negative time.
 */
export async function getListingReviewTimes(now: number = Date.now()): Promise<Read<ListingReviewTimes>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  const since = new Date(now - 14 * DAY).toISOString();
  try {
    const decisions: { at: string; listingId: string }[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("audit_log")
        .select("created_at, entity_id")
        .eq("action", "listing.review")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) return UNAVAILABLE;
      for (const row of data ?? []) {
        if (row.entity_id) decisions.push({ at: row.created_at, listingId: row.entity_id });
      }
      if (!data || data.length < PAGE) break;
    }

    const ids = [...new Set(decisions.map((d) => d.listingId))];
    const submitted = new Map<string, string | null>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db
        .from("listings")
        .select("id, submitted_at")
        .in("id", ids.slice(i, i + 200));
      if (error) return UNAVAILABLE;
      for (const row of data ?? []) submitted.set(row.id, row.submitted_at);
    }

    const { data: last, error: lastError } = await db
      .from("audit_log")
      .select("created_at")
      .eq("action", "listing.review")
      .order("created_at", { ascending: false })
      .limit(1);
    if (lastError) return UNAVAILABLE;

    return {
      state: "ok",
      data: {
        ...reviewTimesFrom(
          decisions.map((d) => ({ decidedAt: d.at, submittedAt: submitted.get(d.listingId) ?? null })),
          now,
        ),
        lastDecisionAt: last?.[0]?.created_at ?? null,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** Pure: split decisions into this week and last, and summarise each. */
export function reviewTimesFrom(
  rows: readonly { decidedAt: string; submittedAt: string | null }[],
  now: number,
): Omit<ListingReviewTimes, "lastDecisionAt"> {
  const thisWeek: number[] = [];
  const lastWeek: number[] = [];
  for (const row of rows) {
    if (!row.submittedAt) continue;
    const decided = Date.parse(row.decidedAt);
    const submitted = Date.parse(row.submittedAt);
    if (Number.isNaN(decided) || Number.isNaN(submitted) || decided < submitted) continue;
    const minutes = (decided - submitted) / 60_000;
    const age = now - decided;
    if (age < 0) continue;
    if (age <= 7 * DAY) thisWeek.push(minutes);
    else if (age <= 14 * DAY) lastWeek.push(minutes);
  }
  return { thisWeek: summarise(thisWeek), lastWeek: summarise(lastWeek) };
}

function summarise(values: number[]): ReviewTimes {
  if (values.length === 0) return { decisions: 0, medianMinutes: null, meanMinutes: null };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianMinutes =
    sorted.length % 2 === 1
      ? (sorted[mid] as number)
      : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
  const meanMinutes = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { decisions: values.length, medianMinutes, meanMinutes };
}

/* ------------------------------------------------------------ the lister */

export type ListerRole = "owner" | "agent" | "firm";
export type RungKind = "identity" | "address" | "payout" | "in_person";

export type ListerVerification = {
  name: string;
  role: ListerRole | null;
  avatarUrl: string | null;
  verified: boolean;
  tier: number;
  /** The person's badge, read from `public.person_badge`; null is no badge. */
  badge: BadgeTier | null;
  rungs: { kind: RungKind; status: "passed" | "failed" | "pending" }[];
};

/**
 * Pure: the lister's role, from the application's `supply_role` where the
 * three-form registration recorded one, else from the agent's `type` (a
 * business is a firm, an individual an agent). Same rule the supply
 * workspaces use.
 */
export function roleOf(supplyRole: string | null | undefined, agentType: string | null | undefined): ListerRole | null {
  if (supplyRole === "owner" || supplyRole === "agent" || supplyRole === "firm") return supplyRole;
  if (agentType === "business") return "firm";
  if (agentType === "individual") return "agent";
  return null;
}

const RUNGS: readonly RungKind[] = ["identity", "address", "payout", "in_person"];
const RUNG_STATUS = new Set(["passed", "failed", "pending"]);

/* ------------------------------------------------------------ row extras */

export type QueueRowExtras = { isDemo: boolean; role: ListerRole | null; badge: BadgeTier | null };

/**
 * What each queue row needs beyond the view it already has: whether it is an
 * example listing, and the lister's role for the tag.
 */
export async function getQueueRowExtras(ids: readonly string[]): Promise<Read<Map<string, QueueRowExtras>>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  const out = new Map<string, QueueRowExtras>();
  if (ids.length === 0) return { state: "ok", data: out };
  try {
    const { data, error } = await db
      .from("listings")
      .select("id, is_demo, agents ( type, application_id, user_id )")
      .in("id", [...ids]);
    if (error) return UNAVAILABLE;
    const rows = (data ?? []) as unknown as {
      id: string;
      is_demo: boolean;
      agents: { type: string | null; application_id: string | null; user_id: string } | null;
    }[];
    const roles = await supplyRoles(
      db,
      rows.map((row) => row.agents?.application_id).filter((id): id is string => Boolean(id)),
    );
    const badges = await getBadgeTiers(rows.map((row) => row.agents?.user_id ?? ""));
    for (const row of rows) {
      const appId = row.agents?.application_id ?? null;
      out.set(row.id, {
        isDemo: row.is_demo,
        role: roleOf(appId ? roles.get(appId) : null, row.agents?.type),
        badge: row.agents ? (badges.get(row.agents.user_id) ?? null) : null,
      });
    }
    return { state: "ok", data: out };
  } catch {
    return UNAVAILABLE;
  }
}

async function supplyRoles(db: Db, applicationIds: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const unique = [...new Set(applicationIds)];
  if (unique.length === 0) return out;
  const { data } = await db.from("agent_applications").select("id, supply_role").in("id", unique);
  for (const row of data ?? []) out.set(row.id, row.supply_role);
  return out;
}

/* ------------------------------------------------------------ one listing */

export type ListingReviewExtras = {
  title: string;
  status: ListingStatus;
  isDemo: boolean;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  availableFrom: string | null;
  lister: ListerVerification | null;
  /** The next listing waiting under the same status narrowing, in queue order. */
  nextId: string | null;
};

const WAITING: readonly ListingStatus[] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "MORE_INFO_REQUIRED"];

/**
 * Everything the listing under review needs that the queue's view does not
 * carry, read by id.
 *
 * `nextId` walks the same bucket and order the queue uses (the waiting
 * statuses, or the one status the reviewer filtered on, newest submission
 * first), so a decision can load the listing the reviewer would have opened
 * next from the table.
 */
export async function getListingReviewExtras(
  id: string,
  statusFilter?: string,
): Promise<Read<ListingReviewExtras | null>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  try {
    const { data: row, error } = await db
      .from("listings")
      .select(
        "id, title, status, is_demo, latitude, longitude, available_from, submitted_at, agent_id, agents ( display_name, type, verified, verification_tier, application_id, user_id ), listing_amenities ( amenities ( label ) )",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return UNAVAILABLE;
    if (!row) return { state: "ok", data: null };

    const listing = row as unknown as {
      id: string;
      title: string;
      status: ListingStatus;
      is_demo: boolean;
      latitude: number | null;
      longitude: number | null;
      available_from: string | null;
      submitted_at: string | null;
      agents: {
        display_name: string;
        type: string | null;
        verified: boolean;
        verification_tier: number | null;
        application_id: string | null;
        user_id: string;
      } | null;
      listing_amenities: { amenities: { label: string } | null }[];
    };

    const agent = listing.agents;
    let lister: ListerVerification | null = null;
    if (agent) {
      const [roles, profile, checks, badges] = await Promise.all([
        supplyRoles(db, agent.application_id ? [agent.application_id] : []),
        db.from("profiles").select("avatar_url").eq("id", agent.user_id).maybeSingle(),
        db
          .from("agent_verification_checks")
          .select("kind, status, decided_at, agent_id")
          .eq("agent_id", (row as { agent_id: string }).agent_id),
        getBadgeTiers([agent.user_id]),
      ]);
      lister = {
        name: agent.display_name,
        role: roleOf(agent.application_id ? roles.get(agent.application_id) : null, agent.type),
        avatarUrl: profile.data?.avatar_url ?? null,
        verified: agent.verified,
        tier: agent.verification_tier ?? 0,
        badge: badges.get(agent.user_id) ?? null,
        rungs: latestRungs(checks.data ?? []),
      };
    }

    const bucket = WAITING.includes(statusFilter as ListingStatus)
      ? [statusFilter as ListingStatus]
      : statusFilter
        ? null
        : WAITING;
    let nextId: string | null = null;
    if (bucket && bucket.includes(listing.status) && listing.submitted_at) {
      const { data: next } = await db
        .from("listings")
        .select("id")
        .in("status", [...bucket])
        .lt("submitted_at", listing.submitted_at)
        .order("submitted_at", { ascending: false })
        .limit(1);
      nextId = next?.[0]?.id ?? null;
    }

    return {
      state: "ok",
      data: {
        title: listing.title,
        status: listing.status,
        isDemo: listing.is_demo,
        amenities: listing.listing_amenities
          .map((entry) => entry.amenities?.label ?? null)
          .filter((label): label is string => Boolean(label))
          .sort((a, b) => a.localeCompare(b)),
        latitude: listing.latitude,
        longitude: listing.longitude,
        availableFrom: listing.available_from,
        lister,
        nextId,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** Pure: the latest recorded result per rung, in ladder order. */
export function latestRungs(
  checks: readonly { kind: string; status: string; decided_at: string }[],
): ListerVerification["rungs"] {
  const latest = new Map<string, { status: string; at: string }>();
  for (const check of checks) {
    const seen = latest.get(check.kind);
    if (!seen || check.decided_at > seen.at) latest.set(check.kind, { status: check.status, at: check.decided_at });
  }
  return RUNGS.flatMap((kind) => {
    const found = latest.get(kind);
    if (!found || !RUNG_STATUS.has(found.status)) return [];
    return [{ kind, status: found.status as "passed" | "failed" | "pending" }];
  });
}

/* ------------------------------------------------------------ mandates */

export type MandateStatus = "pending" | "approved" | "rejected";

export type MandateRow = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingReference: string | null;
  kind: "letting" | "sale" | "management" | string;
  principalName: string;
  /** The number a reviewer rings to confirm the instruction. Never logged, never sent to a reader. */
  principalPhone: string | null;
  exclusive: boolean | null;
  signedOn: string | null;
  expiresOn: string | null;
  hasDocument: boolean;
  status: MandateStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type MandateQueue = {
  counts: Record<MandateStatus, number>;
  /** Every pending mandate, oldest first, read whole. */
  pending: MandateRow[];
  /** The twenty most recently decided, newest first. */
  decided: MandateRow[];
};

const MANDATE_COLUMNS =
  "id, listing_id, kind, principal_name, principal_phone, exclusive, signed_on, expires_on, document_id, review_status, rejection_reason, reviewed_at, created_at, listings ( title, reference )";

type MandateDbRow = {
  id: string;
  listing_id: string;
  kind: string;
  principal_name: string;
  principal_phone: string | null;
  exclusive: boolean | null;
  signed_on: string | null;
  expires_on: string | null;
  document_id: string | null;
  review_status: MandateStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  listings: { title: string; reference: string | null } | null;
};

/** Pure: a database row as the desk reads it. */
export function toMandateRow(row: MandateDbRow): MandateRow {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listings?.title ?? null,
    listingReference: row.listings?.reference ?? null,
    kind: row.kind,
    principalName: row.principal_name,
    principalPhone: row.principal_phone,
    exclusive: row.exclusive,
    signedOn: row.signed_on,
    expiresOn: row.expires_on,
    hasDocument: row.document_id !== null,
    status: row.review_status,
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

/** Pure: true when a mandate's own expiry date has passed (Lagos calendar day). */
export function mandateExpired(expiresOn: string | null, today: string): boolean {
  return Boolean(expiresOn && expiresOn < today);
}

/**
 * The mandate review queue (`listing_mandates`, Track G migration 5): what an
 * agent or a firm holds instead of ownership. Exact counts per review status,
 * every pending mandate, and the twenty latest decisions. Read under
 * `listing_mandates_staff_all` through the admin's own client.
 */
export async function getMandateQueue(): Promise<Read<MandateQueue>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  try {
    const head = { count: "exact" as const, head: true };
    const [pendingCount, approved, rejected] = await Promise.all(
      (["pending", "approved", "rejected"] as const).map(async (status) => {
        const { count, error } = await db.from("listing_mandates").select("id", head).eq("review_status", status);
        if (error) throw error;
        return count ?? 0;
      }),
    );
    const pending: MandateRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("listing_mandates")
        .select(MANDATE_COLUMNS)
        .eq("review_status", "pending")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) return UNAVAILABLE;
      pending.push(...((data ?? []) as unknown as MandateDbRow[]).map(toMandateRow));
      if (!data || data.length < PAGE) break;
    }
    const { data: decided, error: decidedError } = await db
      .from("listing_mandates")
      .select(MANDATE_COLUMNS)
      .neq("review_status", "pending")
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .limit(20);
    if (decidedError) return UNAVAILABLE;
    return {
      state: "ok",
      data: {
        counts: { pending: pendingCount ?? 0, approved: approved ?? 0, rejected: rejected ?? 0 },
        pending,
        decided: ((decided ?? []) as unknown as MandateDbRow[]).map(toMandateRow),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------------ badges */

export type BadgeTier = "gold" | "platinum";

/** Pure: narrow what `public.person_badge` returned onto the two tiers that draw a mark. */
export function badgeTierOf(value: unknown): BadgeTier | null {
  return value === "gold" || value === "platinum" ? value : null;
}

/**
 * Each person's badge tier, READ from `public.person_badge` (Session A's one
 * source, scope B-BADGE), never derived here. An absent row, an unknown value
 * or a failed read is no badge. The view is newer than the generated types, so
 * the client is widened for this one read.
 */
export async function getBadgeTiers(userIds: readonly string[]): Promise<Map<string, BadgeTier>> {
  const out = new Map<string, BadgeTier>();
  const wanted = [...new Set(userIds.filter(Boolean))];
  if (wanted.length === 0) return out;
  const db = await adminDb();
  if (!db) return out;
  try {
    const { data } = await (db as unknown as SupabaseClient)
      .from("person_badge")
      .select("user_id, tier")
      .in("user_id", wanted);
    for (const row of (data ?? []) as { user_id: string; tier: unknown }[]) {
      const tier = badgeTierOf(row.tier);
      if (tier) out.set(row.user_id, tier);
    }
  } catch {
    /* No badge is the safe failure. */
  }
  return out;
}
