"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { clockFor } from "@/lib/host/decide";

/**
 * The clock on one request (C3): the time left in words on a chip, and a
 * thin bar of the window that is left. It ticks every thirty seconds while
 * the page is open, starting from the server's instant so the first paint
 * and the hydrated one agree. The bar moves by transform only, and stands
 * still under reduced motion, Calm and Off (host-desk.css).
 */
export function DecideClock({
  openedAt,
  deadline,
  serverNow,
  bar = false,
}: {
  openedAt: string;
  deadline: string;
  serverNow: number;
  bar?: boolean;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const clock = clockFor(openedAt, deadline, now);
  if (bar) {
    return (
      <div className="nf-clock__bar" data-urgency={clock.urgency} aria-hidden="true">
        <span className="nf-clock__fill" style={{ transform: `scaleX(${clock.left})` }} />
      </div>
    );
  }
  return (
    <span className="nf-clock" data-urgency={clock.urgency} role="timer" aria-live="off">
      <UiIcon name={clock.urgency === "lapsed" ? "hourglass" : "clock"} size={12} />
      {clock.label}
    </span>
  );
}
