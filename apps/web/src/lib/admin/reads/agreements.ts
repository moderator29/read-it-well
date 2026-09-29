import "server-only";
import { subjectHref, subjectKey, subjectTitles, type AgreementSubject } from "@/lib/agreements/subject";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * THE AGREEMENT REVIEW QUEUE AND THE GUARANTEE DESK, READ AS THE REVIEWER.
 *
 * Track A. An agreement both parties confirmed waits here for a person at
 * Vallo to approve or reject it before payment opens. The queue is built to be
 * worked quickly: one row per agreement carrying everything needed to decide
 * (who, which property, how much, the move-in or stay dates, the inspection
 * evidence count, whether a mandate stands behind the owner's confirmation,
 * and how long it has waited), with the decision on the row itself.
 *
 * Reads go through the reviewer's OWN client, so RLS decides who may see the
 * rows (`deal_agreements_party_read` publishes them to admins and super
 * admins; staff scopes extend it in Track K).
 */

export type QueueRow = {
  id: string;
  kind: "rent" | "stay";
  status: string;
  listingId: string;
  /** The listing's page, or the hotel's for a room stay (ROOM BOOKINGS 1). */
  subjectHref: string;
  listingTitle: string;
  renterName: string;
  ownerName: string;
  amountMinor: number;
  termsVersion: number;
  startsOn: string | null;
  endsOn: string | null;
  handoverOn: string | null;
  notes: string | null;
  mandate: boolean;
  photos: number | null;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
};

export type AgreementQueue =
  | { state: "ok"; waiting: QueueRow[]; decided: QueueRow[] }
  | { state: "unavailable" };

type AgreementRow = Database["public"]["Tables"]["deal_agreements"]["Row"];

function termString(terms: unknown, key: string): string | null {
  if (!terms || typeof terms !== "object") return null;
  const value = (terms as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function toRows(db: SupabaseClient<Database>, rows: AgreementRow[]): Promise<QueueRow[]> {
  const people = [...new Set(rows.flatMap((r) => [r.renter_id, r.owner_id]))];
  const inspections = rows.map((r) => r.inspection_id).filter((id): id is string => Boolean(id));
  const [title, profiles, photos] = await Promise.all([
    subjectTitles(db, rows as unknown as AgreementSubject[]),
    people.length ? db.from("profiles").select("id, display_name").in("id", people) : Promise.resolve({ data: [] }),
    inspections.length
      ? db.from("inspection_report_photos").select("inspection_id").in("inspection_id", inspections)
      : Promise.resolve({ data: [] }),
  ]);
  const name = new Map(
    (profiles.data ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name ?? ""]),
  );
  const photoCount = new Map<string, number>();
  for (const p of (photos.data ?? []) as { inspection_id: string }[]) {
    photoCount.set(p.inspection_id, (photoCount.get(p.inspection_id) ?? 0) + 1);
  }
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind === "stay" ? "stay" : "rent",
    status: r.status,
    listingId: r.listing_id ?? "",
    subjectHref: subjectHref(r as unknown as AgreementSubject),
    listingTitle: title.get(subjectKey(r as unknown as AgreementSubject)) || "Untitled listing",
    renterName: name.get(r.renter_id) || "A member",
    ownerName: name.get(r.owner_id) || "A lister",
    amountMinor: r.amount_minor,
    termsVersion: r.terms_version,
    startsOn: termString(r.terms, "move_in") ?? termString(r.terms, "check_in"),
    endsOn: termString(r.terms, "check_out"),
    handoverOn: termString(r.terms, "handover_on"),
    notes: termString(r.terms, "notes"),
    mandate: r.mandate_id !== null,
    photos: r.inspection_id ? (photoCount.get(r.inspection_id) ?? 0) : null,
    submittedAt: r.submitted_at,
    decidedAt: r.decided_at,
    decisionReason: r.decision_reason,
  }));
}

export async function readAgreementQueue(db: SupabaseClient<Database>): Promise<AgreementQueue> {
  try {
    const [waiting, decided] = await Promise.all([
      db.from("deal_agreements").select("*").eq("status", "in_review").order("submitted_at", { ascending: true }).limit(200),
      db
        .from("deal_agreements")
        .select("*")
        .in("status", ["approved", "rejected", "paid"])
        .order("decided_at", { ascending: false })
        .limit(40),
    ]);
    if (waiting.error || decided.error) return { state: "unavailable" };
    return {
      state: "ok",
      waiting: await toRows(db, waiting.data ?? []),
      decided: await toRows(db, decided.data ?? []),
    };
  } catch {
    return { state: "unavailable" };
  }
}

export type ClaimRow = {
  id: string;
  agreementId: string;
  status: string;
  claimantName: string;
  listingTitle: string;
  items: string[];
  description: string;
  evidenceCount: number;
  requestedMinor: number;
  approvedMinor: number | null;
  decisionReason: string | null;
  paidReference: string | null;
  createdAt: string;
};

export type GuaranteeDesk =
  | {
      state: "ok";
      balanceMinor: number;
      contributedMinor: number;
      paidOutMinor: number;
      guaranteeBps: number;
      claimWindowHours: number;
      claims: ClaimRow[];
    }
  | { state: "unavailable" };

/**
 * `caller` is the operator's own client: `admin_guarantee_reserve` decides on
 * auth.uid() through `private.staff_can`. `db` reads the rows; for a scoped
 * staff member it is the service client the door handed out (Track K).
 */
export async function readGuaranteeDesk(
  db: SupabaseClient<Database>,
  caller: SupabaseClient<Database> = db,
): Promise<GuaranteeDesk> {
  try {
    const [reserve, claims] = await Promise.all([
      caller.rpc("admin_guarantee_reserve" as never),
      db.from("guarantee_claims").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const r = (reserve.data ?? {}) as Record<string, unknown>;
    if (reserve.error || r.status !== "ok" || claims.error) return { state: "unavailable" };
    const rows = claims.data ?? [];
    const agreementIds = [...new Set(rows.map((c) => c.agreement_id))];
    const people = [...new Set(rows.map((c) => c.claimant_id))];
    const [agreements, profiles] = await Promise.all([
      agreementIds.length
        ? db.from("deal_agreements").select("id, listing_id, accommodation_id").in("id", agreementIds)
        : Promise.resolve({ data: [] }),
      people.length ? db.from("profiles").select("id, display_name").in("id", people) : Promise.resolve({ data: [] }),
    ]);
    const subjects = (agreements.data ?? []) as unknown as (AgreementSubject & { id: string })[];
    const subjectOf = new Map(subjects.map((a) => [a.id, subjectKey(a)]));
    const title = await subjectTitles(db, subjects);
    const name = new Map(
      (profiles.data ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name ?? ""]),
    );
    return {
      state: "ok",
      balanceMinor: Number(r.balance_minor ?? 0),
      contributedMinor: Number(r.contributed_minor ?? 0),
      paidOutMinor: Number(r.paid_out_minor ?? 0),
      guaranteeBps: Number(r.guarantee_bps ?? 150),
      claimWindowHours: Number(r.claim_window_hours ?? 72),
      claims: rows.map((c) => ({
        id: c.id,
        agreementId: c.agreement_id,
        status: c.status,
        claimantName: name.get(c.claimant_id) || "A member",
        listingTitle: title.get(subjectOf.get(c.agreement_id) ?? "") || "Untitled listing",
        items: c.items ?? [],
        description: c.description,
        evidenceCount: (c.evidence_paths ?? []).length,
        requestedMinor: c.requested_minor,
        approvedMinor: c.approved_minor,
        decisionReason: c.decision_reason,
        paidReference: c.paid_reference,
        createdAt: c.created_at,
      })),
    };
  } catch {
    return { state: "unavailable" };
  }
}
