import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { MotionReveal } from "@/components/motion/Reveal";
import { FeatureGlyph, type FeatureGlyphName } from "@/components/motion/FeatureGlyph";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { NO_INSPECTION_FEE, PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";

/**
 * How Vallo protects you (Track M): the three rules that sit in the product
 * rather than in a promise. The agreement gate, the Vallo Guarantee, and no
 * inspection fee.
 *
 * THE MONEY SENTENCES ARE THE CONSTANTS. The gate and the inspection fee are
 * `PAYMENT_GATE_SENTENCE` and `NO_INSPECTION_FEE` from `lib/money/copy.ts`,
 * verbatim. The Guarantee card carries the landing's own approved short form
 * (`landing.oneAccount.points.savings`) and links to /safety, where the full
 * `GUARANTEE_SENTENCE` and its scope are printed; the FAQ below prints them
 * too. Nothing on this band is reworded money copy.
 *
 * Each card's icon plays its one micro-motion as the card arrives and again
 * on hover: the page is written in, the shield draws its tick, the key turns.
 */
export function ProtectBand({ t }: { t: Dictionary }) {
  const p = t.landingRooms.protect;
  const cards: { key: string; glyph: FeatureGlyphName; title: string; body: string; more?: { href: string; label: string } }[] = [
    { key: "gate", glyph: "document", title: p.gate.title, body: PAYMENT_GATE_SENTENCE },
    {
      key: "guarantee",
      glyph: "shield",
      title: p.guarantee.title,
      body: t.landing.oneAccount.points.savings.body,
      more: { href: "/safety", label: p.guarantee.more },
    },
    { key: "inspection", glyph: "key", title: p.inspection.title, body: NO_INSPECTION_FEE },
  ];
  return (
    <section className="nf-shell pt-section-tight pb-section" aria-labelledby="nf-landing-protect-title">
      <MotionReveal className="nf-room-head">
        <span className="nf-overline text-[var(--nf-brand-secondary)]">{p.overline}</span>
        <h2 id="nf-landing-protect-title" className="nf-h1 mt-row">
          {p.title}
        </h2>
        <p className="nf-lede mt-group">{p.body}</p>
      </MotionReveal>
      <MotionReveal as="ul" stagger className="nf-protect-grid">
        {cards.map((c) => (
          <li key={c.key} className="nf-protect-card nf-fx-host">
            <span className="nf-feature-icon">
              <FeatureGlyph name={c.glyph} id={`nf-protect-${c.key}`} />
            </span>
            <h3 className="nf-protect-title">{c.title}</h3>
            <p className="nf-protect-body">{c.body}</p>
            {c.more && (
              <Link href={c.more.href} prefetch={false} className="nf-room-link">
                {c.more.label}
                <UiIcon name="arrow-right" size={16} aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </MotionReveal>
    </section>
  );
}
