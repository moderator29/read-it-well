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
 * hovering pointer so a photograph can be looked at.
 */
export function VerticalColumns({ photos, className }: { photos: string[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let seen = false;
    const decide = () => setPlaying(seen && ambientAllowed());
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
    <div ref={host} className={`nf-vcols ${className ?? ""}`} data-playing={playing ? "true" : "false"} aria-hidden="true">
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
  );
}
