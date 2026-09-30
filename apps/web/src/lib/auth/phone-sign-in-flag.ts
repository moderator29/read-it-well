/**
 * A2. Phone sign-in is OFF unless `PHONE_SIGNIN_ENABLED=true`. The door, the
 * actions and the Send SMS hook all read this one switch, so turning it off
 * closes every part at once. See docs/PHONE_SIGNIN.md for what must be set
 * up first (Termii, the WhatsApp template, the Supabase hook).
 */
export function phoneSignInEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.PHONE_SIGNIN_ENABLED ?? "").trim() === "true";
}
