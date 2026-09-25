import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { NO_INSPECTION_FEE, PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";
import { SectionHead } from "./SectionHead";
import type { GlassMotion } from "./glass-motion";

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
 * Each card's glass object (the platform's own icons, never a line glyph on
 * a content surface) plays one micro-motion as the card arrives and again on
 * hover: the agreement tilts as if picked up, the shield pops, the keys turn.
 */
export function ProtectBand({ t }: { t: Dictionary }) {
  const p = t.landingRooms.protect;
  const cards: {
    key: string;
    object: BrandIconName;
    motion: GlassMotion;
    title: string;
    body: string;
    more?: { href: string; label: string };
  }[] = [
    { key: "gate", object: "contract-sign", motion: "tilt", title: p.gate.title, body: PAYMENT_GATE_SENTENCE },
    {
      key: "guarantee",
      object: "shield-check",
      motion: "pop",
      title: p.guarantee.title,
      body: t.landing.oneAccount.points.savings.body,
      more: { href: "/safety", label: p.guarantee.more },
    },
    { key: "inspection", object: "keys-home", motion: "turn", title: p.inspection.title, body: NO_INSPECTION_FEE },
  ];
  return (
    <section className="nf-shell nf-room" data-chapter="protect" aria-labelledby="nf-landing-protect-title">
      <SectionHead id="nf-landing-protect-title" eyebrow={p.overline} title={p.title} lede={p.body} align="center" />
      <MotionReveal as="ul" stagger className="nf-protect-grid">
        {cards.map((c) => (
          <li key={c.key} className="nf-protect-card nf-fx-host">
            <span className="nf-glass-fx nf-feature-glass" data-motion={c.motion}>
              <BrandIcon name={c.object} fill />
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
