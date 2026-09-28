/**
 * Whether THIS session was made by proving control of the email address
 * recently: a password-recovery link (`recovery`) or an emailed code or magic
 * link (`otp`), within the window below.
 *
 * That is what lets /reset-password set a new password without the old one.
 * Any other session (a password sign-in, a social sign-in, or a recovery made
 * yesterday) has to type the current password first, or a stolen session
 * could change the password and, because a new password ends every other
 * session, lock the owner out of their own account.
 *
 * `amr` is the access token's verified claim: an array of
 * `{ method, timestamp }`, timestamps in seconds.
 */
export const RECOVERY_WINDOW_SECONDS = 30 * 60;

export function isFreshEmailProof(amr: unknown, nowSeconds: number): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    if (method !== "recovery" && method !== "otp") return false;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return false;
    const age = nowSeconds - timestamp;
    return age >= -60 && age <= RECOVERY_WINDOW_SECONDS;
  });
}
