/**
 * WAS THIS CODE SIGN-IN SOMEBODY'S FIRST? (founder, 30 September: the
 * success moment "when sign up code is successful".)
 *
 * A code sign-in by email or by phone confirms the address or the number it
 * was sent to. Supabase stamps `email_confirmed_at` or `phone_confirmed_at`
 * the first time that happens and never again, so a stamp from the last few
 * minutes means THIS code confirmed it: nobody had signed in with it before.
 * That is the one fact "Welcome to Vallo, your account is ready" rests on,
 * and it is read from the user the verify call returned, not guessed.
 *
 * Pure, so the edges are tested without an auth server.
 */
export const JUST_CONFIRMED_MS = 5 * 60 * 1000;

export type ConfirmedStamps = {
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
};

export function isFirstCodeSignIn(user: ConfirmedStamps | null | undefined, via: "email" | "phone", now: number = Date.now()): boolean {
  const stamp = via === "email" ? user?.email_confirmed_at : user?.phone_confirmed_at;
  if (!stamp) return false;
  const at = Date.parse(stamp);
  /* A clock a minute ahead of ours is still "just now"; anything older than
     the window, or unreadable, is not a first. */
  return Number.isFinite(at) && at <= now + 60_000 && now - at <= JUST_CONFIRMED_MS;
}
