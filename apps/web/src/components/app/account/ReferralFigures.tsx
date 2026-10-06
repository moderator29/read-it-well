import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import { Amount, Figure } from "@/components/ui/Amount";
import { Progress } from "@/components/ui/Progress";
import "./referral.css";

/**
 * EARNED TO DATE AND PROGRESS TO THE NEXT REWARD, AS FIGURES, FROM REAL DATA
 * ONLY (north star motion 4; the founder's honesty rule).
 *
 * Each figure draws only when the caller has a real number for it. A null
 * earned total draws no earned figure (it never says "₦0", because "nothing
 * recorded" and "zero earned" are different statements), and a null progress
 * draws no bar. When both are null the component draws nothing at all, and the
 * hub shows its honest rows instead. Today the caller always passes null: no
 * reward or ledger exists (`referral-reads.ts`).
 *
 * Money goes through `Amount` (naira, tabular, counting up once on arrival);
 * the count goes through `Figure`. The labels sit above, quiet, per the type
 * scale. No urgency, no countdown, no "limited" anything: reference 7055's
 * urgency chips are the refused part of that reference.
 */
type Copy = Dictionary["experienceAccount"]["invite"];

export function ReferralFigures({
  copy,
  locale,
  earnedMinor,
  progress,
}: {
  copy: Copy;
  locale: Locale;
  earnedMinor: number | null;
  progress: { done: number; total: number } | null;
}) {
  const showEarned = earnedMinor !== null && Number.isFinite(earnedMinor) && earnedMinor >= 0;
  const showProgress = progress !== null && progress.total > 0 && progress.done >= 0;
  if (!showEarned && !showProgress) return null;

  return (
    <section className="nf-panel nf-panel--card nf-panel--figure nf-refig" data-testid="referral-figures">
      {showEarned ? (
        <div className="nf-refig__cell">
          <p className="nf-refig__label">{copy.earnedLabel}</p>
          <p className="nf-refig__value">
            <Amount minorUnits={earnedMinor} locale={locale} showFraction count />
          </p>
        </div>
      ) : null}
      {showProgress && progress ? (
        <div className="nf-refig__cell">
          <p className="nf-refig__label">{copy.progressLabel}</p>
          <p className="nf-refig__value">
            <Figure value={progress.done} locale={locale} suffix={copy.progressSuffix.replace("{total}", formatNumber(progress.total, locale))} count />
          </p>
          <Progress
            value={progress.done}
            max={progress.total}
            label={copy.progressLabel}
            valueText={copy.progressOf
              .replace("{done}", formatNumber(progress.done, locale))
              .replace("{total}", formatNumber(progress.total, locale))}
            size="sm"
            locale={locale}
          />
        </div>
      ) : null}
    </section>
  );
}
