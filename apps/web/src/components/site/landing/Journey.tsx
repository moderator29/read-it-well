import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import {
  NO_CUSTODY_SENTENCE,
  NO_INSPECTION_FEE,
  NO_INSPECTION_FEE_HEADLINE,
  PAYMENT_GATE_SENTENCE,
} from "@/lib/money/copy";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import type { GlassMotion } from "./glass-motion";
import { SectionHead } from "./SectionHead";

/**
 * THE JOURNEY: Find, Inspect, Agree, Move in, as four numbered step cards
 * joined by one progress line (the founder's ruling of 29 September: no phone
 * or device frame anywhere on the landing).
 *
 * Each card carries a glass object, its number on the line, the step's name,
 * a title, one sentence, and a small product fragment: the one or two labels
 * the product itself shows at that step ("Booked", "Approved by Vallo",
 * "Straight to their bank"). The fragment repeats what the sentence says, so
 * it is `aria-hidden`; the sentence carries the meaning.
 *
 * THE LINE FILLS AS THE READER SCROLLS, from CSS alone: a scroll-driven
 * animation on the list's own view timeline (landing-rooms.css), horizontal
 * across the four cards from 64rem and vertical down the stack below it.
 * Where the browser has no scroll timelines, and under reduced motion, the
 * line is simply drawn full. There is no script and nothing is pinned.
 *
 * THE MONEY SENTENCES ARE THE CONSTANTS. Inspect prints `NO_INSPECTION_FEE`,
 * Agree prints `PAYMENT_GATE_SENTENCE` and Move in prints
 * `NO_CUSTODY_SENTENCE`, verbatim from `lib/money/copy.ts`; the one money
 * phrase in a fragment is `NO_INSPECTION_FEE_HEADLINE`, set in sentence case.
 */
const CHAPTER_OBJECT: readonly BrandIconName[] = ["listing-search", "inspect-ring", "contract-sign", "keys-handover"];
const CHAPTER_MOTION: readonly GlassMotion[] = ["rise", "pop", "tilt", "turn"];

type Fragment = { icon: UiIconName; label: string; tone?: "ok" };

export function Journey({ t }: { t: Dictionary }) {
  const j = t.landingRooms.journey;
  const s = j.screen;
  const bodies: Record<string, string> = {
    inspect: NO_INSPECTION_FEE,
    agree: PAYMENT_GATE_SENTENCE,
    move: NO_CUSTODY_SENTENCE,
  };
  const noFee = NO_INSPECTION_FEE_HEADLINE.charAt(0) + NO_INSPECTION_FEE_HEADLINE.slice(1).toLowerCase();
  const fragments: Record<string, Fragment[]> = {
    find: [{ icon: "search", label: s.search }],
    inspect: [
      { icon: "calendar-booking", label: s.booked, tone: "ok" },
      { icon: "check", label: noFee.replace(/\bvallo\b/i, "Vallo") },
    ],
    agree: [
      { icon: "document", label: `${s.you} · ${s.owner}` },
      { icon: "verified", label: s.approved, tone: "ok" },
    ],
    move: [
      { icon: "check", label: s.paid, tone: "ok" },
      { icon: "wallet", label: s.theirBank },
    ],
  };
  const steps = j.steps.map((step) => ({
    key: step.key,
    label: step.label,
    title: step.title,
    body: bodies[step.key] ?? ("body" in step ? (step.body ?? "") : ""),
  }));

  return (
    <section className="nf-shell nf-room" data-chapter="journey" aria-labelledby="nf-landing-journey-title">
      <SectionHead id="nf-landing-journey-title" eyebrow={j.overline} title={j.title} lede={j.body} align="center" />
      <div className="nf-steps">
        <span className="nf-steps__line" aria-hidden="true">
          <span className="nf-steps__fill" />
        </span>
        <MotionReveal as="ol" stagger className="nf-steps__list">
          {steps.map((step, i) => (
            <li key={step.key} className="nf-step">
              <span className="nf-step__num nf-numeric" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <article className="nf-step__card nf-fx-host">
                <span className="nf-glass-fx nf-feature-glass nf-step__glass" data-motion={CHAPTER_MOTION[i] ?? "rise"}>
                  <BrandIcon name={CHAPTER_OBJECT[i] ?? "listing-search"} fill />
                </span>
                <span className="nf-eyebrow nf-step__label">{step.label}</span>
                <h3 className="nf-step__title">{step.title}</h3>
                <p className="nf-step__body">{step.body}</p>
                <ul className="nf-step__ui" aria-hidden="true">
                  {(fragments[step.key] ?? []).map((f) => (
                    <li key={f.label} className="nf-step__chip" data-tone={f.tone}>
                      <UiIcon name={f.icon} size={16} />
                      {f.label}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </MotionReveal>
      </div>
    </section>
  );
}
