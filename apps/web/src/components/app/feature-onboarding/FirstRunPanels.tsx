"use client";

import "./feature-onboarding.css";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { rememberFeatureRun, withFeatureRunPassed } from "./first-run-device";
import type { FirstRunPanel, MountedFirstRun } from "./first-runs";

/**
 * A FEATURE'S FIRST RUN, DRAWN (north star 14.1, D11; the full-page grammar of
 * reference 36 that D13 extends past Get Started).
 *
 * THE SHAPE, top to bottom, the same for every feature so a member learns it
 * once: Skip, always there, top right; the panel (the clay object on its
 * ground, a display line, one line of body); the dot pager; one button. The
 * button reads Next until the last panel, where it becomes the feature itself
 * ("Open my desk"), never "Done". One button per panel, so one primary.
 *
 * A ROUTE, NOT A MODAL (14.1). This draws a whole page at `/first-run/<key>`,
 * so the browser's back leaves it, a deep link reaches it, and nothing sits
 * over the feature pretending to be part of it. Both exits REPLACE this entry
 * in history, so Back from the feature never walks into the first run again.
 *
 * SEEN THE MOMENT IT OPENS (first-run-device.ts): at most once, so leaving half
 * way counts. If the browser refuses the record, both exits carry the passed
 * flag and the gate lets the member through. It never blocks.
 *
 * MOTION, on a known track, so CSS rather than framer-motion (D39.3): a panel
 * change is the tab-change grammar, the new panel arriving 32px from the side
 * it was asked from on `land` while the old one leaves on `leave`, its three
 * parts overlapping 60ms apart (craft doctrine 5, overlap). A drag follows
 * the finger 1:1 (direct manipulation, written to one custom property, no
 * React render per frame) and lets go on the same curve. Quiet readers get a
 * 160ms fade and no travel (feature-onboarding.css). Transform and opacity
 * only. Nothing loops.
 *
 * NO HAPTICS. A first run is read, not operated, and the craft doctrine's test
 * is whether a buzz helps somebody understand what happened. Turning a page
 * does not need one.
 */
export function FirstRunPanels({
  feature,
  name,
  panels,
  action,
  next,
  copy,
}: {
  feature: MountedFirstRun;
  /** The feature's name, for the region's accessible name. */
  name: string;
  panels: readonly FirstRunPanel[];
  /** The last panel's action label: the feature itself. */
  action: string;
  /** Where both exits land: the working feature. */
  next: string;
  copy: { skip: string; next: string; page: string; pager: string; region: string };
}) {
  const router = useRouter();
  const { quiet } = useMotionGate();
  const [at, setAt] = useState(0);
  /* Whether the device record stuck. A ref, not state: it only decides where
     an exit goes at the moment it is pressed, and changes nothing drawn. */
  const recorded = useRef(true);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x0: number; dx: number; id: number } | null>(null);
  const titleId = useId();
  const last = panels.length - 1;

  /* Recorded as it opens. A refused cookie means the exits carry the flag. */
  useEffect(() => {
    recorded.current = rememberFeatureRun(feature);
  }, [feature]);
  const exitTo = () => (recorded.current ? next : withFeatureRunPassed(next));

  const go = useCallback(
    (index: number) => {
      const to = Math.max(0, Math.min(last, index));
      setAt(to);
    },
    [last],
  );

  const setDrag = (px: number) => {
    stageRef.current?.style.setProperty("--nf-frun-drag", `${px}px`);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || panels.length < 2) return;
    drag.current = { x0: e.clientX, dx: 0, id: e.pointerId };
    stageRef.current?.setAttribute("data-dragging", "");
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dx = e.clientX - d.x0;
    /* Resistance past either end: the page leans, it does not leave. */
    const atEdge = (d.dx > 0 && at === 0) || (d.dx < 0 && at === last);
    setDrag(atEdge ? d.dx * 0.25 : d.dx);
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    stageRef.current?.removeAttribute("data-dragging");
    setDrag(0);
    if (d.dx <= -56) go(at + 1);
    else if (d.dx >= 56) go(at - 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(at + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(at - 1);
    }
  };

  return (
    <main
      className="nf-frun"
      aria-labelledby={titleId}
      data-quiet={quiet ? "" : undefined}
      onKeyDown={onKeyDown}
    >
      <h1 id={titleId} className="sr-only">
        {copy.region.replace("{feature}", name)}
      </h1>

      <div className="nf-frun__top">
        {/* ALWAYS REACHABLE (14.1): on every panel, in the same place, never
            behind a scroll, and it lands on the working feature. */}
        <Button
          variant="quiet"
          size="md"
          className="nf-frun__skip"
          onClick={() => router.replace(exitTo())}
        >
          {copy.skip}
        </Button>
      </div>

      <div
        ref={stageRef}
        className="nf-frun__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {panels.map((panel, index) => {
          const state = index === at ? "active" : index < at ? "before" : "after";
          return (
            <section
              key={panel.title}
              className="nf-frun__panel"
              data-state={state}
              aria-hidden={index !== at}
              inert={index !== at}
              aria-roledescription="page"
              aria-label={copy.page.replace("{n}", String(index + 1)).replace("{total}", String(panels.length))}
            >
              <div className="nf-frun__art" aria-hidden="true">
                <BrandIcon name={panel.object} fill drawn={176} priority={index === 0} loading="eager" />
              </div>
              <h2 className="nf-frun__title">{panel.title}</h2>
              <p className="nf-frun__body">{panel.body}</p>
            </section>
          );
        })}
      </div>

      <div className="nf-frun__foot">
        {panels.length > 1 ? (
          <div className="nf-frun__dots" role="group" aria-label={copy.pager}>
            {panels.map((panel, index) => (
              <button
                key={panel.title}
                type="button"
                className="nf-frun__dot"
                aria-current={index === at ? "step" : undefined}
                aria-label={copy.page.replace("{n}", String(index + 1)).replace("{total}", String(panels.length))}
                onClick={() => go(index)}
              >
                <span className="nf-frun__dot-mark" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="nf-frun__action">
          {at < last ? (
            <Button variant="primary" size="lg" full onClick={() => go(at + 1)}>
              {copy.next}
            </Button>
          ) : (
            /* The last action IS the feature, and it replaces this page in
               history so Back from the feature does not return here. */
            <ButtonLink
              href={next}
              replace
              variant="primary"
              size="lg"
              full
              onClick={(event) => {
                if (recorded.current) return;
                event.preventDefault();
                router.replace(exitTo());
              }}
            >
              {action}
            </ButtonLink>
          )}
        </div>
      </div>
    </main>
  );
}
