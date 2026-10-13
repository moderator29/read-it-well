import type { Locale } from "@vallo/i18n/core";
import { TIMELINE_EMPTY, TIMELINE_NEXT, TIMELINE_TITLE } from "@/lib/money/copy";
import { timelineSteps } from "@/lib/money/timeline";
import type { MoneyViewer, TimelineEvent } from "@/lib/money/vallo";
import "@/app/css/money-layer.css";

/**
 * THE TRANSACTION TIMELINE IN HUMAN SENTENCES (D50).
 *
 * Each step is one sentence from `TIMELINE_SENTENCE` for the reader's side,
 * with its Lagos time under it. A status name never reaches the screen. The
 * one step still to come, when the caller knows it (the rail's release
 * condition), is drawn last and hollow under "Next": a plan, not an event.
 * Server-safe.
 */
export function TransactionTimeline({
  events,
  viewer,
  locale,
  currency,
  next,
  headingLevel = "h2",
  id = "nf-timeline",
}: {
  events: readonly TimelineEvent[];
  viewer: MoneyViewer;
  locale: Locale;
  currency?: string;
  /** The one step still to come, already worded, or null. */
  next?: string | null;
  headingLevel?: "h2" | "h3";
  /** Unique per page when more than one timeline is drawn. */
  id?: string;
}) {
  const steps = timelineSteps(events, viewer, locale, currency);
  const Heading = headingLevel;
  return (
    <section aria-labelledby={`${id}-title`} data-testid="transaction-timeline">
      <Heading id={`${id}-title`} className="nf-overline text-[var(--nf-content-muted)]">
        {TIMELINE_TITLE}
      </Heading>
      {steps.length === 0 && !next ? (
        <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">{TIMELINE_EMPTY}</p>
      ) : (
        <ol className="nf-timeline mt-row">
          {steps.map((step) => (
            <li key={step.key} className="nf-timeline__step" data-done="true" data-tone={step.tone}>
              <p className="nf-body-sm text-[var(--nf-content-primary)]">{step.sentence}</p>
              {step.when ? <p className="nf-caption mt-3xs text-[var(--nf-content-muted)]">{step.when}</p> : null}
            </li>
          ))}
          {next ? (
            <li className="nf-timeline__step" data-done="false" data-testid="timeline-next">
              <p className="nf-caption text-[var(--nf-content-muted)]">{TIMELINE_NEXT}</p>
              <p className="nf-body-sm text-[var(--nf-content-secondary)]">{next}</p>
            </li>
          ) : null}
        </ol>
      )}
    </section>
  );
}
