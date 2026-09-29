import "server-only";

import type { CryptoRampProvider, ProviderId } from "../provider";
import { YellowCardProvider } from "./yellowcard";

/**
 * Which provider is in use. `CRYPTO_PROVIDER` names it; unset means Yellow
 * Card, the only one implemented. An unknown name is null, so the gate closes
 * rather than guessing.
 */
export function providerFor(id: ProviderId): CryptoRampProvider {
  switch (id) {
    case "yellowcard":
      return new YellowCardProvider();
  }
}

export function activeProvider(): CryptoRampProvider | null {
  const name = (process.env.CRYPTO_PROVIDER ?? "yellowcard").trim().toLowerCase() || "yellowcard";
  return name === "yellowcard" ? providerFor("yellowcard") : null;
}
