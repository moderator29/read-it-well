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
          /*
             Held was computed and then dropped on the floor.

             `getQueueCounts` has always summed the four things the safety scan
             can hold - posts, stories, story comments and bios - and this map
             never carried the result, so the one rail entry `nav.ts` calls out
             as "somebody's words stopped mid-sentence, and the author has
             already been told a person is looking at them" was the one entry
             that could never show it had work waiting. The overview tile read
             the count correctly all along, which is what hid it: the number was
             on screen, just not where an operator passing the rail would see
             it. */
          moderation: counts.data.moderation,
          alerts: counts.data.alerts,
          applications: counts.data.applications,
          listings: counts.data.listings,
          reports: counts.data.reports,
          tickets: counts.data.tickets,
        }
      : {};

  return (
    <div className="flex min-h-dvh">
      {/*
        The gutter is `--nf-pad-shell` through `px-gutter`, which is a clamp:
        the rail, the header and the page body all breathe from 20px on a phone
        to 32px on a desktop, continuously. It used to be `px-4 sm:px-5 md:px-8`
        written out three times, which is the same intent expressed as two
        jumps at two breakpoints, and the three copies had already drifted apart
        by a step.
      */}
      <aside
        className="sticky top-0 hidden h-dvh w-[var(--nf-rail-width)] shrink-0 flex-col border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-gutter py-lg lg:flex"
        aria-label={t.admin.console.navLabel}
      >
        <Link href="/" aria-label={t.a11y.logoHome} className="mb-inline-tight">
          <Logo size={38} wordSize={19} />
        </Link>
        <AdminPill label={t.admin.console.title} className="mb-heading" />
        <AdminRail
          counts={badges}
          labels={t.admin.nav}
          navLabel={t.admin.console.navLabel}
        />
        <p className="nf-caption mt-group">{t.admin.console.auditNote}</p>
      </aside>

      <main id="main" className="min-w-0 flex-1">
        <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
          <div className="flex h-[60px] items-center gap-inline px-gutter sm:h-[64px]">
            <BackButton fallback="/home" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <Link href="/" className="lg:hidden" aria-label={t.a11y.logoHome}>
              <LogoMark size={30} />
            </Link>
            <AdminPill label={t.admin.console.title} />
            <span className="flex-1" />
            <span className="nf-body-sm hidden truncate text-muted sm:block">
              {access.user.email ?? t.admin.console.signedIn}
            </span>
          </div>
          <div className="px-gutter">
            <AdminTabs
              counts={badges}
              labels={t.admin.nav}
              navLabel={t.admin.console.navLabel}
            />
          </div>
        </header>

        <div className="px-gutter pb-[calc(var(--nf-space-2xl)+env(safe-area-inset-bottom))] pt-lg md:pt-xl">
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
        "nf-caption inline-flex w-fit items-center gap-2xs rounded-[var(--nf-radius-pill)] px-xs py-3xs font-bold",
        className ?? "",
      ].join(" ")}
      /* `--nf-brand-secondary` is the layer-2 alias this pill should always
         have used: it is the same token `.nf-badge--brand` reads for the same
         job, so the console marker and every brand badge beside it now move
         together, and it carries a daylight value where the raw palette rung
         did not. */
      style={{ background: "var(--nf-brand-primary-soft)", color: "var(--nf-brand-secondary)" }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--nf-brand-primary)]" />
      {label}
    </span>
  );
}
