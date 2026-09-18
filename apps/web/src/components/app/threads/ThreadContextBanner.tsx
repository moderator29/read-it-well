"use client";

import type { Dictionary, Locale } from "@vallo/i18n";
import type { Inspection } from "@/lib/inspections/types";
import type { ThreadContext } from "@/lib/messages/live";
import { BookingFace } from "./BookingFace";
import { RentalFace } from "./RentalFace";
import { ReservationFace } from "./ReservationFace";

/**
 * THE ONE FORK POINT IN A THREAD.
 *
 * Rendered between the header and the scroll column. Everything else in
 * `ThreadView` (bubbles, composer, optimistic send, realtime, attachments,
 * the safety line) is shared by every kind of conversation; this slot is the
 * only place the kind of thing the chat is FOR changes what is drawn.
 *
 * Three faces, three files, and the separation is structural rather than a
 * flag: a reservation thread cannot grow an inspection button because
 * `ReservationFace` never imports one. A listing thread with no live
 * inspection draws nothing here at all, because there is nothing to say.
 */
export type ThreadRole = "host" | "guest";

export function ThreadContextBanner({
  context,
  inspection,
  role,
  counterpartName,
  copy,
  locale,
  onAccepted,
}: {
  context: ThreadContext;
  /** The live inspection on a listing thread, resolved server-side. */
  inspection: Inspection | null;
  /** Host is the lister, the restaurant or the property; guest is the other side. */
  role: ThreadRole;
  counterpartName: string;
  copy: Dictionary["threads"];
  locale: Locale;
  onAccepted: () => void;
}) {
  if (context.kind === "reservation") {
    if (!context.reservation) return null;
    return (
      <ReservationFace
        reservation={context.reservation}
        viewerIsGuest={role === "guest"}
        copy={copy.reservation}
        locale={locale}
      />
    );
  }

  if (context.kind === "booking") {
    if (!context.booking) return null;
    return (
      <BookingFace
        booking={context.booking}
        stateEvents={context.stateEvents ?? []}
        copy={copy.booking}
        locale={locale}
      />
    );
  }

  if (!inspection) return null;
  return (
    <RentalFace
      key={`${inspection.id}:${inspection.state}:${inspection.slotAt ?? ""}`}
      inspection={inspection}
      role={role === "host" ? "lister" : "requester"}
      counterpartName={counterpartName}
      copy={copy.rental}
      locale={locale}
      onAccepted={onAccepted}
    />
  );
}
