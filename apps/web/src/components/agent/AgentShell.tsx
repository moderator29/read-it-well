import Link from "next/link";
import type { Dictionary, Locale } from "@naijafinds/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { AgentRail } from "./AgentRail";
import { AgentMobileNav } from "./AgentMobileNav";
import { AgentModePill } from "./AgentNav";
import { LogoMark } from "@/design-system/brand/Logo";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { BackButton } from "@/components/site/BackButton";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Agent Mode shell: the rail plus a top bar, wrapping every agent page so the
 * chrome is identical across the workspace (Master Rule 17). On phones the rail
 * becomes a slide-in drawer behind the hamburger, and the top bar carries the
 * mode marker and language control. Content padding respects the device safe
 * area so nothing sits under a home indicator.
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
        <header className="nf-glass nf-safe-top sticky top-0 z-40 border-b border-[var(--nf-border-subtle)]">
          <div className="flex h-[60px] items-center gap-2 px-3 sm:h-[64px] sm:gap-4 sm:px-5 md:px-8">
            {/* The way back, always top left: previous screen when there is
                one in this session, otherwise personal home. */}
            <BackButton fallback="/home" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <AgentMobileNav t={t} active={active} profile={profile} />

            <Link href="/" className="lg:hidden" aria-label={t.a11y.logoHome}>
              <LogoMark size={30} />
            </Link>
            {/* Mode marker: on the tightest screens the drawer carries it instead.
                Wrapped rather than classed because the pill sets its own display. */}
            <span className="hidden min-[420px]:block lg:hidden">
              <AgentModePill label={t.agent.mode.agent} />
            </span>

            <div className="relative flex min-w-0 flex-1 items-center">
              <UiIcon
                name="search"
                size={18}
                className="pointer-events-none absolute left-3 hidden text-[var(--nf-content-muted)] sm:block"
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

        <div className="px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-5 md:px-8 md:pt-7 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
