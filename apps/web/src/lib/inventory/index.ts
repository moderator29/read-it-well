import "server-only";

import { isFeatureEnabled, type FeatureKey } from "../flags";
import type { Listing, ListingSearchFilter } from "../listings/types";
import { isPartnerId, parsePartnerId } from "./mapping";
import { amadeusConfigured, amadeusHotelById, amadeusProvider } from "./providers/amadeus";
import { placesConfigured, placesProvider, placesRestaurantById } from "./providers/places";
import {
  providerDisabled,
  providerTimeout,
  type InventoryProvider,
  type PartnerProviderName,
  type ProviderResult,
} from "./types";

/**
 * The hybrid inventory entry point. Server only: partner keys never reach the
 * browser, because nothing in this module is importable from a client component.
 *
 * Three guarantees, in the order they matter:
 *
 * 1. **Keyless is unchanged.** `partnerProvidersConfigured()` is a synchronous
 *    environment read. With no keys it is false, the repository never wraps
 *    itself in the partner decorator, and no code in this directory runs at all.
 * 2. **Nothing is ever slow.** Each provider is raced against a hard timeout and
 *    collected with `Promise.allSettled`, so a hanging or throwing feed costs
 *    the page its own results and nothing else. There is no path where a partner
 *    failure delays or breaks a search.
 * 3. **Flags are kill switches, keys are the gate.** `hybrid_hotels` and
 *    `hybrid_restaurants` fail open, as every flag in this codebase does, so a
 *    missing flag row means enabled. Keys are what actually decides whether a
 *    call happens, and they are checked first, so a fail-open flag can never
 *    cause a request we have no credential for.
 */

/** The hard ceiling on a provider, no matter what it is doing. */
const PROVIDER_TIMEOUT_MS = 2_500;

/**
 * How long one filter's partner answer is reused.
 *
 * Short enough that a hotel rate cannot go stale in a way a guest would notice,
 * and short enough to satisfy the brief-caching condition on Places details.
 * Long enough to matter: /search asks the repository twice on every render (once
 * for the results, once for the map's city floors), and a partner feed should be
 * paid for once per visitor, not once per query on the page.
 */
const RESULT_TTL_MS = 60_000;

const resultCache = new Map<string, { value: ProviderResult[]; expires: number }>();

/** The cache key is the filter, because the filter is the whole request. */
function filterKey(filter: ListingSearchFilter): string {
  return `${filter.kind ?? ""}|${filter.q?.trim().toLowerCase() ?? ""}`;
}

type Registered = {
  readonly provider: InventoryProvider;
  readonly flag: FeatureKey;
  readonly configured: () => boolean;
};

const REGISTRY: readonly Registered[] = [
  { provider: amadeusProvider, flag: "hybrid_hotels", configured: amadeusConfigured },
  { provider: placesProvider, flag: "hybrid_restaurants", configured: placesConfigured },
];

/**
 * True when at least one partner provider has its credentials.
 *
 * This is the switch the listing repository reads. It touches no network and no
 * database, so the keyless path stays exactly as expensive as it is today.
 */
export function partnerProvidersConfigured(): boolean {
  return REGISTRY.some((entry) => entry.configured());
}

/** Which providers have keys right now. For diagnostics and logs. */
export function configuredPartnerProviders(): PartnerProviderName[] {
  return REGISTRY.filter((entry) => entry.configured()).map((entry) => entry.provider.name);
}

/**
 * Resolve a provider's contribution, or its reason for having none.
 *
 * The flag read sits inside the raced promise on purpose: it is a cached
 * Postgres lookup, and if the database is slow it must eat the provider's
 * budget, not the page's.
 */
async function runProvider(
  entry: Registered,
  filter: ListingSearchFilter,
): Promise<ProviderResult> {
  const enabled = await isFeatureEnabled(entry.flag);
  if (!enabled) return providerDisabled(entry.provider.name);
  return entry.provider.search(filter);
}

/**
 * A provider, or its timeout, whichever lands first.
 *
 * The filter is passed down every call rather than parked in module scope: two
 * concurrent renders share this process, and a shared mutable filter would let
 * one visitor's search decide another visitor's partner results.
 */
function withTimeout(entry: Registered, filter: ListingSearchFilter): Promise<ProviderResult> {
  return Promise.race([
    runProvider(entry, filter),
    new Promise<ProviderResult>((resolve) => {
      const timer = setTimeout(
        () => resolve(providerTimeout(entry.provider.name)),
        PROVIDER_TIMEOUT_MS,
      );
      // Never hold a serverless invocation open for a timer.
      if (typeof timer === "object" && timer !== null && "unref" in timer) timer.unref();
    }),
  ]);
}

/**
 * Every enabled, keyed provider's answer to one filter.
 *
 * Providers run in parallel, each behind its own hard timeout, and are collected
 * with `allSettled` so a provider that manages to reject despite its own
 * contract still cannot reject this function.
 */
export async function searchPartners(
  filter: ListingSearchFilter = {},
): Promise<ProviderResult[]> {
  const keyed = REGISTRY.filter((entry) => entry.configured());
  if (keyed.length === 0) return [];

  const key = filterKey(filter);
  const hit = resultCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const settled = await Promise.allSettled(keyed.map((entry) => withTimeout(entry, filter)));

  const results = settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const name = keyed[index]?.provider.name ?? "amadeus";
    return providerTimeout(name);
  });

  // Only a complete answer is worth reusing. A timeout or an upstream failure is
  // not cached, so the next render gets a fresh attempt rather than inheriting a
  // bad minute.
  if (results.every((result) => result.outcome === "ok" || result.outcome === "not_applicable")) {
    resultCache.set(key, { value: results, expires: Date.now() + RESULT_TTL_MS });
    // The cache is a request coalescer, not a store. Keep it small.
    if (resultCache.size > 64) {
      for (const [entryKey, entry] of resultCache) {
        if (entry.expires <= Date.now()) resultCache.delete(entryKey);
      }
    }
  }
  return results;
}

/** Just the listings, for callers that do not care why a shelf is thin. */
export async function partnerListings(filter: ListingSearchFilter = {}): Promise<Listing[]> {
  const results = await searchPartners(filter);
  const out: Listing[] = [];
  for (const result of results) out.push(...result.listings);
  return out;
}

/**
 * One partner listing by the id its card carried.
 *
 * Details are refetched from the provider rather than restored from a snapshot,
 * which is both the Places licence condition and the only honest way to show a
 * hotel rate. Resolves null for any id this layer did not mint, for a provider
 * whose key is absent, and for anything the provider cannot answer.
 */
export async function partnerListingById(id: string): Promise<Listing | null> {
  if (!isPartnerId(id)) return null;
  const parsed = parsePartnerId(id);
  if (!parsed) return null;

  const entry = REGISTRY.find((candidate) => candidate.provider.name === parsed.provider);
  if (!entry || !entry.configured()) return null;
  if (!(await isFeatureEnabled(entry.flag))) return null;

  if (parsed.provider === "amadeus") return amadeusHotelById(parsed.reference);
  return placesRestaurantById(parsed.reference);
}

export { isPartnerId, parsePartnerId } from "./mapping";
export type { InventoryProvider, PartnerProviderName, ProviderResult } from "./types";
