"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancel } from "@/lib/bookings/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import { getDictionary, plural, type Locale } from "@vallo/i18n";
import type { BookingGroups, BookingView } from "@/lib/bookings/queries";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { EmptyState, ICON, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";

/**
 * The signed-in trips hub: the user's real bookings from the platform,
 * grouped into Upcoming, Completed and Cancelled, with a confirm sheet on
 * every stay that can still be called off. Cancelling goes through the
 * server action, then the router refreshes so the list re-renders from the
 * database, never from optimistic guesswork.
 */

type TabKey = "upcoming" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

/**
 * The three empty states, each true of the tab it belongs to.
 *
 * A title and a body rather than one orphan sentence, so all three take the
 * same shape as every other empty state on the platform. "Your next adventure
 * starts with a search" went: this is a property marketplace in Nigeria, not a
 * travel brochure, and the sentence said nothing a reader could act on.
 */
const EMPTY_TITLE: Record<TabKey, string> = {
  upcoming: "Nothing booked yet",
  completed: "No completed stays yet",
  cancelled: "Nothing cancelled",
};

const EMPTY_COPY: Record<TabKey, string> = {
  upcoming:
    "When you reserve a place, it appears here with your dates, your total and everything you need on the day.",
  completed:
    "A stay moves here after checkout, and that is where you can leave a review of it.",
  cancelled:
    "Cancelled bookings are kept here so you always have the record, even after the dates have gone.",
};

/*
 * THE LOCAL STATUS MAP IS GONE, AND IT WAS TWO FAULTS AT ONCE.
 *
 * It was `Record<BookingView["status"], string>` holding three hand-written
 * English strings. The colour had already been taken off it, correctly, and
 * routed through `toneForStatus`, which left a map whose only job was to name a
 * status in one of the four languages this platform ships in. On the screen
 * where a guest checks what has happened to a stay they have paid for, three of
 * those four readers got English.
 *
 * Then the lifecycle grew. `booking_status` now carries five values, in the
 * order PENDING, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED, and the map named
 * three of them, so it stopped compiling the moment the type caught up. The
 * temptation there is to add two more English strings, which would fix the
 * build and leave the real fault exactly where it was.
 *
 * `t.admin.common.status` is the platform's one status vocabulary and it
 * already holds all five, translated, in every locale. Reading it means a new
 * status value is a dictionary entry rather than a fourth private copy of the
 * same list, and it means this hub, the agent's board and the console cannot
 * drift into calling one status three different things. It is read through the
 * same `getDictionary(locale)` call this card already makes for its counts, so
 * it costs no extra prop and no client boundary.
 *
 * WHAT IS NOT IDEAL AND IS NOT THIS OWNER'S TO MOVE: the block lives under
 * `admin` in the dictionary while it is read here by a guest. The words
 * themselves are guest-facing - PENDING reads "Requested" - so the naming is
 * wrong rather than the copy. It is written up rather than renamed, because
 * `packages/i18n` belongs to somebody else and a rename touches every locale.
 */

function BookingCard({
  booking: b,
  locale,
  onCancel,
  justBooked,
}: {
  booking: BookingView;
  locale: Locale;
  onCancel: (booking: BookingView) => void;
  /** True for the reservation that just landed here from the listing page,
      so the confirmation moment finishes on this card rather than stopping
      at the listing. */
  justBooked?: boolean;
}) {
  /* The guest and night counts were hand-inflected English inside a product
     that ships in four languages, and the inflection itself only ever had two
     forms. Both now come from the shared `counts` block and pick their category
     through `Intl.PluralRules` for the reader's own locale. */
  const t = getDictionary(locale);
  const counts = t.counts;
  /* All five of `booking_status`, in the reader's language. See the note above
     `BookingCard`'s neighbours: a fifth value is a dictionary entry now, not an
     edit to a private map on this screen. */
  const statusWords = t.admin.common.status;

  return (
    <li
      className={`nf-card overflow-hidden p-0 text-left ${justBooked ? "nf-confirm-sweep nf-just-booked" : ""}`}
    >
      <div className="flex gap-4.5 p-3.5 sm:gap-md sm:p-md">
        <Link
          href={`/listing/${b.listingId}`}
          aria-label={b.title}
          /* Was a hard-coded navy gradient, `#1E3A8A` to `#172554`. That is a
             dark-only treatment: in the light theme it put a near-black tile
             where a photograph should be. A layer-2 surface follows the theme
             and is the right ground for a frame that has not loaded. */
          className="relative block h-[5.75rem] w-[5.75rem] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)] bg-[var(--nf-surface-secondary)] sm:h-24 sm:w-32"
        >
          {b.photo && <Image src={b.photo} alt="" fill sizes="128px" className="object-cover" />}
        </Link>

        <div className="min-w-0 flex-1 leading-tight">
          {/* The badge sits ABOVE the title rather than beside it. Sharing the
              row left the title 90px on a 390px phone, which rendered "Lekki
              Palm Grove Shortlet" as "Lekki Pa". The name of the stay is the
              whole point of the card. */}
          <StatusPill tone={toneForStatus(b.status)}>{statusWords[b.status]}</StatusPill>
          <h3 className={`mt-xs ${TYPE.rowTitle}`}>{b.title}</h3>

          {/* Wraps rather than clipping: "Marina Waterfront, Calabar" was one
              pixel over its column and arrived as "Calaba". */}
          {(b.area || b.city) && (
            <p className={`mt-1.5 flex items-start gap-xs ${TYPE.rowMeta}`}>
              <UiIcon name="location" size={ICON.inline} className="mt-px shrink-0" />
              <span>{[b.area, b.city].filter(Boolean).join(", ")}</span>
            </p>
          )}

          <p className={`mt-sm flex items-center gap-xs ${TYPE.body}`}>
            <UiIcon name="calendar-booking" size={ICON.inline} className="shrink-0" />
            <span className="font-medium">{b.dateRange}</span>
          </p>

          <p className={`mt-1.5 flex items-center gap-xs ${TYPE.body}`}>
            <UiIcon name="user" size={ICON.inline} className="shrink-0" />
            {plural(b.guests, counts.guests, locale)} &middot;{" "}
            {plural(b.nights, counts.nights, locale)}
          </p>

          {/* Booked for somebody else. The payer needs to see who they named,
              because it decides where the arrival details land, and a number
              they typed a month ago is worth being able to check. */}
          {b.arrivingName && (
            <p
              data-testid="booking-arriving"
              className="mt-1.5 text-[var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]"
            >
              Arriving: {b.arrivingName}
              {b.arrivingPhone && (
                <>
                  {" "}
                  &middot; <span className="nf-numeric">{b.arrivingPhone}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-sm border-t border-[var(--nf-border-subtle)] px-3.5 py-sm sm:px-md">
        <p className="flex items-baseline gap-1.5">
          <span className="nf-numeric text-[var(--nf-text-body-sm)] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {b.totalDisplay}
          </span>
          <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">total</span>
        </p>
        <span className="flex items-center gap-md">
          {/* A PENDING stay is reserved, not paid. Until this link existed the
              guest had nowhere to complete it, which is exactly the gap
              checkout closes. */}
          {b.status === "PENDING" && (
            <ButtonLink href={`/checkout/${b.id}`} variant="primary" size="sm">
              Pay now
            </ButtonLink>
          )}
          {b.cancellable && (
            <button
              type="button"
              onClick={() => onCancel(b)}
              className="text-[var(--nf-text-caption)] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              Cancel
            </button>
          )}
          {/* A finished stay is the only place a review can be written, and the
              control only appears when the database would actually accept one.
              Once written, it becomes a way back to what they said rather than
              an invitation to say it twice. */}
          {b.reviewable && (
            <Link
              href={`/bookings/${b.id}/review`}
              className="nf-btn nf-btn--primary px-sm py-1.5 text-[var(--nf-text-caption)]"
            >
              Leave a review
            </Link>
          )}
          {b.reviewed && (
            <Link
              href={`/bookings/${b.id}/review`}
              className="flex items-center gap-2xs text-[var(--nf-text-caption)] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
              Your review
            </Link>
          )}
          <Link
            href={`/listing/${b.listingId}`}
            className="flex items-center gap-2xs text-[var(--nf-text-caption)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
          >
            View details
            <UiIcon name="arrow-right" size={16} />
          </Link>
        </span>
      </div>
    </li>
  );
}

/**
 * Confirm sheet for cancelling a stay. `<Sheet>` owns the portal, the drag
 * handle, the detents, the focus trap, focus restoration, Escape, the backdrop
 * and the body scroll lock. What is left here is the decision: the server
 * action, the refusal, and the success state. On success the router refreshes
 * and the server-rendered list becomes the single source of truth.
 */
function CancelSheet({ booking, onClose }: { booking: BookingView; onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    cancel,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const cancelled = Boolean(state?.ok);

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Cancel this booking?"
      /* The success state speaks for itself, exactly as before; the title stays
         on as the sheet's accessible name. */
      hideTitle={cancelled}
      footer={
        cancelled ? (
          <Button variant="primary" full onClick={onClose}>
            Done
          </Button>
        ) : (
          <form action={formAction} className="grid gap-sm">
            <input type="hidden" name="bookingId" value={booking.id} />
            <Button type="submit" variant="primary" full loading={pending}>
              Yes, cancel the booking
            </Button>
            <Button variant="secondary" full onClick={onClose}>
              Keep my booking
            </Button>
          </form>
        )
      }
    >
      {cancelled ? (
        <div className="text-center">
          <p className="flex items-center justify-center gap-xs text-[var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
            <UiIcon name="verified" size={20} className="text-[var(--nf-state-success)]" />
            Booking cancelled
          </p>
          <p className="mt-xs text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {booking.title} for {booking.dateRange} is cancelled. The dates are free again.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {booking.title}, {booking.dateRange}. This releases your dates and cannot be
            undone.
          </p>

          {state && !state.ok && (
            /* A cancellation that was refused is a failure, and it was drawn
               in the pending colour on a neutral surface, which is the same
               defect the wallet's own banner had. */
            <p
              role="alert"
              className="mt-row rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] bg-[var(--nf-state-error-surface)] p-row text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]"
            >
              {state.error}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

export function MyBookings({
  groups,
  locale,
  justBookedId,
}: {
  groups: BookingGroups;
  locale: Locale;
  /** Id of a reservation that just landed here from the listing page's
      confirmation moment, carried across the navigation as `?justBooked=`. */
  justBookedId?: string;
}) {
  const [active, setActive] = useState<TabKey>("upcoming");
  const [cancelling, setCancelling] = useState<BookingView | null>(null);

  const index = TABS.findIndex((t) => t.key === active);
  const current = TABS[index] ?? TABS[0]!;

  const bookings = groups[current.key];

  return (
    <div>
      {/*
        Was a hand-rolled tablist: three equal columns with a 2px underline slid
        by `translateX(index * 100%)`, which only tracked because the grid forced
        every label to exactly a third. The primitive measures the real segment
        boxes, so the four locales - where "Cancelled" can be three times longer
        than "Past" - all land correctly, and it owns the roving tabindex and the
        arrow keys that were re-derived here.

        No `panelIdPrefix`, deliberately. It would put `aria-controls` on ALL
        THREE tabs, but only the selected panel is ever rendered, so two of the
        three pointed at ids that are not in the document - a dangling reference
        a screen reader follows into nothing. The association is stated the one
        way that is always true: the live panel names its own tab with
        `aria-labelledby`.
      */}
      <Segmented<TabKey>
        label="Booking status"
        options={TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
        value={active}
        onChange={setActive}
        itemIdPrefix="bookings-tab"
        full
      />

      {bookings.length > 0 ? (
        <ul
          key={current.key}
          role="tabpanel"
          id={`bookings-panel-${current.key}`}
          aria-labelledby={`bookings-tab-${current.key}`}
          className="nf-rise grid gap-md pt-md"
        >
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              locale={locale}
              onCancel={setCancelling}
              justBooked={b.id === justBookedId}
            />
          ))}
        </ul>
      ) : (
        <div
          key={current.key}
          role="tabpanel"
          id={`bookings-panel-${current.key}`}
          aria-labelledby={`bookings-tab-${current.key}`}
          className="nf-rise"
        >
          <EmptyState
            icon="calendar-check"
            title={EMPTY_TITLE[current.key]}
            body={EMPTY_COPY[current.key]}
            action={
              /* Never a dead end: the two tabs that are empty because nothing
                 has happened YET point at the thing that would make something
                 happen. Cancelled is empty because nothing went wrong, which is
                 good news and needs no call to action. */
              current.key === "cancelled" ? undefined : (
                /* Through `EmptyActions` like every other empty state on the
                   platform: stacked and full width. It was an intrinsic-width
                   button in a centred column, which is the third of the three
                   treatments F2-073 counted and reads at 390px as a chip
                   somebody forgot to style. */
                <EmptyActions primary={{ label: "Find a place", href: "/search" }} />
              )
            }
            data-testid={`bookings-empty-${current.key}`}
          />
        </div>
      )}

      {cancelling && <CancelSheet booking={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}
