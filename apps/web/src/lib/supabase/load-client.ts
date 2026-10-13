import type { createClient } from "@/lib/supabase/client";

export type BrowserClient = ReturnType<typeof createClient>;

/**
 * THE BROWSER CLIENT, LOADED AT THE MOMENT OF USE.
 *
 * `./client` pulls `@supabase/ssr` and supabase-js (about 65KB gzipped) into
 * whatever bundle imports it statically. The routes that need it only after
 * an event (an upload on choose, a check-in handed over, a channel opened
 * after mount) import THIS instead, so the chunk is fetched when the member
 * does the thing and never sits in the route's first load.
 *
 * It resolves to `null` when the chunk cannot be fetched (offline, a
 * deploy that moved it), so each caller can say what it already says when an
 * upload does not go through, rather than showing a different failure for a
 * different cause. A client that throws on creation (missing public env) still
 * throws, exactly as `createClient()` did.
 */
export async function loadBrowserClient(): Promise<BrowserClient | null> {
  let mod: typeof import("@/lib/supabase/client");
  try {
    mod = await import("@/lib/supabase/client");
  } catch {
    return null;
  }
  return mod.createClient();
}
