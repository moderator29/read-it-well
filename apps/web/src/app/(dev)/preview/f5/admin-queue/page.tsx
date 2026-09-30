import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { QueueFilters } from "@/app/admin/_components/QueueFilters";
import { adminUi } from "@/app/admin/_components/ui";
import {
  ConsoleFooter,
  QueueTable,
  QueueTabs,
} from "@/app/admin/_components/QueueTable";
import { AdminPreviewFrame, PREVIEW_COUNTS } from "../AdminPreviewFrame";
import { ADMIN_ROWS } from "../fixtures";

/**
 * 278CC66A at 390px and CDA4B82B at desktop: the console frame around the
 * queue, from fixture rows. The real layout gates on `requireAdmin`, so the
 * chrome is repeated here from the same pieces; the rows are fixtures and
 * carry no fold, because a fold's detail is a desk's real card.
 */
export const dynamic = "force-dynamic";

const COUNTS = PREVIEW_COUNTS;

export default async function PreviewAdminQueue() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);
  const total = 42;
  const statuses = [
    { value: "PENDING", label: "Pending" },
    { value: "UNDER_REVIEW", label: "In review" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

  return (
    <AdminPreviewFrame t={t}>
          <div className="nf-console">
            {/* The QUEUE's own name, not the overview's. They were one screen and one
                heading until the founder's item 5 split them; this preview draws
                the queue, so it says so. */}
            <ui.QueueHeader
              title={t.admin.overview.queueTitle}
              lede={t.admin.overview.queueLede}
              count={total}
            />
            <QueueTabs
              label="Queues"
              tabs={[
                { key: "all", label: "All", href: "#", count: total, on: true },
                { key: "listings", label: "Listings", href: "#", count: COUNTS.listings },
                { key: "bookings", label: "Bookings", href: "#", count: 7 },
                { key: "users", label: "Agents", href: "#", count: COUNTS.applications },
                { key: "reports", label: "Reports", href: "#", count: COUNTS.reports },
                { key: "support", label: "Support", href: "#", count: COUNTS.tickets },
              ]}
            />
            <QueueFilters base="/preview/f5/admin-queue" query={{}} common={t.admin.common} statuses={statuses} />
            <QueueTable rows={ADMIN_ROWS} label="Admin queue" />
            <nav aria-label="Queue pages" className="nf-admin-pager">
              <div className="nf-admin-pager__pages">
                <span className="nf-admin-pager__page" aria-disabled="true">
                  <UiIcon name="chevron-right" size={16} className="rotate-180" />
                </span>
                <span className="nf-admin-pager__page nf-admin-pager__page--on" aria-current="page">1</span>
                <span className="nf-admin-pager__page">2</span>
                <span className="nf-admin-pager__page">3</span>
                <span className="nf-admin-pager__page">
                  <UiIcon name="chevron-right" size={16} />
                </span>
              </div>
              <p className="nf-admin-pager__count">Showing 1 to 10 of {total}</p>
            </nav>
          </div>
          <ConsoleFooter note={t.admin.console.auditNote} />
    </AdminPreviewFrame>
  );
}
