import "server-only";
import { isSupabaseConfigured } from "../supabase/env";
import { diversePick } from "./filter";
import { SupabaseListingRepository } from "./supabase-repository";
import type {
  Listing,
  ListingRepository,
  ListingSearchFilter,
  ListingSearchOptions,
} from "./types";

/**
 * Listing data access.
 *
 * Discovery has gone through this one interface since day one, so every
 * surface (home, search, the map, the rent market, listing detail, enquiries,
 * the assistant tool) widens the moment the source behind it widens, with no
 * component changes.
 *
 * What the factory returns:
 *   Supabase configured  real published inventory from Postgres.
 *   otherwise            nothing, honestly. See `EmptyListingRepository`.
 *   NF_DATA_SOURCE=api   the unimplemented platform API, left untouched.
 *
 * THERE IS EXACTLY ONE SOURCE OF INVENTORY, AND IT IS THIS PLATFORM.
 *
 * Two things used to answer alongside Postgres and both are gone. The first
 * was a local catalogue of twenty-three invented places, twenty-two of them
 * carrying the verified badge on inventory nobody had checked. The second was
 * third-party stock: a Google Places feed and two LiteAPI hotel feeds, merged
 * in behind first-party rows by a decorator that lived in this file.
 *
 * Neither is coming back, and the reason is the same for both. Everything on
 * Vallo must be something a person listed on Vallo. That is what makes the
 * verification ladder mean anything, what makes escrow possible, and what
 * makes a listing something a human being can be held to. A feed is none of
 * those things: there is nobody to message, nobody to inspect with, nobody to
 * refund you, and no way to tell a real building from a stale row.
 *
 * Note that hotels and shortlets remain perfectly valid listing kinds. What
 * was removed is the FEED, not the category. A hotel listed by its owner on
 * this platform is first-party inventory like any other.
 */

/**
 * What discovery is when nothing is configured: empty, and honest about it.
 *
 * With no Supabase credentials there is no inventory, and every screen that
 * reads this already draws a designed empty state rather than assuming a
 * result.
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

/** Platform listing ids are uuids. Anything else cannot name a listing. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The platform catalogue, with every query failure answered as an empty shelf.
 *
 * A thrown query, a timeout or an empty table all reduce this to nothing
 * rather than to an error page, because a discovery surface that cannot reach
 * the database should say there is nothing to show rather than break.
 */
class PlatformListingRepository implements ListingRepository {
  /**
   * There is no pagination cursor behind these results yet, so search keeps
   * its Load more control disabled rather than offering a page that does not
   * exist.
   */
  readonly isSeed = true;

  private readonly db = new SupabaseListingRepository();

  private async fromDb<T>(run: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await run();
    } catch {
      return fallback;
    }
  }

  async search(
    filter: ListingSearchFilter = {},
    opts: ListingSearchOptions = {},
  ): Promise<Listing[]> {
    return this.fromDb(() => this.db.search(filter, opts), [] as Listing[]);
  }

  async recommended(limit = 6): Promise<Listing[]> {
    const live = await this.fromDb(() => this.db.recommended(limit), [] as Listing[]);
    // Diversity is applied so the rail reads as a tour of the catalogue rather
    // than as five of whatever kind happens to be most numerous.
    return live.length > limit ? diversePick(live, limit) : live;
  }

  async byId(id: string): Promise<Listing | null> {
    if (!UUID_RE.test(id)) return null;
    return this.fromDb(() => this.db.byId(id), null);
  }
}

class ApiListingRepository implements ListingRepository {
  readonly isSeed = false;
  async recommended(): Promise<Listing[]> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the platform API is not implemented yet. " +
        "Unset it to fall back to the platform catalogue.",
    );
  }
  async search(): Promise<Listing[]> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the platform API is not implemented yet. " +
        "Unset it to fall back to the platform catalogue.",
    );
  }
  async byId(): Promise<Listing | null> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the platform API is not implemented yet. " +
        "Unset it to fall back to the platform catalogue.",
    );
  }
}

export function getListingRepository(): ListingRepository {
  if (process.env.NF_DATA_SOURCE === "api") return new ApiListingRepository();
  return isSupabaseConfigured() ? new PlatformListingRepository() : new EmptyListingRepository();
}
