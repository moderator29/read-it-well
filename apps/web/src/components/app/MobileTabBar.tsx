import Link from "next/link";
import { AutoHideDock } from "./AutoHideDock";
import type { Dictionary } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The bottom tab bar.
 *
 * ---------------------------------------------------------------------------
 * THE EXACT CHANGE, AS ASKED FOR, IN THE ORDER IT WAS ASKED FOR.
 *
 *   was      Feed    Explore   Map    Messages   Assistant    + Profile
 *   no map   Feed    Explore   __     Messages   Assistant    + Profile
 *   home in  Feed    Explore   Home   Messages   Assistant    + Profile
 *   swap     Home    Explore   Feed   Messages   Assistant    + Profile
 *
 * THE MAP TAB IS GONE. It pointed at `/search?view=map`, the same pathname
 * Explore owns, so the two could never both resolve their active state
 * correctly - and more to the point a map is a VIEW OF discovery, not a peer
 * destination beside it. The search screen already carries `ViewToggle`, which
 * is the control a view switch belongs to.
 *
 * HOME TOOK THE SLOT and then Home and Feed exchanged places, which is what
 * puts Home first. That ordering is also the rail's: Home, Explore, Feed, in
 * that order, in both places. Before this the dock led with Feed and the rail
 * led with Home, so the two disagreed about what the product opens on.
 *
 * THE ASSISTANT TAB IS GONE TOO, for a different reason. It was here, in the
 * app header as a permanently filled primary button, and as a rail row: three
 * placements for one feature. It keeps exactly one, the side navigation, which
 * on this viewport is the drawer behind the header's menu control.
 *
 * BIGGER, throughout. The glyphs are on the `lg` step, 28px, in a taller
 * capsule. The owner asked for navigation that reads as deliberate and
 * tappable rather than as a dense toolbar, and a dock is where that is felt
 * first.
 *
 * A floating dock lifted clear of every edge rather than an edge-to-edge bar.
 *
 * ---------------------------------------------------------------------------
 * THE PILL TRAVELS NOW, AND IT USED TO CUT.
 *
 * Every tab carried its OWN pill at `inset: 0`, faded in by opacity and popped
 * by a keyframe. Switching tabs was therefore a fade out in one place and a
 * fade in somewhere else, with a bounce on the end of it: two events that the
 * eye reads as a cut, not as a highlight moving. The comment above that CSS
 * claimed the capsule "visibly travels along the bar", and what travelled was
 * the label's width, which is not the same thing and is not what anybody sees.
 *
 * There is ONE pill now. It is a single absolutely positioned element inside
 * the bar, and it is placed by arithmetic rather than by measurement: the tabs
 * are equal width, so the pill is one tab wide and its offset is the active
 * index times a tab plus a gap. The server already knows which tab is active,
 * so the index is an inline custom property and the whole thing stays a server
 * component with no JavaScript, no ref, no ResizeObserver and no layout read.
 * Changing tabs changes one number, and a transition on `translate` does the
 * rest on the entrance curve. That is a morph.
 *
 * EQUAL WIDTH IS WHAT MAKES THE ARITHMETIC POSSIBLE.
 *
 * THE VISIBLE LABELS CAME AND WENT IN ONE NIGHT, and both moves were on
 * purpose. They were added because three of four destinations had no name and
 * `title` does nothing on a touch screen. The founder then asked, with a
 * reference in hand, for the capsule to be icon-only the way the best consumer
 * bars are, and the founder's reference wins on look: the accessible name
 * moved into `aria-label`, so a screen reader hears exactly what the label
 * said, the weight change still marks the active tab for sight, and the bar
 * gets the calm the reference has. If labels ever return, they return for
 * everyone, not only the active tab.
 *
 * THE ACTIVE GLYPH CHANGES WEIGHT, not only colour. `UiIcon` carries a drawn
 * solid silhouette for each of these four, so the active destination reads as
 * solid at a glance rather than as a slightly different shade of the same line.
 */
type Tab = { href: string; label: string; icon: UiIconName };

/**
 * The routes the dock belongs on.
 *
 * A tab bar is a statement about where you are, so showing it on a screen it
 * cannot point at is a lie: it appeared on settings, on notifications, on a
 * listing page and inside checkout, with nothing highlighted, taking up the
 * bottom of the screen and answering no question. The wallet is back on the
 * list because the wallet is a TAB now.
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
  "/wallet",
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
   * FOUR, ALWAYS, and the fourth is the wallet.
   *
   * The bar used to show a guest three tabs on the grounds that gated
   * destinations waste a guest's taps. The founder overruled it with the
   * reference bar in hand: the capsule shows the real shape of the product to
   * everyone, four destinations, and for a guest the wallet tap lands on the
   * door with the destination kept, which is this platform's standing pattern
   * for every gated link. Messages lost its slot to the wallet and keeps its
   * three other ways in (home, the rail, the drawer); money is the spine of
   * this product and it belongs on the bar.
   */
  const tabs: Tab[] = [
    { href: "/home", label: t.nav.home, icon: "home" },
    { href: "/search", label: t.nav.explore, icon: "compass" },
    { href: "/around", label: t.nav.feed, icon: "feed" },
    { href: "/wallet", label: t.nav.wallet, icon: "wallet" },
  ];

  /* Profile for a member, the way in for a guest. One slot, two honest jobs. */
  const island: Tab = signedIn
    ? { href: "/profile", label: t.nav.profile, icon: "user" }
    : { href: "/sign-up", label: t.common.signUp, icon: "user" };
  const islandActive = island.href === active;
  /*
   * Which tab the pill sits behind. -1 means no tab owns the route, which is a
   * real state: `/saved` and a guest on `/messages` both render the dock with
   * nothing highlighted. The pill hides rather than parking on the first tab
   * and claiming a destination the reader is not on.
   */
  const activeIndex = tabs.findIndex((tab) => tab.href === active);
  /* The island is the way through to notifications on a phone. */
  const marked = signedIn && unreadNotifications > 0;

  return (
    <AutoHideDock
      /*
       * The route rather than a key. A key remounts the dock on every
       * navigation, which put it back on screen and also destroyed the pill
       * mid-journey; `AutoHideDock` resets itself from this instead.
       */
      route={active}
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
      <ul
        className="nf-tabbar"
        style={
          {
            "--nf-tab-count": tabs.length,
            "--nf-tab-i": Math.max(activeIndex, 0),
          } as React.CSSProperties
        }
      >
        {/*
          The travelling pill. An `<li>` rather than a bare span because the
          children of a list have to be list items, and `aria-hidden` plus an
          empty box keeps it out of the accessibility tree entirely: it is the
          drawing of a state that `aria-current` already announces.
        */}
        <li className="nf-tabbar__pill" data-parked={activeIndex < 0 || undefined} aria-hidden="true" />
        {tabs.map((tab) => {
          const isActive = tab.href === active;

          return (
            <li key={tab.href} className="nf-tab">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
                className="nf-tab__link"
              >
                {/* Icon only. The name lives in aria-label above; see the
                    labels note at the top of this file. */}
                <span className="nf-tab__icon">
                  <UiIcon name={tab.icon} size="lg" filled={isActive} />
                </span>
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
        className={["nf-dock-island relative", islandActive ? "" : "opacity-90"]
          .filter(Boolean)
          .join(" ")}
      >
        <UiIcon name={island.icon} size="lg" filled={islandActive} />
        {marked && (
          <span
            aria-hidden="true"
            /* Cyan, not brand blue. The marker was the same hue as the island
               it sits on, on the one control that carries the unread state on a
               phone, so the thing it exists to announce was the hardest thing
               in the bar to see. Attention is cyan on this platform. */
            className="absolute right-2.5 top-2.5 block h-2.5 w-2.5 rounded-full border-2 border-[var(--nf-surface-canvas)] bg-[var(--nf-state-warning)]"
          />
        )}
      </Link>
    </AutoHideDock>
  );
}
