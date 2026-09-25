"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { wizardPriceGuide } from "@/lib/price-check/wizard-actions";
import { guideLines, type FeeNorms, type Guide, type GuideSubject } from "@/lib/price-check/wizard-guide";

/**
 * V-74: THE PRICING STEP'S GUIDE. A hook that asks once per change of WHAT is
 * being priced (never per keystroke of the rent, which the range does not
 * depend on), and the panel that prints it.
 *
 * Every state is drawn: looking (a quiet line, not a spinner over the form),
 * the range, each refusal in its own words, and a failed read that says the
 * listing is not affected. The panel never blocks the step and never changes
 * a field: it is guidance beside the figure, and the figure is the lister's.
 */

type Copy = Dictionary["frontDoor"]["guide"];

type Settled = { key: string; guide: Guide; norms: FeeNorms | null };

export function usePriceGuide(subject: GuideSubject, enabled: boolean) {
  const key = useMemo(() => JSON.stringify(subject), [subject]);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    /* A short pause so choosing "3" after "2" bedrooms asks once, not twice. */
    const timer = setTimeout(() => {
      wizardPriceGuide(JSON.parse(key))
        .then((result) => {
          if (!live) return;
          setSettled(
            result.ok
              ? { key, guide: result.data.guide, norms: result.data.norms }
              : { key, guide: { kind: "unreachable" }, norms: null },
          );
        })
        .catch(() => {
          if (live) setSettled({ key, guide: { kind: "unreachable" }, norms: null });
        });
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key, enabled]);

  const current = settled !== null && settled.key === key ? settled : null;
  return { loading: enabled && current === null, guide: current?.guide ?? null, norms: current?.norms ?? null };
}

export function PriceGuidePanel({
  subject,
  loading,
  guide,
  copy,
  locale,
}: {
  subject: GuideSubject;
  loading: boolean;
  guide: Guide | null;
  copy: Copy;
  locale: Locale;
}) {
  const lines = guide ? guideLines(subject, guide, copy, locale) : null;
  return (
    <section className="nf-panel nf-panel--card block p-card" aria-live="polite" data-testid="price-guide">
      <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">{copy.title}</p>
      {loading || lines === null ? (
        <p className="nf-body-sm mt-inline-tight text-[var(--nf-content-muted)]" data-testid="price-guide-loading">
          {copy.loading}
        </p>
      ) : (
        <>
          <p
            className={`nf-body-sm mt-inline-tight leading-relaxed ${
              guide?.kind === "asking" ? "text-[var(--nf-content-primary)]" : "text-[var(--nf-content-secondary)]"
            }`}
            data-testid={guide?.kind === "asking" ? "price-guide-range" : "price-guide-refusal"}
          >
            {lines.headline}
          </p>
          {lines.basis && <p className="nf-caption mt-inline-tight text-[var(--nf-content-muted)]">{lines.basis}</p>}
        </>
      )}
    </section>
  );
}
