"use client";

import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
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
 * `ReservationFace` never imports one. All three now wear one material, the
 * context card of 9E06F51C: a glass object with the mark on the left, the
 * enquiry named, the property under it, and the face's own controls in a row.
 *
 * A listing thread always draws the context card (the rental enquiry, the
 * property, a chevron to it); the inspection face sits under it only when
 * there is a live inspection to answer.
 */
export type ThreadRole = "host" | "guest";

export function ThreadContextBanner({
  context,
  inspection,
  role,
  counterpartName,
  listing,
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
  /** The property the thread is about, for the context card. */
  listing: { id: string; title: string; area: string; city: string } | null;
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

  return (
    <div className="mb-row flex flex-col gap-inline">
      {listing && (
        <Link
          href={`/listing/${listing.id}`}
          className="nf-context-card nf-card--interactive"
          data-testid="thread-context-card"
        >
          <span className="nf-context-card__mark" aria-hidden="true">
            <BrandIcon name="home-search" fill />
          </span>
          <span className="min-w-0 flex-1">
            <span className="nf-context-card__title">Rental enquiry</span>
            <span className="nf-context-card__line">
              <span className="truncate">{listing.title}</span>
              {listing.area && <span>{listing.area}</span>}
            </span>
          </span>
          <UiIcon name="chevron-right" size={20} className="nf-context-card__chev" />
        </Link>
      )}
      {inspection && (
        <RentalFace
          key={`${inspection.id}:${inspection.state}:${inspection.slotAt ?? ""}`}
          inspection={inspection}
          role={role === "host" ? "lister" : "requester"}
          counterpartName={counterpartName}
          copy={copy.rental}
          locale={locale}
          onAccepted={onAccepted}
        />
      )}
    </div>
  );
}
