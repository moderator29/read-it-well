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
 * Counted after: ELEVEN for a renter and TWELVE for an agent who is also staff
 * (the same eleven, minus the Become an agent row nobody needs now, plus one
 * row each for the two workspaces). Every one of them is a place that does
 * something the others do not.
 *
 * THERE IS NO SUB-NAVIGATION LEFT ANYWHERE IN THIS FILE. No row has children,
 * `NavTree` no longer renders them, and the rule that produced that is the
 * owner's: if a thing needs children it is either its own screen or it does not
 * belong in navigation. What went, and why:
 *
 *  - **The five Explore children.** `/search?type=hotel`, `?type=property`,
 *    `?type=home`, `?type=restaurant`, `?type=experience` were five rows
 *    pointing at ONE screen with one query parameter changed. The category is
 *    a control on that screen, at the top of the filter drawer, offering every
 *    market the catalogue actually holds rather than five of them. Five rows in
 *    a drawer were a worse copy of a filter.
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
  /**
   * Hidden on phones, because the bottom dock already carries these.
   *
   * Home, Explore and Feed sit in the dock on a phone, permanently, one thumb
   * reach away. Repeating them at the top of the drawer means the first thing
   * somebody sees when they open the menu is three destinations they can
   * already reach without opening the menu, which pushes everything the drawer
   * exists for below the fold.
   *
   * The desktop rail has no dock beside it, so there they are the only way to
   * those three screens and they stay.
   *
   * A flag on the section rather than a check on its index: the reason travels
   * with the data, and reordering the sections later cannot silently hide the
   * wrong one.
   */
  hideWhenDocked?: boolean;
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
      hideWhenDocked: true,
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
        /*
         * THE ASSISTANT ROW WENT, AND THE ASSISTANT DID NOT.
         *
         * `/assistant` is already a door on `/home`, where `AiAssistantBanner`
         * links straight into it, and a persistent rail row is a second door to
         * one place. The rule the owner applied to the profile avatar in the
         * header applies here for the same reason: two doors to one room make
         * the navigation longer without making anything more reachable.
         *
         * The assistant is a TOOL you reach for from inside what you are
         * doing, not a destination you navigate to on purpose, which is the
         * test for whether something belongs in a persistent rail at all.
         */
      ],
    });
  }

  /*
   * The two workspaces, shown only to somebody who has one, and each is ONE
   * ROW.
   *
   * The agent group used to carry eight children and the console six, so an
   * agent who is also staff was offered forty destinations in this one panel.
   * A workspace is a place you GO, and once you are in it, it has its own
   * navigation with its own rail: reproducing that rail inside the consumer
   * drawer is drawing the same eight rows in two places and making the person
   * who has both choose which copy to use.
   *
   * Nothing became unreachable. Every one of those fourteen destinations is a
   * row in the workspace's own navigation, one tap further in, which is where
   * somebody who is working looks for it.
   */
  const workspaces: NavNode[] = [];

  if (isAgent) {
    workspaces.push({
      href: "/agent/dashboard",
      label: t.nav.agentMode,
      icon: "building-apartment",
    });
  }

  if (isAdmin) {
    workspaces.push({ href: "/admin", label: t.nav.consoleLabel, icon: "shield-stop" });
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
  /*
   * BECOME AN AGENT WENT, AND THEN THE WHOLE IDEA OF IT WENT.
   *
   * The row was cut first, as the third door to a page the profile already
   * linked twice: a permanent rail row for an action you take once is the
   * clearest possible case of something that belongs inside a screen.
   *
   * The page itself has since gone too, and with it the framing. There is no
   * conversion from renter to agent. There is one account carrying three
   * profiles, and the switch-profile sheet on `/profile` both switches between
   * them and sets up whichever one is not there yet. Nothing in this file
   * points at it, because switching profile is not navigation: it changes what
   * the rest of this list means.
   */
  const tail: NavNode[] = [];

  /*
   * BECOME AN AGENT IS A ROW AGAIN, and the note above is now history rather
   * than current reasoning.
   *
   * It was cut as a third door to a page the profile already linked twice, and
   * that argument was sound about a DUPLICATE row. What replaced it was a
   * switch-profile sheet reached by tapping an avatar, which is the least
   * discoverable control on the platform, for the single most important thing
   * somebody can do here: start listing property.
   *
   * A marketplace with no supply has exactly one conversion that matters, and
   * it was hidden two taps inside a sheet nobody opens. The owner is right
   * that it belongs where a person can see it.
   *
   * ONLY FOR PEOPLE WHO ARE NOT ALREADY AGENTS. An agent sees the workspace
   * row above instead, and showing both would offer somebody a door into a
   * room they are standing in.
   *
   * `verified` rather than a building or a briefcase, deliberately: the thing
   * on the other side of this row is a verification ladder, not a job title,
   * and the icon should say what the flow actually is.
   */
  if (signedIn && !isAgent) {
    tail.push({ href: "/profile/setup", label: t.nav.becomeAgent, icon: "verified" });
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
