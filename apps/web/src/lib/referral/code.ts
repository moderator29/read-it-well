/**
 * A5. Invite codes, client safe: the shape the database allots
 * (`public.referral_codes`, six characters with no 0/O or 1/I) and the cookie
 * the invite door leaves for sign-up to read.
 */
export const INVITE_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const INVITE_COOKIE = "vallo_invite";
/** Thirty days: long enough to come back and sign up, short enough to mean this invite. */
export const INVITE_COOKIE_SECONDS = 30 * 24 * 60 * 60;

export function normaliseInviteCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  return INVITE_CODE_RE.test(code) ? code : null;
}

export function invitePath(code: string): string {
  return `/join/${code}`;
}
