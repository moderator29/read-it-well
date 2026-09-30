"use client";

import { useEffect } from "react";
import { rememberListing } from "@/lib/search/memory";
import type { CardGlance } from "@/lib/listings/card-glance";

/**
 * Records that this place was opened. Renders nothing.
 *
 * Recording on the LISTING rather than on the card that was tapped is the
 * whole point: a place reached from a shared link, from a notification, from
 * the assistant or from the back button counts exactly the same as one reached
 * from a search card, and there is one place to be right rather than six.
 *
 * The glance is handed down from the server render (`cardGlance`), so a
 * remembered card carries the title, photo and price line the page actually
 * showed (B2: Home's "Looked at recently" row reads it back).
 */
export function RecordVisit({ glance }: { glance: CardGlance }) {
  const { id, title, place, photo, price, priceNote, mark } = glance;
  useEffect(() => {
    rememberListing({ id, title, place, photo, price, priceNote, mark });
  }, [id, title, place, photo, price, priceNote, mark]);

  return null;
}
