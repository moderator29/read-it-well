"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary, Locale } from "@naijafinds/i18n";
import { AppRail } from "./AppRail";
import { MobileTabBar, showsTabBar } from "./MobileTabBar";
import { DesktopDock } from "./DesktopDock";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Personal Mode shell.
 *
 * The single wrapper for every consumer page, so the navigation is identical
 * everywhere rather than living on the home route alone (Master Rule 17). On
 * `lg` and up the sticky `AppRail` sits beside the content; below `lg` the rail
 * is gone and the fixed `MobileTabBar` carries navigation, with the main column
 * padded so nothing hides behind it. The active destination is read from the
 * current path here, so the highlight stays correct as the user moves around
 * without each page having to pass it in.
 */
export function AppShell({
  t,
  locale,
  userName,
  unreadNotifications = 0,
  avatarUrl = "",
  signedIn = false,
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
  children: React.ReactNode;
}) {
  const active = usePathname();
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

  /* The drawer closes itself on navigation. Escape, the scroll lock, the focus
     trap and returning focus to the opener are all useOverlay's, because this
     drawer carried aria-modal and none of the behaviour it promises. */
  useEffect(() => setDrawer(false), [active]);
  const drawerPanel = useRef<HTMLDivElement | null>(null);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  useOverlay({ open: drawer, onClose: closeDrawer, panelRef: drawerPanel });

  return (
    <div className="flex min-h-dvh">
      <AppRail
        t={t}
        active={active}
        userName={userName}
        unreadNotifications={unreadNotifications}
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
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <div className="nf-drawer nf-drawer--right absolute inset-y-0 right-0 overflow-y-auto">
            <AppRail
              t={t}
              active={active}
              userName={userName}
              unreadNotifications={unreadNotifications}
              variant="drawer"
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
        <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
          <div className="flex h-[64px] items-center gap-4 px-4 sm:gap-4 sm:px-5 md:px-8">
            {/* Phones lead with the side navigation, exactly like the desktop left rail. */}
            <button
              type="button"
              aria-label={t.a11y.openMenu}
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="nf-icon-btn h-10 w-10 lg:hidden"
            >
              <span className="flex w-4 flex-col gap-[5px]" aria-hidden="true">
                <span className="h-[2px] w-full rounded-full bg-current" />
                <span className="h-[2px] w-full rounded-full bg-current" />
                <span className="h-[2px] w-full rounded-full bg-current" />
              </span>
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

            <div className="hidden sm:contents">
              <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
            </div>
            <ThemeToggle />

            {/* The primitive, not a hand-rolled `nf-btn` class list: the
                variant, the size ramp, the loading slot and the haptic all
                come from `ButtonLink`. Main's props are kept verbatim -
                including `max-sm:hidden`, because on a phone the bell and the
                avatar take this space and the assistant lives on the rail. */}
            <ButtonLink
              href="/assistant"
              variant="primary"
              size="sm"
              aria-label={t.nav.aiAssistant}
              className="max-sm:hidden"
            >
              <UiIcon name="sparkle" size={20} />
              <span className="hidden sm:inline">{t.nav.aiAssistant}</span>
            </ButtonLink>

            {/* The bell and its marker. A dot, not a numeral: the exact count
                lives on the rail and on /notifications, and at this size a
                number is unreadable. Zero renders no marker at all. */}
            <Link
              href="/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `Notifications, ${unreadNotifications} unread`
                  : "Notifications"
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

            <Link
              href={signedIn ? "/profile" : "/sign-in"}
              aria-label={signedIn ? t.nav.profile : t.common.signIn}
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
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[0.8125rem] font-bold text-white"
                    style={{ background: "var(--nf-gradient-brand)" }}
                  >
                    {userName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
            </Link>
          </div>
        </header>
        )}

        {immersive ? (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
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
        <MobileTabBar t={t} active={active} unreadNotifications={unreadNotifications} />
      )}
      {!immersive && <DesktopDock t={t} active={active} />}
    </div>
  );
}
