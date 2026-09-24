import { initial } from "@/lib/text/initial";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { AgentRail } from "./AgentRail";
import { AgentMobileNav } from "./AgentMobileNav";
import { getUnreadMessageCount } from "@/lib/agent/messages-queries";
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
export async function AgentShell({
  t,
  locale,
  active,
  profile,
  children,
}: {
  t: Dictionary;
  locale: Locale;
  active: string;
  /** The real agent behind this workspace, or null when nobody is. */
  profile: AgentProfile | null;
  children: React.ReactNode;
}) {
  /* Resolved here rather than per page, so the badge is correct on all ten
     destinations without every page having to remember to fetch it. Fails soft
     to zero: a badge is never worth taking a workspace page down for. */
  const unreadMessages = await getUnreadMessageCount();

  return (
    <div className="nf-agent flex min-h-dvh">
      <AgentRail t={t} active={active} profile={profile} unreadMessages={unreadMessages} />

      <main id="main" className="min-w-0 flex-1">
        <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
          <div className="flex h-header-sm items-center gap-xs px-sm sm:h-header sm:gap-md sm:px-5 md:px-xl">
            {/* The way back, always top left: previous screen when there is
                one in this session, otherwise personal home. */}
            <BackButton fallback="/home" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <AgentMobileNav
              t={t}
              active={active}
              profile={profile}
              unreadMessages={unreadMessages}
            />

            <Link href="/" className="lg:hidden" aria-label={t.a11y.logoHome}>
              <LogoMark size={36} />
            </Link>
            {/* Mode marker: on the tightest screens the drawer carries it instead.
                Wrapped rather than classed because the pill sets its own display. */}
            <span className="hidden min-[420px]:block lg:hidden">
              <AgentModePill label={t.agent.mode.agent} />
            </span>

            {/* The search is a real one: it lands on the listings workspace
                with the term, which is the one place in the console that
                already searches by title. */}
            <form action="/agent/listings" method="get" role="search" className="nf-agent-bar__search">
              <UiIcon name="search" size={18} className="nf-agent-bar__glyph" />
              <input
                type="search"
                name="q"
                aria-label={t.common.search}
                placeholder={`${t.common.search} ${t.agent.nav.myListings.toLowerCase()}`}
              />
            </form>
            <span className="flex-1 sm:hidden" />

            {/*
              THE RIGHT OF THE BAR, AS THE CONSOLE RENDERS DRAW IT.

              CDA4B82B and 278CC66A both end the bar with the bell and the
              signed-in person, and this one ended it with a LANGUAGE SELECT
              painted `nf-btn--primary`. At 390 that made a locale picker the
              only lit blue object on the screen, louder than the page's own
              primary action, and the workspace had no way to reach
              notifications at all. So: the bell first (a real destination,
              never a badge nobody can clear), then the agent's own initial,
              then the language control, quietened to the console's glass
              inside `.nf-agent` rather than restyled in its own file.
            */}
            <Link href="/notifications" aria-label={t.nav.notifications} className="nf-icon-btn h-10 w-10">
              <UiIcon name="bell" size={20} />
            </Link>
            {profile && (
              <span className="nf-agent-bar__avatar" aria-hidden="true">
                {initial(profile.displayName, "V")}
              </span>
            )}
            <span className="nf-agent-bar__lang">
              <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
            </span>
          </div>
        </header>

        <div className="px-md pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-lg sm:px-5 md:px-xl md:pt-7 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
