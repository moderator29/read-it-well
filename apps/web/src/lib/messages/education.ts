/**
 * The in-chat safety education moment. Client-safe module: no server imports.
 *
 * The first time a draft in a session drifts towards money talk, the composer
 * shows the canonical safety copy (docs/HYBRID_INVENTORY.md section 6) once,
 * inline and dismissible. The wording is owner canon and must not be edited.
 */

/** Draft patterns that surface the safety card. */
export const MONEY_TALK_RE = /\b(pay|payment|transfer|account|acct|bank)\b/i;

/** Canonical safety copy, verbatim. */
export const SAFETY_EDUCATION_COPY =
  "For your safety, keep every chat and payment inside RentMe. Deals made outside the platform are not protected by us. Pay only after you have inspected the property.";

/** Session storage key: the card shows once per browsing session. */
export const SAFETY_EDUCATION_SEEN_KEY = "nf_money_edu_seen";
