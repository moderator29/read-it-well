import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "../supabase/database.types";
import { requireSupabasePublicEnv } from "../supabase/env";
import { describeDevice } from "./device";

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
const BROWSER_TOKEN: Record<string, string> = {
  Edge: "Edg/",
  Opera: "OPR/",
  "Samsung Internet": "SamsungBrowser/",
  "UC Browser": "UCBrowser/",
  Firefox: "Firefox/",
  Chrome: "Chrome/",
  Safari: "Safari/",
};

const PLATFORM_TOKEN: Record<string, string> = {
  Android: "Linux; Android",
  iOS: "iPhone",
  Windows: "Windows NT",
  macOS: "Macintosh; Mac OS X",
  ChromeOS: "CrOS",
  Linux: "X11; Linux",
};

/**
 * THE FAMILY, NOT THE VERSION. The new-device digest is md5 of whatever this
 * sends, so a full header would call every browser update a new device and
 * invite a "was this you?" and a 24-hour freeze each month. What goes on is
 * rebuilt from `describeDevice`'s fixed names (browser family and platform),
 * which `private.device_words` and the devices screen still read the same
 * way. An agent neither list knows is forwarded with every number removed.
 * Our own server's agent is not forwarded at all.
 */
export function stableAgent(agent: string | null | undefined): string | null {
  const raw = typeof agent === "string" ? agent.trim().slice(0, 512) : "";
  if (raw.length === 0) return null;
  const seen = describeDevice(raw);
  if (seen.kind === "server" || seen.kind === "unrecorded") return null;
  if (seen.kind === "device") {
    const platform = seen.platform ? PLATFORM_TOKEN[seen.platform] : null;
    const browser = seen.browser ? BROWSER_TOKEN[seen.browser] : null;
    return `Mozilla/5.0${platform ? ` (${platform})` : ""}${browser ? ` ${browser}` : ""}`;
  }
  const stripped = raw.replace(/\d+(?:[._]\d+)*/g, "").replace(/\s+/g, " ").trim();
  return stripped.length > 0 ? stripped : null;
}

export function forwardedAgentHeader(agent: string | null | undefined): Record<string, string> {
  const value = stableAgent(agent);
  return value ? { "user-agent": value } : {};
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
