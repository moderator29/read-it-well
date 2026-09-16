"use client";

import { useEffect, useState } from "react";
import { formatDate, type Locale } from "@vallo/i18n";
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
 *
 * ---------------------------------------------------------------------------
 * IT USED TO TICK SECONDS FOR FORTY-EIGHT HOURS, BESIDE A PAY BUTTON.
 *
 * `{left.h}h {pad(left.m)}m {pad(left.s)}s`, re-rendered every second, over a
 * two-day window, directly above the control that takes the largest sum most
 * people will move on this platform. Nobody needs second precision over two
 * days. What a running clock does at that distance from the deadline is
 * manufacture urgency, and an urgency counter next to a pay button is a
 * pressure device rather than information. Rule 14 bans exactly this.
 *
 * So the deadline is stated as a deadline while it is far away, which is also
 * the more useful fact: "Held until Thursday 14:20" is something a person can
 * plan around, and "41h 12m 07s" is not. The live countdown returns under one
 * hour, where the seconds genuinely are the news and where somebody is deciding
 * whether they have time to finish.
 *
 * WHY THE LABEL IS BUILT AFTER MOUNT. The deadline is rendered in the reader's
 * own zone, which the server cannot know, so a server-rendered label and the
 * browser's would disagree and React would flag the mismatch. The first paint
 * reserves the line and the effect fills it, which is the pattern the clock
 * already used for the same reason.
 *
 * ---------------------------------------------------------------------------
 * AND THE EXPIRED BRANCH TOLD PEOPLE TO PAY ANYWAY.
 *
 * It said "Paying now may not succeed, so check the stay is still open before
 * you try", in neutral grey, while `PayPanel` went on rendering live pay
 * buttons underneath it. "May not succeed" is the one thing a person about to
 * send money cannot act on, and it left them to guess what happens to the money
 * if it does not.
 *
 * It now says exactly what happens in both cases, which is knowable: a released
 * hold cancels the booking, and both pay actions refuse a CANCELLED booking
 * before anything is charged. The notice is drawn in the attention colour
 * rather than in the ink of a hint, because a hold that has run out is the most
 * consequential thing on the screen.
 *
 * The pay action is deliberately NOT disabled from here. Expiry and release are
 * two different moments: the hold lapses on a clock, the booking is cancelled
 * by a scheduled job some time after, and between the two a payment still
 * succeeds and still gets the guest their stay. Greying out the button in that
 * window would refuse a payment the platform would have accepted, which is a
 * worse failure than an honest sentence.
 */

/** Under this, the seconds are the news. Over it, they are a pressure device. */
const LIVE_WINDOW_MS = 60 * 60 * 1_000;

/** How often to look at the clock when the deadline is still hours away. */
const IDLE_TICK_MS = 30_000;

type View =
  | { kind: "unknown" }
  | { kind: "far"; until: string }
  | { kind: "near"; m: number; s: number }
  | { kind: "expired" };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function read(target: number, now: number, locale: Locale): View {
  const ms = target - now;
  if (ms <= 0) return { kind: "expired" };
  if (ms > LIVE_WINDOW_MS) {
    return {
      kind: "far",
      until: formatDate(new Date(target), locale, {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }
  const total = Math.floor(ms / 1_000);
  return { kind: "near", m: Math.floor(total / 60), s: total % 60 };
}

export function HoldCountdown({
  expiresAt,
  locale,
}: {
  expiresAt: string;
  locale: Locale;
}) {
  const target = Date.parse(expiresAt);
  // First paint matches the server: no clock reading during hydration, so the
  // markup cannot disagree with itself.
  const [view, setView] = useState<View>({ kind: "unknown" });

  useEffect(() => {
    if (Number.isNaN(target)) return;
    let timer: ReturnType<typeof setTimeout>;

    /* The cadence follows the distance rather than being fixed at one second.
       Two days of per-second re-renders was a wasted wake-up on a phone every
       second for the whole time the tab stayed open, and the display did not
       change often enough to justify one. The schedule is re-chosen after each
       read, so crossing the hour switches the clock on by itself. */
    const tick = () => {
      const next = read(target, Date.now(), locale);
      setView(next);
      if (next.kind === "expired") return;
      timer = setTimeout(tick, next.kind === "near" ? 1_000 : IDLE_TICK_MS);
    };

    tick();
    return () => clearTimeout(timer);
  }, [target, locale]);

  if (Number.isNaN(target)) return null;

  const expired = view.kind === "expired";

  return (
    <div className="nf-panel-sunken flex items-center gap-3.5">
      <span className="block h-11 w-11 shrink-0">
        <BrandIcon name="calendar-clock" fill />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`nf-overline ${
            expired ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-muted)]"
          }`}
        >
          {expired ? "Hold has run out" : "Your dates are held"}
        </p>

        {view.kind === "unknown" ? (
          <p
            className="nf-numeric mt-3xs text-[var(--nf-text-body-lg)] font-bold tracking-tight text-[var(--nf-content-primary)]"
            aria-hidden="true"
          >
            &nbsp;
          </p>
        ) : expired ? (
          <p className="mt-3xs text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
            These dates are no longer held and somebody else can book them. If the stay is still
            open, paying now still confirms it. If it has already been released, the payment is
            refused before anything is charged.
          </p>
        ) : view.kind === "near" ? (
          /* The last hour, and only the last hour. `aria-live="off"` because a
             per-second region would read the clock aloud over and over to
             somebody who came here to pay. */
          <p
            aria-live="off"
            className="nf-numeric mt-3xs text-[var(--nf-text-body-lg)] font-bold tracking-tight text-[var(--nf-content-primary)]"
          >
            {pad(view.m)}m {pad(view.s)}s left
          </p>
        ) : (
          <p className="mt-3xs text-[var(--nf-text-body-lg)] font-bold tracking-tight text-[var(--nf-content-primary)]">
            Until {view.until}
          </p>
        )}
      </div>
    </div>
  );
}
