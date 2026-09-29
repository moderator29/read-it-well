import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CryptoOffer } from "@/components/app/payments/crypto/offer";
import { resolveSession } from "@/lib/actions/session";
import { cryptoAvailability } from "./availability";

/**
 * The crypto offer for the signed-in payer, for a payment page to pass to its
 * panel. Null whenever the platform half of the gate is closed, so a
 * deployment with crypto off renders nothing about it. Never throws.
 */
export async function cryptoOfferForViewer(): Promise<CryptoOffer | null> {
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return null;
    const availability = await cryptoAvailability(session.supabase as unknown as SupabaseClient, session.user.id);
    if (availability.gate.open) {
      return {
        kind: "open",
        providerName: availability.providerName ?? "the provider",
        pairs: availability.pairs.map((pair) => ({
          asset: pair.asset,
          network: pair.network,
          assetName: pair.assetName,
          networkName: pair.networkName,
          decimals: pair.decimals,
        })),
      };
    }
    return availability.gate.reason === "kyc_required" ? { kind: "kyc" } : null;
  } catch {
    return null;
  }
}
