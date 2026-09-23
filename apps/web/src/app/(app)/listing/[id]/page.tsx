import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NONCE_HEADER } from "@/lib/security/csp";
import { getDictionary, type Locale, formatRating } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
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
import { formatNumber } from "@vallo/i18n";
import { getBlockedDates } from "@/lib/bookings/queries";
import { getListingReviews } from "@/lib/reviews/queries";
import { getSavedListings } from "@/lib/saved/queries";
import { lagosToday } from "@/lib/bookings/schema";
import { ExampleNotice } from "@/components/app/listing/ExampleNotice";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { RecordVisit } from "@/components/app/listing/RecordVisit";
import { ReservePanel } from "./ReservePanel";
import { RentalPanel } from "./RentalPanel";
import { ReserveTable } from "./ReserveTable";
import { ListingAbout } from "@/components/app/listing/ListingAbout";
import { ListingAmenities } from "@/components/app/listing/ListingAmenities";
import { ListingAmenityTiles } from "@/components/app/listing/ListingAmenityTiles";
import { ListingAgentCard } from "@/components/app/listing/ListingAgentCard";
import { ListingMoveInBlock } from "@/components/app/listing/ListingMoveInBlock";
import { ListingCodeRow } from "@/components/app/listing/ListingCode";
import { ListingMoveIn } from "@/components/app/listing/ListingMoveIn";
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
import { PhotoViewerProvider } from "@/components/app/listing/PhotoViewer";
import { ReportSheet } from "@/components/app/ReportSheet";
import { resolveSession } from "@/lib/actions/session";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import type { StatusTone } from "@/components/ui/StatusPill";
import { Disclosure } from "@/components/app/Disclosure";
import { FactGrid, ICON, Section, Stack, TYPE, type Fact } from "@/components/app/Screen";

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

const MARKET_PILL: Record<ListingKind, { icon: UiIconName; label: string; tone: StatusTone }> = {
  rental: { icon: "key", label: "For rent", tone: "brand" },
  hotel: { icon: "calendar-booking", label: "For stays", tone: "success" },
  apartment: { icon: "calendar-booking", label: "For stays", tone: "success" },
  home: { icon: "calendar-booking", label: "For stays", tone: "success" },
  shortlet: { icon: "calendar-booking", label: "For stays", tone: "success" },
  villa: { icon: "calendar-booking", label: "For stays", tone: "success" },
  /* Semantic, never generic grey: a status pill in a neutral wash reads as an
     absence of state rather than as a market. */
  restaurant: { icon: "utensils", label: "Dining", tone: "info" },
  experience: { icon: "ticket", label: "Experience", tone: "info" },
  /* Commercial space and land are let on a tenancy exactly like a rental, so
     they read as the same market and take the same key glyph and brand tint.
     What they are individually is already said by `KIND_LABEL`; the pill
     answers "which market am I in", not "what is this". */
  shop: { icon: "key", label: "For rent", tone: "brand" },
  office: { icon: "key", label: "For rent", tone: "brand" },
  land: { icon: "key", label: "For rent", tone: "brand" },
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
  return new Intl.DateTimeFormat(locale === "en" ? "en-NG" : undefined, {
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
  const listing = await getListingRepository().byId(id);
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  const listing = await getListingRepository().byId(id);
  if (!listing) notFound();

  // Written reviews for this listing. Public by policy for a PUBLISHED listing,
  // so this read works for a signed-out visitor too.
  const reviews = await getListingReviews(listing.id, locale);

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
  const isRental = listing.kind === "rental";

  /* A restaurant is ours to take a booking for, and it is NOT a stay. Without
     this it fell into the nightly branch and drew a date range picker, a
     cleaning fee and a per-night total for a table. What a restaurant takes is
     a party size at a moment (docs/HYBRID_INVENTORY.md section 9). */
  const isRestaurant = listing.kind === "restaurant";

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

  // Nights a guest cannot pick: booked or blocked dates from the platform
  // calendar. Empty for catalogue listings and when Supabase is not configured,
  // so the picker simply has nothing to refuse.
  const blockedDates = isBookable ? await getBlockedDates(listing.id) : [];
  const today = lagosToday();

  // The heart opens in the right state for a signed-in account. Device saves
  // live in localStorage and are reconciled by the control itself on mount.
  const initialSaved = (await getSavedListings()).some(
    (entry) => entry.listing.id === listing.id,
  );

  // Reporting belongs to somebody, so the sheet needs to know whether there is
  // a somebody. Signed out is a designed state inside the sheet rather than a
  // hidden control: a visitor who spots a scam should not have to guess that
  // reporting exists.
  const session = await resolveSession();
  const signedIn = session.state === "signed-in";

  /* Light, water and the gate. The first two are public columns; the gate
     details are read through the caller's own policies and come back null for
     anyone who is not the host, an admin, or a guest holding a CONFIRMED
     booking on this listing. A refusal and an absence are the same answer here
     on purpose, so nobody can learn whether a code exists by watching the page
     change. */
  const [access, bookingConfirmed] = await Promise.all([
    readListingAccess(listing.id),
    session.state === "signed-in"
      ? hasConfirmedBooking(session.supabase, listing.id, session.user.id)
      : Promise.resolve(false),
  ]);

  // An area is only worth naming when it says something the city does not.
  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}, ${stateLabel(listing.state)}`
      : `${listing.city}, ${stateLabel(listing.state)}`;

  const kind = KIND_LABEL[listing.kind];
  const market = MARKET_PILL[listing.kind];

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
      ? ` Amenities include ${
          amenityPhrases.length === 1
            ? amenityPhrases[0]
            : `${amenityPhrases.slice(0, -1).join(", ")} and ${amenityPhrases[amenityPhrases.length - 1]}`
        }.`
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
          ? " The agent and this property were checked by Vallo before the listing went live."
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
      closing.push(`It sleeps up to ${capacity} ${capacity === 1 ? "guest" : "guests"}.`);
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
      closing.push("The agent and this property were checked by Vallo before it went live.");
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

  /* The footer of 9E8B56ED on a tenancy: Calculate breakdown (the move-in
     ledger) and Book inspection (the real request, in the panel below). A
     stay keeps Check availability with the conversation beside it; a sale
     and a table keep the conversation. */
  const stickyAction: StickyAction | null = isExample
    ? { label: "Browse real listings", href: "/search" }
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
    <div className="nf-card p-card">
      <p className={TYPE.rowMeta}>
        Nothing here can be booked or paid for. Search for a real place with an
        owner you can reach.
      </p>
      <ButtonLink href="/search" variant="primary" className="mt-block w-full">
        Browse real listings
      </ButtonLink>
    </div>
  ) : isRestaurant ? (
    <div className="flex flex-col gap-md">
      <ReserveTable listingId={listing.id} messageHref={messageHref} />
      <RestaurantPanel listing={listing} locale={locale} messageHref={messageHref} />
    </div>
  ) : isRental || isSale ? (
    /*
      The panel gets the SAME period the hero above it gets.

      It used to get none and print "/ year" regardless, so this page could
      state two different units for one price forty pixels apart - and did,
      on every monthly rental and on every sale. `rentPeriodOf` narrows the
      resolved value to what a tenancy can actually be quoted in; a nightly or
      per-head rate never reaches a rental listing, and if one somehow did,
      falling back to the year the rest of this page assumes is better than
      labelling annual rent as nightly.
    */
    <RentalPanel
      listingId={listing.id}
      priceMinor={listing.priceMinor}
      currency={listing.currency}
      locale={locale}
      period={isSale ? "sale" : rentPeriodOf(listing.pricePeriod)}
      minimumTenancyMonths={listing.minimumTenancyMonths}
    />
  ) : (
    <ReservePanel
      listingId={listing.id}
      currency={listing.currency}
      locale={locale}
      instantBook={listing.instantBook}
      messageHref={messageHref}
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
          : `${formatNumber(listing.parkingSpaces, locale)} ${listing.parkingSpaces === 1 ? "space" : "spaces"}`,
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
      value: `${formatNumber(listing.minimumTenancyMonths, locale)} ${
        listing.minimumTenancyMonths === 1 ? "month" : "months"
      }`,
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
  if (listing.verified) marks.push({ icon: "verified", label: t.common.verified });
  if (listing.instantBook && isBookable) {
    marks.push({ icon: "sparkle", label: "Instant Book" });
  }
  if (listing.inspectedAt) marks.push({ icon: "home", label: "Inspected by Vallo" });
  if (listing.addressVerifiedAt) marks.push({ icon: "location", label: "Address checked" });
  if (listing.negotiable) marks.push({ icon: "chat-bubble", label: "Price negotiable" });

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
        <RecordVisit
          id={listing.id}
          title={listing.title}
          place={
            listing.area && listing.area !== listing.city
              ? `${listing.area}, ${listing.city}`
              : listing.city
          }
        />

        {/* ------------------------------------------------------- 1. MEDIA */}
        <ListingGallery
          listingId={listing.id}
          title={listing.title}
          hue={listing.hue}
          kind={listing.kind}
          photos={listing.photos}
          initialSaved={initialSaved}
          backFallback="/home"
          mark={{
            label: isSale ? t.catalogue.card.forSale : market.label,
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
                <Section className="nf-rise nf-glass nf-glass--card nf-detail-lead scroll-mt-16" id="overview">
                  {/*
                    THE MARKET AND THE CHECK ARE ON THE PHOTOGRAPH, not here.
                    The render draws "For Rent" and "Verified" as pills at the
                    hero's bottom left; they were a second row of chips above
                    the title, which is the same fact stated twice and the
                    thing the founder's send-back names first.
                  */}
                  <div className="flex flex-wrap items-center gap-xs empty:hidden">
                    {/* A rating only with the reviews behind it; a count only
                        when the record carries one. Blue, never gold. */}
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
                    className={`mt-inline-tight inline-flex max-w-full items-center gap-inline ${TYPE.body}`}
                  >
                    <UiIcon name="location" size={ICON.inline} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                    <span className="min-w-0">{where}</span>
                    <UiIcon name="arrow-right" size={16} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                  </a>

                  {/* Above the price, and that position is the point: the
                      disclosure lands before the belief the figure forms. */}
                  {listing.isDemo && <ExampleNotice variant="page" className="mt-row" />}

                  <div className="nf-detail-price-row mt-md">
                    {listing.priceMinor > 0 && (
                      <p className="nf-detail-price" data-testid="detail-price">
                        <Amount
                          minorUnits={listing.priceMinor}
                          locale={locale}
                          currency={listing.currency}
                          secondaryClassName="text-[0.5em] font-semibold opacity-70"
                        />
                        <span className="nf-detail-price__suffix">/ {perLabel.replace(/^per /, "")}</span>
                      </p>
                    )}
                    {listing.verified && (
                      <span className="nf-detail-verified" data-testid="verified-listing">
                        <UiIcon name="verified" size={ICON.inline} />
                        {t.catalogue.detail.verifiedListing}
                      </span>
                    )}
                  </div>

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

                  {/* The remaining trust marks: icon and word, no container. */}
                  {marks.filter((mark) => mark.icon !== "verified").length > 0 && (
                    <ul className="mt-row flex flex-wrap items-center gap-x-lg gap-y-inline">
                      {marks
                        .filter((mark) => mark.icon !== "verified")
                        .map((mark) => (
                          <li key={mark.label} className={`flex items-center gap-xs ${TYPE.body}`}>
                            <UiIcon
                              name={mark.icon}
                              size={ICON.inline}
                              className="shrink-0 text-[var(--nf-status-verified)]"
                            />
                            <span className="font-medium text-[var(--nf-content-secondary)]">
                              {mark.label}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}

                  {/* The Nigerian number, on a tenancy: the total to move in. */}
                  {isRental && !isSale && (
                    <div className="mt-md">
                      <ListingMoveInBlock listing={listing} locale={locale} t={t} />
                    </div>
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

                <ListingSectionTabs
                  tabs={[
                    { id: "overview", label: t.catalogue.detail.overview },
                    { id: "amenities", label: t.catalogue.detail.amenities },
                    { id: "location", label: t.catalogue.detail.location },
                    { id: "reviews", label: t.catalogue.detail.reviews },
                  ]}
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
                  WHAT A TENANT WILL ACTUALLY PAY, and until this commit the
                  page showed ONE NUMBER while the component that draws the
                  whole breakdown sat unimported (HANDOFF 09 section 4.1).

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
                    <ListingMoveIn listing={listing} locale={locale} t={t} />
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
                      bedrooms={listing.bedrooms}
                      bathrooms={listing.bathrooms}
                      amenities={listing.amenities}
                      guests={isBookable ? (capacityOf(listing) ?? undefined) : undefined}
                    />
                  )}
                </Section>

                {/* ------------------------- 7. LIGHT, WATER AND THE GATE */}
                {listing.utilities && (
                  <Reveal>
                    <Section
                      title="Light, water and getting in"
                      description="The three things worth knowing before you commit, answered by the agent."
                      divided
                    >
                      <ListingUtilities
                        utilities={listing.utilities}
                        access={access}
                        bookingConfirmed={bookingConfirmed}
                      />
                    </Section>
                  </Reveal>
                )}

                {/* -------------------------------------- 8. THE DETAILS */}
                {facts.length > 0 && (
                  <Reveal>
                    <Section title="The details" divided>
                      <FactGrid facts={facts} />
                    </Section>
                  </Reveal>
                )}

                {/* ------------------------------------------------ about */}
                <Reveal>
                  <Section title="About this place" divided>
                    <ListingAbout paragraphs={aboutParagraphs} />
                  </Section>
                </Reveal>

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
                    <Section title="Walkthrough" divided>
                      <ListingWalkthrough videos={listing.videos ?? []} title={listing.title} />
                    </Section>
                  </Reveal>
                )}

                {listing.photos.length > 1 && (
                  <Reveal>
                    <Section title="Photos" divided>
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
                  <Section title={t.catalogue.detail.agent} divided>
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
                  </Section>
                </Reveal>

                {/* --------------------------------------------- reviews */}
                {/* The band renders nothing rather than inventing
                    testimonials, and suppresses a count that is zero. Both
                    behaviours are correct and are preserved exactly. */}
                <Reveal>
                  <Section id="reviews" title={t.catalogue.detail.reviews} divided className="scroll-mt-16">
                    <ListingReviews
                      rating={listing.rating}
                      reviewCount={listing.reviewCount}
                      reviews={reviews}
                      locale={locale}
                      t={t}
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
                  <div className="divide-y divide-[var(--nf-border-subtle)]">
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
    <div className="nf-card p-lg">
      {listing.priceMinor > 0 && (
        <p>
          <Amount
            minorUnits={listing.priceMinor}
            locale={locale}
            currency={listing.currency}
            className="text-[1.5rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
            secondaryClassName="text-[0.54em] font-semibold opacity-60"
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
