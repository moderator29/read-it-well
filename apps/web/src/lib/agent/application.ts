"use server";

/**
 * Agent application submission.
 *
 * Validation is real and runs on the server. Persistence is not, because the
 * agent service does not exist yet, so this reports that plainly rather than
 * returning a fake approval (Master Rule 8). The client keeps the draft in
 * local storage so nothing the applicant typed is lost when this returns
 * unavailable (Master Rule 57, never lose a draft).
 */

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

  // Validation passed. The agent service is not connected, so this refuses
  // rather than pretending the application was filed.
  return {
    ok: false,
    message:
      "Your details are valid, but agent applications are not being accepted yet. " +
      "Your progress is saved on this device and nothing was lost.",
  };
}
