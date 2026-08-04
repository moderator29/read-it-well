"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/actions/envelope";
import { blockNights, unblockNights } from "@/lib/agent/calendar-actions";
import { monthGrid, countNights } from "@/lib/agent/calendar-schema";
import type { CalendarNight, CalendarSubject } from "@/lib/agent/calendar-queries";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The host's calendar.
 *
 * Tap a night to start a run, tap a second to finish it, then close or reopen
 * the run. A night with a real booking on it is locked and says so: the
 * bookings loop owns those rows and closing over one would tell a host a guest
 * is not coming when they are.
 *
 * The grid is built from calendar dates in Lagos, never from moments in time,
 * so a host in another timezone still sees their own nights.
 */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_SHOWN = 4;

type Mode = "booked" | "blocked" | "free" | "past";

export function CalendarEditor({
  subject,
  nights,
}: {
  subject: CalendarSubject;
  nights: CalendarNight[];
}) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  const [blockState, blockAction, blocking] = useActionState<
    ActionResult<null> | null,
    FormData
  >(blockNights, null);
  const [openState, openAction, opening] = useActionState<ActionResult<null> | null, FormData>(
    unblockNights,
    null,
  );

  const statusByDate = useMemo(() => {
    const map = new Map<string, "booked" | "unavailable">();
    for (const night of nights) map.set(night.date, night.status);
    return map;
  }, [nights]);

  useEffect(() => {
    if (blockState?.ok || openState?.ok) {
      setAnchor(null);
      setEnd(null);
      router.refresh();
    }
  }, [blockState, openState, router]);

  const months = useMemo(() => {
    const [y, m] = subject.today.split("-").map(Number);
    const out: { year: number; month: number; cells: (string | null)[] }[] = [];
    for (let i = 0; i < MONTHS_SHOWN; i += 1) {
      const d = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1 + i, 1));
      out.push({
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        cells: monthGrid(d.getUTCFullYear(), d.getUTCMonth()),
      });
    }
    return out;
  }, [subject.today]);

  const from = anchor && end ? (anchor <= end ? anchor : end) : anchor;
  const to = anchor && end ? (anchor <= end ? end : anchor) : anchor;

  function modeOf(date: string): Mode {
    if (date < subject.today) return "past";
    const status = statusByDate.get(date);
    if (status === "booked") return "booked";
    if (status === "unavailable") return "blocked";
    return "free";
  }

  function onPick(date: string) {
    if (modeOf(date) === "past" || modeOf(date) === "booked") return;
    if (anchor === null || (anchor !== null && end !== null)) {
      setAnchor(date);
      setEnd(null);
      return;
    }
    setEnd(date);
  }

  const selectedCount = from && to ? countNights(from, to) : 0;
  const error =
    (blockState && !blockState.ok && blockState.error) ||
    (openState && !openState.ok && openState.error) ||
    null;

  return (
    <div>
      <ul className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.75rem] text-[var(--nf-content-muted)]">
        <Key className="bg-[var(--nf-surface-raised)]" label="Open" />
        <Key className="bg-[var(--nf-brand-primary)]" label="Closed by you" />
        <Key className="bg-[var(--nf-state-success)]" label="Booked" />
      </ul>

      <div className="grid gap-6">
        {months.map((month) => (
          <section key={`${month.year}-${month.month}`}>
            <h2 className="nf-overline mb-2 text-[var(--nf-content-muted)]">
              {new Date(Date.UTC(month.year, month.month, 1)).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </h2>
            <div className="grid grid-cols-7 gap-1" role="grid">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="pb-1 text-center text-[0.6875rem] font-medium text-[var(--nf-content-muted)]"
                >
                  {day}
                </span>
              ))}
              {month.cells.map((date, i) => {
                if (date === null) return <span key={`pad-${i}`} aria-hidden="true" />;
                const mode = modeOf(date);
                const inRange = from !== null && to !== null && date >= from && date <= to;
                const day = Number(date.slice(8, 10));
                const disabled = mode === "past" || mode === "booked";
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onPick(date)}
                    disabled={disabled}
                    aria-pressed={inRange}
                    aria-label={`${date}, ${
                      mode === "booked"
                        ? "booked"
                        : mode === "blocked"
                          ? "closed"
                          : mode === "past"
                            ? "past"
                            : "open"
                    }`}
                    className={[
                      "flex h-11 items-center justify-center rounded-[var(--nf-radius-sm)] text-[0.8125rem] font-medium transition-colors",
                      mode === "past" && "cursor-default text-[var(--nf-content-muted)] opacity-35",
                      mode === "booked" &&
                        "cursor-default bg-[var(--nf-state-success)] text-white opacity-90",
                      mode === "blocked" && "bg-[var(--nf-brand-primary)] text-white",
                      mode === "free" &&
                        "bg-[var(--nf-surface-raised)] text-[var(--nf-content-primary)] hover:opacity-80",
                      inRange && "ring-2 ring-[var(--nf-electric-300)]",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* The action bar only appears once a run is chosen, so the surface is
          quiet until there is something to do with it. */}
      {from && to && (
        <div className="nf-card sticky bottom-4 mt-6 p-4">
          <p className="text-[0.875rem] font-medium text-[var(--nf-content-primary)]">
            {selectedCount} {selectedCount === 1 ? "night" : "nights"} selected
          </p>
          <p className="nf-numeric mt-0.5 text-[0.75rem] text-[var(--nf-content-muted)]">
            {from} to {to}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <form action={blockAction}>
              <input type="hidden" name="listingId" value={subject.listingId} />
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
              <button
                type="submit"
                disabled={blocking || opening}
                className="nf-btn nf-btn--primary w-full disabled:opacity-60"
              >
                {blocking ? "Closing..." : "Close these nights"}
              </button>
            </form>
            <form action={openAction}>
              <input type="hidden" name="listingId" value={subject.listingId} />
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
              <button
                type="submit"
                disabled={blocking || opening}
                className="nf-btn nf-btn--glass w-full disabled:opacity-60"
              >
                {opening ? "Reopening..." : "Reopen them"}
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => {
              setAnchor(null);
              setEnd(null);
            }}
            className="mt-2 w-full text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
          >
            Clear selection
          </button>

          {error && (
            <p
              role="alert"
              className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
            >
              {error}
            </p>
          )}
        </div>
      )}

      {!from && (
        <p className="mt-6 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          <UiIcon name="calendar-booking" size={15} className="mt-0.5 shrink-0" />
          Tap a night to start, then tap another to finish the run. A night with
          a booking on it is locked, because a guest is already coming.
        </p>
      )}
    </div>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`block h-3 w-3 rounded-[3px] ${className}`} aria-hidden="true" />
      {label}
    </li>
  );
}
