import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getAuditLog } from "@/lib/admin/audit-queries";
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
  const log = await getAuditLog({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.offset ? { offset: query.offset } : {}),
  });

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
