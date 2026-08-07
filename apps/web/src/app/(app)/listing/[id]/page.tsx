import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, type Dictionary, type Locale, formatRating } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { factsOf, sleeps } from "@/lib/listings/filter";
import { getMessageRepository } from "@/lib/messages/repository";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { formatNumber } from "@naijafinds/i18n";
import { getBlockedDates } from "@/lib/bookings/queries";
import { getListingReviews } from "@/lib/reviews/queries";
import { getSavedListings } from "@/lib/saved/queries";
import { lagosToday } from "@/lib/bookings/schema";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { RecordVisit } from "@/components/app/listing/RecordVisit";
import { ReservePanel } from "./ReservePanel";
import { RentalPanel } from "./RentalPanel";
import { ListingAbout } from "@/components/app/listing/ListingAbout";
import { ListingAmenities } from "@/components/app/listing/ListingAmenities";
import { ListingPhotoGrid } from "@/components/app/listing/ListingPhotoGrid";
import { ListingUtilities } from "@/components/app/listing/ListingUtilities";
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
import { Chip } from "@/components/ui/Chip";

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

/**
 * The status pill.
 *
 * Reference 3 opens with a small tinted icon + label pill naming the market the
 * property is in - FOR SALE, FOR RENT - in a semantic colour rather than a
 * generic grey. This platform has no sale market, so the pill names the market
 * each kind actually belongs to and nothing more. Nothing is invented: the
 * label is a restatement of `listing.kind`, which every record carries.
 */
const MARKET_PILL: Record<ListingKind, { icon: UiIconName; label: string; tone: StatusTone }> = {
  // An annual tenancy. The nearest thing this platform has to reference 3's
  // headline market, and it takes the brand tint.
  rental: { icon: "key", label: "For rent", tone: "brand" },
  hotel: { icon: "calendar-booking", label: "For stays", tone: "success" },
  apartment: { icon: "calendar-booking", label: "For stays", tone: "success" },
  home: { icon: "calendar-booking", label: "For stays", tone: "success" },
  shortlet: { icon: "calendar-booking", label: "For stays", tone: "success" },
  villa: { icon: "calendar-booking", label: "For stays", tone: "success" },
  /* Semantic, never generic grey - the brief is explicit that a status pill in
     a neutral wash reads as an absence of state rather than as a market. */
  restaurant: { icon: "utensils", label: "Dining", tone: "info" },
  experience: { icon: "ticket", label: "Experience", tone: "info" },
  /* Commercial space and land are let on a tenancy exactly like a rental, so
     they read as the same market and take the same key glyph and brand tint.
     What they are individually is already said by `KIND_LABEL` in the copy
     below; the pill answers "which market am I in", not "what is this". */
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
  const market = MARKET_PILL[listing.kind];
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

  /*
   * The ghost half of reference 3's CTA pair, and only where a second action
   * honestly exists.
   *
   * A stay has two real paths - ask the agent, or pick dates - so it pairs.
   * A partner venue pairs its own page with directions, but only when the feed
   * gave us two distinct destinations. A rental has exactly one path, so it
   * gets one button rather than a decorative twin.
   */
  const stickySecondary: StickyAction | null = isPartner
    ? partner?.venueUrl && partnerAction && partner.venueUrl !== partnerAction.href
      ? { label: "Menu", href: partner.venueUrl, external: true }
      : null
    : isRental
      ? null
      : { label: "Message agent", href: messageHref };

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
    <PhotoViewerProvider title={listing.title} photos={listing.photos} hue={listing.hue}>
    <div className="mx-auto max-w-5xl">
      {/* Nothing rendered. Puts this place in the recently-viewed memory the
          search page offers back, whichever way it was reached. */}
      <RecordVisit
        id={listing.id}
        title={listing.title}
        place={listing.area && listing.area !== listing.city ? `${listing.area}, ${listing.city}` : listing.city}
      />
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

        The single most recognisable move in reference 3: the content rides UP
        over the lower edge of the media on a large top radius, so the two
        surfaces overlap instead of meeting at a seam. It is glass rather than a
        flat fill because the platform's ground is the living ambient canvas,
        not a solid colour - an opaque panel here would blank the artwork every
        other screen sits on, while glass lets the photograph blur through the
        overlap and the canvas through everything below it.

        Full bleed by the same rule the hero uses, and its side and bottom
        borders are dropped so only the top hairline reads.
      */}
      <div className="nf-glass nf-glass--strong relative z-10 -mx-5 -mt-8 rounded-t-[1.75rem] border-x-0 border-b-0 px-5 pb-6 pt-6 sm:-mt-10 sm:rounded-t-[2.25rem] sm:px-6 sm:pb-8 sm:pt-8 md:-mx-8 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        {/* ------------------------------------------------- main column */}
        <div className="min-w-0">
          {/* ------------------------------------------------ title block */}
          <section className="nf-rise">
            {/*
              The status row: the market this listing belongs to on the left as
              a tinted icon + label pill, and the rating right-aligned as a real
              chip rather than the bare inline text it used to be. Both are read
              from the record - a listing with no rating simply has no chip.
            */}
            <div className="flex flex-wrap items-center gap-2">
              {/* `StatusPill`, not a hand-tinted span: one vocabulary decides
                  what a tinted pill looks like across the whole platform, and
                  a pill written locally is a pill that can render invisible by
                  forgetting its modifier. */}
              <StatusPill tone={market.tone} icon={market.icon} size="sm">
                {market.label}
              </StatusPill>

              {/* Only first-party inventory may carry the verified badge. */}
              {listing.verified && !isPartner && (
                <StatusPill tone="success" icon="verified" size="sm">
                  {t.common.verified}
                </StatusPill>
              )}
              {isPartner && (
                /* `display: contents`, so the marker attribute survives on an
                   element that adds no box of its own: the pill stays a direct
                   child of the row and the provenance hook every hybrid check
                   counts stays exactly where it was. */
                <span data-partner-tag className="contents">
                  <StatusPill tone="neutral" size="sm">
                    Partner
                  </StatusPill>
                </span>
              )}
              {listing.instantBook && (
                <StatusPill tone="brand" icon="sparkle" size="sm">
                  Instant Book
                </StatusPill>
              )}
              {partner?.attribution === "Google" && (
                <span className="text-[0.6875rem] text-[var(--nf-content-muted)]">
                  Powered by Google
                </span>
              )}

              {/*
                The rating chip, right-aligned on the status row exactly as
                reference 3 sets it. On the `Chip` primitive in its static
                behaviour - it is an attribute of the place, not a control, so
                it takes no hit target and invites no press.

                The review count renders only when the record carries one. A
                place with a rating and no reviews shows the rating alone
                rather than a fabricated "(0)".
              */}
              {listing.rating > 0 && (
                <Chip behaviour="static" size="sm" className="nf-numeric ml-auto shrink-0 gap-1.5">
                  <span className="flex items-center gap-1.5 font-semibold text-[var(--nf-content-primary)]">
                    <UiIcon name="star" size={16} filled className="text-[var(--nf-rating)]" />
                    {formatRating(listing.rating, locale)}
                    {listing.reviewCount > 0 && (
                      <span className="font-normal text-[var(--nf-content-muted)]">
                        ({formatNumber(listing.reviewCount, locale)} {t.common.reviews})
                      </span>
                    )}
                  </span>
                </Chip>
              )}
            </div>

            <h1 className="nf-h1 mt-3 max-sm:text-[1.375rem]">{listing.title}</h1>

            <p className="mt-2 flex items-center gap-1.5 text-[0.9375rem] text-[var(--nf-content-secondary)]">
              <UiIcon name="location" size={16} className="shrink-0" />
              <span className="truncate">{where}</span>
            </p>

            {/* The price is what this screen sells. It is the hero figure:
                display size, tight tracking, and the qualifier carried in the
                muted tone so the pair reads as one composed number. */}
            {listing.priceMinor > 0 && (
              <p className="mt-4">
                <Amount
                  minorUnits={listing.priceMinor}
                  locale={locale}
                  currency={listing.currency}
                  suffix={perLabel}
                  className="text-[2.25rem] font-extrabold leading-[0.95] tracking-[-0.035em] text-[var(--nf-content-primary)] sm:text-[3rem]"
                  secondaryClassName="text-[0.36em] font-semibold opacity-60"
                />
              </p>
            )}

            {/* ------------------------------------------------ spec row */}
            <div className="mt-4">
              <ListingAmenities
                bedrooms={listing.bedrooms}
                bathrooms={listing.bathrooms}
                amenities={listing.amenities}
                guests={capacityOf(listing) ?? undefined}
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
          {/*
            The anchor stays in the document at every width while only the
            panel inside it is dropped from `lg` up. The pinned bar is no
            longer hidden on desktop, so its Check availability now has a
            target there; when the id itself carried `lg:hidden` the same link
            pointed at a `display:none` element and scrolled nowhere.
          */}
          <div id="reserve" className="scroll-mt-20">
            <div className="mt-7 lg:hidden">{bookingPanel}</div>
          </div>

          {/* ---------------------------------------------- photo grid */}
          {/* A single photograph is already the hero; a grid of one states
              nothing, so the section is not rendered at all below two. */}
          {listing.photos.length > 1 && (
            <Reveal as="div" className="mt-8" delay={40}>
              <ListingPhotoGrid photos={listing.photos} hue={listing.hue} title={listing.title} />
            </Reveal>
          )}

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

          {/* ---------------------------------------- cancellation policy */}
          {/*
            The schedule, in front of somebody who has not committed to
            anything yet (inbox item 66). No dates are chosen at this point, so
            it renders as the platform policy in shares rather than in naira;
            the same component renders again at checkout against the guest's
            own dates and their own total.

            Not on a rental, which is message, inspect then pay and has no
            booking to cancel. Not on partner stock either: that inventory
            belongs to somebody else and so does its refund policy, and
            printing ours over theirs would be the most expensive kind of
            wrong.
          */}
          {!isPartner && !isRental && (
            <Reveal as="section" className="mt-8" delay={40}>
              <CancellationTimeline locale={locale} headingLevel="h2" />
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
      </div>

      {/* The bar is pinned to the viewport rather than sitting in the flow, so
          the page has to end above it or the last thing on the screen is
          permanently behind glass. The inset is added here rather than in the
          shell because this is the only route that pins one. */}
      <div
        aria-hidden="true"
        className="h-[5.5rem]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      />

      <ListingStickyBar
        variant={isPartner ? "partner" : isRental ? "rental" : "stay"}
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
        <p>
          <Amount
            minorUnits={listing.priceMinor}
            locale={locale}
            currency={listing.currency}
            suffix={t.common.perNight}
            className="text-[1.5rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
            secondaryClassName="text-[0.54em] font-semibold opacity-60"
          />
        </p>
      )}

      <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {isHotel
          ? "Supplied by one of our hotel partners. The stay is booked with the partner, and the rate is reconfirmed there before you pay."
          : "Supplied by one of our restaurant partners. Head straight to the venue; it takes its own bookings."}
      </p>

      {action && (
        <ButtonLink
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
          full
          className="mt-4"
        >
          {action.label}
        </ButtonLink>
      )}
      {showSecondary && secondary && (
        <ButtonLink
          href={secondary}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          full
          className="mt-2.5"
        >
          Menu
        </ButtonLink>
      )}

      {partner?.attribution === "Google" && (
        <p className="mt-3 text-[0.6875rem] text-[var(--nf-content-muted)]">Powered by Google</p>
      )}
    </div>
  );
}
