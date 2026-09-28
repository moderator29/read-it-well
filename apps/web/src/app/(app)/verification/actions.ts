"use server";

import { revalidatePath } from "next/cache";
import {
  CONSENTS,
  addressDateProblem,
  isSubtypeOf,
  lagosToday,
  missingFrom,
  type DocumentKind,
  type KycSubmission,
  type KycSubmitResult,
} from "@/components/verification/kyc";
import { resolveSession } from "@/lib/actions/session";

/**
 * Send a verification submission for review.
 *
 * The files are already in the private `agent-documents` bucket: the uploader
 * put each one under the caller's own folder the moment it was chosen. This
 * FILES them, which is what puts them in front of a reviewer:
 *
 *  1. Every answer is checked again here, because the browser's checks are a
 *     courtesy and this is the gate. Every path must sit under the caller's
 *     own uid folder (storage RLS enforced the same on upload).
 *  2. The three agreements are recorded in `kyc_consents`, one row each.
 *  3. If the caller has an application the documents attach to it: a DRAFT or
 *     SUBMITTED one as it stands, and a MORE_INFO_REQUIRED one is moved back
 *     to SUBMITTED, the respondToReview path. A business answer with no
 *     application opens a SUBMITTED one carrying the business details.
 *  4. One `agent_documents` row per document, through the caller's RLS-bound
 *     client. `private.guard_document_write` forces every such row to
 *     `pending`, so this path cannot approve anything. A resubmission names
 *     the document it replaces.
 *
 * The admin KYC queue (`lib/admin/kyc-queries.ts`) reads `agent_documents` by
 * uploader, so a submission appears there with no application required.
 *
 * It never answers `{ ok: true }` unless the document rows were written: the
 * submitted screen promises a person will read the documents.
 */

const KINDS: DocumentKind[] = ["identity", "address"];

const FAILED =
  "We could not send your documents just now. Nothing you entered was lost. Try again in a few minutes.";
const NOT_YOURS = "Those uploads did not come from your own account, so we did not send them. Choose the files again.";

type Row = Record<string, unknown>;
type Client = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (n: number) => { maybeSingle: () => PromiseLike<{ data: Row | null; error: unknown }> };
        };
        in: (column: string, values: string[]) => {
          order: (column: string, options: { ascending: boolean }) => PromiseLike<{ data: Row[] | null; error: unknown }>;
        };
      };
    };
    insert: (rows: Row | Row[]) => PromiseLike<{ error: unknown }> & {
      select: (columns: string) => { single: () => PromiseLike<{ data: Row | null; error: unknown }> };
    };
    update: (values: Row) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => PromiseLike<{ error: unknown }>;
      };
    };
  };
};

/** The business answers as `agent_applications` columns. There is no website column. */
function businessColumns(details: Record<string, string>): Row {
  const value = (name: string) => (details[name] ?? "").trim() || null;
  const address = [value("street"), value("city"), value("state")].filter(Boolean).join(", ");
  return {
    business_name: value("businessName"),
    business_rc: value("rcNumber"),
    business_tax_id: value("tin"),
    business_phone: value("businessPhone"),
    business_email: value("businessEmail"),
    business_address: address || null,
  };
}

export async function submitVerification(submission: KycSubmission): Promise<KycSubmitResult> {
  /* ------------------------------------------------ the answers, again */
  const today = lagosToday();
  const gaps = missingFrom(submission, today);
  if (gaps.length > 0) {
    return { ok: false, message: `Still needed before this can be sent: ${gaps.join("; ")}.` };
  }
  for (const consent of CONSENTS) {
    if (!submission.consents.includes(consent.id)) return { ok: false, message: FAILED };
  }
  const addressDate = addressDateProblem(submission.documents.address?.issuedOn, today);
  if (addressDate) return { ok: false, message: addressDate };

  const session = await resolveSession();
  if (session.state === "unconfigured") return { ok: false, message: FAILED };
  if (session.state === "signed-out") {
    return { ok: false, message: "Sign in again to send your documents. Nothing you chose was lost." };
  }
  const { user } = session;
  const supabase = session.supabase as unknown as Client;

  const prefix = `${user.id}/`;
  for (const kind of KINDS) {
    const doc = submission.documents[kind];
    if (!doc || typeof doc.path !== "string" || !doc.path.startsWith(prefix) || doc.path.includes("..")) {
      return { ok: false, message: NOT_YOURS };
    }
    if (!isSubtypeOf(kind, doc.subtype)) return { ok: false, message: FAILED };
  }

  /* ------------------------------------------------ the three agreements */
  const consentWrite = await supabase
    .from("kyc_consents")
    .insert(CONSENTS.map((consent) => ({ user_id: user.id, consent: consent.id })));
  if (consentWrite.error) return { ok: false, message: FAILED };

  /* ------------------------------------------------ the application, if any */
  const { data: application, error: readError } = await supabase
    .from("agent_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return { ok: false, message: FAILED };

  let applicationId: string | null = null;
  const status = typeof application?.status === "string" ? application.status : null;
  if (application && (status === "DRAFT" || status === "SUBMITTED" || status === "MORE_INFO_REQUIRED")) {
    applicationId = String(application.id);
  } else if (!application && submission.business) {
    const { data: opened, error } = await supabase
      .from("agent_applications")
      .insert({ user_id: user.id, status: "SUBMITTED", ...businessColumns(submission.businessDetails) })
      .select("id")
      .single();
    if (error || !opened) return { ok: false, message: FAILED };
    applicationId = String(opened.id);
  }

  /* ------------------------------------------------ what each one replaces */
  const { data: earlier } = await supabase
    .from("agent_documents")
    .select("id, kind, uploaded_at")
    .eq("uploader_id", user.id)
    .in("kind", KINDS)
    .order("uploaded_at", { ascending: false });
  const latestOf = (kind: DocumentKind): string | null => {
    const row = (earlier ?? []).find((r) => r.kind === kind);
    return row ? String(row.id) : null;
  };

  /* ------------------------------------------------ the documents */
  const rows = KINDS.map((kind) => {
    const doc = submission.documents[kind]!;
    return {
      uploader_id: user.id,
      application_id: applicationId,
      kind,
      subtype: doc.subtype,
      issued_on: kind === "address" ? doc.issuedOn : null,
      storage_path: doc.path,
      supersedes_id: latestOf(kind),
    };
  });
  const documentWrite = await supabase.from("agent_documents").insert(rows);
  if (documentWrite.error) {
    console.error("[verification] agent_documents insert refused", documentWrite.error);
    return { ok: false, message: FAILED };
  }

  /* ------------------------------------------------ the application, moved on */
  if (applicationId && (status === "DRAFT" || status === "MORE_INFO_REQUIRED")) {
    /* Guarded on the status it was read in, so a reviewer who decided in the
       meantime is not overwritten. The documents are already filed either
       way, so a refusal here is not the applicant's failure. */
    const moved = await supabase
      .from("agent_applications")
      .update({
        status: "SUBMITTED",
        ...(submission.business ? businessColumns(submission.businessDetails) : {}),
      })
      .eq("id", applicationId)
      .eq("status", status);
    if (moved.error) console.error("[verification] application not moved to SUBMITTED", moved.error);
  }

  revalidatePath("/verification");
  revalidatePath("/profile");
  return { ok: true };
}

