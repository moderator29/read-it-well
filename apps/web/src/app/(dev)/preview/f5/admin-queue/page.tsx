import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Logo } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AdminRail, AdminTabs, ConsoleSearch } from "@/app/admin/_components/AdminNav";
import { QueueFilters } from "@/app/admin/_components/QueueFilters";
import { adminUi } from "@/app/admin/_components/ui";
import {
  ConsoleFooter,
  QueueTable,
  QueueTabs,
} from "@/app/admin/_components/QueueTable";
import { PERSON } from "../../_fixtures/people";
import { ADMIN_ROWS } from "../fixtures";

/**
 * 278CC66A at 390px and CDA4B82B at desktop: the console frame around the
 * queue, from fixture rows. The real layout gates on `requireAdmin`, so the
 * chrome is repeated here from the same pieces; the rows are fixtures and
 * carry no fold, because a fold's detail is a desk's real card.
 */
export const dynamic = "force-dynamic";

const COUNTS = { listings: 18, applications: 5, reports: 3, tickets: 3, flags: 6, moderation: 2, alerts: 4 };

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
    <div className="nf-admin">
      <aside className="nf-admin-rail" aria-label={t.admin.console.navLabel}>
        <div className="nf-admin-rail__brand">
          <Link href="/" aria-label={t.a11y.logoHome}>
            <Logo size={38} wordSize={19} />
          </Link>
        </div>
        <div className="nf-admin-rail__scroll">
          <AdminRail counts={COUNTS} labels={t.admin.nav} navLabel={t.admin.console.navLabel} />
        </div>
        <div className="nf-admin-rail__foot">
          <span className="nf-admin-rail__foot-mark" aria-hidden="true">
            <BrandIcon name="office-space" fill />
          </span>
          <span className="min-w-0">
            <span className="block nf-body-sm font-semibold text-[var(--nf-content-primary)]">
              {t.admin.console.title}
            </span>
            <span className="block nf-caption">Operations Console</span>
          </span>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
          <div className="nf-admin-bar">
            <span className="nf-icon-btn h-9 w-9 sm:h-10 sm:w-10" aria-hidden="true">
              <UiIcon name="arrow-left" size={20} />
            </span>
            <Link href="/" className="lg:hidden" aria-label={t.a11y.logoHome}>
              <Logo size={30} wordSize={16} />
            </Link>
            <ConsoleSearch label={t.admin.common.searchLabel} placeholder={t.admin.common.searchPlaceholder} />
            <span className="flex-1 lg:hidden" />
            <span className="nf-icon-btn h-10 w-10" aria-hidden="true">
              <UiIcon name="bell" size={20} />
            </span>
            <span className="nf-admin-bar__person">
              <span className="nf-admin-bar__avatar" aria-hidden="true">
                {PERSON.name.charAt(0)}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block nf-caption font-semibold text-[var(--nf-content-primary)]">{PERSON.name}</span>
                <span className="block nf-caption">Admin</span>
              </span>
            </span>
          </div>
          <div className="px-gutter">
            <AdminTabs counts={COUNTS} labels={t.admin.nav} navLabel={t.admin.console.navLabel} />
          </div>
        </header>

        <div className="nf-admin-body">
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
        </div>
      </main>
    </div>
  );
}
