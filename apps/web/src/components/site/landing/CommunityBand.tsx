import Image from "next/image";
import type { Dictionary, Locale } from "@vallo/i18n";
import { formatNumber } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import type { MiniListing } from "@/lib/site/listing-card";
import { photo } from "@/lib/site/photos";
import type { PlatformStats } from "@/lib/platform-stats";
import { ListingMini } from "./ListingMini";
import { statTiles } from "./stat-tiles";

/**
 * The community band: copy and three honest figures on the left, the
 * layered stack on the right (the villa plate, the skyline plate, one real
 * listing card, and the Third party card).
 *
 * THE THIRD PARTY CARD IS A LABEL, NOT A LISTING. The render shows a
 * partner hotel dressed as a card. This platform has no partner inventory
 * live, and the stop list forbids rendering a partner row before its label
 * and fulfilment-honest CTA exist. So the card shows the tag itself and
 * says what it means: partner stays carry this and say who confirms them.
 * When partner rows land, this card is where a real one goes.
 */
export function CommunityBand({
  t,
  locale,
  listing,
  stats,
}: {
  t: Dictionary;
  locale: Locale;
  listing: MiniListing | null;
  stats: PlatformStats | null;
}) {
  const c = t.landing.face.community;
  const figures = statTiles(stats, t).slice(0, 3);

  return (
    <section className="nf-shell pt-section-tight pb-section" aria-labelledby="nf-landing-community-title">
      <div className="nf-landing-split nf-landing-split--even">
        <Reveal className="flex flex-col gap-heading">
          <div>
            <span className="nf-overline text-[var(--nf-brand-secondary)]">{c.overline}</span>
            <h2 id="nf-landing-community-title" className="nf-h1 mt-row max-w-measure-display">
              {/* Double-bracketed phrases take the brand ink, as the render
                  sets them. A locale whose translation carries no brackets
                  renders as one white line, which is the honest fallback. */}
              {c.title.split(/\[\[(.+?)\]\]/g).map((part, i) =>
                i % 2 === 1 ? (
                  <span key={`${part}-${i}`} className="nf-landing-hl">
                    {part}
                  </span>
                ) : (
                  part
                ),
              )}
            </h2>
            <p className="nf-lede mt-group max-w-measure-lede">{c.body}</p>
          </div>
          {figures.length > 0 && (
            <ul className="nf-landing-figures">
              {figures.map((f) => (
                <li key={f.key} className="nf-landing-figure">
                  <strong className="nf-numeric">{formatNumber(f.value, locale)}</strong>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          )}
          <div>
            <ButtonLink href="/start" variant="primary" size="md" trailingIcon="arrow-right">
              {c.join}
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="nf-landing-stack">
            <div className="nf-landing-stack-photo nf-landing-stack-photo--main">
              <Image
                src={photo("villa-pool-skyline-01")}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
              />
            </div>
            <div className="nf-landing-stack-photo nf-landing-stack-photo--side hidden lg:block">
              <Image
                src={photo("skyline-waterfront-dusk")}
                alt=""
                fill
                sizes="200px"
              />
            </div>
            {listing && (
              <div className="nf-landing-stack-card nf-landing-stack-card--a">
                <ListingMini listing={listing} locale={locale} verifiedLabel={t.landing.face.card.verified} />
              </div>
            )}
            <div className="nf-landing-stack-card nf-landing-stack-card--b">
              <span className="nf-badge nf-badge--neutral nf-landing-tag">{c.thirdParty}</span>
              <p className="nf-landing-float-title mt-row text-[var(--nf-content-primary)]">
                {c.thirdPartyTitle}
              </p>
              <p className="nf-caption mt-inline-tight">{c.thirdPartyBody}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
