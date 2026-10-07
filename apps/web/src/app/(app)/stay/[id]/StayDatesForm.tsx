import { TYPE } from "@/components/app/Screen";
import { Button } from "@/components/ui/Button";
import { lagosToday } from "@/lib/bookings/schema";

/**
 * UX-08: THE DATES ARE PICKED ON THE STAY ITSELF.
 *
 * Check in, Check out, Guests and "Pick your dates" used to link to
 * `/stays/search`, which has no date field on its face, so the guest lost the
 * hotel at the first step of booking. This is a plain GET form to the same
 * `/stay/<id>` address: submitting it reloads this page with `checkIn`,
 * `checkOut` and `guests` in the URL, which is exactly what the page already
 * reads to price the stay and to build "Book now". It works before the page
 * has hydrated and with scripts off. The date controls are the browser's own;
 * the earliest check-in is today in Lagos.
 *
 * ONE DATES CARD, NOT TWO (7 October 2026). The page used to draw a "Check
 * availability" card whose three fields were links to this form, and then this
 * form under it: the same three facts twice, one above the other. The form is
 * the availability card now. Its submit is a secondary, because the page's one
 * primary is the anchored foot (`StayFoot`).
 */
export function StayDatesForm({
  action,
  checkIn,
  checkOut,
  guests,
  copy,
  note,
}: {
  action: string;
  checkIn: string | undefined;
  checkOut: string | undefined;
  guests: number;
  copy: { title: string; checkIn: string; checkOut: string; guests: string; submit: string };
  /** One quiet line under the submit, e.g. "Pick your dates to see the total." */
  note?: string;
}) {
  const today = lagosToday();
  return (
    <form
      id="stay-dates"
      method="get"
      action={action}
      className="nf-panel nf-panel--card grid scroll-mt-28 gap-sm p-card"
      data-testid="stay-dates-form"
    >
      <p className={TYPE.rowTitle}>{copy.title}</p>
      <div className="grid grid-cols-2 gap-sm">
        <label className="grid gap-3xs">
          <span className={TYPE.rowMeta}>{copy.checkIn}</span>
          <input type="date" name="checkIn" required min={today} defaultValue={checkIn} className="nf-field" />
        </label>
        <label className="grid gap-3xs">
          <span className={TYPE.rowMeta}>{copy.checkOut}</span>
          <input type="date" name="checkOut" required min={today} defaultValue={checkOut} className="nf-field" />
        </label>
      </div>
      <label className="grid gap-3xs">
        <span className={TYPE.rowMeta}>{copy.guests}</span>
        <input
          type="number"
          name="guests"
          inputMode="numeric"
          min={1}
          max={16}
          defaultValue={guests}
          className="nf-field"
        />
      </label>
      <Button type="submit" variant="secondary" full>
        {copy.submit}
      </Button>
      {note ? <p className={`text-center ${TYPE.rowMeta}`}>{note}</p> : null}
    </form>
  );
}
