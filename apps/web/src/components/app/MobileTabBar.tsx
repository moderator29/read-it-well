import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Mobile tab bar.
 *
 * Five destinations: District, Explore, Map and Inbox in the capsule, with
 * Profile standing alone beside it, and Map raised in the middle where a thumb
 * reaches easiest and where the platform's own answer to "what is near me"
 * belongs. This is deliberately NOT the twelve item desktop rail; a phone tab
 * bar tops out at five before targets get too small, so the rail's remaining
 * destinations live under Profile rather than being crammed in here.
 *
 * A floating dock, lifted clear of every edge rather than an edge-to-edge bar:
 * same shape language as the desktop dock, just wide enough to carry primary
 * navigation instead of quick-access shortcuts.
 *
 * The active tab expands into a labelled capsule while the rest stay icon-only,
 * and because the outgoing label collapses on the same spring the incoming one
 * expands on, the highlight reads as travelling along the bar. Labels used to
 * be spoken only, which kept the dock compact but meant a sighted user had no
 * idea what any glyph meant until they tapped it. The raised tab prints its
 * label too, because a control that size with no word on it is a guess.
 */
type Tab = { href: string; label: string; icon: UiIconName; raised?: boolean };

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
 * The Map tab points at `/search?view=map`, which is the same pathname Explore
 * uses, so `/search` covers both. `/home` stays on the list: it is still a real
 * destination, reached from the rail and from the logo, and the dock has to
 * survive underneath it even though no tab claims it.
 */
export const TAB_BAR_ROUTES = ["/home", "/around", "/search", "/messages", "/profile"];

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
   * Four in the capsule, one standing alone.
   *
   * Profile is the one pulled out. It is the only destination that is about the
   * user rather than about inventory, and holding it apart is what the supplied
   * reference does with its outer circles - it also keeps the capsule down to
   * four tabs, which is what leaves room for the active label to expand without
   * the row overflowing a narrow phone.
   *
   * Bookings and Saved moved under Profile, where the rail's other destinations
   * already live: they are the two people reach for least often, and the seats
   * they gave up are what District and the Map sit in now.
   */
  const tabs: Tab[] = [
    { href: "/around", label: t.nav.around, icon: "grid" },
    { href: "/search", label: t.nav.explore, icon: "compass" },
    /* The map is the centre and it is raised, because "what is near me right
       now" is the question a phone is actually being held to answer. */
    { href: "/search?view=map", label: t.nav.map, icon: "map", raised: true },
    { href: "/messages", label: t.nav.messages, icon: "chat-bubble" },
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

          if (tab.raised) {
            return (
              <li key={tab.href} className="-mt-6">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={tab.label}
                  /* The fill is an inline style, not a Tailwind arbitrary
                     value: `var(--nf-gradient-cta)` contains commas, and an
                     arbitrary value carrying a comma does not survive the
                     class parser. It rendered as a transparent pill, which
                     made the raised tab the quietest thing in the dock. */
                  style={{ background: "var(--nf-gradient-cta)" }}
                  className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full border border-[color-mix(in_oklab,var(--nf-brand-primary)_60%,transparent)] text-[var(--nf-content-on-brand)] shadow-[0_0_18px_rgb(12_57_239_/_0.5)] transition-transform active:translate-y-px"
                >
                  <UiIcon name={tab.icon} size={20} />
                  <span className="text-[0.5625rem] font-bold uppercase tracking-[0.06em]">
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          }

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
