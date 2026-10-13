import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import { allInMinor, doorLines, type DoorCharge } from "@/lib/stays/door-total";

export type DoorTotalCopy = Pick<
  Dictionary["afterTheGate"]["arrival"],
  "guestHeading" | "perLine" | "returned" | "asUsed" | "allIn" | "allInNote"
>;

/**
 * EVERY COST BEFORE A GUEST BOOKS (V-57, product rule 2): each charge the host
 * declared for the door, worked out for these nights and this party, and the
 * one all-in figure, the price plus every charge that can be counted. A charge
 * per unit used is listed and never added. Drawn by the hotel stay page, the
 * listing's reserve panel and checkout, so the three say the same thing.
 * Nothing when nothing is declared for the door. No hooks, so a server page
 * and a client panel can both draw it.
 */
export function DoorTotal({
  charges,
  nights,
  guests,
  priceMinor,
  locale,
  copy,
  note,
}: {
  charges: readonly DoorCharge[];
  nights: number;
  guests: number;
  /** What is paid through Vallo for the stay, in kobo: the all-in starts here. */
  priceMinor: number;
  locale: Locale;
  copy: DoorTotalCopy;
  /** The sentence under the figure; the plain "nothing else" line by default. */
  note?: string;
}) {
  const lines = doorLines(charges, nights, guests);
  if (lines.length === 0) return null;
  return (
    <section className="nf-panel nf-panel--card block p-md" data-testid="stay-all-in" aria-label={copy.allIn}>
      <p className="nf-body-sm font-semibold">{copy.guestHeading}</p>
      <ul className="mt-xs grid gap-2xs">
        {lines.map((line) => (
          <li key={line.key} className="flex items-start justify-between gap-sm nf-body-sm">
            <span className="min-w-0">
              {line.label}
              <span className="block nf-caption">
                {copy.perLine.replace("{amount}", formatMoney(line.minor, locale)).replace("{per}", line.perLabel)}
              </span>
              {line.refundable && <span className="block nf-caption">{copy.returned}</span>}
            </span>
            <span className="shrink-0 nf-numeric">
              {line.forStayMinor === null ? copy.asUsed : formatMoney(line.forStayMinor, locale)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-sm flex items-start justify-between gap-sm nf-body-sm font-semibold" data-testid="stay-all-in-total">
        <span>{copy.allIn}</span>
        <span className="nf-numeric">{formatMoney(allInMinor(priceMinor, lines), locale)}</span>
      </p>
      <p className="mt-2xs nf-caption">{note ?? copy.allInNote}</p>
    </section>
  );
}
