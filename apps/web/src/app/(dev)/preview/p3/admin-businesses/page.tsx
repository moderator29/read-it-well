import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Logo } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AdminRail, AdminTabs, ConsoleSearch } from "@/app/admin/_components/AdminNav";
import { ConsoleFooter } from "@/app/admin/_components/QueueTable";
import { QueueFilters } from "@/app/admin/_components/QueueFilters";
import { adminUi } from "@/app/admin/_components/ui";
import { BusinessCard } from "@/app/admin/businesses/BusinessCard";
import { BUSINESS_STATUSES } from "@/lib/admin/business-queries";
import { PERSON } from "../../_fixtures/people";
import { P3_BUSINESS, P3_BUSINESS_APPROVED } from "../fixtures";

/**
 * The host applications desk, from fixture rows.
 *
 * The real route gates on `requireAdmin`, and this sandbox has no session, so
 * the console chrome is rebuilt here from the same pieces the layout uses and
 * the card below is the real one. Two rows on purpose: one venue waiting to be
 * read with three things missing, and one approved venue sitting on the shelf
 * gate with its identity rung already passed, because those are the two states
 * the desk exists for and a proof of only the first would say nothing about
 * the publish control.
 */
export const dynamic = "force-dynamic";

const COUNTS = { listings: 18, applications: 5, reports: 3, tickets: 3, flags: 6, moderation: 2, alerts: 4 };

export default async function PreviewAdminBusinesses() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

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
            <Link href="/" className="nf-tap lg:hidden" aria-label={t.a11y.logoHome}>
              <Logo size={30} wordSize={16} />
            </Link>
            <ConsoleSearch
              label={t.admin.common.searchLabel}
              placeholder={t.admin.common.searchPlaceholder}
            />
            <span className="flex-1 lg:hidden" />
            <span className="nf-icon-btn h-10 w-10" aria-hidden="true">
              <UiIcon name="bell" size={20} />
            </span>
            <span className="nf-admin-bar__person">
              <span className="nf-admin-bar__avatar" aria-hidden="true">
                {PERSON.name.charAt(0)}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block nf-caption font-semibold text-[var(--nf-content-primary)]">
                  {PERSON.name}
                </span>
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
            <ui.QueueHeader
              title="Businesses"
              lede="Host applications, the four verification rungs, and the decision that puts a venue in front of guests. A refusal and a change request carry your words to the host exactly as you type them."
              count={2}
            />
            <QueueFilters
              base="/preview/p3/admin-businesses"
              query={{}}
              common={t.admin.common}
              statuses={BUSINESS_STATUSES.map((value) => ({ value, label: ui.statusLabel(value) }))}
              searchPlaceholder="Search by name or city"
            />
            <ul className="nf-queue-list">
              <BusinessCard row={P3_BUSINESS} ui={ui} />
              <BusinessCard row={P3_BUSINESS_APPROVED} ui={ui} />
            </ul>
          </div>
          <ConsoleFooter note={t.admin.console.auditNote} />
        </div>
      </main>
    </div>
  );
}
