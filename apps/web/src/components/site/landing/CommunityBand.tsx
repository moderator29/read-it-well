import Image from "next/image";
import type { Dictionary, Locale } from "@vallo/i18n";
import { intlTag } from "@vallo/i18n";
import { CountUp } from "@/components/motion/CountUp";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import type { MiniListing } from "@/lib/site/listing-card";
import { photo } from "@/lib/site/photos";
import type { PlatformStats } from "@/lib/platform-stats";
import { ListingMini } from "./ListingMini";
import { statTiles } from "./stat-tiles";
import { SectionHead } from "./SectionHead";
import { Sweep } from "./Sweep";

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
    <section className="nf-shell nf-room" data-chapter="community" aria-labelledby="nf-landing-community-title">
      <div className="nf-landing-split nf-landing-split--even">
        <Reveal className="flex flex-col gap-heading">
          <div>
            <SectionHead id="nf-landing-community-title" eyebrow={c.overline} title={c.title} lede={c.body} />
          </div>
          {figures.length > 0 && (
            <ul className="nf-landing-figures">
              {figures.map((f) => (
                <li key={f.key} className="nf-landing-figure">
                  {/* The platform's own figure, counted up once on arrival
                      (CountUp.tsx). The server prints the final number. */}
                  <strong>
                    <CountUp value={f.value} tag={intlTag[locale]} />
                  </strong>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          )}
          <div>
            <ButtonLink href="/start" variant="primary" size="md" trailingIcon="arrow-right" className="nf-magnetic">
              <Sweep />
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
