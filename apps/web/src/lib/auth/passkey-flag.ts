/**
 * Whether passkey sign-in is switched on (`NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED`).
 *
 * Its own module, apart from `passkey-client.ts`, because the sign-in screen
 * asks this on every load and the client it guards carries supabase-js
 * (about 65KB gzipped). Asking the flag must never pull the client into the
 * screen's first load (R3-18): the client is imported at the moment of the
 * tap, by `PasskeySignIn`.
 */
export function passkeySignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED === "true";
}
