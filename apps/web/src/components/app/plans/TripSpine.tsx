import Link from "next/link";
import Image from "next/image";
import { getDictionary, plural, type Locale } from "@vallo/i18n";
import { Disclosure } from "@/components/app/Disclosure";
import { ICON, TYPE } from "@/components/app/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatusChip } from "@/components/ui/StatusChip";
import { bookingChip } from "@/components/app/bookings/booking-chip";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { iconPlateClass } from "@/components/ui/IconPlate";
import type { BookingView } from "@/lib/bookings/queries";
import type { ReservationView } from "@/lib/reservations/queries";
import { CancelBookingControl } from "@/components/app/bookings/CancelBookingSheet";
import { restaurantPlate } from "@/components/app/stays/restaurant-plates";
import { buildTripSpine, type TripEntry } from "./trip-spine";

/**
 * TRIPS, ON A DATE SPINE.
 *
 * Research pitch 12. Every trip a person has, in the order they happen, with
 * a vertical rule connecting them and today accented. The rule is what turns
 * three separate cards into one chronology: you can see that the table on
 * Friday sits between the two nights in Ikoyi without reading either date.
 *
 * TONIGHT IS THE ONE ACCENT. Not a colour per status, not a colour per kind:
 * one accent, on the thing happening now, which is the only row whose date a
 * person does not have to work out. Colour is never the only signal, so the
 * marker is a filled ring at a different weight and the row says "Today" in
 * words as well.
 *
 * THE PAST IS ONE TAP AWAY, NOT DELETED. `Disclosure` moves it into a sheet,
 * which is this platform's answer to a secondary block: nothing is lost and
 * the spine stays a list of what is ahead.
 *
 * A RESERVATION IS A TRIP. `trip-spine.ts` orders both kinds together, and
 * the page reads the account's tables through `getMyReservations` and hands
 * them in beside the stays.
 */

type TripItem = TripEntry & {
  title: string;
  where: string;
  when: string;
  meta: string;
  href: string;
  photo: string | null;
  status: BookingView["status"];
  justBooked: boolean;
  /* The row's own booking, carried so the cancel control has the record it
     confirms against. Only a stay has one; a table will carry its own. */
  booking: BookingView | null;
};

/** The Lagos date and a short time, from a reservation's instant. */
function lagosDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date(iso));
}

/** British order in every locale: dates are written in English words (`intlTag`). */
function tableWhen(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(at);
}

export function TripSpine({
  bookings,
  reservations = [],
  today,
  locale,
  justBookedId,
}: {
  bookings: BookingView[];
  /** The account's tables, from `getMyReservations`; each one is a trip. */
  reservations?: ReservationView[];
  /** Today in Lagos, resolved by the page so the server and the spine agree. */
  today: string;
  locale: Locale;
  justBookedId?: string;
}) {
  const t = getDictionary(locale);
  const words = t.admin.common.status;
  const copy = t.stays;
  /* The two stay controls this spine was missing say the same words the
     bookings hub says, from the one block, so the same action is never named
     two ways in one product. */
  const bookingCopy = t.catalogue.bookings;

  const stays: TripItem[] = bookings.map((booking) => ({
    id: booking.id,
    kind: "stay",
    on: booking.checkIn,
    cancelled: booking.status === "CANCELLED",
    title: booking.title,
    where: [booking.area, booking.city].filter(Boolean).join(", "),
    when: booking.dateRange,
    meta: booking.totalDisplay,
    href: booking.stayHref,
    photo: booking.photo,
    status: booking.status,
    justBooked: booking.id === justBookedId,
    booking,
  }));

  /* A table sits on the spine at its instant, beside the stays. It opens
     its own thread when one exists, which is where the venue answers. */
  const tables: TripItem[] = reservations.map((reservation) => ({
    id: reservation.id,
    kind: "table",
    on: lagosDate(reservation.reservedFor),
    at: reservation.reservedFor,
    cancelled: reservation.status === "CANCELLED",
    title: reservation.listingTitle,
    where: reservation.location,
    when: tableWhen(reservation.reservedFor),
    meta: plural(reservation.partySize, t.counts.guests, locale),
    href: reservation.conversationId
      ? `/messages/${reservation.conversationId}`
      : reservation.listingId
        ? `/restaurant/${reservation.listingId}`
        : "/restaurants",
    /* The restaurant plate the shelf draws for this venue, so the row's
       thumbnail carries the same picture the card did rather than an empty
       tile; a stand-in, the same one the shelf labels as such. */
    photo: restaurantPlate(reservation.listingId ?? reservation.id),
    status: reservation.status,
    justBooked: reservation.id === justBookedId,
    booking: null,
  }));

  const items: TripItem[] = [...stays, ...tables];

  const spine = buildTripSpine(items, today);
  const tonight = new Set(spine.tonight);

  return (
    <div>
      {spine.upcoming.length > 0 ? (
        <ol className="relative">
          {/* The rule itself, behind the markers, from the first row's marker
              to the last. It draws itself in as the section arrives, using the
              platform's existing keyframe rather than a second one. */}
          <span
            aria-hidden="true"
            className="nf-rule-draw absolute top-lg w-px"
            style={{
              left: "0.5rem",
              bottom: "var(--spacing-lg)",
              height: "auto",
              background:
                "linear-gradient(180deg, transparent 0%, var(--nf-brand-primary) 12%, var(--nf-brand-primary) 88%, transparent 100%)",
            }}
          />
          {spine.upcoming.map((item) => (
            <SpineRow
              key={item.id}
              item={item}
              today={tonight.has(item.id)}
              todayLabel={copy.tripsToday}
              statusWord={words[item.status]}
              payLabel={bookingCopy.payNow}
              reviewLabel={bookingCopy.leaveReview}
            />
          ))}
        </ol>
      ) : (
        <p className={TYPE.rowMeta}>{copy.tripsNothingAhead}</p>
      )}

      {spine.past.length > 0 && (
        <div className="mt-block">
          <Disclosure
            label={copy.tripsPast}
            hint={String(spine.past.length)}
            title={copy.tripsPast}
            data-testid="trips-past"
          >
            <ol>
              {spine.past.map((item) => (
                <SpineRow
                  key={item.id}
                  item={item}
                  today={false}
                  todayLabel={copy.tripsToday}
                  statusWord={words[item.status]}
                  payLabel={bookingCopy.payNow}
                  reviewLabel={bookingCopy.leaveReview}
                  muted
                />
              ))}
            </ol>
          </Disclosure>
        </div>
      )}
    </div>
  );
}

function SpineRow({
  item,
  today,
  todayLabel,
  statusWord,
  muted = false,
  payLabel,
  reviewLabel,
}: {
  item: TripItem;
  today: boolean;
  todayLabel: string;
  statusWord: string;
  muted?: boolean;
  /** "Pay now" and "Leave a review", in the reader's language. */
  payLabel: string;
  reviewLabel: string;
}) {
  return (
    <li className={`relative flex gap-md py-md ${item.justBooked ? "nf-tx-in" : ""}`}>
      {/* The marker on the rule. Filled and ringed for today, hollow for the
          rest: a shape difference, so it survives greyscale. */}
      <span
        aria-hidden="true"
        className="relative z-10 mt-inline flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
        style={{
          boxSizing: "border-box",
          border: `var(--nf-border-width-strong) solid ${
            today ? "var(--nf-brand-primary)" : "var(--nf-border-subtle)"
          }`,
          background: "var(--nf-canvas-base)",
        }}
      >
        {today && (
          <span
            className="nf-confirm-pop block h-2 w-2 rounded-full"
            style={{ background: "var(--nf-brand-primary)" }}
          />
        )}
      </span>

      <div className={`min-w-0 flex-1 ${muted ? "opacity-80" : ""}`}>
      <Link
        href={item.href}
        className="flex min-w-0 gap-md rounded-[var(--nf-container-radius)]"
      >
        <span className={iconPlateClass({ size: "lg", className: "relative overflow-hidden" })}>
          {item.photo ? (
            <Image src={item.photo} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            /* A table has no photograph of its own; the glyph says what
               kind of trip this is rather than leaving a blank tile. */
            <UiIcon name={item.kind === "table" ? "concierge-bell" : "bed"} size={24} />
          )}
        </span>

        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex flex-wrap items-center gap-inline-tight">
            {today && <StatusPill tone="brand">{todayLabel}</StatusPill>}
            {/* The same mapping the booking page uses: a cancelled or no-show trip is
                neutral (a window closed, nothing failed), never the red that
                means it went wrong. A table shares the booking enum. */}
            <StatusChip state={bookingChip(item.status)}>{statusWord}</StatusChip>
          </span>
          <span className={`mt-2xs block ${TYPE.rowTitle}`}>{item.title}</span>
          <span className={`mt-3xs block ${TYPE.rowMeta}`}>
            {item.kind === "table" ? (
              <UiIcon name="utensils" size={ICON.inline} className="mr-inline-tight inline-block" />
            ) : null}
            {item.when}
          </span>
          {item.where && <span className={`mt-3xs block ${TYPE.caption}`}>{item.where}</span>}
        </span>

        <span className="nf-numeric shrink-0 self-center text-right">
          <span className={`block ${TYPE.rowMeta}`}>{item.meta}</span>
        </span>
      </Link>

      {/*
        THE CANCEL CONTROL, OUTSIDE THE LINK AND IN NORMAL FLOW.

        A button inside an anchor is not a button a keyboard or a screen reader
        can reach cleanly, and a tap meant for Cancel that navigates instead is
        the worst possible miss on this row. It sits under the link inside the
        same column, so nothing is positioned by hand and the row grows by the
        height of the control rather than overlapping the next one. It opens
        the SAME sheet /bookings opens.
      */}
      {/*
        THE CONTROLS A STAY CARRIES, AND TWO OF THEM WERE ONLY ON /bookings.

        R3 F-08: the two screens rendered the same stays and neither was
        complete. The date spine could cancel a stay and could not PAY for a
        reserved one or review a finished one, so a guest who came here first
        had to find the other screen to finish the two things that matter
        most. Both are the same guarded facts `/bookings` uses, from the same
        read: `PENDING` means reserved and not paid, and `reviewable` is the
        read's own word for "the database would accept a review now".
      */}
      {item.booking && !muted && (
        <div className="mt-inline flex flex-wrap items-center gap-md pl-[calc(var(--nf-plate-size-lg)+var(--spacing-md))]">
          {item.booking.status === "PENDING" && (
            <Link
              href={`/checkout/${item.booking.id}`}
              className="nf-btn nf-btn--primary nf-btn--sm"
              data-testid="trip-pay"
            >
              {payLabel}
            </Link>
          )}
          {item.booking.reviewable && (
            <Link
              href={`/bookings/${item.booking.id}/review`}
              className="text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
              data-testid="trip-review"
            >
              {reviewLabel}
            </Link>
          )}
          {item.booking.cancellable && <CancelBookingControl booking={item.booking} />}
        </div>
      )}
      </div>
    </li>
  );
}
