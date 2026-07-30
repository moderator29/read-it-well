"use server";

/**
 * Agent application submission.
 *
 * Validation is real and runs on the server. When Supabase is configured and the
 * applicant is signed in, the application is persisted to agent_applications
 * under Row Level Security as a SUBMITTED row, and the generated NF-AGT-#####
 * reference is returned. When Supabase is not configured, or the user is not
 * signed in, this returns a plain, honest message rather than a fake approval
 * (Master Rule 8). The client keeps the draft in local storage either way, so
 * nothing the applicant typed is lost (Master Rule 57, never lose a draft).
 *
 * DOCUMENTS. The wizard uploads each file straight from the browser into the
 * private agent-documents bucket under `<auth uid>/<batch>/...`, which storage
 * RLS restricts to that user's own folder, and then hands this action the paths.
 * Nothing here trusts those strings: every one must live under the caller's own
 * uid prefix or the whole submission is refused, so a crafted path cannot claim
 * somebody else's object. The rows are written through the applicant's own
 * client, under the same RLS that guards reading them.
 *
 * Documents are REQUIRED, and that is the point of the feature. An application
 * with no identity document cannot be verified by anybody, so accepting one
 * would mean filling the admin queue with items no reviewer can action. Before
 * this, the files never left the browser at all and every application arrived
 * showing zero documents.
 */

import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

export type ApplicationField =
  | "firstName"
  | "lastName"
  | "phone"
  | "idType"
  | "idNumber"
  | "businessName"
  | "rcNumber"
  | "state"
  | "city"
  | "address"
  | "bankName"
  | "accountNumber"
  | "accountName"
  | "agreeTerms"
  | "documents";

export type ApplicationResult = {
  ok: boolean;
  message?: string;
  reference?: string;
  fieldErrors?: Partial<Record<ApplicationField, string>>;
};

/** Nigerian mobile numbers: 11 digits local (0803...) or +234 form. */
const PHONE_RE = /^(\+?234|0)\d{10}$/;

/** The document slots the wizard offers, and which of them are compulsory. */
const DOCUMENT_KINDS = ["idFront", "idBack", "registration"] as const;
type DocumentKind = (typeof DOCUMENT_KINDS)[number];

type UploadedDocument = { kind: DocumentKind; path: string };

/**
 * Read the uploaded document manifest the wizard sends as one JSON field.
 *
 * Anything malformed is treated as "no documents" rather than throwing, because
 * a broken manifest must produce the same honest field error as an empty one,
 * never a crash on a form somebody spent ten minutes filling in.
 */
function readManifest(raw: string): UploadedDocument[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: UploadedDocument[] = [];
  for (const item of parsed) {
    if (item === null || typeof item !== "object") continue;
    const kind = (item as Record<string, unknown>)["kind"];
    const path = (item as Record<string, unknown>)["path"];
    if (typeof kind !== "string" || typeof path !== "string") continue;
    if (!DOCUMENT_KINDS.includes(kind as DocumentKind)) continue;
    if (path.length === 0 || path.length > 400) continue;
    out.push({ kind: kind as DocumentKind, path });
  }
  return out;
}

export async function submitAgentApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const fieldErrors: ApplicationResult["fieldErrors"] = {};

  const isBusiness = get("agentType") === "business";

  const required: ApplicationField[] = [
    "firstName",
    "lastName",
    "phone",
    "idType",
    "idNumber",
    "state",
    "city",
    "address",
    "bankName",
    "accountNumber",
    "accountName",
  ];
  for (const f of required) {
    if (!get(f)) fieldErrors[f] = "This field is required.";
  }

  // A business applicant is claiming a registered company, so the registration
  // details are not optional for them. They are not asked of an individual.
  if (isBusiness) {
    if (!get("businessName")) fieldErrors.businessName = "This field is required.";
    if (!get("rcNumber")) fieldErrors.rcNumber = "This field is required.";
  }

  const phone = get("phone").replace(/\s/g, "");
  if (phone && !PHONE_RE.test(phone)) {
    fieldErrors.phone = "Enter a valid Nigerian phone number.";
  }

  const account = get("accountNumber");
  if (account && !/^\d{10}$/.test(account)) {
    fieldErrors.accountNumber = "A Nigerian account number is 10 digits.";
  }

  if (formData.get("agreeTerms") !== "on") {
    fieldErrors.agreeTerms = "You must accept the agent terms to continue.";
  }

  const documents = readManifest(get("documents"));
  const has = (kind: DocumentKind) => documents.some((d) => d.kind === kind);
  if (!has("idFront") || !has("idBack")) {
    fieldErrors.documents =
      "Upload both sides of your ID. We cannot verify an agent without seeing it.";
  } else if (isBusiness && !has("registration")) {
    fieldErrors.documents =
      "Upload your CAC registration certificate so we can verify the business.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Validation passed. Persist if we can.
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Your details are valid, but the platform is not connected yet. " +
        "Your progress is saved on this device and nothing was lost.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message:
        "Your details are valid. Please sign in to submit your application. " +
        "Your progress is saved on this device.",
    };
  }

  // Every path must sit under this caller's own folder. Storage RLS enforces the
  // same rule on the upload itself, so a path that fails here was never written
  // by this user and has no business being recorded against their application.
  const prefix = `${user.id}/`;
  if (documents.some((d) => !d.path.startsWith(prefix))) {
    return {
      ok: false,
      fieldErrors: {
        documents:
          "Those uploads did not come from your own account, so we did not file them. Please choose the files again.",
      },
    };
  }

  // Resolve the state name from the form to its canonical code.
  const stateName = get("state");
  const { data: stateRow } = await supabase
    .from("states")
    .select("code")
    .eq("name", stateName)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from("agent_applications")
    .insert({
      user_id: user.id,
      // The wizard has always asked individual or business and this action
      // always filed "individual" regardless, silently discarding the answer
      // along with both registration fields.
      type: isBusiness ? "business" : "individual",
      status: "SUBMITTED",
      full_name: `${get("firstName")} ${get("lastName")}`.trim(),
      phone,
      email: user.email ?? null,
      residential_address: get("address"),
      state_code: stateRow?.code ?? null,
      city: get("city"),
      id_type: get("idType"),
      id_number: get("idNumber"),
      business_name: isBusiness ? get("businessName") : null,
      business_rc: isBusiness ? get("rcNumber") : null,
      bank_name: get("bankName"),
      account_number: account,
      account_name: get("accountName"),
      agree_terms: true,
      submitted_at: new Date().toISOString(),
    })
    .select("id, reference")
    .single();

  if (error || !inserted) {
    return {
      ok: false,
      message:
        "We could not file your application just now. Your progress is saved on " +
        "this device, so you can try again shortly.",
    };
  }

  const documentWrite = await supabase.from("agent_documents").insert(
    documents.map((d) => ({
      application_id: inserted.id,
      kind: d.kind,
      storage_path: d.path,
    })),
  );

  // The application is filed and that is real, so this is not reported as a
  // failure. But an application a reviewer cannot open the documents for is
  // stuck, so the applicant is told plainly rather than left to find out by
  // waiting. Support can attach them by hand from the reference.
  if (documentWrite.error) {
    return {
      ok: true,
      reference: inserted.reference,
      message:
        `Application ${inserted.reference} submitted, but your documents did not attach. ` +
        "Please contact support with that reference and we will add them for you.",
    };
  }

  return {
    ok: true,
    reference: inserted.reference,
    message: `Application ${inserted.reference} submitted. We review within 24 to 48 hours.`,
  };
}
