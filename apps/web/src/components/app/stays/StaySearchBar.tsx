import type { Dictionary } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { ICON } from "@/components/app/Screen";
import type { ListingKind } from "@/lib/listings/types";

/**
 * The stays search bar: where, when, how many.
 *
 * The same chassis as the home search (the 48px live card with the submit
 * beside the field), grown by the two things a stay needs that a rental does
 * not: dates and a party. A plain GET form, so a search is a link, the back
 * button walks it backwards and a reload lands on the same results; the URL
 * is the contract (`components/app/stays/model.ts` reads it).
 *
 * A server component: no state, no JavaScript. The native date fields are the
 * honest control on a phone, where they open the system picker, and they
 * carry `min` so yesterday cannot be chosen.
 */
export function StaySearchBar({
  t,
  q = "",
  checkIn = "",
  checkOut = "",
  guests = 2,
  type,
  today,
  compact = false,
}: {
  t: Dictionary;
  q?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  /** A preset kind carried through the search, from a category door. */
  type?: ListingKind;
  /** Today in Lagos, ISO, for the date floor. */
  today: string;
  /** On the results screen the bar sits under the header and drops its title row. */
  compact?: boolean;
}) {
  return (
    <form
      action="/stays/search"
      method="get"
      role="search"
      className={`nf-card nf-card--live nf-focus-well flex flex-col gap-inline p-inline ${compact ? "" : "mt-block"}`}
    >
      {type ? <input type="hidden" name="type" value={type} /> : null}
      <div className="group flex min-w-0 items-center gap-row px-row">
        <UiIcon
          name="location"
          size={ICON.row}
          className="shrink-0 text-[var(--nf-content-muted)] transition-colors duration-[var(--nf-duration-fast)] group-focus-within:text-[var(--nf-content-primary)]"
        />
        <label htmlFor="stays-q" className="sr-only">
          {t.stays.where}
        </label>
        <input
          id="stays-q"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={q}
          placeholder={t.stays.wherePlaceholder}
          className="nf-body w-full bg-transparent py-row text-[var(--nf-content-primary)] outline-none placeholder:text-[var(--nf-content-muted)]"
        />
      </div>
      <div className="nf-hairline grid grid-cols-2 gap-inline pt-inline">
        <label className="flex min-w-0 flex-col gap-2xs px-row">
          <span className="nf-caption text-[var(--nf-content-muted)]">{t.stays.checkIn}</span>
          <input
            name="checkIn"
            type="date"
            min={today}
            defaultValue={checkIn}
            className="nf-body-sm w-full min-w-0 bg-transparent text-[var(--nf-content-primary)] outline-none"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-2xs px-row">
          <span className="nf-caption text-[var(--nf-content-muted)]">{t.stays.checkOut}</span>
          <input
            name="checkOut"
            type="date"
            min={checkIn || today}
            defaultValue={checkOut}
            className="nf-body-sm w-full min-w-0 bg-transparent text-[var(--nf-content-primary)] outline-none"
          />
        </label>
      </div>
      <div className="nf-hairline grid grid-cols-[5.5rem_1fr] items-end gap-inline pt-inline">
        <label className="flex min-w-0 flex-col gap-2xs px-row">
          <span className="nf-caption text-[var(--nf-content-muted)]">{t.stays.guests}</span>
          <input
            name="guests"
            type="number"
            inputMode="numeric"
            min={1}
            max={16}
            defaultValue={guests}
            className="nf-body-sm nf-numeric w-full min-w-0 bg-transparent text-[var(--nf-content-primary)] outline-none"
          />
        </label>
        <Button type="submit" variant="primary" size="lg" leadingIcon="search" className="w-full">
          {t.stays.search}
        </Button>
      </div>
    </form>
  );
}
