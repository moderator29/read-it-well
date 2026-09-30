import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";

/**
 * A8. The move-in total in the first screen: the compact door to
 * `/move-in-cost`, under the hero's fact row.
 *
 * A plain GET form, so it works before any script has loaded: the yearly rent
 * goes to the calculator, which adds the fees the visitor was quoted. It
 * prints no fee of its own; the lines it names are the ones every rental on
 * Vallo states (`lib/listings/pricing.ts`, `moveInParts`).
 */
export function MoveInCompact({ t }: { t: Dictionary }) {
  const c = t.publicDoors.moveIn;
  const parts = [c.lines.rent, c.lines.agency, c.lines.legal, c.lines.caution, c.lines.service];
  return (
    <form method="get" action="/move-in-cost" className="nf-pd-card nf-movein-compact nf-rise nf-rise-4" aria-labelledby="nf-movein-compact-title">
      <div className="nf-movein-compact__head">
        <span className="nf-plate nf-plate--brand nf-plate--sm" aria-hidden="true">
          <UiIcon name="coins" size={20} />
        </span>
        <div>
          <p className="nf-section-label">{c.compactLabel}</p>
          <h2 id="nf-movein-compact-title" className="nf-movein-compact__title">
            {c.compactTitle}
          </h2>
        </div>
      </div>
      <p className="nf-movein-compact__body">{c.compactBody}</p>
      <ul className="nf-movein-compact__parts" aria-label={c.barLabel}>
        {parts.map((part, index) => (
          <li key={part}>
            {index > 0 && (
              <span className="nf-movein-compact__plus" aria-hidden="true">
                +
              </span>
            )}
            {part}
          </li>
        ))}
      </ul>
      <label htmlFor="nf-movein-compact-rent" className="nf-label">
        {c.rentLabel}
      </label>
      <div className="nf-movein-compact__row">
        <div className="nf-calc__money">
          <span className="nf-calc__currency" aria-hidden="true">
            ₦
          </span>
          <input
            id="nf-movein-compact-rent"
            name="rent"
            className="nf-field nf-calc__input nf-numeric"
            inputMode="decimal"
            autoComplete="off"
            placeholder={c.rentPlaceholder}
            maxLength={18}
            data-testid="hero-movein-rent"
          />
        </div>
        <Button type="submit" variant="primary" size="md" trailingIcon="arrow-right">
          {c.compactSubmit}
        </Button>
      </div>
    </form>
  );
}
