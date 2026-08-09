import type { Dictionary } from "@naijafinds/i18n";
import type { NavSection } from "@/components/app/nav-model";

/**
 * Agent Mode navigation, as data.
 *
 * The same shape as Personal Mode's model and rendered by the same component,
 * because an agent moving between the two modes should not have to learn a
 * second navigation. Only the accent differs.
 *
 * FLAT, with no parents and no disclosure arrows. Two rows here used to carry
 * children and both were the same mistake: a listings parent whose children
 * were the list and the button on the list, and an earnings parent whose child
 * was the chart. `NavTree` no longer renders children at all - see the note in
 * that file - and the rule behind it is the owner\'s: if a thing needs children
 * it is either its own screen or it does not belong in navigation.
 *
 * The other thing that changes is the glyphs. Every row carried a 26px 3D
 * `BrandIcon`, which is the content family: the platform's own rule is
 * BrandIcon for content and UiIcon for navigation, and the primary navigation
 * of an entire mode was the loudest violation of it on the product. Ten lit 3D
 * tiles in a column also read as ten equally important things, which is the
 * opposite of what a navigation is for.
 */

export function buildAgentNav(t: Dictionary, unreadMessages = 0): NavSection[] {
  return [
    {
      heading: null,
      items: [
        { href: "/agent/dashboard", label: t.agent.nav.dashboard, icon: "grid" },
        /* FLAT. This was a parent with two children, and the children were the
           list of listings and the button that sits on top of the list of
           listings. Adding a property is an action on that screen, not a
           destination beside it, so opening a group to find it was a tap spent
           discovering something that was already in view. */
        { href: "/agent/listings", label: t.nav.properties, icon: "house" },
        { href: "/agent/bookings", label: t.agent.nav.bookings, icon: "calendar-booking" },
        {
          href: "/agent/messages",
          label: t.agent.nav.messages,
          icon: "chat-bubble",
          /*
           * A real unread count. It used to be a hardcoded 3, so every agent
           * saw three permanent unread messages on a route that was then a
           * stub, and no amount of reading could clear it. Zero renders no
           * badge at all, so the fabricated three cannot come back.
           */
          ...(unreadMessages > 0 ? { badge: unreadMessages } : {}),
        },
        { href: "/agent/reviews", label: t.agent.nav.reviews, icon: "star" },
      ],
    },
    {
      heading: t.agent.nav.money,
      items: [
        /* Two rows, not a parent and a child. The old comment argued analytics
           is "what the earnings figure is made of", which is true and is an
           argument for putting the chart ON the earnings page, not for hiding
           a second destination behind a disclosure arrow. They are two screens,
           so they are two rows. */
        { href: "/agent/earnings", label: t.agent.nav.earnings, icon: "wallet" },
        { href: "/agent/analytics", label: t.agent.nav.analytics, icon: "map" },
      ],
    },
    {
      heading: t.nav.accountLabel,
      items: [
        { href: "/agent/verification", label: t.agent.nav.verification, icon: "verified" },
        { href: "/agent/settings", label: t.agent.nav.settings, icon: "sliders" },
      ],
    },
    /*
     * No "Personal Mode" row, deliberately, and it was in here until the result
     * was looked at. `ModeSwitcher` already sits at the foot of both the rail
     * and the drawer, says "Switch to Personal Mode" and explains what that
     * means. A second control doing the same job six rows above it is not a
     * shortcut, it is a question about whether the two do the same thing.
     */
  ];
}
