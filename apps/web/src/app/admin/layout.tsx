import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { BackButton } from "@/components/site/BackButton";
import { Logo } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { requireAdmin } from "@/lib/admin/guard";
import { getQueueCounts } from "@/lib/admin/queries";
import { AccessScreen } from "./_components/AccessScreen";
import { AdminRail, AdminTabs, ConsoleSearch } from "./_components/AdminNav";
import { ConsoleFooter } from "./_components/QueueTable";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.console.title, robots: { index: false, follow: false } };
}

/**
 * The console shell, in the register of CDA4B82B at desktop and 278CC66A on
 * a phone.
 *
 * Access is decided here, once, on the server, before a single queue is read:
 * a non-admin never receives markup that contains platform data, because the
 * layout returns the access screen instead of the children. Everything below
 * that gate can therefore assume staff.
 *
 * The chrome: the glass rail with the lockup, the banded destinations with
 * their live counts and the console card at its foot; the glass bar with the
 * search and its keyboard hint, the bell and the signed-in person; the body;
 * and the Operations Console footer. On a phone the rail becomes the
 * disclosure in the header (`AdminTabs`), which carries the same map.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const t = getDictionary(await getLocale());
  const access = await requireAdmin();
  if (access.state !== "admin") return <AccessScreen t={t} state={access.state} />;

  const counts = await getQueueCounts();
  const badges: Record<string, number> =
    counts.state === "ok"
      ? {
          flags: counts.data.flags,
          moderation: counts.data.moderation,
          alerts: counts.data.alerts,
          applications: counts.data.applications,
          listings: counts.data.listings,
          reports: counts.data.reports,
          tickets: counts.data.tickets,
        }
      : {};
  const email = access.user.email ?? t.admin.console.signedIn;
  const initial = email.trim().charAt(0).toUpperCase() || "V";

  return (
    <div className="nf-admin">
      <aside className="nf-admin-rail" aria-label={t.admin.console.navLabel}>
        <div className="nf-admin-rail__brand">
          <Link href="/" aria-label={t.a11y.logoHome}>
            <Logo size={38} wordSize={19} />
          </Link>
        </div>
        <div className="nf-admin-rail__scroll">
          <AdminRail counts={badges} labels={t.admin.nav} navLabel={t.admin.console.navLabel} />
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

      <main id="main" className="min-w-0 flex-1">
        <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
          <div className="nf-admin-bar">
            <BackButton fallback="/home" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <Link href="/" className="lg:hidden" aria-label={t.a11y.logoHome}>
              <Logo size={30} wordSize={16} />
            </Link>
            <ConsoleSearch label={t.admin.common.searchLabel} placeholder={t.admin.common.searchPlaceholder} />
            <span className="flex-1 lg:hidden" />
            <Link href="/notifications" aria-label={t.uiCommon.console.notifications} className="nf-icon-btn h-10 w-10">
              <UiIcon name="bell" size={20} />
            </Link>
            <span className="nf-admin-bar__person">
              <span className="nf-admin-bar__avatar" aria-hidden="true">
                {initial}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-[18ch] truncate nf-caption font-semibold text-[var(--nf-content-primary)]">
                  {email}
                </span>
                <span className="block nf-caption">{t.uiCommon.console.short}</span>
              </span>
            </span>
          </div>
          <div className="px-gutter">
            <AdminTabs counts={badges} labels={t.admin.nav} navLabel={t.admin.console.navLabel} />
          </div>
        </header>

        <div className="nf-admin-body">
          {children}
          <ConsoleFooter note={t.admin.console.auditNote} />
        </div>
      </main>
    </div>
  );
}
