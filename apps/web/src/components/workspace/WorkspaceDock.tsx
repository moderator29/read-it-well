import { getDictionary } from "@vallo/i18n";
import { ShellDock } from "@/components/app/ShellDock";
import { getLocale } from "@/lib/locale";
import { getShellIdentity, getShellWorkspaces } from "@/lib/app/shell-queries";
import { shellDictionary } from "@/lib/i18n/shell-dictionary";
import { isSocialEnabled } from "@/lib/social/flag";
import type { Side } from "@/lib/side.constants";

/**
 * THE MAIN DOCK ON A WORKSPACE PAGE (the founder, 13 October 2026).
 *
 * On a phone the agent, owner and host workspaces had a hamburger for the
 * workspace's own drawer and nothing to get back to Home, Search, Feed or
 * Profile: the only way out was the back arrow, which is not a way to Feed.
 * This draws the SAME dock the rest of the app has (`MobileTabBar`: Home,
 * Search, the menu in the centre, Feed, Profile, and the "+" at the right end),
 * so there is one dock, never two stacked. The workspace's own navigation does
 * not move: it is the drawer in the header and, from 1024px, the sidebar, and
 * neither draws anything at the bottom edge, so nothing is reconciled away.
 *
 * It is a server component because the workspace shells are: it reads the
 * account's facts once (cached per request, so the shell's own reads are not
 * repeated) and hands plain data to `ShellDock`, the client piece the consumer
 * shell draws too. Nothing in a workspace is touched except the one fixed
 * element, and the dock hides itself from 1024px (`lg:hidden`).
 *
 * `active` is the workspace route. No dock tab claims a workspace page, so no
 * tab is lit: the pill parks, which is the honest state ("you are not on one
 * of these"), the same as on Settings or Notifications.
 *
 * Fails soft like the shells do: the facts come from `getShellIdentity` and
 * `getShellWorkspaces`, which return a guest and an empty list rather than
 * throwing, and a dock is never worth taking a workspace page down for.
 */
export async function WorkspaceDock({ side, active }: { side: Side; active: string }) {
  const locale = await getLocale();
  const [identity, { workspaces, current }, socialOn] = await Promise.all([
    getShellIdentity(),
    getShellWorkspaces(),
    isSocialEnabled(),
  ]);
  return (
    <ShellDock
      t={shellDictionary(getDictionary(locale))}
      side={side}
      active={active}
      unreadNotifications={identity.unreadNotifications}
      signedIn={identity.signedIn}
      isAgent={identity.isAgent}
      isHost={identity.isHost}
      socialOn={socialOn}
      workspaces={workspaces}
      currentProfile={current}
      avatarUrl={identity.avatarUrl}
    />
  );
}
