/**
 * STORE-07: CONSENT BEFORE ANYTHING A PERSON TYPES GOES TO A THIRD-PARTY AI.
 *
 * The assistant (`/api/assistant`) and the support chat (`/api/support`) send
 * what a person types to Anthropic, in the United States, to write the answer.
 * App Store guideline 5.1.2(i) requires that to be disclosed and agreed to
 * first, and the NDPA requires the transfer to be disclosed. So:
 *
 *   - the disclosure is shown before the first message (`AiConsentSheet`),
 *     with a way to reach a person that uses no AI (`/contact`);
 *   - agreeing records it: on the account (`profiles.settings.aiConsent`)
 *     when signed in, and in a cookie on this device either way, because the
 *     support chat on `/help` is open to people who cannot sign in;
 *   - BOTH ROUTES REFUSE (403, `ai-consent-required`) without it, whatever
 *     the screen did.
 *
 * `AI_CONSENT_VERSION` names the wording agreed to. Changing what is sent, or
 * to whom, means a new version, and everybody is asked again.
 *
 * Pure: no server imports, so the rule is tested without a request.
 */
export const AI_CONSENT_VERSION = "2026-09-24";
export const AI_CONSENT_COOKIE = "vallo_ai_consent";
/** A year; the account record is the longer-lived half. */
export const AI_CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const AI_CONSENT_REQUIRED_CODE = "ai-consent-required";

export const AI_DISCLOSURE = {
  title: "Before you ask",
  body:
    "Vallo's assistant is an AI. It is powered by Anthropic, a company in the United States. What you type here, and the Vallo listings it looks up for you, are sent to Anthropic to write the answer. Anthropic does not use it to train its models. Do not type card numbers, passwords or anything you would not put in a message to a stranger.",
  agree: "I understand, continue",
  decline: "Not now",
  human: "Prefer a person? Write to support, no AI involved",
} as const;

export type ConsentRecord = { version: string; at: string } | null | undefined;

/** Does this record (account or cookie) cover today's wording? */
export function consentCurrent(record: ConsentRecord): boolean {
  return Boolean(record && record.version === AI_CONSENT_VERSION && record.at.length > 0);
}

/** The cookie's value for a consent given now. */
export function consentCookieValue(now: Date = new Date()): string {
  return `${AI_CONSENT_VERSION}|${now.toISOString()}`;
}

/** Read a consent cookie value back into a record, or null. */
export function parseConsentCookie(raw: string | undefined | null): ConsentRecord {
  if (!raw) return null;
  const [version, at] = raw.split("|");
  if (!version || !at || Number.isNaN(Date.parse(at))) return null;
  return { version, at };
}

/** The refusal both AI routes answer without consent. */
export function consentRefusal(): Response {
  return Response.json(
    {
      code: AI_CONSENT_REQUIRED_CODE,
      message: "Agree to how the assistant works before asking it anything.",
    },
    { status: 403, headers: { "cache-control": "no-store" } },
  );
}
