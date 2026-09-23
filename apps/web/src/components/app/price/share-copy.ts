import type { Dictionary } from "@vallo/i18n";
import type { ShareCardCopy } from "@/lib/price-check/share-card";
import type { ShareAreaCopy } from "./ShareAreaButton";

/**
 * THE DICTIONARY, NARROWED ONTO THE TWO SHAPES THE SHARE SURFACE ASKS FOR.
 *
 * A `.ts` file and not a helper inside either `.tsx`, for the reason the rest
 * of this folder gives: `apps/web/vitest.config.ts` aliases the bare specifier
 * `react` at `react.react-server.js` and Vite matches a string alias by
 * PREFIX, so `react/jsx-dev-runtime` cannot resolve and nothing in this
 * repository that imports a `.tsx` can be tested at all. The mapping from
 * dictionary keys to card words is exactly the part that can be wrong in
 * silence - a renamed key resolves to `undefined` and prints as the word
 * "undefined" on an artefact that leaves the product and gets forwarded - so
 * it lives where a test can reach it.
 *
 * THE PLURAL TYPE NAMES ARE THE CARD'S OWN AND NOT THE FORM'S. The form says
 * "Flat", "House", "Shop", "Office", because it is labelling a choice. The
 * card says "flats in Lekki Phase 1", because it is describing a set. Two
 * different jobs, two sets of words, both in `price-check.en.ts` and neither
 * assembled from the other.
 */
export function shareCardCopy(t: Dictionary): ShareCardCopy {
  const share = t.priceCheck.share;
  return {
    headline: share.headline,
    headlineNoBedrooms: share.headlineNoBedrooms,
    headlineStudio: share.headlineStudio,
    range: share.cardRange,
    perYear: t.priceCheck.result.perYear,
    perProperty: t.priceCheck.result.perProperty,
    basis: share.cardBasis,
    basisNoDate: share.cardBasisNoDate,
    typeNames: {
      apartment: share.typeApartmentPlural,
      home: share.typeHomePlural,
      shop: share.typeShopPlural,
      office: share.typeOfficePlural,
      any: share.typeAnyPlural,
    },
  };
}

/** The sheet's and the button's words. */
export function shareAreaCopy(t: Dictionary): ShareAreaCopy {
  const share = t.priceCheck.share;
  return {
    make: share.make,
    making: share.making,
    heading: share.heading,
    body: share.body,
    why: share.why,
    whyBody: share.whyBody,
    madeHeading: share.madeHeading,
    madeBody: share.madeBody,
    copy: share.copy,
    copied: share.copied,
    failed: share.failed,
    nothingYet: share.nothingYet,
    nothingYetBody: share.nothingYetBody,
    open: share.open,
  };
}
