"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { MediaFrame } from "@/components/app/MediaFrame";
import { getDictionary, plural, type Locale } from "@naijafinds/i18n";
import type { Booking } from "@/lib/demo/bookings";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";

/**
 * Bookings status tabs.
 *
 * A segmented control whose shadowed capsule travels between Upcoming, Past
 * and Cancelled. Upcoming and Past render full booking cards
 * built from the catalogue; Cancelled is genuinely empty for this account, so
 * it keeps a carefully finished empty state that routes back into discovery.
 */

type TabKey = "upcoming" | "past" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

const EMPTY_COPY: Record<TabKey, string> = {
  upcoming: "No upcoming trips yet. Your next adventure starts with a search.",
  past: "Stays you have completed will appear here after checkout.",
  cancelled: "Cancelled bookings are kept here so nothing gets lost.",
};

function BookingCard({ booking: b, locale }: { booking: Booking; locale: Locale }) {
  const confirmed = b.status === "confirmed";

  /* Guest and night counts through the dictionary rather than a pair of English
     ternaries. This deck is the signed-out fallback, so it is the FIRST bookings
     screen most people ever see, and it was the one place still writing the
     nouns in English no matter which language the visitor reads. */
  const counts = getDictionary(locale).counts;
  return (
    <li className="nf-card overflow-hidden p-0 text-left">
      <div className="flex gap-4.5 p-3.5 sm:gap-4 sm:p-4">
        <Link
          href={`/listing/${b.listingId}`}
          aria-label={b.title}
          className="relative block h-[5.75rem] w-[5.75rem] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)] sm:h-24 sm:w-32"
        >
          {/* A seventh copy of the card gradient lived here, hard coded to one
              pair rather than the six, so a booking row's fallback did not even
              match the card the booking was made from. */}
          <MediaFrame hue={0} />
          {b.photo && (
            <Image src={b.photo} alt="" fill sizes="128px" className="object-cover" />
          )}
        </Link>

        <div className="min-w-0 flex-1 leading-tight">
          {/* Badge above, title on its own line: see MyBookings for why.
              The tone comes from the platform's single status vocabulary, so a
              completed stay is not neutral on this deck and success on the
              signed-in one. */}
          <StatusPill tone={toneForStatus(confirmed ? "CONFIRMED" : "COMPLETED")}>
            {confirmed ? "Confirmed" : "Completed"}
          </StatusPill>
          <h3 className="mt-1.5 text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
            {b.title}
          </h3>

          {/* Wraps: "Marina Waterfront, Calabar" was one pixel over its column
              and arrived as "Calaba". */}
          <p className="mt-1 flex items-start gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)]">
            <UiIcon name="location" size={12} className="mt-0.5 shrink-0" />
            <span>
              {b.area}, {b.city}
            </span>
          </p>

          <p className="mt-2.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]">
            <UiIcon name="calendar-booking" size={16} className="shrink-0" />
            {b.dateRange}
          </p>

          <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
            <UiIcon name="user" size={16} className="shrink-0" />
            {plural(b.guests, counts.guests, locale)} &middot;{" "}
            {plural(b.nights, counts.nights, locale)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--nf-border-subtle)] px-3.5 py-3 sm:px-4">
        <p className="flex items-baseline gap-1.5">
          <span className="nf-numeric text-[0.9375rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {b.totalDisplay}
          </span>
          <span className="text-[0.75rem] text-[var(--nf-content-muted)]">total</span>
        </p>
        {/* This deck is the signed-out fallback, so nobody reading it has a
            stay of their own to review. It used to offer "Leave a review" on a
            past trip and link to the listing, which was a control that could
            never do what it said. Reviewing lives on a real stay, at
            /bookings/[id]/review, and is offered there. */}
        <Link
          href={`/listing/${b.listingId}`}
          className="nf-tap flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          View details
          <UiIcon name="arrow-right" size={16} />
        </Link>
      </div>
    </li>
  );
}

export function BookingsTabs({
  upcoming,
  past,
  locale,
}: {
  upcoming: Booking[];
  past: Booking[];
  locale: Locale;
}) {
  const [active, setActive] = useState<TabKey>("upcoming");

  const index = TABS.findIndex((t) => t.key === active);
  /* The active key always exists in TABS; the fallback satisfies strict
     indexed access without a non-null assertion. */
  const current = TABS[index] ?? TABS[0]!;

  const bookings =
    current.key === "upcoming" ? upcoming : current.key === "past" ? past : [];

  return (
    <div>
      {/*
        Was a hand-rolled tablist with a 2px underline sliding on a percentage
        transform, which only tracked correctly because all three tabs were
        forced to equal thirds by a grid. The primitive measures the real
        segment boxes instead, so labels of different lengths - and the four
        locales, where the same word can be three times longer - all work, and
        the selection travels as a shadowed capsule rather than a hairline.

        `panelIdPrefix` is deliberately not passed: it would put `aria-controls`
        on all three tabs while only the selected panel is ever rendered, so two
        of the three would point at ids that are not in the document. The panel
        names its tab with `aria-labelledby` instead, which is true whichever
        tab is showing.
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
          className="nf-rise grid gap-4 pt-4"
        >
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} locale={locale} />
          ))}
        </ul>
      ) : (
        <div
          key={current.key}
          role="tabpanel"
          id={`bookings-panel-${current.key}`}
          aria-labelledby={`bookings-tab-${current.key}`}
          className="nf-rise flex flex-col items-center gap-4 py-10 text-center sm:py-14"
        >
          <span className="block h-20 w-20">
            <BrandIcon name="calendar-check" fill />
          </span>
          <p className="mx-auto max-w-[38ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {EMPTY_COPY[current.key]}
          </p>
          <ButtonLink href="/search" variant="primary">
            Explore stays
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
