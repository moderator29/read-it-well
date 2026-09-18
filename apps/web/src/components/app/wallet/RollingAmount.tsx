"use client";

import type { Locale } from "@vallo/i18n";
import { formatKoboExact } from "./money";
import { rollingSlots } from "./rolling-slots";

/**
 * A money figure that rolls as it changes.
 *
 * `components/site/Odometer` rolls ONCE, when it scrolls into view, and keys
 * every digit on its value, so a figure that changes under a person's thumb
 * remounts its slots and snaps. That is right for a balance that arrived and
 * wrong for an amount being typed, which is what the send and receive pages
 * carry: the number should assemble as the digits go in, and the balance
 * after the send should settle as the amount settles.
 *
 * Same material, no new motion. The strips are `nf-odometer__*` from
 * motion.css, whose transition is already on the deliberate duration and
 * already switched off under reduced motion. What changes is the KEY: a digit
 * is keyed by its position from the right, so "5" typed after "12" keeps the
 * 1 and the 2 where they are and slides a new units digit in, and 999 to
 * 1,000 rolls the three nines over rather than replacing them.
 *
 * Integer kobo in, formatted through the same `formatKoboExact` the wallet
 * balance uses, so the symbol, the grouping and the sign are the locale's.
 */
export function RollingAmount({
  minor,
  locale,
  className,
  koboClassName,
}: {
  minor: number;
  locale: Locale;
  className?: string;
  koboClassName?: string;
}) {
  const exact = formatKoboExact(minor, locale);
  const digitAt = exact.whole.search(/\d/);
  const lead = digitAt === -1 ? exact.whole : exact.whole.slice(0, digitAt);
  const figure = digitAt === -1 ? "" : exact.whole.slice(digitAt);

  const slots = rollingSlots(figure);

  return (
    <span className={`nf-odometer nf-numeric ${className ?? ""}`}>
      <span className="sr-only" aria-live="polite">
        {exact.whole}
        {exact.kobo}
      </span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {lead && <span className="nf-odometer__sep">{lead}</span>}
        {slots.map((slot) =>
          slot.digit ? (
            <span key={slot.key} className="nf-odometer__slot">
              <span
                className="nf-odometer__strip"
                style={{
                  transform: `translateY(-${Number(slot.ch) * 10}%)`,
                  transitionDelay: `${slot.fromLeft * 40}ms`,
                }}
              >
                {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                  <span key={n} className="nf-odometer__digit">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span key={slot.key} className="nf-odometer__sep">
              {slot.ch}
            </span>
          ),
        )}
        <span className={koboClassName}>{exact.kobo}</span>
      </span>
    </span>
  );
}
