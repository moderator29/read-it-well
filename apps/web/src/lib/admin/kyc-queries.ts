import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { requireAdmin } from "./guard";
import type { AdminRead } from "./money-queries";

/**
 * The verification review queue.
 *
 * A reviewer could see that an agent had uploaded documents and had nowhere to
 * record a decision about any individual one. Approving somebody meant
 * approving their whole application on the strength of a thumbnail. This is the
 * read half of fixing that: every document waiting, with a signed URL that
 * actually opens it, and the ladder rung it belongs to beside it.
 *
 * THE SIGNED URL IS THE POINT. agent-documents is a private bucket, correctly:
 * these objects are driving licences, NIN slips and CAC certificates, and a
 * public bucket serves straight from a CDN to anybody holding the path. The
 * reviewer gets a short-lived signed URL minted here, per request, and nothing
 * is ever handed out beyond the person looking at the queue.
 */

const UNAVAILABLE = { state: "unavailable" } as const;

const DOCUMENT_BUCKET = "agent-documents";

/** Long enough to open a PDF and read it. Short enough not to be a leak. */
const SIGNED_SECONDS = 600;

/** A proof of address older than this is refused. The rule, stated once. */
export const ADDRESS_PROOF_MAX_AGE_DAYS = 92;

export type KycDocumentView = {
  id: string;
  /** identity, address or business. The category the ladder keys off. */
  kind: string;
  /** Which document specifically, when the uploader said. */
  subtype: string | null;
  reviewStatus: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  issuedOn: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  /** A short-lived URL that opens the actual file. Null if it would not sign. */
  url: string | null;
  /** True when this replaces an earlier attempt. */
  isResubmission: boolean;
  /**
   * True when a proof of address states an issue date older than the rule
   * allows, or states none at all. Computed rather than stored, because the
   * rule is about the age of the document at the moment somebody looks at it.
   */
  tooOld: boolean;
};

export type KycSubjectView = {
  userId: string | null;
  displayName: string | null;
  applicationId: string | null;
  applicationReference: string | null;
  agentId: string | null;
  /** Where they stand on the four rung ladder, 0 to 4. */
  tier: number;
  /** Rungs recorded, including the pending ones an automated check produced. */
  rungs: { kind: string; status: string; note: string | null; decidedAt: string }[];
  business: {
    name: string | null;
    registrationNumber: string | null;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    establishedOn: string | null;
    address: string | null;
  } | null;
  documents: KycDocumentView[];
};

export type KycQueue = {
  waiting: KycSubjectView[];
  decided: KycSubjectView[];
  pendingCount: number;
};

const DOCUMENT_COLUMNS =
  "id, application_id, uploader_id, kind, subtype, storage_path, issued_on, review_status, rejection_reason, reviewed_by, reviewed_at, supersedes_id, uploaded_at";

function isTooOld(kind: string, issuedOn: string | null): boolean {
  if (kind !== "address") return false;
  if (!issuedOn) return true;
  const parsed = Date.parse(`${issuedOn}T12:00:00+01:00`);
  if (Number.isNaN(parsed)) return true;
  return Date.now() - parsed > ADDRESS_PROOF_MAX_AGE_DAYS * 86_400_000;
}

/**
 * Everything waiting on a human, grouped by the person it is about.
 *
 * Grouped rather than listed flat, because a reviewer's actual unit of work is
 * a PERSON: approving somebody's passport while their proof of address sits in
 * a different part of a long list is how one person ends up half verified for a
 * week. The subject carries their ladder and their business details, so the
 * decision is taken with everything in view.
 */
export async function getKycQueue(): Promise<AdminRead<KycQueue>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  try {
    const { data: docs, error } = await access.supabase
      .from("agent_documents")
      .select(DOCUMENT_COLUMNS)
      .order("uploaded_at", { ascending: false })
      .limit(300);
    if (error) return UNAVAILABLE;

    const documents = docs ?? [];
    if (documents.length === 0) {
      return { state: "ok", data: { waiting: [], decided: [], pendingCount: 0 } };
    }

    /* Who each document is about. Either stated on the row, or reached through
       the application it was filed against, which is the older shape. */
    const applicationIds = [
      ...new Set(documents.map((d) => d.application_id).filter((id): id is string => Boolean(id))),
    ];
    const applications = new Map<
      string,
      {
        user_id: string;
        reference: string;
        business_name: string | null;
        business_rc: string | null;
        business_tax_id: string | null;
        business_email: string | null;
        business_phone: string | null;
        business_established_on: string | null;
        business_address: string | null;
      }
    >();
    if (applicationIds.length > 0) {
      const { data } = await access.supabase
        .from("agent_applications")
        .select(
          "id, user_id, reference, business_name, business_rc, business_tax_id, business_email, business_phone, business_established_on, business_address",
        )
        .in("id", applicationIds);
      for (const row of data ?? []) applications.set(row.id, row);
    }

    const ownerOf = (doc: (typeof documents)[number]): string | null =>
      doc.uploader_id ??
      (doc.application_id ? (applications.get(doc.application_id)?.user_id ?? null) : null);

    const userIds = [
      ...new Set(documents.map(ownerOf).filter((id): id is string => Boolean(id))),
    ];

    const [names, agents, urls] = await Promise.all([
      displayNames(access.supabase, [
        ...userIds,
        ...documents.map((d) => d.reviewed_by).filter((id): id is string => Boolean(id)),
      ]),
      agentsFor(access.supabase, userIds),
      signDocuments(
        access.supabase,
        documents.map((d) => d.storage_path),
      ),
    ]);

    const ladders = await laddersFor(
      access.supabase,
      [...agents.values()].map((a) => a.id),
    );

    const bySubject = new Map<string, KycSubjectView>();
    for (const doc of documents) {
      const owner = ownerOf(doc);
      const key = owner ?? `orphan:${doc.id}`;
      const application = doc.application_id ? applications.get(doc.application_id) : undefined;
      const agent = owner ? agents.get(owner) : undefined;

      let subject = bySubject.get(key);
      if (!subject) {
        subject = {
          userId: owner,
          displayName: owner ? (names.get(owner) ?? null) : null,
          applicationId: doc.application_id,
          applicationReference: application?.reference ?? null,
          agentId: agent?.id ?? null,
          tier: agent?.tier ?? 0,
          rungs: agent ? (ladders.get(agent.id) ?? []) : [],
          business:
            application && application.business_name
              ? {
                  name: application.business_name,
                  registrationNumber: application.business_rc,
                  taxId: application.business_tax_id,
                  email: application.business_email,
                  phone: application.business_phone,
                  establishedOn: application.business_established_on,
                  address: application.business_address,
                }
              : null,
          documents: [],
        };
        bySubject.set(key, subject);
      }

      subject.documents.push({
        id: doc.id,
        kind: doc.kind,
        subtype: doc.subtype,
        reviewStatus: doc.review_status,
        rejectionReason: doc.rejection_reason,
        issuedOn: doc.issued_on,
        uploadedAt: doc.uploaded_at,
        reviewedAt: doc.reviewed_at,
        reviewedByName: doc.reviewed_by ? (names.get(doc.reviewed_by) ?? null) : null,
        url: urls.get(doc.storage_path) ?? null,
        isResubmission: doc.supersedes_id !== null,
        tooOld: isTooOld(doc.kind, doc.issued_on),
      });
    }

    const subjects = [...bySubject.values()];
    const waiting = subjects.filter((s) =>
      s.documents.some((d) => d.reviewStatus === "pending"),
    );
    const decided = subjects
      .filter((s) => !s.documents.some((d) => d.reviewStatus === "pending"))
      .slice(0, 20);

    return {
      state: "ok",
      data: {
        waiting,
        decided,
        pendingCount: documents.filter((d) => d.review_status === "pending").length,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------------------ shared */

async function displayNames(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return out;
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  for (const row of data ?? []) if (row.display_name) out.set(row.id, row.display_name);
  return out;
}

async function agentsFor(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, { id: string; tier: number }>> {
  const out = new Map<string, { id: string; tier: number }>();
  if (userIds.length === 0) return out;
  const { data } = await supabase
    .from("agents")
    .select("id, user_id, verification_tier")
    .in("user_id", userIds);
  for (const row of data ?? []) {
    out.set(row.user_id, { id: row.id, tier: row.verification_tier ?? 0 });
  }
  return out;
}

async function laddersFor(
  supabase: SupabaseClient<Database>,
  agentIds: string[],
): Promise<Map<string, { kind: string; status: string; note: string | null; decidedAt: string }[]>> {
  const out = new Map<
    string,
    { kind: string; status: string; note: string | null; decidedAt: string }[]
  >();
  if (agentIds.length === 0) return out;
  const { data } = await supabase
    .from("agent_verification_checks")
    .select("agent_id, kind, status, note, decided_at")
    .in("agent_id", agentIds);
  for (const row of data ?? []) {
    const list = out.get(row.agent_id) ?? [];
    /* Pending rungs are kept, unlike in the agent's own view of the ladder.
       A rung sitting pending is precisely what this queue exists to surface:
       it means an automated check ran and produced something a person has to
       look at, and the note carries what. */
    list.push({
      kind: row.kind,
      status: row.status,
      note: row.note,
      decidedAt: row.decided_at,
    });
    out.set(row.agent_id, list);
  }
  return out;
}

/**
 * A signed URL per document, in one call.
 *
 * A path that fails to sign comes back absent and the row renders without a
 * link rather than with a broken one, because a reviewer clicking a dead link
 * and getting a storage error page has been told nothing useful.
 */
async function signDocuments(
  supabase: SupabaseClient<Database>,
  paths: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return out;
  try {
    const { data } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrls(unique, SIGNED_SECONDS);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) out.set(entry.path, entry.signedUrl);
    }
  } catch {
    /* Storage unreachable. The queue still lists what is waiting. */
  }
  return out;
}
