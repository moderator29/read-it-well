import type { CSSProperties } from "react";
import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { ButtonLink } from "@/components/ui/Button";
import { MotionReveal } from "@/components/motion/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Door } from "./doors";
import { SectionHead } from "./SectionHead";
import { EXAMPLE_MOVE_IN, MOVE_IN_PARTS, partMinor, type MoveInPart } from "./example-move-in";

/**
 * THE MOVE-IN ARGUMENT, AS ITS OWN BAND (north star 10 A; the handoff's Stage
 * 3: "the move-in argument as its own band").
 *
 * The platform was built on one observation: in Nigeria the rent is not what
 * it costs to move in. Caution, agency, legal and agreement fees arrive on
 * top, usually after the viewing. So this band says it once, with the number
 * as the subject (north star D4): the example flat's move-in total, large and
 * tabular, counting up as it enters, the rent beneath it, then the bar of
 * what the total is made of and the lines that make it.
 *
 * EVERYTHING ON THE FIGURE CARD IS AN EXAMPLE AND SAYS SO. The figures are
 * `example-move-in.ts`, the same flat the hero card shows, and they add up.
 * The words are existing keys: the calculator's own title and labels
 * (`publicDoors.moveIn`) and the listing card's sentence
 * (`landingRooms.stack.cards.listing.body`). No money sentence is written
 * here.
 *
 * THE BAR TEACHES THE PROPORTION. Each segment is its real share of the
 * total (flex-grow by kobo), and it draws in from the left as the card
 * arrives, segment by segment 60ms apart (landing-rooms.css, "the move-in
 * band"). Pointing at a line lifts its segment and dims the rest, so the eye
 * can match a fee to its share. The lines are a real list with the amounts
 * as text, so nothing depends on seeing the colour or on a pointer; they are
 * not made focusable, because a tab stop that does nothing is a cost to a
 * keyboard reader, not a feature.
 *
 * Server rendered; the only script is the count, which `Amount` owns.
 */
export function MoveInBand({ t, locale, door }: { t: Dictionary; locale: Locale; door: Door }) {
  const m = t.publicDoors.moveIn;
  const u = t.landingRooms.stack.ui;
  const label: Record<MoveInPart, string> = {
    rent: m.lines.rent,
    caution: m.lines.caution,
    agency: m.lines.agency,
    legal: m.lines.legal,
    agreement: m.lines.agreement,
  };
  const rentText = formatMoney(EXAMPLE_MOVE_IN.rent, locale);

  return (
    <section className="nf-shell nf-room" data-chapter="movein" aria-labelledby="nf-landing-movein-title">
      <div className="nf-landing-movein">
        <SectionHead
          id="nf-landing-movein-title"
          eyebrow={m.compactLabel}
          title={m.compactTitle}
          lede={t.landingRooms.stack.cards.listing.body}
        >
          <div className="nf-landing-movein__actions">
            <ButtonLink href="/move-in-cost" variant="secondary" size="md" trailingIcon="arrow-right">
              {m.compactSubmit}
            </ButtonLink>
            <Link href={door("/search")} prefetch={false} className="nf-room-link">
              {m.cta}
              <UiIcon name="arrow-right" size={16} aria-hidden />
            </Link>
          </div>
        </SectionHead>

        <MotionReveal className="nf-landing-movein__card nf-panel nf-panel--card nf-panel--figure">
          <div className="nf-landing-movein__head">
            <p className="nf-section-label">{u.moveIn}</p>
            <span className="nf-badge nf-badge--example">
              <UiIcon name="info" size={12} aria-hidden />
              {u.example}
            </span>
          </div>
          <p className="nf-landing-movein__figure">
            <Amount minorUnits={EXAMPLE_MOVE_IN.total} locale={locale} currency="NGN" className="nf-numeric" count />
          </p>
          <p className="nf-landing-movein__on">{t.experienceLanding.moveIn.onRent.replace("{amount}", rentText)}</p>

          <div className="nf-landing-movein__bar" aria-hidden="true">
            {MOVE_IN_PARTS.map((part, i) => (
              <span
                key={part}
                data-part={part}
                style={{ flexGrow: partMinor(part), "--seg-i": i } as CSSProperties}
              />
            ))}
          </div>

          <dl className="nf-landing-movein__lines" aria-label={m.barLabel}>
            {MOVE_IN_PARTS.map((part) => (
              <div key={part} className="nf-landing-movein__line" data-part={part}>
                <dt>
                  <span className="nf-landing-movein__dot" aria-hidden="true" />
                  {label[part]}
                </dt>
                <dd>
                  <Amount minorUnits={partMinor(part)} locale={locale} currency="NGN" className="nf-numeric" />
                </dd>
              </div>
            ))}
            <div className="nf-landing-movein__line nf-landing-movein__line--total">
              <dt>{u.moveIn}</dt>
              <dd>
                <Amount minorUnits={EXAMPLE_MOVE_IN.total} locale={locale} currency="NGN" className="nf-numeric" />
              </dd>
            </div>
          </dl>
        </MotionReveal>
      </div>
    </section>
  );
}
