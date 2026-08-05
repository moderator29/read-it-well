"use client";

import { useEffect } from "react";
import { rememberListing } from "@/lib/search/memory";

/**
 * Records that this place was opened. Renders nothing.
 *
 * Recording on the LISTING rather than on the card that was tapped is the
 * whole point: a place reached from a shared link, from a notification, from
 * the assistant or from the back button counts exactly the same as one reached
 * from a search card, and there is one place to be right rather than six.
 *
 * The three fields are handed down from the server render, so a remembered
 * chip carries the title the page actually showed.
 */
export function RecordVisit({
  id,
  title,
  place,
}: {
  id: string;
  title: string;
  place: string;
}) {
  useEffect(() => {
    rememberListing({ id, title, place });
  }, [id, title, place]);

  return null;
}
