"use client";

import { useEffect, useRef } from "react";
import { motionQuiet } from "@/lib/motion/gate";
import { MOTION_EVENT } from "@/lib/motion/motion-pref";
import { onScrollFrame } from "@/lib/motion/scroll-loop";

/**
 * THE FILM HUD (Track M, 25 September 2026).
 *
 * The founder's showreel reference frames its picture the way a camera
 * monitor does: small monospaced labels at the edges, a timecode, a chapter
 * index, a scrub bar along the bottom. This is that frame for the landing
 * page. The page is treated as a two-minute film: the timecode runs from
 * 00:00:00:00 to 00:02:00:00 as you scroll to the end, the chapter index names
 * the section under the middle of the screen (every landing section carries
 * `data-chapter`), and the scrub bar is how far through the film you are.
 *
 * Quiet on purpose: small type at low contrast, bottom edge only so it never
 * sits on the navigation, fades in once the hero has gone by, and on a phone
 * it is the scrub bar alone. Decorative, `aria-hidden`, and it writes its text
 * straight to the DOM from the one shared scroll frame rather than
 * re-rendering React sixty times a second. Under Calm, Off or reduced motion
 * it is not drawn at all.
 */
const FILM_SECONDS = 120;
const FPS = 24;

function timecode(p: number): string {
  const frames = Math.round(p * FILM_SECONDS * FPS);
  const f = frames % FPS;
  const s = Math.floor(frames / FPS) % 60;
  const m = Math.floor(frames / (FPS * 60)) % 60;
  return ["00", m, s, f].map((n) => String(n).padStart(2, "0")).join(":");
}

export function ReelHud() {
  const hud = useRef<HTMLDivElement>(null);
  const chapter = useRef<HTMLSpanElement>(null);
  const code = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = hud.current;
    if (!el) return;
    let stop: (() => void) | null = null;
    let last = "";

    const decide = () => {
      stop?.();
      stop = null;
      if (motionQuiet()) {
        el.dataset.on = "false";
        return;
      }
      stop = onScrollFrame(({ y, vh }) => {
        const doc = document.documentElement.scrollHeight - vh;
        const p = doc > 0 ? Math.min(1, Math.max(0, y / doc)) : 0;
        const chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
        let index = -1;
        chapters.forEach((node, i) => {
          const rect = node.getBoundingClientRect();
          if (rect.top <= vh / 2 && rect.bottom >= vh / 2) index = i;
        });
        const label =
          index < 0
            ? ""
            : `${String(index + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}  ${chapters[index]!.dataset.chapter!.toUpperCase()}`;
        return () => {
          el.dataset.on = y > vh * 0.6 ? "true" : "false";
          if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
          if (code.current) code.current.textContent = timecode(p);
          if (label !== last && chapter.current) {
            chapter.current.textContent = label;
            last = label;
          }
        };
      });
    };
    decide();
    window.addEventListener(MOTION_EVENT, decide);
    return () => {
      stop?.();
      window.removeEventListener(MOTION_EVENT, decide);
    };
  }, []);

  return (
    <div ref={hud} className="nf-hud" data-on="false" aria-hidden="true">
      <div className="nf-hud__line">
        <span className="nf-hud__corner nf-hud__corner--l" />
        <span ref={chapter} className="nf-hud__chapter" />
        <span className="nf-hud__rec">
          <span className="nf-hud__dot" />
          VALLO · REEL
        </span>
        <span ref={code} className="nf-hud__code">
          00:00:00:00
        </span>
        <span className="nf-hud__corner nf-hud__corner--r" />
      </div>
      <span className="nf-hud__bar">
        <span ref={bar} />
      </span>
    </div>
  );
}
