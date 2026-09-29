import "server-only";

import { randomUUID } from "node:crypto";

import { CRYPTO_PREFIX, isCryptoReference } from "@/lib/payments/references";

/**
 * A fresh reference for one crypto payment attempt: `rm-yc-<uuid>`.
 *
 * The prefix is the one `lib/payments/references.ts` already reserves for
 * crypto, so the Paystack reconciliation sweep (which only asks Paystack about
 * `provider = 'paystack'` rows) never looks for it at Paystack, and the
 * database refuses any other shape (`crypto_payments.reference` check).
 */
export function cryptoReference(): string {
  return `${CRYPTO_PREFIX}${randomUUID()}`;
}

export { isCryptoReference };
