import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Mobile tab bar.
 *
 * Five destinations: District, Explore, Inbox and the Assistant in the capsule,
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

/**
 * The routes the dock belongs on.
 *
 * A tab bar is a statement about where you are, so showing it on a screen it
 * cannot point at is a lie: it appeared on the wallet, on settings, on
 * notifications, on a listing page and inside checkout, with nothing
 * highlighted, taking up the bottom of the screen and answering no question.
 *
 * Those screens are reached FROM a tab or from the side drawer, and they get
 * the back affordance instead. Kept as a shared constant so the shell and the
 * dock can never disagree about where it shows.
 *
 * `/home` stays on the list: it is still a real destination, reached from the
 * rail and from the logo, and the dock has to survive underneath it even though
 * no tab claims it.
 */
export const TAB_BAR_ROUTES = [
  "/home",
  "/around",
  "/search",
  "/messages",
  "/profile",
  /*
   * `/assistant` is deliberately NOT here even though it is a dock
   * destination. It is an immersive route - it owns the whole viewport with
   * its own header and a composer pinned to the bottom edge - so a dock
   * floating over its composer would be in the way of the one thing that
   * screen is for. Tapping the tab still gets you there; the dock simply
   * steps aside once you arrive, the same way it does for an open thread.
   */
];

export function showsTabBar(pathname: string): boolean {
  return TAB_BAR_ROUTES.includes(pathname);
}

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
  /*
   * Four in the capsule, Profile alone on the right.
   *
   * Profile is the one pulled out: it is the only destination about the user
   * rather than about inventory, and holding it apart keeps the capsule at four
   * so the active label has room to expand on a narrow phone.
   *
   * The map tab is gone from the dock. It pointed at `/search?view=map`, the
   * same pathname Explore already owns, so the two could never both resolve
   * their active state - and the search screen carries its own map toggle,
   * which is where that control belongs. Its slot goes to the assistant, which
   * is the thing this product has that a listings app does not.
   */
  const tabs: Tab[] = [
    { href: "/around", label: t.nav.around, icon: "grid" },
    { href: "/search", label: t.nav.explore, icon: "compass" },
    { href: "/messages", label: t.nav.messages, icon: "chat-bubble" },
    { href: "/assistant", label: t.nav.aiAssistant, icon: "sparkle" },
  ];
  const profile: Tab = { href: "/profile", label: t.nav.profile, icon: "user" };
  const profileActive = profile.href === active;
  /* Profile is the way through to notifications on a phone. */
  const marked = unreadNotifications > 0;

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
                title={tab.label}
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

      {/*
        The detached island. Its own material, its own blur, its own shadow.
        It carries the unread marker too, because Profile is the way through to
        notifications on a phone and the island is the only target here that is
        about the person rather than about inventory.
      */}
      <Link
        href={profile.href}
        aria-current={profileActive ? "page" : undefined}
        aria-label={
          marked
            ? `${profile.label}, ${unreadNotifications} unread notification${
                unreadNotifications === 1 ? "" : "s"
              }`
            : profile.label
        }
        className={[
          "nf-dock-island relative",
          profileActive ? "" : "opacity-90 hover:opacity-100",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <UiIcon name={profile.icon} size="lg" />
        {marked && (
          <span
            aria-hidden="true"
            className="absolute right-3 top-3 block h-2.5 w-2.5 rounded-full border-2 border-[var(--nf-surface-primary)] bg-[var(--nf-brand-primary)]"
          />
        )}
      </Link>
    </nav>
  );
}
