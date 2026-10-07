import "server-only";

import { cache } from "react";
import { flagIsOn } from "../../flags/read";
import type { FiatProviderId } from "../provider";

/**
 * THE PER-PROVIDER KILL SWITCH. Read once per request (`react.cache`), so a
 * render and the server action it posts to each read it fresh.
 *
 * Two layers. `PAYMENTS_KILL_PAYSTACK=1` (or `_PAYLUK`) in the environment
 * stops a provider with no database at all, which is what an outage needs.
 * Then a feature flag. The defaults differ by provider ON PURPOSE:
 *  - Paystack is live today, so it FAILS OPEN: only an explicit
 *    `payments_paystack_off` flag stops it, and a failed read does not. A
 *    database blip must not stop every payment on the platform.
 *  - Payluk has never been live, so it FAILS CLOSED: it runs only while
 *    `payments_payluk_on` is explicitly on, and a failed read means off. That
 *    flag is the founder's escrow switch-on (3A.5), nobody else's.
 *
 * Gate only what STARTS money movement (collect, charge, refund). Never gate
 * verify, webhooks or reconciliation: money already taken must still be
 * recorded.
 */
export const providerEnabled = cache(async (id: FiatProviderId): Promise<boolean> => {
  const killed = id === "paystack" ? process.env.PAYMENTS_KILL_PAYSTACK : process.env.PAYMENTS_KILL_PAYLUK;
  if (killed === "1") return false;
  if (id === "paystack") return !(await flagIsOn("payments_paystack_off"));
  return flagIsOn("payments_payluk_on");
});

export class FiatProviderDisabled extends Error {
  constructor(readonly provider: FiatProviderId) {
    super(`${provider} is switched off.`);
    this.name = "FiatProviderDisabled";
  }
}

export async function assertProviderEnabled(id: FiatProviderId): Promise<void> {
  if (!(await providerEnabled(id))) throw new FiatProviderDisabled(id);
}
