import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { HeroBand } from "@/components/ui/HeroBand";
import { KpiTile } from "@/components/ui/KpiTile";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate } from "@/components/ui/IconPlate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Gauge, type GaugeStage } from "@/components/ui/charts/Gauge";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { HOST_STATUS_WORD, type HostToday, type TodayAttention } from "./today";

/**
 * THE HOST WORKSPACE HOME, DRAWN (plan item 14, spec 13, reference 38 on a
 * desk and reference 31 on a phone).
 *
 * The navy hero band opens it (the founder's widened Q2): the date, "Today",
 * the one action, and the four KPI tiles sitting on the band. Under it the
 * "Needs attention" group and the reservations gauge side by side from
 * 1024px, stacked on a phone. Every figure is one `hostToday` computed from
 * the host's own rows; a tile whose source could not be read is not drawn,
 * a gauge with nothing to count is left out, and no tile carries a delta
 * chip because no figure here has a measured previous period.
 */

const KPI_ICON: Record<string, UiIconName> = {
  arriving: "key",
  staying: "bed",
  requests: "calendar-clock",
  unread: "chat-bubble",
};

const ATTENTION_ICON: Record<TodayAttention["kind"], UiIconName> = {
  request: "bed",
  table: "utensils",
  draft: "file-text",
  stopped: "alert-triangle",
};

export function HostTodayView({
  today,
  t,
  locale,
  sub,
  action,
  children,
}: {
  today: HostToday;
  t: Dictionary;
  locale: Locale;
  /** The line under "Today": how many businesses, or where to start. */
  sub: string;
  /** The one primary action. */
  action: ReactNode;
  /** The rest of the page: the application in progress, the businesses. */
  children?: ReactNode;
}) {
  const d = t.desk;
  const tag = locale === "en" ? "en-NG" : locale;
  const dateLine = new Intl.DateTimeFormat(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${today.day}T12:00:00Z`));

  const stages: GaugeStage[] = today.stages.map((stage) => ({
    key: stage.key,
    label: d.host.stage[stage.key === "staying" ? "checkedIn" : stage.key],
    count: stage.count,
    tone:
      stage.key === "requested"
        ? "warning"
        : stage.key === "confirmed"
          ? "brand"
          : stage.key === "staying"
            ? "success"
            : "neutral",
  }));

  const shown = today.attention.slice(0, 5);

  return (
    <div className="nf-desk-home">
      <HeroBand label={dateLine} title={d.today.title} sub={sub} action={action}>
        {today.kpis.length > 0 ? (
          <div className="nf-desk-kpis">
            {today.kpis.map((kpi) => (
              <KpiTile
                key={kpi.key}
                label={d.host.kpi[kpi.key]}
                icon={KPI_ICON[kpi.key]}
                value={kpi.value}
                href={kpi.href}
                tag={tag}
              />
            ))}
          </div>
        ) : null}
      </HeroBand>

      {shown.length > 0 || stages.length > 0 ? (
        <div className="nf-desk-grid">
          {shown.length > 0 ? (
            <ListGroup
              label={d.today.needsAttention}
              action={
                today.attention.length > shown.length ? (
                  <Link href="/host/bookings" className="nf-link-quiet">
                    {d.today.viewAll.replace("{count}", String(today.attention.length))}
                  </Link>
                ) : undefined
              }
            >
              {shown.map((item) => (
                <AttentionRow key={item.key} item={item} t={t} tag={tag} />
              ))}
            </ListGroup>
          ) : null}
          {stages.length > 0 ? (
            <section className="nf-list-section">
              <div className="nf-list-section__head">
                <h3 className="nf-section-label">{d.host.pipeline}</h3>
              </div>
              <div className="nf-desk-card">
                <Gauge stages={stages} totalLabel={d.host.pipelineTotal} label={d.host.pipeline} tag={tag} />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {children}
    </div>
  );
}

function AttentionRow({ item, t, tag }: { item: TodayAttention; t: Dictionary; tag: string }) {
  const a = t.desk.host.attention;
  let title = item.title;
  let sub = item.sub;
  let badge: ReactNode = null;
  if (item.kind === "request") {
    sub = a.request.replace("{guest}", item.sub);
  } else if (item.kind === "table") {
    const at = new Date(item.sub);
    title = Number.isFinite(at.getTime())
      ? new Intl.DateTimeFormat(tag, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Africa/Lagos",
        }).format(at)
      : item.title;
    sub = a.table.replace("{guest}", item.title);
  } else if (item.kind === "draft") {
    title = `${a.draft} · ${item.title}`;
    sub = a.draftSub.replace("{count}", item.sub);
  } else {
    title = item.title;
    sub = a.stopped;
    badge = (
      <StatusBadge tone={item.tone === "error" ? "error" : "warning"}>
        {HOST_STATUS_WORD[item.sub] ?? item.sub}
      </StatusBadge>
    );
  }
  return (
    <ListRow
      href={item.href}
      leading={
        <IconPlate size="sm" tone={item.tone === "neutral" ? "neutral" : item.tone}>
          <UiIcon name={ATTENTION_ICON[item.kind]} size={18} />
        </IconPlate>
      }
      title={title}
      sub={sub}
      status={badge}
      chevron={badge === null}
    />
  );
}
