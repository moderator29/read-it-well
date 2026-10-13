import type { ShelfQuery } from "./shelf-query";

/**
 * WHAT TO CHANGE NEXT WHEN A SEARCH FINDS NOTHING (round 5 craft, "a search
 * finds the right place").
 *
 * An empty shelf under filters used to offer one way on: clear them all. That
 * throws away everything the person said to undo the one thing that was too
 * tight. This finds the single change that brings the most places back (drop
 * one filter, or look beyond the named areas) so the empty state can offer it
 * as a real action, named in words, with "Clear filters" as the quiet second.
 *
 * The page counts; this decides. `count` answers how many places a relaxed
 * search would hold, from the same pool the filter sheet already counts
 * against, so the choice can never point at a change that brings nothing
 * back. The count is used to RANK, not printed: the shelf collapses copies of
 * one property after this point, so the number the next page prints (and
 * rolls into place on the odometer) is the server's, not this one.
 *
 * Pure: a query in, queries out.
 */
export type RelaxKey =
  | "price"
  | "beds"
  | "baths"
  | "market"
  | "kind"
  | "verified"
  | "amenities"
  | "utilities"
  | "lister"
  | "compound"
  | "service"
  | "upfront"
  | "shape"
  | "flood"
  | "commute"
  | "area";

export type Relaxation = { key: RelaxKey; query: ShelfQuery };

/** Each group the person can let go of, in the order the shelf's chips read. */
const RELAXERS: { key: RelaxKey; on: (q: ShelfQuery) => boolean; drop: (q: ShelfQuery) => void }[] = [
  {
    key: "price",
    on: (q) => q.minMinor !== undefined || q.maxMinor !== undefined,
    drop: (q) => {
      delete q.minMinor;
      delete q.maxMinor;
    },
  },
  { key: "beds", on: (q) => q.bedrooms !== undefined, drop: (q) => void delete q.bedrooms },
  { key: "baths", on: (q) => q.bathrooms !== undefined, drop: (q) => void delete q.bathrooms },
  { key: "market", on: (q) => q.intent !== undefined, drop: (q) => void delete q.intent },
  { key: "kind", on: (q) => q.kind !== undefined, drop: (q) => void delete q.kind },
  { key: "verified", on: (q) => q.verifiedOnly, drop: (q) => void (q.verifiedOnly = false) },
  { key: "amenities", on: (q) => q.amenities.length > 0, drop: (q) => void (q.amenities = []) },
  {
    key: "utilities",
    on: (q) => q.powerBackup || q.powerBandA || q.waterSupply.length > 0,
    drop: (q) => {
      q.powerBackup = false;
      q.powerBandA = false;
      q.waterSupply = [];
    },
  },
  { key: "lister", on: (q) => q.listerRoles.length > 0, drop: (q) => void (q.listerRoles = []) },
  {
    key: "compound",
    on: (q) => q.landlordAway || q.parkingInside,
    drop: (q) => {
      q.landlordAway = false;
      q.parkingInside = false;
    },
  },
  {
    key: "service",
    on: (q) => q.servicedOnly || q.gatedEstate,
    drop: (q) => {
      q.servicedOnly = false;
      q.gatedEstate = false;
    },
  },
  { key: "upfront", on: (q) => q.maxUpfront !== undefined, drop: (q) => void delete q.maxUpfront },
  {
    key: "shape",
    on: (q) => (q.shapes?.length ?? 0) > 0 || q.withBq === true,
    drop: (q) => {
      delete q.shapes;
      delete q.withBq;
    },
  },
  { key: "flood", on: (q) => q.noFlood === true, drop: (q) => void delete q.noFlood },
  { key: "commute", on: (q) => q.within !== undefined, drop: (q) => void delete q.within },
  { key: "area", on: (q) => (q.areas?.length ?? 0) > 0, drop: (q) => void delete q.areas },
];

/** Every single change on offer for this query: one group dropped each. */
export function relaxations(query: ShelfQuery): Relaxation[] {
  return RELAXERS.filter((r) => r.on(query)).map((r) => {
    const next: ShelfQuery = { ...query, amenities: [...query.amenities] };
    r.drop(next);
    return { key: r.key, query: next };
  });
}

/**
 * The one change that brings the most places back, or null when no single
 * change brings any (then "Clear filters" is the honest way on). Ties go to
 * the earlier group, which is the order the chips read on the bar.
 */
export function nextChange(query: ShelfQuery, count: (relaxed: ShelfQuery) => number): Relaxation | null {
  let best: Relaxation | null = null;
  let most = 0;
  for (const option of relaxations(query)) {
    const found = count(option.query);
    if (found > most) {
      best = option;
      most = found;
    }
  }
  return best;
}
