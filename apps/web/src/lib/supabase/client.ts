"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { requireSupabasePublicEnv } from "./env";

/**
 * Browser Supabase client.
 *
 * Uses the public URL and anon key, so every query it makes is subject to Row
 * Level Security. Safe to call from client components. One instance per call is
 * fine; the SSR helper deduplicates the underlying connection.
 */
export function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey, {
    /*
     * STORE-02. Every code and token exchange on this platform runs on the
     * server (`completeEmailVerification`, behind `/auth/callback`), where a
     * session made by a switched-off provider is refused. With URL detection
     * on, any page that mounts this client would exchange a `?code=` it found
     * in the address bar itself, so an OAuth round trip started by hand could
     * land a session without ever reaching that check. `Verifying` reads an
     * implicit-flow fragment on its own and hands it to the server action.
     */
    auth: { detectSessionInUrl: false },
  });
}
