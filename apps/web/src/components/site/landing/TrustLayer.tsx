import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { MotionReveal } from "@/components/motion/Reveal";
import { GOVERNING_SENTENCE } from "@/lib/money/copy";
import { CheckCard } from "./CheckCard";
import { examplePassportLines } from "./example-passport";

/**
 * THE TRUST LAYER (P7, 7 October 2026): what stands behind every deal, three
 * things and each one real.
 *
 *   - THE VALLO PASSPORT, drawn as the page's one platinum object
 *     (PREMIUM-STANDARD, "one material: platinum", one per screen). It is an
 *     example credential and says so: its lines are the passport's own, worded
 *     by the function the real one is worded with (`example-passport.ts`),
 *     and they are an illustration, never a person.
 *   - CHECK BEFORE YOU PAY, the working field (`CheckCard`): paste a number
 *     or a VA- code and the answer is drawn in place, with no account.
 *   - WHERE YOUR MONEY GOES, the founder's governing sentence verbatim
 *     (`GOVERNING_SENTENCE`), with the door to the full explanation.
 *
 * No claim word is used that the code does not back: no "safe", no
 * "protected", no "verified" in a heading (`lib/trust/claims.ts`).
 */
export function TrustLayer({ t, locale }: { t: Dictionary; locale: Locale }) {
  const tr = t.experienceLanding.plasma.trust;
  const pass = t.passportV2;
  const ui = t.landingRooms.stack.ui;
  /* The Vallo passport's own example lines (`example-passport.ts`). */
  const facts = examplePassportLines(t, locale);
  return (
    <section className="nf-pl-trust" data-chapter="trust" aria-labelledby="nf-pl-trust-title">
      <div className="nf-shell">
        <header className="nf-pl-head nf-pl-head--center">
          <p className="nf-pl-overline">{tr.overline}</p>
          <h2 id="nf-pl-trust-title" className="nf-pl-title">
            {tr.title}
          </h2>
        </header>
        <div className="nf-pl-trust__grid">
          <MotionReveal className="nf-pl-trust__passport">
            {/* The one platinum object on the page. */}
            <div className="nf-pl-platinum" aria-hidden="true">
              <span className="nf-pl-platinum__sheen" />
              <div className="nf-pl-platinum__top">
                <span className="nf-pl-platinum__mark">
                  <LogoMark size={22} />
                </span>
                <span className="nf-pl-platinum__kind">{pass.documentKind}</span>
                <span className="nf-pl-platinum__example">{ui.example}</span>
              </div>
              <ul className="nf-pl-platinum__facts">
                {facts.map((fact) => (
                  <li key={fact.key}>
                    <UiIcon name={fact.icon} size={16} />
                    <span>{fact.label}</span>
                    <span className="nf-pl-platinum__value nf-numeric">{fact.value}</span>
                  </li>
                ))}
              </ul>
              <p className="nf-pl-platinum__foot">
                <UiIcon name="lock" size={12} />
                {pass.wholeOnSub}
              </p>
            </div>
            <div className="nf-pl-trust__words">
              <h3 className="nf-pl-trust__title">{tr.passport.name}</h3>
              <p className="nf-pl-trust__body">{tr.passport.body}</p>
            </div>
          </MotionReveal>
          <div className="nf-pl-trust__side">
            <CheckCard t={t} locale={locale} />
            <MotionReveal className="nf-pd-card nf-pl-trust__money">
              <span className="nf-pl-trust__plate" aria-hidden="true">
                <UiIcon name="bank" size={20} />
              </span>
              <h3 className="nf-pl-trust__title">{tr.money.title}</h3>
              <p className="nf-pl-trust__body">{GOVERNING_SENTENCE}</p>
              <Link href="/safety" prefetch={false} className="nf-pl-link">
                {tr.money.cta}
                <UiIcon name="arrow-right" size={16} aria-hidden />
              </Link>
            </MotionReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
