"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { browserCookieMethods } from "@/lib/supabase/cookie-policy";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * A3. PASSKEY SIGN-IN, BEHIND `NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED`.
 *
 * supabase-js 2.110 carries passkeys as an EXPERIMENTAL API
 * (`auth.experimental.passkey`, `signInWithPasskey`, `registerPasskey`), and
 * the project must switch them on (Authentication, Passkeys, with the
 * relying party `vallospaces.com`). So this is off by default, and a client
 * of its own (not the shared singleton) carries the opt-in, writing the same
 * session cookies as every other sign-in.
 *
 * The native shell is excluded by the door: a WebView needs associated
 * domains for passkeys, which are not set up.
 */
export function passkeySignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED === "true";
}

export function passkeyClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey, {
    isSingleton: false,
    auth: { detectSessionInUrl: false, experimental: { passkey: true } } as never,
    cookies: browserCookieMethods(),
  });
}
