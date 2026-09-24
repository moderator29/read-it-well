"use client";

import { useEffect } from "react";
import { FIRST_TOUCH_COOKIE, firstTouchCookie, withFirstTouch } from "@/lib/share/first-touch";

/**
 * V-71: remembers, on this device, the first lister's door it opened FOR THIS
 * LISTING, for fourteen days, so an enquiry it later makes about the listing
 * is credited to that lister. First touch per listing: an existing, unexpired
 * memory for the listing is never replaced. Draws nothing; holds listing ids,
 * door tokens and times, nothing about the person.
 */
export function RememberDoor({ token, listingId }: { token: string; listingId: string }) {
  useEffect(() => {
    try {
      const current = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${FIRST_TOUCH_COOKIE}=`))
        ?.slice(FIRST_TOUCH_COOKIE.length + 1);
      const next = withFirstTouch(current, listingId, token, Date.now());
      if (next === null) return;
      document.cookie = firstTouchCookie(next, window.location.protocol === "https:");
    } catch {
      /* no cookies: no credit, and nothing else changes */
    }
  }, [token, listingId]);
  return null;
}
