import "server-only";

import {
  can,
  requireCapability,
  type AnyFiatProvider,
  type ChargeSplit,
  type CollectInput,
  type FiatProviderId,
} from "../provider";
import { providerEnabled } from "./kill-switch";
import { paystackProvider } from "./paystack";
import { PAYLUK_ESCROW_FLOWS_BUILT, paylukProvider } from "./payluk";

export { assertProviderEnabled, FiatProviderDisabled, providerEnabled } from "./kill-switch";

/**
 * Call sites take a provider from here, as `AnyFiatProvider`, and ask `can()`
 * for anything beyond the core, rather than importing an adapter directly and
 * bypassing the capability check. Payluk is registered whether or not a key
 * is present: `isConfigured()` says which, and every member_wallet method
 * answers `not_configured` without one.
 */
export function fiatProvider(id: FiatProviderId): AnyFiatProvider | null {
  switch (id) {
    case "paystack":
      return paystackProvider;
    case "payluk":
      return paylukProvider;
  }
}

/** Paystack is always registered; this only spares every call site the null check. */
export function paystackSeam(): AnyFiatProvider {
  return fiatProvider("paystack") ?? paystackProvider;
}

/**
 * True only when an escrow payment could genuinely be held: a registered
 * provider that declares `hold_in_escrow`, the escrow flows themselves built
 * (phases 11 and 12, `PAYLUK_ESCROW_FLOWS_BUILT`, true from D77), a key
 * present, and its switch on. In practice, from D77: the key and
 * `payments_payluk_on`, nothing else (PAYMENTS_KILL_PAYLUK=1 stops it in an outage).
 */
export async function escrowRailLive(): Promise<boolean> {
  const p = fiatProvider("payluk");
  if (!p || !can(p, "hold_in_escrow") || !PAYLUK_ESCROW_FLOWS_BUILT || !p.isConfigured()) return false;
  return providerEnabled("payluk");
}

/** The member balance rail: the adapter registered, a key present, and the founder's switch on. */
export async function memberWalletRailLive(): Promise<"live" | "not_configured" | "switched_off"> {
  const p = fiatProvider("payluk");
  if (!p || !can(p, "member_wallet") || !p.isConfigured()) return "not_configured";
  return (await providerEnabled("payluk")) ? "live" : "switched_off";
}

/** The provider's full record of a reference. Read-only, so never gated by the kill switch. */
export async function verifyRecord(p: AnyFiatProvider, reference: string) {
  requireCapability(p, "verify_with_record");
  return p.verifyRecord(reference);
}

export type OpenedCheckout = { reference: string; authorizationUrl: string; accessCode: string };

/**
 * Open a hosted checkout: split when a split is given (which requires
 * `split_at_charge`), plain otherwise. The input reaches the provider exactly
 * as given. The caller gates it with `assertProviderEnabled` first, because
 * this starts money movement.
 */
export async function openCheckout(
  p: AnyFiatProvider,
  input: CollectInput & { split?: ChargeSplit },
): Promise<OpenedCheckout> {
  let done;
  if (input.split) {
    requireCapability(p, "split_at_charge");
    done = await p.collectWithSplit({ ...input, split: input.split });
  } else {
    done = await p.collect(input);
  }
  return { reference: done.reference, authorizationUrl: done.redirectUrl, accessCode: done.accessCode ?? "" };
}
