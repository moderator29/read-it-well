import type { Dictionary } from "@naijafinds/i18n";
import type { NavSection } from "@/components/app/nav-model";

/**
 * Agent Mode navigation, as data.
 *
 * The same shape as Personal Mode's model and rendered by the same component,
 * because an agent moving between the two modes should not have to learn a
 * second navigation. Only the accent differs.
 *
 * **The destinations are still the ten frozen ones** (Master Rule 17). What
 * changes is that they were a flat list of ten in which "List a property" sat
 * at the same level as "Settings", and analytics sat beside verification.
 * Three of those pairings are genuine parent and child and now read as such.
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
        {
          /* The parent is the list of what you already have; adding one is its
             first child, because that is the thing an agent with no listings
             opens this group to do. */
          href: "/agent/listings",
          label: t.nav.properties,
          icon: "house",
          children: [
            { href: "/agent/listings", label: t.agent.nav.myListings, icon: "house" },
            { href: "/agent/list", label: t.agent.nav.listApartment, icon: "sparkle" },
          ],
        },
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
        {
          href: "/agent/earnings",
          label: t.agent.nav.earnings,
          icon: "wallet",
          /* Analytics is what the earnings figure is made of, not a separate
             concern that happens to be nearby. */
          children: [
            { href: "/agent/earnings", label: t.agent.nav.earnings, icon: "wallet" },
            { href: "/agent/analytics", label: t.agent.nav.analytics, icon: "map" },
          ],
        },
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
