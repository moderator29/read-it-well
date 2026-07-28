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
 */

import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

export type ApplicationField =
  | "firstName"
  | "lastName"
  | "phone"
  | "idType"
  | "idNumber"
  | "state"
  | "city"
  | "address"
  | "bankName"
  | "accountNumber"
  | "accountName"
  | "agreeTerms";

export type ApplicationResult = {
  ok: boolean;
  message?: string;
  reference?: string;
  fieldErrors?: Partial<Record<ApplicationField, string>>;
};

// Nigerian mobile numbers: 11 digits local (0803...) or +234 form.
const PHONE_RE = /^(\+?234|0)\d{10}$/;

export async function submitAgentApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const get = (k: ApplicationField) => String(formData.get(k) ?? "").trim();
  const fieldErrors: ApplicationResult["fieldErrors"] = {};

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
      type: "individual",
      status: "SUBMITTED",
      full_name: `${get("firstName")} ${get("lastName")}`.trim(),
      phone,
      email: user.email ?? null,
      residential_address: get("address"),
      state_code: stateRow?.code ?? null,
      city: get("city"),
      id_type: get("idType"),
      id_number: get("idNumber"),
      bank_name: get("bankName"),
      account_number: account,
      account_name: get("accountName"),
      agree_terms: true,
      submitted_at: new Date().toISOString(),
    })
    .select("reference")
    .single();

  if (error || !inserted) {
    return {
      ok: false,
      message:
        "We could not file your application just now. Your progress is saved on " +
        "this device, so you can try again shortly.",
    };
  }

  return {
    ok: true,
    reference: inserted.reference,
    message: `Application ${inserted.reference} submitted. We review within 24 to 48 hours.`,
  };
}
