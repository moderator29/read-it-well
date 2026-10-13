"use client";

import { useId, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { Odometer } from "@/components/ui/Odometer";
import { PeriodBars } from "@/components/ui/charts/PeriodBars";
import { StatusBar } from "@/components/ui/charts/StatusBar";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import type { SpaceRange } from "./space-model";
import type { RangeView } from "./range-view";

/**
 * ONE FIGURE, ITS PERIOD, ONE CHART (north star 16.6; reference 7065, with
 * 7083's hatched slots for the thin months).
 *
 * The analytics overview and each bookings metric's inner page are this
 * card: the period control, the headline figure, one chart from the chart
 * system, then the rows the same period scopes. The control offers only the
 * periods the server built a view for, which are only the periods the
 * figure's source can answer (`rangesFor`); a figure with one period draws
 * that period as words instead of a control with one segment.
 *
 * THE MOTION IS THE CHANGE (MOTION_SYSTEM "Odometer change", "Chart morph
 * between periods"). A new period rolls only the digits that changed
 * (`Odometer`, land 380ms), and the bars move to their new heights where the
 * periods share a key and grow from the baseline where they do not
 * (`PeriodBars`, 380ms and 620ms on the glide). The thumb springs between
 * segments (`Segmented`, drift 240ms). Nothing loops; reduced motion, Calm
 * and Off land everything at once through the primitives' own gates.
 *
 * The period is mirrored into the address (`?range=`) with replaceState, so
 * a reload or a shared link opens on the same period and the back button is
 * not filled with one entry per tap.
 */
export function RangeSwitch({
  views,
  initial,
  periodLabel,
  caption,
  rowsLabel,
  testId,
}: {
  views: RangeView[];
  initial: SpaceRange;
  /** The control's accessible name ("Period"). */
  periodLabel: string;
  /** What the figure counts ("Booking requests"). */
  caption: string;
  /** The heading over the rows, when there are any. */
  rowsLabel?: string;
  testId?: string;
}) {
  const id = useId();
  const [range, setRange] = useState<SpaceRange>(initial);
  const view = views.find((v) => v.range === range) ?? views[0];
  if (!view) return null;

  const choose = (next: SpaceRange) => {
    setRange(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("range", next);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      /* A sandboxed frame that refuses history writes keeps the period in
         state only; nothing else depends on the address. */
    }
  };

  return (
    <section
      className="nf-panel nf-panel--card nf-panel--figure block p-md sm:p-panel"
      aria-labelledby={`${id}-caption`}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 id={`${id}-caption`} className="nf-section-label">
          {caption}
        </h2>
        {views.length > 1 ? (
          <Segmented
            options={views.map((v) => ({ value: v.range, label: v.tab }))}
            value={view.range}
            onChange={choose}
            size="sm"
            label={periodLabel}
          />
        ) : (
          <p className="nf-caption text-[var(--nf-content-secondary)]">{view.span}</p>
        )}
      </div>

      <div className="mt-sm" aria-live="polite">
        {view.figure !== null ? (
          <p className="text-[length:var(--nf-text-figure)] font-semibold leading-none tracking-tight text-[var(--nf-content-primary)]">
            <Odometer value={view.figure} />
          </p>
        ) : (
          <p className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-muted)]">
            {view.figureAbsent}
          </p>
        )}
        <p className="nf-caption mt-2xs text-[var(--nf-content-secondary)]">
          {views.length > 1 ? view.span : null}
          {views.length > 1 && view.sub ? " · " : null}
          {view.sub}
        </p>
      </div>

      {view.chart?.kind === "bars" ? (
        <PeriodBars
          className="mt-md"
          points={view.chart.points}
          yTicks={view.chart.yTicks}
          label={view.chart.label}
          {...(view.chart.summary ? { summary: view.chart.summary } : {})}
          periodHead={view.chart.periodHead}
          valueHead={view.chart.valueHead}
          nullLabel={view.chart.nullLabel}
          empty={view.chart.empty}
          emphasis="peak"
        />
      ) : view.chart?.kind === "share" ? (
        <StatusBar className="mt-md" label={view.chart.label} segments={view.chart.segments} />
      ) : null}

      {view.note ? (
        <p className="nf-caption mt-sm max-w-[68ch] text-[var(--nf-content-secondary)]">{view.note}</p>
      ) : null}

      {view.rows.length > 0 ? (
        <ListGroup className="mt-md" label={rowsLabel}>
          {view.rows.map((row) => (
            <ListRow
              key={row.key}
              title={row.title}
              {...(row.sub ? { sub: row.sub } : {})}
              value={
                row.value !== null ? (
                  <span
                    className={
                      row.alarm
                        ? "nf-numeric font-semibold text-[var(--nf-state-error)]"
                        : "nf-numeric font-semibold text-[var(--nf-content-primary)]"
                    }
                  >
                    {row.value}
                  </span>
                ) : (
                  <span className="nf-caption font-normal text-[var(--nf-content-muted)]">{row.absent}</span>
                )
              }
              {...(row.href ? { href: row.href, chevron: true } : {})}
            />
          ))}
        </ListGroup>
      ) : null}
    </section>
  );
}
