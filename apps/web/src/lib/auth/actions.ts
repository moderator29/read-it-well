"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { getProviderStates } from "./providers";
import { HEAR_ABOUT_VALUES, REFERRAL_CODE_RE } from "./signup-options";

export type AuthField =
  | "firstName"
  | "surname"
  | "nickname"
  | "email"
  | "password"
  | "confirmPassword"
  | "hearAbout"
  | "stateCode"
  | "lgaCode"
  | "occupationCode"
  | "referralCode";

export type AuthFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<AuthField, string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Two letters. `public.states` is keyed by code, and Lagos is LA. */
const STATE_CODE_RE = /^[A-Z]{2}$/;
/** `<state>_<name>`, lower cased, for example `la_ikeja`. */
const LGA_CODE_RE = /^[a-z]{2}_[a-z0-9_]{2,60}$/;
const OCCUPATION_CODE_RE = /^[a-z0-9_]{2,60}$/;

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
  const stateCode = field(formData, "stateCode").trim().toUpperCase();
  const lgaCode = field(formData, "lgaCode").trim().toLowerCase();
  const occupationCode = field(formData, "occupationCode").trim().toLowerCase();
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

  /* The English value, never the translated label. The select posts the one
     and shows the other, so this check is the same in all four languages. */
  if (!hearAbout) errors.hearAbout = "Tell us where you heard about us.";
  else if (!HEAR_ABOUT_VALUES.includes(hearAbout))
    errors.hearAbout = "Choose one of the listed options.";

  /* Codes, not names. `profiles.state_code` and `profiles.lga_code` are keyed
     to `public.states` and `public.local_governments`, and the signup trigger
     checks both against those tables before writing either, so the shape check
     here is only about catching a mangled post early. */
  if (!STATE_CODE_RE.test(stateCode)) errors.stateCode = "Choose the state you stay in.";
  if (lgaCode !== "" && !LGA_CODE_RE.test(lgaCode))
    errors.lgaCode = "Choose a local government from the list.";
  if (lgaCode !== "" && stateCode === "")
    errors.stateCode = "Choose your state before your local government.";
  if (occupationCode !== "" && !OCCUPATION_CODE_RE.test(occupationCode))
    errors.occupationCode = "Choose what you do from the list.";

  // Referral code is optional; when supplied it must at least look like one.
  if (referralCode && !REFERRAL_CODE_RE.test(referralCode))
    errors.referralCode = "Referral codes are 4 to 24 letters, numbers or hyphens.";

  return errors;
}

function emailConfigured(): boolean {
  return getProviderStates().some((p) => p.id === "email" && p.configured);
}

const NOT_CONNECTED_MESSAGE =
  "Accounts switch on the moment the platform keys land. Nothing you typed was lost.";

/**
 * Translate a Supabase auth error into something a person can act on.
 *
 * Supabase deliberately keeps sign-in failures vague to avoid confirming which
 * email addresses exist, and that is the right behaviour to preserve, so the
 * credentials case stays deliberately non-specific about which half was wrong.
 */
function authMessage(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "That email and password do not match. Check them and try again.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email first. Open the link we sent you, then sign in.";
  }
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "An account already uses that email address. Sign in instead, or reset your password.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many attempts just now. Wait a minute, then try again.";
  }
  if (text.includes("password")) {
    return "That password was refused. Use at least 8 characters, mixing letters and numbers.";
  }
  return "We could not complete that just now. Please try again in a moment.";
}

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fieldErrors = validateCredentials(formData);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (!emailConfigured()) return { ok: false, message: NOT_CONNECTED_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: field(formData, "email").trim(),
    password: field(formData, "password"),
  });

  if (error) return { ok: false, message: authMessage(error.message) };

  // The session cookies are set. Drop every cached render so the shell picks
  // up the real identity instead of the signed out view.
  revalidatePath("/", "layout");
  redirect("/home");
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fieldErrors = validateSignUp(formData);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (!emailConfigured()) return { ok: false, message: NOT_CONNECTED_MESSAGE };

  const firstName = field(formData, "firstName").trim();
  const surname = field(formData, "surname").trim();
  const nickname = field(formData, "nickname").trim();

  const supabase = await createClient();
  // The metadata here is what the database signup trigger reads into the
  // profile row, so nothing the person typed has to be asked for twice.
  const { data, error } = await supabase.auth.signUp({
    email: field(formData, "email").trim(),
    password: field(formData, "password"),
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/home")}`,
      data: {
        first_name: firstName,
        surname,
        nickname: nickname.length > 0 ? nickname : null,
        state_code: field(formData, "stateCode").trim().toUpperCase(),
        lga_code: field(formData, "lgaCode").trim().toLowerCase() || null,
        occupation_code: field(formData, "occupationCode").trim().toLowerCase() || null,
        display_name: nickname.length > 0 ? nickname : [firstName, surname].join(" ").trim(),
        hear_about: field(formData, "hearAbout"),
        referral_code: field(formData, "referralCode").trim() || null,
      },
    },
  });

  if (error) return { ok: false, message: authMessage(error.message) };

  // With email confirmation switched on in Supabase there is no session yet,
  // and saying so is the honest outcome rather than sending someone to a
  // signed out home screen and letting them wonder.
  if (!data.session) {
    return {
      ok: true,
      message: "Check your email to confirm your address, then sign in. The link expires shortly.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/home");
}

/**
 * Begin an OAuth handshake. Returns the provider URL for the client to visit,
 * rather than redirecting here, so the caller can report a refusal in place.
 */
/**
 * Form-action wrappers.
 *
 * A `<form action={...}>` hands the action a FormData argument, so the bare
 * startOAuth signature cannot be bound to a form directly. These two exist so
 * the provider is fixed on the server rather than being submitted by the
 * browser, which means a crafted form cannot ask for a provider we never
 * enabled.
 */
export async function startGoogleOAuth(): Promise<void> {
  await startOAuth("google");
}

export async function startAppleOAuth(): Promise<void> {
  await startOAuth("apple");
}

export async function startOAuth(provider: "google" | "apple"): Promise<AuthFormState> {
  const states = getProviderStates();
  if (!states.some((p) => p.id === provider && p.configured)) {
    return {
      ok: false,
      message: "That sign-in method is not switched on yet. Use your email address for now.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/home")}`,
    },
  });

  if (error || !data.url) return { ok: false, message: authMessage(error?.message ?? "") };
  redirect(data.url);
}

/* ------------------------------------------------------------ password reset */

/**
 * The same answer whether or not the address has an account.
 *
 * This is the whole security property of a reset flow. "No account with that
 * email" turns the form into an account-existence oracle: anybody can paste a
 * list of addresses through it and learn which of your users are real, which
 * is the first step of a credential-stuffing run and, on a platform where
 * people's homes are listed, a privacy leak in its own right. So the sentence
 * below is returned for a match, for no match, and for a Supabase refusal
 * alike, and it is worded so it stays true in every one of those cases.
 */
const RESET_SENT_MESSAGE =
  "If that email has an account, a reset link is on its way. It expires in an hour, and it can only be used once.";

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").trim();

  if (!email) return { ok: false, fieldErrors: { email: "Enter your email address." } };
  if (email.length > 254) return { ok: false, fieldErrors: { email: "That email address is too long." } };
  if (!EMAIL_RE.test(email)) {
    return { ok: false, fieldErrors: { email: "That does not look like a valid email." } };
  }

  if (!emailConfigured()) return { ok: false, message: NOT_CONNECTED_MESSAGE };

  const supabase = await createClient();
  /*
   * The link lands on the same callback every other Supabase route uses. It
   * exchanges the recovery code for a session and forwards to
   * /reset-password, which is the only screen that can then set a new
   * password - and it can only do so because that exchange happened.
   */
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  /*
   * A rate limit is the one refusal worth surfacing, because it is about the
   * request and not about the account: telling somebody to wait a minute helps
   * them and reveals nothing. Everything else - including "user not found" -
   * returns the same sentence as success.
   */
  if (error && /rate limit|too many/i.test(error.message)) {
    return { ok: false, message: "Too many requests just now. Wait a minute, then try again." };
  }

  return { ok: true, message: RESET_SENT_MESSAGE };
}

/**
 * Set the new password.
 *
 * Only reachable with the session the recovery link created, and that is the
 * authorisation: `updateUser` acts on whoever the cookies say is signed in, so
 * without a valid recovery exchange there is nobody to act on and Supabase
 * refuses. The screen checks for the session too, so somebody who opens the
 * URL directly gets an explanation rather than a form that cannot work.
 */
export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = field(formData, "password");
  const confirmPassword = field(formData, "confirmPassword");

  const fieldErrors: Partial<Record<AuthField, string>> = {};
  if (!password) fieldErrors.password = "Enter a new password.";
  else if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  else if (password.length > 200) fieldErrors.password = "That password is too long.";
  if (password && confirmPassword !== password) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (!emailConfigured()) return { ok: false, message: NOT_CONNECTED_MESSAGE };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      ok: false,
      message:
        "That reset link has expired or was already used. Ask for a new one and open it from the same device.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: authMessage(error.message) };

  // The password changed under the session the link created, so every cached
  // render of the signed-out shell has to go.
  revalidatePath("/", "layout");
  redirect("/home");
}

// Signing out lives in lib/profile/actions.ts, which the settings screen
// already calls. One session-ending path, one place.
