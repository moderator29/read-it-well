import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Amount } from "@/components/ui/Amount";
import { ICON, Section, Stack, TYPE } from "@/components/app/Screen";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { ListingSpecChips, specChips } from "@/components/app/listing/ListingSpecChips";
import { ListingMoveInBlock } from "@/components/app/listing/ListingMoveInBlock";
import { ListingSectionTabs } from "@/components/app/listing/ListingSectionTabs";
import { ListingAmenityTiles } from "@/components/app/listing/ListingAmenityTiles";
import { ListingAgentCard } from "@/components/app/listing/ListingAgentCard";
import { ListingAbout } from "@/components/app/listing/ListingAbout";
import { ListingStickyBar } from "@/components/app/listing/ListingStickyBar";
import { PhotoViewerProvider } from "@/components/app/listing/PhotoViewer";
import { RENTAL } from "../fixtures";

/**
 * /listing/[id] on a tenancy, composed from the same components the route
 * mounts, with the fixture rental. What the route adds around this (the
 * utilities, the details grid, the booking panel, reviews, the report
 * sheet) reads the database and is not part of the look being proven.
 */
export default async function ListingPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const listing = RENTAL;
  const where = `${listing.area}, ${listing.city}, Lagos State`;
  const messageHref = `/messages/new?listing=${listing.id}`;

  return (
    <PhotoViewerProvider title={listing.title} photos={listing.photos} hue={listing.hue} kind={listing.kind}>
      <div className="mx-auto max-w-5xl">
        <ListingGallery
          listingId={listing.id}
          title={listing.title}
          hue={listing.hue}
          kind={listing.kind}
          photos={listing.photos}
          backFallback="/preview/f3"
        />
        <div className="nf-glass nf-glass--strong relative z-10 -mx-gutter mt-sm rounded-t-[1.75rem] border-x-0 border-b-0 px-gutter pb-lg pt-lg sm:rounded-t-[2.25rem] sm:pb-xl">
          <Stack>
            <Section className="nf-rise scroll-mt-16" id="overview">
              <div className="flex flex-wrap items-center gap-xs">
                <span className="nf-detail-tag nf-detail-tag--market">
                  <UiIcon name="key" size={14} />
                  For rent
                </span>
                <span className="nf-detail-tag">
                  <UiIcon name="house" size={14} />
                  Home to rent
                </span>
              </div>
              <h1 className="nf-h2 mt-row [overflow-wrap:anywhere]">{listing.title}</h1>
              <a href="#location" className={`mt-inline-tight inline-flex max-w-full items-center gap-inline ${TYPE.body}`}>
                <UiIcon name="location" size={ICON.inline} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                <span className="min-w-0">{where}</span>
                <UiIcon name="arrow-right" size={16} className="shrink-0 text-[var(--nf-brand-secondary)]" />
              </a>
              <div className="mt-md flex flex-wrap items-end justify-between gap-sm">
                <p className="nf-detail-price">
                  <Amount
                    minorUnits={listing.priceMinor}
                    locale={locale}
                    secondaryClassName="text-[0.5em] font-semibold opacity-70"
                  />
                  <span className="nf-detail-price__suffix">/ year</span>
                </p>
                <span className="nf-detail-verified">
                  <UiIcon name="verified" size={ICON.inline} />
                  {t.catalogue.detail.verifiedListing}
                </span>
              </div>
              <div className="mt-md">
                <ListingSpecChips chips={specChips(listing, t, locale)} />
              </div>
              <div className="mt-md">
                <ListingMoveInBlock listing={listing} locale={locale} t={t} />
              </div>
              <div className="mt-md">
                <ListingAmenityTiles amenities={listing.amenities} limit={5} moreHref="#amenities" moreLabel={t.catalogue.detail.more} />
              </div>
            </Section>

            <ListingSectionTabs
              tabs={[
                { id: "overview", label: t.catalogue.detail.overview },
                { id: "amenities", label: t.catalogue.detail.amenities },
                { id: "location", label: t.catalogue.detail.location },
                { id: "reviews", label: t.catalogue.detail.reviews },
              ]}
            />

            <div className="nf-detail-panel">
              <h2 className="nf-detail-panel__title">{t.catalogue.detail.description}</h2>
              <div className="mt-row">
                <ListingAbout
                  paragraphs={[
                    "Luxury 4 bedroom duplex with BQ is a 4 bedroom, 5 bathroom home to rent in Lekki Phase 1, Lagos, Lagos State. Amenities include a swimming pool, parking on site and Wi-Fi.",
                    "This home is let on an annual tenancy. Message the agent to ask questions and arrange an inspection, then pay only after you have inspected the property.",
                  ]}
                />
              </div>
            </div>

            <Section id="amenities" title={t.catalogue.detail.amenities} divided className="scroll-mt-16">
              <ListingAmenityTiles amenities={listing.amenities} />
            </Section>

            <Section id="location" title={t.catalogue.detail.location} divided className="scroll-mt-16">
              <div className="nf-detail-panel">
                <p className={`flex items-start gap-inline ${TYPE.body}`}>
                  <UiIcon name="location" size={ICON.inline} className="mt-3xs shrink-0 text-[var(--nf-brand-secondary)]" />
                  <span className="min-w-0">{where}</span>
                </p>
              </div>
            </Section>

            <Section title={t.catalogue.detail.agent} divided>
              <ListingAgentCard verified={listing.verified} t={t} messageHref={messageHref} />
            </Section>

            <Section id="reviews" title={t.catalogue.detail.reviews} divided className="scroll-mt-16">
              <p className={TYPE.rowMeta}>No reviews yet.</p>
            </Section>
          </Stack>
        </div>
        <div aria-hidden="true" className="h-[5.5rem]" />
        <ListingStickyBar
          variant="rental"
          priceMinor={listing.priceMinor}
          currency={listing.currency}
          locale={locale}
          perLabel="per year"
          action={{ label: t.catalogue.detail.bookInspection, href: "#reserve" }}
          secondary={{ label: t.catalogue.detail.calculateBreakdown, href: "/preview/f3/move-in" }}
          secondaryIcon="document"
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
}
