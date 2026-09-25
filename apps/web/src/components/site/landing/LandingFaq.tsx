import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { MotionReveal } from "@/components/motion/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { structuredDataJson } from "@/lib/listings/syndication";
import { faqItems } from "./faq-items";
import { SectionHead } from "./SectionHead";

/**
 * The landing FAQ (Track M). Every money answer is a `lib/money/copy.ts`
 * constant, verbatim (faq-items.ts). Built on `<details>` and `<summary>`, so it opens
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
    <section className="nf-shell nf-room" data-chapter="faq" aria-labelledby="nf-landing-faq-title">
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: structuredDataJson(jsonLd) }} />
      <div className="nf-faq-room">
        <div className="nf-faq-head">
          <SectionHead id="nf-landing-faq-title" eyebrow={f.overline} title={f.title} lede={f.body}>
            <Link href="/help" prefetch={false} className="nf-room-link mt-heading">
            {f.help}
            <UiIcon name="arrow-right" size={16} aria-hidden />
          </Link>
          </SectionHead>
        </div>
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
