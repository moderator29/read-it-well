import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Mobile tab bar.
 *
 * Five destinations: Home, Explore, Bookings, Favourites, Profile. This is
 * deliberately NOT the twelve item desktop rail; a phone tab bar tops out at
 * five before targets get too small, so the rail's remaining destinations
 * live under Profile rather than being crammed in here.
 *
 * A floating icon-only dock, lifted clear of every edge rather than an
 * edge-to-edge bar: same shape language as the desktop dock, just wide
 * enough to carry primary navigation instead of quick-access shortcuts.
 * Labels are spoken, not printed (`aria-label`), so the dock stays compact
 * without losing accessibility.
 */
type Tab = { href: string; label: string; icon: UiIconName };

export function MobileTabBar({
  t,
  active = "/home",
  unreadNotifications = 0,
}: {
  t: Dictionary;
  active?: string;
  /**
   * Unread notifications for this caller. The dock carries no Notifications
   * destination of its own, because six targets is already the ceiling on a
   * phone, so the marker sits on Profile, which is where the rail's remaining
   * destinations live. A dot rather than a number: at this size a numeral is
   * unreadable, and the job here is only to say "something is in there".
   */
  unreadNotifications?: number;
}) {
  const tabs: Tab[] = [
    { href: "/home", label: t.nav.home, icon: "home" },
    { href: "/search", label: t.nav.explore, icon: "compass" },
    // Around sits third, in the middle, where a thumb reaches easiest. It is
    // deliberately NOT first: discovery stays the default tab, because the day
    // the social layer out-competes booking for attention is the day it starts
    // costing us money.
    { href: "/around", label: t.nav.around, icon: "map" },
    { href: "/bookings", label: t.nav.bookings, icon: "calendar-booking" },
    { href: "/saved", label: t.nav.saved, icon: "heart" },
    { href: "/profile", label: t.nav.profile, icon: "user" },
  ];

  return (
    <nav
      aria-label={t.nav.primaryLabel}
      className="nf-tabbar fixed inset-x-4 bottom-[max(0.9rem,env(safe-area-inset-bottom))] z-50 mx-auto w-fit lg:hidden"
    >
      <ul className="flex items-center gap-1 px-1.5 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.href === active;
          /* Profile is the way through to notifications on a phone. */
          const marked = tab.href === "/profile" && unreadNotifications > 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  marked
                    ? `${tab.label}, ${unreadNotifications} unread notification${
                        unreadNotifications === 1 ? "" : "s"
                      }`
                    : tab.label
                }
                title={tab.label}
                className={[
                  "nf-tab-pop flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "text-white"
                    : "text-[var(--nf-content-primary)] opacity-75 hover:opacity-100",
                ].join(" ")}
              >
                <span className="nf-tab-pop__pill" aria-hidden="true" />
                {/* Stroked glyph; the active tab draws a heavier line. */}
                <span className="nf-tab-pop__icon relative">
                  <UiIcon name={tab.icon} size={22} strokeWidth={isActive ? 2 : 1.8} />
                  {marked && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 block h-2.5 w-2.5 rounded-full border-2 border-[var(--nf-surface-primary)] bg-[var(--nf-brand-primary)]"
                    />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
