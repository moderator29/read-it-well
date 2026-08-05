"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Booking } from "@/lib/demo/bookings";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";

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

function BookingCard({ booking: b }: { booking: Booking }) {
  const confirmed = b.status === "confirmed";
  return (
    <li className="nf-card overflow-hidden p-0 text-left">
      <div className="flex gap-4.5 p-3.5 sm:gap-4 sm:p-4">
        <Link
          href={`/listing/${b.listingId}`}
          aria-label={b.title}
          className="relative block h-[5.75rem] w-[5.75rem] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)] sm:h-24 sm:w-32"
          style={{ background: "linear-gradient(150deg, #1E3A8A 0%, #172554 100%)" }}
        >
          {b.photo && (
            <Image src={b.photo} alt="" fill sizes="128px" className="object-cover" />
          )}
        </Link>

        <div className="min-w-0 flex-1 leading-tight">
          {/* Badge above, title on its own line: see MyBookings for why. */}
          <span
            className={`nf-badge ${confirmed ? "nf-badge--approved" : "nf-badge--neutral"}`}
          >
            {confirmed ? "Confirmed" : "Completed"}
          </span>
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
            {b.guests} {b.guests === 1 ? "guest" : "guests"} &middot; {b.nights}{" "}
            {b.nights === 1 ? "night" : "nights"}
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
          className="nf-tap flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
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
}: {
  upcoming: Booking[];
  past: Booking[];
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
      */}
      <Segmented<TabKey>
        label="Booking status"
        options={TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
        value={active}
        onChange={setActive}
        itemIdPrefix="bookings-tab"
        panelIdPrefix="bookings-panel"
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
            <BookingCard key={b.id} booking={b} />
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
