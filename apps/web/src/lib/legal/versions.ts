/**
 * WHICH VERSION OF THE LEGAL DOCUMENTS A PERSON IS BEING SHOWN.
 *
 * ONE PLACE, AND THIS IS IT. `public.terms_acceptances` records the version
 * string a person accepted, and that record is only worth keeping if the
 * string means something, so every surface that asks somebody to accept and
 * every write that records that they did reads it from here.
 *
 * THE CONSTANT USED TO LIVE IN A COMPONENT. `components/auth/AcceptTerms.tsx`
 * declared `TERMS_VERSION` beside the tick box and its own comment said the
 * value would be written to `profiles.terms_version`. It moved here on 22
 * September 2026 when the acceptance was given a table of its own, and the
 * component now re-exports it, because a version string that two files can
 * each declare is a version string that will eventually disagree with itself.
 *
 * BUMP THE DATE WHEN THE DOCUMENT CHANGES IN A WAY THAT MATTERS. Fixing a typo
 * is not a new version; changing what a person is agreeing to is. The moment
 * one of these moves, the next acceptance from each person writes a NEW row
 * and the old row stays, which is what an auditor asks to see and what makes
 * the sentence in the terms about continued use after a change mean something
 * rather than being a hope.
 */

/**
 * The date the Terms, the Privacy policy and the Community Rules last changed
 * together. A date rather than a number so a stored row says which text was on
 * screen without anybody keeping a separate table of what version meant what.
 */
export const TERMS_VERSION = "2026-09-24";

/**
 * The privacy notice moves with them today and has its own constant anyway,
 * because it is the one most likely to change on its own: a new processor or a
 * new retention period is a privacy change and not a terms change.
 */
/* 2026-09-24 (STORE-08 / SEC-13 / STORE-07): processors named, location,
   push tokens, device records, AI and crash data described, the analytics
   claim removed, the deletion section brought to the purge that now runs. */
export const PRIVACY_VERSION = "2026-09-24";

/** The two documents a person accepts when they open an account. */
export const ACCEPTED_AT_SIGNUP = [
  { document: "terms" as const, version: TERMS_VERSION },
  { document: "privacy" as const, version: PRIVACY_VERSION },
];

export type LegalDocument = (typeof ACCEPTED_AT_SIGNUP)[number]["document"];
