"use server";

import { NIGERIAN_STATES } from "@/lib/data/nigeria";
import { getProviderStates } from "./providers";
import { HEAR_ABOUT_OPTIONS, REFERRAL_CODE_RE } from "./signup-options";

export type AuthField =
  | "firstName"
  | "surname"
  | "nickname"
  | "email"
  | "password"
  | "confirmPassword"
  | "hearAbout"
  | "state"
  | "referralCode";

export type AuthFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<AuthField, string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/**
 * Server side validation for the email flows.
 *
 * Validation is real and runs on the server, because client validation is a
 * convenience and never a control (Master Rule 48 applied to input generally).
 * When the auth backend is not configured the action says so plainly instead of
 * pretending the account was created.
 */
function validateCredentials(formData: FormData): Partial<Record<AuthField, string>> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");

  const errors: Partial<Record<AuthField, string>> = {};

  if (!email) errors.email = "Enter your email address.";
  else if (email.length > 254) errors.email = "That email address is too long.";
  else if (!EMAIL_RE.test(email)) errors.email = "That does not look like a valid email.";

  if (!password) errors.password = "Enter your password.";
  else if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (password.length > 200) errors.password = "That password is too long.";

  return errors;
}

function validateSignUp(formData: FormData): Partial<Record<AuthField, string>> {
  const errors = validateCredentials(formData);

  const firstName = field(formData, "firstName").trim();
  const surname = field(formData, "surname").trim();
  const nickname = field(formData, "nickname").trim();
  const confirmPassword = field(formData, "confirmPassword");
  const hearAbout = field(formData, "hearAbout");
  const state = field(formData, "state");
  const referralCode = field(formData, "referralCode").trim();

  if (!firstName) errors.firstName = "Enter your first name.";
  else if (firstName.length > 80) errors.firstName = "That first name is too long.";

  if (!surname) errors.surname = "Enter your surname.";
  else if (surname.length > 80) errors.surname = "That surname is too long.";

  // Nickname is optional; only its length is bounded when supplied.
  if (nickname.length > 40) errors.nickname = "Keep your nickname under 40 characters.";

  if (!errors.password) {
    if (!confirmPassword) errors.confirmPassword = "Re-enter your password.";
    else if (confirmPassword !== field(formData, "password"))
      errors.confirmPassword = "Passwords do not match.";
  }

  if (!hearAbout) errors.hearAbout = "Tell us where you heard about us.";
  else if (!(HEAR_ABOUT_OPTIONS as readonly string[]).includes(hearAbout))
    errors.hearAbout = "Choose one of the listed options.";

  if (!state) errors.state = "Select the state you stay in.";
  else if (!(NIGERIAN_STATES as readonly string[]).includes(state))
    errors.state = "Choose a state from the list.";

  // Referral code is optional; when supplied it must at least look like one.
  if (referralCode && !REFERRAL_CODE_RE.test(referralCode))
    errors.referralCode = "Referral codes are 4 to 24 letters, numbers or hyphens.";

  return errors;
}

function emailConfigured(): boolean {
  return getProviderStates().some((p) => p.id === "email" && p.configured);
}

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fieldErrors = validateCredentials(formData);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

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
  const fieldErrors = validateSignUp(formData);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (!emailConfigured()) {
    return {
      ok: false,
      message:
        "Account creation is not connected yet. Set AUTH_DATABASE_URL and RESEND_API_KEY to enable it.",
    };
  }

  return { ok: false, message: "Account creation is not available yet." };
}
