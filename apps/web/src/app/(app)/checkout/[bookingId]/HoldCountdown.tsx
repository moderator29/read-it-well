"use client";

import { useEffect, useState } from "react";
import { BrandIcon } from "@/design-system/icons/BrandIcon";

/**
 * The hold clock.
 *
 * A PENDING booking holds its nights for 48 hours and then the scheduled
 * release cancels it, so the guest is entitled to know how long they have. The
 * expiry instant is computed on the server from the booking's own created_at,
 * and this component only counts down towards it: nothing here invents a
 * deadline, and when the clock runs out it says so plainly rather than sitting
 * at zero pretending.
 */

function remaining(target: number, now: number): { h: number; m: number; s: number } | null {
  const ms = target - now;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1_000);
  return {
    h: Math.floor(total / 3_600),
    m: Math.floor((total % 3_600) / 60),
    s: total % 60,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const target = Date.parse(expiresAt);
  // First paint matches the server: no clock reading during hydration, so the
  // markup cannot disagree with itself.
  const [left, setLeft] = useState<{ h: number; m: number; s: number } | null | "pending">(
    "pending",
  );

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const tick = () => setLeft(remaining(target, Date.now()));
    tick();
    const timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, [target]);

  if (Number.isNaN(target)) return null;

  const expired = left === null;

  return (
    <div className="nf-panel-sunken flex items-center gap-3.5">
      <span className="block h-11 w-11 shrink-0">
        <BrandIcon name="calendar-clock" fill />
      </span>
      <div className="min-w-0 flex-1">
        <p className="nf-overline text-[var(--nf-content-muted)]">
          {expired ? "Hold has run out" : "Your dates are held for"}
        </p>
        {left === "pending" ? (
          <p
            className="nf-numeric mt-0.5 text-[1.125rem] font-bold tracking-tight text-[var(--nf-content-primary)]"
            aria-hidden="true"
          >
            &nbsp;
          </p>
        ) : expired ? (
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            These dates are no longer held. Paying now may not succeed, so check the stay is still
            open before you try.
          </p>
        ) : (
          <p
            aria-live="off"
            className="nf-numeric mt-0.5 text-[1.125rem] font-bold tracking-tight text-[var(--nf-content-primary)]"
          >
            {left.h}h {pad(left.m)}m {pad(left.s)}s
          </p>
        )}
      </div>
    </div>
  );
}
