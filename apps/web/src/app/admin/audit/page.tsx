import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getAuditActivity, getAuditLog } from "@/lib/admin/audit-queries";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import {
  queueNoMatch,
  QueueFilters,
  QueuePager,
  queueNarrowed,
  readQueueQuery,
} from "../_components/QueueFilters";
import { QueueTabs } from "../_components/QueueTable";
import { adminUi } from "../_components/ui";
import { AUDIT_COPY as COPY, AuditList, auditTabs } from "./AuditList";
import { AuditCharts } from "./AuditCharts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * The audit log, on the console's one queue frame: the header, the
 * target-type tabs, the QueueFilters search and day range, the dense rows
 * from `AuditList`, the pager. The layout above this page has already
 * decided the reader is staff.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const params = await searchParams;
  const query = readQueueQuery(params);
  /*
   * The charts read their own window and are NOT narrowed by `query`. A chart
   * that silently followed the operator's search box would carry a caption
   * saying "actions per day" over a picture of one search's results. Read in
   * parallel with the page, because neither one waits on the other.
   */
  const [log, activity] = await Promise.all([
    getAuditLog({
      ...(query.q ? { q: query.q } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
      ...(query.offset ? { offset: query.offset } : {}),
    }),
    getAuditActivity(),
  ]);

  if (log.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title={COPY.title} lede={COPY.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const rows = log.data.rows;
  const narrowed = queueNarrowed(query) || (query.offset ?? 0) > 0;
  const noMatch = queueNoMatch(common);

  return (
    <div className="nf-console">
      <ui.QueueHeader title={COPY.title} lede={COPY.lede} />

      {/*
        The chart words come from the DICTIONARY and not from `AUDIT_COPY`.
        The desk's own vocabulary is English constants by a written decision
        (`AuditList.tsx:16`) because `Dictionary["admin"]` is another scope's
        closed type, and that decision stands for the existing strings. New
        ones do not get to inherit it: these six live in `uiCommon`, the
        namespace opened for exactly this, so the console's first charts are
        not also its next seventeen English literals.
      */}
      {activity.state === "ok" ? (
        <AuditCharts
          activity={activity.data}
          copy={{
            perDay: t.uiCommon.charts.actionsPerDay,
            byKind: t.uiCommon.charts.actionsByKind,
            byActor: t.uiCommon.charts.actionsByActor,
            rest: t.uiCommon.charts.everythingElse,
            capped: t.uiCommon.charts.cappedWindow,
            window: t.uiCommon.charts.lastDays,
          }}
        />
      ) : null}

      <QueueTabs label={COPY.tabsLabel} tabs={auditTabs(COPY.base, query)} />

      <QueueFilters
        base={COPY.base}
        query={query}
        common={common}
        statuses={[]}
        searchLabel={COPY.searchLabel}
        searchPlaceholder={COPY.searchPlaceholder}
      />

      {rows.length === 0 ? (
        <ui.QueueEmpty
          title={narrowed ? noMatch.title : COPY.emptyTitle}
          body={narrowed ? noMatch.body : COPY.emptyBody}
          state={narrowed ? "no-match" : "never"}
        />
      ) : (
        <AuditList rows={rows} ui={ui} base={COPY.base} />
      )}

      <QueuePager
        base={COPY.base}
        query={query}
        pageSize={QUEUE_PAGE_SIZE}
        full={log.data.full}
        count={rows.length}
      />
    </div>
  );
}
