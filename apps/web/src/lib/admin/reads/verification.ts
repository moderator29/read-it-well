import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";

/**
 * The verification desk's own reads. READ ONLY, through the admin's RLS-bound
 * client (`agent_documents_admin`, `agent_verification_checks_admin_all`,
 * `agent_applications_select_admin`, `profiles_select_admin`); never the
 * service role.
 *
 * `getKycQueue` stays the source of the queue itself (grouped by
 * person, with the documents, the ladder and the viewer's media shape). These
 * reads add what it cannot give honestly: exact totals (its `pendingCount` is
 * counted over a 300-document cap), decisions per day, decision times, the
 * results per rung, the latest decisions, and each person's supply role.
 */

type Db = SupabaseClient<Database>;
export type Read<T> = { state: "ok"; data: T } | { state: "unavailable" };
const UNAVAILABLE = { state: "unavailable" } as const;
const DAY = 86_400_000;
const LAGOS = 60 * 60_000;
const PAGE = 1000;

export type RungKind = "identity" | "address" | "payout" | "in_person";
export const RUNG_KINDS: readonly RungKind[] = ["identity", "address", "payout", "in_person"];

export type VerificationSummary = {
  awaiting: number;
  /** Documents waiting at the same moment one week ago (uploaded before, not decided by then). */
  awaitingLastWeek: number;
  passedToday: number;
  failedToday: number;
  passedYesterday: number;
  failedYesterday: number;
  medianDecisionMinutes: { thisWeek: number | null; lastWeek: number | null };
  decisionsThisWeek: number;
  documents: Record<"pending" | "approved" | "rejected", number>;
  rungs: Record<RungKind, { passed: number; failed: number; pending: number }>;
  recent: {
    documentId: string;
    name: string | null;
    kind: string;
    subtype: string | null;
    approved: boolean;
    decidedAt: string;
  }[];
};

async function adminDb(): Promise<Db | null> {
  const access = await requireAdmin();
  return access.state === "admin" ? access.supabase : null;
}

type CountQuery = PromiseLike<{ count: number | null; error: unknown }>;
async function count(query: CountQuery): Promise<number> {
  const { count: n, error } = await query;
  if (error) throw error;
  return n ?? 0;
}

/** Pure: the start of the Lagos calendar day `offset` days from today, as ISO. */
export function lagosDay(now: number, offset = 0): string {
  const start = Math.floor((now + LAGOS) / DAY) * DAY - LAGOS + offset * DAY;
  return new Date(start).toISOString();
}

export async function getVerificationSummary(now: number = Date.now()): Promise<Read<VerificationSummary>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  const today = lagosDay(now);
  const yesterday = lagosDay(now, -1);
  const weekAgo = new Date(now - 7 * DAY).toISOString();
  const fortnightAgo = new Date(now - 14 * DAY).toISOString();
  const head = { count: "exact" as const, head: true };
  const docs = () => db.from("agent_documents").select("id", head);

  try {
    const [
      pending,
      approved,
      rejected,
      passedToday,
      failedToday,
      passedYesterday,
      failedYesterday,
      awaitingLastWeek,
      ...rungCounts
    ] = await Promise.all([
      count(docs().eq("review_status", "pending")),
      count(docs().eq("review_status", "approved")),
      count(docs().eq("review_status", "rejected")),
      count(docs().eq("review_status", "approved").gte("reviewed_at", today)),
      count(docs().eq("review_status", "rejected").gte("reviewed_at", today)),
      count(docs().eq("review_status", "approved").gte("reviewed_at", yesterday).lt("reviewed_at", today)),
      count(docs().eq("review_status", "rejected").gte("reviewed_at", yesterday).lt("reviewed_at", today)),
      /* Waiting a week ago: uploaded before then, and either still pending or
         decided since. A document decided before then was not waiting. */
      count(
        docs()
          .lt("uploaded_at", weekAgo)
          .or(`review_status.eq.pending,reviewed_at.gte.${weekAgo}`),
      ),
      ...RUNG_KINDS.flatMap((kind) =>
        (["passed", "failed", "pending"] as const).map((status) =>
          count(
            db
              .from("agent_verification_checks")
              .select("id", head)
              .eq("kind", kind)
              .eq("status", status),
          ),
        ),
      ),
    ]);

    const decided: { uploadedAt: string; reviewedAt: string }[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("agent_documents")
        .select("uploaded_at, reviewed_at")
        .in("review_status", ["approved", "rejected"])
        .gte("reviewed_at", fortnightAgo)
        .order("reviewed_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) return UNAVAILABLE;
      for (const row of data ?? []) {
        if (row.reviewed_at) decided.push({ uploadedAt: row.uploaded_at, reviewedAt: row.reviewed_at });
      }
      if (!data || data.length < PAGE) break;
    }

    const { data: latest, error: latestError } = await db
      .from("agent_documents")
      .select("id, kind, subtype, review_status, reviewed_at, uploader_id, application_id")
      .in("review_status", ["approved", "rejected"])
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(10);
    if (latestError) return UNAVAILABLE;
    const names = await namesFor(db, latest ?? []);

    const rungs = Object.fromEntries(
      RUNG_KINDS.map((kind, k) => [
        kind,
        {
          passed: rungCounts[k * 3] ?? 0,
          failed: rungCounts[k * 3 + 1] ?? 0,
          pending: rungCounts[k * 3 + 2] ?? 0,
        },
      ]),
    ) as VerificationSummary["rungs"];
    const times = decisionTimes(decided, now);

    return {
      state: "ok",
      data: {
        awaiting: pending,
        awaitingLastWeek,
        passedToday,
        failedToday,
        passedYesterday,
        failedYesterday,
        medianDecisionMinutes: { thisWeek: times.thisWeek, lastWeek: times.lastWeek },
        decisionsThisWeek: times.count,
        documents: { pending, approved, rejected },
        rungs,
        recent: (latest ?? []).map((doc) => ({
          documentId: doc.id,
          name: names.get(doc.id) ?? null,
          kind: doc.kind,
          subtype: doc.subtype,
          approved: doc.review_status === "approved",
          decidedAt: doc.reviewed_at as string,
        })),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** Pure: median minutes from upload to decision, this week and last. */
export function decisionTimes(
  rows: readonly { uploadedAt: string; reviewedAt: string }[],
  now: number,
): { thisWeek: number | null; lastWeek: number | null; count: number } {
  const thisWeek: number[] = [];
  const lastWeek: number[] = [];
  for (const row of rows) {
    const up = Date.parse(row.uploadedAt);
    const at = Date.parse(row.reviewedAt);
    if (Number.isNaN(up) || Number.isNaN(at) || at < up) continue;
    const age = now - at;
    if (age < 0) continue;
    const minutes = (at - up) / 60_000;
    if (age <= 7 * DAY) thisWeek.push(minutes);
    else if (age <= 14 * DAY) lastWeek.push(minutes);
  }
  const med = (values: number[]) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
      ? (sorted[mid] as number)
      : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
  };
  return { thisWeek: med(thisWeek), lastWeek: med(lastWeek), count: thisWeek.length };
}

/** Who each document is about: the uploader, or the applicant it was filed under. */
async function namesFor(
  db: Db,
  docs: readonly { id: string; uploader_id: string | null; application_id: string | null }[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const appIds = [...new Set(docs.map((d) => d.application_id).filter((id): id is string => Boolean(id)))];
  const owners = new Map<string, string>();
  if (appIds.length > 0) {
    const { data } = await db.from("agent_applications").select("id, user_id").in("id", appIds);
    for (const row of data ?? []) owners.set(row.id, row.user_id);
  }
  const userOf = (d: (typeof docs)[number]) =>
    d.uploader_id ?? (d.application_id ? (owners.get(d.application_id) ?? null) : null);
  const userIds = [...new Set(docs.map(userOf).filter((id): id is string => Boolean(id)))];
  if (userIds.length === 0) return out;
  const { data: people } = await db.from("profiles").select("id, display_name").in("id", userIds);
  const byUser = new Map((people ?? []).map((p) => [p.id, p.display_name]));
  for (const doc of docs) {
    const user = userOf(doc);
    const name = user ? byUser.get(user) : null;
    if (name) out.set(doc.id, name);
  }
  return out;
}

/* ------------------------------------------------------------ roles */

export type SupplyRole = "owner" | "agent" | "firm";

/**
 * Each person's supply role, from the latest application that recorded one
 * (`agent_applications.supply_role`), falling back to the application's type.
 */
export async function getSupplyRoles(userIds: readonly string[]): Promise<Read<Map<string, SupplyRole>>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  const out = new Map<string, SupplyRole>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return { state: "ok", data: out };
  try {
    const { data, error } = await db
      .from("agent_applications")
      .select("user_id, supply_role, type, created_at")
      .in("user_id", unique)
      .order("created_at", { ascending: false });
    if (error) return UNAVAILABLE;
    for (const row of data ?? []) {
      if (out.has(row.user_id)) continue;
      const role = supplyRoleOf(row.supply_role, row.type);
      if (role) out.set(row.user_id, role);
    }
    return { state: "ok", data: out };
  } catch {
    return UNAVAILABLE;
  }
}

/** Pure: the same rule the listings desk uses for its role tag. */
export function supplyRoleOf(supplyRole: string | null, type: string | null): SupplyRole | null {
  if (supplyRole === "owner" || supplyRole === "agent" || supplyRole === "firm") return supplyRole;
  if (type === "business") return "firm";
  if (type === "individual") return "agent";
  return null;
}
