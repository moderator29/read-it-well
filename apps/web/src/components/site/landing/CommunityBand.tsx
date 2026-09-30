import Image from "next/image";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { intlTag } from "@vallo/i18n/core";
import { CountUp } from "@/components/motion/CountUp";
import { MotionReveal } from "@/components/motion/Reveal";
import { photo } from "@/lib/site/photos";
import type { PlatformStats } from "@/lib/platform-stats";
import { statTiles } from "./stat-tiles";
import { SectionHead } from "./SectionHead";

/**
 * The community band: copy and up to three honest figures on the left, and
 * on the right one photograph with the Third party card over its foot. The
 * listing card that also sat over the photograph showed the same villa
 * twice and is gone (UIUX item 9).
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
  stats,
}: {
  t: Dictionary;
  locale: Locale;
  stats: PlatformStats | null;
}) {
  const c = t.landing.face.community;
  /* The figures print as a row or not at all (the clean pass): a single
     figure on its own ("1 approved agent" while the catalogue is empty)
     reads as a boast about a small number rather than as a fact beside
     others, so the row needs at least two to stand. */
  const all = statTiles(stats, t).slice(0, 3);
  const figures = all.length >= 2 ? all : [];

  return (
    <section className="nf-shell nf-room" data-chapter="community" aria-labelledby="nf-landing-community-title">
      <div className="nf-landing-split nf-landing-split--even">
        <div className="flex flex-col gap-heading">
          <SectionHead id="nf-landing-community-title" eyebrow={c.overline} title={c.title} lede={c.body} />
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
        </div>

        <MotionReveal delay={80}>
          <div className="nf-landing-stack" data-theme="dark">
            <div className="nf-landing-stack-photo nf-landing-stack-photo--main">
              <Image
                src={photo("villa-pool-skyline-01")}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
              />
            </div>
            <div className="nf-landing-stack-card nf-landing-stack-card--b">
              <span className="nf-badge nf-badge--neutral nf-landing-tag">{c.thirdParty}</span>
              <p className="nf-landing-float-title mt-row text-[var(--nf-content-primary)]">
                {c.thirdPartyTitle}
              </p>
              <p className="nf-caption mt-inline-tight">{c.thirdPartyBody}</p>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
