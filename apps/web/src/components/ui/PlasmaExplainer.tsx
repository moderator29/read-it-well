"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { motionQuiet } from "@/lib/motion/gate";
import "@/app/css/premium-moments.css";

/**
 * THE ONE EXPLAINER: THE PLASMA DEVICE FRAME (D74, the governing level:
 * GOVERNING-plasma-rewards-platinum.jpg, -withdraw-anytime.jpg,
 * -start-earning.jpg; PREMIUM-STANDARD reference 9; ONE-PRODUCT-DECISIONS,
 * "Recommendations to unify the platform"). On a near-black field a phone,
 * cropped at the top, fades up out of almost nothing; then a smoked-glass
 * card, a real fragment of the screen, breaks out of it towards the reader;
 * then the title, two lines, the dots and one white capsule with its
 * reflection on the floor. Each panel's fragment is drawn by the caller from
 * the member's own data, never a sample.
 *
 * Motion is framer-motion's `animate()` on the three elements, orchestrated:
 * the device on `land` (700ms), the words 200ms behind, the card on a spring
 * 350ms behind. Under reduced motion, Calm and Off the CSS's settled frame is
 * simply there and nothing is animated.
 *
 * It opens once per device, a beat after the page lands, the first time a
 * member reaches the surface. Browser storage only decides "seen on this
 * device"; when it cannot be read (a private window, blocked storage) the
 * explainer stays closed, because one that fails to appear costs nobody
 * anything and one that appears every visit is the product nagging. Once per
 * MEMBER needs the server's seen-state (first-run W7-R1, still a stub).
 */
export type ExplainerPanel = {
  key: string;
  /** What the phone's own screen shows behind the card (its top only). */
  screen?: ReactNode;
  /** Platinum when the screen behind is the member's balance or tier. */
  screenTone?: "platinum" | "plain";
  fragment: ReactNode;
  title: string;
  body: string;
};

const LAND = [0.22, 1, 0.36, 1] as const;

export function PlasmaExplainer({ storageKey, name, panels, testId }: { storageKey: string; name: string; panels: ExplainerPanel[]; testId?: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const phone = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const words = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(storageKey) === "1";
      if (!seen) window.localStorage.setItem(storageKey, "1");
    } catch {
      seen = true;
    }
    if (seen) return;
    const beat = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(beat);
  }, [storageKey]);

  const panel = panels[index];
  const key = panel?.key;

  /* The sequence, once per panel shown. The sheet mounts its content after
     it opens, so the refs are read on the next frame. */
  useEffect(() => {
    if (!open || !key || motionQuiet()) return;
    const frame = window.requestAnimationFrame(() => {
      if (phone.current) animate(phone.current, { opacity: [0.06, 1], y: [14, 0], scale: [0.97, 1] }, { duration: 0.7, ease: LAND });
      if (words.current) animate(words.current, { opacity: [0, 1], y: [8, 0] }, { duration: 0.5, ease: LAND, delay: 0.2 });
      if (card.current) animate(card.current, { opacity: [0, 1], y: [40, 0], scale: [0.92, 1.04] }, { type: "spring", stiffness: 170, damping: 22, delay: 0.35 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, key]);

  if (!panel) return null;
  const last = index === panels.length - 1;

  return (
    <Sheet open={open} onOpenChange={setOpen} title={name} hideTitle detents={[0.94]} testId={testId}>
      <div className="nf-explain" data-testid={testId ? `${testId}-panel-${panel.key}` : undefined}>
        <div className="nf-explain__stage" aria-hidden="true">
          <div ref={phone} className="nf-explain__phone" data-tone={panel.screenTone ?? "plain"}>
            <span className="nf-explain__island" />
            {panel.screen ? <div className="nf-explain__screen">{panel.screen}</div> : null}
          </div>
          <div ref={card} className="nf-explain__fragment">
            {panel.fragment}
          </div>
        </div>
        <div ref={words} className="nf-explain__words" aria-live="polite">
          <h2 className="nf-explain__title">{panel.title}</h2>
          <p className="nf-explain__body">{panel.body}</p>
        </div>
        {panels.length > 1 ? (
          <div className="nf-explain__dots" role="group" aria-label={`${index + 1} of ${panels.length}`}>
            {panels.map((p, i) => (
              <button
                key={p.key}
                type="button"
                className="nf-explain__dot"
                aria-current={i === index ? "step" : undefined}
                aria-label={`${i + 1} of ${panels.length}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        ) : null}
        <button type="button" className="nf-capsule" onClick={() => (last ? setOpen(false) : setIndex(index + 1))} data-testid={testId ? `${testId}-next` : undefined}>
          {last ? "Got it" : "Next"}
        </button>
      </div>
    </Sheet>
  );
}
