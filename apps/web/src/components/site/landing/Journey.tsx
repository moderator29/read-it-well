import type { Dictionary } from "@vallo/i18n";
import { DepthWords } from "@/components/motion/DepthWords";
import { MotionReveal } from "@/components/motion/Reveal";
import {
  NO_CUSTODY_SENTENCE,
  NO_INSPECTION_FEE,
  NO_INSPECTION_FEE_HEADLINE,
  PAYMENT_GATE_SENTENCE,
} from "@/lib/money/copy";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { JourneyScreen, type JourneyScreenKey } from "./JourneyScreens";
import type { GlassMotion } from "./glass-motion";
import { JourneyScroll } from "./JourneyScroll";
import { SectionHead } from "./SectionHead";

/**
 * THE JOURNEY, the landing's centrepiece (Track M, second pass): Find,
 * Inspect, Agree, Move in, told down the page beside one phone.
 *
 * From 64rem the section is about three screens tall: the chapters scroll on
 * the left, each three quarters of a screen, and the phone stays pinned on
 * the right, cross-fading to the screen for whichever chapter is at the
 * middle of the viewport, while a rail beside the chapters fills. There is no
 * scroll hijacking: the page scrolls at the reader's speed and the phone
 * simply follows. Below 64rem it is a stack of cards, each with its own
 * small screen, and nothing is pinned. Reduced motion gets the stack's
 * stillness at every width: the screens swap with no fade.
 *
 * THE MONEY SENTENCES ARE THE CONSTANTS. Inspect prints `NO_INSPECTION_FEE`,
 * Agree prints `PAYMENT_GATE_SENTENCE` and Move in prints
 * `NO_CUSTODY_SENTENCE`, verbatim from `lib/money/copy.ts`; the one phrase in
 * the drawings is `NO_INSPECTION_FEE_HEADLINE`, set in sentence case.
 */
/* The platform's glass objects, one a chapter, each with its one motion. */
const CHAPTER_OBJECT: readonly BrandIconName[] = ["listing-search", "inspect-ring", "contract-sign", "keys-handover"];
const CHAPTER_MOTION: readonly GlassMotion[] = ["rise", "pop", "tilt", "turn"];

export function Journey({ t }: { t: Dictionary }) {
  const j = t.landingRooms.journey;
  const bodies: Record<string, string> = {
    inspect: NO_INSPECTION_FEE,
    agree: PAYMENT_GATE_SENTENCE,
    move: NO_CUSTODY_SENTENCE,
  };
  const noFee = NO_INSPECTION_FEE_HEADLINE.charAt(0) + NO_INSPECTION_FEE_HEADLINE.slice(1).toLowerCase();
  const labels = { ...j.screen, noFee: noFee.replace(/\bvallo\b/i, "Vallo") };
  const steps = j.steps.map((s) => ({
    key: s.key as JourneyScreenKey,
    label: s.label,
    title: s.title,
    body: bodies[s.key] ?? ("body" in s ? (s.body ?? "") : ""),
  }));

  return (
    <section className="nf-shell nf-room" data-chapter="journey" aria-labelledby="nf-landing-journey-title">
      <SectionHead id="nf-landing-journey-title" eyebrow={j.overline} title={j.title} lede={j.body} align="center" />
      <JourneyScroll className="nf-journey">
        <ol className="nf-journey__chapters">
          {steps.map((s, i) => (
            <li key={s.key} className="nf-journey__chapter" data-journey-step={i}>
              <MotionReveal className="nf-journey__text nf-depth-gate">
                <span className="nf-journey__mark">
                  <span className="nf-glass-fx nf-feature-glass" data-motion={CHAPTER_MOTION[i] ?? "rise"}>
                    <BrandIcon name={CHAPTER_OBJECT[i] ?? "listing-search"} fill />
                  </span>
                  <span className="nf-journey__num nf-numeric" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="nf-eyebrow">{s.label}</span>
                <h3 className="nf-journey__title">
                  <DepthWords text={s.title} />
                </h3>
                <p className="nf-journey__body">{s.body}</p>
              </MotionReveal>
              {/* The stacked layout's own screen, under 64rem. */}
              <div className="nf-journey__inline">
                <div className="nf-phone nf-phone--sm" data-theme="dark">
                  <JourneyScreen step={s.key} labels={labels} />
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* The pinned phone and its rail, from 64rem. */}
        <div className="nf-journey__stage" aria-hidden="true">
          <div className="nf-journey__rail">
            <span className="nf-journey__rail-fill" />
            {steps.map((s, i) => (
              <span key={s.key} className="nf-journey__dot" data-i={i}>
                {s.label}
              </span>
            ))}
          </div>
          <div className="nf-phone" data-theme="dark">
            {steps.map((s, i) => (
              <div key={s.key} className="nf-journey__screen" data-i={i}>
                <JourneyScreen step={s.key} labels={labels} />
              </div>
            ))}
          </div>
        </div>
      </JourneyScroll>
    </section>
  );
}
