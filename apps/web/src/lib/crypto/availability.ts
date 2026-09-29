import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { flagIsOn } from "@/lib/flags/read";
import { parseEnabledAssets, type AssetPair } from "./assets";
import { cryptoGate, type CryptoGate } from "./gate";
import { activeProvider } from "./providers";

/** The feature flag row. Off on live until the founder turns it on. */
export const CRYPTO_FLAG = "crypto_payments";

export type CryptoAvailability = {
  gate: CryptoGate;
  pairs: AssetPair[];
  providerName: string | null;
};

/** The pairs this deployment offers, from CRYPTO_ENABLED_ASSETS. */
export function enabledPairs(): AssetPair[] {
  return parseEnabledAssets(process.env.CRYPTO_ENABLED_ASSETS);
}

/**
 * Whether this payer has a matched identity check, and the name it matched.
 *
 * Read with whatever client the caller holds: the payer's own session reads
 * their own row under `identity_verifications_select_own`; the service role
 * reads anybody's. A failed read is "not verified", the safe direction.
 */
export async function payerKyc(
  client: SupabaseClient,
  userId: string,
): Promise<{ verified: boolean; legalName: string | null; verificationId: string | null }> {
  try {
    const { data, error } = await client
      .from("identity_verifications")
      .select("id, legal_name")
      .eq("subject_id", userId)
      .eq("outcome", "matched")
      .order("decided_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return { verified: false, legalName: null, verificationId: null };
    const row = data as { id: string; legal_name: string | null };
    return { verified: true, legalName: row.legal_name ?? null, verificationId: row.id };
  } catch {
    return { verified: false, legalName: null, verificationId: null };
  }
}

/**
 * Everything the gate needs, read for one payer. The platform half is read
 * first and short-circuits, so a deployment with crypto off never even asks
 * about the person's identity.
 */
export async function cryptoAvailability(client: SupabaseClient, userId: string | null): Promise<CryptoAvailability> {
  const provider = activeProvider();
  const pairs = enabledPairs();
  const flagOn = await flagIsOn(CRYPTO_FLAG);
  const platform = {
    flagOn,
    providerConfigured: provider?.isConfigured() ?? false,
    directSettlementConfirmed: provider?.isDirectSettlementReady() ?? false,
    enabledAssetCount: pairs.length,
  };
  const platformGate = cryptoGate({ ...platform, payerKycVerified: true });
  if (!platformGate.open || !userId) {
    return {
      gate: platformGate.open ? { open: false, reason: "kyc_required", platform: false } : platformGate,
      pairs: [],
      providerName: null,
    };
  }
  const kyc = await payerKyc(client, userId);
  const gate = cryptoGate({ ...platform, payerKycVerified: kyc.verified });
  return { gate, pairs: gate.open ? pairs : [], providerName: gate.open ? (provider?.displayName ?? null) : null };
}
