import type { Dictionary, Locale } from "@vallo/i18n/core";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate } from "@/components/ui/IconPlate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Gauge, type GaugeStage } from "@/components/ui/charts/Gauge";
import type { ChartTone } from "@/components/ui/charts/palette";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { DESKS, type OverviewCounts } from "./ConsoleOverview";
import { Panel } from "./panels";

/**
 * THE QUEUE, BY DESK (plan item 14, spec 13.1's console row): "Needs
 * attention" and the pipeline gauge on the overview.
 *
 * Both draw the seven counts `getQueueCounts` already returns, the same exact
 * `count: "exact"` reads the rail's badges show, so the three can never
 * disagree. The attention list names the desks with work waiting, most
 * first; the gauge shares the queue out between them. A desk with nothing
 * waiting is left off the list (the gauge's legend still says 0, which is
 * true). When the counts could not be read the page passes nothing and
 * neither card is drawn: an operator who sees zeroes goes home.
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
  const waiting = DESKS.filter((desk) => counts[desk.key] > 0).sort((a, b) => counts[b.key] - counts[a.key]);
  const total = DESKS.reduce((sum, desk) => sum + counts[desk.key], 0);
  if (total === 0) return null;
  const stages: GaugeStage[] = DESKS.map((desk) => ({
    key: desk.key,
    label: o.tiles[desk.key].label,
    count: counts[desk.key],
    tone: TONE[desk.key],
  }));
  return (
    <div className="nf-admin-grid nf-admin-grid--wide-left">
      <Panel id="ov-attention" title={d.today.needsAttention}>
        <ListGroup bare>
          {waiting.map((desk) => (
            <ListRow
              key={desk.key}
              href={desk.href}
              leading={
                <IconPlate size="sm" tone={TONE[desk.key] === "error" ? "error" : TONE[desk.key] === "warning" ? "warning" : "neutral"}>
                  <UiIcon name={desk.icon} size={18} />
                </IconPlate>
              }
              title={o.tiles[desk.key].label}
              sub={o.tiles[desk.key].lede}
              status={
                <StatusBadge kind="count" className="nf-numeric">
                  {new Intl.NumberFormat(tag).format(counts[desk.key])}
                </StatusBadge>
              }
            />
          ))}
        </ListGroup>
      </Panel>
      <Panel id="ov-queue" title={d.admin.pipeline}>
        <Gauge stages={stages} totalLabel={d.admin.pipelineTotal} label={d.admin.pipeline} tag={tag} />
      </Panel>
    </div>
  );
}
