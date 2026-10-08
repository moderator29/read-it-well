import "server-only";

import { createLiveKitProvider } from "./livekit";
import type { CallProvider } from "./types";

/**
 * The configured media provider, or null when its keys are absent.
 *
 * Three server-only variables, never `NEXT_PUBLIC_`:
 *
 *   LIVEKIT_URL         wss://<project>.livekit.cloud (or a self-hosted server)
 *   LIVEKIT_API_KEY     the project's API key (an identifier, still kept server side)
 *   LIVEKIT_API_SECRET  the signing secret. Never logged, never sent to a browser.
 *
 * Unset, every call action answers "calls are not available right now" and
 * nothing is attempted, the same way every other integration here degrades
 * when its key is missing. The URL is the one value the browser ever learns,
 * inside `JoinCredentials`, because its client SDK has to connect to it.
 */

export function callProviderConfigured(): boolean {
  return (
    (process.env.LIVEKIT_URL ?? "").trim().length > 0 &&
    (process.env.LIVEKIT_API_KEY ?? "").trim().length > 0 &&
    (process.env.LIVEKIT_API_SECRET ?? "").trim().length > 0
  );
}

let cached: { key: string; provider: CallProvider } | null = null;

export function getCallProvider(): CallProvider | null {
  if (!callProviderConfigured()) return null;
  const url = (process.env.LIVEKIT_URL ?? "").trim();
  const apiKey = (process.env.LIVEKIT_API_KEY ?? "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET ?? "").trim();
  /* Rebuilt if the environment changes (a test, a key rotation in dev); the
     cache key holds no secret, only the key id and the URL. */
  const key = `${url}|${apiKey}|${apiSecret.length}`;
  if (cached && cached.key === key) return cached.provider;
  try {
    const provider = createLiveKitProvider({ url, apiKey, apiSecret });
    cached = { key, provider };
    return provider;
  } catch {
    return null;
  }
}
