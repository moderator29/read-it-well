"use client";

import { useEffect, useRef } from "react";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { clockText, type ResendState } from "./resend-clock";
import type { ResendClock } from "./useResendClock";
import "@/app/css/auth.css";

/**
 * THE DRAINING HAIRLINE AND THE WINDOW SENTENCE UNDER "SEND A NEW CODE" (W11,
 * 6 October 2026; `resend-clock.ts` says what the time is a deadline FOR).
 *
 * The hairline is the wait made visible: full at the send, empty at the
 * deadline, in a straight line, because a deadline is the one place linear
 * motion is honest. It is one Web Animation from the share left NOW to nothing
 * over exactly the time left, started when a wait begins (or its deadline
 * moves), so it arrives with the deadline rather than approximately and
 * nothing re-draws it every second. Transform only. A reader who asked for
 * less motion gets the share drawn and re-drawn each second instead, still
 * true, never animated.
 *
 * When the wait is the SERVER'S window (the codes it will send are spent) the
 * line says so and shows the time as the tabular clock it is. When it is only
 * the pace, the button's own label carries the seconds (`authFlow.resendIn`)
 * and nothing else is said.
 */
function DrainBar({ state, share, quiet }: { state: Exclude<ResendState, { kind: "ready" }>; share: number; quiet: boolean }) {
  const fill = useRef<HTMLSpanElement>(null);
  const { from, until } = state;

  useEffect(() => {
    const el = fill.current;
    if (!el || quiet) return;
    const left = Math.max(0, until - Date.now());
    const total = Math.max(1, until - from);
    const animation = el.animate(
      [{ transform: `scaleX(${Math.min(1, left / total)})` }, { transform: "scaleX(0)" }],
      { duration: left, easing: "linear", fill: "forwards" },
    );
    return () => animation.cancel();
  }, [from, until, quiet]);

  return (
    <span className="nf-resend__track" aria-hidden="true">
      <span ref={fill} className="nf-resend__fill" style={quiet ? { transform: `scaleX(${share})` } : undefined} />
    </span>
  );
}

export function ResendClockView({
  clock,
  windowLine,
  readyLine,
}: {
  clock: ResendClock;
  /** `experienceEntry.resendWindow`, with `{time}` where the clock goes. */
  windowLine: string;
  /** `experienceEntry.resendReady`, for a reader, when a wait ends. */
  readyLine: string;
}) {
  const { quiet } = useMotionGate();
  const [before, after = ""] = windowLine.split("{time}");
  return (
    <>
      {/* The track's place is kept while the clock is idle (U1, the first
          400ms): the server cannot read this tab's record of the last send,
          so a reload in the middle of a wait drew the bar only after
          hydration and pushed everything under it down by its height. */}
      {clock.state.kind !== "ready" ? (
        <DrainBar state={clock.state} share={clock.share} quiet={quiet} />
      ) : (
        <span className="nf-resend__track" data-idle="" aria-hidden="true" />
      )}
      {clock.state.kind === "window" ? (
        <p className="nf-resend__line" data-testid="resend-window">
          {before}
          <span className="nf-resend__time">{clockText(clock.seconds)}</span>
          {after}
        </p>
      ) : null}
      {/* Said once, to a reader, when the wait ends. */}
      <span className="sr-only" role="status" aria-live="polite">
        {clock.state.kind === "ready" ? readyLine : ""}
      </span>
    </>
  );
}
