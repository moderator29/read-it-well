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

export function MobileTabBar({ t, active = "/home" }: { t: Dictionary; active?: string }) {
  const tabs: Tab[] = [
    { href: "/home", label: t.nav.home, icon: "home" },
    { href: "/search", label: t.nav.explore, icon: "compass" },
    { href: "/bookings", label: t.nav.bookings, icon: "calendar-booking" },
    { href: "/saved", label: t.nav.saved, icon: "heart" },
    { href: "/profile", label: t.nav.profile, icon: "user" },
  ];

  return (
    <nav
      aria-label={t.nav.primaryLabel}
      /*
       * `max(0.9rem, env(...))` looked safe but collapsed the bar's own margin
       * on exactly the devices that need it: on a notched iPhone the bottom
       * inset is 34px, so max() returned the inset and the bar landed flush on
       * the home indicator with zero visual gap. Adding the inset to the margin
       * keeps a real 0.9rem of air below the pill on every device.
       */
      className="nf-tabbar fixed inset-x-4 bottom-[calc(0.9rem+env(safe-area-inset-bottom))] z-50 mx-auto w-fit lg:hidden"
    >
      <ul className="flex items-center gap-1 px-1.5 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.href === active;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
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
                <span className="nf-tab-pop__icon">
                  <UiIcon name={tab.icon} size={22} strokeWidth={isActive ? 2 : 1.8} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
