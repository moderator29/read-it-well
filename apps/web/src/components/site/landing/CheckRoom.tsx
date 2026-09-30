import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import { MotionReveal } from "@/components/motion/Reveal";
import { CheckForm } from "@/app/(site)/check/CheckForm";

/**
 * A7. "CHECK BEFORE YOU PAY" AS A FRONT-DOOR FEATURE.
 *
 * `/check` answers "is this a Vallo agent?" for anybody, with no account, and
 * it was linked from nowhere a stranger looks. This room puts the field itself
 * on the landing: paste a number or a VA- code and the answer is drawn in
 * place, through the same rate-limited action the page uses
 * (`lib/doors/agent-check-actions.ts`). A "no match" offers the fixed warning
 * share, which never carries the number.
 *
 * One card, the clean unified material (`.nf-pd-card`): the question and a
 * line on the left, the field on the right from 48rem, stacked on a phone.
 */
export function CheckRoom({ t, locale }: { t: Dictionary; locale: Locale }) {
  const c = t.publicDoors.checkCard;
  return (
    <section className="nf-check-room" data-chapter="check" aria-labelledby="nf-check-room-title">
      <div className="nf-shell">
        <MotionReveal className="nf-pd-card nf-check-card">
          <div className="nf-check-card__text">
            <p className="nf-section-label">{c.label}</p>
            <div className="nf-check-card__title-row">
              <IconPlate size="md" tone="brand">
                <UiIcon name="shield-check" size={20} />
              </IconPlate>
              <h2 id="nf-check-room-title" className="nf-check-card__title">
                {c.title}
              </h2>
            </div>
            <p className="nf-check-card__body">{c.body}</p>
            <div className="nf-check-card__links">
              <Link href="/r" className="nf-pd-link">
                <UiIcon name="receipt" size={16} aria-hidden />
                {c.receipt}
              </Link>
              <Link href="/check" className="nf-pd-link">
                <UiIcon name="arrow-right" size={16} aria-hidden />
                {c.open}
              </Link>
            </div>
          </div>
          <div className="nf-check-card__form">
            <CheckForm copy={t.trustDoors.check} locale={locale} initial="" warning={t.publicDoors.warning} compact />
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
