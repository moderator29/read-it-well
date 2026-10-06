"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ArrivalCopy } from "./auth-copy";
import { feedback } from "@/lib/ui/feedback";
import { THRESHOLD_GOING_MS } from "@/lib/motion/threshold";
import { STARTUP_CEILING_MS } from "@/components/startup/startup-script";
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
 * ONE ANNOUNCEMENT, BY FOCUS. The title takes focus (below), and focus is
 * what a screen reader reads: the title as the heading, and the line under it
 * as its description (`aria-describedby`). It used to be a live status region
 * as well, and some readers then read the moment twice, once for the region
 * and once for the focus (audit A5), so the region is gone. The art is
 * hidden. Motion
 * is transform and opacity (auth.css, "THE ARRIVAL"); reduced motion shows
 * the finished picture at once, and Calm fades it. The haptic follows the
 * same gate as every other (`feedback` turns it down under reduced motion,
 * and keeps the success).
 *
 * FOCUS LANDS ON THE TITLE. The form that held focus unmounts the moment the
 * code is accepted, and focus would fall to <body>, where a screen reader
 * says nothing useful. The title takes it (not a control, so no ring), which
 * also makes it the first thing read.
 *
 * IT NEVER COVERS THE SCREEN FOREVER (audit A5). `VerifyCodeForm` leaves by
 * `router.replace`, which promises nothing: a client navigation that never
 * lands (a dropped RSC request, a router that has lost its way) would leave
 * this full-screen portal over everything for the life of the tab. So, given
 * where the person is going (`to`), the moment counts its own life from the
 * moment it appears: the form's hold (1,100ms), the door's going half
 * (`THRESHOLD_GOING_MS.door`), and then the startup's own ceiling for a
 * navigation to land (`STARTUP_CEILING_MS`). Past that, it loads the target
 * outright, which a server always answers. A navigation that lands unmounts
 * the moment first and the escape never fires.
 */
const subscribe = () => () => {};

/** The shield lands at `--nf-duration-deliberate`; the haptic is felt with it. */
const LAND_MS = 620;

/* The title takes focus and is not a control: the global ring is emptied
   through its own token rather than fought, as the passcode title does. */
const NO_RING = { "--nf-focus-ring": "transparent" } as CSSProperties;

/** `VerifyCodeForm`'s hold before it goes through the door. */
const FORM_HOLD_MS = 1100;

/** The longest the moment stays before it loads its target outright. */
export const ARRIVAL_ESCAPE_MS = FORM_HOLD_MS + THRESHOLD_GOING_MS.door + STARTUP_CEILING_MS;

export function ArrivalMoment({
  t,
  name,
  to,
}: {
  t: ArrivalCopy;
  name?: string | undefined;
  /** Where the person is going: the escape's target if the navigation never lands. */
  to?: string | undefined;
}) {
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

  /* The bounded escape: a navigation that never lands becomes a full load. */
  useEffect(() => {
    if (!to) return;
    const timer = window.setTimeout(() => window.location.assign(to), ARRIVAL_ESCAPE_MS);
    return () => window.clearTimeout(timer);
  }, [to]);

  /* Focus to the title once the portal is drawn. */
  const title = useRef<HTMLHeadingElement>(null);
  const bodyId = useId();
  useEffect(() => {
    if (mounted) title.current?.focus({ preventScroll: true });
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div className="nf-arrival" data-theme="dark" data-testid="arrival-moment">
      <span className="nf-arrival__wash" aria-hidden="true" />
      <div className="nf-arrival__art" aria-hidden="true">
        <span className="nf-arrival__pop">
          <ObjectArt name="shield-tick" size={336} priority />
        </span>
      </div>
      <h1
        ref={title}
        tabIndex={-1}
        className="nf-arrival__title"
        style={NO_RING}
        aria-describedby={bodyId}
        data-testid="arrival-title"
      >
        {first ? a.youreIn.replace("{name}", first) : a.youreInNoName}
      </h1>
      <p id={bodyId} className="nf-arrival__body">
        {a.arrivalBody}
      </p>
    </div>,
    document.body,
  );
}
