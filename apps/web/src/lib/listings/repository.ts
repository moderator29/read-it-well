import "server-only";
import {
  isPartnerId,
  partnerListingById,
  partnerListings,
  partnerProvidersConfigured,
} from "../inventory";
import { dedupeListings } from "../inventory/dedupe";
import { isSupabaseConfigured } from "../supabase/env";
import { diversePick, matchesFilter } from "./filter";
import { SupabaseListingRepository } from "./supabase-repository";
import type { Listing, ListingRepository, ListingSearchFilter } from "./types";

/**
 * Listing data access.
 *
 * Discovery has gone through this one interface since day one, so every
 * surface (home, search, the map, the rent market, listing detail, bookings,
 * the assistant tool) widens the moment the source behind it widens, with no
 * component changes (Master Rules 8 and 66).
 *
 * What the factory returns:
 *   Supabase configured  real published inventory from Postgres, with partner
 *                        venues appended when a provider key is present.
 *   otherwise            nothing, honestly. See `EmptyListingRepository`.
 *   NF_DATA_SOURCE=api   the unimplemented platform API, left untouched.
 *
 * This used to describe a second source: a local catalogue of twenty-three
 * designed places that filled the shelves behind real inventory and answered
 * alone when the database was unreachable. That catalogue is gone, and the
 * note below its removal explains why. What replaced it is not another source
 * but an honest absence, so a thin shelf is now a true statement about supply
 * rather than a shelf stocked with places that do not exist.
 *
 * Trust is still one-directional and that part is unchanged: first-party rows
 * lead, partner stock is appended, and partner stock can never carry the
 * verified badge or in-platform messaging.
 */

/*
 * THERE IS NO CATALOGUE HERE ANY MORE.
 *
 * This module used to carry twenty-three invented places: three hotels, two
 * restaurants, six rentals, three apartments, three homes, three shortlets, a
 * villa and two experiences, photographed with Unsplash stock and priced in
 * kobo. Twenty-two of them carried `verified: true`, with ratings between 4.6
 * and 4.9 and review counts between 41 and 142.
 *
 * The verified badge is this platform's own promise: it means somebody checked
 * the place. It sat on inventory nobody checked, because there was nothing to
 * check. Nothing in discovery said so either; `isSeed` was read in exactly two
 * places, the agent dashboard's note and a disabled Load more control. Search
 * results, listing pages and the map said nothing at all.
 *
 * The map made it worse rather than better. These entries carried no
 * coordinates, so `RealMap` placed each one on the real centroid of its named
 * area, which is precisely what made an invented address read as a located
 * one.
 *
 * So the catalogue is gone, not labelled. Discovery now returns what is
 * actually there: agent inventory from Postgres, and partner venues from
 * Google Places, which carry `verified: false` and their attribution. Where
 * that is nothing, the screens say nothing, and every one of them already
 * draws a designed empty state. An empty shelf is a true statement about a
 * catalogue that has not been filled yet. A full shelf of places that do not
 * exist is not.
 */

/**
 * What discovery is when nothing is configured: empty, and honest about it.
 *
 * This was the seed repository and it answered from a catalogue of invented
 * places. It answers with nothing now. That is not a degradation, it is the
 * true answer: with no Supabase credentials there is no inventory, and every
 * screen that reads this already draws a designed empty state rather than
 * assuming a result.
 *
 * `isSeed` stays true because search reads it to keep Load more disabled, and
 * there is still no pagination cursor behind an unconfigured platform.
 */
class EmptyListingRepository implements ListingRepository {
  readonly isSeed = true;

  /* The arguments are accepted and ignored on purpose: this class satisfies
     the same interface every other repository does, so a caller never has to
     know which one it is holding. */
  async recommended(_limit?: number): Promise<Listing[]> {
    return [];
  }

  async search(_filter?: ListingSearchFilter): Promise<Listing[]> {
    return [];
  }

  async byId(_id: string): Promise<Listing | null> {
    return null;
  }
}

/** Platform listing ids are uuids; catalogue ids are not. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Real inventory first, catalogue behind it.
 *
 * Every method degrades in the same direction: whatever the database cannot
 * answer, the seed catalogue answers. A thrown query, a timeout or an empty
 * table all reduce this repository to the seed repository, which is exactly
 * the behaviour discovery has today.
 */
class MergedListingRepository implements ListingRepository {
  /**
   * Results still contain local catalogue content, and there is no pagination
   * cursor behind them, so this stays true until the catalogue is retired.
   * Search reads it to keep its Load more control disabled rather than
   * offering a page that does not exist.
   */
  readonly isSeed = true;

  private readonly db = new SupabaseListingRepository();
  private readonly seed = new EmptyListingRepository();

  private async fromDb<T>(run: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await run();
    } catch {
      return fallback;
    }
  }

  /** Concatenate, keeping the first occurrence of each id. */
  private static dedupe(...groups: Listing[][]): Listing[] {
    const seen = new Set<string>();
    const out: Listing[] = [];
    for (const group of groups) {
      for (const listing of group) {
        if (seen.has(listing.id)) continue;
        seen.add(listing.id);
        out.push(listing);
      }
    }
    return out;
  }

  async search(filter: ListingSearchFilter = {}): Promise<Listing[]> {
    const [live, seed] = await Promise.all([
      this.fromDb(() => this.db.search(filter), [] as Listing[]),
      this.seed.search(filter),
    ]);
    return MergedListingRepository.dedupe(live, seed);
  }

  async recommended(limit = 6): Promise<Listing[]> {
    // Diversity is applied to each half, then the halves are concatenated, so
    // real inventory always leads the rail even while it carries few reviews.
    const live = await this.fromDb(() => this.db.recommended(limit), [] as Listing[]);
    if (live.length >= limit) return live.slice(0, limit);
    const seen = new Set(live.map((l) => l.id));
    const seed = (await this.seed.search({})).filter((l) => !seen.has(l.id));
    return [...live, ...diversePick(seed, limit - live.length)];
  }

  async byId(id: string): Promise<Listing | null> {
    if (UUID_RE.test(id)) {
      const live = await this.fromDb(() => this.db.byId(id), null);
      if (live) return live;
    }
    return this.seed.byId(id);
  }
}

class ApiListingRepository implements ListingRepository {
  readonly isSeed = false;
  async recommended(): Promise<Listing[]> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the platform API is not implemented yet. " +
        "Unset it to fall back to seed content.",
    );
  }
  async search(): Promise<Listing[]> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the platform API is not implemented yet. " +
        "Unset it to fall back to seed content.",
    );
  }
  async byId(): Promise<Listing | null> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the platform API is not implemented yet. " +
        "Unset it to fall back to seed content.",
    );
  }
}

/**
 * First-party inventory, with partner stock behind it.
 *
 * A decorator rather than a fourth repository, because the merge rule is the
 * same whatever answers first: whatever the base repository returns keeps its
 * order and its place at the top of the results, and partner listings are
 * appended after it. Verification earns reach (docs/HYBRID_INVENTORY.md
 * section 3), so a partner hotel can never outrank a verified one at equal
 * relevance; it can only fill the shelf below.
 *
 * The decorator is only ever applied when a provider key exists. With no keys
 * `getListingRepository()` returns exactly the repository it returned before
 * this file knew partners existed, so keyless behaviour is unchanged by
 * construction rather than by a runtime check inside each method.
 *
 * `recommended()` is deliberately NOT widened. The home rail is a curation
 * surface, and partner stock carries no verification, no reviews of ours and no
 * inspection path, so it has not earned a place there. It also keeps the home
 * page free of any outbound partner call.
 */
class PartnerAugmentedRepository implements ListingRepository {
  readonly isSeed: boolean;

  constructor(private readonly base: ListingRepository) {
    this.isSeed = base.isSeed;
  }

  async search(filter: ListingSearchFilter = {}): Promise<Listing[]> {
    // First party is fetched first and never waits on a partner: both halves run
    // in parallel, and the partner half has its own hard timeout inside.
    const [first, partner] = await Promise.all([
      this.base.search(filter),
      partnerListings(filter).catch(() => [] as Listing[]),
    ]);

    // The shared matcher decides for partner stock exactly as it decides for
    // ours, so a blended result set cannot filter two different ways.
    const eligible = partner.filter((l) => matchesFilter(l, filter));
    return PartnerAugmentedRepository.appendPartners(first, eligible);
  }

  async recommended(limit = 6): Promise<Listing[]> {
    return this.base.recommended(limit);
  }

  async byId(id: string): Promise<Listing | null> {
    // Partner ids are minted by the provider layer and cannot collide with a
    // uuid or a catalogue slug, so the routing is unambiguous and costs one
    // string comparison on the first-party path.
    if (isPartnerId(id)) {
      return partnerListingById(id).catch(() => null);
    }
    return this.base.byId(id);
  }

  /**
   * Partner listings after first-party ones, with one entry per real place.
   *
   * The rule itself lives in `lib/inventory/dedupe.ts` and is passed the two
   * halves already in their final order, first party leading. That ordering is
   * the whole interface between the two files: `dedupeListings` keeps the
   * position of the first record of a place, so putting first party first is
   * what guarantees a feed can never displace a verified listing, and the
   * decorator does not need to say so a second time.
   *
   * This used to be an exact-string fingerprint of kind, title and city, which
   * matched only when two feeds spelled a property identically. They do not:
   * see the worked examples at the top of `dedupe.ts`. Since a second hotel
   * feed now runs alongside Google Places, the duplicates it missed were about
   * to be most of the hotel shelf in Lagos rather than an occasional pair.
   */
  private static appendPartners(first: Listing[], partner: Listing[]): Listing[] {
    return dedupeListings([...first, ...partner]);
  }
}

export function getListingRepository(): ListingRepository {
  if (process.env.NF_DATA_SOURCE === "api") return new ApiListingRepository();
  const base = isSupabaseConfigured() ? new MergedListingRepository() : new EmptyListingRepository();
  // No partner keys, no decorator, no behaviour change of any kind.
  return partnerProvidersConfigured() ? new PartnerAugmentedRepository(base) : base;
}
