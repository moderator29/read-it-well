import "server-only";

import { isFeatureEnabled, type FeatureKey } from "../flags";
import type { Listing, ListingSearchFilter } from "../listings/types";
import { isPartnerId, parsePartnerId } from "./mapping";
import { amadeusConfigured, amadeusHotelById, amadeusProvider } from "./providers/amadeus";
import { liteapiConfigured, liteapiHotelById, liteapiProvider } from "./providers/liteapi";
import {
  placesById,
  placesConfigured,
  placesHotelProvider,
  placesRestaurantProvider,
} from "./providers/places";
import {
  providerDisabled,
  providerNoKey,
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

/* ------------------------------------------------------------------- reporting
 *
 * Every failure in this directory is swallowed on purpose, because a partner
 * feed must never break a search. The cost of that is an operator who cannot
 * tell a key that is working from a key that is silently answering 401: the
 * shelf looks the same either way, thin and blameless.
 *
 * So the outcome is logged even though it is never rendered. This is the only
 * place in the layer that writes anything, and it writes to the server log,
 * which on Vercel is the runtime log for the deployment. `providerError`
 * already carries a reason built from the status code and the host and never
 * from a request body, so a credential cannot reach a log line through here.
 *
 * "no_key" and "not_applicable" are NOT logged. Both are the normal, correct
 * state of a provider on most requests, and a log that reports normality is a
 * log nobody reads.
 */

/** How long the same provider and outcome stays quiet after being reported. */
const LOG_QUIET_MS = 60_000;

const lastLogged = new Map<string, number>();

function report(result: ProviderResult): void {
  if (result.outcome === "ok" || result.outcome === "no_key" || result.outcome === "not_applicable") {
    return;
  }

  // A provider that is down is down on every render, and search runs twice per
  // page. Without this, one bad key writes thousands of identical lines an hour
  // and buries everything else in the log.
  const key = `${result.provider}:${result.outcome}`;
  const now = Date.now();
  const previous = lastLogged.get(key);
  if (previous !== undefined && now - previous < LOG_QUIET_MS) return;
  lastLogged.set(key, now);

  const detail = result.outcome === "error" ? `: ${result.reason}` : "";
  const notes = result.notes.length > 0 ? ` (${result.notes.join("; ")})` : "";
  console.warn(`[inventory] ${result.provider} ${result.outcome}${detail}${notes}`);
}

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

/*
 * Four registrations, three provider names.
 *
 * Places appears twice because it serves two shelves that must be able to be
 * switched off independently: `hybrid_restaurants` and `hybrid_hotels` are
 * separate kill switches and the registry gates one flag per entry. Both
 * entries answer to the name "places", so the partner id scheme is unchanged
 * and a card minted before hotels existed still resolves.
 *
 * LiteAPI is the hotel RATE feed, and it shares `hybrid_hotels` with Places
 * deliberately: they describe the same shelf from two angles, Places supplying
 * coverage without prices and LiteAPI supplying prices, and one switch that
 * turns the partner hotel shelf off is easier to reason about under incident
 * than two that each turn off half of it. De-duplication decides which record
 * of a hotel both feeds returned actually shows (`dedupe.ts`).
 *
 * Amadeus stays registered and stays keyless, and it can no longer become
 * anything else. Its Self-Service portal was decommissioned on 17 July 2026
 * and the keys were disabled with it, so the endpoints `providers/amadeus.ts`
 * calls now answer 401 to everybody, permanently. An earlier version of this
 * note said the code was "two environment variables away" from working again;
 * that is not true and was the reason this file kept a provider nobody could
 * ever turn on. Amadeus Enterprise is a different portal, a different auth
 * flow and a different API surface, so reaching it would be a new provider
 * rather than a credential. The 417 lines are kept only because deleting
 * another engineer's complete module is the owner's call, not this change's;
 * it is recorded as dead code in KNOWN_GAPS.md. With no credentials it costs
 * one synchronous string check per search and runs nothing.
 */
const REGISTRY: readonly Registered[] = [
  { provider: amadeusProvider, flag: "hybrid_hotels", configured: amadeusConfigured },
  { provider: liteapiProvider, flag: "hybrid_hotels", configured: liteapiConfigured },
  { provider: placesRestaurantProvider, flag: "hybrid_restaurants", configured: placesConfigured },
  { provider: placesHotelProvider, flag: "hybrid_hotels", configured: placesConfigured },
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

/**
 * Which providers have keys right now. For diagnostics and logs.
 *
 * Deduplicated, because Places is registered twice and reporting it twice would
 * read as two credentials where there is one.
 */
export function configuredPartnerProviders(): PartnerProviderName[] {
  return [
    ...new Set(REGISTRY.filter((entry) => entry.configured()).map((entry) => entry.provider.name)),
  ];
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

/** Whether a registration's flag is the one that governs this category. */
function governs(entry: Registered, kind: Listing["kind"]): boolean {
  return entry.flag === (kind === "hotel" ? "hybrid_hotels" : "hybrid_restaurants");
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
    const name = keyed[index]?.provider.name ?? "liteapi";
    return providerTimeout(name);
  });

  // Reported before the cache decision, so a failure is seen every time it
  // happens rather than only on the renders that miss the cache.
  for (const result of results) report(result);

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

  const entries = REGISTRY.filter((candidate) => candidate.provider.name === parsed.provider);
  if (entries.length === 0 || !entries[0]!.configured()) return null;

  /*
   * A partner id carries a provider and a reference, never a category, so for
   * Places there is no way to know which flag governs this venue until it has
   * been fetched and classified. So the gate is applied twice: any of the
   * provider's shelves being live is enough to spend the request, and the
   * shelf this venue actually belongs to must be live for it to be returned.
   *
   * Getting that order wrong in either direction is a real fault. Checking only
   * the first entry would let a hotel through on the restaurant flag; refusing
   * to fetch until the category is known would mean never knowing it.
   */
  const flags = await Promise.all(entries.map((entry) => isFeatureEnabled(entry.flag)));
  if (!flags.some(Boolean)) return null;

  // Both hotel feeds mint an id that carries a category implicitly: they sell
  // nights and nothing else, so the shelf a card belongs to is known before the
  // fetch and the flag above has already settled it.
  if (parsed.provider === "amadeus") return amadeusHotelById(parsed.reference);
  if (parsed.provider === "liteapi") return liteapiHotelById(parsed.reference);

  const listing = await placesById(parsed.reference);
  if (!listing) return null;
  const governing = entries.find((entry, index) => flags[index] && governs(entry, listing.kind));
  return governing ? listing : null;
}

/**
 * What each partner provider does when actually asked, right now.
 *
 * This exists because every failure in this layer is deliberately invisible to
 * a visitor, which leaves an operator unable to answer the only question that
 * matters the day a key lands: is it working? A thin shelf looks identical
 * whether the key is absent, refused, rate limited or simply pointed at a city
 * with no supply, and those need four different responses.
 *
 * It runs a REAL search rather than reporting cached state, because a key that
 * parses is not a key that works. The cost is one live request per provider,
 * which is why it sits behind the admin guard at its call site and is not
 * something any page renders.
 *
 * `configured` and `flag` are read separately from the outcome on purpose: a
 * provider that has a key but a flag turned off answers "disabled", and knowing
 * which of the two is responsible is the difference between fixing it in the
 * database and fixing it in Vercel.
 */
export type ProviderHealth = {
  readonly provider: PartnerProviderName;
  readonly flag: FeatureKey;
  /** Whether the credentials for this provider are present in the environment. */
  readonly configured: boolean;
  /** Whether its kill switch is on. */
  readonly enabled: boolean;
  readonly outcome: ProviderResult["outcome"];
  /** Only ever present on an error outcome. Status code and host, never a body. */
  readonly reason?: string;
  readonly listings: number;
  readonly notes: readonly string[];
  readonly millis: number;
};

export async function partnerHealth(
  filter: ListingSearchFilter = {},
): Promise<ProviderHealth[]> {
  return Promise.all(
    REGISTRY.map(async (entry): Promise<ProviderHealth> => {
      const configured = entry.configured();
      const enabled = await isFeatureEnabled(entry.flag).catch(() => false);
      const started = Date.now();
      // Through the same timeout the real search uses, so a hanging provider
      // reports a timeout here exactly as a visitor would experience it.
      const result = configured
        ? await withTimeout(entry, filter)
        : providerNoKey(entry.provider.name);

      return {
        provider: entry.provider.name,
        flag: entry.flag,
        configured,
        enabled,
        outcome: result.outcome,
        ...(result.outcome === "error" ? { reason: result.reason } : {}),
        listings: result.listings.length,
        notes: result.notes,
        millis: Date.now() - started,
      };
    }),
  );
}

export { isPartnerId, parsePartnerId } from "./mapping";
export type { InventoryProvider, PartnerProviderName, ProviderResult } from "./types";
