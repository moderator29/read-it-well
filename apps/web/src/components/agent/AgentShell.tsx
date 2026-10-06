import type { Dictionary, Locale } from "@vallo/i18n/core";
import type { AgentProfile } from "@/lib/agent/types";
import { AgentRail } from "./AgentRail";
import { AgentMobileNav } from "./AgentMobileNav";
import { getUnreadMessageCount } from "@/lib/agent/messages-queries";
import { agentTitleFor } from "./agent-nav-model";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { PepBanner } from "@/components/compliance/PepBanner";
import { ProSwitch } from "@/components/app/pro/ProSwitch";
import { AgentInnerNav } from "./AgentInnerNav";
import { agentInnerNavCopy, agentInnerPageFor } from "./agent-inner-nav";

/**
 * Agent Mode shell: the rail plus a top bar, wrapping every agent page so the
 * chrome is identical across the workspace (Master Rule 17). The bar is
 * `WorkspaceHeader`, the same one the host console draws: back, the drawer
 * toggle (below lg, where the rail becomes a slide-in drawer), the page's
 * title and the bell. The lockup, the mode pill, the search well and the
 * language select it used to carry are gone; the search lives on My listings,
 * the one screen it ever searched, and language lives only in Settings.
 * Content padding respects the device safe area so nothing sits under a home
 * indicator.
 */
export async function AgentShell({
  t,
  active,
  profile,
  children,
  immersive = false,
  chromeBack = true,
}: {
  t: Dictionary;
  /** Still passed by every page; the bar no longer draws a language control. */
  locale: Locale;
  active: string;
  /** The real agent behind this workspace, or null when nobody is. */
  profile: AgentProfile | null;
  children: React.ReactNode;
  /**
   * The content owns the rest of the viewport: an open conversation, whose
   * composer is pinned to the bottom edge and whose scroller takes the height
   * between it and the bar. The same contract `AppShell` gives a thread
   * (`isImmersiveRoute`), so `ThreadView` renders identically in both shells.
   */
  immersive?: boolean;
  /**
   * Whether the bar draws its own way back. Off where the content draws one
   * (a thread's head, a `PageHeader`), so the screen never carries two arrows.
   */
  chromeBack?: boolean;
}) {
  /* Resolved here rather than per page, so the badge is correct on all ten
     destinations without every page having to remember to fetch it. Fails soft
     to zero: a badge is never worth taking a workspace page down for. */
  const [unreadMessages, unreadNotifications] = await Promise.all([
    getUnreadMessageCount(),
    /* The bell's dot: the same count the app header reads, failing soft to
       zero like everything in `getShellIdentity`. */
    getShellIdentity().then(
      (identity) => identity.unreadNotifications,
      () => 0,
    ),
  ]);

  return (
    <div className="nf-agent flex min-h-dvh">
      <AgentRail t={t} active={active} profile={profile} unreadMessages={unreadMessages} />

      <main
        id="main"
        className={immersive ? "flex h-dvh min-w-0 flex-1 flex-col overflow-hidden" : "nf-soft-top min-w-0 flex-1"}
      >
        <WorkspaceHeader
          back={chromeBack ? "/home" : false}
          menu={
            <AgentMobileNav
              t={t}
              active={active}
              profile={profile}
              unreadMessages={unreadMessages}
            />
          }
          title={agentTitleFor(t, active)}
          /* The Pro switch (D12): present only for a member the server says
             holds a plan, and absent, not locked, for everybody else. */
          end={<ProSwitch scope="agent" />}
          /* The workspace's own notifications route, so the bell does not
             drop an agent into the consumer shell. */
          bell={{
            href: "/agent/notifications",
            label: t.nav.notifications,
            unreadLabel: t.a11y.notificationsUnread,
            unread: unreadNotifications,
          }}
        />

        {immersive ? (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
          <div className="px-md pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-lg sm:px-5 md:px-xl md:pt-7 lg:pb-10">
            {/* R3-08: the desk's second level on every agent page that is not
                an open conversation. An immersive page (a thread, the
                assistant) gives its whole height to the conversation and keeps
                its own head, so it draws none. */}
            <AgentInnerNav {...agentInnerNavCopy(t)} active={agentInnerPageFor(active)} />
            {/* SCUML item 20: until a lister has answered the PEP question. */}
            {profile && <PepBanner />}
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
