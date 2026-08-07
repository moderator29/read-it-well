"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  consume,
  ipFromHeaders,
  subjectForEmail,
  subjectForIp,
} from "@/lib/security/rate-limit";
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
  | "referralCode"
  /* The six digits from the confirmation email. Part of the same union so the
     verify screen reports a bad code exactly the way every other field on
     every other auth form reports a bad value. */
  | "code";

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

/* -------------------------------------------------------------- throttling */

/**
 * The door, counted.
 *
 * Supabase applies its own limits at the auth endpoint, and they are the last
 * line rather than the first: they are shared across the whole project, tuned
 * for its own protection rather than this platform's, and they are not reached
 * at all by an attempt this file refuses on validation. These three actions are
 * the ones worth counting here, because each is reachable with no session and
 * each one costs something real: a sign-in attempt is a password guess, a
 * sign-up writes a row and sends mail, a reset sends mail to an address the
 * request chose.
 *
 * WHY SIGN-IN IS COUNTED BY ADDRESS AND SIGN-IN ONLY IS NOT. Counting reset
 * requests per address protects the owner of that address from having their
 * inbox used as a weapon, and costs them nothing, because a throttled reset
 * never stops them signing in normally. Counting sign-in attempts per address
 * would do the opposite: anybody who knows a person's email could spend that
 * allowance on purpose and hold them out of their own account for as long as
 * they cared to keep it up. So sign-in is counted per address of origin, and
 * the address typed into the form is not a key here.
 */
async function throttle(
  bucket: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<AuthFormState | null> {
  const verdict = await consume({ bucket, subject, limit, windowSeconds });
  if (verdict.allowed) return null;
  return {
    ok: false,
    message: `Too many attempts just now. Try again ${verdict.retryIn}.`,
  };
}

async function callerIp(): Promise<string> {
  return ipFromHeaders(await headers());
}


/**
 * Where to land after signing in.
 *
 * The middleware sends somebody who reached a product address without a
 * session to /sign-in with `next` carrying where they were going, and this is
 * the half that honours it. Without this every sign-in landed on /home, so a
 * person who followed a link to a listing signed in and lost the listing.
 *
 * Re-validated here rather than trusted from the query string, because the
 * value crosses a form and a form is an endpoint anybody can post to. Only a
 * path is accepted: no scheme, no protocol-relative `//host`, and no
 * backslash, which the URL parser treats as a path separator and which is
 * exactly how `/\evil.example` became an open redirect in the auth callback.
 */
function landingAfterAuth(formData: FormData): string {
  const raw = formData.get("next");
  if (typeof raw !== "string" || raw.length === 0) return "/home";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/home";
  return raw;
}

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fieldErrors = validateCredentials(formData);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (!emailConfigured()) return { ok: false, message: NOT_CONNECTED_MESSAGE };

  // Ten guesses a minute from one place is far more than a person mistyping a
  // password and far less than a stuffing run is worth mounting.
  const paced = await throttle("sign_in", subjectForIp(await callerIp()), 10, 60);
  if (paced) return paced;

  const supabase = await createClient();
  const landing = landingAfterAuth(formData);
  const { error } = await supabase.auth.signInWithPassword({
    email: field(formData, "email").trim(),
    password: field(formData, "password"),
  });

  if (error) return { ok: false, message: authMessage(error.message) };

  // The session cookies are set. Drop every cached render so the shell picks
  // up the real identity instead of the signed out view.
  revalidatePath("/", "layout");
  redirect(landing);
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fieldErrors = validateSignUp(formData);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (!emailConfigured()) return { ok: false, message: NOT_CONNECTED_MESSAGE };

  // An account and a confirmation email per attempt, so this is the cheapest
  // of the three to abuse and the tightest of the three to allow. A household
  // or an office behind one address can still make five in an hour.
  const paced = await throttle("sign_up", subjectForIp(await callerIp()), 5, 3_600);
  if (paced) return paced;

  const firstName = field(formData, "firstName").trim();
  const surname = field(formData, "surname").trim();
  const nickname = field(formData, "nickname").trim();

  const email = field(formData, "email").trim();

  const supabase = await createClient();
  // The metadata here is what the database signup trigger reads into the
  // profile row, so nothing the person typed has to be asked for twice.
  const { data, error } = await supabase.auth.signUp({
    email,
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

  /*
   * With email confirmation switched on in Supabase there is no session yet.
   *
   * This used to end here, with "check your email, then sign in", and that
   * sentence was the whole problem. The confirmation email carries a link AND
   * a six digit code, and the code had nowhere to go: no screen on this
   * platform ever asked for one. Somebody who read the code instead of tapping
   * the link was simply stuck, and somebody who did tap the link was then told
   * to sign in a second time for an account they had just made.
   *
   * So the signup carries straight on to the code screen. The address is put
   * in a short-lived cookie rather than the URL, because an email address in a
   * query string is in the address bar, in history and in any referrer that
   * leaves the page.
   */
  if (!data.session) {
    await rememberPendingEmail(email);
    redirect(`/sign-up/verify?next=${encodeURIComponent(landingAfterAuth(formData))}`);
  }

  revalidatePath("/", "layout");
  redirect(landingAfterAuth(formData));
}

/**
 * The address a signup is waiting on, held between the form and the code
 * screen.
 *
 * httpOnly so no script can read it, thirty minutes because that is longer
 * than any confirmation code lives, and lax rather than strict so the cookie
 * survives arriving back from an email client.
 */
const PENDING_EMAIL_COOKIE = "nf_pending_email";
const PENDING_EMAIL_MAX_AGE = 30 * 60;

async function rememberPendingEmail(email: string): Promise<void> {
  const store = await cookies();
  store.set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_EMAIL_MAX_AGE,
  });
}

/** The address the code screen should be asking about, if we still know it. */
export async function pendingSignUpEmail(): Promise<string> {
  const store = await cookies();
  return store.get(PENDING_EMAIL_COOKIE)?.value ?? "";
}

async function forgetPendingEmail(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_EMAIL_COOKIE);
}

/** A confirmation code is six digits. Nothing else is worth sending upstream. */
const SIGNUP_CODE_RE = /^\d{6}$/;

/**
 * Turn the code from the confirmation email into a session, and go inside.
 *
 * This is the half of sign-up that did not exist. `verifyOtp` with type
 * "signup" both confirms the address and issues a session, so there is no
 * second sign-in and no dead end: the person types six digits and is in the
 * product on the next paint. The server client writes the session cookies, the
 * same ones the middleware reads, which is why this cannot be done from the
 * browser.
 *
 * A wrong code must not say whether the address is known. It says the code did
 * not match, which is true either way, and the throttle underneath is what
 * stops six digits being guessed.
 */
export async function verifySignUpCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").trim().toLowerCase();
  const token = field(formData, "code").replace(/\s+/g, "");

  const fieldErrors: Partial<Record<AuthField, string>> = {};
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter the email address you signed up with.";
  if (!SIGNUP_CODE_RE.test(token)) {
    fieldErrors.code = "The code is the six digits in the email we sent you.";
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  if (!emailConfigured()) return { ok: false, message: NOT_CONNECTED_MESSAGE };

  /* Ten a minute per address and twenty a minute per connection. A million
     codes against one address is the attack, and a person mistyping six digits
     three times is the case that must not be caught by it. */
  const pacedEmail = await throttle("sign_up_verify", subjectForEmail(email), 10, 60);
  if (pacedEmail) return pacedEmail;
  const pacedIp = await throttle("sign_up_verify_ip", subjectForIp(await callerIp()), 20, 60);
  if (pacedIp) return pacedIp;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error || !data.session) {
    return {
      ok: false,
      fieldErrors: {
        code: "That code did not match. Check the six digits in the email, or send a new one.",
      },
    };
  }

  await forgetPendingEmail();
  // The session cookies are set. Drop every cached render so the shell picks
  // the signed-in tree rather than the anonymous one it rendered a moment ago.
  revalidatePath("/", "layout");
  redirect(landingAfterAuth(formData));
}

/**
 * Finish an email confirmation, whichever shape the link arrived in.
 *
 * Supabase sends one of three things depending on how the project is set up
 * and which flow the client is on, and a confirmation that only handles one of
 * them is a confirmation that works until somebody changes a setting:
 *
 *   `code`         the PKCE authorisation code. Exchanged for a session. Needs
 *                  the verifier cookie the sign-up left behind, so it only
 *                  works in the browser the account was made in.
 *   `token_hash`   the hashed one-time token. Verified outright, with no
 *                  verifier needed, so this is the shape that survives opening
 *                  the email on a different device.
 *   access/refresh the implicit flow, which puts the tokens in the URL
 *                  FRAGMENT. A server never sees a fragment, which is why this
 *                  runs as an action called from the browser rather than as a
 *                  route handler: the handler was structurally incapable of
 *                  reading this case and quietly sent those people to
 *                  "link-expired".
 *
 * A server action rather than a route handler for the other half of that
 * reason too: only an action or a handler may write cookies, and only an
 * action can be called from a screen that is already showing the reader what
 * is happening.
 *
 * Returns the path to go to, so the caller navigates rather than this throwing
 * a redirect through a fetch. `next` is re-validated here and never trusted.
 */
export type VerificationOutcome =
  | { ok: true; next: string }
  | { ok: false; reason: "expired" | "invalid" | "unconfigured" };

export async function completeEmailVerification(input: {
  code?: string | undefined;
  tokenHash?: string | undefined;
  type?: string | undefined;
  accessToken?: string | undefined;
  refreshToken?: string | undefined;
  next?: string | undefined;
}): Promise<VerificationOutcome> {
  if (!emailConfigured()) return { ok: false, reason: "unconfigured" };

  const next = landingFromPath(input.next);
  const supabase = await createClient();

  if (input.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(input.code);
    if (error) return { ok: false, reason: "expired" };
  } else if (input.tokenHash) {
    /* The type decides what is being confirmed. Anything we do not recognise
       is treated as a signup, which is the only one that reaches this screen
       without a type in practice. */
    const type = ["signup", "email", "email_change", "recovery", "invite", "magiclink"].includes(
      input.type ?? "",
    )
      ? (input.type as "signup" | "email" | "email_change" | "recovery" | "invite" | "magiclink")
      : "signup";
    const { error } = await supabase.auth.verifyOtp({ token_hash: input.tokenHash, type });
    if (error) return { ok: false, reason: "expired" };
  } else if (input.accessToken && input.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    });
    if (error) return { ok: false, reason: "expired" };
  } else {
    return { ok: false, reason: "invalid" };
  }

  await forgetPendingEmail();
  // The session cookies are set. Drop every cached render so the shell picks
  // the signed-in tree rather than the anonymous one behind this screen.
  revalidatePath("/", "layout");
  return { ok: true, next };
}

/**
 * The same rule `landingAfterAuth` applies, for a value that arrives as a
 * string rather than on a form. A `next` that accepts an absolute address is
 * an open redirect, and the two leading slashes matter as much as the scheme
 * because `//evil.example` is protocol-relative and a browser reads it as a
 * host. A backslash matters too: the URL parser treats it as a separator, so
 * `/\evil.example` resolves off-origin.
 */
function landingFromPath(raw: string | undefined): string {
  if (typeof raw !== "string" || raw.length === 0) return "/home";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/home";
  return raw;
}

/**
 * Send another confirmation code to the same address.
 *
 * Deliberately quiet about whether the address has an account waiting. The
 * answer is the same sentence either way, because the difference is worth
 * something to somebody enumerating addresses and nothing to the person who
 * has just typed their own.
 */
export async function resendSignUpCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return {
      ok: false,
      fieldErrors: { email: "Enter the email address you signed up with." },
    };
  }
  if (!emailConfigured()) return { ok: false, message: NOT_CONNECTED_MESSAGE };

  /* One email per attempt, so this is metered like the sign-up it follows. */
  const paced = await throttle("sign_up_resend", subjectForEmail(email), 3, 900);
  if (paced) return paced;

  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/home")}`,
    },
  });

  await rememberPendingEmail(email);
  return {
    ok: true,
    message: "If that address is waiting on a code, a new one is on its way. It lasts an hour.",
  };
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
/* A `<form action={...}>` hands the action its FormData, which is how the
   hidden `next` field reaches the provider round trip. */
export async function startGoogleOAuth(formData: FormData): Promise<void> {
  await startOAuth("google", formData);
}

export async function startAppleOAuth(formData: FormData): Promise<void> {
  await startOAuth("apple", formData);
}

export async function startOAuth(
  provider: "google" | "apple",
  formData: FormData = new FormData(),
): Promise<AuthFormState> {
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
      /* The provider round trip loses everything except this URL, so where
         the person was going has to travel inside it. The callback re-checks
         the value against its own origin before using it. */
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(landingAfterAuth(formData))}`,
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

  /*
   * Counted twice, and both counts are spent before Supabase is asked
   * anything, so neither one can become an account-existence oracle: the
   * allowance for an address that has no account is spent exactly as fast as
   * the allowance for one that does.
   */
  const byIp = await throttle("password_reset_ip", subjectForIp(await callerIp()), 10, 3_600);
  if (byIp) return byIp;
  const byEmail = await throttle("password_reset_email", subjectForEmail(email), 3, 3_600);
  if (byEmail) return byEmail;

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
