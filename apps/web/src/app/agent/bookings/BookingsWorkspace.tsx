"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, formatDate, type Dictionary, type Locale } from "@naijafinds/i18n";
import { fill } from "../_copy";
import { acceptBooking, declineBooking } from "@/lib/agent/bookings-actions";
import { HOLD_WINDOW_HOURS } from "@/lib/agent/bookings-schema";
import type { BookingStatus, HostBooking, HostBookingBoard } from "@/lib/agent/bookings-queries";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";

/**
 * The host's bookings console: requests that need a decision, plus the stays
 * that decision produced.
 *
 * The board arrives pre-grouped from readHostBookings, in the same four
 * buckets the dictionary already names, so this file only has to render them
 * and wire the two decisions a host can make. Accept and decline both go
 * through the typed ActionResult envelope: a failure renders as one plain
 * sentence, never a code, and a success closes the sheet and refreshes the
 * page so the list comes back from the database.
 */

export type BookingsCopy = Dictionary["agentBookings"];

type TabKey = "requests" | "upcoming" | "completed" | "cancelled";

const TAB_KEYS: TabKey[] = ["requests", "upcoming", "completed", "cancelled"];

/** Date-only ISO strings (check_in/check_out) parsed at noon UTC so no local
    timezone can roll them onto the wrong day. */
function dateOnly(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function durationLabel(t: BookingsCopy, hours: number): string {
  if (hours < 24) {
    return hours === 1 ? t.card.hoursOne : fill(t.card.hours, { count: hours });
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? t.card.daysOne : fill(t.card.days, { count: days });
}

function statusBadgeClass(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "nf-badge nf-badge--warning";
    case "CONFIRMED":
      return "nf-badge nf-badge--success";
    case "CANCELLED":
      return "nf-badge";
  }
}

type SheetState = { kind: "accept" | "decline"; booking: HostBooking };

const SUGGESTION_KEYS = ["taken", "maintenance", "guests"] as const;

function DecisionSheet({
  t,
  state,
  onClose,
}: {
  t: BookingsCopy;
  state: SheetState;
  onClose: () => void;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const copy = state.kind === "accept" ? t.accept : t.decline;

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function run() {
    setError(null);
    setReasonError(null);
    startTransition(async () => {
      const result =
        state.kind === "accept"
          ? await acceptBooking({ bookingId: state.booking.id })
          : await declineBooking({ bookingId: state.booking.id, reason: reason.trim() });

      if (!result.ok) {
        setError(result.error);
        if (result.fieldErrors?.reason) setReasonError(result.fieldErrors.reason);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const declineDisabled = state.kind === "decline" && reason.trim().length === 0;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t.actions.close}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        className="nf-card relative w-full max-w-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] outline-none sm:pb-5"
      >
        <h2 className="nf-h3">{copy.title}</h2>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {copy.body}
        </p>
        <p className="mt-3 truncate text-[0.8125rem] font-semibold">
          {state.booking.guestName} &middot; {state.booking.listingTitle}
        </p>

        {state.kind === "decline" && (
          <div className="mt-4">
            <label
              htmlFor="decline-reason"
              className="mb-1.5 block text-[0.8125rem] font-semibold"
            >
              {t.decline.reasonLabel}
            </label>
            <textarea
              id="decline-reason"
              className="nf-field min-h-[5.5rem] resize-none text-[0.875rem]"
              placeholder={t.decline.reasonPlaceholder}
              value={reason}
              maxLength={240}
              aria-invalid={reasonError ? "true" : undefined}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="mt-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">
              {t.decline.reasonHint}
            </p>
            {reasonError && (
              <p className="mt-1 text-[0.75rem] font-medium text-[var(--nf-state-warning)]">
                {reasonError}
              </p>
            )}

            <p className="mb-2 mt-3 text-[0.75rem] font-medium text-[var(--nf-content-muted)]">
              {t.decline.suggestionsLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="nf-chip !py-1.5 !text-[0.75rem]"
                  onClick={() => setReason(t.decline.suggestions[key])}
                >
                  {t.decline.suggestions[key]}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p
            className="mt-3 rounded-[var(--nf-radius-md)] p-3 text-[0.8125rem] font-medium"
            style={{
              background: "var(--nf-state-warning-surface)",
              color: "var(--nf-state-warning)",
            }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-4">
          <button type="button" className="nf-btn nf-btn--glass flex-1" onClick={onClose}>
            {t.actions.back}
          </button>
          <button
            type="button"
            className="nf-btn nf-btn--primary flex-1"
            onClick={run}
            disabled={pending || declineDisabled}
          >
            {pending ? t.actions.working : copy.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BookingCard({
  t,
  booking,
  locale,
  onDecide,
}: {
  t: BookingsCopy;
  booking: HostBooking;
  locale: Locale;
  onDecide: (kind: "accept" | "decline", booking: HostBooking) => void;
}) {
  const pending = booking.status === "PENDING";

  const nightsLabel = booking.nights === 1 ? t.card.nightsOne : fill(t.card.nights, { count: booking.nights });
  const guestsLabel = booking.guests === 1 ? t.card.guestsOne : fill(t.card.guests, { count: booking.guests });
  const compositionLabel = fill(t.card.composition, {
    adults: booking.adults,
    children: booking.children,
  });

  const waitingLabel =
    booking.hoursWaiting === 0
      ? t.card.waitingNew
      : fill(t.card.waiting, { duration: durationLabel(t, booking.hoursWaiting) });

  const releasesLabel =
    booking.holdHoursLeft === null
      ? null
      : booking.holdHoursLeft > 0
        ? fill(t.card.releasesIn, { duration: durationLabel(t, booking.holdHoursLeft) })
        : fill(t.card.releasingNow, { hours: HOLD_WINDOW_HOURS });

  const settlementLabel =
    booking.settlement === "settled"
      ? t.card.settled
      : booking.settlement === "awaiting"
        ? t.card.awaiting
        : t.card.unknown;

  return (
    <li className="nf-card overflow-hidden p-0">
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[0.9375rem] font-semibold">{booking.guestName}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.8125rem] text-[var(--nf-content-secondary)]">
              <UiIcon name="house" size={12} className="shrink-0" />
              <span className="truncate">{booking.listingTitle}</span>
            </p>
          </div>
          <span className={`${statusBadgeClass(booking.status)} shrink-0`}>
            {t.status[booking.status]}
          </span>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]">
          <UiIcon name="calendar-booking" size={16} className="shrink-0" />
          {fill(t.card.dates, {
            from: formatDate(dateOnly(booking.checkIn), locale, { day: "numeric", month: "short" }),
            to: formatDate(dateOnly(booking.checkOut), locale, { day: "numeric", month: "short" }),
          })}
          <span className="text-[var(--nf-content-muted)]">&middot; {nightsLabel}</span>
        </p>

        <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
          <UiIcon name="user" size={16} className="shrink-0" />
          {guestsLabel}
          <span className="text-[var(--nf-content-muted)]">&middot; {compositionLabel}</span>
        </p>

        {/* Somebody other than the booker is arriving. The host has to know
            this before the gate does: the name above is who paid, and this is
            who will actually be standing at the security post. */}
        {booking.arrivingName && (
          <p
            data-testid="host-booking-arriving"
            className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]"
          >
            <UiIcon name="verified" size={16} className="shrink-0" />
            {fill(t.card.arriving, { name: booking.arrivingName })}
            {booking.arrivingPhone && (
              <span className="nf-numeric text-[var(--nf-content-muted)]">
                {fill(t.card.arrivingPhone, { phone: booking.arrivingPhone })}
              </span>
            )}
          </p>
        )}

        <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(t.card.requested, { date: formatDate(new Date(booking.createdAt), locale) })}
        </p>

        {pending && (
          <p
            className="mt-2 text-[0.75rem] font-semibold"
            style={{ color: "var(--nf-state-warning)" }}
          >
            {waitingLabel}
            {releasesLabel ? ` · ${releasesLabel}` : ""}
          </p>
        )}

        {booking.status !== "CANCELLED" && !pending && (
          <p
            className="mt-2 flex items-center gap-1.5 text-[0.75rem] font-medium"
            style={{
              color:
                booking.settlement === "settled"
                  ? "var(--nf-state-success)"
                  : "var(--nf-content-muted)",
            }}
          >
            <UiIcon name="wallet" size={12} className="shrink-0" />
            {settlementLabel}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--nf-border-subtle)] px-3.5 py-3">
        <p className="flex items-baseline gap-1.5">
          <span className="nf-numeric text-[0.9375rem] font-bold">
            {formatMoney(booking.totalMinor, locale)}
          </span>
          <span className="text-[0.75rem] text-[var(--nf-content-muted)]">{t.card.total}</span>
        </p>
        {pending && (
          <span className="flex items-center gap-3">
            <button
              type="button"
              className="nf-btn nf-btn--glass px-3.5 py-1.5 text-[0.8125rem]"
              onClick={() => onDecide("decline", booking)}
            >
              {t.actions.decline}
            </button>
            <button
              type="button"
              className="nf-btn nf-btn--primary px-3.5 py-1.5 text-[0.8125rem]"
              onClick={() => onDecide("accept", booking)}
            >
              {t.actions.accept}
            </button>
          </span>
        )}
      </div>
    </li>
  );
}

export function BookingsWorkspace({
  t,
  board,
  locale,
}: {
  t: BookingsCopy;
  board: HostBookingBoard;
  locale: Locale;
}) {
  const [active, setActive] = useState<TabKey>("requests");
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const emptyCopy: Record<TabKey, { title: string; body: string }> = {
    requests: {
      title: t.empty.requestsTitle,
      body: fill(t.empty.requestsBody, { hours: HOLD_WINDOW_HOURS }),
    },
    upcoming: { title: t.empty.upcomingTitle, body: t.empty.upcomingBody },
    completed: { title: t.empty.completedTitle, body: t.empty.completedBody },
    cancelled: { title: t.empty.cancelledTitle, body: t.empty.cancelledBody },
  };

  const rows = board[active];
  const groupCopy = t.groups[active];

  return (
    <div>
      {board.requests.length > 0 && (
        <p className="nf-badge nf-badge--warning mb-4 inline-flex">
          {board.requests.length === 1
            ? t.waitingOnOne
            : fill(t.waitingOn, { count: board.requests.length })}
        </p>
      )}

      <div
        role="tablist"
        aria-label={t.tabsLabel}
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`bookings-tab-${key}`}
            aria-selected={active === key}
            aria-controls={`bookings-panel-${key}`}
            onClick={() => setActive(key)}
            className={`nf-chip shrink-0 whitespace-nowrap ${active === key ? "nf-chip--active" : ""}`}
          >
            {t.groups[key].title}
            <span className="nf-numeric">{board[key].length}</span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`bookings-panel-${active}`}
        aria-labelledby={`bookings-tab-${active}`}
        className="mt-4"
      >
        <p className="mb-3 text-[0.8125rem] text-[var(--nf-content-muted)]">
          {fill(groupCopy.blurb, { hours: HOLD_WINDOW_HOURS })}
        </p>

        {rows.length > 0 ? (
          <ul className="space-y-3">
            {rows.map((booking) => (
              <BookingCard
                key={booking.id}
                t={t}
                booking={booking}
                locale={locale}
                onDecide={(kind, target) => setSheet({ kind, booking: target })}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-4 py-10 text-center sm:py-14">
            <span className="block h-20 w-20">
              <BrandIcon name="calendar-check" fill />
            </span>
            <h3 className="nf-h3">{emptyCopy[active].title}</h3>
            <p className="mx-auto max-w-[38ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {emptyCopy[active].body}
            </p>
            <Link href="/agent/listings" className="nf-btn nf-btn--glass">
              {t.empty.openListings}
            </Link>
          </div>
        )}
      </div>

      {sheet && <DecisionSheet t={t} state={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
