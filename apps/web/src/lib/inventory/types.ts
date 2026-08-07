import type { Listing, ListingSearchFilter } from "../listings/types";

/**
 * The hybrid inventory provider contract.
 *
 * One interface, one method. A provider takes exactly the filter shape the
 * listing repository already speaks (`ListingSearchFilter`) and answers with
 * listings that are always `source: "partner"` and always `verified: false`,
 * because third-party stock can never carry our trust badge
 * (docs/HYBRID_INVENTORY.md sections 2 and 4).
 *
 * The result is deliberately a typed envelope rather than a bare array. "I have
 * no key, so I contributed nothing" and "I was called and broke, so I
 * contributed nothing" are different facts: the first is the normal state of
 * this codebase until the owner's keys land, the second is worth a server log
 * line. Callers that only want listings read `listings`, which is always
 * present and always safe to spread; callers that want to know why a shelf is
 * empty read `outcome`.
 *
 * A provider NEVER throws and never rejects. Every failure path resolves to an
 * envelope with zero listings, so search can never be delayed or broken by a
 * partner feed.
 */

export type PartnerProviderName = "places" | "liteapi";

type ProviderResultBase = {
  readonly provider: PartnerProviderName;
  /** Always present. Empty for every outcome except "ok". */
  readonly listings: readonly Listing[];
  /**
   * Server-side observations worth logging: offers dropped because their
   * currency was not naira, a partial upstream page, a cache miss storm. Never
   * rendered to a visitor.
   */
  readonly notes: readonly string[];
};

export type ProviderResult =
  | (ProviderResultBase & { readonly outcome: "ok" })
  /** No credentials in the environment. The provider did not make a call. */
  | (ProviderResultBase & { readonly outcome: "no_key"; readonly listings: readonly [] })
  /** The kill-switch feature flag is off for this provider. */
  | (ProviderResultBase & { readonly outcome: "disabled"; readonly listings: readonly [] })
  /**
   * This filter cannot contain anything this provider sells (a rentals-only
   * search asked a hotel feed). No call was made.
   */
  | (ProviderResultBase & { readonly outcome: "not_applicable"; readonly listings: readonly [] })
  /** The provider was called and failed. `reason` is for logs, never for the UI. */
  | (ProviderResultBase & {
      readonly outcome: "error";
      readonly listings: readonly [];
      readonly reason: string;
    })
  /** The provider ran out of its time budget and was abandoned mid-flight. */
  | (ProviderResultBase & { readonly outcome: "timeout"; readonly listings: readonly [] });

export interface InventoryProvider {
  readonly name: PartnerProviderName;
  /** Never throws. Resolves to an envelope, empty on every failure. */
  search(filter: ListingSearchFilter): Promise<ProviderResult>;
}

export function providerOk(
  provider: PartnerProviderName,
  listings: readonly Listing[],
  notes: readonly string[] = [],
): ProviderResult {
  return { provider, outcome: "ok", listings, notes };
}

export function providerNoKey(provider: PartnerProviderName): ProviderResult {
  return { provider, outcome: "no_key", listings: [], notes: [] };
}

export function providerDisabled(provider: PartnerProviderName): ProviderResult {
  return { provider, outcome: "disabled", listings: [], notes: [] };
}

export function providerNotApplicable(provider: PartnerProviderName): ProviderResult {
  return { provider, outcome: "not_applicable", listings: [], notes: [] };
}

export function providerError(
  provider: PartnerProviderName,
  reason: string,
  notes: readonly string[] = [],
): ProviderResult {
  return { provider, outcome: "error", listings: [], notes, reason };
}

export function providerTimeout(provider: PartnerProviderName): ProviderResult {
  return { provider, outcome: "timeout", listings: [], notes: [] };
}
