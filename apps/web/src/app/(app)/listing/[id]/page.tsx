import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NONCE_HEADER } from "@/lib/security/csp";
import { getDictionary, type Dictionary, type Locale, formatRating } from "@naijafinds/i18n";
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
} from "@/lib/listings/pricing";
import { formatNumber } from "@naijafinds/i18n";
import { getBlockedDates } from "@/lib/bookings/queries";
import { getListingReviews } from "@/lib/reviews/queries";
import { getSavedListings } from "@/lib/saved/queries";
import { lagosToday } from "@/lib/bookings/schema";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { RecordVisit } from "@/components/app/listing/RecordVisit";
import { TravelTime } from "@/components/app/listing/TravelTime";
import { ReservePanel } from "./ReservePanel";
import { RentalPanel } from "./RentalPanel";
import { ReserveTable } from "./ReserveTable";
import { ListingAbout } from "@/components/app/listing/ListingAbout";
import { ListingAmenities } from "@/components/app/listing/ListingAmenities";
import { ListingPhotoGrid } from "@/components/app/listing/ListingPhotoGrid";
import { ListingUtilities } from "@/components/app/listing/ListingUtilities";
import { ListingMoveIn } from "@/components/app/listing/ListingMoveIn";
import { ListingTenure } from "@/components/app/listing/ListingTenure";
import { readListingAccess } from "@/lib/listings/access-queries";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ListingHostPanel } from "@/components/app/listing/ListingHostPanel";
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
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
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
      "This property is for sale. Message the agent to ask questions and arrange a viewing, and have your own solicitor verify the title before any money changes hands.",
    );
  } else if (isRental) {
    aboutParagraphs.push(
      "This home is let on an annual tenancy. Message the agent to ask questions and arrange an inspection, then pay only after you have inspected the property.",
    );
    aboutParagraphs.push(
      `The rent is quoted for a full year and agreed directly with the agent.${
        listing.verified
          ? " The agent and this property were checked by RentMe before the listing went live."
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
      closing.push("The agent and this property were checked by RentMe before it went live.");
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
  const stickyAction: StickyAction | null = isBookable
    ? { label: "Check availability", href: "#reserve" }
    : { label: isSale ? "Message agent" : "Message agent", href: messageHref };

  const stickySecondary: StickyAction | null = isBookable
    ? { label: "Message agent", href: messageHref }
    : null;

  const bookingPanel = isRestaurant ? (
    <div className="flex flex-col gap-4">
      <ReserveTable listingId={listing.id} messageHref={messageHref} />
      <RestaurantPanel listing={listing} locale={locale} t={t} messageHref={messageHref} />
    </div>
  ) : isRental || isSale ? (
    <RentalPanel
      listingId={listing.id}
      priceMinor={listing.priceMinor}
      currency={listing.currency}
      locale={locale}
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
  if (listing.inspectedAt) marks.push({ icon: "home", label: "Inspected by RentMe" });
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
    <PhotoViewerProvider title={listing.title} photos={listing.photos} hue={listing.hue}>
      <div className="mx-auto max-w-5xl">
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
          photos={listing.photos}
          initialSaved={initialSaved}
          backFallback="/home"
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
        <div className="nf-glass nf-glass--strong relative z-10 -mx-5 -mt-8 rounded-t-[1.75rem] border-x-0 border-b-0 px-5 pb-6 pt-7 sm:-mt-10 sm:rounded-t-[2.25rem] sm:px-6 sm:pb-8 sm:pt-9 md:-mx-8 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
            {/* --------------------------------------------- main column */}
            <div className="min-w-0">
              <Stack>
                {/* ------------------------------- 2 to 5. THE LEAD BLOCK */}
                <Section className="nf-rise">
                  {/*
                    ONE LINE OF STATUS. The market on the left, the rating on
                    the right, and nothing else. This row could previously carry
                    five simultaneous pills; verification, Instant Book and the
                    rest moved down to the trust marks under the price, where
                    they are facts rather than competing states.
                  */}
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone={market.tone} icon={market.icon} size="sm">
                      {market.label}
                    </StatusPill>

                    {listing.rating > 0 && (
                      <span className="nf-numeric ml-auto flex shrink-0 items-center gap-2">
                        <UiIcon
                          name="star"
                          size={ICON.inline}
                          filled
                          className="text-[var(--nf-rating)]"
                        />
                        <span className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">
                          {formatRating(listing.rating, locale)}
                        </span>
                        {/* The count renders only when the record carries one.
                            A rating with no reviews shows the rating alone
                            rather than a fabricated "(0)". */}
                        {listing.reviewCount > 0 && (
                          <span className={TYPE.rowMeta}>
                            {formatNumber(listing.reviewCount, locale)} {t.common.reviews}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <h1 className="mt-4 text-[1.625rem] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--nf-content-primary)] sm:text-[2.25rem]">
                    {listing.title}
                  </h1>

                  <p className={`mt-2.5 flex items-center gap-2 ${TYPE.bodyLg}`}>
                    <UiIcon name="location" size={ICON.inline} className="shrink-0" />
                    <span className="min-w-0">{where}</span>
                  </p>

                  {/* The price is what this screen sells, so it is the hero
                      figure. It never truncates: a clipped price states a wrong
                      number, which is one of the two things the reference
                      platforms do badly and we do not copy. */}
                  {listing.priceMinor > 0 && (
                    <p className="mt-5">
                      <Amount
                        minorUnits={listing.priceMinor}
                        locale={locale}
                        currency={listing.currency}
                        suffix={perLabel}
                        className={TYPE.display}
                        secondaryClassName="text-[0.32em] font-semibold opacity-60"
                      />
                    </p>
                  )}

                  {/* The trust marks: icon and word, no container. */}
                  {marks.length > 0 && (
                    <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                      {marks.map((mark) => (
                        <li
                          key={mark.label}
                          className={`flex items-center gap-2 ${TYPE.body}`}
                        >
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

                  {/* Bed, bath and what the place carries, as one inline run. */}
                  <div className="mt-5">
                    <ListingAmenities
                      bedrooms={listing.bedrooms}
                      bathrooms={listing.bathrooms}
                      amenities={listing.amenities}
                      guests={isBookable ? (capacityOf(listing) ?? undefined) : undefined}
                    />
                  </div>
                </Section>

                {/* ----------------------------- 6. THE NIGERIAN NUMBER */}
                {/*
                  On a rental, the total to move in. On a sale, the title.
                  These are the two facts this market decides on and the two
                  the page has never carried.
                */}
                {isSale ? (
                  <Section title="What you would be buying" divided>
                    <ListingTenure listing={listing} />
                  </Section>
                ) : (
                  !isBookable &&
                  !isRestaurant && (
                    <Section title="Moving in" divided>
                      <ListingMoveIn listing={listing} locale={locale} />
                    </Section>
                  )
                )}

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
                {listing.photos.length > 1 && (
                  <Reveal>
                    <Section title="Photos" divided>
                      <ListingPhotoGrid
                        photos={listing.photos}
                        hue={listing.hue}
                        title={listing.title}
                      />
                    </Section>
                  </Reveal>
                )}

                {/* ------------------------------------------ host panel */}
                <Reveal>
                  <Section title="Listed by" divided>
                    <ListingHostPanel
                      verified={listing.verified}
                      t={t}
                      messageHref={messageHref}
                    />
                  </Section>
                </Reveal>

                {/* --------------------------------------------- reviews */}
                {/* The band renders nothing rather than inventing
                    testimonials, and suppresses a count that is zero. Both
                    behaviours are correct and are preserved exactly. */}
                <Reveal>
                  <Section title="Reviews" divided>
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
                    <div className="py-4">
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

        {/* The bar is pinned to the viewport rather than sitting in the flow, so
            the page has to end above it or the last thing on the screen is
            permanently behind glass. */}
        <div
          aria-hidden="true"
          className="h-[5.5rem]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        />

        <ListingStickyBar
          variant={isBookable ? "stay" : "rental"}
          priceMinor={listing.priceMinor}
          currency={listing.currency}
          locale={locale}
          perLabel={perLabel}
          action={stickyAction}
          secondary={stickySecondary}
          fallbackLabel={listing.title}
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
  t,
  messageHref,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
  messageHref: string;
}) {
  return (
    <div className="nf-card p-5">
      {listing.priceMinor > 0 && (
        <p>
          <Amount
            minorUnits={listing.priceMinor}
            locale={locale}
            currency={listing.currency}
            className="text-[1.5rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
            secondaryClassName="text-[0.54em] font-semibold opacity-60"
          />
          <span className={`ml-1.5 ${TYPE.body}`}>per head</span>
        </p>
      )}

      <p className={`mt-2.5 ${TYPE.body}`}>
        Listed on RentMe by the person who runs it. Message them to ask about a
        table, a large party or anything the page does not answer.
      </p>

      <ButtonLink href={messageHref} variant="secondary" full className="mt-4">
        Message
      </ButtonLink>

      <TravelTime
        listingId={listing.id}
        label={t.common.travelTime}
        workingLabel={t.common.loading}
      />
    </div>
  );
}
