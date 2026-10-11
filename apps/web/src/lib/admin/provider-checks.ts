import "server-only";
import { randomBytes } from "node:crypto";
import { paylukMerchantConfig, readMerchantBalance } from "@/lib/payouts/payluk-merchant";
import { getCallProvider, callProviderConfigured } from "@/lib/calls/provider";
import { apnsProviderToken } from "@/lib/push/transport/apns";
import { TERMII_DEFAULT_BASE } from "@/lib/phone-otp/termii";

/**
 * PROVIDER CHECKS (the founder, 8 October 2026: "trigger deployment and test
 * Payluk and livekit"). The sandbox that builds Vallo cannot reach Payluk,
 * LiveKit Cloud, Termii or MapTiler, so the checks run here, on the live
 * server, behind the operations scope.
 *
 * EVERY CHECK IS READ-ONLY OR SELF-CLEANING. No money moves, no message is
 * sent, no member sees anything:
 *   - Payluk: GET /v1/merchant/balance, once with the live key and once with
 *     the test key (staging), each only if that key is set.
 *   - LiveKit: create an empty throwaway room, read its participants, delete
 *     it. Proves the URL, the key and the secret against the real server.
 *   - Apple push: sign the provider token with the .p8 (no network).
 *   - Termii: GET /api/get-balance (reads the account, sends nothing).
 *   - MapTiler: fetch the style with the public key and the site's referer.
 * No key, secret or token is ever returned: only names, outcomes and codes.
 */

export type CheckOutcome = { name: string; ok: boolean; detail: string };

const TIMEOUT = 15_000;

async function paylukCheck(label: string, env: Record<string, string | undefined>): Promise<CheckOutcome> {
  const config = paylukMerchantConfig(env);
  if (!config) return { name: label, ok: false, detail: "Key not set (or not the right sk_live_ / sk_test_ prefix)." };
  const res = await readMerchantBalance(config, (url, init) => fetch(url, init));
  if ("failed" in res) return { name: label, ok: false, detail: `Payluk answered ${res.code}${res.detail ? `: ${res.detail}` : ""}` };
  return { name: label, ok: true, detail: `Connected to ${config.environment}. Balance read (${res.currency || "currency not stated"}).` };
}

async function liveKitCheck(): Promise<CheckOutcome> {
  const name = "LiveKit (calls)";
  if (!callProviderConfigured()) return { name, ok: false, detail: "LIVEKIT_URL, LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set." };
  const provider = getCallProvider();
  if (!provider) return { name, ok: false, detail: "Settings set but unreadable (check LIVEKIT_URL starts with wss://)." };
  const room = `vc_${randomBytes(16).toString("hex")}`;
  try {
    await provider.prepareRoom(room, { maxParticipants: 2, emptyTimeoutSeconds: 10 });
    const people = await provider.listParticipants(room);
    await provider.endRoom(room);
    return { name, ok: true, detail: `Created, read (${people.length} inside) and closed a throwaway room on the real server.` };
  } catch (error) {
    try {
      await provider.endRoom(room);
    } catch {
      /* best effort */
    }
    const message = error instanceof Error ? error.message.slice(0, 160) : "unknown error";
    return { name, ok: false, detail: `The server refused: ${message}` };
  }
}

function apnsCheck(): CheckOutcome {
  const name = "Apple push (APNs key)";
  const token = apnsProviderToken();
  if (!token.ok) return { name, ok: false, detail: token.error };
  return {
    name,
    ok: true,
    detail: `The .p8 key signs a provider token. Gateway: ${process.env.APNS_PRODUCTION === "true" ? "production" : "sandbox"}. A real push needs a device to register.`,
  };
}

async function termiiCheck(): Promise<CheckOutcome> {
  const name = "Termii (SMS codes)";
  const key = (process.env.TERMII_API_KEY ?? "").trim();
  if (!key) return { name, ok: false, detail: "TERMII_API_KEY not set." };
  const sender = (process.env.TERMII_SENDER_ID ?? "").trim();
  try {
    const res = await fetch(`${TERMII_DEFAULT_BASE}/api/get-balance?api_key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (res.status !== 200) return { name, ok: false, detail: `Termii answered HTTP ${res.status}.` };
    return {
      name,
      ok: Boolean(sender),
      detail: sender ? "Key accepted and balance read. Sender ID set." : "Key accepted and balance read, but TERMII_SENDER_ID is not set yet.",
    };
  } catch {
    return { name, ok: false, detail: "No answer from Termii (network or timeout)." };
  }
}

async function mapTilerCheck(): Promise<CheckOutcome> {
  const name = "MapTiler (maps)";
  const key = (process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "").trim();
  if (!key) return { name, ok: false, detail: "NEXT_PUBLIC_MAPTILER_KEY not set." };
  try {
    const res = await fetch(`https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`, {
      headers: { Referer: "https://www.vallospaces.com/", Origin: "https://www.vallospaces.com" },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    return res.status === 200
      ? { name, ok: true, detail: "Key accepted for www.vallospaces.com." }
      : { name, ok: false, detail: `MapTiler answered HTTP ${res.status} (an invalid key or a blocked origin).` };
  } catch {
    return { name, ok: false, detail: "No answer from MapTiler (network or timeout)." };
  }
}

export async function runProviderChecks(): Promise<CheckOutcome[]> {
  return Promise.all([
    paylukCheck("Payluk, live key", { PAYLUK_SECRET_KEY: process.env.PAYLUK_SECRET_KEY }),
    paylukCheck("Payluk, test key (staging)", { PAYLUK_TEST_SECRET_KEY: process.env.PAYLUK_TEST_SECRET_KEY }),
    liveKitCheck(),
    Promise.resolve(apnsCheck()),
    termiiCheck(),
    mapTilerCheck(),
  ]);
}
