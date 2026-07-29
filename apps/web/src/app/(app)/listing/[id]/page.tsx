import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { getMessageRepository } from "@/lib/messages/repository";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { PageHeader } from "@/components/app/PageHeader";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { ListingPriceCard } from "@/components/app/listing/ListingPriceCard";
import { ListingStickyBar } from "@/components/app/listing/ListingStickyBar";
import { ListingAmenities } from "@/components/app/listing/ListingAmenities";
import { ListingHostPanel } from "@/components/app/listing/ListingHostPanel";
import { ListingReviews } from "@/components/app/listing/ListingReviews";
import { Reveal } from "@/components/site/Reveal";
import { Icon, type IconName } from "@/design-system/icons/Icon";
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

  // Message agent deep links into the existing thread about this listing when
  // one exists, and otherwise lands on the conversation list.
  const conversationId = await getMessageRepository().conversationIdForListing(listing.id);
  const messageHref = conversationId ? `/messages/${conversationId}` : "/messages";

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

  const facts: { icon: IconName; label: string }[] = [
    { icon: "profile", label: `Sleeps ${sleeps(listing)}` },
    {
      icon: "bed",
      label: `${listing.bedrooms} ${listing.bedrooms === 1 ? "bedroom" : "bedrooms"}`,
    },
    {
      icon: "bath",
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
              <span className="block h-6 w-6 shrink-0">
                <Icon name="location" fill />
              </span>
              <span className="truncate">
                {listing.area}, {listing.city}, {stateLabel(listing.state)}
              </span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {listing.verified && (
                <span className="nf-badge nf-badge--success">
                  <UiIcon name="verified" size={12} strokeWidth={2.1} />
                  {t.common.verified}
                </span>
              )}
              {listing.instantBook && (
                <span className="nf-badge nf-badge--warning">Instant Book</span>
              )}
              <span className="nf-numeric flex items-center gap-1 text-[0.8125rem] font-semibold">
                <UiIcon name="star" size={14} className="text-[var(--nf-state-warning)]" />
                {listing.rating.toFixed(1)}
              </span>
            </div>

            {/* ------------------------------------------------- facts row */}
            <ul className="mt-4 flex flex-wrap gap-2">
              {facts.map((f) => (
                <li key={f.label} className="nf-chip gap-2 px-3 py-1.5">
                  <span className="block h-6 w-6 shrink-0">
                    <Icon name={f.icon} fill />
                  </span>
                  <span className="nf-numeric text-[0.8125rem]">{f.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------- booking panel, mobile */}
          <div className="mt-6 lg:hidden">
            <ListingPriceCard listing={listing} locale={locale} t={t} messageHref={messageHref} />
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
              <p>
                {listing.instantBook
                  ? "Instant Book is available on this listing, so your dates confirm as soon as you reserve."
                  : "The agent confirms each booking request personally, so allow a little time for a response."}{" "}
                Reserve online, then arrange an inspection with the agent through Messages. Pay
                only after you have inspected the property.
              </p>
            </div>
          </Reveal>

          {/* ------------------------------------------------ host panel */}
          <Reveal as="section" className="mt-8" delay={40}>
            <h3 className="nf-h3 mb-3.5">Hosted by</h3>
            <ListingHostPanel verified={listing.verified} t={t} messageHref={messageHref} />
          </Reveal>

          {/* --------------------------------------------------- reviews */}
          <Reveal as="section" className="mt-8" delay={40}>
            <h3 className="nf-h3 mb-3.5">Reviews</h3>
            <ListingReviews
              rating={listing.rating}
              reviewCount={listing.reviewCount}
              locale={locale}
              t={t}
            />
          </Reveal>
        </div>

        {/* --------------------------------------- booking panel, desktop */}
        <aside className="hidden lg:sticky lg:top-6 lg:block">
          <ListingPriceCard listing={listing} locale={locale} t={t} messageHref={messageHref} />
        </aside>
      </div>

      {/* ------------------------------------------- mobile reserve bar */}
      <ListingStickyBar listing={listing} locale={locale} t={t} />
    </div>
  );
}
