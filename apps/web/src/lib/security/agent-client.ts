import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "../supabase/database.types";
import { requireSupabasePublicEnv } from "../supabase/env";

/**
 * A SERVER CLIENT THAT TELLS GOTRUE WHOSE BROWSER THIS IS. V-19.
 *
 * GoTrue stamps `auth.sessions.user_agent` from the User-Agent of the request
 * that CREATES the session, and on this platform that request is a server
 * action, so it was Node's own fetch: 99 of the 105 live sessions read
 * "node". `private.enqueue_new_device_email` and the V-19 new sign-in push
 * both key on a digest of that header, so every web sign-in, the owner's and
 * a stranger's alike, looked like the same device and nobody was told.
 *
 * `src/proxy.ts` already forwards the browser's header on the token refresh
 * (SEC-5), for the same reason. This is the same fix at the other door: the
 * three calls in `lib/auth/actions.ts` that create a session
 * (`signInWithPassword`, `verifyOtp`, `exchangeCodeForSession`) build their
 * client here instead of with `createClient`, and nothing else changes.
 *
 * The header is attacker controlled and capped at 512 characters; it is never
 * rendered (`lib/security/device.ts` and `private.device_words` map it onto a
 * fixed list of names). The IP is NOT forwarded, for the reason the proxy
 * gives: Supabase's own gateway decides what `auth.sessions.ip` holds.
 */
export function forwardedAgentHeader(agent: string | null | undefined): Record<string, string> {
  const value = typeof agent === "string" ? agent.trim() : "";
  return value.length > 0 ? { "user-agent": value.slice(0, 512) } : {};
}

export async function createClientWithAgent() {
  const { url, anonKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();
  const agent = (await headers()).get("user-agent");

  return createServerClient<Database>(url, anonKey, {
    global: { headers: forwardedAgentHeader(agent) },
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
          /* A server component cannot set cookies; the proxy refresh does. */
        }
      },
    },
  });
}
