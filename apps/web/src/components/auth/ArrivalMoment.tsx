"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Dictionary } from "@vallo/i18n/core";
import { feedback } from "@/lib/ui/feedback";
import { ObjectArt } from "./ObjectArt";

/**
 * THE MOMENT AFTER THE CODE IS ACCEPTED, FULL SCREEN (A17, 30 September;
 * rebuilt 6 October 2026, the motion system's "verification passed").
 *
 * The account exists now, so the whole screen says so, by name when the
 * sign-up gave one: a night canvas over the page, one wash of the brand's
 * blue, a matte clay shield (it carries its own tick) landing on `land` at
 * 620ms, the payoff pop at 180ms as it lands with one haptic (the weight the
 * craft doctrine keeps for a payoff, `feedback("success")`), and "You're in,
 * Ada." out of depth beneath it. `VerifyCodeForm` holds it, then goes through
 * the door (`ThresholdStage`, kind `door`) to where the person was going.
 *
 * WHY IT IS RENDERED INTO <body>. The auth screen's column is an Island, and
 * an Island has a backdrop filter, which makes it the containing block of
 * anything `position: fixed` inside it: drawn in place, a full-screen moment
 * would be a card-sized moment. In the body it covers the screen, and it
 * carries its own `data-theme="dark"` because a payoff is night whatever the
 * member chose (the verify screen is a night door anyway).
 *
 * A status for a screen reader (`role="status"`), with the art hidden. Motion
 * is transform and opacity (auth.css, "THE ARRIVAL"); reduced motion shows
 * the finished picture at once, and Calm fades it. The haptic follows the
 * same gate as every other (`feedback` turns it down under reduced motion,
 * and keeps the success).
 */
const subscribe = () => () => {};

/** The shield lands at `--nf-duration-deliberate`; the haptic is felt with it. */
const LAND_MS = 620;

export function ArrivalMoment({ t, name }: { t: Dictionary; name?: string | undefined }) {
  const a = t.authFlow;
  const first = name?.trim();
  /* Client only: false on the server and during hydration, true after, so the
     portal never mismatches and nothing draws inside the island first. */
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => feedback("success"), LAND_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) return null;
  return createPortal(
    <div className="nf-arrival" data-theme="dark" role="status" aria-live="polite" data-testid="arrival-moment">
      <span className="nf-arrival__wash" aria-hidden="true" />
      <div className="nf-arrival__art" aria-hidden="true">
        <span className="nf-arrival__pop">
          <ObjectArt name="shield-tick" size={336} priority />
        </span>
      </div>
      <h1 className="nf-arrival__title">{first ? a.youreIn.replace("{name}", first) : a.youreInNoName}</h1>
      <p className="nf-arrival__body">{a.arrivalBody}</p>
    </div>,
    document.body,
  );
}
