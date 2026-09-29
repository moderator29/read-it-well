"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ambientAllowed } from "@/lib/motion/gate";
import { MOTION_EVENT } from "@/lib/motion/motion-pref";

/**
 * THE VERTICAL COLUMNS (Track M, 25 September 2026).
 *
 * The other axis. Three columns of photographs drift upward and downward at
 * three different speeds, the middle one against the other two, so the band
 * reads as a window onto a moving wall of places rather than a slideshow.
 * Each column is its list drawn twice and moved by exactly half its height,
 * which is what makes the loop seamless.
 *
 * Mood photography from the brand library, never presented as listings: no
 * price, no place name, no claim. Decorative, so `aria-hidden`; the band's
 * heading and text carry its meaning.
 *
 * It moves only while on screen, never under Calm, Off, reduced motion or
 * data saving, never with Living backgrounds off, and it stops under a
 * hovering pointer or keyboard focus so a photograph can be looked at. A
 * visible pause toggle in its corner stops it for good (WCAG 2.2.2); the
 * toggle is drawn only while the wall is allowed to move.
 */
export function VerticalColumns({
  photos,
  className,
  pauseLabel,
  playLabel,
}: {
  photos: string[];
  className?: string;
  /** The toggle's accessible names, from the dictionary. */
  pauseLabel: string;
  playLabel: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  /* Whether the wall may move at all (Calm, Off, reduced motion, data saver
     and Living backgrounds decide). With no motion there is nothing to pause,
     so the toggle is not drawn. */
  const [allowed, setAllowed] = useState(false);
  /* The reader's own pause, which outlives scrolling away and back. */
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let seen = false;
    const decide = () => {
      const ok = ambientAllowed();
      setAllowed(ok);
      setPlaying(seen && ok);
    };
    const watch = new IntersectionObserver(([entry]) => {
      seen = Boolean(entry?.isIntersecting);
      decide();
    });
    watch.observe(el);
    window.addEventListener(MOTION_EVENT, decide);
    return () => {
      watch.disconnect();
      window.removeEventListener(MOTION_EVENT, decide);
    };
  }, []);

  const columns = [0, 1, 2].map((c) => photos.filter((_, i) => i % 3 === c));

  return (
    <div ref={host} className={`nf-vcols-host ${className ?? ""}`.trim()}>
      <div className="nf-vcols" data-playing={playing && !paused ? "true" : "false"} aria-hidden="true">
        {columns.map((column, c) => (
          <div key={c} className="nf-vcols__col" data-col={c}>
            <div className="nf-vcols__strip">
              {[...column, ...column].map((photo, i) => (
                <div key={`${photo}-${i}`} className="nf-vcols__cell">
                  <Image src={`/brand/photos/${photo}.jpg`} alt="" fill sizes="(min-width: 48rem) 16vw, 32vw" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {allowed && (
        <button
          type="button"
          className="nf-vcols__toggle nf-m-press"
          /* The name says what a press does next ("Pause…" / "Play…"), so
             there is no `aria-pressed`: a pressed "Play" button reads as a
             contradiction. */
          aria-label={paused ? playLabel : pauseLabel}
          onClick={() => setPaused((p) => !p)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            {paused ? (
              <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" />
            ) : (
              <path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" fill="currentColor" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
