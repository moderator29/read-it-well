"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Booking } from "@/lib/demo/bookings";

/**
 * Bookings status tabs.
 *
 * A segmented control with an animated underline that slides between
 * Upcoming, Past and Cancelled. Upcoming and Past render full booking cards
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
      <div className="flex gap-3.5 p-3.5 sm:gap-4 sm:p-4">
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
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
              {b.title}
            </h3>
            <span
              className={`nf-badge shrink-0 ${confirmed ? "nf-badge--success" : "nf-badge--brand"}`}
            >
              {confirmed ? "Confirmed" : "Completed"}
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)]">
            <UiIcon name="location" size={13} className="shrink-0" />
            <span className="truncate">
              {b.area}, {b.city}
            </span>
          </p>

          <p className="mt-2.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]">
            <UiIcon name="calendar-booking" size={14} className="shrink-0" />
            {b.dateRange}
          </p>

          <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
            <UiIcon name="user" size={14} className="shrink-0" />
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
        {confirmed ? (
          <Link
            href={`/listing/${b.listingId}`}
            className="flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
          >
            View details
            <UiIcon name="arrow-right" size={14} />
          </Link>
        ) : (
          <Link
            href={`/listing/${b.listingId}`}
            className="nf-btn nf-btn--ghost px-3.5 py-2 text-[0.8125rem]"
          >
            Leave a review
          </Link>
        )}
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const index = TABS.findIndex((t) => t.key === active);
  /* The active key always exists in TABS; the fallback satisfies strict
     indexed access without a non-null assertion. */
  const current = TABS[index] ?? TABS[0]!;

  /* Left and Right arrows move between tabs, the roving focus follows. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : (index - 1 + TABS.length) % TABS.length;
    const target = TABS[next];
    if (!target) return;
    setActive(target.key);
    tabRefs.current[next]?.focus();
  };

  const bookings =
    current.key === "upcoming" ? upcoming : current.key === "past" ? past : [];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Booking status"
        onKeyDown={onKeyDown}
        className="relative grid grid-cols-3 border-b border-[var(--nf-border-subtle)]"
      >
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`bookings-tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls={`bookings-panel-${tab.key}`}
            tabIndex={active === tab.key ? 0 : -1}
            onClick={() => setActive(tab.key)}
            className={[
              "py-2.5 text-[0.875rem] font-medium transition-colors",
              active === tab.key
                ? "text-[var(--nf-content-primary)]"
                : "text-[var(--nf-content-muted)] hover:text-[var(--nf-content-secondary)]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
        <span
          aria-hidden="true"
          className="absolute -bottom-px left-0 h-[2px] w-1/3 rounded-full bg-[var(--nf-brand-primary)] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
      </div>

      {bookings.length > 0 ? (
        <ul
          key={current.key}
          role="tabpanel"
          id={`bookings-panel-${current.key}`}
          aria-labelledby={`bookings-tab-${current.key}`}
          className="nf-rise grid gap-3 pt-4"
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
          <span className="block h-16 w-16">
            <BrandIcon name="calendar-check" fill />
          </span>
          <p className="mx-auto max-w-[38ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {EMPTY_COPY[current.key]}
          </p>
          <Link href="/search" className="nf-btn nf-btn--primary">
            Explore stays
          </Link>
        </div>
      )}
    </div>
  );
}
