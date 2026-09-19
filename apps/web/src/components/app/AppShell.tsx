"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { AppRail } from "./AppRail";
import { MobileTabBar, isImmersiveRoute, showsTabBar } from "./MobileTabBar";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { AuthGateProvider, SignedOutActions } from "@/components/auth/AuthGate";
import { sideOfPath, SIDE_HOME, type Side } from "@/lib/side.constants";
import { SideFlip } from "./flip/SideFlip";
import { SideSync } from "./SideSync";

/**
 * The consumer shell, for both sides.
 *
 * The single wrapper for every consumer page, so the navigation is identical
 * everywhere rather than living on the home route alone. On `lg` and up the
 * sticky `AppRail` sits beside the content; below `lg` the rail is gone and the
 * fixed `MobileTabBar` carries navigation, with the main column padded so
 * nothing hides behind it. The active destination is read from the current path
 * here, so the highlight stays correct as the user moves around without each
 * page having to pass it in.
 *
 * ---------------------------------------------------------------------------
 * THE HEADER LOST THREE CONTROLS AND THE SHELL LOST A WHOLE NAVIGATION SURFACE.
 *
 * The app bar carried six controls on every screen: the drawer toggle, the
 * wordmark, a language switcher, a theme toggle, a permanently filled AI
 * Assistant button, the notification bell and the avatar. Three of those had no
 * business being there:
 *
 *  - **Language** is a choice somebody makes once, and it is a card on
 *    `/settings`. A permanent control for a once-ever decision is a control
 *    that is wrong 99.9% of the time it is on screen.
 *  - **Theme** is the same argument, and it is a card on `/settings` too.
 *  - **The assistant** was the loudest thing on the bar - filled primary, brand
 *    gradient, on every route - and it was ALSO a tab on the phone dock and
 *    ALSO a row in the rail. Three placements for one feature. It keeps the
 *    one in the side navigation, which renders as the rail on desktop and the
 *    drawer on a phone, so it has exactly one placement per viewport.
 *
 * **The desktop dock is gone entirely.** It was a floating pill fixed over the
 * bottom of the content offering Notifications, Messages and Settings - all
 * three of which are rows in the rail, three inches away, permanently visible
 * on the same viewport the dock only appeared on. It was a second navigation
 * competing with the first, and on the listing page it fought the sticky action
 * bar for the bottom edge, which is why `pinsActionBar` existed. That special
 * case is gone with it.
 *
 * WHAT THE HEADER CARRIES NOW: the drawer toggle and the wordmark on a phone,
 * then either the bell and the avatar (signed in) or Sign up and Log in
 * (signed out).
 */
export function AppShell({
  t,
  side = "property",
  userName,
  userHandle = "",
  verified = false,
  unreadNotifications = 0,
  avatarUrl = "",
  signedIn = false,
  isAgent = false,
  isAdmin = false,
  preview,
  children,
}: {
  t: Dictionary;
  side?: Side;
  userName: string;
  userHandle?: string;
  /** The human-checked tick in the drawer's user card. See `AppRail`. */
  verified?: boolean;
  unreadNotifications?: number;
  avatarUrl?: string;
  signedIn?: boolean;
  isAgent?: boolean;
  isAdmin?: boolean;
  /**
   * The dev preview harness, and nothing else, ever.
   *
   * Two facts the chrome takes from the browser rather than from a prop: the
   * route it is on, and whether the drawer is open. Neither can be reached
   * from a screenshot harness - `verify-shots.mjs` loads a URL and shoots,
   * it does not click - so the drawer, which is the single largest surface
   * this component owns, could not be proven against its reference image at
   * all. `app/(dev)/preview/f1/*` sets this; the product never does, and the
   * preview tree 404s in production.
   */
  preview?: { route?: string; drawer?: boolean };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = preview?.route ?? pathname;
  /* Five navigation rows are the same pathname with a different `type`, so the
     rail needs that one parameter to tell them apart. Everything else about
     the query is ignored, so /search?q=Lekki still lights Explore. */
  const activeType = useSearchParams().get("type");
  const [drawer, setDrawer] = useState(preview?.drawer ?? false);

  const effectiveSide: Side = sideOfPath(active) ?? side;
  const immersive = isImmersiveRoute(active);
  const edgeToEdge = /^\/(listing|stay|restaurant)\/[^/]+$/.test(active);

  /*
    THE HEADER IS ON EVERY IN-APP PAGE, by the founder's ruling
    (DESIGN_DIRECTION section 3.2): hamburger, lockup, bell, avatar, both
    sides. It used to appear on tab roots only, on the argument that inner
    pages carry their own back control; the renders put the lockup and the
    bell over inner pages too, and the drawer has to be reachable from
    anywhere. The one exception stays: a photo-first detail page reaches the
    top edge with its own controls riding the picture.
  */
  const showsHeader = !immersive && !edgeToEdge;

  /* The drawer closes on navigation. State derived during render rather than
     in an effect, so there is no frame with the old page under an open panel. */
  const [drawerRoute, setDrawerRoute] = useState(active);
  if (active !== drawerRoute) {
    setDrawerRoute(active);
    if (drawer) setDrawer(false);
  }

  const drawerPanel = useRef<HTMLDivElement | null>(null);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const openDrawer = useCallback(() => setDrawer(true), []);
  useOverlay({ open: drawer, onClose: closeDrawer, panelRef: drawerPanel });

  /*
   * THE HEADER IS NOT A BAR UNTIL THERE IS SOMETHING UNDER IT.
   *
   * Every governing render that draws this header - the founder's home
   * target, the feed render, the flip render, the stays render - draws the
   * lockup, the bell and the avatar sitting ON THE PAGE, with no bar behind
   * them at all. What shipped was an 88 per cent canvas veil on every screen
   * at every scroll position, which at the top of a page is a flat dark band
   * across the first 60px with a hard edge under it, over a page whose own
   * brand glow it is masking. (R1 finding A38.)
   *
   * The veil is not wrong, it is just premature: the reason it exists is
   * content passing UNDERNEATH, and at scroll zero nothing is. So the bar is
   * transparent until the page moves and frosts once it has, which is both
   * what the renders show and what the veil was for.
   *
   * A scroll listener rather than `animation-timeline: scroll()`, which is
   * Chromium-only and would leave every other engine permanently transparent
   * with type scrolling through the lockup - the exact defect the veil
   * prevents. Passive, rAF-throttled, and it writes an attribute rather than
   * state on every frame, so a scroll costs one class change at the moment
   * it crosses the threshold and nothing at all in between. Not motion, so
   * `prefers-reduced-motion` does not apply: it is a material that answers a
   * condition, like the dock's own auto-hide.
   */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!showsHeader) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [showsHeader]);

  const marked = signedIn && unreadNotifications > 0;

  return (
    <AuthGateProvider signedIn={signedIn}>
    <SideFlip side={effectiveSide} t={t}>
    <SideSync side={effectiveSide} />
    <div className="flex min-h-dvh" data-side={effectiveSide}>
      <AppRail
        t={t}
        side={effectiveSide}
        active={active}
        activeType={activeType}
        userName={userName}
        userHandle={userHandle}
        avatarUrl={avatarUrl}
        unreadNotifications={unreadNotifications}
        isAgent={isAgent}
        isAdmin={isAdmin}
        signedIn={signedIn}
      />

      {/*
        The side drawer: the designed surface of the drawer render, sliding in
        from the LEFT as the render has it, stopping short of the far edge so a
        strip of the dimmed app stays visible and tappable, on the spring.
      */}
      {drawer && (
        <div
          ref={drawerPanel}
          tabIndex={-1}
          className="fixed inset-0 z-[60] outline-none lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t.nav.menuLabel}
        >
          <button
            type="button"
            aria-label={t.a11y.closeMenu}
            onClick={closeDrawer}
            className="nf-drawer-scrim absolute inset-0"
          />
          {/* The panel's own box is the stylesheet's: the drawer render draws
              a FLOATING lit panel with all four corners rounded and a strip of
              the dimmed app beside it, not a slab welded to the screen edge,
              and the safe areas are part of that geometry. Utilities here
              would outrank the component layer and pin it back to the edge. */}
          <div className="nf-drawer nf-drawer--left absolute overflow-y-auto">
            <AppRail
              t={t}
              side={effectiveSide}
              active={active}
              activeType={activeType}
              userName={userName}
              userHandle={userHandle}
              avatarUrl={avatarUrl}
              verified={verified}
              unreadNotifications={unreadNotifications}
              isAgent={isAgent}
              isAdmin={isAdmin}
              signedIn={signedIn}
              variant="drawer"
              onNavigate={closeDrawer}
              onClose={closeDrawer}
            />
          </div>
        </div>
      )}

      <main
        id="main"
        className={
          immersive
            ? "flex h-dvh min-w-0 flex-1 flex-col overflow-hidden"
            : `min-w-0 flex-1 lg:pb-3xl ${showsTabBar(active) ? "pb-4xl" : "pb-xl"}`
        }
      >
        {showsHeader && (
        <header
          data-scrolled={scrolled || undefined}
          className={`nf-safe-top nf-app-header sticky top-0 z-40 ${
            signedIn ? "lg:hidden" : ""
          }`}
        >
          <div className="flex h-header-sm items-center gap-sm px-gutter sm:h-header">
            <button
              type="button"
              aria-label={t.a11y.openMenu}
              aria-expanded={drawer}
              onClick={openDrawer}
              className="nf-tap nf-icon-btn nf-app-header__btn -ms-2xs lg:hidden"
            >
              <UiIcon name="menu" size="md" />
            </button>
            <Link href={SIDE_HOME[effectiveSide]} aria-label={t.a11y.logoHome} className="nf-tap nf-app-header__brand lg:hidden">
              <Logo size={40} wordSize={19} />
            </Link>
            <div className="flex-1" />
            <SignedOutActions t={t} />
            {signedIn && (
              <>
                <Link
                  href="/notifications"
                  aria-label={
                    marked
                      ? t.a11y.notificationsUnread.replace("{count}", String(unreadNotifications))
                      : t.nav.notifications
                  }
                  className="nf-tap nf-icon-btn nf-app-header__btn"
                >
                  <UiIcon name="bell" size="md" />
                  {marked && <span aria-hidden="true" className="nf-app-header__dot" />}
                </Link>
                <Link href="/profile" aria-label={t.nav.profile} className="nf-tap nf-app-header__avatar">
                  {avatarUrl ? (
                    /* The header avatar is a 40px circle on every screen in
                       the product, and the source is a full size upload. It
                       goes through the optimiser at the size it is drawn;
                       `RemoteImage` keeps an unexpected host from throwing
                       here, which on the app header would be a 500 on every
                       route at once. */
                    <RemoteImage src={avatarUrl} alt="" width={40} height={40} sizes="40px" />
                  ) : (
                    <span aria-hidden="true">{userName.slice(0, 1).toUpperCase()}</span>
                  )}
                </Link>
              </>
            )}
          </div>
        </header>
        )}

        {immersive ? (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
          <div className="nf-shell py-section-tight">{children}</div>
        )}
      </main>

      {!immersive && showsTabBar(active) && (
        <MobileTabBar
          t={t}
          side={effectiveSide}
          active={active}
          unreadNotifications={unreadNotifications}
          signedIn={signedIn}
          drawerOpen={drawer}
          onMore={openDrawer}
        />
      )}
    </div>
    </SideFlip>
    </AuthGateProvider>
  );
}
