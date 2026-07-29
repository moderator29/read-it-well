/**
 * Sign-up questionnaire options.
 *
 * Shared between the client form (to render the selects) and the server action
 * (to validate submissions against the same canonical lists). Kept in its own
 * module because "use server" files may only export async functions, and the
 * client must never import the server-only provider module.
 */
export const HEAR_ABOUT_OPTIONS = [
  "Instagram",
  "TikTok",
  "X",
  "Friend or family",
  "Google search",
  "Other",
] as const;

export type HearAboutOption = (typeof HEAR_ABOUT_OPTIONS)[number];

/** Referral codes are short alphanumerics; hyphens allowed for readability. */
export const REFERRAL_CODE_RE = /^[A-Za-z0-9-]{4,24}$/;
