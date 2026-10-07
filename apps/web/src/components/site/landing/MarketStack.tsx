"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { useMotionGate } from "@/components/motion/useMotionGate";

const TALL = "(min-height: 600px)";
function subscribeTall(onChange: () => void): () => void {
  const mq = window.matchMedia(TALL);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function readTall(): boolean {
  return window.matchMedia(TALL).matches;
}

export type MarketCard = {
  key: string;
  icon: UiIconName;
  href: string;
  photo: string;
  tab: string;
  title: string;
  body: string;
  cta: string;
};

/**
 * THE ROLLING CARD STACK (the founder's `rolling-card-stack.jpg`).
 *
 * HOW IT IS DRAWN. Every card sits in one grid cell. The open card is in
 * front; each card behind it shows only its tab, lifted one tab higher and a
 * step smaller per place in the queue, so the stack reads as depth rather
 * than a list (PREMIUM-STANDARD reference 1: depth by stacking, scale and
 * light steps, not shadows alone). Changing the open card moves transforms
 * only: the old front card rolls to the back, the new one comes forward and
 * its body rises in.
 *
 * HOW IT ROLLS. Two ways, one state:
 *
 *   - A TAP (or Enter, or the arrow keys) on any tab opens that card. Each
 *     tab is a disclosure button (`aria-expanded`, `aria-controls`) rather
 *     than an ARIA tab, because the panel lives inside its own card and a
 *     tablist may hold nothing but tabs; the arrows still move between them.
 *   - SCROLL. Where motion is allowed and the window is tall enough to hold
 *     the stack, the section pins (`data-pin="on"`) and gives each card a
 *     stretch of scroll, so reading on down rolls the stack. A tap then
 *     scrolls to that card's stretch instead of fighting the scroll.
 *
 * REDUCED MOTION, CALM AND OFF get a settled stack: no pin, no extra scroll,
 * no transition, and the tabs still open their cards. The server renders the
 * first card open and the page is whole before any script runs.
 */
export function MarketStack({ cards, label, children }: { cards: MarketCard[]; label: string; children: ReactNode }) {
  const n = cards.length;
  const [active, setActive] = useState(0);
  const { quiet } = useMotionGate();
  /* Pin only where it helps: motion allowed and a window at least 600px tall
     (a short landscape phone would pin a stack it cannot show whole). The
     server answers "not tall", so the first paint is the settled stack. */
  const tall = useSyncExternalStore(subscribeTall, readTall, () => false);
  const pin = tall && !quiet;
  const track = useRef<HTMLDivElement | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  /* While pinned, the scroll decides which card is open. */
  useEffect(() => {
    if (!pin) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = track.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const run = rect.height - window.innerHeight;
      if (run <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / run));
      setActive(Math.min(n - 1, Math.floor(progress * n)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pin, n]);

  const open = useCallback(
    (k: number) => {
      const el = track.current;
      if (pin && el) {
        const rect = el.getBoundingClientRect();
        const run = rect.height - window.innerHeight;
        const top = window.scrollY + rect.top + ((k + 0.5) / n) * run;
        window.scrollTo({ top, behavior: "smooth" });
      }
      setActive(k);
    },
    [pin, n],
  );

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, k: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    const to = event.key === "Home" ? 0 : event.key === "End" ? n - 1 : step ? (k + step + n) % n : -1;
    if (to < 0) return;
    event.preventDefault();
    open(to);
    tabs.current[to]?.focus();
  };

  return (
    <div ref={track} className="nf-pl-mtrack" data-pin={pin ? "on" : "off"} style={{ "--nf-pl-steps": n - 1 } as CSSProperties}>
      <div className="nf-pl-mstage">
        <div className="nf-shell nf-pl-markets__grid">
          {children}
          <div className="nf-pl-mstack" style={{ "--nf-pl-n": n } as CSSProperties}>
            <ul className="nf-pl-mstack__cards" aria-label={label}>
              {cards.map((card, k) => {
                const depth = (k - active + n) % n;
                const front = depth === 0;
                return (
                  <li
                    key={card.key}
                    className="nf-pl-mcard"
                    data-front={front ? "true" : "false"}
                    style={{ "--nf-pl-d": depth } as CSSProperties}
                  >
                    <button
                      ref={(node) => {
                        tabs.current[k] = node;
                      }}
                      type="button"
                      id={`${base}-tab-${k}`}
                      aria-expanded={front}
                      aria-controls={`${base}-panel-${k}`}
                      className="nf-pl-mcard__tab"
                      onClick={() => open(k)}
                      onKeyDown={(event) => onKey(event, k)}
                    >
                      <UiIcon name={card.icon} size={20} aria-hidden />
                      <span className="nf-pl-mcard__name">{card.tab}</span>
                      <span className="nf-pl-mono" aria-hidden="true">
                        {String(k + 1).padStart(2, "0")}
                      </span>
                    </button>
                    {/* A card behind keeps its body laid out but inert and
                        invisible (landing-plasma.css), so its photograph is
                        fetched lazily as the stack nears the window and is
                        already there when the card rolls forward. */}
                    <div id={`${base}-panel-${k}`} className="nf-pl-mcard__body" inert={!front}>
                      <h3 className="nf-pl-mcard__title">{card.title}</h3>
                      <p className="nf-pl-mcard__line">{card.body}</p>
                      <div className="nf-pl-mcard__photo">
                        <Image src={card.photo} alt="" fill sizes="(min-width: 64rem) 34rem, 90vw" />
                      </div>
                      <Link href={card.href} prefetch={false} className="nf-pl-link">
                        {card.cta}
                        <UiIcon name="arrow-right" size={16} aria-hidden />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
