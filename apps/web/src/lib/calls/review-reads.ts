import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { reportReadError } from "../observability/read-error";
import { staffReviewFromRow } from "./reviews";
import type { StaffReview } from "./types";

/**
 * The staff desk's reads, under the staff member's OWN session, so row level
 * security decides what they see: `call_reviews` and `call_review_entries`
 * only for case kinds in their scope (admins hold every scope), `audit_log`
 * only for admins (a scoped reviewer gets an empty record list rather than
 * an error), the subject's name only where `profiles` lets them read it.
 *
 * The VC1 tables are not in the generated types until they are regenerated,
 * so they are reached by name through one untyped door, and every read fails
 * soft to "nothing", never to a thrown page.
 */

export type ReviewEntryKind = "NOTE" | "EVIDENCE" | "CORRECTION" | "ATTENDANCE" | "OUTCOME";
export type ReviewEntry = {
  id: string;
  kind: ReviewEntryKind;
  body: string;
  evidenceRef: string | null;
  correctsId: string | null;
  createdAt: string;
  /** "You", or null for the system (attendance) and other staff. */
  byMe: boolean;
};
export type ReviewAuditRow = { id: string; action: string; at: string; reason: string | null };

type Q = {
  select(cols: string): Q;
  eq(col: string, v: string): Q;
  in(col: string, v: string[]): Q;
  order(col: string, opts: { ascending: boolean }): Q;
  limit(n: number): Q;
  maybeSingle(): PromiseLike<{ data: Record<string, unknown> | null; error: unknown }>;
  then: PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }>["then"];
};
const from = (supabase: SupabaseClient<Database>, table: string): Q =>
  (supabase as unknown as { from(t: string): Q }).from(table);

const REVIEW_COLS =
  "id, case_kind, case_id, subject_id, requested_by, required_scope, purpose, kind, status, scheduled_for, proposed_for, respond_by, outcome, outcome_at, follow_up_due_at, created_at";

export async function listStaffReviews(supabase: SupabaseClient<Database>): Promise<StaffReview[] | null> {
  try {
    const { data, error } = await from(supabase, "call_reviews").select(REVIEW_COLS).order("created_at", { ascending: false }).limit(100);
    if (error) {
      await reportReadError("read.calls.listStaffReviews", error);
      return null;
    }
    return (data ?? []).map(staffReviewFromRow).filter((r): r is StaffReview => r !== null);
  } catch {
    return null;
  }
}

export async function readStaffReview(
  supabase: SupabaseClient<Database>,
  reviewId: string,
  meId: string,
): Promise<{
  review: StaffReview;
  entries: ReviewEntry[];
  audit: ReviewAuditRow[];
  subjectName: string | null;
  liveCallId: string | null;
} | null> {
  try {
    const { data } = await from(supabase, "call_reviews").select(REVIEW_COLS).eq("id", reviewId).maybeSingle();
    const review = staffReviewFromRow(data);
    if (!review) return null;
    const [entries, audit, subject, live] = await Promise.all([
      from(supabase, "call_review_entries")
        .select("id, kind, body, evidence_ref, corrects_id, created_at, author_id")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true })
        .limit(500),
      from(supabase, "audit_log")
        .select("id, action, created_at, metadata")
        .eq("entity_type", "call_review")
        .eq("entity_id", reviewId)
        .order("created_at", { ascending: true })
        .limit(200),
      review.subjectId
        ? from(supabase, "profiles").select("display_name").eq("id", review.subjectId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      from(supabase, "calls")
        .select("id, state")
        .eq("review_id", reviewId)
        .in("state", ["RINGING", "ACCEPTED", "CONNECTING", "ACTIVE", "INTERRUPTED"])
        .limit(1),
    ]);
    const str = (v: unknown) => (typeof v === "string" ? v : null);
    return {
      review,
      entries: (entries.data ?? []).map((r) => ({
        id: String(r.id),
        kind: String(r.kind) as ReviewEntryKind,
        body: String(r.body ?? ""),
        evidenceRef: str(r.evidence_ref),
        correctsId: str(r.corrects_id),
        createdAt: String(r.created_at ?? ""),
        byMe: r.author_id === meId,
      })),
      audit: (audit.data ?? []).map((r) => {
        const meta = (r.metadata ?? {}) as Record<string, unknown>;
        return {
          id: String(r.id),
          action: String(r.action ?? ""),
          at: String(r.created_at ?? ""),
          reason: str(meta.reason) ?? str(meta.purpose) ?? str(meta.outcome) ?? null,
        };
      }),
      subjectName: str((subject.data as Record<string, unknown> | null)?.display_name),
      liveCallId: str((live.data ?? [])[0]?.id),
    };
  } catch {
    return null;
  }
}

/** Where the case lives on the console, for the "Open the case" link. */
export function caseHref(kind: StaffReview["caseKind"], caseId: string): string {
  switch (kind) {
    case "listing":
      return `/admin/listings/${caseId}`;
    case "support_ticket":
      return `/admin/support?ticket=${caseId}`;
    case "business_verification":
      return "/admin/businesses";
    case "agent_application":
      return "/admin/agents";
    case "identity_verification":
      return "/admin/kyc";
  }
}
