import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Mobile tab bar.
 *
 * Five destinations, exactly as the mobile reference shows: Home, Explore,
 * Bookings, Favourites, Profile. This is deliberately NOT the twelve item
 * desktop rail. A phone tab bar tops out at five before targets get too small,
 * and the reference already made that call, so the rail's remaining
 * destinations live under Profile rather than being crammed in here.
 *
 * Tier one stroked glyphs throughout: at this size the 3D objects would be
 * unreadable, and the stroke weight can step up when a tab is active.
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
                    : "text-[var(--nf-content-primary)] opacity-75 hover:opacity-100",
                ].join(" ")}
              >
                {/* Stroked glyph; the active tab draws a heavier line. */}
                <UiIcon name={tab.icon} size={24} strokeWidth={isActive ? 2 : 1.8} />
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
