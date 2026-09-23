"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, plural, type Dictionary, type Locale } from "@vallo/i18n";
import type { BookingGroups, BookingView } from "@/lib/bookings/queries";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
/* ONE cancel flow for the whole platform. It lived here as a private
   function while /bookings was the only screen listing a stay; /trips lists
   the same stays on its date spine and needs the same control, and two copies
   of a sheet that releases somebody's dates is how one of them drifts. */
import { CancelBookingSheet } from "@/components/app/bookings/CancelBookingSheet";
import { TenancyCard } from "@/components/app/bookings/TenancyCard";
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

type BookingsCopy = Dictionary["catalogue"]["bookings"];

/**
 * The tabs, and the three empty states, each true of the tab it belongs to.
 *
 * A title and a body rather than one orphan sentence, so all three take the
 * same shape as every other empty state on the platform. "Your next adventure
 * starts with a search" went: this is a property marketplace in Nigeria, not a
 * travel brochure, and the sentence said nothing a reader could act on.
 *
 * THE WORDS WERE ENGLISH LITERALS IN THIS FILE and are dictionary entries now
 * (`catalogue.bookings`, all four locales). Three of the four languages this
 * platform ships in were reading the record of their own paid stays in
 * English, on the screen where somebody checks what happened to money they
 * have already sent.
 */
function tabs(copy: BookingsCopy): { key: TabKey; label: string }[] {
  return [
    { key: "upcoming", label: copy.upcoming },
    { key: "completed", label: copy.completed },
    { key: "cancelled", label: copy.cancelled },
  ];
}

function emptyTitle(copy: BookingsCopy, key: TabKey): string {
  return key === "upcoming"
    ? copy.emptyUpcomingTitle
    : key === "completed"
      ? copy.emptyCompletedTitle
      : copy.emptyCancelledTitle;
}

function emptyBody(copy: BookingsCopy, key: TabKey): string {
  return key === "upcoming"
    ? copy.emptyUpcomingBody
    : key === "completed"
      ? copy.emptyCompletedBody
      : copy.emptyCancelledBody;
}

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
  const copy = t.catalogue.bookings;

  return (
    <li
      className={`nf-panel nf-panel--card block overflow-hidden p-0 text-left ${justBooked ? "nf-confirm-sweep nf-just-booked" : ""}`}
    >
      <div className="flex gap-md p-md sm:gap-md sm:p-md">
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
            <p className={`mt-2xs flex items-start gap-xs ${TYPE.rowMeta}`}>
              <UiIcon name="location" size={ICON.inline} className="mt-px shrink-0" />
              <span>{[b.area, b.city].filter(Boolean).join(", ")}</span>
            </p>
          )}

          <p className={`mt-sm flex items-center gap-xs ${TYPE.body}`}>
            <UiIcon name="calendar-booking" size={ICON.inline} className="shrink-0" />
            <span className="font-medium">{b.dateRange}</span>
          </p>

          <p className={`mt-2xs flex items-center gap-xs ${TYPE.body}`}>
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
              className="mt-2xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]"
            >
              {copy.arriving.replace("{name}", b.arrivingName)}
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

      <div className="flex items-center justify-between gap-sm border-t border-[var(--nf-border-subtle)] px-md py-sm sm:px-md">
        <p className="flex items-baseline gap-2xs">
          <span className="nf-numeric text-[length:var(--nf-text-body-sm)] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {b.totalDisplay}
          </span>
          <span className="text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {copy.total}
          </span>
        </p>
        <span className="flex items-center gap-md">
          {/* A PENDING stay is reserved, not paid. Until this link existed the
              guest had nowhere to complete it, which is exactly the gap
              checkout closes. */}
          {b.status === "PENDING" && (
            <ButtonLink href={`/checkout/${b.id}`} variant="primary" size="sm">
              {copy.payNow}
            </ButtonLink>
          )}
          {b.cancellable && (
            <button
              type="button"
              onClick={() => onCancel(b)}
              className="text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              {copy.cancel}
            </button>
          )}
          {/* A finished stay is the only place a review can be written, and the
              control only appears when the database would actually accept one.
              Once written, it becomes a way back to what they said rather than
              an invitation to say it twice. */}
          {b.reviewable && (
            <ButtonLink href={`/bookings/${b.id}/review`} variant="primary" size="sm">
              {copy.leaveReview}
            </ButtonLink>
          )}
          {b.reviewed && (
            <Link
              href={`/bookings/${b.id}/review`}
              className="flex items-center gap-2xs text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
              {copy.yourReview}
            </Link>
          )}
          <Link
            href={`/listing/${b.listingId}`}
            className="flex items-center gap-2xs text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
          >
            {copy.viewDetails}
            <UiIcon name="arrow-right" size={16} />
          </Link>
        </span>
      </div>
    </li>
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
  const dictionary = getDictionary(locale);
  const tenancyCopy = dictionary.catalogue.tenancy;
  const copy = dictionary.catalogue.bookings;
  const TABS = tabs(copy);

  const index = TABS.findIndex((t) => t.key === active);
  const current = TABS[index] ?? TABS[0]!;

  const bookings = groups[current.key];

  return (
    <div>
      {/*
        THE TENANCIES SIT BESIDE THE STAY TABS, NOT INSIDE THEM.

        A fourth segment was the other option and it is the wrong one twice
        over. The control is labelled "Booking status" and its three segments
        are statuses; a tenancy is a KIND of thing, so it would be the one
        segment in the row answering a different question. And a tab hides
        what is not selected: an unpaid rent charge is the most urgent thing
        this screen can carry, and it was invisible here until today, so it is
        not put back behind a tab somebody has to guess at.

        It renders only when the account has one. Nobody who books hotels ever
        sees this section, and nothing is invented to fill it.
      */}
      {groups.rent.length > 0 && (
        <section className="mb-block" data-testid="tenancy-section">
          <h2 className="nf-group-label">{tenancyCopy.section}</h2>
          <p className={`mb-row ${TYPE.rowMeta}`}>{tenancyCopy.sectionLine}</p>
          <ul className="grid gap-md">
            {groups.rent.map((tenancy) => (
              <TenancyCard key={tenancy.id} tenancy={tenancy} locale={locale} />
            ))}
          </ul>
        </section>
      )}

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
        label={copy.statusLabel}
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
            title={emptyTitle(copy, current.key)}
            body={emptyBody(copy, current.key)}
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
                <EmptyActions primary={{ label: copy.findPlace, href: "/search" }} />
              )
            }
            data-testid={`bookings-empty-${current.key}`}
          />
        </div>
      )}

      {cancelling && (
        <CancelBookingSheet booking={cancelling} onClose={() => setCancelling(null)} />
      )}
    </div>
  );
}
