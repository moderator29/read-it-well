"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motionQuiet } from "@/lib/motion/gate";
import { MOTION_EVENT } from "@/lib/motion/motion-pref";
import { onScrollFrame } from "@/lib/motion/scroll-loop";

export type ReelFrame = {
  key: string;
  time: string;
  title: string;
  body: string;
  photo: string;
};

/**
 * THE HORIZONTAL REEL (Track M, 25 September 2026).
 *
 * The founder asked for horizontal motion that breaks the page's vertical
 * habit. This is the pinned version of it: on a wide screen the section
 * holds still while you scroll, and your vertical scroll drives the frames
 * sideways past you like film through a gate. The photograph inside each
 * frame moves a little slower than the frame, so the picture has depth, and
 * a counter and a progress rule say where in the reel you are.
 *
 * On a phone, under Calm or Off, under reduced motion, and without script, it
 * is not pinned at all: it is an ordinary horizontal scroller with snap
 * points, which is what a thumb expects and what the server renders. Nothing
 * is hidden behind the pinning; it is only a nicer way to move through the
 * same frames.
 */
export function HorizontalReel({
  chapter,
  overline,
  title,
  body,
  of,
  frames,
}: {
  chapter: string;
  overline: string;
  title: string;
  body: string;
  of: string;
  frames: ReelFrame[];
}) {
  const section = useRef<HTMLElement>(null);
  const stick = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = section.current;
    const gate = stick.current;
    const film = track.current;
    if (!host || !gate || !film) return;
    let run = 0;
    let pinned = false;
    let stop: (() => void) | null = null;
    const wide = window.matchMedia("(min-width: 48rem)");

    const measure = () => {
      run = Math.max(0, film.scrollWidth - gate.clientWidth);
      host.style.height = `${run + window.innerHeight}px`;
    };

    const place = (p: number) => {
      film.style.transform = `translate3d(${(-p * run).toFixed(1)}px, 0, 0)`;
      film.style.setProperty("--nf-reel-p", p.toFixed(4));
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
      if (count.current) {
        const n = Math.min(frames.length, Math.round(p * (frames.length - 1)) + 1);
        count.current.textContent = String(n).padStart(2, "0");
      }
    };

    const decide = () => {
      const want = wide.matches && !motionQuiet();
      if (want === pinned) {
        if (pinned) measure();
        return;
      }
      pinned = want;
      host.dataset.mode = pinned ? "pinned" : "swipe";
      stop?.();
      stop = null;
      if (!pinned) {
        host.style.height = "";
        film.style.transform = "";
        return;
      }
      measure();
      stop = onScrollFrame(({ vh }) => {
        const rect = host.getBoundingClientRect();
        const total = host.offsetHeight - vh;
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        return () => place(p);
      });
    };

    decide();
    const sizeWatch = new ResizeObserver(() => decide());
    sizeWatch.observe(gate);
    wide.addEventListener("change", decide);
    window.addEventListener(MOTION_EVENT, decide);
    return () => {
      stop?.();
      sizeWatch.disconnect();
      wide.removeEventListener("change", decide);
      window.removeEventListener(MOTION_EVENT, decide);
    };
  }, [frames.length]);

  return (
    <section ref={section} className="nf-hreel" data-chapter={chapter} data-mode="swipe">
      <div ref={stick} className="nf-hreel__gate">
        <header className="nf-hreel__head nf-shell">
          <div>
            <p className="nf-cine-overline">{overline}</p>
            <h2 className="nf-cine-title">{title}</h2>
            <p className="nf-cine-lede">{body}</p>
          </div>
          <p className="nf-hreel__count" aria-hidden="true">
            <span ref={count}>01</span> {of} {String(frames.length).padStart(2, "0")}
            <span className="nf-hreel__rule">
              <span ref={bar} />
            </span>
          </p>
        </header>
        <ol ref={track} className="nf-hreel__track" style={{ "--nf-reel-n": frames.length } as React.CSSProperties}>
          {frames.map((frame, i) => (
            <li key={frame.key} className="nf-hreel__frame" style={{ "--nf-i": i } as React.CSSProperties}>
              <div className="nf-hreel__photo">
                <Image
                  src={`/brand/photos/${frame.photo}.jpg`}
                  alt=""
                  fill
                  sizes="(min-width: 48rem) 34vw, 82vw"
                />
              </div>
              <div className="nf-hreel__copy">
                <span className="nf-hreel__time">{frame.time}</span>
                <h3 className="nf-hreel__title">{frame.title}</h3>
                <p className="nf-hreel__body">{frame.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
