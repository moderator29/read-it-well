import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Icon, type IconName } from "@/design-system/icons/Icon";

/**
 * Mobile tab bar.
 *
 * Five destinations, exactly as the mobile reference shows: Home, Explore,
 * Bookings, Favourites, Profile. This is deliberately NOT the twelve item
 * desktop rail. A phone tab bar tops out at five before targets get too small,
 * and the reference already made that call, so the rail's remaining
 * destinations live under Profile rather than being crammed in here.
 *
 * Tier one icons throughout: at 22px the 3D objects would be unreadable.
 */
type Tab = { href: string; label: string; icon: IconName };

export function MobileTabBar({ t, active = "/home" }: { t: Dictionary; active?: string }) {
  const tabs: Tab[] = [
    { href: "/home", label: t.nav.home, icon: "home" },
    { href: "/search", label: t.nav.explore, icon: "search" },
    { href: "/bookings", label: t.nav.bookings, icon: "booking" },
    { href: "/saved", label: t.nav.saved, icon: "favorites" },
    { href: "/profile", label: t.nav.profile, icon: "profile" },
  ];

  return (
    <nav
      aria-label={t.nav.primaryLabel}
      className="nf-tabbar fixed inset-x-0 bottom-0 z-50 lg:hidden"
    >
      <ul className="flex items-stretch justify-around px-1.5 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {tabs.map((tab) => {
          const isActive = tab.href === active;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[var(--nf-radius-md)] px-1 py-1.5 text-[0.6875rem] font-semibold transition-colors",
                  isActive
                    ? "text-[var(--nf-electric-300)]"
                    : "text-[var(--nf-content-muted)] hover:text-[var(--nf-content-secondary)]",
                ].join(" ")}
              >
                {/* The 3D family, dimmed at rest and full strength when active. */}
                <span className={"h-6 w-6 transition-opacity " + (isActive ? "opacity-100" : "opacity-55")}>
                  <Icon name={tab.icon} fill />
                </span>
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
