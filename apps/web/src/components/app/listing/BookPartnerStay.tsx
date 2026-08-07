"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * The Book control on a partner hotel.
 *
 * A plain link would be simpler and it is what this replaced. The reason it is
 * not a link any more is that the price beside it came from a search, and a
 * search is a photograph of what a room cost when it was taken. Between that
 * moment and this tap a guest has read a page and thought about it, and hotel
 * inventory reprices continuously. So the tap asks what the room costs NOW,
 * records that this person went, and only then hands them over.
 *
 * ## It opens the checkout itself rather than being an anchor
 *
 * Which means popup blockers matter. The window is opened SYNCHRONOUSLY inside
 * the click, before any await, because a browser only treats `window.open` as
 * user-initiated while the gesture is still on the stack; opening it after the
 * fetch resolves is the classic way to have every booking silently blocked. The
 * blank tab is then pointed at the real destination once the answer arrives,
 * and closed again if there is no destination to give it.
 *
 * ## A failure is never allowed to stop a booking
 *
 * Nothing here can prevent somebody reaching the checkout. A refused
 * revalidation, a timeout, a rate limit, no session: every one of them falls
 * through to the price we already had and the link we already had. The only
 * thing lost is the extra confidence, which is exactly the right thing to lose,
 * because a hotel that cannot be booked because our own price check was down
 * would be a worse product than one that never checked.
 */

export function BookPartnerStay({
  listingId,
  href,
  label,
}: {
  listingId: string;
  /** The destination the server already built. The fallback, and the default. */
  href: string;
  label: string;
}) {
  const [pending, setPending] = useState(false);
  const [moved, setMoved] = useState(false);

  const go = useCallback(async () => {
    if (pending) return;
    setPending(true);
    setMoved(false);

    // Opened before anything is awaited. See the header.
    const tab = window.open("", "_blank", "noopener,noreferrer");

    let destination = href;
    try {
      const response = await fetch("/api/partner-stay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (response.ok) {
        const body = (await response.json()) as {
          outcome?: string;
          href?: string;
          moved?: boolean;
        };
        if (body.outcome === "ok" && typeof body.href === "string") {
          destination = body.href;
          if (body.moved) setMoved(true);
        }
      }
    } catch {
      // Fall through on the link we already had.
    }

    if (tab) tab.location.href = destination;
    // The popup was blocked, so this tab goes instead. Never leave somebody
    // holding a button that did nothing.
    else window.location.href = destination;

    setPending(false);
  }, [href, listingId, pending]);

  return (
    <>
      <Button
        type="button"
        variant="primary"
        full
        className="mt-4"
        onClick={go}
        disabled={pending}
      >
        {label}
      </Button>
      {/* Shown only when a DIFFERENT price was actually confirmed, never when
          the check simply could not be reached. A warning about a move nobody
          measured would be worse than saying nothing. */}
      {moved && (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]">
          The rate changed since this page loaded. The checkout has the current
          price.
        </p>
      )}
    </>
  );
}
