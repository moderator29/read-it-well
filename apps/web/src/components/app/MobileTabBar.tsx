import type { ShellDictionary } from "@/lib/i18n/shell-dictionary";
import Link from "next/link";
import { AutoHideDock } from "./AutoHideDock";
import { DockMore, type DockMoreItem } from "./DockMore";
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
 * bottom of the screen and answering no question. Agreements is on the
 * list because it replaced the retired wallet as the money destination.
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
  "/agreements",
  "/profile",
  /*
   * THE STAYS ROOTS. `/stays/search` is listed BEFORE `/stays` on purpose:
   * `tabRootFor` prefix-matches in order, and Explore stays is its own tab,
   * not a page under Stays. Listing them the other way round would light the
   * Stays tab on the search screen and park the pill one destination early.
   */
  "/stays/search",
  "/stays",
  /* The renders carry the dock on settings, saved, the inbox, notifications,
     the ledgers and the crypto surface too (BUILD_06, chrome ruling 1). A
     thread is immersive and a listing carries its own pinned bar, so those
     stay off the list. */
  "/settings",
  "/saved",
  "/messages",
  "/notifications",
  "/bookings",
  /* "/inspections" keeps the dock on the V-35 gate page under it; the bare
     path and "/trips" redirect to Plans (V-76). "/crypto" left with the
     crypto market (V-83), parked on a branch. */
  "/inspections",
  "/restaurants",
  "/assistant",
  /*
   * TWO NOTES THAT DESCRIBED A LIST THIS ONE IS NOT STOOD HERE, AND BOTH ARE
   * CORRECTED RATHER THAN DELETED, because the reasoning in them is still the
   * reasoning and only the conclusion moved.
   *
   * The first said `/saved` IS GONE FROM THIS LIST, on the argument that no
   * tab points at it so the dock would render with the pill parked. It is on
   * the list, six lines above, and has been since the chrome ruling put the
   * dock on the renders' own set of screens. The argument was not wrong about
   * a parked pill; it was answered instead by `[data-parked]` on the pill,
   * which stops drawing "you are here" when nobody is here, so a screen can
   * keep its navigation without a tab claiming it falsely.
   *
   * The second said `/assistant` is deliberately NOT here. It is here too, and
   * that changes nothing, because `isImmersiveRoute` returns true for it and
   * `tabRootFor` tests immersiveness first: the assistant owns the whole
   * viewport with a composer pinned to the bottom edge, and a dock floating
   * over that composer would be in the way of the one thing the screen is
   * for. Tapping the tab still gets you there; the dock steps aside once you
   * arrive, the same way it does for an open thread. Listing it costs nothing
   * and keeps the honest statement that it IS a dock destination.
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
  switchSlot,
  prefetchFull = false,
}: {
  t: ShellDictionary;
  side?: Side;
  active?: string;
  unreadNotifications?: number;
  signedIn?: boolean;
  /**
   * The centre slot, rendered by the shell: the "+" and its Create sheet
   * (`CreateDock`), with the workspace sheet mounted beside it.
   *
   * It arrives as an element rather than as props because it is a CLIENT
   * control whose workspace sheet needs the account's own workspace list, and
   * this component is a server component that has no business fetching one. The shell resolves
   * the list once and hands the finished control down, which is the same
   * arrangement `AppShell` already uses for the drawer.
   */
  switchSlot?: React.ReactNode;
  /**
   * Prefetch each tab's WHOLE page, not only its loading shell (Track M
   * performance). Next's default for a dynamic route prefetches up to the
   * `loading.tsx` boundary, so a tap showed the skeleton while the data was
   * fetched after the tap; the founder saw exactly that on Search. The dock
   * is the product's main road, so its four destinations are fetched ready.
   * False under data saving, when nothing is fetched ahead at all.
   */
  prefetchFull?: boolean;
}) {
  /*
    FIVE SLOTS, AND THE CENTRE ONE IS THE SWITCH.

    Home (Stays on the other side), Search, THE SWITCH, Feed, Profile, on the
    founder's ruling of 22 September. It is still the most important control
    in the bar - everything else changes where you are, and this changes who
    you are while you are there - and it no longer says so by standing above
    the bar. `GOVERNING-01` draws it raised and it shipped raised; the founder
    used it on a real phone and ruled it back in line with the other four, at
    the same height and on the same baseline, smaller, with its container kept
    so it still reads as the special one. The container is the whole of what
    marks it now.

    "MORE" LEAVES THE DOCK, AND NOTHING BECOMES UNREACHABLE. More was never a
    destination: it was a second opener for the side drawer, and the drawer
    still opens from the hamburger in the app header, which renders on every
    route this dock renders on. So the More slot's entire contents are the
    drawer's contents, they have not moved, and the drawer has gained a row
    rather than lost one. Listed item by item in
    `docs/archive/BUILD_07_LEDGER.md`.

    The renders label the fourth slot "Saved" and it ships as "Feed" on the
    founder's correction of 22 September. The stays renders label the second
    slot "Explore" and the property renders "Search": one word ships on both
    sides and the word is Search.
  */
  const tabs: Tab[] =
    side === "stays"
      ? [
          { href: "/stays", label: t.nav.stays, icon: "bed" },
          { href: "/stays/search", label: t.nav.search, icon: "search" },
          { href: "/around", label: t.nav.feed, icon: "feed" },
        ]
      : [
          { href: "/home", label: t.nav.home, icon: "home" },
          { href: "/search", label: t.nav.search, icon: "search" },
          { href: "/around", label: t.nav.feed, icon: "feed" },
        ];

  /* Profile for a member, the way in for a guest. One slot, two honest jobs. */
  const profile: Tab = signedIn
    ? { href: "/profile", label: t.nav.profile, icon: "user" }
    : { href: "/sign-up", label: t.common.signUp, icon: "user" };

  /*
   * THE UNREAD MARK CAME OFF THE PROFILE SLOT, and this file's own argument is
   * why.
   *
   * It was here on the reasoning that "the profile slot is the way through to
   * notifications on a phone", which was true while the app header appeared on
   * tab roots only. The header is on EVERY in-app page now, by the founder's
   * chrome ruling, and it carries the bell with its own dot. Wherever this
   * dock renders the header renders too - a route that is immersive or
   * edge-to-edge has neither - so the two were drawing the same fact twice on
   * the same screen, six inches apart, which is the "three placements for one
   * feature" this file already refuses for the assistant.
   *
   * The founder's target draws exactly one mark, on the bell. `unreadNotifications`
   * is still a prop because the ACCESSIBLE NAME of the profile slot still says
   * how many are waiting, which costs no pixels and is the one place the count
   * itself can be read out.
   */
  const root = tabRootFor(active);
  /*
   * Slot order: two links, THE "+", one link, Profile. The travelling pill
   * counts the "+" as a slot so the geometry stays one fifth per slot, and
   * index 2 can never be active because the "+" is not a destination: it
   * opens the Create sheet over wherever you already are.
   */
  const slots = [tabs[0], tabs[1], null, tabs[2], profile];
  const activeIndex = slots.findIndex((tab) => tab != null && tab.href === root);

  /* The profile slot is the way through to notifications on a phone. */
  const marked = signedIn && unreadNotifications > 0;

  /*
   * THE SUB-NAV BEHIND THE SIXTH SLOT (Track M). The destinations a member
   * reaches often enough to deserve a thumb, which until now lived only in
   * the drawer. The drawer keeps every one of them: this is a second, faster
   * door, not a move. A guest gets the three that make sense signed out.
   */
  const stays = side === "stays";
  const more: DockMoreItem[] = signedIn
    ? [
        { href: "/messages", label: t.nav.messages, icon: "chat-bubble" },
        {
          href: stays ? "/bookings?side=stays&from=stays" : "/bookings",
          label: t.shape.plans.title,
          icon: "calendar-booking",
        },
        { href: "/saved", label: t.nav.saved, icon: "heart" },
        { href: "/assistant", label: t.nav.aiAssistant, icon: "sparkle" },
        { href: "/agreements", label: t.nav.agreements, icon: "document" },
        { href: "/price", label: t.priceCheck.title, icon: "price-tag" },
        { href: "/settings", label: t.nav.settings, icon: "settings-gear" },
        { href: "/support", label: t.nav.helpSupport, icon: "headset" },
      ]
    : [
        { href: "/assistant", label: t.nav.aiAssistant, icon: "sparkle" },
        { href: "/price", label: t.priceCheck.title, icon: "price-tag" },
        { href: "/help", label: t.nav.helpSupport, icon: "headset" },
      ];

  return (
    <AutoHideDock
      route={active}
      label={t.nav.primaryLabel}
      /* 0.75rem off the bottom, and it was 0.35. Held beside the founder's
         target the dock sat almost on the edge of the glass where the render
         floats it clear with a real gap under the capsule, and 5.6px of
         clearance is not a float, it is a bar that missed. The clearance
         token in chrome.css carries the same number, so sticky footers on tab
         routes offset by what the dock actually occupies. */
      /* The row's side insets are in shell-m.css (`.nf-dockrow`): 10px or
         the safe area, whichever is larger, so the capsule is 12px wider
         than it was at 16px and still clears a landscape notch. */
      className="nf-dockrow fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 lg:hidden"
    >
      {/* THE DOCK TAKES THE READER'S THEME (the founder, 29 September 2026,
          later the same day, superseding the night island that stood here):
          in light the capsule, the round More button and its tray are WHITE
          with brand-blue line glyphs and labels (light.css, "THE DOCK IN
          DAYLIGHT"); at night they keep the navy neon glass (shell-m.css). */}
      <ul
        className="nf-tabbar"
        style={
          {
            "--nf-tab-count": slots.length,
            "--nf-tab-i": Math.max(activeIndex, 0),
          } as React.CSSProperties
        }
      >
        {/* The travelling pill: the drawing of a state `aria-current` already
            announces, so it is hidden from the tree. Since 29 September 2026
            it paints nothing (the founder: no container behind the current
            tab); the current tab is its filled glyph, a stronger label and a
            small dot under it (shell-m.css). The element and its geometry
            stay so the arithmetic is there if a highlight ever returns. */}
        <li className="nf-tabbar__pill" data-parked={activeIndex < 0 || undefined} aria-hidden="true" />
        {slots.map((tab, index) => {
          if (tab == null) {
            /* The centre slot: the round "+" (`CreateDock`), with no label
               under it; its accessible name is "Create". It sits in line
               with the other four, same height, same baseline. */
            return (
              <li key="switch" className="nf-tab nf-tab--switch">
                {switchSlot}
              </li>
            );
          }
          const isActive = tab.href === root;
          const isProfile = index === slots.length - 1;
          return (
            <li key={tab.href} className="nf-tab">
              <Link
                href={tab.href}
                prefetch={prefetchFull}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  isProfile && marked
                    ? t.a11y.unreadOn
                        .replace("{label}", tab.label)
                        .replace("{count}", String(unreadNotifications))
                    : tab.label
                }
                className="nf-tab__link"
              >
                <span className="nf-tab__icon">
                  <UiIcon name={tab.icon} size="md" filled={isActive} />
                </span>
                <span className="nf-tab__label">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <DockMore items={more} label={t.nav.more} active={active} />
    </AutoHideDock>
  );
}
