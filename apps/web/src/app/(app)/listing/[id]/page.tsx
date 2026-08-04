import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, type Dictionary, type Locale, formatRating } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { factsOf, sleeps } from "@/lib/listings/filter";
import { getMessageRepository } from "@/lib/messages/repository";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { formatMoney, formatNumber } from "@naijafinds/i18n";
import { getBlockedDates } from "@/lib/bookings/queries";
import { getListingReviews } from "@/lib/reviews/queries";
import { getSavedListings } from "@/lib/saved/queries";
import { lagosToday } from "@/lib/bookings/schema";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { ReservePanel } from "./ReservePanel";
import { RentalPanel } from "./RentalPanel";
import { ListingAbout } from "@/components/app/listing/ListingAbout";
import { ListingAmenities } from "@/components/app/listing/ListingAmenities";
import { ListingUtilities } from "@/components/app/listing/ListingUtilities";
import { readListingAccess } from "@/lib/listings/access-queries";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ListingHostPanel } from "@/components/app/listing/ListingHostPanel";
import { ListingReviews } from "@/components/app/listing/ListingReviews";
import {
  ListingStickyBar,
  type StickyAction,
} from "@/components/app/listing/ListingStickyBar";
import { StayDatesProvider } from "@/components/app/listing/StayDates";
import { ReportSheet } from "@/components/app/ReportSheet";
import { resolveSession } from "@/lib/actions/session";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Listing detail.
 *
 * The consumer property page, built the way the best booking apps build it:
 * the photography opens the screen edge to edge with share and save floating
 * over it, then the title, rating, place and price, then the amenity marks,
 * then the description behind a real Read more. The booking panel is inline on
 * phones under a sticky bar that quotes the live total for the chosen nights,
 * and sits in a sticky right column from `lg` up.
 *
 * The market decides the action, never the styling. A rental never carries a
 * Reserve or Check availability control (docs/HYBRID_INVENTORY.md sections 1
 * and 4) and a partner listing never carries our verification or our
 * messaging. All content comes from the listing repository; nothing on this
 * page is hardcoded inventory.
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

/** "Lagos State" reads naturally; the FCT does not take the suffix. */
function stateLabel(state: string): string {
  return state === "FCT" ? "the FCT" : `${state} State`;
}

/**
 * How many guests this place takes, as one number the whole page agrees on.
 *
 * The host's declared `max_guests` where there is one, the two-per-bedroom
 * convention where there is not, and null where capacity is not a knowable
 * thing about the place at all. This used to be a local function that ignored
 * the declared number entirely and always answered `bedrooms * 2`, so a
 * four-guest one-bedroom read as sleeping two and a two-guest three-bedroom
 * read as sleeping six.
 */
function capacityOf(listing: Listing): number | null {
  return sleeps(factsOf(listing));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingRepository().byId(id);
  return {
    title: listing?.title ?? "Listing",
    robots: { index: false, follow: false },
  };
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

  /*
   * Third-party stock, per docs/HYBRID_INVENTORY.md section 4: never the
   * verified badge, never in-platform messaging, never a Reserve control that
   * implies a booking of ours. A partner hotel is booked with the partner and a
   * partner restaurant links to directions and its own page, nothing more.
   */
  const isPartner = listing.source === "partner";
  const partner = listing.partner;

  // Written reviews for this listing. Public by policy for a PUBLISHED listing,
  // so this read works for a signed-out visitor too. Partner stock is never
  // reviewed here, so it is not read for.
  const reviews = isPartner ? [] : await getListingReviews(listing.id, locale);

  // Message agent deep links into the existing thread about this listing when
  // one exists, and otherwise lands on the conversation list. Partner stock has
  // no agent, so it never asks.
  const conversationId = isPartner
    ? null
    : await getMessageRepository().conversationIdForListing(listing.id);
  const messageHref = conversationId ? `/messages/${conversationId}` : "/messages";

  // Rentals are annual tenancies: no Reserve control anywhere on the page.
  // The path is message the agent, inspect the property, then pay.
  const isRental = listing.kind === "rental";
  const isBookable = !isPartner && !isRental;

  // Nights a guest cannot pick: booked or blocked dates from the platform
  // calendar. Empty for catalogue listings and when Supabase is not
  // configured, so the picker simply has nothing to refuse.
  const blockedDates = isBookable ? await getBlockedDates(listing.id) : [];
  const today = lagosToday();

  // The heart opens in the right state for a signed-in account. Device saves
  // (catalogue listings, and anything hearted while signed out) live in
  // localStorage and are reconciled by the control itself on mount.
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

  // Partner locality collapses when the feed places a venue by city alone.
  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}, ${stateLabel(listing.state)}`
      : `${listing.city}, ${stateLabel(listing.state)}`;

  // The off-platform action for partner stock, and the only action it gets.
  const partnerAction: { label: string; href: string } | null = isPartner
    ? listing.kind === "hotel" && partner?.bookUrl
      ? { label: "Book", href: partner.bookUrl }
      : partner?.directionsUrl
        ? { label: "Directions", href: partner.directionsUrl }
        : partner?.venueUrl
          ? { label: "Menu", href: partner.venueUrl }
          : null
    : null;

  const kind = KIND_LABEL[listing.kind];
  // Restaurants and experiences are priced per head; a rental is priced per
  // year; everything else is a nightly rate.
  const perHead = listing.kind === "restaurant" || listing.kind === "experience";
  const perLabel = isRental
    ? `per ${t.common.year}`
    : perHead
      ? "per guest"
      : t.common.perNight;

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

  if (isPartner) {
    aboutParagraphs.push(
      `This listing comes from one of our inventory partners rather than a RentMe agent, so it carries no RentMe verification and no in-platform messaging. ${
        listing.kind === "hotel"
          ? "The stay is booked with the partner that supplies it."
          : "The venue takes its own bookings; we only point you to it."
      }`,
    );
    aboutParagraphs.push(
      listing.kind === "hotel"
        ? "The rate is reconfirmed with the partner before anything is paid, so treat the figure here as the price they were advertising when we last read their feed."
        : "Opening times, the menu and any booking the venue takes all live on its own page, which is where the links below go.",
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

  // What the sticky bar does, decided by the market the listing belongs to.
  const stickyAction: StickyAction | null = isPartner
    ? partnerAction
      ? { ...partnerAction, external: true }
      : null
    : isRental
      ? { label: "Message agent", href: `/messages/new?listing=${listing.id}` }
      : { label: "Check availability", href: "#reserve" };

  const bookingPanel = isPartner ? (
    <PartnerPanel listing={listing} locale={locale} t={t} action={partnerAction} />
  ) : isRental ? (
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

  const body = (
    <div className="mx-auto max-w-5xl">
      <ListingGallery
        listingId={listing.id}
        title={listing.title}
        hue={listing.hue}
        photos={listing.photos}
        initialSaved={initialSaved}
        backFallback="/home"
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start sm:mt-7">
        {/* ------------------------------------------------- main column */}
        <div className="min-w-0">
          {/* ------------------------------------------------ title block */}
          <section className="nf-rise">
            <h1 className="nf-h1 max-sm:text-[1.375rem]">{listing.title}</h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              {listing.rating > 0 && (
                <span className="nf-numeric flex items-center gap-1.5 text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
                  <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
                  {formatRating(listing.rating, locale)}
                  {listing.reviewCount > 0 && (
                    <span className="font-normal text-[var(--nf-content-muted)]">
                      ({formatNumber(listing.reviewCount, locale)} {t.common.reviews})
                    </span>
                  )}
                </span>
              )}

              {/* Only first-party inventory may carry the verified badge. */}
              {listing.verified && !isPartner && (
                <span className="nf-badge nf-badge--verified">
                  <UiIcon name="verified" size={12} />
                  {t.common.verified}
                </span>
              )}
              {isPartner && (
                <span
                  data-partner-tag
                  className="nf-badge bg-[color-mix(in_oklab,var(--nf-content-primary)_14%,transparent)] text-[var(--nf-content-secondary)]"
                >
                  Partner
                </span>
              )}
              {listing.instantBook && (
                <span className="nf-badge nf-badge--brand">Instant Book</span>
              )}
              {partner?.attribution === "Google" && (
                <span className="text-[0.6875rem] text-[var(--nf-content-muted)]">
                  Powered by Google
                </span>
              )}
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-[0.9375rem] text-[var(--nf-content-secondary)]">
              <UiIcon name="location" size={16} className="shrink-0" />
              <span className="truncate">{where}</span>
            </p>

            {listing.priceMinor > 0 && (
              <p className="mt-3.5 flex items-baseline gap-1.5">
                <span className="nf-numeric text-[1.5rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
                  {formatMoney(listing.priceMinor, locale, listing.currency)}
                </span>
                <span className="text-[0.875rem] text-[var(--nf-content-muted)]">{perLabel}</span>
              </p>
            )}

            {/* --------------------------------------------- amenity row */}
            <div className="mt-4">
              <ListingAmenities
                bedrooms={listing.bedrooms}
                bathrooms={listing.bathrooms}
                amenities={listing.amenities}
              />
            </div>
          </section>

          {/* --------------------------------- light, water and the gate */}
          {listing.utilities && (
            <Reveal className="mt-7">
              <ListingUtilities
                utilities={listing.utilities}
                access={access}
                bookingConfirmed={bookingConfirmed}
              />
            </Reveal>
          )}

          {/* ----------------------------------------------------- about */}
          <Reveal as="section" className="nf-hairline mt-7 pt-7">
            <h2 className="nf-h3 mb-3">About this place</h2>
            <ListingAbout paragraphs={aboutParagraphs} />
          </Reveal>

          {/* ------------------------------------- booking panel, mobile */}
          <div id="reserve" className="mt-7 scroll-mt-20 lg:hidden">
            {bookingPanel}
          </div>

          {/* ------------------------------------------------ host panel */}
          {/* No agent behind partner stock, so no host panel and no Message. */}
          {!isPartner && (
            <Reveal as="section" className="mt-8" delay={40}>
              <h2 className="nf-h3 mb-3.5">Hosted by</h2>
              <ListingHostPanel verified={listing.verified} t={t} messageHref={messageHref} />
            </Reveal>
          )}

          {/* --------------------------------------------------- reviews */}
          {/* A partner rating belongs to the partner, and the reviews section
              speaks about RentMe stays, so partner listings do not show it. */}
          {!isPartner && (
            <Reveal as="section" className="mt-8" delay={40}>
              <h2 className="nf-h3 mb-3.5">Reviews</h2>
              <ListingReviews
                rating={listing.rating}
                reviewCount={listing.reviewCount}
                reviews={reviews}
                locale={locale}
                t={t}
              />
            </Reveal>
          )}

          {/* ---------------------------------------------------- report */}
          {/* Last on the page on purpose. It is the thing you go looking for
              rather than the thing you are offered, and it must always be
              findable. Partner stock is somebody else's inventory, so there is
              nothing of ours to act on. */}
          {!isPartner && (
            <div className="mt-8 flex justify-center">
              <ReportSheet
                targetType="listing"
                targetId={listing.id}
                targetLabel={listing.title}
                signedIn={signedIn}
              />
            </div>
          )}
        </div>

        {/* --------------------------------------- booking panel, desktop */}
        <aside className="hidden lg:sticky lg:top-6 lg:block">{bookingPanel}</aside>
      </div>

      <ListingStickyBar
        variant={isPartner ? "partner" : isRental ? "rental" : "stay"}
        priceMinor={listing.priceMinor}
        currency={listing.currency}
        locale={locale}
        perLabel={perLabel}
        action={stickyAction}
        fallbackLabel={listing.title}
      />
    </div>
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
 * The panel a partner listing gets instead of Reserve.
 *
 * It states the price when the feed gives a real one, says plainly where the
 * listing comes from, and offers the one action the spec's table allows for that
 * category: Book for a partner hotel (completed with the partner, never against
 * a booking of ours), directions and the venue's own page for a partner
 * restaurant, which is never bookable here. No Reserve, no Message agent, no
 * inspection flow, because none of those exist for stock we do not own.
 */
function PartnerPanel({
  listing,
  locale,
  t,
  action,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
  action: { label: string; href: string } | null;
}) {
  const partner = listing.partner;
  const isHotel = listing.kind === "hotel";
  const secondary = isHotel ? null : partner?.venueUrl;
  const showSecondary = Boolean(secondary && action && secondary !== action.href);

  return (
    <div className="nf-card p-5">
      {listing.priceMinor > 0 && (
        <p className="flex items-baseline gap-1.5">
          <span className="nf-numeric text-[1.5rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {formatMoney(listing.priceMinor, locale, listing.currency)}
          </span>
          <span className="text-[0.8125rem] text-[var(--nf-content-muted)]">
            {t.common.perNight}
          </span>
        </p>
      )}

      <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {isHotel
          ? "Supplied by one of our hotel partners. The stay is booked with the partner, and the rate is reconfirmed there before you pay."
          : "Supplied by one of our restaurant partners. Head straight to the venue; it takes its own bookings."}
      </p>

      {action && (
        <a
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          className="nf-btn nf-btn--primary mt-4 w-full"
        >
          {action.label}
        </a>
      )}
      {showSecondary && secondary && (
        <a
          href={secondary}
          target="_blank"
          rel="noopener noreferrer"
          className="nf-btn nf-btn--glass mt-2.5 w-full"
        >
          Menu
        </a>
      )}

      {partner?.attribution === "Google" && (
        <p className="mt-3 text-[0.6875rem] text-[var(--nf-content-muted)]">Powered by Google</p>
      )}
    </div>
  );
}
