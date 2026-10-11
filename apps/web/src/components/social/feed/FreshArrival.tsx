"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { EASE_LAND, SPRING_SETTLE } from "@/components/ui/ported-motion";
import { hasFlight, takeFlight } from "./publish-flight";

/**
 * A POST YOU JUST PUBLISHED, LANDING AT THE TOP OF THE FEED (D72, motion: "a
 * post being published into the feed lands at the top with a shared-element
 * move").
 *
 * Two moves at once, on two boxes, so they never fight:
 *
 *   the slot   opens from nothing to the card's height on `land`, so the
 *              posts under it slide down to make room rather than jumping;
 *   the card   starts where the composer stood when you pressed Post (its box,
 *              noted by `notePublished`) and settles into the slot on the
 *              shared settle spring, scaling from the composer's width to its
 *              own.
 *
 * It plays once, for the one post the composer just sent, and only when the
 * note is fresh. Anything else, every reload, every other card, and every
 * reader on reduced motion, Calm or Off, renders the card exactly where it
 * belongs with nothing moving. Transform and opacity only, plus the slot's
 * height, which is the one property that can make room.
 */
export function FreshArrival({ postId, children }: { postId: string; children: React.ReactNode }) {
  const { quiet } = useMotionGate();
  /* Decided once, on the first render, so a re-render mid-flight does not
     restart it. Read without taking: the effect below takes it. */
  const [flying] = useState(() => !quiet && hasFlight(postId));
  const slotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!flying) return;
    const slot = slotRef.current;
    const card = cardRef.current;
    const flight = takeFlight(postId);
    if (!slot || !card || !flight) return;

    const end = card.getBoundingClientRect();
    const height = end.height;
    const scale = Math.max(0.6, Math.min(1.4, flight.rect.width / Math.max(1, end.width)));
    const dx = flight.rect.left + flight.rect.width / 2 - (end.left + end.width / 2);
    const dy = flight.rect.top + flight.rect.height / 2 - (end.top + end.height / 2);

    slot.style.height = "0px";
    slot.style.overflow = "visible";
    const opening = animate(slot, { height: [0, height] }, { duration: 0.42, ease: EASE_LAND });
    const travel = animate(
      card,
      { x: [dx, 0], y: [dy, 0], scale: [scale, 1], opacity: [0.5, 1] },
      { ...SPRING_SETTLE },
    );
    opening.then(() => {
      slot.style.height = "";
      slot.style.overflow = "";
    });
    return () => {
      opening.stop();
      travel.stop();
      slot.style.height = "";
      slot.style.overflow = "";
      card.style.transform = "";
      card.style.opacity = "";
    };
  }, [flying, postId]);

  if (!flying) return <>{children}</>;
  return (
    <div ref={slotRef} className="nf-fresh-slot">
      <div ref={cardRef} className="nf-fresh-card">
        {children}
      </div>
    </div>
  );
}
