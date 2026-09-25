import { TYPE } from "@/components/app/Screen";

export { carriedParams } from "./stays-dates-carried";

/**
 * UX-08: the dates on the face of /stays/search.
 *
 * Dates used to live only inside "Filters", so a guest arriving from a hotel
 * found a search page with no date field. This is a plain GET form to the
 * same address: every other filter already in the URL rides along in hidden
 * fields, and the three it sets are the ones the search reads (`in`, `out`,
 * `guests`). It works before hydration and with scripts off.
 */
export function StaysDatesRow({
  carried,
  checkIn,
  checkOut,
  guests,
  today,
  copy,
}: {
  /** Every other parameter of the current search, to keep. */
  carried: [string, string][];
  checkIn: string | undefined;
  checkOut: string | undefined;
  guests: number | undefined;
  today: string;
  copy: { checkIn: string; checkOut: string; guests: string; submit: string };
}) {
  return (
    <form method="get" action="/stays/search" className="mt-md grid grid-cols-2 gap-sm sm:grid-cols-4 sm:items-end" data-testid="stays-dates-row">
      {carried.map(([name, value]) => (
        <input key={`${name}=${value}`} type="hidden" name={name} value={value} />
      ))}
      <label className="grid gap-3xs">
        <span className={TYPE.rowMeta}>{copy.checkIn}</span>
        <input type="date" name="in" required min={today} defaultValue={checkIn} className="nf-field" />
      </label>
      <label className="grid gap-3xs">
        <span className={TYPE.rowMeta}>{copy.checkOut}</span>
        <input type="date" name="out" required min={today} defaultValue={checkOut} className="nf-field" />
      </label>
      <label className="grid gap-3xs">
        <span className={TYPE.rowMeta}>{copy.guests}</span>
        <input type="number" name="guests" inputMode="numeric" min={1} max={30} defaultValue={guests ?? 2} className="nf-field" />
      </label>
      {/* The whole row on a phone: at 390 the button had half of it, and
          "Show prices for these dates" ran out of both sides, clipped. It may
          still wrap in a longer locale rather than clip. */}
      <button type="submit" className="nf-btn nf-btn--primary col-span-2 h-auto min-h-11 whitespace-normal text-center leading-tight sm:col-span-1">
        {copy.submit}
      </button>
    </form>
  );
}
