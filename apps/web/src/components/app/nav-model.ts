import type { Dictionary } from "@naijafinds/i18n";
import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The side navigation, as data.
 *
 * One module, read by both the desktop rail and the phone drawer, so the two
 * cannot drift. Master Rule 17 froze the destinations; this does not add any.
 * It **groups** the ones that were already a flat list of twelve, because five
 * of them were `/search?type=` variants of one screen and were sitting at the
 * same level as Wallet.
 *
 * A group has a `href` of its own. Tapping the parent goes somewhere real,
 * and the disclosure arrow beside it opens the children. That matters: a
 * parent that only expands is a dead control the first time somebody taps the
 * word rather than the arrow.
 *
 * **Nothing here is offered to somebody who cannot use it.** Agent Mode
 * appears only for an approved agent and the console only for staff, both
 * resolved from the person's own RLS-bound reads in `getShellIdentity`. An
 * Agent Mode group on an account with no `agents` row is a dead end four taps
 * deep, which is the failure this whole file is arranged to prevent.
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
      items: [
        { href: "/home", label: t.nav.home, icon: "home" },
        { href: "/rent", label: t.nav.rent, icon: "key" },
        {
          /* The parent goes to unfiltered search, which is the honest answer to
             "Explore" and the screen all five children are one query parameter
             away from. */
          href: "/search",
          label: t.nav.explore,
          icon: "search",
          children: [
            { href: "/search?type=hotel", label: t.nav.hotels, icon: "building-hotel" },
            {
              href: "/search?type=property",
              label: t.nav.apartments,
              icon: "building-apartment",
            },
            { href: "/search?type=home", label: t.nav.homes, icon: "house" },
            { href: "/search?type=restaurant", label: t.nav.restaurants, icon: "utensils" },
            { href: "/search?type=experience", label: t.nav.experiences, icon: "ticket" },
          ],
        },
        {
          href: "/around",
          label: t.nav.around,
          icon: "map",
          /* Three children, and only three, because those are the three index
             routes the social layer actually has. Stories are reached from a
             place and a person, and a Stories row would point at a route that
             does not exist.

             The Places row used to point at `/around`, the same href as its own
             parent, because `/around` WAS the directory. It is the feed now, so
             the parent and the first child are the feed and Places is the
             directory behind it. */
          children: [
            { href: "/around", label: t.nav.feed, icon: "grid" },
            { href: "/around/manage", label: t.nav.places, icon: "compass" },
            { href: "/u", label: t.nav.people, icon: "user" },
          ],
        },
      ],
    },
    {
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
        { href: "/wallet", label: t.nav.wallet, icon: "wallet" },
        { href: "/assistant", label: t.nav.aiAssistant, icon: "sparkle" },
        {
          href: "/profile",
          label: t.nav.profile,
          icon: "user",
          children: [
            { href: "/profile", label: t.nav.profile, icon: "user" },
            { href: "/saved", label: t.nav.saved, icon: "heart" },
            { href: "/settings", label: t.nav.settings, icon: "sliders" },
          ],
        },
      ],
    },
  ];

  /*
   * The two workspaces, shown only to somebody who has one.
   *
   * An agent reaching their own listings used to mean leaving the app shell
   * entirely and knowing the /agent URL, because Personal Mode's navigation
   * had one row for becoming an agent and none for being one.
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
        { href: "/agent/messages", label: t.nav.messages, icon: "chat-bubble" },
        { href: "/agent/reviews", label: t.agent.nav.reviews, icon: "star" },
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

  // Somebody with no agent workspace is offered the way into one. Somebody who
  // already has it is not offered it twice.
  if (signedIn && !isAgent) {
    sections.push({
      heading: null,
      items: [{ href: "/agents", label: t.landing.footer.becomeAgent, icon: "sparkle" }],
    });
  }

  /*
   * Legal, last and quiet.
   *
   * These three were reachable only from the marketing footer, which the app
   * shell does not render, so a signed-in person inside the product had no way
   * to Privacy or Terms at all without typing the URL. That is the wrong answer
   * for the two pages somebody opens to exercise a right rather than to browse.
   *
   * The labels come from the footer's own dictionary rather than new keys,
   * because they are the same three destinations and should not be able to
   * disagree with themselves in four languages.
   */
  sections.push({
    heading: t.landing.footer.legal,
    items: [
      { href: "/help", label: t.landing.footer.help, icon: "chat-bubble" },
      { href: "/terms", label: t.landing.footer.terms, icon: "document" },
      { href: "/privacy", label: t.landing.footer.privacy, icon: "verified" },
    ],
  });

  return sections;
}

/**
 * Whether a row is the page being looked at.
 *
 * Compared on pathname **and** the `type` parameter, because five of the rows
 * are the same pathname with a different query and a plain pathname match
 * would light all five at once. Everything else ignores the query entirely, so
 * `/search?q=Lekki` still lights Explore rather than nothing.
 */
export function isCurrent(href: string, activePath: string, activeType: string | null): boolean {
  const [path, query] = href.split("?");
  if (path !== activePath) return false;
  if (!query) return activeType === null;
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
