"use client";

import { useEffect } from "react";
import { readSideCookie, writeSideCookie, type Side } from "@/lib/side.constants";

/**
 * The reconciler, four lines that make a deep link stick.
 *
 * A server component cannot set cookies during render, so when a side-owned
 * URL (a shared hotel link, a stays notification tap) forces the Stays shell
 * over a cookie that says Property, this writes the cookie back to what the
 * shell is actually showing. Opening a hotel link lands you in Stays and
 * LEAVES you there, which is what "the app turned over" means. It also keeps
 * the `data-side` attribute on <html> in step with the shell, so anything
 * painted outside the shell's root takes the right accent after a client-side
 * navigation across sides.
 *
 * Renders nothing. Mirrors how `ModeSwitcher` writes `nf_mode` on the client.
 */
export function SideSync({ side }: { side: Side }) {
  useEffect(() => {
    if (readSideCookie() !== side) writeSideCookie(side);
    if (side === "stays") document.documentElement.dataset.side = "stays";
    else delete document.documentElement.dataset.side;
  }, [side]);
  return null;
}
