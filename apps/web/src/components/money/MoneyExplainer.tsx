"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { motionQuiet } from "@/lib/motion/gate";
import "@/app/css/money-layer.css";

/**
 * THE PLASMA EXPLAINER (D74, the governing level: GOVERNING-plasma-
 * rewards-platinum.jpg, -withdraw-anytime.jpg, -start-earning.jpg; and
 * PREMIUM-STANDARD reference 9). On a near-black field a phone, cropped at
 * the top, fades up out of almost nothing; then a smoked-glass card, a real
 * fragment of the screen, breaks out of it towards the reader; then the
 * title, two lines, the dots and one white capsule with its reflection on
 * the floor. Each panel's fragment is drawn by the caller from the member's
 * own figures, never a sample.
 *
 * Motion is framer-motion, orchestrated: the device on `land` (700ms), the
 * card on a spring 350ms behind it, the words between. Under reduced
 * motion, Calm and Off every frame is simply there.
 *
 * It opens once per device, the first time a member reaches a money surface
 * that is live for them. Browser storage only decides "seen on this device";
 * when it cannot be read (a private window, blocked storage) the explainer
 * stays closed, because one that fails to appear costs nobody anything and
 * one that appears every visit is the product nagging.
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

export function MoneyExplainer({ storageKey, name, panels, testId }: { storageKey: string; name: string; panels: ExplainerPanel[]; testId?: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [quiet, setQuiet] = useState(true);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(storageKey) === "1";
      if (!seen) window.localStorage.setItem(storageKey, "1");
    } catch {
      seen = true;
    }
    setQuiet(motionQuiet());
    if (!seen) setOpen(true);
  }, [storageKey]);

  const panel = panels[index];
  if (!panel) return null;
  const last = index === panels.length - 1;
  const still = quiet ? { initial: false as const } : {};

  return (
    <Sheet open={open} onOpenChange={setOpen} title={name} hideTitle detents={[0.94]} testId={testId}>
      <div className="nf-explain" data-testid={testId ? `${testId}-panel-${panel.key}` : undefined}>
        <div className="nf-explain__stage" aria-hidden="true">
          <motion.div
            key={`phone-${panel.key}`}
            className="nf-explain__phone"
            data-tone={panel.screenTone ?? "plain"}
            initial={{ opacity: 0.06, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: LAND }}
            {...still}
          >
            <span className="nf-explain__island" />
            {panel.screen ? <div className="nf-explain__screen">{panel.screen}</div> : null}
          </motion.div>
          <motion.div
            key={`card-${panel.key}`}
            className="nf-explain__fragment"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1.04 }}
            transition={{ type: "spring", stiffness: 170, damping: 22, delay: 0.35 }}
            {...still}
          >
            {panel.fragment}
          </motion.div>
        </div>
        <motion.div
          key={`words-${panel.key}`}
          className="nf-explain__words"
          aria-live="polite"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: LAND, delay: 0.2 }}
          {...still}
        >
          <h2 className="nf-explain__title">{panel.title}</h2>
          <p className="nf-explain__body">{panel.body}</p>
        </motion.div>
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
