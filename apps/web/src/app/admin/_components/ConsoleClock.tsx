"use client";

import { useEffect, useState } from "react";

/**
 * The date and time in the console bar, as the overview render draws it
 * ("Tue, 24 Jun 2025" over "10:24 AM"), in Lagos time because that is the
 * clock every figure on the console is bucketed by. It renders nothing until
 * the browser has mounted, so the server's clock never paints a stale minute.
 */
export function ConsoleClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  if (!now) return <span className="nf-admin-clock" aria-hidden="true" />;
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  return (
    <time className="nf-admin-clock" dateTime={now.toISOString()}>
      <span>{day}</span>
      <span className="nf-admin-clock__time">{time.toUpperCase()}</span>
    </time>
  );
}
