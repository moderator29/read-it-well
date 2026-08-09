import type { Dictionary } from "@naijafinds/i18n";
import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The side navigation, as data.
 *
 * One module, read by both the desktop rail and the phone drawer, so the two
 * cannot drift.
 *
 * ---------------------------------------------------------------------------
 * THIS FILE JUST GOT MUCH SHORTER, AND THAT IS THE POINT.
 *
 * An ordinary renter was offered TWENTY-FIVE destinations here, and an agent
 * who is also staff was offered FORTY. Nobody navigates twenty-five things.
 * They scan the first five, give up, and use search. Counted before:
 *
 *   Discover      Home, Rent, Explore + 5 children, Feed + 3 children   12
 *   Account       Bookings, Messages, Notifications, Wallet, Assistant,
 *                 Profile + 3 children                                   9
 *   Become agent                                                         1
 *   Legal         Help, Terms, Privacy                                   3
 *                                                                       ==
 *                                                                       25
 *
 * Counted after: ELEVEN for a renter, and every one of them is a place that
 * does something the others do not. What went, and why:
 *
 *  - **The five Explore children.** `/search?type=hotel`, `?type=property`,
 *    `?type=home`, `?type=restaurant`, `?type=experience` were five rows
 *    pointing at ONE screen with one query parameter changed. That screen
 *    already draws `CategoryTiles` at the top of itself, which offers twelve
 *    categories rather than five, in a control the reader can actually see the
 *    options in. Five rows in a drawer were a worse copy of a tile grid.
 *
 *  - **Rent.** `/rent` is discovery filtered to the long-let market, which is
 *    the same thing again: a filter presented as a destination.
 *
 *  - **The three Feed children.** Feed, Places and People are the feed screen
 *    and two indexes reachable from it. The first child pointed at the same
 *    href as its own parent.
 *
 *  - **The three Profile children.** Profile is already a row of its own at the
 *    top of the rail (`nf-nav__who`) and the island on the tab bar. Saved is
 *    promoted to a real row because it is a destination people go to on
 *    purpose; Settings likewise.
 *
 *  - **The whole Legal section.** Help, Terms and Privacy are all three
 *    already rows inside Settings, under About, and they were only ever put
 *    here because nothing else in the product linked them. Something does now.
 *
 * WHAT DID NOT CHANGE: nothing here is offered to somebody who cannot use it.
 * The agent workspace appears only for an approved agent and the console only
 * for staff, both resolved from the person's own RLS-bound reads in
 * `getShellIdentity`.
 *
 * WHERE THE ASSISTANT LIVES. Exactly one placement per viewport, and this is
 * it. It used to have three at once: a permanently filled primary button in the
 * app header, a tab on the phone dock, and this row. The header button and the
 * tab are both gone. Below `lg` this file renders as the drawer and above it as
 * the rail, so on any given screen there is one Assistant control.
 */

export type NavLeaf = {
  href: string;
  label: string;
  icon: UiIconName;
  badge?: number;
};

export type NavNode = NavLeaf & {
  /** Present only on a parent. The parent's own href still navigates. */
  children?: NavLeaf[];
};

export type NavSection = {
  /** Null on the first section, which needs no heading above the first row. */
  heading: string | null;
  items: NavNode[];
};

export function buildNav({
  t,
  unreadNotifications,
  isAgent,
  isAdmin,
  signedIn,
}: {
  t: Dictionary;
  unreadNotifications: number;
  isAgent: boolean;
  isAdmin: boolean;
  signedIn: boolean;
}): NavSection[] {
  const sections: NavSection[] = [
    {
      heading: null,
      /*
       * Three places to look at the marketplace, and they are genuinely three
       * different things: the shelf assembled for you, the whole catalogue you
       * search yourself, and what people nearby are saying. Everything that
       * used to sit here was one of these three with a filter on it.
       *
       * Open to a signed-out visitor, all three, because a marketplace nobody
       * can see cannot be found. Acting is what gates, not looking.
       */
      items: [
        { href: "/home", label: t.nav.home, icon: "home" },
        { href: "/search", label: t.nav.explore, icon: "compass" },
        { href: "/around", label: t.nav.feed, icon: "grid" },
      ],
    },
  ];

  /*
   * The account block, which only means anything once there is an account.
   *
   * Showing Bookings, Wallet and Messages to a signed-out browser is offering
   * six rows that all lead to the same sign-up screen, which teaches somebody
   * that this navigation wastes their time. They get the three above and the
   * Sign up control in the header instead.
   */
  if (signedIn) {
    sections.push({
      heading: t.nav.accountLabel,
      items: [
        { href: "/bookings", label: t.nav.bookings, icon: "calendar-booking" },
        { href: "/messages", label: t.nav.messages, icon: "chat-bubble" },
        {
          href: "/notifications",
          label: t.nav.notifications,
          icon: "bell",
          ...(unreadNotifications > 0 ? { badge: unreadNotifications } : {}),
        },
        { href: "/saved", label: t.nav.saved, icon: "heart" },
        { href: "/wallet", label: t.nav.wallet, icon: "wallet" },
        /* The assistant's one and only placement. See the header note. */
        { href: "/assistant", label: t.nav.aiAssistant, icon: "sparkle" },
      ],
    });
  }

  /*
   * The two workspaces, shown only to somebody who has one.
   *
   * These keep their children, and that is not an inconsistency with the cuts
   * above. A workspace child is a distinct surface with its own data - earnings
   * is not listings with a filter on it - whereas every child removed above was
   * one screen with a query parameter changed.
   */
  const workspaces: NavNode[] = [];

  if (isAgent) {
    workspaces.push({
      href: "/agent/dashboard",
      label: t.nav.agentMode,
      icon: "building-apartment",
      children: [
        { href: "/agent/dashboard", label: t.agent.nav.dashboard, icon: "grid" },
        { href: "/agent/listings", label: t.agent.nav.myListings, icon: "house" },
        { href: "/agent/bookings", label: t.nav.bookings, icon: "calendar-booking" },
        { href: "/agent/earnings", label: t.agent.nav.earnings, icon: "wallet" },
        { href: "/agent/verification", label: t.agent.nav.verification, icon: "verified" },
        { href: "/agent/settings", label: t.nav.settings, icon: "sliders" },
      ],
    });
  }

  if (isAdmin) {
    workspaces.push({
      href: "/admin",
      label: t.nav.consoleLabel,
      icon: "shield-stop",
      children: [
        { href: "/admin", label: t.admin.nav.overview.label, icon: "grid" },
        { href: "/admin/moderation", label: t.admin.nav.moderation.label, icon: "sliders" },
        { href: "/admin/reports", label: t.admin.nav.reports.label, icon: "search" },
        { href: "/admin/agents", label: t.admin.nav.applications.label, icon: "user" },
        { href: "/admin/stops", label: t.admin.nav.stops.label, icon: "shield-stop" },
        { href: "/admin/support", label: t.admin.nav.tickets.label, icon: "ticket" },
      ],
    });
  }

  if (workspaces.length > 0) {
    sections.push({ heading: t.nav.workspacesLabel, items: workspaces });
  }

  /*
   * The last section: one way to start listing, and one way to change
   * everything else.
   *
   * Settings is the destination that absorbed the cuts. Theme and language used
   * to be two permanent controls in the app header on every single screen, for
   * a choice most people make once; both are cards on that page. Help, Terms
   * and Privacy are rows on it too, which is why the Legal section here is
   * gone.
   */
  const tail: NavNode[] = [];
  if (signedIn && !isAgent) {
    tail.push({ href: "/agents", label: t.landing.footer.becomeAgent, icon: "key" });
  }
  if (signedIn) {
    tail.push({ href: "/settings", label: t.nav.settings, icon: "settings-gear" });
  }
  if (tail.length > 0) sections.push({ heading: null, items: tail });

  return sections;
}

/**
 * Whether a row is the page being looked at.
 *
 * `activeType` is still a parameter and still consulted, even though no row in
 * this file carries a `?type=` any more. The agent navigation reads the same
 * `NavTree`, and a future row may want the same trick; the honest reason to
 * keep it is that removing it would change `NavTree`'s signature for a saving
 * of four lines. A row with no query still ignores the query entirely, so
 * `/search?q=Lekki` lights Explore rather than nothing.
 */
export function isCurrent(href: string, activePath: string, activeType: string | null): boolean {
  const [path, query] = href.split("?");
  if (path !== activePath) return false;
  if (!query) return true;
  const wanted = new URLSearchParams(query).get("type");
  return wanted === activeType;
}

/** True when this parent contains the current page, so it opens on arrival. */
export function containsCurrent(
  node: NavNode,
  activePath: string,
  activeType: string | null,
): boolean {
  if (!node.children) return false;
  return node.children.some((child) => isCurrent(child.href, activePath, activeType));
}
