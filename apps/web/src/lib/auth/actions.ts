"use server";

import { getProviderStates } from "./providers";

export type AuthFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "fullName", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Server side validation for the email flows.
 *
 * Validation is real and runs on the server, because client validation is a
 * convenience and never a control (Master Rule 48 applied to input generally).
 * When the auth backend is not configured the action says so plainly instead of
 * pretending the account was created.
 */
function validate(formData: FormData, requireName: boolean): AuthFormState {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  const fieldErrors: AuthFormState["fieldErrors"] = {};

  if (!email) fieldErrors.email = "Enter your email address.";
  else if (email.length > 254) fieldErrors.email = "That email address is too long.";
  else if (!EMAIL_RE.test(email)) fieldErrors.email = "That does not look like a valid email.";

  if (!password) fieldErrors.password = "Enter your password.";
  else if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  else if (password.length > 200) fieldErrors.password = "That password is too long.";

  if (requireName && !fullName) fieldErrors.fullName = "Enter your name.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true };
}

function emailConfigured(): boolean {
  return getProviderStates().some((p) => p.id === "email" && p.configured);
}

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = validate(formData, false);
  if (!result.ok) return result;

  if (!emailConfigured()) {
    return {
      ok: false,
      message:
        "Email sign in is not connected yet. Set AUTH_DATABASE_URL and RESEND_API_KEY to enable it.",
    };
  }

  // Real session issuing lands with the auth service in Phase 1. Until the
  // backend exists this deliberately refuses rather than returning a fake
  // success and redirecting to a signed out home screen.
  return { ok: false, message: "Sign in service is not available yet." };
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = validate(formData, true);
  if (!result.ok) return result;

  if (!emailConfigured()) {
    return {
      ok: false,
      message:
        "Account creation is not connected yet. Set AUTH_DATABASE_URL and RESEND_API_KEY to enable it.",
    };
  }

  return { ok: false, message: "Account creation is not available yet." };
}
