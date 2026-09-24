"use client";

import { useEffect } from "react";
import { FIRST_TOUCH_COOKIE, firstTouchCookie, readFirstTouch } from "@/lib/share/first-touch";

/**
 * V-71: remembers, on this device, the first lister's door it opened, for
 * fourteen days, so an enquiry it later makes is credited to that lister.
 * First touch only: an existing, unexpired memory is never replaced. Draws
 * nothing; holds a token and a time, nothing about the person.
 */
export function RememberDoor({ token }: { token: string }) {
  useEffect(() => {
    try {
      const now = Date.now();
      const current = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${FIRST_TOUCH_COOKIE}=`))
        ?.slice(FIRST_TOUCH_COOKIE.length + 1);
      if (readFirstTouch(current, now)) return;
      document.cookie = firstTouchCookie(token, now, window.location.protocol === "https:");
    } catch {
      /* no cookies: no credit, and nothing else changes */
    }
  }, [token]);
  return null;
}
