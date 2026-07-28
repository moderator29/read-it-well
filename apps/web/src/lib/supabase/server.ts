import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { requireSupabasePublicEnv } from "./env";

/**
 * Request-scoped server Supabase client.
 *
 * Reads and writes the auth cookies so the signed-in user's session flows
 * through server components, route handlers and server actions. Still bound to
 * the anon key, so RLS applies: this client acts as the user, never above them.
 * The cookie setter is wrapped in try/catch because server components may run in
 * a context where cookies are read-only; the middleware refresh handles writes
 * there.
 */
export async function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component where cookies cannot be set. The
          // session refresh in middleware is responsible for writing here.
        }
      },
    },
  });
}
