import type { AuditActivity } from "@/lib/admin/audit-queries";
import { entityTypeLabel } from "@/lib/admin/audit-filter";
import { Bars } from "@/components/ui/charts/Bars";
import { TimeSeries } from "@/components/ui/charts/TimeSeries";

/**
 * The console's first charts, and they are here rather than on the overview
 * for one reason: `audit_log` is the only table on this platform with real
 * history. It held 482 rows when the queue frame was built, while
 * `agent_applications`, `reports`, `risk_alerts`, `message_flags`, `escrows`,
 * `bookings` and `transactions` held zero between them.
 *
 * SO THE OVERVIEW TREND IS REFUSED, AND THAT REFUSAL IS THE POINT.
 * `getQueueCounts()` is a point-in-time read: seven exact counts of what is
 * waiting RIGHT NOW. There is no history behind it, so a line drawn from it
 * would be a shape invented out of one number, and an operator would read a
 * trend off it and act on it. That is rule 15 on the operator's own desk,
 * which is the worst place on the platform to break it, because this is the
 * screen people come to in order to find out what is true. The overview gets
 * its trend the day a `queue_snapshots` table exists and a scheduled job
 * writes to it, and not one day before.
 *
 * WHAT THESE THREE ARE ALLOWED TO CLAIM. `getAuditActivity` reads its own
 * window, unfiltered, with every day present including the empty ones, and
 * reports whether it hit its cap. So "actions per day" means actions per day,
 * not "actions per day among the rows currently on screen", and a quiet
 * fortnight draws as a quiet fortnight rather than being compressed out of
 * existence.
 *
 * ALL THREE ARE SINGLE SERIES, which is not a limitation worked around: every
 * question this desk asks is a magnitude question, and a single-hue sequential
 * ramp is the right encoding for magnitude. See `components/ui/charts/palette.ts` for why a
 * four slot categorical palette cannot exist inside our colour law at all.
 */
export function AuditCharts({
  activity,
  copy,
}: {
  activity: AuditActivity;
  copy: {
    perDay: string;
    byKind: string;
    byActor: string;
    rest: string;
    capped: string;
    window: string;
  };
}) {
  /*
   * Nothing recorded in the window means no charts. An axis with a flat line
   * on it at zero is a drawing of an event that did not happen, and the desk's
   * own empty state already says the true thing.
   */
  if (activity.total === 0) return null;

  const caveat = activity.capped
    ? copy.capped.replace("{count}", String(activity.total))
    : undefined;

  return (
    <div className="mb-block grid gap-row lg:grid-cols-2">
      <section className="nf-card p-card lg:col-span-2">
        <h2 className="nf-overline">
          {copy.perDay} · {copy.window.replace("{count}", String(activity.windowDays))}
        </h2>
        <div className="mt-sm">
          <TimeSeries
            points={activity.perDay}
            label={copy.perDay}
            {...(caveat ? { caveat } : {})}
          />
        </div>
      </section>

      <section className="nf-card p-card">
        <h2 className="nf-overline">{copy.byKind}</h2>
        <div className="mt-sm">
          {/* The machine value never reaches the screen: `entityTypeLabel` is
              the same map the tabs and the rows already read, so one target
              type is called one thing on this desk. A raw database enum used
              as a UI label is its own defect and the research counts one. */}
          <Bars
            label={copy.byKind}
            restLabel={copy.rest}
            bars={activity.byKind.map((row) => ({
              label: entityTypeLabel(row.label),
              count: row.count,
            }))}
          />
        </div>
      </section>

      <section className="nf-card p-card">
        <h2 className="nf-overline">{copy.byActor}</h2>
        <div className="mt-sm">
          {/* Display names only, never an id and never an address. Rule 16
              holds in a picture exactly as it holds in a row. */}
          <Bars label={copy.byActor} restLabel={copy.rest} bars={activity.byActor} />
        </div>
      </section>
    </div>
  );
}
