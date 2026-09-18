import Link from "next/link";
import Image from "next/image";
import { getDictionary, type Locale } from "@vallo/i18n";
import { Disclosure } from "@/components/app/Disclosure";
import { ICON, TYPE } from "@/components/app/Screen";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { BookingView } from "@/lib/bookings/queries";
import { CancelBookingControl } from "@/components/app/bookings/CancelBookingSheet";
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
 * A RESERVATION IS A TRIP AND IS NOT READ YET. `trip-spine.ts` already takes
 * both kinds and orders them together; `lib/reservations` has actions and a
 * schema but no read of a person's own tables, so today the spine carries
 * stays. The seam is in the page file, named there.
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

export function TripSpine({
  bookings,
  today,
  locale,
  justBookedId,
}: {
  bookings: BookingView[];
  /** Today in Lagos, resolved by the page so the server and the spine agree. */
  today: string;
  locale: Locale;
  justBookedId?: string;
}) {
  const t = getDictionary(locale);
  const words = t.admin.common.status;
  const copy = t.stays;

  const items: TripItem[] = bookings.map((booking) => ({
    id: booking.id,
    kind: "stay",
    on: booking.checkIn,
    cancelled: booking.status === "CANCELLED",
    title: booking.title,
    where: [booking.area, booking.city].filter(Boolean).join(", "),
    when: booking.dateRange,
    meta: booking.totalDisplay,
    href: `/listing/${booking.listingId}`,
    photo: booking.photo,
    status: booking.status,
    justBooked: booking.id === justBookedId,
    booking,
  }));

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
}: {
  item: TripItem;
  today: boolean;
  todayLabel: string;
  statusWord: string;
  muted?: boolean;
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
        className="flex min-w-0 gap-md rounded-[var(--nf-radius-lg)] transition-colors hover:bg-[var(--nf-glass-fill)]"
      >
        <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-[var(--nf-radius-md)] bg-[var(--nf-surface-secondary)]">
          {item.photo && <Image src={item.photo} alt="" fill sizes="64px" className="object-cover" />}
        </span>

        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex flex-wrap items-center gap-inline-tight">
            {today && <StatusPill tone="brand">{todayLabel}</StatusPill>}
            <StatusPill tone={toneForStatus(item.status)}>{statusWord}</StatusPill>
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
      {item.booking?.cancellable && !muted && (
        <div className="mt-inline pl-[calc(4rem+var(--spacing-md))]">
          <CancelBookingControl booking={item.booking} />
        </div>
      )}
      </div>
    </li>
  );
}
