/**
 * Sign-up questionnaire options.
 *
 * Shared between the client form (to render the selects) and the server action
 * (to validate submissions against the same canonical lists). Kept in its own
 * module because "use server" files may only export async functions, and the
 * client must never import the server-only provider module.
 *
 * A VALUE and a LABEL KEY, not one string doing both.
 *
 * The value is what the browser posts, what the server validates and what is
 * written to `profiles.hear_about`. It is English and it is frozen: every row
 * saved before this list grew a second column holds one of these six words, so
 * translating the string in place would have quietly stopped the validator
 * matching the answers already stored. The label the person reads comes out of
 * the dictionary under `labelKey`, in whichever of the four languages they
 * chose, and nothing about it ever reaches the database.
 */
export const HEAR_ABOUT_OPTIONS = [
  { value: "Instagram", labelKey: "instagram" },
  { value: "TikTok", labelKey: "tiktok" },
  { value: "X", labelKey: "x" },
  { value: "Friend or family", labelKey: "friendOrFamily" },
  { value: "Google search", labelKey: "googleSearch" },
  { value: "Other", labelKey: "other" },
] as const;

export type HearAboutOption = (typeof HEAR_ABOUT_OPTIONS)[number]["value"];

/** The stored values on their own, which is all the server has to check. */
export const HEAR_ABOUT_VALUES: readonly string[] = HEAR_ABOUT_OPTIONS.map(
  (option) => option.value,
);

/** Referral codes are short alphanumerics; hyphens allowed for readability. */
export const REFERRAL_CODE_RE = /^[A-Za-z0-9-]{4,24}$/;
