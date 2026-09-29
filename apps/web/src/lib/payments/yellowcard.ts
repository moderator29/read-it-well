import "server-only";

import { YellowCardProvider, verifyYellowCardSignature } from "@/lib/crypto/providers/yellowcard";

/**
 * The old import path for Yellow Card, kept as a thin door.
 *
 * Crypto used to live here as wallet top-ups, then as a single naira
 * "collection" that never quoted a crypto amount. Both are retired. Crypto is
 * now an alternative way to pay an existing charge, with no custody, and it
 * lives in `lib/crypto/` behind a provider interface
 * (`lib/crypto/provider.ts`, `lib/crypto/providers/yellowcard.ts`). See
 * docs/MONEY_ARCHITECTURE.md, "Crypto".
 *
 * What remains here is what other modules and the signature test still import.
 */

/** Keys, host and webhook secret all present. */
export function isYellowCardConfigured(): boolean {
  return new YellowCardProvider().isConfigured();
}

/** True only for a body Yellow Card signed with YELLOWCARD_WEBHOOK_SECRET. Never throws. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return verifyYellowCardSignature(rawBody, signature, (process.env.YELLOWCARD_WEBHOOK_SECRET ?? "").trim());
}
