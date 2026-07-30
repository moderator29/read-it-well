import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, type Dictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { getMessageRepository } from "@/lib/messages/repository";
import type { Listing, ListingKind } from "@/lib/listings/types";
import Link from "next/link";
import { formatMoney } from "@naijafinds/i18n";
import { getBlockedDates } from "@/lib/bookings/queries";
import { lagosToday } from "@/lib/bookings/schema";
import { PageHeader } from "@/components/app/PageHeader";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { ReservePanel } from "./ReservePanel";
import { RentalPanel } from "./RentalPanel";
import { ListingAmenities } from "@/components/app/listing/ListingAmenities";
import { ListingHostPanel } from "@/components/app/listing/ListingHostPanel";
import { ListingReviews } from "@/components/app/listing/ListingReviews";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Listing detail.
 *
 * The consumer property page: gallery hero, facts, amenities, host panel and
 * reviews, with the booking panel inline on phones (plus a sticky reserve bar)
 * and in a sticky right column from `lg` up. All content comes from the
 * listing repository; nothing on this page is hardcoded inventory.
 */

const KIND_LABEL: Record<ListingKind, string> = {
  hotel: "hotel",
  apartment: "apartment",
  home: "home",
  shortlet: "shortlet",
  villa: "villa",
  restaurant: "restaurant",
  experience: "experience",
  rental: "rental",
};

/** "Lagos State" reads naturally; the FCT does not take the suffix. */
function stateLabel(state: string): string {
  return state === "FCT" ? "the FCT" : `${state} State`;
}

/**
 * Guest capacity is not a stored field yet. Until the platform API carries it,
 * derive it at two guests a bedroom so the facts row stays complete without a
 * hardcoded number per listing.
 */
function sleeps(listing: Listing): number {
  return Math.max(2, listing.bedrooms * 2);
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

  // Nights a guest cannot pick: booked or blocked dates from the platform
  // calendar. Empty for catalogue listings and when Supabase is not
  // configured, so the picker simply has nothing to refuse.
  const blockedDates = isRental || isPartner ? [] : await getBlockedDates(listing.id);
  const today = lagosToday();

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

  const facts: { icon: BrandIconName; label: string }[] = [
    { icon: "user-check", label: `Sleeps ${sleeps(listing)}` },
    {
      icon: "house-sparkle",
      label: `${listing.bedrooms} ${listing.bedrooms === 1 ? "bedroom" : "bedrooms"}`,
    },
    {
      icon: "home-check",
      label: `${listing.bathrooms} ${listing.bathrooms === 1 ? "bathroom" : "bathrooms"}`,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={listing.title} fallback="/home" />

      <div className="nf-rise">
        <ListingGallery title={listing.title} hue={listing.hue} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start sm:mt-7">
        {/* ------------------------------------------------- main column */}
        <div className="min-w-0">
          {/* ------------------------------------------------ title block */}
          <section className="nf-rise">
            <h2 className="nf-h1 max-sm:text-[1.375rem]">{listing.title}</h2>

            <p className="mt-2.5 flex items-center gap-2 text-[0.9375rem] text-[var(--nf-content-secondary)]">
              <span className="block h-9 w-9 shrink-0">
                <BrandIcon name="pin-map" fill />
              </span>
              <span className="truncate">{where}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Only first-party inventory may carry the verified badge. */}
              {listing.verified && !isPartner && (
                <span className="nf-badge nf-badge--success">
                  <UiIcon name="verified" size={12} strokeWidth={2.1} />
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
                <span className="nf-badge nf-badge--warning">Instant Book</span>
              )}
              {listing.rating > 0 && (
                <span className="nf-numeric flex items-center gap-1 text-[0.8125rem] font-semibold">
                  <UiIcon name="star" size={14} className="text-[var(--nf-state-warning)]" />
                  {listing.rating.toFixed(1)}
                  {partner?.attribution === "Google" && (
                    <span className="ml-1 font-normal text-[0.6875rem] text-[var(--nf-content-muted)]">
                      Powered by Google
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* ------------------------------------------------- facts row */}
            <ul className="mt-4 flex flex-wrap gap-2">
              {facts.map((f) => (
                <li key={f.label} className="nf-chip gap-2 px-3 py-1.5">
                  <span className="block h-9 w-9 shrink-0">
                    <BrandIcon name={f.icon} fill />
                  </span>
                  <span className="nf-numeric text-[0.8125rem]">{f.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------- booking panel, mobile */}
          <div id="reserve" className="mt-6 scroll-mt-20 lg:hidden">
            {isPartner ? (
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
                priceMinor={listing.priceMinor}
                currency={listing.currency}
                locale={locale}
                instantBook={listing.instantBook}
                messageHref={messageHref}
                blockedDates={blockedDates}
                today={today}
              />
            )}
          </div>

          {/* ------------------------------------------------- amenities */}
          <Reveal as="section" className="mt-8">
            <h3 className="nf-h3 mb-3.5">Amenities</h3>
            <ListingAmenities amenities={listing.amenities} />
          </Reveal>

          {/* ----------------------------------------------------- about */}
          <Reveal as="section" className="mt-8" delay={40}>
            <h3 className="nf-h3 mb-3">About this place</h3>
            <div className="space-y-3 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              <p>
                {listing.title} is a {listing.bedrooms} bedroom, {listing.bathrooms} bathroom{" "}
                {kind} in {listing.area}, {listing.city}, {stateLabel(listing.state)}.
                {amenitySentence}
              </p>
              {isPartner ? (
                <p>
                  This listing comes from one of our inventory partners rather than a RentMe
                  agent, so it carries no RentMe verification and no in-platform messaging.{" "}
                  {listing.kind === "hotel"
                    ? "The stay is booked with the partner that supplies it."
                    : "The venue takes its own bookings; we only point you to it."}
                </p>
              ) : isRental ? (
                <p>
                  This home is let on an annual tenancy. Message the agent to ask questions and
                  arrange an inspection, then pay only after you have inspected the property.
                </p>
              ) : (
                <p>
                  {listing.instantBook
                    ? "Instant Book is available on this listing, so your dates confirm as soon as you reserve."
                    : "The agent confirms each booking request personally, so allow a little time for a response."}{" "}
                  Reserve online, then arrange an inspection with the agent through Messages. Pay
                  only after you have inspected the property.
                </p>
              )}
            </div>
          </Reveal>

          {/* ------------------------------------------------ host panel */}
          {/* No agent behind partner stock, so no host panel and no Message. */}
          {!isPartner && (
            <Reveal as="section" className="mt-8" delay={40}>
              <h3 className="nf-h3 mb-3.5">Hosted by</h3>
              <ListingHostPanel verified={listing.verified} t={t} messageHref={messageHref} />
            </Reveal>
          )}

          {/* --------------------------------------------------- reviews */}
          {/* A partner rating belongs to the partner, and the reviews section
              speaks about RentMe stays, so partner listings do not show it. */}
          {!isPartner && (
            <Reveal as="section" className="mt-8" delay={40}>
              <h3 className="nf-h3 mb-3.5">Reviews</h3>
              <ListingReviews
                rating={listing.rating}
                reviewCount={listing.reviewCount}
                locale={locale}
                t={t}
              />
            </Reveal>
          )}
        </div>

        {/* --------------------------------------- booking panel, desktop */}
        <aside className="hidden lg:sticky lg:top-6 lg:block">
          {isPartner ? (
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
              priceMinor={listing.priceMinor}
              currency={listing.currency}
              locale={locale}
              instantBook={listing.instantBook}
              messageHref={messageHref}
              blockedDates={blockedDates}
              today={today}
            />
          )}
        </aside>
      </div>

      {/* ------------------------------------------- mobile action bar */}
      <div className="sticky bottom-20 z-30 mt-8 lg:hidden">
        <div className="nf-card flex items-center justify-between gap-3 p-3 pl-4">
          <p className="flex min-w-0 flex-col">
            {listing.priceMinor > 0 ? (
              <>
                <span className="nf-numeric truncate text-[1.0625rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
                  {formatMoney(listing.priceMinor, locale, listing.currency)}
                </span>
                <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
                  {isRental ? `per ${t.common.year}` : t.common.perNight}
                </span>
              </>
            ) : (
              <span className="truncate text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
                {listing.title}
              </span>
            )}
          </p>
          {isPartner ? (
            partnerAction && (
              <a
                href={partnerAction.href}
                target="_blank"
                rel="noopener noreferrer"
                className="nf-btn nf-btn--primary shrink-0"
              >
                {partnerAction.label}
              </a>
            )
          ) : isRental ? (
            <Link
              href={`/messages/new?listing=${listing.id}`}
              className="nf-btn nf-btn--primary shrink-0"
            >
              Message agent
            </Link>
          ) : (
            <a href="#reserve" className="nf-btn nf-btn--primary shrink-0">
              Reserve
            </a>
          )}
        </div>
      </div>
    </div>
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
