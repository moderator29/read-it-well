import type { Dictionary, Locale } from "@vallo/i18n/core";
import { Gauge, type GaugeStage } from "@/components/ui/charts/Gauge";
import type { ChartTone } from "@/components/ui/charts/palette";
import { DESKS, type OverviewCounts } from "./ConsoleOverview";
import { Panel } from "./panels";

/**
 * THE PIPELINE GAUGE (plan item 14, spec 13.1's console row).
 *
 * It draws the seven counts `getQueueCounts` already returns, the same exact
 * `count: "exact"` reads the rail's badges and the overview's queue figures
 * show, so they can never disagree. The gauge shares the queue out between the
 * desks. The "needs attention" list that used to sit beside it is the queue
 * figures now (`QueueFigures`), which lead the page. When the counts could not
 * be read the page passes nothing and the gauge is not drawn: an operator who
 * sees zeroes goes home.
 */
const TONE: Record<keyof OverviewCounts, ChartTone> = {
  flags: "error",
  moderation: "warning",
  reports: "warning",
  alerts: "error",
  applications: "info",
  listings: "brand",
  tickets: "neutral",
};

export function QueueByDesk({
  t,
  locale,
  counts,
}: {
  t: Dictionary;
  locale: Locale;
  counts: OverviewCounts;
}) {
  const o = t.admin.overview;
  const d = t.desk;
  const tag = locale === "en" ? "en-NG" : locale;
  const total = DESKS.reduce((sum, desk) => sum + counts[desk.key], 0);
  if (total === 0) return null;
  const stages: GaugeStage[] = DESKS.map((desk) => ({
    key: desk.key,
    label: o.tiles[desk.key].label,
    count: counts[desk.key],
    tone: TONE[desk.key],
  }));
  return (
    <Panel id="ov-queue" title={d.admin.pipeline}>
      <Gauge stages={stages} totalLabel={d.admin.pipelineTotal} label={d.admin.pipeline} tag={tag} />
    </Panel>
  );
}
