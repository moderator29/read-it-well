"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import "@/app/css/money-layer.css";

/**
 * THE FEATURE EXPLAINER (PREMIUM-STANDARD reference 9, "Withdraw anytime"):
 * a phone frame cropped at the top with a frosted fragment of the real
 * screen breaking out of it towards the reader, a title, two lines, the dots
 * and one wide "Got it". Each panel's fragment is drawn by the caller from
 * the member's own figures, never a sample.
 *
 * It opens once per device, the first time a member reaches a money surface
 * that is live for them. Browser storage only decides "seen on this device";
 * when it cannot be read (a private window, blocked storage) the explainer
 * stays closed, because one that fails to appear costs nobody anything and
 * one that appears every visit is the product nagging.
 */
export type ExplainerPanel = { key: string; fragment: ReactNode; title: string; body: string };

export function MoneyExplainer({ storageKey, name, panels, testId }: { storageKey: string; name: string; panels: ExplainerPanel[]; testId?: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(storageKey) === "1";
      if (!seen) window.localStorage.setItem(storageKey, "1");
    } catch {
      seen = true;
    }
    if (!seen) setOpen(true);
  }, [storageKey]);

  const panel = panels[index];
  if (!panel) return null;
  const last = index === panels.length - 1;

  return (
    <Sheet open={open} onOpenChange={setOpen} title={name} hideTitle detents={[0.94]} testId={testId}>
      <div className="nf-explain" data-testid={testId ? `${testId}-panel-${panel.key}` : undefined}>
        <div className="nf-explain__stage" aria-hidden="true">
          <span className="nf-explain__phone" />
          <div className="nf-explain__fragment" key={panel.key}>
            {panel.fragment}
          </div>
        </div>
        <div className="nf-explain__words" aria-live="polite">
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
        <Button variant="primary" size="lg" full onClick={() => (last ? setOpen(false) : setIndex(index + 1))} data-testid={testId ? `${testId}-next` : undefined}>
          {last ? "Got it" : "Next"}
        </Button>
      </div>
    </Sheet>
  );
}
