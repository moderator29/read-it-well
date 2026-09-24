"use client";

import { useEffect } from "react";
import { readSideCookie, writeSideCookie, type Side } from "@/lib/side.constants";

/**
 * The reconciler, four lines that make a deep link stick.
 *
 * A server component cannot set cookies during render, so when a side's own
 * root (`/stays`, `/trips`, `/restaurants`, `/host`, and their Property twins)
 * forces its shell over the cookie, this writes the cookie back to what the
 * shell is showing. A single listing, stay or restaurant does NOT (UX-04): it
 * is drawn in its side's shell, but the preference stays where the person
 * left it, so one card tap does not turn Settings over. It also keeps
 * the `data-side` attribute on <html> in step with the shell, so anything
 * painted outside the shell's root takes the right accent after a client-side
 * navigation across sides.
 *
 * Renders nothing. Mirrors how `ModeSwitcher` writes `nf_mode` on the client.
 */
export function SideSync({ side, persist = true }: { side: Side; persist?: boolean }) {
  useEffect(() => {
    /* UX-04: a DETAIL page paints its own side but never writes the cookie.
       One tap on a card used to turn Settings, Profile and the supplier
       chooser over to the other side with nothing saying so; only a side's
       own roots (and the explicit switch) move the preference now. */
    if (persist && readSideCookie() !== side) writeSideCookie(side);
    if (side === "stays") document.documentElement.dataset.side = "stays";
    else delete document.documentElement.dataset.side;
  }, [side, persist]);
  return null;
}
