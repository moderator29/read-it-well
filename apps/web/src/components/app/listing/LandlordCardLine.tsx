import type { Dictionary } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * V-31 UNDER A SEARCH CARD: one short line, or nothing.
 *
 * "Not reconfirmed" when the owner let a question go 21 days unanswered (the
 * card has also been sorted last), "Owner confirmed available 3 days ago" when
 * the owner answered yes, and nothing in every other case. The line sits under
 * the card rather than inside it so the shared card component is untouched and
 * every other surface that draws a card draws exactly what it drew before.
 * Icon and words, never colour alone.
 *
 * V-37: when the shelf has collapsed the copies of one property into this card,
 * a line above says how many offers it carries; the listing page compares them.
 */
export function LandlordCardLine({
  notReconfirmed,
  confirmed,
  copy,
  offerCount = 1,
  offersCopy,
}: {
  notReconfirmed: boolean;
  confirmed: string | null;
  copy: Dictionary["landlord"]["listing"];
  /** V-37: how many published offers this card stands for, once collapsed. */
  offerCount?: number;
  /** "Offered by {n} agents". */
  offersCopy?: string;
}) {
  const offers =
    offerCount > 1 && offersCopy ? (
      <p className="mt-2xs flex items-center gap-2xs text-[length:var(--nf-text-overline)] font-semibold text-[var(--nf-content-secondary)]" data-testid="card-offer-count">
        <UiIcon name="grid" size={16} className="shrink-0 text-[var(--nf-brand-secondary)]" />
        {offersCopy.replace("{n}", String(offerCount))}
      </p>
    ) : null;
  return (
    <>
      {offers}
      <AvailabilityLine notReconfirmed={notReconfirmed} confirmed={confirmed} copy={copy} />
    </>
  );
}

function AvailabilityLine({
  notReconfirmed,
  confirmed,
  copy,
}: {
  notReconfirmed: boolean;
  confirmed: string | null;
  copy: Dictionary["landlord"]["listing"];
}) {
  if (notReconfirmed) {
    return (
      <p className="mt-2xs flex items-center gap-2xs text-[length:var(--nf-text-overline)] font-semibold text-[var(--nf-state-warning)]" data-testid="card-not-reconfirmed">
        <UiIcon name="info" size={16} className="shrink-0" />
        {copy.notReconfirmed}
      </p>
    );
  }
  if (!confirmed) return null;
  return (
    <p className="mt-2xs flex items-center gap-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-secondary)]" data-testid="card-owner-confirmed">
      <UiIcon name="history" size={16} className="shrink-0 text-[var(--nf-status-verified)]" />
      <span className="min-w-0">{confirmed}</span>
    </p>
  );
}
