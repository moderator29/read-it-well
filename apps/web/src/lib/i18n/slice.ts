import type { Dictionary } from "@vallo/i18n";

/**
 * A CLIENT COMPONENT GETS THE PART OF THE DICTIONARY IT READS (Track M
 * performance, 25 September 2026).
 *
 * A server page that hands `t` to a `"use client"` component serialises all of
 * it into the page: 365 KB of every surface's words, in the HTML and in the
 * payload of the navigation. A listing card reads three namespaces of it.
 * Each slice below names what one client component (and the children it
 * passes `t` to) reads, and `slice-coverage.test.ts` re-reads those files and
 * fails the build if one starts reading a namespace its slice does not carry.
 *
 * The slices are cached per dictionary object, so thirty cards on a page are
 * handed the SAME object and React sends it once, and a request costs no more
 * than a map lookup. The dictionaries are module constants, so the cache is
 * bounded by the four locales.
 */
const cache = new WeakMap<Dictionary, Map<string, Dictionary>>();

export function sliceDictionary(t: Dictionary, keys: readonly (keyof Dictionary)[]): Dictionary {
  const id = keys.join(",");
  let byKeys = cache.get(t);
  if (!byKeys) {
    byKeys = new Map();
    cache.set(t, byKeys);
  }
  let slice = byKeys.get(id);
  if (!slice) {
    slice = Object.fromEntries(keys.map((key) => [key, t[key]])) as unknown as Dictionary;
    byKeys.set(id, slice);
  }
  return slice;
}

export const SLICES = {
  /* Each list is what the component's WHOLE import graph can read, as the
     coverage test computes it, including a few names it only appears to read
     (a `supabase.auth` counts as `auth`): one namespace too many is a few
     kilobytes, one too few is a crash in somebody's hand. */
  listingCard: ["auth", "catalogue", "common", "directHome", "interests", "landing", "moveIn", "platform", "settings", "shape", "trustVisible", "units"],
  stayCard: ["auth", "catalogue", "common", "platform", "shape", "stays"],
  stayFilterSheet: ["catalogue", "shape", "stayDetail", "stays"],
  priceCheck: ["auth", "home", "landlord", "priceCheck", "shape"],
  proofStrip: ["shape", "trustVisible"],
  settingsHub: ["admin", "auth", "common", "directHome", "interests", "landing", "paymentsPage", "platform", "settings", "shape", "socialProfile", "units"],
} as const satisfies Record<string, readonly (keyof Dictionary)[]>;

export function forListingCard(t: Dictionary): Dictionary {
  return sliceDictionary(t, SLICES.listingCard);
}
export function forStayCard(t: Dictionary): Dictionary {
  return sliceDictionary(t, SLICES.stayCard);
}
export function forStayFilterSheet(t: Dictionary): Dictionary {
  return sliceDictionary(t, SLICES.stayFilterSheet);
}
export function forPriceCheck(t: Dictionary): Dictionary {
  return sliceDictionary(t, SLICES.priceCheck);
}
export function forProofStrip(t: Dictionary): Dictionary {
  return sliceDictionary(t, SLICES.proofStrip);
}
export function forSettingsHub(t: Dictionary): Dictionary {
  return sliceDictionary(t, SLICES.settingsHub);
}
