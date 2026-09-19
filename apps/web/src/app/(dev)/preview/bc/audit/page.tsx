import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Logo, LogoMark } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AdminRail, AdminTabs, ConsoleSearch } from "@/app/admin/_components/AdminNav";
import { QueueFilters, QueuePager } from "@/app/admin/_components/QueueFilters";
import { ConsoleFooter } from "@/app/admin/_components/QueueTable";
import { adminUi } from "@/app/admin/_components/ui";
import { AUDIT_COPY, AuditList } from "@/app/admin/audit/AuditList";
import { AUDIT_ENTITY_TYPES } from "@/lib/admin/audit-filter";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import { PERSON } from "../../_fixtures/people";
import { AUDIT_ROWS } from "../fixtures";

/**
 * The audit desk on the console frame (278CC66A at 390px), from fixture
 * rows. The real layout gates on `requireAdmin` and the real page reads
 * `audit_log` through the service role, neither of which this sandbox has,
 * so the chrome is repeated here from the same pieces F5's admin-queue
 * preview uses and the rows come from `../fixtures`. The list itself is the
 * desk's own `AuditList`, so what is screenshotted is what the desk draws.
 */
export const dynamic = "force-dynamic";

const BASE = "/preview/bc/audit";
const COUNTS = { listings: 18, applications: 5, reports: 3, tickets: 3, flags: 6, moderation: 2, alerts: 4 };

export default async function PreviewAudit() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);
  const statuses = AUDIT_ENTITY_TYPES.map((type) => ({ value: type.value, label: type.label }));

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
              <LogoMark size={30} />
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
            <ui.QueueHeader title={AUDIT_COPY.title} lede={AUDIT_COPY.lede} />
            <QueueFilters
              base={BASE}
              query={{}}
              common={t.admin.common}
              statuses={statuses}
              searchLabel={AUDIT_COPY.searchLabel}
              searchPlaceholder={AUDIT_COPY.searchPlaceholder}
            />
            <AuditList rows={AUDIT_ROWS} ui={ui} base={BASE} />
            <QueuePager base={BASE} query={{}} pageSize={QUEUE_PAGE_SIZE} full count={AUDIT_ROWS.length} />
          </div>
          <ConsoleFooter note={t.admin.console.auditNote} />
        </div>
      </main>
    </div>
  );
}
