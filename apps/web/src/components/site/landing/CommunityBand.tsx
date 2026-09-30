import type { Dictionary, Locale } from "@vallo/i18n/core";
import { intlTag } from "@vallo/i18n/core";
import { CountUp } from "@/components/motion/CountUp";
import { MotionReveal } from "@/components/motion/Reveal";
import type { PlatformStats } from "@/lib/platform-stats";
import { statTiles } from "./stat-tiles";
import { SectionHead } from "./SectionHead";
import { CheckCard } from "./CheckCard";

/**
 * The community band: copy, up to three honest figures and the Third party
 * label on the left, and "Check before you pay" on the right (A7).
 *
 * THE CHECK CARD TOOK THE PHOTOGRAPH'S PLACE (30 September). It had a room
 * of its own under this one, and with the move-in card in the hero it made
 * the landing about 1,200px taller than before A7 and A8. The room says the
 * platform is built for both sides of the deal; the one thing a stranger can
 * do with that today, without an account, is check the other side. The
 * villa photograph repeated the category tiles' pictures and goes.
 *
 * THE THIRD PARTY LABEL IS A LABEL, NOT A LISTING. The render shows a
 * partner hotel dressed as a card. This platform has no partner inventory
 * live, and the stop list forbids rendering a partner row before its label
 * and fulfilment-honest CTA exist. So the room shows the tag itself and
 * says what it means: partner stays carry this and say who confirms them.
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
          <div className="nf-landing-thirdparty">
            <span className="nf-badge nf-badge--neutral nf-landing-tag">{c.thirdParty}</span>
            <p className="nf-landing-thirdparty__title">{c.thirdPartyTitle}</p>
            <p className="nf-landing-thirdparty__body">{c.thirdPartyBody}</p>
          </div>
        </div>

        <MotionReveal delay={80}>
          <CheckCard t={t} locale={locale} />
        </MotionReveal>
      </div>
    </section>
  );
}
