import type { ReactNode } from "react";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostNav } from "./HostNav";
import { HostDeskSidebar } from "./HostDeskSidebar";
import { HostDrawer, HostTitle } from "./HostDrawer";
import { hostNavLabels } from "./host-nav-model";

/**
 * The Host surfaces' shell, for hotels, shortlets, guest houses, serviced
 * apartments and restaurants: `WorkspaceHeader` (the same bar the agent
 * console draws: back, the drawer toggle, the page's title, the bell), the
 * row of host destinations (`HostNav`) under it, then a single column.
 *
 * No lockup and no workspace pill in the bar (founder, 29 September 2026);
 * the drawer is headed by the workspace's marker instead. The wizard lives
 * outside the consumer shell on purpose, as the agent application does: a
 * person in the middle of uploading their CAC certificate does not need the
 * dock under their thumb.
 */
export async function HostShell({
  children,
  fallback = "/home",
  chromeBack = true,
  nav = chromeBack,
  immersive = false,
  wide = false,
}: {
  children: ReactNode;
  fallback?: string;
  /**
   * @deprecated The bar draws no lockup any more, so there is nothing for a
   * label to name. Still accepted so the host pages need no edit.
   */
  logoLabel?: string;
  /**
   * Whether the chrome bar draws its own way back.
   *
   * IT IS OFF FOR THE WIZARD AND THE REASON IS A COUNT. `GOVERNING-09` through
   * `GOVERNING-11` draw exactly ONE back control on a set-up screen, inline
   * with the progress segments, and the first shot of these panels came back
   * with two arrows stacked eight pixels apart: this one, which leaves the
   * flow, and the drawn one, which steps back through it. Two arrows in a
   * column is not a choice a person can make confidently. The wizard's own
   * head carries the single control and walks out of the flow when there is
   * no previous step, so nothing is lost.
   */
  chromeBack?: boolean;
  /**
   * Whether the bar carries the host's navigation (the chip row and the
   * drawer). Follows `chromeBack` unless told otherwise: the flows that draw
   * their own single control (the wizard) are the ones a person should finish
   * rather than wander out of, so they get neither.
   */
  nav?: boolean;
  /**
   * The content owns the rest of the viewport: the workspace assistant, whose
   * composer is pinned to the bottom edge. The same contract as `AgentShell`.
   */
  immersive?: boolean;
  /** The workspace home's dashboard width (plan item 14) rather than a form's. */
  wide?: boolean;
}) {
  /* The bell's dot, failing soft to zero: a badge is never worth a page. */
  const [unread, t] = await Promise.all([
    getShellIdentity().then(
      (identity) => identity.unreadNotifications,
      () => 0,
    ),
    /* The words on the server (M-2): the nav, the drawer, the title and the
       bell, in the reader's language, handed down as plain strings. */
    getLocale().then(getDictionary),
  ]);
  const labels = hostNavLabels(t);
  return (
    <div className={immersive ? "nf-host nf-host--immersive" : "nf-host"}>
      {/* From 1024px the destinations are the shared workspace sidebar (plan
          item 20); below it the chip row under the bar, as before. */}
      {nav ? (
        <HostDeskSidebar
          labels={labels}
          mainLabel={t.desk.sidebar.main}
          deskName={t.desk.sidebar.hostDesk}
        />
      ) : null}
      <div className="nf-host__col">
      <WorkspaceHeader
        back={chromeBack ? fallback : false}
        menu={nav ? <HostDrawer labels={labels} /> : undefined}
        title={<HostTitle labels={labels} />}
        bell={{
          href: "/host/notifications",
          label: t.nav.notifications,
          unreadLabel: t.a11y.notificationsUnread,
          unread,
        }}
      >
        {nav ? <HostNav labels={labels} /> : null}
      </WorkspaceHeader>
      <main id="main" className={immersive ? "nf-host__fill" : wide ? "nf-host__body nf-host__body--wide" : "nf-host__body"}>
        {children}
      </main>
      </div>
    </div>
  );
}
