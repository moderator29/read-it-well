import type { Metadata } from "next";
import { formatNumber, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readCallUsage } from "@/lib/admin/desk-reads/call-usage-read";
import { connectRate, readCallUsageRange } from "@/lib/admin/desk-reads/call-usage";
import { adminUi } from "../_components/ui";
import { fill } from "../_components/copy";
import { RangeSelect } from "../_components/RangeSelect";
import { PageHead, Panel, PanelEmpty, PanelUnavailable } from "../_components/panels";

export const metadata: Metadata = { title: "Call usage", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * VIDEO CALL USAGE for staff. `call_usage_summary(from, to)` (operations
 * scope) totals the calls in a window by state and kind, with the connect
 * rate, the estimated and the provider-reconciled participant minutes, the
 * average length and setup time, and how many calls reconnected. The range
 * lives in the URL so a reload or a shared link keeps it.
 */
export default async function CallUsagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const c = t.adminCoverage.callUsage;
  const common = t.adminCoverage.common;
  const ui = adminUi(t, locale);
  const range = readCallUsageRange((await searchParams)["range"]);
  const read = await readCallUsage(range);

  if (read.state === "forbidden") {
    return (
      <div className="nf-admin-stack">
        <PageHead title={c.title} lede={common.noAccessBody} />
        <PanelEmpty title={common.noAccessTitle} body={common.noAccessBody} />
      </div>
    );
  }

  const n = (value: number) => formatNumber(value, locale);
  const seconds = (value: number | null) => (value === null ? c.none : fill(c.seconds, { count: n(value) }));
  const minutes = (value: number | null, none: string) => (value === null ? none : fill(c.minutes, { count: n(value) }));
  const stateNames = c.state as Record<string, string | undefined>;

  return (
    <div className="nf-admin-stack" data-testid="call-usage">
      <PageHead
        title={c.title}
        lede={c.lede}
        action={<RangeSelect value={range} options={c.range} short={c.rangeShort} label={c.rangeLabel} />}
      />
      {read.state !== "ok" ? (
        <Panel>
          <PanelUnavailable what={c.title} locale={locale} />
        </Panel>
      ) : read.usage.total === 0 ? (
        <Panel>
          <PanelEmpty title={c.emptyTitle} body={c.emptyBody} />
        </Panel>
      ) : (
        <>
          <ui.StatRow>
            <ui.Stat label={c.total} value={String(read.usage.total)} hint={`${c.video} ${n(read.usage.video)} · ${c.audio} ${n(read.usage.audio)}`} />
            <ui.Stat
              label={c.connected}
              value={String(read.usage.connected)}
              hint={fill(c.connectedHint, { rate: `${connectRate(read.usage) ?? 0}%` })}
            />
            <ui.Stat label={c.reviewCalls} value={String(read.usage.reviewCalls)} />
            <ui.Stat label={c.estimated} value={minutes(read.usage.estimatedMinutes, c.none)} hint={c.estimatedHint} />
            <ui.Stat label={c.reconciled} value={minutes(read.usage.reconciledMinutes, c.reconciledNone)} hint={c.reconciledHint} />
            <ui.Stat label={c.averageDuration} value={seconds(read.usage.averageDurationSeconds)} />
            <ui.Stat label={c.averageSetup} value={seconds(read.usage.averageSetupSeconds)} hint={c.averageSetupHint} />
            <ui.Stat label={c.accepted} value={String(read.usage.accepted)} />
            <ui.Stat
              label={c.reconnects}
              value={String(read.usage.withReconnects)}
              tone={read.usage.withReconnects > 0 ? "warning" : "neutral"}
            />
          </ui.StatRow>
          <Panel title={c.byState} id="call-usage-states" flush>
            <div className="nf-admin-dt-wrap" tabIndex={0} role="region" aria-label={fill(common.tableOf, { name: c.byState })}>
              <table className="nf-admin-dt">
                <thead>
                  <tr>
                    <th scope="col">{c.stateColumn}</th>
                    <th scope="col" className="text-right">
                      {c.countColumn}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {read.usage.byState.map((row) => (
                    <tr key={row.state}>
                      <td>{stateNames[row.state] ?? row.state}</td>
                      <td className="text-right tabular-nums">{n(row.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
