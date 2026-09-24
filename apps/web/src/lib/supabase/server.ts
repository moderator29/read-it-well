import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { forwardedAgentHeaders } from "./agent";
import type { Database } from "./database.types";
import { requireSupabasePublicEnv } from "./env";

/** The incoming request's User-Agent, or null outside a request scope. */
async function visitorAgent(): Promise<string | null> {
  try {
    return (await headers()).get("user-agent");
  } catch {
    return null;
  }
}

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
    /*
     * SEC-08: sign-in, sign-up confirmation and the code exchange run here, in
     * a server action, so the request GoTrue sees is ours. Forwarding the
     * visitor's User-Agent is what lets `auth.sessions` record the device the
     * person actually signed in on (see `./agent.ts`).
     */
    global: { headers: forwardedAgentHeaders(await visitorAgent()) },
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
