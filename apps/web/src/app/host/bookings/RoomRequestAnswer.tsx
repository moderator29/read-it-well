"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { acceptRoomRequest, declineRoomRequest } from "@/lib/host/room-booking-actions";

/** Accept or decline one room request. Declining asks for a reason for the guest. */
export function RoomRequestAnswer({ bookingId }: { bookingId: string }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (act: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const result = await act();
      if (!result.ok) setError(result.error ?? "That did not go through.");
      else router.refresh();
    });

  return (
    <div className="mt-xs grid gap-xs" data-testid="room-request-answer">
      {declining ? (
        <>
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
          <div className="flex flex-wrap gap-xs">
            <Button
              variant="secondary"
              size="md"
              loading={pending}
              disabled={pending}
              onClick={() => run(() => declineRoomRequest(bookingId, reason.trim() || undefined))}
            >
              Decline the request
            </Button>
            <Button variant="ghost" size="md" disabled={pending} onClick={() => setDeclining(false)}>
              Keep it
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-xs">
          <Button variant="primary" size="md" loading={pending} disabled={pending} onClick={() => run(() => acceptRoomRequest(bookingId))}>
            Accept
          </Button>
          <Button variant="ghost" size="md" disabled={pending} onClick={() => setDeclining(true)}>
            Decline
          </Button>
        </div>
      )}
      {error && (
        <p className="nf-body text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
