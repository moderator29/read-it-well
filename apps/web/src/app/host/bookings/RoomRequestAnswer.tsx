"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ConfirmPanel } from "@/components/app/confirm/ConfirmPanel";
import { acceptRoomRequest, declineRoomRequest } from "@/lib/host/room-booking-actions";
import { bookingAcceptedPreview } from "@/lib/email/everyone-gets";
import { PAYOUT_ANSWER } from "@/lib/money/copy";

/** What the confirm panel names: the request as the row already shows it. */
export type RoomRequestSummary = {
  guestName: string;
  room: string;
  hotel: string;
  /** "Sat 4 Oct to Mon 6 Oct", as the row prints it. */
  dates: string;
  /** "2 nights · 2 guests". */
  stay: string;
  /** The total, formatted. */
  total: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalMinor: number;
};

/* The first sentence of the payout answer: where the host's share goes. */
const PAID_STRAIGHT = PAYOUT_ANSWER.split(". ")[0] + ".";

/**
 * Accept or decline one room request, each confirmed in the one confirm
 * panel (plan item 22). The actions, their validation and their messages are
 * exactly what they were: `acceptRoomRequest` and `declineRoomRequest`, the
 * optional reason for the guest capped at 500 characters. What changed is
 * that neither fires from the row any more; each opens the panel, which says
 * what is being answered, what happens next and what the guest receives.
 */
export function RoomRequestAnswer({ bookingId, summary }: { bookingId: string; summary: RoomRequestSummary }) {
  const [open, setOpen] = useState<"accept" | "decline" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (act: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const result = await act();
      if (!result.ok) setError(result.error ?? "That did not go through.");
      else {
        setOpen(null);
        router.refresh();
      }
    });

  const first = summary.guestName.split(" ")[0] || summary.guestName;
  /* Accepting moves the booking to CONFIRMED, which the database tells the
     guest in the app (`private.notify_booking_change`). No email is sent from
     this action, so the preview keeps the app message and drops the email. */
  const everyone = bookingAcceptedPreview({
    guestName: summary.guestName,
    listingTitle: summary.listingTitle,
    checkIn: summary.checkIn,
    checkOut: summary.checkOut,
    nights: summary.nights,
    totalMinor: summary.totalMinor,
  })
    .filter((card) => card.push)
    .map((card) => ({ ...card, email: null, channel: "App" as const }));

  const facts = [
    { label: "Guest", value: summary.guestName },
    { label: "Dates", value: summary.dates },
    { label: "Room", value: summary.room },
  ];

  return (
    <div className="mt-xs grid gap-xs" data-testid="room-request-answer">
      <div className="flex flex-wrap gap-xs">
        <Button variant="primary" size="md" disabled={pending} onClick={() => setOpen("accept")}>
          Accept
        </Button>
        <Button variant="secondary" size="md" disabled={pending} onClick={() => setOpen("decline")}>
          Decline
        </Button>
      </div>

      <Sheet
        open={open !== null}
        onOpenChange={(next) => {
          if (!next && !pending) {
            setOpen(null);
            setError(null);
          }
        }}
        title={open === "decline" ? `Decline ${first}'s request?` : `Accept ${first}'s booking?`}
        hideTitle
        card
        detents={[0.9]}
      >
        {open === "accept" ? (
          <ConfirmPanel
            icon="bed"
            title={`Accept ${first}'s booking?`}
            context={`${summary.room} at ${summary.hotel} · ${summary.stay}`}
            summary={facts}
            total={{ label: "Total the guest pays", amount: summary.total }}
            reassurance={PAID_STRAIGHT}
            next={[
              { icon: "file-text", text: "The stay agreement is drawn up for you and the guest to confirm." },
              { icon: "shield-check", text: "Vallo checks the agreement." },
              { icon: "credit-card", text: "The guest pays by card once it is approved." },
            ]}
            everyone={everyone}
            told={`${first} is told at once.`}
            error={error}
            cancel={
              <Button variant="secondary" size="md" disabled={pending} onClick={() => setOpen(null)}>
                Cancel
              </Button>
            }
            primary={
              <Button
                variant="primary"
                size="md"
                loading={pending}
                disabled={pending}
                onClick={() => run(() => acceptRoomRequest(bookingId))}
              >
                Accept booking
              </Button>
            }
          />
        ) : open === "decline" ? (
          <ConfirmPanel
            icon="circle-x"
            tone="error"
            title={`Decline ${first}'s request?`}
            context={`${summary.room} at ${summary.hotel} · ${summary.stay}`}
            summary={facts}
            next={[{ icon: "calendar-check", text: "The nights go back on sale at once." }]}
            told={`${first} is told at once.`}
            error={error}
            cancel={
              <Button variant="secondary" size="md" disabled={pending} onClick={() => setOpen(null)}>
                Keep it
              </Button>
            }
            primary={
              <Button
                variant="secondary"
                size="md"
                loading={pending}
                disabled={pending}
                className="text-[var(--nf-state-error)]"
                onClick={() => run(() => declineRoomRequest(bookingId, reason.trim() || undefined))}
              >
                Decline the request
              </Button>
            }
          >
            <label className="grid gap-2xs">
              <span className="nf-caption">Tell the guest why (optional)</span>
              <textarea
                className="nf-input"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={pending}
              />
            </label>
          </ConfirmPanel>
        ) : null}
      </Sheet>
    </div>
  );
}
