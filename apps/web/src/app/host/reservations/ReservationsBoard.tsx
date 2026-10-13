"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markReservationOutcome, respondToReservation } from "@/lib/reservations/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import type { HostReservationView } from "@/lib/reservations/queries";
import type { HostTableBoard } from "./board";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ConfirmPanel } from "@/components/app/confirm/ConfirmPanel";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { countOf, type Locale } from "@vallo/i18n/core";
import { useClientLocale } from "@/lib/i18n/use-client-locale";
import { useHostPageCopy } from "@/components/host/host-copy";

/**
 * The venue's own table board.
 *
 * `private.notify_reservation` has been pointing a business host at
 * `/host/reservations` since M7 and no such route existed, so a restaurant
 * owner could be told a table had been asked for, tap the notification, and
 * land nowhere. This is the surface that notification means.
 *
 * ## The decision goes through the path that already exists
 *
 * `respondToReservation` is the one action that answers a table, and it is the
 * same action `/agent/bookings` calls. It writes through the CALLER'S own
 * client, so `reservations_update_business_host` decides whether this person
 * may answer, the guard `.eq("status", "PENDING")` means two taps write once,
 * and the answer is posted into the reservation's own thread in the venue's
 * voice. The guest's notification is fired by the database trigger on the
 * status change and is untouched by this file. Nothing here is a second
 * decision path, because a second decision path is how two surfaces come to
 * disagree about what a confirmation means.
 *
 * ## The time is pinned to Lagos, never the device
 *
 * The same rule the agent board follows, and for the same reason: a venue
 * reading this on a phone still set to London must see the hour their kitchen
 * will actually serve the table. `Intl` runs identically on both sides of the
 * render, so this is not a client-only formatting.
 *
 * ## Accept is not styled louder than decline
 *
 * Both are real answers and the venue is the one who knows which is true. A
 * board that makes accepting the easy tap and declining a small grey link is a
 * board that produces accepted tables nobody kept.
 */

const LAGOS = "Africa/Lagos";

function whenLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString("en-NG", {
    timeZone: LAGOS,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function partyLabel(size: number, locale: Locale): string {
  return countOf(size, "guests", locale);
}

export function Decision({ table }: { table: HostReservationView }) {
  const reservationId = table.id;
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    respondToReservation,
    null,
  );
  /* Which answer is being confirmed (plan item 22). The forms, their hidden
     fields and `respondToReservation` are exactly what they were; they now
     sit in the confirm panel's foot instead of on the card. */
  const [asking, setAsking] = useState<"CONFIRMED" | "CANCELLED" | null>(null);
  const locale = useClientLocale();
  const w = useHostPageCopy().tables;

  if (state?.ok) {
    return (
      <p className={`mt-row ${TYPE.rowMeta}`}>{w.answered}</p>
    );
  }

  const first = table.guestName.split(" ")[0] || table.guestName;
  const facts = [
    { label: w.guest, value: table.guestName },
    { label: w.when, value: whenLabel(table.reservedFor) },
    { label: w.party, value: partyLabel(table.partySize, locale) },
  ];
  const accept = asking === "CONFIRMED";

  return (
    <>
      <div className="mt-row flex flex-wrap gap-inline">
        <Button variant="primary" disabled={pending} onClick={() => setAsking("CONFIRMED")}>
          {w.accept}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => setAsking("CANCELLED")}>
          {w.decline}
        </Button>
      </div>
      <Sheet
        open={asking !== null}
        onOpenChange={(next) => {
          if (!next && !pending) setAsking(null);
        }}
        title={(accept ? w.acceptTitle : w.declineTitle).replace("{name}", first)}
        hideTitle
        card
        detents={[0.9]}
      >
        {asking ? (
          <ConfirmPanel
            icon={accept ? "utensils" : "circle-x"}
            tone={accept ? "brand" : "error"}
            title={(accept ? w.acceptTitle : w.declineTitle).replace("{name}", first)}
            context={table.listingTitle}
            summary={facts}
            next={
              accept
                ? [{ icon: "calendar-check", text: w.nextBooked }]
                : [{ icon: "calendar-check", text: w.nextClosed }]
            }
            told={w.told.replace("{name}", first)}
            error={state && !state.ok ? state.error : null}
            cancel={
              <Button variant="secondary" disabled={pending} onClick={() => setAsking(null)}>
                {w.cancel}
              </Button>
            }
            primary={
              /* One form per answer, as before, so a decision cannot be
                 changed by a stray Enter key landing on the wrong button. */
              <form action={formAction}>
                <input type="hidden" name="reservationId" value={reservationId} />
                <input type="hidden" name="decision" value={asking} />
                <Button
                  type="submit"
                  variant={accept ? "primary" : "secondary"}
                  disabled={pending}
                  className={accept ? undefined : "text-[var(--nf-state-error)]"}
                >
                  {pending ? w.saving : accept ? w.acceptTable : w.declineTable}
                </Button>
              </form>
            }
          />
        ) : null}
      </Sheet>
      {state && !state.ok && asking === null && (
        <p role="alert" className={`mt-row ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
          {state.error}
        </p>
      )}
    </>
  );
}

/**
 * SEATED OR NOBODY CAME, recorded by the venue once a confirmed table's time
 * has passed. Nothing is charged here: a table is free to ask for and the bill
 * is paid at the restaurant. The mark is what Vallo bills a restaurant on, so
 * it is one deliberate tap each, and it cannot be changed afterwards.
 */
function Outcome({ table }: { table: HostReservationView }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<"COMPLETED" | "NO_SHOW" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const mark = (outcome: "COMPLETED" | "NO_SHOW") =>
    start(async () => {
      setError(null);
      const result = await markReservationOutcome({ reservationId: table.id, outcome });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(outcome);
      router.refresh();
    });

  if (done) {
    return (
      <p className={`mt-row ${TYPE.rowMeta}`} role="status">
        {done === "COMPLETED" ? "Marked as seated." : "Marked as a no-show. The guest is told."}
      </p>
    );
  }
  return (
    <div className="mt-row" data-testid="table-outcome">
      <p className={TYPE.rowMeta}>How did this table go? Mark it once the time has passed.</p>
      <div className="mt-inline flex flex-wrap gap-inline">
        <Button variant="primary" size="sm" disabled={pending} loading={pending} onClick={() => mark("COMPLETED")}>
          Seated
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => mark("NO_SHOW")}>
          No-show
        </Button>
      </div>
      {error && (
        <p role="alert" className={`mt-row ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
          {error}
        </p>
      )}
    </div>
  );
}

function TableCard({
  table,
  decidable,
  markable = false,
}: {
  table: HostReservationView;
  decidable: boolean;
  /** True on the past group: a confirmed table there has had its time. */
  markable?: boolean;
}) {
  const locale = useClientLocale();
  const w = useHostPageCopy().tables;
  const tone =
    table.status === "CONFIRMED" || table.status === "COMPLETED"
      ? "success"
      : table.status === "CANCELLED" || table.status === "NO_SHOW"
        ? "danger"
        : "warning";
  const word =
    table.status === "PENDING"
      ? w.statusWaiting
      : table.status === "CONFIRMED"
        ? w.statusAccepted
        : table.status === "COMPLETED"
          ? "Seated"
          : table.status === "NO_SHOW"
            ? "No-show"
            : w.statusClosed;

  return (
    <li className="nf-panel nf-panel--card block p-card">
      <div className="flex flex-wrap items-center gap-inline">
        <StatusPill tone={tone}>{word}</StatusPill>
        <span className="nf-overline">{table.listingTitle}</span>
      </div>

      <p className={`mt-row ${TYPE.rowTitle}`}>{whenLabel(table.reservedFor)}</p>

      <p className={`mt-inline-tight flex flex-wrap items-center gap-x-group gap-y-inline-tight ${TYPE.rowMeta}`}>
        <span className="inline-flex items-center gap-inline-tight">
          <UiIcon name="user" size={16} aria-hidden />
          {table.guestName}
        </span>
        <span className="nf-numeric">{partyLabel(table.partySize, locale)}</span>
      </p>

      {/* Never truncated. A note is where an allergy goes, and a shortened
          allergy is worse than no allergy at all. */}
      {table.note && (
        <p className={`mt-row rounded-[var(--nf-container-radius)] bg-[var(--nf-surface-raised)] px-row py-inline ${TYPE.rowMeta}`}>
          {table.note}
        </p>
      )}

      {table.conversationId && (
        <Link
          href={`/messages/${table.conversationId}`}
          /* The link ink is set last and on its own, not through `TYPE.rowMeta`:
             both are arbitrary-value utilities of equal specificity, so the one
             that wins is whichever Tailwind emits later rather than whichever
             is written later here, and a link that does not look like a link is
             not a link. */
          className="nf-tap nf-body-sm mt-row inline-flex items-center gap-inline-tight font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          {w.talkTo.replace("{name}", table.guestName)}
          <UiIcon name="arrow-right" size={16} />
        </Link>
      )}

      {decidable && <Decision table={table} />}
      {markable && table.status === "CONFIRMED" && <Outcome table={table} />}
    </li>
  );
}

function Group({
  title,
  empty,
  tables,
  decidable,
  markable = false,
}: {
  title: string;
  empty: string;
  tables: HostReservationView[];
  decidable: boolean;
  markable?: boolean;
}) {
  return (
    <section className="mt-block">
      <h2 className="nf-h4">
        {title}
        {tables.length > 0 && (
          <span className="nf-numeric ml-inline-tight font-normal text-muted">{tables.length}</span>
        )}
      </h2>
      {tables.length === 0 ? (
        <p className={`mt-row ${TYPE.rowMeta}`}>{empty}</p>
      ) : (
        <ul className="mt-row flex flex-col gap-row">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} decidable={decidable} markable={markable} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function HostReservationsBoard({ board }: { board: HostTableBoard }) {
  const w = useHostPageCopy().tables;
  return (
    <>
      <Group
        title={w.groupWaiting}
        empty={w.groupWaitingEmpty}
        tables={board.requests}
        decidable
      />
      <Group
        title={w.groupComing}
        empty={w.groupComingEmpty}
        tables={board.upcoming}
        decidable={false}
      />
      <Group title={w.groupPast} empty={w.groupPastEmpty} tables={board.past} decidable={false} markable />
    </>
  );
}
