import Link from "next/link";
import { AutoHideDock } from "./AutoHideDock";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Mobile tab bar.
 *
 * FOUR destinations in the capsule and one island beside it, down from five and
 * one, and every one of them is now the same destination the rail offers at the
 * same rank. That agreement is the point: before this the dock, the rail and
 * the desktop dock each answered "where can I go" differently, so a person
 * moving between a phone and a laptop had to learn the product twice.
 *
 * WHAT LEFT THE DOCK:
 *
 *  - **The Assistant tab.** It was here, in the app header as a filled primary
 *    button, and as a rail row: three placements for one feature. It keeps the
 *    side navigation, which on this viewport is the drawer behind the header's
 *    panel toggle.
 *  - **The Map tab.** It pointed at `/search?view=map`, the same pathname
 *    Explore owns, so the two could never both resolve their active state
 *    correctly, and the search screen carries its own map toggle, which is
 *    where a view switch belongs. A view of a screen is not a destination.
 *
 * WHAT ARRIVED: Home, which the rail has always had and the dock never did.
 *
 * SIGNED OUT IT IS THREE AND A DOOR. Bookings, wallet and an inbox all lead to
 * the same sign-up screen for a guest, so offering them teaches somebody that
 * this bar wastes taps. A guest gets the three surfaces they can genuinely
 * read, and the island becomes the way to join.
 *
 * A floating dock, lifted clear of every edge rather than an edge-to-edge bar:
 * same shape language as the rest of the chrome. The active tab expands into a
 * labelled capsule while the rest stay icon-only, and because the outgoing
 * label collapses on the same spring the incoming one expands on, the highlight
 * reads as travelling along the bar.
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
  "/saved",
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
  signedIn = false,
}: {
  t: Dictionary;
  active?: string;
  /**
   * Unread notifications for this caller. The dock carries no Notifications
   * destination of its own, so the marker sits on the island, which is where
   * the rail's remaining destinations live. A dot rather than a number: at this
   * size a numeral is unreadable, and the job here is only to say "something is
   * in there".
   */
  unreadNotifications?: number;
  /** No session means no inbox, no profile, and an island that opens the door. */
  signedIn?: boolean;
}) {
  /*
   * The same first three the rail leads with, in the same order, followed by
   * the inbox. Four is the ceiling on a narrow phone once the active tab
   * expands into a labelled capsule.
   */
  const tabs: Tab[] = [
    { href: "/home", label: t.nav.home, icon: "home" },
    { href: "/search", label: t.nav.explore, icon: "compass" },
    { href: "/around", label: t.nav.feed, icon: "grid" },
    ...(signedIn ? [{ href: "/messages", label: t.nav.messages, icon: "chat-bubble" } as Tab] : []),
  ];

  /* Profile for a member, the way in for a guest. One slot, two honest jobs. */
  const island: Tab = signedIn
    ? { href: "/profile", label: t.nav.profile, icon: "user" }
    : { href: "/sign-up", label: t.common.signUp, icon: "user" };
  const islandActive = island.href === active;
  /* The island is the way through to notifications on a phone. */
  const marked = signedIn && unreadNotifications > 0;

  return (
    <AutoHideDock
      /* Keyed on the route, so an app navigation remounts the dock and it
         never arrives on a new screen still hidden from the last one. */
      key={active}
      label={t.nav.primaryLabel}
      /*
       * `max(0.9rem, env(...))` looked safe but collapsed the dock's own margin
       * on exactly the devices that need it: on a notched iPhone the bottom
       * inset is 34px, so max() returned the inset and the dock landed flush on
       * the home indicator with zero visual gap. Adding the inset to the margin
       * keeps real air below it on every device.
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
                    ? "text-[var(--nf-content-on-brand)]"
                    : "text-[var(--nf-content-primary)] opacity-75 hover:opacity-100",
                ].join(" ")}
              >
                <span className="nf-tab-pop__pill" aria-hidden="true" />
                <span className="nf-tab-pop__icon">
                  <UiIcon name={tab.icon} size="lg" filled={isActive} />
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
      */}
      <Link
        href={island.href}
        aria-current={islandActive ? "page" : undefined}
        /* One dictionary sentence with both slots, not a translated noun with
           an English tail welded on. */
        aria-label={
          marked
            ? t.a11y.unreadOn
                .replace("{label}", island.label)
                .replace("{count}", String(unreadNotifications))
            : island.label
        }
        className={[
          "nf-dock-island relative",
          islandActive ? "" : "opacity-90 hover:opacity-100",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <UiIcon name={island.icon} size="lg" />
        {marked && (
          <span
            aria-hidden="true"
            className="absolute right-3 top-3 block h-2.5 w-2.5 rounded-full border-2 border-[var(--nf-surface-primary)] bg-[var(--nf-brand-primary)]"
          />
        )}
      </Link>
    </AutoHideDock>
  );
}
