import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { MotionReveal } from "@/components/motion/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  GUARANTEE_SCOPE,
  GUARANTEE_SENTENCE,
  NO_CUSTODY_SENTENCE,
  NO_INSPECTION_FEE,
  PAYMENT_GATE_SENTENCE,
  PAYOUT_ANSWER,
  PRIVATE_FEE_NOTE,
  REFUND_ROUTE,
} from "@/lib/money/copy";
import { structuredDataJson } from "@/lib/listings/syndication";

/**
 * EVERY MONEY ANSWER IS A CONSTANT FROM `lib/money/copy.ts`, joined and never
 * reworded. The dictionary carries only the question for these keys
 * (`landingRooms.faq`), so a change to how money works is one edit in one
 * file and the FAQ, the checkout and the help centre move together.
 */
const MONEY_ANSWERS: Record<string, string> = {
  pay: `${PAYMENT_GATE_SENTENCE} ${NO_CUSTODY_SENTENCE}`,
  inspection: `${NO_INSPECTION_FEE} ${PRIVATE_FEE_NOTE}`,
  guarantee: `${GUARANTEE_SENTENCE} ${GUARANTEE_SCOPE}`,
  payout: PAYOUT_ANSWER,
  refund: REFUND_ROUTE,
};

/** The question list with every answer resolved. Exported for the test. */
export function faqItems(t: Dictionary): { key: string; q: string; a: string }[] {
  return t.landingRooms.faq.items
    .map((item) => ({
      key: item.key,
      q: item.q,
      a: MONEY_ANSWERS[item.key] ?? ("a" in item ? (item.a ?? "") : ""),
    }))
    .filter((item) => item.q && item.a);
}

/**
 * The landing FAQ (Track M). Built on `<details>` and `<summary>`, so it opens
 * and closes with scripts off and a keyboard gets it for free. The panel's
 * height eases over 240ms and the chevron turns half a circle
 * (landing-rooms.css); reduced motion is instant.
 *
 * The same questions go out as FAQPage structured data, so what a search
 * engine quotes is exactly what the page says. The block carries the CSP
 * nonce for the reason the listing page gives: `script-src` is nonce-based.
 */
export function LandingFaq({ t, nonce }: { t: Dictionary; nonce?: string }) {
  const f = t.landingRooms.faq;
  const items = faqItems(t);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <section className="nf-shell pt-section-tight pb-section" aria-labelledby="nf-landing-faq-title">
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: structuredDataJson(jsonLd) }} />
      <div className="nf-faq-room">
        <MotionReveal className="nf-faq-head">
          <span className="nf-overline text-[var(--nf-brand-secondary)]">{f.overline}</span>
          <h2 id="nf-landing-faq-title" className="nf-h1 mt-row">
            {f.title}
          </h2>
          <p className="nf-lede mt-group">{f.body}</p>
          <Link href="/help" prefetch={false} className="nf-room-link mt-heading">
            {f.help}
            <UiIcon name="arrow-right" size={16} aria-hidden />
          </Link>
        </MotionReveal>
        <MotionReveal className="nf-faq-list">
          {items.map((item) => (
            <details key={item.key} className="nf-faq-item">
              <summary className="nf-faq-q">
                <span>{item.q}</span>
                <span className="nf-faq-chevron" aria-hidden="true">
                  <UiIcon name="chevron-down" size={20} />
                </span>
              </summary>
              <div className="nf-faq-a">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </MotionReveal>
      </div>
    </section>
  );
}
