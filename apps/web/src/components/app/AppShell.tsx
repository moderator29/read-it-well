"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Dictionary, Locale } from "@naijafinds/i18n";
import { AppRail } from "./AppRail";
import { MobileTabBar, showsTabBar } from "./MobileTabBar";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AuthGateProvider, SignedOutActions } from "@/components/auth/AuthGate";

/**
 * Personal Mode shell.
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
  locale,
  userName,
  unreadNotifications = 0,
  avatarUrl = "",
  signedIn = false,
  isAgent = false,
  isAdmin = false,
  children,
}: {
  t: Dictionary;
  locale: Locale;
  userName: string;
  /** Real unread notification count, resolved on the server by the layout. */
  unreadNotifications?: number;
  /** The caller's own photo, empty when they have not set one. */
  avatarUrl?: string;
  /** True only for a real session. Signed out, the avatar becomes a way in. */
  signedIn?: boolean;
  /** An approved agent, so Agent Mode is a place they can actually go. */
  isAgent?: boolean;
  /** Staff, so the console is a place they can actually go. */
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const active = usePathname();
  /* Five navigation rows are the same pathname with a different `type`, so the
     rail needs that one parameter to tell them apart. Everything else about
     the query is ignored, so /search?q=Lekki still lights Explore. */
  const activeType = useSearchParams().get("type");
  const [drawer, setDrawer] = useState(false);

  /*
   * Immersive surfaces.
   *
   * The assistant and an open message thread are conversations, not documents:
   * they own the whole viewport the way every serious chat product does, with
   * their own header and their own composer pinned to the bottom edge. Inside
   * the standard shell they read as a small panel wedged between the app bar
   * and the tab bar, which is exactly the "inner tab" feeling to avoid. Here
   * the shell steps back: no app header, no tab bar, no page padding, and the
   * column runs the full height so the thread scrolls inside itself.
   */
  const immersive = active === "/assistant" || /^\/messages\/[^/]+$/.test(active);

  /*
   * Edge-to-edge surfaces.
   *
   * A third shell mode, distinct from `immersive`. A listing leads with
   * photography that the reference runs full-bleed under the status bar, with
   * floating glass back, share and save controls sitting on the image itself -
   * and `ListingGallery` has drawn exactly those controls, with `nf-safe-top`
   * on them, since before this existed. What stopped it was the shell: a 64px
   * glass header was welded onto every route, so the hero could never reach the
   * top of the screen and the audit logged it as the last unclosed P0.
   *
   * Unlike `immersive` this keeps the page scrolling normally. The assistant
   * and an open thread own the viewport and scroll inside themselves; a listing
   * is a document that happens to start with a photograph. So this drops the
   * header and NOTHING else.
   *
   * It used to drop the page gutter too, and that was wrong twice over. The
   * hero and the content sheet both reach the edges with `-mx-5 md:-mx-8`,
   * which is written to CANCEL the gutter, not to live without one - so with
   * the gutter gone they overshot by 20px on each side. Measured at 393px: the
   * back control sat at x=-8, the save control and the photo counter at x=401,
   * and the sheet's own `px-5` put the title at exactly x=0 with no margin on
   * either side. The same mistake on the vertical: the hero's `-mt-8` cancels
   * the shell's `py-8`, so with no top padding it climbed 32px under the
   * status bar. The gutter stays; only the header goes.
   */
  const edgeToEdge = /^\/listing\/[^/]+$/.test(active);

  /*
   * `pinsActionBar` USED TO BE DECLARED HERE and is gone with the desktop
   * dock. It existed for exactly one collision: the listing page ends on a
   * full-width `<ActionBar>` at `bottom-0 z-50`, and the dock was a floating
   * pill at `bottom-6 z-40`, so from `lg` up the two occupied the same strip
   * and one floated over the other. No dock, no collision, no special case.
   */

  /* The drawer closes itself on navigation. Escape, the scroll lock, the focus
     trap and returning focus to the opener are all useOverlay's, because this
     drawer carried aria-modal and none of the behaviour it promises. */
  useEffect(() => setDrawer(false), [active]);
  const drawerPanel = useRef<HTMLDivElement | null>(null);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  useOverlay({ open: drawer, onClose: closeDrawer, panelRef: drawerPanel });

  return (
    /*
     * The gate, once, around the whole shell.
     *
     * Every gated control below - save, message, request inspection, pay, list,
     * wallet, switch profile, follow, react, post - reads the session from this
     * one provider rather than being handed a `signedIn` prop down through
     * however many components sit between it and the layout. There is one
     * definition of "may this person act", and it is here.
     */
    <AuthGateProvider signedIn={signedIn}>
    <div className="flex min-h-dvh">
      <AppRail
        t={t}
        active={active}
        activeType={activeType}
        userName={userName}
        avatarUrl={avatarUrl}
        unreadNotifications={unreadNotifications}
        isAgent={isAgent}
        isAdmin={isAdmin}
        signedIn={signedIn}
      />

      {/*
        Mobile side navigation.

        Was a full-bleed `inset-0` panel, which is not a drawer at all - it is a
        page that replaces the app, so there is nothing to tell you the app is
        still behind it and no edge to dismiss it from.

        It now behaves the way the supplied reference does: it slides in from
        the RIGHT, stops just short of the far edge so a strip of the dimmed app
        stays visible and tappable, and travels on the spring rather than
        fading. Right rather than left because the trigger sits on the right and
        because a right-hand drawer is reachable one-handed on a phone.
      */}
      {drawer && (
        <div
          ref={drawerPanel}
          tabIndex={-1}
          className="fixed inset-0 z-[60] outline-none lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label={t.a11y.closeMenu}
            onClick={() => setDrawer(false)}
            className="absolute inset-0 bg-[var(--nf-overlay-backdrop)] backdrop-blur-sm"
          />
          <div className="nf-drawer nf-drawer--right absolute inset-y-0 right-0 overflow-y-auto">
            <AppRail
              t={t}
              active={active}
              activeType={activeType}
              userName={userName}
              avatarUrl={avatarUrl}
              unreadNotifications={unreadNotifications}
              isAgent={isAgent}
              isAdmin={isAdmin}
              signedIn={signedIn}
              variant="drawer"
              onNavigate={closeDrawer}
            />
          </div>
        </div>
      )}

      <main
        id="main"
        className={
          immersive
            ? "flex h-dvh min-w-0 flex-1 flex-col overflow-hidden"
            : `min-w-0 flex-1 lg:pb-20 ${showsTabBar(active) ? "pb-24" : "pb-8"}`
        }
      >
        {/* ------------------------------------------------------- top bar */}
        {!immersive && (
        /*
         * Edge-to-edge is a PHONE behaviour, so the header is hidden rather
         * than dropped. On a phone the hero should reach the status bar, and
         * the gallery draws its own floating back, share and save controls on
         * the image. On desktop there is no status bar to reach, the rail
         * already carries navigation, and this header is the only place the
         * theme toggle, the language switcher and the assistant live - removing
         * it there would trade one fixed audit item for three regressions.
         */
        <header
          className={`nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40 ${
            edgeToEdge ? "hidden lg:block" : ""
          }`}
        >
          <div className="flex h-[64px] items-center gap-4 px-4 sm:gap-4 sm:px-5 md:px-8">
            {/* Phones lead with the side navigation, exactly like the desktop left rail. */}
            <button
              type="button"
              aria-label={t.a11y.openMenu}
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="nf-icon-btn h-10 w-10 lg:hidden"
            >
              {/*
                The panel toggle, not a hamburger.

                Three stacked lines say "a list is behind this" and nothing
                more, and they say it identically whether the thing that opens
                is a menu, a filter sheet or a drawer. This glyph says what
                actually happens: a panel arrives beside the content.
              */}
              <UiIcon name="panel-left" size={20} />
            </button>
            {/* The wordmark, on phones only: above lg the rail already carries
                it, and repeating a logo twice on one screen is noise. It used
                to be a chip reading "Lagos, Nigeria" for everybody, including
                the person in Kano. Where somebody actually is now belongs to
                home, where it is read from their own profile. */}
            <Link href="/home" aria-label={t.a11y.logoHome} className="nf-tap shrink-0 lg:hidden">
              <Logo size={34} wordSize={17} />
            </Link>

            <div className="flex-1" />

            {/*
              SIGNED OUT: the two things that matter, top right.

              Sign up is the filled primary because a visitor who has got this
              far is the person the screen is for; Log in is the quiet outline
              beside it because somebody returning is looking for it rather than
              being sold it. Both carry the screen they are standing on, so
              joining from a property page comes back to that property page.
            */}
            <SignedOutActions t={t} />

            {/* The bell and its marker. A dot, not a numeral: the exact count
                lives on the rail and on /notifications, and at this size a
                number is unreadable. Zero renders no marker at all. */}
            {signedIn && (
            <Link
              href="/notifications"
              /* The count is INSIDE one dictionary sentence rather than
                 appended to a translated noun. English writes "Notifications,
                 3 unread" and the other three do not all put the number in the
                 same place, so a template assembled here could only ever be
                 right in one language. The marker beside it is a dot, so this
                 label is the only place the number is stated at all. */
              aria-label={
                unreadNotifications > 0
                  ? t.a11y.notificationsUnread.replace(
                      "{count}",
                      String(unreadNotifications),
                    )
                  : t.nav.notifications
              }
              className="nf-icon-btn relative h-10 w-10 shrink-0"
            >
              <UiIcon name="bell" size={20} />
              {unreadNotifications > 0 && (
                <span
                  aria-hidden="true"
                  data-testid="shell-unread-dot"
                  className="absolute right-2 top-2 block h-2.5 w-2.5 rounded-full border-2 border-[var(--nf-surface-primary)] bg-[var(--nf-brand-primary)]"
                />
              )}
            </Link>
            )}

            {signedIn && (
            <Link
              href="/profile"
              aria-label={t.nav.profile}
              className="nf-tap shrink-0 rounded-full p-[1.5px]"
              style={{ background: "var(--nf-gradient-brand)" }}
            >
              <span className="block rounded-full bg-[var(--nf-surface-primary)] p-[1.5px]">
                {avatarUrl ? (
                  /* The avatars bucket is public, so the CDN URL renders
                     without a signed request. next/image is skipped
                     deliberately: one small square from a host that only
                     exists once the platform keys land. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[0.8125rem] font-bold text-[var(--nf-content-on-brand)]"
                    style={{ background: "var(--nf-gradient-brand)" }}
                  >
                    {userName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
            </Link>
            )}
          </div>
        </header>
        )}

        {immersive ? (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
          /* The same wrapper for `edgeToEdge` as for everything else. The hero
             reaches all four edges by cancelling this padding, which only
             works while the padding is here to cancel. */
          <div className="nf-shell py-8 sm:py-10">{children}</div>
        )}
      </main>

      {/*
        The dock only appears on the routes it can actually point at. It was
        rendering on every non-immersive screen - wallet, settings,
        notifications, listing pages, checkout - with nothing highlighted,
        occupying the bottom of the screen and answering no question. Those
        screens are reached from a tab or the drawer and keep the back
        affordance instead.
      */}
      {!immersive && showsTabBar(active) && (
        <MobileTabBar
          t={t}
          active={active}
          unreadNotifications={unreadNotifications}
          signedIn={signedIn}
        />
      )}
    </div>
    </AuthGateProvider>
  );
}
