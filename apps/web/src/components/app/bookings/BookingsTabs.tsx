"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/design-system/icons/Icon";

/**
 * Bookings status tabs.
 *
 * A segmented control with an animated underline that slides between
 * Upcoming, Past and Cancelled. A new account genuinely has no trips in any
 * of these states, so each panel is an honest, carefully finished empty
 * state that routes the user straight into discovery.
 */

type TabKey = "upcoming" | "past" | "cancelled";

const TABS: { key: TabKey; label: string; copy: string }[] = [
  {
    key: "upcoming",
    label: "Upcoming",
    copy: "No upcoming trips yet. Your next adventure starts with a search.",
  },
  {
    key: "past",
    label: "Past",
    copy: "Stays you have completed will appear here after checkout.",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    copy: "Cancelled bookings are kept here so nothing gets lost.",
  },
];

export function BookingsTabs() {
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

      <div
        key={current.key}
        role="tabpanel"
        id={`bookings-panel-${current.key}`}
        aria-labelledby={`bookings-tab-${current.key}`}
        className="nf-rise flex flex-col items-center gap-4 py-10 text-center sm:py-14"
      >
        <span className="block h-16 w-16">
          <Icon name="booking" fill />
        </span>
        <p className="mx-auto max-w-[38ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {current.copy}
        </p>
        <Link href="/search" className="nf-btn nf-btn--primary">
          Explore stays
        </Link>
      </div>
    </div>
  );
}
