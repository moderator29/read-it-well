import "server-only";

import type { AnyFiatProvider, FiatProviderId } from "../provider";
import { paystackProvider } from "./paystack";

/**
 * Call sites take a provider from here, as `AnyFiatProvider`, and ask `can()`
 * for anything beyond the core, rather than importing an adapter directly and
 * bypassing the capability check. Payluk returns null until its adapter is
 * written against the live docs.
 */
export function fiatProvider(id: FiatProviderId): AnyFiatProvider | null {
  switch (id) {
    case "paystack":
      return paystackProvider;
    case "payluk":
      return null;
  }
}
