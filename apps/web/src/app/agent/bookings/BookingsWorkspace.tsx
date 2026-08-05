"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatDate, type Dictionary, type Locale } from "@naijafinds/i18n";
import { fill } from "../_copy";
import { acceptBooking, declineBooking } from "@/lib/agent/bookings-actions";
import { HOLD_WINDOW_HOURS } from "@/lib/agent/bookings-schema";
import type { HostBooking, HostBookingBoard } from "@/lib/agent/bookings-queries";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { TextArea } from "@/components/ui/Field";
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const copy = state.kind === "accept" ? t.accept : t.decline;

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

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={copy.title}
      footer={
        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t.actions.back}
          </Button>
          {/* Declining reaches a guest who is waiting on an answer, so it
              confirms as a destructive action rather than behind the same blue
              primary that accepts one. Quiet, because it is a sheet confirm. */}
          <Button
            variant={state.kind === "accept" ? "primary" : "dangerQuiet"}
            className="flex-1"
            onClick={run}
            disabled={declineDisabled}
            loading={pending}
          >
            {copy.confirm}
          </Button>
        </div>
      }
    >
      <p className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {copy.body}
      </p>
      <p className="mt-3 truncate text-[0.8125rem] font-semibold">
        {state.booking.guestName} &middot; {state.booking.listingTitle}
      </p>

      {state.kind === "decline" && (
        <div className="mt-4">
          {/*
            The reason field carried `aria-invalid` and showed nothing for it.
            `.nf-field` paints its border with a border-box gradient, so the
            error rule underneath sets a colour on a surface the gradient
            covers - the field looked identical whether the server had rejected
            it or not. TextArea owns the invalid state, the message, the
            `aria-describedby` wiring and the hint together.
          */}
          <TextArea
            label={t.decline.reasonLabel}
            hint={t.decline.reasonHint}
            error={reasonError ?? undefined}
            placeholder={t.decline.reasonPlaceholder}
            value={reason}
            maxLength={240}
            rows={3}
            textAreaClassName="resize-none"
            onChange={(e) => setReason(e.target.value)}
          />

          <p className="mb-2 mt-3 text-[0.75rem] font-medium text-[var(--nf-content-muted)]">
            {t.decline.suggestionsLabel}
          </p>
          {/*
            The `!py-1.5 !text-[0.75rem]` these carried was somebody forcing a
            chip back down after the box had been inflated to chase a touch
            target. `Chip` keeps its painted height and grows only its hit
            region, so the overrides are gone. Picking one really does select
            it - the reason field now holds that exact text - so the pressed
            state is a fact rather than decoration.
          */}
          <ChipRow bleed={false} fadeEdges={false}>
            {SUGGESTION_KEYS.map((key) => (
              <Chip
                key={key}
                size="sm"
                selected={reason === t.decline.suggestions[key]}
                onSelectedChange={() => setReason(t.decline.suggestions[key])}
              >
                {t.decline.suggestions[key]}
              </Chip>
            ))}
          </ChipRow>
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

    </Sheet>
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
          {/* The CANCELLED branch used to return a bare `.nf-badge`, which
              paints no fill and no colour: the one status a host most needs to
              notice was the one that rendered invisible. */}
          <StatusPill tone={toneForStatus(booking.status)} className="shrink-0">
            {t.status[booking.status]}
          </StatusPill>
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
            <Button variant="secondary" size="sm" onClick={() => onDecide("decline", booking)}>
              {t.actions.decline}
            </Button>
            <Button variant="primary" size="sm" onClick={() => onDecide("accept", booking)}>
              {t.actions.accept}
            </Button>
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
            /*
              Only the active panel is rendered, so pointing every tab at a
              `bookings-panel-<key>` id sent a screen reader following the
              relationship to an element that does not exist. Only the selected
              tab controls anything, so only the selected tab says so.
            */
            aria-controls={active === key ? `bookings-panel-${key}` : undefined}
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
            <ButtonLink href="/agent/listings" variant="secondary">
              {t.empty.openListings}
            </ButtonLink>
          </div>
        )}
      </div>

      {sheet && <DecisionSheet t={t} state={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
