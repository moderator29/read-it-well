import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Mobile tab bar.
 *
 * Five destinations: Home, Explore, Bookings and Favourites in the capsule,
 * with Profile standing alone beside it. This is deliberately NOT the twelve
 * item desktop rail; a phone tab bar tops out at five before targets get too
 * small, so the rail's remaining destinations live under Profile rather than
 * being crammed in here.
 *
 * A floating dock, lifted clear of every edge rather than an edge-to-edge bar:
 * same shape language as the desktop dock, just wide enough to carry primary
 * navigation instead of quick-access shortcuts.
 *
 * The active tab expands into a labelled capsule while the rest stay icon-only,
 * and because the outgoing label collapses on the same spring the incoming one
 * expands on, the highlight reads as travelling along the bar. Labels used to
 * be spoken only, which kept the dock compact but meant a sighted user had no
 * idea what any glyph meant until they tapped it.
 */
type Tab = { href: string; label: string; icon: UiIconName };

export function MobileTabBar({ t, active = "/home" }: { t: Dictionary; active?: string }) {
  /*
   * Four in the capsule, one standing alone.
   *
   * Profile is the one pulled out. It is the only destination that is about the
   * user rather than about inventory, and holding it apart is what the supplied
   * reference does with its outer circles - it also keeps the capsule down to
   * four tabs, which is what leaves room for the active label to expand without
   * the row overflowing a narrow phone.
   */
  const tabs: Tab[] = [
    { href: "/home", label: t.nav.home, icon: "home" },
    { href: "/search", label: t.nav.explore, icon: "compass" },
    { href: "/bookings", label: t.nav.bookings, icon: "calendar-booking" },
    { href: "/saved", label: t.nav.saved, icon: "heart" },
  ];
  const profile: Tab = { href: "/profile", label: t.nav.profile, icon: "user" };
  const profileActive = profile.href === active;

  return (
    <nav
      aria-label={t.nav.primaryLabel}
      /*
       * `max(0.9rem, env(...))` looked safe but collapsed the dock's own margin
       * on exactly the devices that need it: on a notched iPhone the bottom
       * inset is 34px, so max() returned the inset and the dock landed flush on
       * the home indicator with zero visual gap. Adding the inset to the margin
       * keeps real air below it on every device. Sits low and close to the
       * home indicator by design - it is a dock, not a floating panel.
       */
      className="nf-dockrow fixed inset-x-4 bottom-[calc(0.35rem+env(safe-area-inset-bottom))] z-50 lg:hidden"
    >
      <ul className="nf-tabbar flex items-center gap-1 px-1.5 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.href === active;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "nf-tab-pop",
                  isActive
                    ? "text-white"
                    : "text-[var(--nf-content-primary)] opacity-75 hover:opacity-100",
                ].join(" ")}
              >
                <span className="nf-tab-pop__pill" aria-hidden="true" />
                <span className="nf-tab-pop__icon">
                  <UiIcon
                    name={tab.icon}
                    size="lg"
                    filled={isActive}
                    strokeWidth={isActive ? 2.2 : undefined}
                  />
                </span>
                {/*
                  The label is always in the DOM, so it is always available to a
                  screen reader and the link never needs an aria-label that
                  duplicates it. Inactive tabs collapse it to zero width in CSS
                  rather than removing it, which is what gives the active
                  capsule something to expand from.
                */}
                <span className="nf-tab-pop__label">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* The detached island. Its own material, its own blur, its own shadow. */}
      <Link
        href={profile.href}
        aria-current={profileActive ? "page" : undefined}
        aria-label={profile.label}
        className={["nf-dock-island", profileActive ? "" : "opacity-90 hover:opacity-100"]
          .filter(Boolean)
          .join(" ")}
      >
        <UiIcon name={profile.icon} size="lg" strokeWidth={profileActive ? 2.2 : undefined} />
      </Link>
    </nav>
  );
}
