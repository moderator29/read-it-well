import { formatMoneyGlance, type Locale } from "@vallo/i18n";
import { SHARE_CARD_FOOTER } from "./disclaimer";
import type { AreaShare, ListingPropertyType } from "./types";

/**
 * WHAT A SHARE CARD SAYS, IN WORDS, IN ONE PLACE.
 *
 * ---------------------------------------------------------------------------
 * THE SHARE RULE IS ABSOLUTE AND THIS MODULE IS WHERE IT WOULD BE BROKEN.
 *
 * No share artefact ever carries a specific address. Not for anybody, not for
 * a person who has claimed and proven the property, not for the person who
 * typed it in. A card is AREA LEVEL and TYPE LEVEL, and a specific property is
 * shared in exactly one way: by publishing it as a listing.
 *
 * The database makes that unarguable rather than remembered, in three places
 * that this module cannot reach past: `price_check_share_scope` has two labels
 * and neither is a property; `price_check_shares` has no address, latitude,
 * longitude or listing id column; and `price_check_shares_area_is_not_an_address`
 * refuses an area string shaped like a street address. Those three are the
 * walls. THIS FILE IS WHERE A HOLE WOULD BE CUT IN THEM, because it is the one
 * that turns a row into a sentence, and a sentence is the thing a person reads
 * off a forwarded card. So `AreaShare` is the only input it takes, there is no
 * parameter for a point or a hint, and `shareLines` never receives the subject
 * the check was run on.
 *
 * ---------------------------------------------------------------------------
 * EVERY FIGURE PRINTS THE COUNT IT CAME FROM.
 *
 * `basis` is not decoration and it is not behind a tap: a range with no count
 * beside it is a statement about a market, and a range with "from 9 listings"
 * beside it is a statement about nine listings, which is the only one of the
 * two that is true. The card is the artefact most likely to be read by
 * somebody who never saw the screen it came from, so it carries its own basis
 * and its own footer and depends on no surrounding page.
 *
 * ---------------------------------------------------------------------------
 * AND A REFUSED CHECK MINTS NOTHING, WHICH IS WHY THERE IS NO REFUSAL SHAPE
 * HERE.
 *
 * An image is a claim and a refusal has nothing to claim. On this platform
 * today almost every per-property check refuses, because all 64 published
 * listings are examples and `is_demo = false` sits inside the comparables
 * predicate, so the refusal is what a person will actually meet. The honest
 * card for a refusal is no card, and the discriminated shape of
 * `PriceCheckResult` makes that structural: a refused result has no figures to
 * pass, so nothing here can be called with one.
 *
 * Pure, and in its own module, for the reason the rest of this folder gives:
 * `apps/web/vitest.config.ts` aliases `react` at its react-server entry, so no
 * `.tsx` in this repository can be rendered or even imported by the suite. The
 * words that go on the artefact that leaves the product are the last thing
 * that should be untestable.
 */

/** The words on one card, each already filled and ready to print. */
export type ShareLines = {
  /** "Three bedroom flats in Lekki Phase 1". Never an address. */
  headline: string;
  /** "Asking ₦7.5m to ₦9.0m a year". */
  range: string;
  /** "Based on 9 Vallo listings, September 2026". */
  basis: string;
  /** "Asking prices, not sold prices. vallo.ng" */
  footer: string;
};

export type ShareCardCopy = {
  /** "{bedrooms} bedroom {type} in {area}" */
  headline: string;
  /** "{type} in {area}", when no bedroom count was part of the card. */
  headlineNoBedrooms: string;
  /** "Studio {type} in {area}" */
  headlineStudio: string;
  /** "Asking {low} to {high} {period}" */
  range: string;
  /** "a year" */
  perYear: string;
  /** "for a property like this" */
  perProperty: string;
  /** "Based on {count} Vallo listings, {month}" */
  basis: string;
  /** "Based on {count} Vallo listings" when the card carries no dates. */
  basisNoDate: string;
  /** Plural names by property type, as the card writes them. */
  typeNames: Record<string, string>;
};

/** Replaces `{token}`s and leaves an unknown one visible rather than blank. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/**
 * "September 2026". Month and year only: a day is precision we did not earn,
 * and a card outlives the week it was made in.
 */
export function shareMonth(iso: string | null, locale: Locale): string | null {
  if (iso === null || iso === "") return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-NG" : locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** The plural name of a property type, or the raw value when we have none. */
function typeWord(
  propertyType: ListingPropertyType | null,
  copy: ShareCardCopy,
): string | null {
  if (propertyType === null) return null;
  return copy.typeNames[propertyType] ?? propertyType;
}

/**
 * WHERE A CARD LIVES. One function, so a link in a sheet, a link in an email
 * and the canonical URL on the page itself cannot spell it three ways.
 *
 * The id is the whole of the path. There is no state, no area and no type in
 * it, not because those are secret - they are on the card - but because a URL
 * is the part of an artefact that gets pasted into places the card never
 * reaches, and an id says nothing at all when it is read out of context.
 */
export function shareHref(id: string): string {
  return `/price/area/${id}`;
}

/**
 * The card, as four lines.
 *
 * `area` may be null: a state-wide card is a real thing and it says the state
 * rather than pretending to a neighbourhood. `bedrooms` may be null, because
 * an `area` scoped card carries neither a type nor a bedroom count by check
 * constraint.
 */
export function shareLines(
  share: AreaShare,
  copy: ShareCardCopy,
  locale: Locale,
  stateName: string,
): ShareLines {
  const place = share.area ?? stateName;
  const type = typeWord(share.propertyType, copy);

  /*
   * NO TYPE MEANS NO TYPE IN THE SENTENCE, rather than a word invented to fill
   * the slot. An `area` scoped card is the whole of an area's asking, and
   * "properties in Lekki Phase 1" is what that is.
   */
  const headline =
    type === null
      ? fill(copy.headlineNoBedrooms, { type: copy.typeNames.any ?? "Properties", area: place })
      : share.bedrooms === null
        ? fill(copy.headlineNoBedrooms, { type, area: place })
        : share.bedrooms === 0
          ? fill(copy.headlineStudio, { type, area: place })
          : fill(copy.headline, { bedrooms: share.bedrooms, type, area: place });

  const range = fill(copy.range, {
    low: formatMoneyGlance(share.lowMinor, locale),
    high: formatMoneyGlance(share.highMinor, locale),
    period: share.listingIntent === "rent" ? copy.perYear : copy.perProperty,
  });

  /*
   * THE COUNT IS NOT OPTIONAL AND THE MONTH IS. `listing_count` is `>= 3` by
   * check constraint, so there is always a number to print; the two timestamps
   * are nullable, and a card whose row carried none says how many listings it
   * came from and stops there rather than inventing a period.
   */
  const month = shareMonth(share.newestAt, locale);
  const basis =
    month === null
      ? fill(copy.basisNoDate, { count: share.listingCount })
      : fill(copy.basis, { count: share.listingCount, month });

  return { headline, range, basis, footer: SHARE_CARD_FOOTER };
}
