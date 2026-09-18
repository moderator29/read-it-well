import Link from "next/link";
import { AutoHideDock } from "./AutoHideDock";
import type { Dictionary } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import type { Side } from "@/lib/side.constants";

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
  /*
   * THE STAYS ROOTS. `/stays/search` is listed BEFORE `/stays` on purpose:
   * `tabRootFor` prefix-matches in order, and Explore stays is its own tab,
   * not a page under Stays. Listing them the other way round would light the
   * Stays tab on the search screen and park the pill one destination early.
   */
  "/stays/search",
  "/stays",
  /*
   * `/saved` IS GONE FROM THIS LIST, and its presence was the exact bug the
   * paragraph above claims to have fixed. No tab and no island points at
   * `/saved`, so the dock rendered on it with the pill parked and nothing
   * highlighted: the bottom of the screen occupied by a control answering no
   * question, which is the sentence this file already wrote about settings and
   * checkout. `/saved` is reached from the rail and the drawer and carries its
   * own back affordance, like every other non-tab destination.
   *
   * `/assistant` is deliberately NOT here either, for a different reason. It IS
   * a dock destination, but it is an immersive route - it owns the whole
   * viewport with its own header and a composer pinned to the bottom edge - so
   * a dock floating over its composer would be in the way of the one thing that
   * screen is for. Tapping the tab still gets you there; the dock simply steps
   * aside once you arrive, the same way it does for an open thread.
   */
];

/**
 * The immersive routes: the ones that own the whole viewport.
 *
 * Lives here rather than in `AppShell` because the shell and the dock both have
 * to agree about it, and they were deciding it separately: the shell tested a
 * regex and the dock tested a list, so a route could be immersive to one and a
 * tab root to the other. One function, both callers.
 *
 * `/messages/new` IS NOT IMMERSIVE, and the negative lookahead is the whole
 * point of this regex. An open thread is a conversation and owns the screen; a
 * BRIDGE to a conversation that does not exist yet is an ordinary page with a
 * heading and a back control. `/^\/messages\/[^/]+$/` matched both, so the
 * first contact with an agent - "the single most important hop in the messaging
 * journey" by its own docstring - lost the page gutter and the top inset, and
 * its back button sat at x=0, y=0 with its tap target clipped by the screen
 * edge and, on a notched phone, under the status bar.
 */
export function isImmersiveRoute(pathname: string): boolean {
  if (pathname === "/assistant") return true;
  return /^\/messages\/(?!new$)[^/]+$/.test(pathname);
}

/**
 * The tab a route belongs to, or null when none does.
 *
 * ---------------------------------------------------------------------------
 * PREFIX MATCHING, BECAUSE AN EXACT ONE DROPPED THE DOCK ONE TAP IN.
 *
 * This was `TAB_BAR_ROUTES.includes(pathname)`, so `/around/lekki`,
 * `/wallet/transactions`, `/profile/application` and every other descendant of
 * a tab destination lost the whole bottom navigation. Going one level down
 * inside a tab removed the navigation that got you there, which teaches people
 * not to trust it and costs them the gesture they were about to make.
 * `AdminNav`'s own `isActive` has done this correctly with `startsWith` since
 * before the dock existed, twenty files away.
 *
 * An immersive descendant still wins: a thread under `/messages` is not under a
 * tab root at all today, and the test is here so that the day one is, the dock
 * steps aside rather than floating over a composer.
 *
 * Returning the ROOT rather than a boolean is what closes the other half of the
 * same bug. The dock highlights by comparing its own hrefs against the route,
 * so under a bare `startsWith` a reader on `/around/lekki` would have got the
 * dock back with nothing lit - the parked-pill state this file already calls a
 * lie. The root is the tab, so the pill goes where the reader is.
 */
export function tabRootFor(pathname: string): string | null {
  if (isImmersiveRoute(pathname)) return null;
  return (
    TAB_BAR_ROUTES.find(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    ) ?? null
  );
}

export function showsTabBar(pathname: string): boolean {
  return tabRootFor(pathname) !== null;
}

/**
 * Whether a route IS a tab destination, rather than living under one.
 *
 * ---------------------------------------------------------------------------
 * TWO QUESTIONS THAT USED TO SHARE ONE PREDICATE, AND ONLY ONE OF THEM WANTS
 * PREFIX MATCHING.
 *
 * "Should the dock show" and "is this a root screen" were both answered by
 * `showsTabBar`, which was fine while that was an exact match and is not once
 * it is a prefix. The dock wants the prefix: a reader one level inside a tab
 * should keep the navigation that got them there. The app HEADER wants the
 * exact test: a root screen carries the hamburger and the wordmark, and a
 * detail screen carries a `PageHeader` with a back control and its own title,
 * which is the single bar that screen needs. Answering the header with the
 * prefix would put both bars on `/wallet/transactions` - a hamburger above a
 * back button above a title - which is the "inner tab" stacking this shell is
 * written to avoid.
 */
export function isTabRoot(pathname: string): boolean {
  return !isImmersiveRoute(pathname) && TAB_BAR_ROUTES.includes(pathname);
}

export function MobileTabBar({
  t,
  side = "property",
  active = "/home",
  unreadNotifications = 0,
  signedIn = false,
}: {
  t: Dictionary;
  /** Which side's four destinations the capsule carries. */
  side?: Side;
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
  /*
   * The same four slots on both sides. The Stays side swaps the two
   * discovery destinations for its own roots; Feed and Wallet are shared,
   * because the feed is one feed and the wallet is one wallet. The pill
   * arithmetic, the island and `AutoHideDock` are untouched by the side.
   */
  const tabs: Tab[] =
    side === "stays"
      ? [
          { href: "/stays", label: t.nav.stays, icon: "bed" },
          { href: "/stays/search", label: t.nav.exploreStays, icon: "compass" },
          { href: "/around", label: t.nav.feed, icon: "feed" },
          { href: "/wallet", label: t.nav.wallet, icon: "wallet" },
        ]
      : [
          { href: "/home", label: t.nav.home, icon: "home" },
          { href: "/search", label: t.nav.explore, icon: "compass" },
          { href: "/around", label: t.nav.feed, icon: "feed" },
          { href: "/wallet", label: t.nav.wallet, icon: "wallet" },
        ];

  /*
   * Which tab the pill sits behind, resolved through the ROOT of the route
   * rather than the route itself, so `/wallet/transactions` lights the wallet.
   * Matching the full pathname was half of the parked-pill bug: the other half
   * was `/saved` being on the route list at all, and both are gone.
   *
   * -1 is still handled rather than assumed away. `/profile` is a tab root and
   * the ISLAND rather than a tab owns it, so a reader on `/profile/application`
   * legitimately has no tab lit, and the pill hides instead of parking on Home
   * and claiming a destination the reader is not on.
   */
  const root = tabRootFor(active);
  const activeIndex = tabs.findIndex((tab) => tab.href === root);

  /* Profile for a member, the way in for a guest. One slot, two honest jobs. */
  const island: Tab = signedIn
    ? { href: "/profile", label: t.nav.profile, icon: "user" }
    : { href: "/sign-up", label: t.common.signUp, icon: "user" };
  const islandActive = island.href === root;
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
          const isActive = tab.href === root;

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
               in the bar to see. Attention is cyan on this platform.

               `--nf-status-pending` rather than `--nf-state-warning`: they are
               the same value, and one of the two names says what this dot
               means. The console's queue badges take the same token. */
            className="absolute right-2.5 top-2.5 block h-2.5 w-2.5 rounded-full border-2 border-[var(--nf-surface-canvas)] bg-[var(--nf-status-pending)]"
          />
        )}
      </Link>
    </AutoHideDock>
  );
}
