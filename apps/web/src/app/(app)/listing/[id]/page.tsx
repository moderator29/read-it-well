import type { Metadata } from "next";
import { forProofStrip } from "@/lib/i18n/slice";
import { StillAvailable } from "@/components/app/listing/StillAvailable";
import { readRecentlyLet } from "@/lib/availability/queries";
import { readViewingSlots } from "@/lib/viewings/queries";
import { ViewingSlots } from "@/components/app/inspections/ViewingSlots";
import { Suspense } from "react";
import { marketOf, type ListingMarket } from "@/lib/listings/market";
import { panelClass } from "@/components/ui/Panel";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NONCE_HEADER } from "@/lib/security/csp";
import { countOf, getDictionary, intlTag, type Locale, formatRating } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { listingById } from "@/lib/listings/listing-by-id";
import {
  listingMetadata,
  listingStructuredData,
  structuredDataJson,
} from "@/lib/listings/syndication";
import { siteUrl } from "@/lib/site";
import { factsOf, sleeps } from "@/lib/listings/filter";
import type { Listing, ListingKind } from "@/lib/listings/types";
import {
  PERIOD_SUFFIX,
  FURNISHING_LABEL,
  CONDITION_LABEL,
  type PricePeriod,
  type RentPeriod,
} from "@/lib/listings/pricing";
import { formatDate, formatNumber } from "@vallo/i18n";
import { listedAge, listedAgeText, staleMonthOptions } from "@/lib/listings/listed-age";
import { isModestExample } from "@/lib/listings/example-imagery";
import { ListingCompound } from "@/components/app/listing/ListingCompound";
import { ListingService } from "@/components/app/listing/ListingService";
import { RecordViews } from "@/components/app/search/RecordViews";
import { ListingNeighbours } from "@/components/app/listing/ListingNeighbours";
import { readFlooding, readNeighbours } from "@/lib/around/pulse-queries";
import { flagIsOn, NEIGHBOURS_FLAG, SHOW_ME_FLAG } from "@/lib/flags/read";
import { readCommutesFrom } from "@/lib/listings/commute-queries";
import { commuteLine } from "@/lib/listings/commute";
import { getBlockedDates } from "@/lib/bookings/queries";
import { getListingReviews } from "@/lib/reviews/queries";
import { getSavedListings } from "@/lib/saved/queries";
import { lagosToday } from "@/lib/bookings/schema";
import { TrustFacts } from "@/components/app/listing/TrustFacts";
import { earnedTrust, withEarnedTrust } from "@/components/app/listing/earned-trust";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { RecordVisit } from "@/components/app/listing/RecordVisit";
import { cardGlance } from "@/lib/listings/card-glance";
import { ReservePanel } from "./ReservePanel";
import { RentalPanel } from "./RentalPanel";
import { ReserveTable } from "./ReserveTable";
import { ListingAbout } from "@/components/app/listing/ListingAbout";
import { ListingAmenities } from "@/components/app/listing/ListingAmenities";
import { ListingAmenityTiles } from "@/components/app/listing/ListingAmenityTiles";
import { ListingAgentCard } from "@/components/app/listing/ListingAgentCard";
import { ProofStrip } from "@/components/app/listing/ProofStrip";
import { proofFactsOf, proofLines } from "@/lib/trust/proof-strip";
import { doorHonestyLine, readDoorHonesty } from "@/lib/tenancy/door";
import { readListingRecord } from "@/lib/trust/record-read";
import { ValloRecord } from "@/components/app/trust/ValloRecord";
import { readListingCredentials } from "@/lib/trust/credentials-read";
import { ListingMoveInBlock } from "@/components/app/listing/ListingMoveInBlock";
import { OwnerAvailabilityLine, PropertyOffers } from "@/components/app/listing/LandlordFacts";
import { ExactPlace } from "@/components/app/listing/ExactPlace";
import { ListingCodeRow } from "@/components/app/listing/ListingCode";
import { ListingMoveIn } from "@/components/app/listing/ListingMoveIn";
import { readPayeeRecords } from "@/lib/after-gate/payee";
import { LastLetLine } from "@/components/app/listing/LastLetLine";
import { ReplyTimeLine } from "@/components/app/listing/ReplyTimeLine";
import { PriceContextRow } from "@/components/app/listing/PriceContextRow";
import { PhotographedLine } from "@/components/app/listing/PhotographedLine";
import { CautionRecordLine } from "@/components/app/listing/CautionRecordLine";
import { ListingPurchase } from "@/components/app/listing/ListingPurchase";
import { ListingSectionTabs } from "@/components/app/listing/ListingSectionTabs";
import { ListingSpecChips, specChips } from "@/components/app/listing/ListingSpecChips";
import { ListingPhotoGrid } from "@/components/app/listing/ListingPhotoGrid";
import { ListingWalkthrough } from "@/components/app/listing/ListingWalkthrough";
import { ListingUtilities } from "@/components/app/listing/ListingUtilities";
import { ListingTenure } from "@/components/app/listing/ListingTenure";
import { readListingAccess } from "@/lib/listings/access-queries";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { CancellationTimeline } from "@/lib/trust/CancellationTimeline";
import { ListingReviews } from "@/components/app/listing/ListingReviews";
import {
  ListingStickyBar,
  type StickyAction,
} from "@/components/app/listing/ListingStickyBar";
import { StayDatesProvider } from "@/components/app/listing/StayDates";
import { readStayDates } from "@/components/app/stays/model";
import { PhotoViewerProvider } from "@/components/app/listing/PhotoViewer";
import { ReportSheet } from "@/components/app/ReportSheet";
import { resolveSession } from "@/lib/actions/session";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import type { StatusTone } from "@/components/ui/StatusPill";
import { Disclosure } from "@/components/app/Disclosure";
import { publicListingTitle } from "@/lib/listings/public-title";
import { FactGrid, ICON, Section, Stack, TYPE, type Fact } from "@/components/app/Screen";
import "@/app/css/catalogue.css";

/**
 * Listing detail.
 *
 * THE MOST IMPORTANT SCREEN IN THE PRODUCT, rebuilt around one question: what
 * does a person need, in what order, to decide whether to act on this property?
 *
 * ---------------------------------------------------------------------------
 * THE ORDER, AND WHY IT IS THIS ORDER
 * ---------------------------------------------------------------------------
 *
 *   1. MEDIA, edge to edge, with the frame counter and the save and share
 *      controls floating over it. Nobody reads a property, they look at it.
 *   2. ONE LINE OF STATUS. Which market this is in, and the rating if it has
 *      one. One line, not a pile.
 *   3. TITLE and PLACE.
 *   4. PRICE, at display size, with what the price buys in the muted tone.
 *   5. BED, BATH and what the place carries, as one inline run.
 *   6. THE NIGERIAN NUMBER. On a rental, the total to move in: the figure
 *      people actually shop on, which this page did not previously show at all.
 *      On a sale, the title, in the real vocabulary, and stated plainly as
 *      unstated when the seller named none.
 *   7. LIGHT, WATER AND THE GATE.
 *   8. Everything else, in descending order of how many readers need it, with
 *      the long tail behind a `Disclosure` rather than deleted.
 *
 * That is the reference platforms' order (media, status, price, bed and bath,
 * then a sticky contact bar) with the two facts that matter in this market and
 * that neither of them carries.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE REBUILD REMOVED, AND WHAT IT DID NOT
 * ---------------------------------------------------------------------------
 *
 * Removed: containers. The status row could previously carry five simultaneous
 * chips; it carries one pill and a rating. Four sections were `.nf-card` boxes
 * stacked inside the glass content sheet, each with its own border, radius and
 * shadow, and each containing further bordered blocks: those are now sections
 * on the ground, grouped by heading, space and a single hairline where the eye
 * needs one. Nesting went from three surfaces deep to one.
 *
 * NOT removed: any capability. Every panel, every policy, every control that
 * was reachable before is reachable now. The cancellation schedule moved behind
 * a `Disclosure`, one tap away, because it is a real thing that almost nobody
 * needs at the moment they are deciding. The market still decides the action: a
 * rental never carries a Reserve control (docs/HYBRID_INVENTORY.md sections 1
 * and 4), and nothing on this page is hardcoded inventory.
 */

const KIND_LABEL: Record<ListingKind, string> = {
  hotel: "hotel",
  apartment: "apartment",
  home: "home",
  shortlet: "shortlet",
  villa: "villa",
  restaurant: "restaurant",
  experience: "experience",
  // A rental is described by what it is to the reader, not by our enum name.
  rental: "home to rent",
  shop: "shop to rent",
  office: "office to rent",
  land: "plot of land",
};

/**
 * The market pill: the one line of status.
 *
 * A tinted icon and label naming the market the property is in, in a semantic
 * colour rather than a generic grey. It is a restatement of `listing.kind`,
 * which every record carries, so nothing here can be invented.
 */
/**
 * The resolved period, narrowed to the three a tenancy can be quoted in.
 *
 * A nightly or per-head rate never belongs to a rental listing, and if one
 * somehow reached this page, falling back to the year the rest of the screen
 * assumes beats labelling a year's rent as a night's.
 */
function rentPeriodOf(value: PricePeriod | null | undefined): RentPeriod {
  return value === "month" || value === "quarter" ? value : "year";
}

/*
 * UX-10 / UI-P2-03: the pill names the MARKET the listing is in
 * (`marketOf`), not its kind. A villa let by the year is "For rent", not
 * "For stays"; restaurant premises let on a rent are "For rent", not
 * "Dining". Semantic tones, never generic grey: a status pill in a neutral
 * wash reads as an absence of state rather than as a market.
 */
const MARKET_PILL: Record<ListingMarket, { icon: UiIconName; label: string; tone: StatusTone }> = {
  tenancy: { icon: "key", label: "For rent", tone: "brand" },
  sale: { icon: "key", label: "For sale", tone: "brand" },
  stay: { icon: "calendar-booking", label: "For stays", tone: "success" },
  dining: { icon: "utensils", label: "Dining", tone: "info" },
  experience: { icon: "ticket", label: "Experience", tone: "info" },
};

/** "Lagos State" reads naturally; the FCT does not take the suffix. */
function stateLabel(state: string): string {
  return state === "FCT" ? "the FCT" : `${state} State`;
}

/**
 * How many guests this place takes, as one number the whole page agrees on.
 *
 * The host's declared `max_guests` where there is one, the two-per-bedroom
 * convention where there is not, and null where capacity is not a knowable
 * thing about the place at all.
 */
function capacityOf(listing: Listing): number | null {
  return sleeps(factsOf(listing));
}

/** An ISO date as a Lagos reader would write it. */
function dateLabel(iso: string, locale: Locale): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat(intlTag[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(parsed);
}

/**
 * THE ROBOTS DIRECTIVE AND THE SOCIAL CARD ARE NOT DECIDED HERE.
 *
 * They are decided in `lib/listings/syndication.ts`, the one gate the sitemap,
 * the structured data below and any email that carries a listing all read
 * through. Four copies of "is this row real?" drift into four different
 * answers, and the consequence of the drift is a fabricated property
 * advertisement in Google's index. See that file for the whole argument.
 *
 * This used to return `index: false` for EVERY listing, which was the right
 * blunt instrument while the entire catalogue was invented and is the wrong
 * one now that only some of it is. A property marketplace whose inventory
 * cannot be found is most of the way to not being a marketplace.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await listingById(id);
  /* OPS-17: metadata resolves before the body streams for crawlers and
     link checkers, so a missing listing answers them with a real 404 rather
     than a 200 that streams a not-found page. */
  if (!listing) notFound();
  return listingMetadata(listing, siteUrl());
}

/**
 * Does this caller hold a confirmed booking here?
 *
 * Only used to choose which sentence the withheld gate block shows, never to
 * decide what they may read: that decision belongs to the policy on
 * public.listing_access and to nothing in this file. A failed count reads as
 * no, because the safe answer to "may I see the gate code" is no.
 */
async function hasConfirmedBooking(
  supabase: SupabaseClient<Database>,
  listingId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("guest_id", userId)
      .eq("status", "CONFIRMED");
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** A stay's dates and party size, carried from the stays search. */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const requested = readStayDates((await searchParams) ?? {});
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  const raw = await listingById(id);
  if (!raw) notFound();
  /*
   * D24: THE PAGE DRAWS ONLY THE TRUST THIS SPACE EARNED.
   *
   * Every component below reads `listing`, and `listing` is the row with its
   * trust fields passed through `withEarnedTrust`: on an example row the
   * verified badge, the inspection and address dates and the rating are
   * cleared before anything can draw them. The row's own label ("example")
   * is not drawn anywhere on this page either, per the founder's ruling; what
   * keeps it safe is this, not a word.
   */
  const listing = withEarnedTrust(raw);
  const trust = earnedTrust(raw);
  const sx = t.experienceDetail;


  /*
   * WHERE "MESSAGE AGENT" GOES, AND THE DEAD END THIS REPLACES.
   *
   * This used to be `conversationIdForListing(id)` with a fallback of
   * "/messages". That fallback is the common case and, under the default
   * configuration, the ONLY case: the repository's `conversationIdForListing`
   * returns null unless a thread already exists, so every Message agent control
   * on a stay, a restaurant or a sale landed the reader on their empty inbox
   * instead of in a conversation about the property they were looking at. Five
   * call sites: the sticky bar, the host panel, the reserve panel, the table
   * panel and the restaurant panel.
   *
   * `/messages/new?listing=` is the route that already does this correctly, and
   * the rental branch was already using it. It resolves the listing's agent
   * server side, FINDS an existing thread before creating one, redirects
   * straight into it, and carries designed states for signed out, for a seed
   * listing with no agent behind it, and for messaging being switched off. It
   * is strictly better than the old link in every branch, so every branch now
   * uses it and the property context is never lost on the way to the thread.
   */
  const messageHref = `/messages/new?listing=${listing.id}`;

  // Rentals are annual tenancies: no Reserve control anywhere on the page.
  // The path is message the agent, inspect the property, then pay.
  /* UX-10: the market decides, by the price period and the intent, with the
     kind only as the fallback (`lib/listings/market.ts`). A villa or an
     apartment let by the year is a tenancy here, never a nightly stay. */
  const listingMarket = marketOf(listing);
  const isRental = listingMarket === "tenancy";

  /* A restaurant is ours to take a booking for, and it is NOT a stay. Without
     this it fell into the nightly branch and drew a date range picker, a
     cleaning fee and a per-night total for a table. What a restaurant takes is
     a party size at a moment (docs/HYBRID_INVENTORY.md section 9). */
  const isRestaurant = listingMarket === "dining";

  /*
   * A property FOR SALE is not bookable, and until now it was.
   *
   * `isBookable` was `!isRental && !isRestaurant`, which is a statement about
   * the CATEGORY and ignores the intent entirely. A three-bedroom home listed
   * for sale has kind "home", so it fell straight into the nightly branch and
   * was rendered with a date range picker, a cleaning fee, a per-night total
   * and a Check availability button, for a building somebody is trying to buy.
   * Intent is the discriminator the whole product turns on, so it is honoured
   * here.
   */
  const isSale = listing.intent === "sale";
  const isBookable = !isRental && !isRestaurant && !isSale;

  const today = lagosToday();

  /*
   * EVERY READ THE PAGE NEEDS, AT ONCE (Track M performance).
   *
   * These ran one after another, about fifteen round trips before the first
   * byte left the server: 680ms on production for a listing, and the reader
   * watched the loading state for all of it. Each read needs only the listing
   * (and the reader's session, for the three that follow), so they go out
   * together and the page waits for the slowest one. What each read is, and
   * when it is skipped, is unchanged.
   */
  const [
    reviews,
    credentials,
    doorHonesty,
    record,
    viewingSlots,
    blockedDates,
    savedListings,
    session,
    showMeOpen,
    commute,
    neighboursFlag,
    access,
    recentlyLet,
  ] = await Promise.all([
    // Written reviews for this listing. Public by policy for a PUBLISHED
    // listing, so this read works for a signed-out visitor too.
    getListingReviews(listing.id, locale),
    /* V-87: the lister's dated credential checks, for the proof strip. */
    listing.isDemo ? Promise.resolve([]) : readListingCredentials(listing.id),
    listing.isDemo ? Promise.resolve(null) : readDoorHonesty(listing.id),
    /* V-34: the lister's Record under the agent card. An example listing has
       no Record, and a null draws nothing. */
    listing.isDemo ? Promise.resolve(null) : readListingRecord(listing.id),
    /* V-94: free viewing slots, read only for a rental (null or empty draws nothing). */
    isRental ? readViewingSlots(listing.id) : Promise.resolve(null),
    // Nights a guest cannot pick: booked or blocked dates from the platform
    // calendar. Empty for catalogue listings and when Supabase is not
    // configured, so the picker simply has nothing to refuse.
    isBookable ? getBlockedDates(listing.id) : Promise.resolve([]),
    // The heart opens in the right state for a signed-in account. Device saves
    // live in localStorage and are reconciled by the control itself on mount.
    getSavedListings(),
    // Reporting belongs to somebody, so the sheet needs to know whether there
    // is a somebody. Signed out is a designed state inside the sheet rather
    // than a hidden control: a visitor who spots a scam should not have to
    // guess that reporting exists.
    resolveSession(),
    /* V-41: the neighbours' account, for a home to let or sell. */
    flagIsOn(SHOW_ME_FLAG),
    /* V-43: rush-hour bands from this area (nothing when the flag is off). */
    (isRental || isSale) && !listing.isDemo
      ? readCommutesFrom({ stateCode: listing.stateCode, area: listing.area, city: listing.city })
      : Promise.resolve({ anchors: 0, rows: [] }),
    isRental || isSale ? flagIsOn(NEIGHBOURS_FLAG) : Promise.resolve(false),
    /* Light, water and the gate. The first two are public columns; the gate
       details are read through the caller's own policies and come back null
       for anyone who is not the host, an admin, or a guest holding a CONFIRMED
       booking on this listing. A refusal and an absence are the same answer
       here on purpose, so nobody can learn whether a code exists by watching
       the page change. */
    readListingAccess(listing.id),
    /* V-14's "recently let" line, for a rental. PERF-SWEEP 3: read with the
       rest rather than in series while the page renders. */
    isRental ? readRecentlyLet(listing.id) : Promise.resolve(null),
  ]);
  /* V-59: "Moved in for the Vallo price", the one public number from the
     tenancy reviews. Null (and no line) on every example listing. */
  const doorLine = doorHonesty === null ? null : doorHonestyLine(doorHonesty, t.trustVisible.tenancy);
  const initialSaved = savedListings.some((entry) => entry.listing.id === listing.id);
  const signedIn = session.state === "signed-in";

  /* V-41: the neighbours' account is read with the caller's session; the
     summary function applies its own threshold. These three need the session,
     so they follow the reads above, together. */
  const neighboursOn = (isRental || isSale) && session.state === "signed-in" && neighboursFlag;
  const [bookingConfirmed, neighbours, flooding] = await Promise.all([
    session.state === "signed-in"
      ? hasConfirmedBooking(session.supabase, listing.id, session.user.id)
      : Promise.resolve(false),
    neighboursOn && session.state === "signed-in"
      ? readNeighbours(session.supabase, listing.stateCode, listing.area)
      : Promise.resolve({ state: "unavailable" } as const),
    neighboursOn && session.state === "signed-in"
      ? readFlooding(session.supabase, listing.id)
      : Promise.resolve(undefined),
  ]);

  // An area is only worth naming when it says something the city does not.
  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}, ${stateLabel(listing.state)}`
      : `${listing.city}, ${stateLabel(listing.state)}`;

  const kind = KIND_LABEL[listing.kind];
  const market = MARKET_PILL[listingMarket];

  /*
   * What the price buys, from the one place that owns that mapping.
   *
   * This was a local ternary that could only ever answer "per year", "per
   * guest" or "per night", so a monthly rent read as nightly and a SALE read
   * "per night" under its asking price. `PERIOD_SUFFIX` is keyed by the
   * period the database actually stated, and carries "asking price" for the
   * case that has no period at all.
   */
  const perLabel = isSale
    ? PERIOD_SUFFIX.sale
    : listing.pricePeriod
      ? PERIOD_SUFFIX[listing.pricePeriod]
      : isRental
        ? PERIOD_SUFFIX.year
        : PERIOD_SUFFIX.night;

  const amenityNames: Record<string, string> = {
    pool: "a swimming pool",
    wifi: "Wi-Fi",
    kitchen: "a fitted kitchen",
    parking: "parking on site",
  };
  const amenityPhrases = listing.amenities
    .map((a) => amenityNames[a])
    .filter((a): a is string => Boolean(a));
  const amenitySentence =
    amenityPhrases.length > 0
      ? ` Amenities include ${new Intl.ListFormat(intlTag.en, { type: "conjunction" }).format(amenityPhrases)}.`
      : "";

  /*
   * The description, written from the listing record alone. Every sentence is
   * derived from a field that exists, so nothing here can misdescribe the
   * property, and the paragraphs after the first are what Read more reveals.
   */
  const roomPhrase =
    listing.bedrooms > 0
      ? `a ${listing.bedrooms} bedroom, ${listing.bathrooms} bathroom ${kind}`
      : `a ${kind}`;

  const aboutParagraphs: string[] = [
    `${listing.title} is ${roomPhrase} in ${where}.${amenitySentence}`,
  ];

  if (isSale) {
    aboutParagraphs.push(
      "This property is for sale. Message the agent to ask questions and arrange an inspection, and have your own solicitor verify the title before any money changes hands.",
    );
  } else if (isRental) {
    aboutParagraphs.push(
      "This home is let on an annual tenancy. Message the agent to ask questions and arrange an inspection, then pay only after you have inspected the property.",
    );
    aboutParagraphs.push(
      `The rent is quoted for a full year and agreed directly with the agent.${
        listing.verified
          ? " A person at Vallo checked the ID of the agent behind this listing."
          : ""
      }`,
    );
  } else {
    aboutParagraphs.push(
      `${
        listing.instantBook
          ? "Instant Book is available on this listing, so your dates confirm as soon as you reserve."
          : "The agent confirms each booking request personally, so allow a little time for a response."
      } Reserve online, then arrange an inspection with the agent from your Inbox. Pay only after you have inspected the property.`,
    );
    const closing: string[] = [];
    const capacity = capacityOf(listing);
    if (capacity !== null) {
      closing.push(`It sleeps up to ${countOf(capacity, "guests", locale)}.`);
    }
    if (listing.reviewCount > 0) {
      closing.push(
        `Guests have rated it ${formatRating(listing.rating, locale)} out of 5 across ${formatNumber(
          listing.reviewCount,
          locale,
        )} ${t.common.reviews}.`,
      );
    }
    if (listing.verified) {
      closing.push("A person at Vallo checked the ID of the agent behind this listing.");
    }
    if (closing.length > 0) aboutParagraphs.push(closing.join(" "));
  }

  /*
   * ONE PRIMARY ACTION, decided by the market.
   *
   * A stay can be reserved, so its primary is the dates and its quiet second is
   * the conversation. Everything else - a rental, a restaurant, a sale - has
   * exactly one honest path, which is to talk to the agent, so it gets one
   * button at full strength and no decorative twin beside it.
   */
  /*
   * AN EXAMPLE LISTING OFFERS NOTHING, BECAUSE THERE IS NOTHING TO OFFER.
   *
   * The database refuses every transaction against these rows: bookings,
   * inspection requests and reviews are all turned away by trigger, and the
   * lister is an institutional account with nobody behind it to message. So a
   * "Check availability" button here is not merely decorative, it is an offer
   * the platform cannot honour, and the person who presses it gets an error
   * they can do nothing about.
   *
   * Both the panel and the sticky bar therefore explain instead of acting. The
   * one link offered goes to search, because the honest next step for somebody
   * who liked this place is to look for a real one.
   */
  const isExample = listing.isDemo;

  /* V-22: the listed age, from the same pure rule the card uses. */
  const ageNow = new Date();
  const age = isExample ? null : listedAge(listing.publishedAt, ageNow);
  const listedLine = age
    ? listedAgeText(
        age,
        t.shape.listed,
        age.kind === "stale" ? formatDate(age.since, locale, staleMonthOptions(age.since, ageNow)) : "",
      )
    : null;

  /* The footer of 9E8B56ED on a tenancy: Calculate breakdown (the move-in
     ledger) and Book inspection (the real request, in the panel below). A
     stay keeps Check availability with the conversation beside it; a sale
     and a table keep the conversation. */
  /* UX-21: while every listing is an example, "Browse real listings" led back
     to more examples. The honest next step is to be told when a real one
     arrives here: the area's search, where "Save this search" sends alerts. */
  /* D24: the page no longer says the row is an example, so its one action
     no longer says "real" either. What stays true and useful: nothing here
     takes a request, and the area's search is where "Save this search"
     tells the reader when a space there does. */
  const areaName = listing.area || listing.city;
  const realSoonHref = `/search?q=${encodeURIComponent(areaName)}`;
  const stickyAction: StickyAction | null = isExample
    ? { label: sx.closed.action.replace("{area}", areaName), href: realSoonHref }
    : isBookable
      ? { label: t.catalogue.detail.checkAvailability, href: "#reserve" }
      : isRental
        ? { label: t.catalogue.detail.bookInspection, href: "#reserve" }
        : { label: "Message agent", href: messageHref };

  const stickySecondary: StickyAction | null = isExample
    ? /*
       * THE BREAKDOWN SURVIVES ON AN EXAMPLE ROW, and nothing else does.
       *
       * The foot used to carry one control here, which is the founder's
       * send-back note that it shows "a price and Browse real listings"
       * rather than the render's pair. The ledger is honest on this row:
       * it is arithmetic over the figures the row itself states, it
       * commits nobody to anything, and its own page says in full that the
       * listing is an example. The inspection is the one that cannot be
       * offered, so it is the one that stays replaced.
       */
      isRental
      ? { label: t.catalogue.detail.calculateBreakdown, href: `/rent/move-in/${listing.id}` }
      : null
    : isBookable
      ? { label: "Message agent", href: messageHref }
      : isRental
        ? { label: t.catalogue.detail.calculateBreakdown, href: `/rent/move-in/${listing.id}` }
        : null;

  /*
   * THE SAME DISCLOSURE WAS ON THIS PAGE THREE TIMES.
   *
   * The notice sat in the hero above the price, again at the top of this
   * panel, and a third statement of it followed as a full paragraph: "Nothing
   * can be booked, inspected or paid for here, and there is nobody to message
   * about it. When real properties are listed in this area they will appear in
   * search with an owner you can actually reach." Then a filled button, then
   * the same button again in the sticky bar. Five elements, one fact, and
   * between them they pushed the actual property below the fold on a phone.
   *
   * Saying a thing three times does not make it three times as honest. It
   * makes the page read as an apology for itself, which is what the owner saw
   * and objected to. The disclosure stays exactly ONCE, in the hero, where a
   * reader meets it before the price forms a belief; that placement was argued
   * for and it is the right one. What is left here is the CONSEQUENCE, in one
   * line: what you cannot do, and the one link that leads somewhere real.
   */
  const bookingPanel = isExample ? (
    <div className="nf-panel nf-panel--card isolate p-card">
      <p className={TYPE.rowMeta} data-testid="space-closed">
        {sx.closed.body.replace("{area}", areaName)}
      </p>
      <ButtonLink href={realSoonHref} variant="primary" className="mt-block w-full">
        {sx.closed.action.replace("{area}", areaName)}
      </ButtonLink>
    </div>
  ) : isRestaurant ? (
    <div className="flex flex-col gap-md">
      <ReserveTable listingId={listing.id} messageHref={messageHref} success={t.success} />
      <RestaurantPanel listing={listing} locale={locale} messageHref={messageHref} />
    </div>
  ) : isRental || isSale ? (
    /*
      V-14: on a rental, "Still available?" comes first. It is the first
      WhatsApp message about every Nigerian listing; here it is one tap each
      way and a counted answer. A sale keeps its panel as it was.

      The panel gets the SAME period the hero above it gets.

      It used to get none and print "/ year" regardless, so this page could
      state two different units for one price forty pixels apart - and did,
      on every monthly rental and on every sale. `rentPeriodOf` narrows the
      resolved value to what a tenancy can actually be quoted in; a nightly or
      per-head rate never reaches a rental listing, and if one somehow did,
      falling back to the year the rest of this page assumes is better than
      labelling annual rent as nightly.
    */
    <div className="flex flex-col gap-md">
      {isRental && (
        <StillAvailable
          listingId={listing.id}
          copy={t.frontDoor.available}
          recentlyLet={recentlyLet}
          locale={locale}
        />
      )}
      {/* V-94: the lister's free viewing slots, when they have set windows. */}
      {isRental && viewingSlots && viewingSlots.length > 0 && (
        <ViewingSlots listingId={listing.id} slots={viewingSlots} copy={t.frontDoor.viewings} locale={locale} success={t.success} />
      )}
      <RentalPanel
        listingId={listing.id}
        priceMinor={listing.priceMinor}
        currency={listing.currency}
        locale={locale}
        period={isSale ? "sale" : rentPeriodOf(listing.pricePeriod)}
        minimumTenancyMonths={listing.minimumTenancyMonths}
      />
    </div>
  ) : (
    <ReservePanel
      listingId={listing.id}
      currency={listing.currency}
      locale={locale}
      instantBook={listing.instantBook}
      messageHref={messageHref}
      success={t.success}
    />
  );

  /*
   * The key facts, from columns the page has never printed.
   *
   * The schema has carried floor area, furnishing, build condition, year built,
   * toilets, parking, floor level, availability date and minimum tenancy for a
   * while, and not one of them appeared on this screen. They are the questions
   * asked immediately after bed and bath, so they are answered immediately
   * after bed and bath.
   *
   * Built by filtering, so a fact nobody stated is absent rather than rendered
   * as a zero or a dash. `?? undefined` is deliberate on the numeric ones: a
   * stated zero is a real answer ("no parking") and must survive, while an
   * absent column must not.
   */
  const facts: Fact[] = [];
  if (listing.sizeSqm !== undefined) {
    facts.push({
      label: "Floor area",
      value: `${formatNumber(listing.sizeSqm, locale)} m²`,
    });
  }
  if (listing.furnished) {
    facts.push({ label: "Furnishing", value: FURNISHING_LABEL[listing.furnished] });
  }
  if (listing.condition) {
    facts.push({ label: "Condition", value: CONDITION_LABEL[listing.condition] });
  }
  if (listing.yearBuilt !== undefined) {
    facts.push({ label: "Year built", value: String(listing.yearBuilt) });
  }
  if (listing.toilets !== undefined) {
    facts.push({ label: "Toilets", value: formatNumber(listing.toilets, locale) });
  }
  if (listing.parkingSpaces !== undefined) {
    facts.push({
      label: "Parking",
      value:
        listing.parkingSpaces === 0
          ? "None"
          : countOf(listing.parkingSpaces, "spaces", locale),
    });
  }
  if (listing.floor !== undefined) {
    facts.push({
      label: "Floor",
      value:
        listing.floor === 0
          ? "Ground floor"
          : `Floor ${formatNumber(listing.floor, locale)}`,
      note:
        listing.totalFloors !== undefined
          ? `of ${formatNumber(listing.totalFloors, locale)}`
          : undefined,
    });
  }
  if (listing.availableFrom) {
    facts.push({ label: "Available from", value: dateLabel(listing.availableFrom, locale) });
  }
  if (listing.minimumTenancyMonths !== undefined) {
    facts.push({
      label: "Minimum tenancy",
      value: countOf(listing.minimumTenancyMonths, "months", locale),
    });
  }

  /*
   * The trust marks.
   *
   * These were three of the five chips that could stack on the old status row.
   * They are facts about the listing rather than states of it, so they read as
   * a quiet run of icon-and-word marks under the price instead of as three
   * tinted pills competing with the market pill above. No container of any kind
   * behind the glyphs.
   */
  const marks: { icon: UiIconName; label: string }[] = [];
  /* TRUST FACTS ARE DATES, NEVER TICKS (north star 12 point 15). The
     inspection and the address check used to be marks here with no date;
     they are dated rows in "Why trust this space?" now, and what is left in
     this run is the listing's terms, which are not checks of anything. */
  if (listing.instantBook && isBookable) {
    marks.push({ icon: "sparkle", label: "Instant Book" });
  }
  if (listing.negotiable) marks.push({ icon: "chat-bubble", label: "Price negotiable" });

  const proof = proofLines({ ...proofFactsOf(listing), credentials });

  /* The sections, in page order. The row carries the five a reader decides
     on (and reviews, which it always carried); the InnerNav lists them all. */
  const hasCost = isRental || isSale;
  const sectionTabs = [
    { id: "overview", label: sx.sections.overview },
    ...(hasCost ? [{ id: "cost", label: sx.sections.costs }] : []),
    { id: "amenities", label: sx.sections.amenities },
    { id: "trust", label: sx.sections.trust },
    { id: "location", label: sx.sections.location },
    { id: "reviews", label: sx.sections.reviews },
  ];
  const sectionIndex: { id: string; label: string; icon: UiIconName }[] = [
    { id: "overview", label: sx.sections.overview, icon: "home" },
    ...(hasCost ? [{ id: "cost", label: sx.sections.costs, icon: "receipt" as UiIconName }] : []),
    { id: "amenities", label: sx.sections.amenities, icon: "sparkle" },
    { id: "trust", label: sx.sections.trust, icon: "shield-check" },
    ...(facts.length > 0 ? [{ id: "details", label: sx.sections.details, icon: "clipboard-list" as UiIconName }] : []),
    ...((listing.videos?.length ?? 0) > 0 ? [{ id: "walkthrough", label: sx.sections.walkthrough, icon: "circle-play" as UiIconName }] : []),
    ...(listing.photos.length > 1 ? [{ id: "photos", label: sx.sections.photos, icon: "picture" as UiIconName }] : []),
    { id: "location", label: sx.sections.location, icon: "location" },
    { id: "agent", label: sx.sections.agent, icon: "user" },
    { id: "reviews", label: sx.sections.reviews, icon: "star" },
  ];

  /*
   * Structured data, or nothing at all.
   *
   * `listingStructuredData` returns null for an example listing, and null here
   * means no script element is rendered rather than an empty one. That is the
   * whole rule and it is deliberately not softened: a node with the price
   * stripped, or with a caveat property bolted on, is still a machine-readable
   * claim that a property exists at a place, and nothing that consumes
   * structured data is obliged to read a caveat it was not expecting.
   *
   * The nonce is the same one `layout.tsx` reads. `script-src` carries
   * `strict-dynamic` beside the nonce, so an inline block without one is a
   * report at best and a blocked element at worst.
   */
  const structuredData = listingStructuredData(listing, siteUrl());
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  const body = (
    <PhotoViewerProvider
      title={listing.title}
      photos={listing.photos}
      hue={listing.hue}
      kind={listing.kind}
    >
      <div className="nf-cat-surface mx-auto max-w-5xl">
        {structuredData && (
          <script
            type="application/ld+json"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: structuredDataJson(structuredData) }}
          />
        )}

        {/* Nothing rendered. Puts this place in the recently-viewed memory the
            search page offers back, whichever way it was reached. */}
        {/* V-73: this listing was opened (counted once per person per day). */}
        <RecordViews opened={listing.id} />
        {/* B2: with the card's own glance (photo, price line, mark), so
            Home's "Looked at recently" draws a real small card. */}
        <RecordVisit glance={cardGlance(listing, locale, t.catalogue.card)} />

        {/* ------------------------------------------------------- 1. MEDIA */}
        <ListingGallery
          listingId={listing.id}
          floatingBack={false}
          title={listing.title}
          shareTitle={publicListingTitle(listing)}
          hue={listing.hue}
          kind={listing.kind}
          photos={listing.photos}
          drawn={isModestExample(listing)}
          initialSaved={initialSaved}
          backFallback="/home"
          mark={{
            /* Rent and sale in the reader's language. Stays, dining and
               experiences have no key yet: one added in English alone would
               make the three incomplete locales worse, which
               `locale-completeness.test.ts` refuses, so they arrive with
               their translations. */
            label: isSale
              ? t.catalogue.card.forSale
              : listingMarket === "tenancy"
                ? t.catalogue.card.forRent
                : market.label,
            icon: market.icon,
            verified: listing.verified,
            verifiedLabel: t.common.verified,
          }}
        />

        {/*
          The content sheet.

          The content rides UP over the lower edge of the media on a large top
          radius, so the two surfaces overlap instead of meeting at a seam. It
          is glass because the platform's ground is a living ambient canvas
          rather than a solid colour: an opaque panel here would blank the
          artwork every other screen sits on, while glass lets the photograph
          blur through the overlap and the canvas through everything below.

          It is THE PAGE'S GROUND, not a card. Everything inside it is a section
          grouped by heading and space. Nothing inside it draws its own border
          except the booking panel, which is a discrete object rather than a
          section, and which is the only raised surface on the screen.
        */}
        {/*
          THE PAGE GROUND IS THE APP CANVAS, and it used to be a sheet.

          This was one `nf-glass--strong` panel wrapped around the entire
          body, which on the night canvas paints a washed lilac-grey slab
          behind every section: the founder photographed it and called it a
          grey form. The renders put lit glass CARDS on the near-black navy
          page, so the sheet is gone and each section carries its own card.
          The first one overlaps the photograph's lower edge, which is where
          the sheet's radius used to do that job.
        */}
        <div className="relative z-10 -mt-xl sm:-mt-2xl">
          <div className="grid gap-xl lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
            {/* --------------------------------------------- main column */}
            <div className="min-w-0">
              <Stack>
                {/* ------------------------------- 2 to 5. THE LEAD BLOCK
                    The founder's send-back renders: a lit glass card
                    overlapping the photograph, holding the title, the place
                    with its pin, the Move-in Total panel on a tenancy and
                    the small amenity row. The market and the check are on
                    the photograph above it, not repeated here. */}
                <Section className={panelClass({ variant: "card", className: "nf-rise nf-detail-lead scroll-mt-16" })} id="overview">
                  {/*
                    THE MARKET AND THE CHECK ARE ON THE PHOTOGRAPH, not here.
                    The render draws "For Rent" and "Verified" as pills at the
                    hero's bottom left; they were a second row of chips above
                    the title, which is the same fact stated twice and the
                    thing the founder's send-back names first.
                  */}
                  <div className="flex flex-wrap items-center gap-xs empty:hidden">
                    {/* A rating only with the reviews behind it; a count only
                        when the record carries one. The stars are --nf-rating, the warm
                        spark (spec section 18). */}
                    {listing.rating > 0 && listing.reviewCount > 0 && (
                      <span className="nf-numeric ml-auto flex shrink-0 items-center gap-xs">
                        <UiIcon
                          name="star"
                          size={ICON.inline}
                          filled
                          className="text-[var(--nf-rating)]"
                        />
                        <span className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
                          {formatRating(listing.rating, locale)}
                        </span>
                        <span className={TYPE.rowMeta}>
                          {formatNumber(listing.reviewCount, locale)} {t.common.reviews}
                        </span>
                      </span>
                    )}
                  </div>

                  <h1 className="nf-h2 mt-row [overflow-wrap:anywhere]">{listing.title}</h1>

                  <a
                    href="#location"
                    className={`nf-tap mt-inline-tight inline-flex max-w-full items-center gap-inline ${TYPE.body}`}
                  >
                    <UiIcon name="location" size={ICON.inline} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                    <span className="min-w-0">{where}</span>
                    <UiIcon name="arrow-right" size={16} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                  </a>

                  {/* The street address and exact pin, only for the lister,
                      staff, a confirmed viewing or a live agreement. */}
                  {!listing.isDemo && (
                    <Suspense fallback={null}>
                      <ExactPlace listingId={listing.id} />
                    </Suspense>
                  )}

                  {/*
                    THE MOVE-IN TOTAL LEADS ON A TENANCY, AS IT DOES ON THE CARD.

                    This row used to print the yearly rent in the big figure and
                    the move-in block sat three rows lower, so the page led with
                    the number every competitor leads with and the card led with
                    the one this product exists to print (PRODUCT.md section 5:
                    "the card leads with the total move-in cost and the rent is
                    the secondary line"). The founder read the two side by side
                    and saw them disagree. On a tenancy the move-in block now
                    takes this place, with the rent beneath the total inside it,
                    and the rent headline is not drawn a second time. Every other
                    market keeps its headline figure here.
                  */}
                  {isRental && !isSale && (
                    <div className="mt-md" data-testid="detail-lead-move-in">
                      <ListingMoveInBlock listing={listing} locale={locale} t={t} />
                    </div>
                  )}

                  {/* V-69: ask for one clip before crossing Lagos. Behind the
                      show_me flag; never on an example, which has nobody to
                      film anything. */}
                  {showMeOpen && isRental && !isSale && !listing.isDemo && (
                    <div className="mt-sm" data-testid="detail-show-me">
                      <ButtonLink
                        href={`/messages/new?listing=${listing.id}&then=showme`}
                        variant="secondary"
                        className="w-full"
                      >
                        {t.shape.showMe.entry}
                      </ButtonLink>
                      <p className="nf-caption mt-2xs text-[var(--nf-content-muted)]">{t.shape.showMe.entryHint}</p>
                    </div>
                  )}

                  {/* V-31: what the OWNER said about availability, or nothing.
                      Streams on its own and never holds the page. */}
                  {isRental && !isSale && (
                    <Suspense fallback={null}>
                      <OwnerAvailabilityLine listingId={listing.id} isDemo={listing.isDemo} copy={t.landlord.listing} />
                    </Suspense>
                  )}

                  <div className="nf-detail-price-row mt-md">
                    {listing.priceMinor > 0 && !(isRental && !isSale) && (
                      <p className="nf-detail-price" data-testid="detail-price">
                        <Amount
                          minorUnits={listing.priceMinor}
                          locale={locale}
                          currency={listing.currency}
                          secondaryClassName="text-[length:max(0.5em,0.75rem)] font-semibold opacity-70"
                        />
                        <span className="nf-detail-price__suffix">/ {perLabel.replace(/^per /, "")}</span>
                      </p>
                    )}
                    {/* The "Verified listing" chip that stood here was the
                        third statement of one check (the photograph's mark,
                        this, the agent card) and the only one with no date.
                        The check is said on the photograph and dated in
                        "Why trust this space?" below. */}
                  </div>

                  {/* How old it is (V-22). Never on an example, which
                      illustrates a flat that does not exist. */}
                  {listedLine && (
                    <p className={`mt-inline-tight ${TYPE.body}`} data-testid="detail-listed-age">
                      {listedLine}
                    </p>
                  )}

                  {/* The spec pairs live inside the Move-in panel's own box on
                      a tenancy, exactly as the render draws them, so the
                      scrolling chip row is only for the markets that have no
                      such panel. It was drawn on both, and on a phone the
                      second copy ran off the right edge. */}
                  {!(isRental && !isSale) && (
                    <div className="mt-md">
                      <ListingSpecChips chips={specChips(listing, t, locale)} />
                    </div>
                  )}

                  {/* The listing's terms (Instant Book, a negotiable price): icon
                      and word, no container. Not checks, so never a tick. */}
                  {marks.length > 0 && (
                    <ul className="mt-row flex flex-wrap items-center gap-x-lg gap-y-inline">
                      {marks
                        .map((mark) => (
                          <li key={mark.label} className={`flex items-center gap-xs ${TYPE.body}`}>
                            <UiIcon
                              name={mark.icon}
                              size={ICON.inline}
                              className="shrink-0 text-[var(--nf-brand-secondary)]"
                            />
                            <span className="font-normal text-[var(--nf-content-secondary)]">
                              {mark.label}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}

                  {/* The move-in total leads above the price row on a tenancy (see above). */}

                  {/* The compound's answers (V-28); absent when none was given. */}
                  {listing.compound && (
                    <div className="mt-md">
                      <ListingCompound compound={listing.compound} copy={t.shape.compound} />
                    </div>
                  )}

                  {/* What the service charge covers, and Serviced only when
                      the database derived it (V-68). */}
                  {listing.service && (
                    <div className="mt-md">
                      <ListingService service={listing.service} copy={t.shape.service} />
                    </div>
                  )}

                  {/* V-37: every offer on this property, side by side, each with
                      its own move-in total. Nothing when there is one offer. */}
                  {isRental && !isSale && (
                    <Suspense fallback={null}>
                      <PropertyOffers
                        listingId={listing.id}
                        isDemo={listing.isDemo}
                        copy={t.landlord.offers}
                        listingCopy={t.landlord.listing}
                        locale={locale}
                      />
                    </Suspense>
                  )}

                  {listing.amenities.length > 0 && (
                    <div className="mt-md">
                      <ListingAmenityTiles
                        amenities={listing.amenities}
                        limit={5}
                        moreHref="#amenities"
                        moreLabel={t.catalogue.detail.more}
                      />
                    </div>
                  )}
                </Section>

                {/* The anchor row keeps its place (9E8B56ED) and gains the two
                    sections a reader decides on: what it costs and why to
                    trust it. The InnerNav at its end lists every section. */}
                <ListingSectionTabs
                  tabs={sectionTabs}
                  index={{ label: sx.sections.navLabel, toggle: sx.sections.toggle, items: sectionIndex }}
                />

                {/* ---------------------------------------- the description */}
                <div className="nf-detail-panel">
                  <h2 className="nf-detail-panel__title">{t.catalogue.detail.description}</h2>
                  <div className="mt-row">
                    <ListingAbout paragraphs={aboutParagraphs} />
                  </div>
                </div>

                {/* --------------------- 6. THE NIGERIAN NUMBER, ITEMISED */}
                {/*
                  WHAT A TENANT WILL ACTUALLY PAY. The page used to show ONE
                  NUMBER while the component that draws the whole breakdown
                  sat unimported.

                  The block above the fold still leads with the total, which is
                  the figure somebody shops on. This section is the itemised
                  answer to "made up of what", drawn to GOVERNING-08 screen two,
                  including every cost the lister DID NOT declare, because the
                  silence is the finding. A tenancy only: a sale has its own
                  cost model and none of its columns exist yet, which is Group
                  C's schema work.
                */}
                {isRental && !isSale && (
                  <Section
                    id="cost"
                    title={t.moveIn.title}
                    description={t.moveIn.lede}
                    divided
                    className="scroll-mt-16"
                  >
                    <ListingMoveIn listing={listing} locale={locale} t={t} records={await readPayeeRecords(listing.id)} />
                    {/* B8: the door to Price Check, drawn only where it would answer. */}
                    <PriceContextRow listing={listing} locale={locale} />
                    {/* V-38: what this flat was last let at through Vallo. Nothing when there is no such let. */}
                    <LastLetLine listingId={listing.id} locale={locale} />
                    {/* V-70: which of the shot list's photos this listing has. */}
                    <PhotographedLine listingId={listing.id} locale={locale} />
                    {/* V-36: the lister's caution record, once five have settled. */}
                    <CautionRecordLine listingId={listing.id} listerName={null} locale={locale} />
                  </Section>
                )}

                {/* ------------------- 6b. AND THE SAME ANSWER FOR A BUYER */}
                {/*
                  WHAT IT WILL ACTUALLY COST TO BUY, which until this commit
                  this platform could not show anybody. The tenancy block above
                  has listed every cost a tenant meets, declared or not, since
                  Track H; a buyer got an asking price and nothing else, and
                  buying is where a Nigerian is most often surprised by a
                  number. Same anatomy, same honesty rule, and the three
                  statutory charges named as the state's rather than as
                  anybody's on this platform.
                */}
                {isSale && (
                  <Section
                    id="cost"
                    title={t.purchase.title}
                    description={t.purchase.lede}
                    divided
                    className="scroll-mt-16"
                  >
                    <ListingPurchase listing={listing} locale={locale} t={t} />
                  </Section>
                )}

                {isSale && (
                  <Section title="What you would be buying" divided>
                    <ListingTenure listing={listing} />
                  </Section>
                )}

                {/* ------------------------------------------- amenities */}
                <Section id="amenities" title={t.catalogue.detail.amenities} divided className="scroll-mt-16">
                  {listing.amenities.length > 0 ? (
                    <ListingAmenityTiles amenities={listing.amenities} />
                  ) : (
                    <ListingAmenities
                      locale={locale}
                      bedrooms={listing.bedrooms}
                      bathrooms={listing.bathrooms}
                      amenities={listing.amenities}
                      guests={isBookable ? (capacityOf(listing) ?? undefined) : undefined}
                    />
                  )}
                </Section>

                {/* ------------------------- 7. LIGHT, WATER AND THE GATE */}
                {(listing.utilities || neighbours.state !== "unavailable" || flooding !== undefined) && (
                  <Reveal>
                    <Section
                      title="Light, water and getting in"
                      description="The three things worth knowing before you commit: what the agent says, and what residents report where enough have answered."
                      divided
                    >
                      {listing.utilities && (
                        <ListingUtilities
                          locale={locale}
                          utilities={listing.utilities}
                          access={access}
                          bookingConfirmed={bookingConfirmed}
                          copy={sx.utilities}
                        />
                      )}
                      {/* V-41: the lister's flooding answer, and what residents
                          report, beside the claims above. */}
                      <div className="mt-md">
                        <ListingNeighbours
                          neighbours={neighbours}
                          flooding={flooding}
                          area={listing.area || listing.city}
                          copy={t.shape.neighbours}
                        />
                      </div>
                    </Section>
                  </Reveal>
                )}

                {/* ------------------------- WHY TRUST THIS SPACE? (D25) */}
                {/*
                  The dated facts, here in summary, with the door to the inner
                  page that answers the question completely. Every fact is a
                  date; a check that has not happened is not drawn, so a null
                  never reads as a negative.
                */}
                <Reveal>
                  <Section id="trust" title={sx.trust.title} divided className="scroll-mt-16">
                    <TrustFacts
                      listingId={listing.id}
                      trust={trust}
                      strip={
                        /* V-03, THE PROOF STRIP: each line opens what the
                           check is and is not. Nothing at all when nothing is
                           dated, which today is every example listing. */
                        <ProofStrip lines={proof} variant="full" t={forProofStrip(t)} locale={locale} />
                      }
                      proofCount={proof.length}
                      locale={locale}
                      t={t}
                    />
                  </Section>
                </Reveal>

                {/* ------------------------- V-43. GETTING TO WORK FROM HERE */}
                {commute.anchors > 0 && (
                  <Reveal>
                    <Section
                      title={t.shape.commute.locationTitle}
                      description={t.shape.commute.locationLede.replace("{area}", listing.area || listing.city)}
                      divided
                    >
                      {commute.rows.length > 0 ? (
                        <ul className="flex flex-col gap-sm" data-testid="listing-commute">
                          {commute.rows.map((row) => (
                            <li key={row.anchor.id} className="nf-body-sm break-words text-[var(--nf-content-secondary)]">
                              {commuteLine(row.bands, row.anchor.name, t.shape.commute)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="nf-caption text-[var(--nf-content-muted)]">
                          {t.shape.commute.locationNone.replace("{area}", listing.area || listing.city)}
                        </p>
                      )}
                    </Section>
                  </Reveal>
                )}

                {/* -------------------------------------- 8. THE DETAILS */}
                {facts.length > 0 && (
                  <Reveal>
                    <Section id="details" title="The details" divided className="scroll-mt-16">
                      <FactGrid facts={facts} />
                    </Section>
                  </Reveal>
                )}

                {/* "About this place" stood here and printed the same
                    paragraphs as the description above, word for word. One
                    statement of a thing is enough. */}

                {/* ------------------------------------------ listing code */}
                {/*
                  THE CODE, WHERE SOMEBODY WOULD BE STANDING WHEN THEY READ IT
                  OUT. A person on the phone to a friend about this exact flat
                  needs nine characters, not a URL with a uuid in it. Every
                  listing on this page is PUBLISHED, so the code always exists;
                  it is still guarded, because the model carries it as optional
                  and a guard is cheaper than a promise.
                */}
                {listing.reference && (
                  <Reveal>
                    <Section divided>
                      <ListingCodeRow code={listing.reference} copy={t.listingReference} />
                    </Section>
                  </Reveal>
                )}

                {/* ------------------------------ booking panel, mobile */}
                {/*
                  The anchor stays in the document at every width while only the
                  panel inside it is dropped from `lg` up, so the pinned bar's
                  Check availability always has a target to scroll to.
                */}
                <div id="reserve" className="scroll-mt-20">
                  <div className="lg:hidden">{bookingPanel}</div>
                </div>

                {/* ------------------------------------------ photo grid */}
                {/* A single photograph is already the hero; a grid of one
                    states nothing, so it is not rendered below two. */}
                {/* ---------------------------------------- walkthrough */}
                {/*
                  ABOVE THE PHOTOGRAPHS, DELIBERATELY. A walk through a
                  property is the one piece of evidence on this page that is
                  genuinely hard to fake, which in a market where photographs
                  are routinely of a different flat makes it worth more than
                  all of them. It is also the thing the approval email has been
                  advertising to listers while no renter could watch one.
                */}
                {(listing.videos?.length ?? 0) > 0 && (
                  <Reveal>
                    <Section id="walkthrough" title="Walkthrough" divided className="scroll-mt-16">
                      <ListingWalkthrough videos={listing.videos ?? []} title={listing.title} />
                    </Section>
                  </Reveal>
                )}

                {listing.photos.length > 1 && (
                  <Reveal>
                    {/* No section title: the grid carries its own "Photos"
                        heading beside "Show all", and the page drew the word
                        twice in a row (Track M tidy). */}
                    <Section id="photos" divided className="scroll-mt-16">
                      <ListingPhotoGrid
                        photos={listing.photos}
                        hue={listing.hue}
                        kind={listing.kind}
                        title={listing.title}
                      />
                    </Section>
                  </Reveal>
                )}

                {/* ------------------------------------------- location */}
                <Section id="location" title={t.catalogue.detail.location} divided className="scroll-mt-16">
                  <div className="nf-detail-panel">
                    <p className={`flex items-start gap-inline ${TYPE.body}`}>
                      <UiIcon name="location" size={ICON.inline} className="mt-3xs shrink-0 text-[var(--nf-brand-secondary)]" />
                      <span className="min-w-0">{where}</span>
                    </p>
                    {/*
                      TRAVEL TIME WAS REMOVED AND IT IS NOT COMING BACK AS A
                      STUB. It posted to `/api/travel-time`, a route that has
                      never existed in this tree, and its designed failure was
                      to hide itself. So the whole of it, from a person's side,
                      was: tap a control, grant a location permission whose
                      alert promised the position stayed on the device, and
                      watch the control vanish. A bug, a broken promise and a
                      permission prompt with no payoff, in one tap. Building
                      the routing integration is a feature with its own
                      provider key, not a rejection fix. See the store research
                      file, A.3 fix 1.
                    */}
                  </div>
                </Section>

                {/* ------------------------------------------ agent card */}
                <Reveal>
                  <Section id="agent" title={t.catalogue.detail.agent} divided className="scroll-mt-16">
                    {/*
                      THE LAST MILE OF TRACK G, AND IT IS ONE PROP.
                      `listings.listing_role` has been live and not null on
                      every row since Track G migration 3, and this card has
                      mounted `ListerRoleLine` for it since the same week. The
                      value simply never travelled: the read did not select the
                      column. It does now, so "Listed by the owner" is on a
                      screen rather than in a constant with a passing test.
                      Absent draws no line, which is what this card drew before.

                      AND THE NAME, WHICH IS THE OTHER HALF. Two of the three
                      sentences carry `{name}` and the public read could not
                      fill either one, so on all 64 live listings, every one of
                      them `listing_role = 'agent'`, the line appeared on zero
                      screens. `listing.listerName` comes from
                      `public.listing_lister`, a published view of exactly two
                      columns added by migration `20260923103838`. It carries a
                      name and nothing else about the person.
                    */}
                    <ListingAgentCard
                      verified={listing.verified}
                      t={t}
                      messageHref={messageHref}
                      name={listing.listerName ?? null}
                      listingRole={listing.listerRole ?? null}
                    />
                    {/* B7: the reply-time line, only when the record supports one. */}
                    <ReplyTimeLine listingId={listing.id} locale={locale} className="mt-2xs" />
                    <ValloRecord record={record} t={t} locale={locale} className="mt-row" />
                  </Section>
                </Reveal>

                {/* --------------------------------------------- reviews */}
                {/* The band renders nothing rather than inventing
                    testimonials, and suppresses a count that is zero. Both
                    behaviours are correct and are preserved exactly. */}
                <Reveal>
                  <Section id="reviews" title={t.catalogue.detail.reviews} divided className="scroll-mt-16">
                    {doorLine && (
                      <p className={`mb-row ${TYPE.body}`} data-testid="door-honesty">
                        {doorLine}
                      </p>
                    )}
                    <ListingReviews
                      rating={listing.rating}
                      reviewCount={listing.reviewCount}
                      reviews={reviews}
                      locale={locale}
                      t={t}
                      signedIn={signedIn}
                      tenancy={isRental}
                    />
                  </Section>
                </Reveal>

                {/* ------------------------------- the long tail, one tap */}
                {/*
                  MOVED, NOT DELETED. The cancellation schedule is real and
                  occasionally decisive, and it is not what somebody deciding
                  whether to enquire needs in front of them. It sits behind a
                  disclosure with the report control, which is the thing you go
                  looking for rather than the thing you are offered, and which
                  must always be findable.

                  Not on a rental or a sale: neither has a booking to cancel.
                */}
                <Section divided>
                  <div className="divide-y divide-[var(--nf-panel-hair)]">
                    {isBookable && (
                      <Disclosure
                        label="Cancellation policy"
                        hint="What you get back, and when"
                        data-testid="cancellation-disclosure"
                      >
                        <CancellationTimeline locale={locale} headingLevel="h3" />
                      </Disclosure>
                    )}
                    <div className="py-md">
                      <ReportSheet
                        targetType="listing"
                        targetId={listing.id}
                        targetLabel={listing.title}
                        signedIn={signedIn}
                      />
                    </div>
                  </div>
                </Section>
              </Stack>
            </div>

            {/* ------------------------------- booking panel, desktop */}
            <aside className="hidden lg:sticky lg:top-6 lg:block">{bookingPanel}</aside>
          </div>
        </div>

        {/* The clearance the pinned bar needs is the bar's own measured
            height, and `ListingStickyBar` now ships its own spacer, so the
            hardcoded `5.5rem` that used to stand here (shorter than the bar
            at 390, which is why the tabs painted under it) is gone. */}
        <ListingStickyBar
          variant={isBookable ? "stay" : "rental"}
          priceMinor={listing.priceMinor}
          currency={listing.currency}
          locale={locale}
          perLabel={perLabel}
          action={stickyAction}
          secondary={stickySecondary}
          secondaryIcon={isRental ? "document" : undefined}
          fallbackLabel={listing.title}
          moveInMinor={listing.moveInCostMinor}
          moveInStated={listing.moveInCostStated}
          moveInLabel={t.catalogue.detail.moveInTotal}
          moveInFromLabel={t.catalogue.detail.moveInFrom}
          secondaryShortLabel={t.catalogue.detail.breakdownShort}
          sidePanelFromLg
        />
      </div>
    </PhotoViewerProvider>
  );

  // Only a stay has dates to share, and the provider is what keeps the panel
  // and the sticky bar quoting one number instead of two.
  if (!isBookable) return body;
  return (
    <StayDatesProvider
      today={today}
      blockedDates={blockedDates}
      priceMinor={listing.priceMinor}
      cleaningMinor={listing.cleaningMinor ?? 0}
      serviceMinor={listing.serviceMinor ?? 0}
      capacity={capacityOf(listing)}
      requested={{ checkIn: requested.checkIn, checkOut: requested.checkOut, guests: requested.guests }}
    >
      {body}
    </StayDatesProvider>
  );
}

/**
 * The panel a restaurant of ours gets.
 *
 * The difference between this and a stay is the two things only a first-party
 * listing can have: somebody to message, and a table that can actually be held.
 * A restaurant is priced per head rather than per night, which is the rule
 * `lib/listings/types.ts` already states for this category, and one that has
 * not stated a price shows none rather than a zero.
 */
function RestaurantPanel({
  listing,
  locale,
  messageHref,
}: {
  listing: Listing;
  locale: Locale;
  messageHref: string;
}) {
  return (
    <div className="nf-panel nf-panel--card isolate p-lg">
      {listing.priceMinor > 0 && (
        <p>
          <Amount
            minorUnits={listing.priceMinor}
            locale={locale}
            currency={listing.currency}
            className="nf-figure leading-none"
            secondaryClassName="text-[length:max(0.54em,0.75rem)] font-semibold opacity-60"
          />
          <span className={`ml-2xs ${TYPE.body}`}>per head</span>
        </p>
      )}

      <p className={`mt-xs ${TYPE.body}`}>
        Listed on Vallo by the person who runs it. Message them to ask about a
        table, a large party or anything the page does not answer.
      </p>

      <ButtonLink href={messageHref} variant="secondary" full className="mt-md">
        Message
      </ButtonLink>

    </div>
  );
}
