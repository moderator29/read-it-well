import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { BackButton } from "@/components/site/BackButton";
import { Logo, LogoMark } from "@/design-system/brand/Logo";
import { requireAdmin } from "@/lib/admin/guard";
import { getQueueCounts } from "@/lib/admin/queries";
import { AccessScreen } from "./_components/AccessScreen";
import { AdminRail, AdminTabs } from "./_components/AdminNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.console.title, robots: { index: false, follow: false } };
}

/**
 * The console shell.
 *
 * Access is decided here, once, on the server, before a single queue is read:
 * a non-admin never receives markup that contains platform data, because the
 * layout returns the access screen instead of the children. Everything below
 * that gate can therefore assume staff.
 *
 * The chrome is the platform's own: glass header, stroked navigation glyphs,
 * the rail at lg and above, a scrollable tab strip on phones, and a back
 * button that follows real history the way every other RentMe surface does.
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
          alerts: counts.data.alerts,
          applications: counts.data.applications,
          listings: counts.data.listings,
          reports: counts.data.reports,
          tickets: counts.data.tickets,
        }
      : {};

  return (
    <div className="flex min-h-dvh">
      <aside
        className="sticky top-0 hidden h-dvh w-[var(--nf-rail-width)] shrink-0 flex-col border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 py-5 lg:flex"
        aria-label={t.admin.console.navLabel}
      >
        <Link href="/" aria-label={t.a11y.logoHome} className="mb-2 px-1">
          <Logo size={38} wordSize={19} />
        </Link>
        <AdminPill label={t.admin.console.title} className="mb-5 ml-1" />
        <AdminRail
          counts={badges}
          labels={t.admin.nav}
          navLabel={t.admin.console.navLabel}
        />
        <p className="mt-4 px-1 text-[0.6875rem] leading-relaxed text-[var(--nf-content-muted)]">
          {t.admin.console.auditNote}
        </p>
      </aside>

      <main id="main" className="min-w-0 flex-1">
        <header className="nf-glass nf-safe-top sticky top-0 z-40 border-b border-[var(--nf-border-subtle)]">
          <div className="flex h-[60px] items-center gap-2 px-4 sm:h-[64px] sm:gap-4 sm:px-5 md:px-8">
            <BackButton fallback="/home" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <Link href="/" className="lg:hidden" aria-label={t.a11y.logoHome}>
              <LogoMark size={30} />
            </Link>
            <AdminPill label={t.admin.console.title} />
            <span className="flex-1" />
            <span className="hidden truncate text-[0.8125rem] text-[var(--nf-content-muted)] sm:block">
              {access.user.email ?? t.admin.console.signedIn}
            </span>
          </div>
          <div className="px-4 sm:px-5 md:px-8">
            <AdminTabs
              counts={badges}
              labels={t.admin.nav}
              navLabel={t.admin.console.navLabel}
            />
          </div>
        </header>

        <div className="px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-5 md:px-8 md:pt-7 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}

/** The console marker: brand blue, never a second accent colour. */
function AdminPill({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 rounded-[var(--nf-radius-pill)] px-2.5 py-1 text-[0.6875rem] font-bold",
        className ?? "",
      ].join(" ")}
      style={{ background: "var(--nf-brand-primary-soft)", color: "var(--nf-electric-300)" }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--nf-brand-primary)]" />
      {label}
    </span>
  );
}
