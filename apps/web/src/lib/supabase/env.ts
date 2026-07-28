/**
 * Supabase environment access.
 *
 * The URL and anon key are public by design: the anon key only ever acts through
 * Row Level Security, so it is safe in the browser bundle and carries the
 * NEXT_PUBLIC_ prefix. The service role key bypasses RLS entirely and is a hard
 * secret; it is read only through `serviceRoleKey()`, which throws if it is ever
 * evaluated in a browser bundle, so a server-only credential can never leak into
 * client code.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the public Supabase config is present. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/** Read the public config or fail loudly. Use where Supabase is required. */
export function requireSupabasePublicEnv(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

/**
 * The service role key. Server-only. Throws if reached from the browser, so the
 * secret cannot be bundled into client code even by accident.
 */
export function serviceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase service role key must never be read in the browser.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (key.length === 0) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return key;
}
