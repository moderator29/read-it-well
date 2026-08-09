import Image from "next/image";
import Link from "next/link";
import { type Locale, formatRating } from "@naijafinds/i18n";
import { getListingRepository } from "@/lib/listings/repository";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { CarouselRail } from "./CarouselRail";
import { Words } from "@/components/site/Words";
import { Amount } from "@/components/ui/Amount";
import { gatedHref } from "@/lib/site/gated-href";
import { MediaFrame } from "@/components/app/MediaFrame";

/**
 * Featured this week.
 *
 * Six recommended listings from the repository in a horizontal snap rail.
 * Phones swipe through the cards natively; from sm up the glass prev and next
 * controls in CarouselRail page the rail one card at a time. Every card links
 * straight to its listing page, prices go through <Amount> on integer kobo,
 * and the photo sits on the platform's shared media frame so a slow image
 * never leaves an empty hole.
 */

export async function FeaturedCarousel({ locale }: { locale: Locale }) {
  const listings = await getListingRepository().recommended(6);
  if (listings.length === 0) return null;

  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal className="mb-6 max-w-[52ch] sm:mb-8">
        <span className="nf-overline mb-3 inline-flex items-center gap-2">
          <UiIcon name="sparkle" size={16} />
          Hand picked
        </span>
        <h2 className="nf-h1 mt-3">
          <Words text="Featured this week" accentFrom={1} />
        </h2>
        <p className="mt-3 text-[var(--nf-content-secondary)]">
          The highest rated places on the platform right now. Swipe through, or
          step card by card.
        </p>
      </Reveal>

      <Reveal delay={80}>
        <CarouselRail
          ariaLabel="Featured listings"
          prevLabel="Previous featured listing"
          nextLabel="Next featured listing"
        >
          {listings.map((l) => {
            const photo = l.photos[0];
            const perHead = l.kind === "restaurant" || l.kind === "experience";
            return (
              <li key={l.id} className="w-[16.5rem] sm:w-[19rem]">
                <Link
                  href={gatedHref(`/listing/${l.id}`)}
                  className="nf-card nf-card--interactive group block h-full overflow-hidden"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                      <MediaFrame hue={l.hue} />
                      {photo && (
                        <Image
                          src={photo}
                          alt={l.title}
                          fill
                          sizes="(max-width: 640px) 70vw, 304px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    {/* Scrim keeps the location line legible on every photo. */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-20"
                      style={{ backgroundImage: "var(--nf-scrim-media)" }}
                      aria-hidden="true"
                    />
                    <p className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--nf-content-on-media)]">
                      <UiIcon
                        name="location"
                        size={12}
                        className="shrink-0 text-[var(--nf-content-on-media-muted)]"
                      />
                      <span className="truncate">{l.city}</span>
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Wraps. "Eko Pearl Waterfront Apartment" needed 231px
                          into a 174px column, so every long name in the rail
                          was arriving cut. */}
                      <h3 className="min-w-0 text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
                        {l.title}
                      </h3>
                      <span className="nf-numeric flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold">
                        <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
                        {formatRating(l.rating, locale)}
                      </span>
                    </div>
                    <p className="mt-2.5">
                      <Amount
                        minorUnits={l.priceMinor}
                        locale={locale}
                        currency={l.currency}
                        glance
                        suffix={`/ ${perHead ? "guest" : "night"}`}
                        className="text-[1.0625rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
                        secondaryClassName="text-[0.7em] font-semibold opacity-60"
                      />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </CarouselRail>
      </Reveal>
    </section>
  );
}
