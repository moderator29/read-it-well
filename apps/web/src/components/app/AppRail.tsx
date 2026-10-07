"use client";

import type { ShellDictionary } from "@/lib/i18n/shell-dictionary";
import { Button } from "@/components/ui/Button";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ThemeRow } from "@/components/site/ThemeControl";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { initial } from "@/lib/text/initial";
import { buildNav } from "./nav-model";
import { useUnreadConversations } from "@/lib/messages/unread-live";
import { NavTree } from "./NavTree";
import { SideSwitch } from "./SideSwitch";
import { COMPANY_LEGAL_NAME } from "@/lib/legal/company";
import type { Side } from "@/lib/side.constants";
import "@/app/css/side-flip.css";

/**
 * The consumer navigation, for both sides.
 *
 * One component for the sticky desktop rail and the phone drawer, reading one
 * model, so the two cannot drift (Master Rule 17). The destinations are still
 * the frozen set; what changed is that they are now shaped like what they are.
 *
 * **Parents open.** Five of the old twelve rows were `/search?type=` variants
 * of one screen sitting at the same level as Wallet, which said that Hotels and
 * your money were the same kind of thing. They are children of Explore now, on
 * a tree line, and Agent Mode and the console are groups of their own for the
 * people who have them.
 *
 * **A parent is also a destination.** Its label navigates and only the
 * disclosure arrow expands, because a parent that merely toggles is a dead
 * control the first time somebody taps the word rather than the chevron.
 *
 * **It opens on the page you are on.** Arriving at `/agent/reviews` from a
 * notification opens Agent Mode with Reviews lit, so the navigation explains
 * where you are rather than making you find it. Anything else you open by hand
 * is remembered on the device.
 *
 * The type and the glyphs are deliberately smaller than the rows they replaced.
 * A drawer that has to hold four groups and their children cannot also give
 * every row 17px semibold and a 44px tile: the owner asked for it smaller, and
 * with sub-navigation underneath it, it has to be.
 */

/*
 * THE COLLAPSED RAIL (Session 3; north star 6.2: "desktop gains a collapsed
 * 72px icon-only mode with tooltips, remembered per member").
 *
 * REMEMBERED PER DEVICE, NOT PER ACCOUNT, and that is a stated compromise:
 * per member would need a profile field Session 2 owns, and a rail width is
 * a convenience of one screen rather than a fact about a person (a member
 * who collapses it on a 13-inch laptop may want it open on a 27-inch
 * monitor). So it is one `localStorage` key, every read and write in
 * try/catch, and a private window or blocked storage simply gets the open
 * rail. The cost: it is applied after hydration, so a member who keeps it
 * collapsed sees the open rail for the first frame of a cold load.
 *
 * Read through `useSyncExternalStore`, so the toggle, a second tab and the
 * page all agree without an effect writing state.
 */
const RAIL_KEY = "nf-rail-collapsed";
const RAIL_EVENT = "nf:rail";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(RAIL_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(RAIL_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeCollapsed(next: boolean) {
  try {
    if (next) window.localStorage.setItem(RAIL_KEY, "1");
    else window.localStorage.removeItem(RAIL_KEY);
  } catch {
    /* Storage refused: the choice lasts for this page only. */
  }
  window.dispatchEvent(new Event(RAIL_EVENT));
}

export function AppRail({
  t,
  side = "property",
  active = "/home",
  activeType = null,
  userName,
  userHandle = "",
  avatarUrl = "",
  verified = false,
  unreadNotifications = 0,
  isAgent = false,
  isAdmin = false,
  isHost = false,
  signedIn = false,
  variant = "rail",
  onNavigate,
  onClose,
  socialOn = true,
}: {
  t: ShellDictionary;
  side?: Side;
  active?: string;
  activeType?: string | null;
  userName: string;
  userHandle?: string;
  avatarUrl?: string;
  /**
   * The human-checked tick, beside the name in the drawer's user card, as the
   * drawer render draws it. Default false and nothing in the product sets it
   * true yet: `ShellIdentity.verified` is still hardcoded false, so the tick
   * renders for nobody rather than for everybody. Master Rule 12 - the badge
   * only ever means a human was checked - makes that the only honest default.
   */
  verified?: boolean;
  unreadNotifications?: number;
  isAgent?: boolean;
  isAdmin?: boolean;
  isHost?: boolean;
  signedIn?: boolean;
  variant?: "rail" | "drawer";
  onNavigate?: () => void;
  onClose?: () => void;
  /** The `social` switch: off, the Around row leaves the navigation. */
  socialOn?: boolean;
}) {
  /* B1: the Messages row carries the live unread-conversations count, from
     the same store (and the same one channel) as the dock's More button. */
  const unreadConversations = useUnreadConversations(signedIn, active) ?? 0;
  const sections = useMemo(() => {
    const built = buildNav({ t, side, unreadNotifications, unreadConversations, isAgent, isAdmin, isHost, signedIn });
    /* North star 10 E: with the `social` switch off, Around is not offered
       as a place to go. Dropped here rather than in the model so the model
       stays one statement of the navigation and the switch one filter. */
    if (socialOn) return built;
    return built.map((section) => ({ ...section, items: section.items.filter((item) => !item.href.startsWith("/around")) }));
  }, [t, side, unreadNotifications, unreadConversations, isAgent, isAdmin, isHost, signedIn, socialOn]);
  const drawer = variant === "drawer";
  const stored = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const collapsed = !drawer && stored;
  /* The root carries it too, as the hook the member shell's own width reads
     (`.nf-app-shell` in nav-island.css), and it is taken off again when the
     rail unmounts. It used to stay behind: collapse the member rail, move
     client-side into the agent, host or admin console (which draw their own
     sidebars on `--nf-rail-width`, and no member rail), and those sidebars
     were crushed to 72px until a reload. The width itself is now scoped to
     the member shell, so a console's sidebar never reads it at all. */
  useEffect(() => {
    if (drawer) return;
    const root = document.documentElement;
    if (collapsed) root.dataset.rail = "collapsed";
    else delete root.dataset.rail;
    return () => {
      delete root.dataset.rail;
    };
  }, [collapsed, drawer]);

  return (
    <aside
      className={drawer ? "nf-nav nf-nav--drawer" : "nf-nav nf-nav--rail"}
      data-collapsed={collapsed || undefined}
      aria-label={t.nav.primaryLabel}
    >
      {/*
        The head. On the desktop rail it is the wordmark; the drawer render
        leads with the person instead, so there the head carries only the
        close control and the user block below is the first thing read.
      */}
      <div className="nf-nav__head">
        {!drawer && (
          <Link href="/" aria-label={t.a11y.logoHome} className="nf-nav__brand">
            <Logo size={42} wordSize={19} responsive />
          </Link>
        )}
        {onClose && (
          <Button variant="icon" round leadingIcon="close" onClick={onClose} aria-label={t.a11y.closeMenu} className="ms-auto" />
        )}
        {!drawer && (
          <Button
            variant="icon"
            round
            leadingIcon="panel-left"
            onClick={() => writeCollapsed(!collapsed)}
            aria-label={collapsed ? t.a11y.expand : t.a11y.collapse}
            aria-expanded={!collapsed}
            title={collapsed ? t.a11y.expand : t.a11y.collapse}
            className="nf-nav__collapse ms-auto"
          />
        )}
      </div>

      {signedIn && (
        /*
          THE USER BLOCK. In the drawer it is the pump.fun-style head the
          founder chose on 25 September 2026 (Track M): no card and no box, the
          face bare at the top of the panel, the name large under it and the
          handle quiet. One link because it is one destination; the whole
          block is its tap target. (The "View profile" words under it went in
          the founder's second round: the face and the name already say it.)
        */
        <Link
          href="/profile"
          onClick={onNavigate}
          className={drawer ? "nf-nav__who nf-nav__who--hero" : "nf-nav__who"}
          title={userName}
        >
          <span className="nf-nav__avatar relative" aria-hidden="true">
            {/* The initial is always drawn, and the photo sits over it. An
                unloaded photo used to leave only the gradient ground, which
                is what the drawer showed on iPhone. The photo is eager for
                the same reason as the drawer's icons: the drawer mounts off
                screen and Safari never fetched a lazy image inside it. */}
            {initial(userName)}
            {avatarUrl ? (
              /* 28px in the rail, 64px in the drawer head: the CSS decides,
                 so `sizes` has to follow the same branch or the browser
                 fetches the wrong one of the two. */
              <RemoteImage
                src={avatarUrl}
                alt=""
                width={drawer ? 64 : 28}
                height={drawer ? 64 : 28}
                sizes={drawer ? "64px" : "28px"}
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </span>
          <span className="nf-nav__whobody">
            <span className="nf-nav__whoname">
              {userName}
              {drawer && verified && (
                /* The circular badge, not the shield: `BCD39CA8` draws a
                   filled disc with a white tick beside the name, and the
                   shield now means a checked LISTING and nothing else.
                   (R1 finding A12.) */
                <UiIcon
                  name="verified-badge"
                  size={16}
                  className="nf-nav__whotick"
                  label={t.a11y.verifiedAccount}
                />
              )}
            </span>
            {drawer && userHandle && <span className="nf-nav__whohandle">@{userHandle}</span>}
            {/* "View profile" STOOD HERE (the founder, Track M: "remove that
                view profile"). The whole head is still the link to the
                profile; the words were a second label for the same tap. */}
          </span>
          {!drawer && <UiIcon name="chevron-right" size={12} className="nf-nav__whochev" />}
        </Link>
      )}

      <NavTree
        sections={sections}
        active={active}
        activeType={activeType}
        /* DOC-21: the dock is also a nav named "Primary", and two navigation
           landmarks with one name are one entry too many in a landmark list. */
        label={t.a11y.railNav}
        onNavigate={onNavigate}
        whole={drawer}
        collapsed={collapsed}
      />

      {/*
        THE FOOT: the coin, then the theme control. The two things in the
        navigation that change how the product LOOKS rather than where you
        are, and the coin is the bigger question: it turns the whole app over
        to its other side. The drawer render makes it the star, a glass card
        with the coin in a lit ring; see `SideSwitch` and `SideFlip`.

        SWITCH PROFILE STOOD FIRST IN HERE AND IS GONE, on the founder's
        ruling of 22 September: "it lives in the dock now and two entrances to
        the same sheet in the same product is clutter". The dock renders on
        every route this drawer's opener renders on, so nothing moved out of
        reach; the panel simply stopped offering the same door twice.
      */}
      <div className="nf-nav__foot">
        <SideSwitch t={t} onNavigate={onNavigate} />
        {/*
          THE THEME CONTROL, BACK AT THE FOOT (25 September 2026: the founder
          reversed the dark-only rule). Light, Dark and System, remembered in
          storage and a cookie so the server paints the right one. See
          `components/site/ThemeControl.tsx` and `lib/theme/theme.ts`. Since
          Track M it is a feature row that opens the three choices beneath it,
          as the founder's reference draws settings rows.
        */}
        <ThemeRow />
        {/*
          THE LEGAL ROW AT THE FOOT OF THE DRAWER, which the drawer render
          draws and the product did not have: a divider, a shield, the
          registered name in small caps, a chevron. It is a LINK, to the
          terms, because a chevron that goes nowhere is a lie and because
          Master Rule 14 allows the registered name only on a legal surface -
          a door into one is exactly that.

          Drawer only. The desktop rail is a permanent column beside the
          content, and the render puts this at the bottom of a panel that is
          read top to bottom and dismissed; the rail's equivalent is the site
          footer.
        */}
        {drawer && (
          <Link href="/terms" onClick={onNavigate} className="nf-nav__legal">
            {/* THE GLYPH SITS IN THE SHARED SLOT AND IS ASKED FOR AT THE
                SHARED STEP. It was a bare 16px icon beside a 14px chevron in a
                row whose neighbours draw 24px glyphs in a 24px slot, which is
                three icon sizes inside one panel and is most of what the
                founder means by rows added at different times. One slot, one
                step, one vertical rule for every label on the panel.

                `document`, not the shield the render draws. The only shield in
                the pack is `shield-stop`, which this product has given one
                meaning - an agent stopped from trading - and borrowing it for
                a link to the terms would teach that shape a second one.
                Master Rule 12's discipline about the verified tick is the same
                discipline: a mark means one thing. What is behind this row is
                a document, so it is a document. */}
            <span className="nf-nav__glyph" aria-hidden="true">
              <UiIcon name="document" size="md" />
            </span>
            {/* No chevron element: the drawer's own row chevron is a CSS
                corner on `::after` and this link is in that selector now, so
                the panel draws one chevron one way instead of an 8px corner
                on nine rows and a 14px glyph on this one. */}
            <span className="nf-nav__legalname">{COMPANY_LEGAL_NAME}</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
