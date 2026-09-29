import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { declaredCharges } from "@/lib/stays/arrival-charges";
import { readBookingSnapshot, readDeclaration } from "@/lib/stays/arrival-queries";

/**
 * V-57. "At the door": what this stay's host declared a guest can be asked
 * for on arrival, and the sentence to say at the gate. An undeclared stay
 * says so in words; a failed read renders nothing rather than a promise.
 * Given a booking that has been paid, it shows what was declared at payment,
 * not whatever the host has declared since. Callers render it only for a
 * stay: never on a rent charge.
 */
export async function ArrivalChargesLine({
  listingId,
  accommodationId,
  bookingId,
  locale,
}: {
  /** A listing stay's listing, or null for a hotel room. */
  listingId: string | null;
  /** A hotel room's hotel (ROOM BOOKINGS 1). */
  accommodationId?: string | null;
  bookingId?: string;
  locale: Locale;
}) {
  const copy = getDictionary(locale).afterTheGate.arrival;
  const snapshot = bookingId ? await readBookingSnapshot(bookingId) : null;
  if (snapshot === undefined) return null;
  const declaration = snapshot
    ? snapshot.charges
    : await readDeclaration(listingId ? { listingId } : { accommodationId: accommodationId ?? undefined });
  if (declaration === undefined) return null;
  const owed = declaration ? declaredCharges(declaration) : [];
  return (
    <section className="nf-panel nf-panel--card block p-md" data-testid="arrival-charges-line" aria-label={copy.guestHeading}>
      <h2 className="nf-h4">{copy.guestHeading}</h2>
      {owed.length > 0 && (
        <ul className="mt-xs grid gap-2xs">
          {owed.map((line) => (
            <li key={line.key} className="nf-body-sm nf-numeric">
              {copy.guestLine
                .replace("{key}", copy.keys[line.key])
                .replace("{amount}", formatMoney(line.minor, locale))
                .replace("{per}", copy.units[line.per])}
            </li>
          ))}
        </ul>
      )}
      <p className="nf-body-sm mt-xs font-semibold">
        {declaration === null ? copy.guestUndeclared : owed.length === 0 ? copy.guestNothing : copy.guestOnly}
      </p>
    </section>
  );
}
