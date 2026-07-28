import Link from "next/link";
import type { Dictionary, Locale } from "@naijafinds/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { AgentRail } from "./AgentRail";
import { LogoMark } from "@/design-system/brand/Logo";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Agent Mode shell: the rail plus a top bar, wrapping every agent page so the
 * chrome is identical across the workspace (Master Rule 17). On phones the rail
 * collapses and the top bar carries the mode marker and language control.
 */
export function AgentShell({
  t,
  locale,
  active,
  profile,
  children,
}: {
  t: Dictionary;
  locale: Locale;
  active: string;
  profile: AgentProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <AgentRail t={t} active={active} profile={profile} />

      <main id="main" className="min-w-0 flex-1">
        <header className="nf-glass sticky top-0 z-40 border-b border-[var(--nf-border-subtle)]">
          <div className="flex h-[64px] items-center gap-3 px-5 md:px-8">
            <Link href="/" className="lg:hidden" aria-label={t.a11y.logoHome}>
              <LogoMark size={32} />
            </Link>
            <span
              className="inline-flex items-center gap-1.5 rounded-[var(--nf-radius-pill)] px-2.5 py-1 text-[0.6875rem] font-bold lg:hidden"
              style={{ background: "color-mix(in oklab, var(--nf-mode-agent) 20%, transparent)", color: "#FDBA74" }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--nf-mode-agent)]" />
              {t.agent.mode.agent}
            </span>

            <div className="relative flex flex-1 items-center">
              <UiIcon
                name="search"
                size={18}
                className="pointer-events-none absolute left-3 text-[var(--nf-content-muted)]"
              />
              <input
                type="search"
                aria-label={t.common.search}
                placeholder={`${t.common.search} ${t.agent.nav.bookings.toLowerCase()}, ${t.agent.nav.myListings.toLowerCase()}`}
                className="nf-field hidden !py-2 pl-9 sm:block sm:max-w-md"
              />
            </div>

            <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
          </div>
        </header>

        <div className="px-5 pb-24 pt-7 md:px-8 lg:pb-10">{children}</div>
      </main>
    </div>
  );
}
