import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Logo } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AdminRail, AdminTabs, ConsoleSearch } from "@/app/admin/_components/AdminNav";
import { ConsoleOverview } from "@/app/admin/_components/ConsoleOverview";
import { ConsoleFooter } from "@/app/admin/_components/QueueTable";
import { PERSON } from "../../_fixtures/people";

/**
 * The console's front door, which the founder's item 5 made a real screen.
 *
 * The same frame `admin-queue` draws beside it, so the two can be held side
 * by side, with `ConsoleOverview` in the body. The real layout gates on
 * `requireAdmin`, so the chrome is repeated here from the same pieces.
 *
 * THE COUNTS ARE FIXTURES AND THEY ARE NOT PRETENDING OTHERWISE. This route
 * 404s in production. The product's own overview reads `getQueueCounts` and
 * draws the unavailable panel when that read fails; neither of those can be
 * reached from a sandbox with no session, so this proves the LOOK and never
 * the numbers. One desk is deliberately zero so the "this queue is clear"
 * line can be seen beside six that are not.
 */
export const dynamic = "force-dynamic";

const COUNTS = {
  flags: 6,
  moderation: 2,
  alerts: 4,
  reports: 3,
  applications: 5,
  listings: 18,
  tickets: 0,
};

export default async function PreviewAdminOverview() {
  const locale = await getLocale();
  const t = getDictionary(locale);

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
            <span className="block nf-caption">{t.uiCommon.console.title}</span>
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
                <span className="block nf-caption">{t.admin.console.signedIn}</span>
              </span>
            </span>
          </div>
          <div className="px-gutter">
            <AdminTabs counts={COUNTS} labels={t.admin.nav} navLabel={t.admin.console.navLabel} />
          </div>
        </header>

        <div className="nf-admin-body">
          <ConsoleOverview t={t} locale={locale} counts={COUNTS} />
          <ConsoleFooter note={t.admin.console.auditNote} />
        </div>
      </main>
    </div>
  );
}
