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
  return createBrowserClient<Database>(url, anonKey);
}
