"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { useBack } from "@/lib/nav/use-back";
import { readMotion } from "@/lib/motion/motion-pref";
import { isDataSaver } from "@/lib/ui/data-saver";
import {
  autoAdvanceAllowed,
  CLOSE_DRAG_PX,
  HOLD_MS,
  positionLabel,
  STORY_SECONDS,
  storySequence,
  type StoryRef,
} from "@/lib/social/story-sequence";

/**
 * B16: THE STORY AS PART OF A RUN, laid over the viewer's stage.
 *
 *   - Thin progress segments at the top, one per story in the run.
 *   - The left and right thirds are tap zones (and the arrow keys): back and
 *     next. Press and hold anywhere in them pauses; a drag down closes back to
 *     where the story was opened, through the shared back rules.
 *   - The next story is prefetched, and its picture warmed, only when the
 *     person is not saving data and the connection is not frugal.
 *   - Auto-advance (six seconds) runs only under Standard and Cinematic
 *     motion; Calm, Off and reduced motion never advance on a timer. The fill
 *     is a transform, and it pauses while held or while a sheet is open.
 *   - A screen reader hears "Story 2 of 5, from Tunde" in a polite region.
 *
 * Moving between stories REPLACES the entry, so Back leaves the run in one
 * step instead of walking back through every story seen.
 */
export function StorySequence({
  current,
  more,
  hold,
}: {
  current: StoryRef;
  more: StoryRef[];
  /** A menu, sheet or comment box is open: the run stands still. */
  hold: boolean;
}) {
  const router = useRouter();
  const back = useBack("/around");
  const seq = useMemo(() => storySequence(current, more), [current, more]);
  const [auto, setAuto] = useState(false);
  const [held, setHeld] = useState(false);
  const press = useRef<{ x: number; y: number; timer: number; held: boolean } | null>(null);

  /* The motion level and the system's reduced motion, read once on mount. */
  useEffect(() => {
    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduce = false;
    }
    setAuto(autoAdvanceAllowed(readMotion().level, reduce));
  }, []);

  const go = useCallback(
    (to: StoryRef | null) => {
      if (!to) return;
      router.replace(`/stories/${to.id}`, { scroll: false });
    },
    [router],
  );

  /* The next story, ready before it is asked for, unless data is precious. */
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    if (!seq.next || isDataSaver()) return;
    router.prefetch(`/stories/${seq.next.id}`);
    setWarm(true);
  }, [router, seq.next]);

  /* The arrow keys, away from any field and while nothing is open over it. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (hold) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if (event.key === "ArrowRight") go(seq.next);
      else if (event.key === "ArrowLeft") go(seq.prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, hold, seq.next, seq.prev]);

  const paused = hold || held;

  function onDown(event: React.PointerEvent) {
    const timer = window.setTimeout(() => {
      if (press.current) press.current.held = true;
      setHeld(true);
    }, HOLD_MS);
    press.current = { x: event.clientX, y: event.clientY, timer, held: false };
  }
  function onMove(event: React.PointerEvent) {
    const p = press.current;
    if (!p) return;
    if (event.clientY - p.y > CLOSE_DRAG_PX && Math.abs(event.clientX - p.x) < CLOSE_DRAG_PX) {
      window.clearTimeout(p.timer);
      press.current = null;
      setHeld(false);
      back();
    }
  }
  function onUp(to: StoryRef | null) {
    const p = press.current;
    press.current = null;
    if (p) window.clearTimeout(p.timer);
    if (p?.held) {
      setHeld(false);
      return;
    }
    go(to);
  }
  function onCancel() {
    const p = press.current;
    press.current = null;
    if (p) window.clearTimeout(p.timer);
    setHeld(false);
  }

  return (
    <>
      <div className="nf-story-seq__bars" aria-hidden="true">
        {seq.ids.map((id, i) => (
          <span key={id} className="nf-story-seq__bar">
            <span
              className={`nf-story-seq__fill${
                i < seq.index ? " is-done" : i === seq.index ? (auto ? " is-running" : " is-done") : ""
              }`}
              style={
                i === seq.index && auto
                  ? { animationDuration: `${STORY_SECONDS}s`, animationPlayState: paused ? "paused" : "running" }
                  : undefined
              }
              onAnimationEnd={i === seq.index && auto ? () => go(seq.next) : undefined}
            />
          </span>
        ))}
      </div>

      {/* Two zones; the middle third is the picture and the card's own. The
          zones are buttons, so a keyboard or switch user reaches both. */}
      <button
        type="button"
        className="nf-story-seq__zone nf-story-seq__zone--prev"
        aria-label="Previous story"
        disabled={!seq.prev}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => onUp(seq.prev)}
        onPointerCancel={onCancel}
        onPointerLeave={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go(seq.prev);
          }
        }}
        data-testid="story-prev"
      />
      <button
        type="button"
        className="nf-story-seq__zone nf-story-seq__zone--next"
        aria-label="Next story"
        disabled={!seq.next}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => onUp(seq.next)}
        onPointerCancel={onCancel}
        onPointerLeave={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go(seq.next);
          }
        }}
        data-testid="story-next"
      />

      <p className="sr-only" aria-live="polite" data-testid="story-position">
        {positionLabel(seq, current.authorLabel)}
      </p>

      {/* The next picture, warmed at the size the viewer asks for it. */}
      {warm && seq.next?.imageUrl ? (
        <span className="nf-story-seq__warm" aria-hidden="true">
          <RemoteImage src={seq.next.imageUrl} alt="" width={1200} height={1600} sizes="100vw" loading="eager" />
        </span>
      ) : null}
    </>
  );
}
