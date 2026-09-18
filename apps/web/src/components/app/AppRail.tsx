"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { buildNav } from "./nav-model";
import { NavTree } from "./NavTree";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { SideSwitch } from "./SideSwitch";
import type { Side } from "@/lib/side.constants";

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

export function AppRail({
  t,
  side = "property",
  active = "/home",
  activeType = null,
  userName,
  userHandle = "",
  avatarUrl = "",
  unreadNotifications = 0,
  isAgent = false,
  isAdmin = false,
  signedIn = false,
  variant = "rail",
  onNavigate,
  onClose,
}: {
  t: Dictionary;
  side?: Side;
  active?: string;
  activeType?: string | null;
  userName: string;
  userHandle?: string;
  avatarUrl?: string;
  unreadNotifications?: number;
  isAgent?: boolean;
  isAdmin?: boolean;
  signedIn?: boolean;
  variant?: "rail" | "drawer";
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const sections = useMemo(
    () => buildNav({ t, side, unreadNotifications, isAgent, isAdmin, signedIn }),
    [t, side, unreadNotifications, isAgent, isAdmin, signedIn],
  );
  const drawer = variant === "drawer";

  return (
    <aside
      className={drawer ? "nf-nav nf-nav--drawer" : "nf-nav nf-nav--rail"}
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
          <button
            type="button"
            onClick={onClose}
            aria-label={t.a11y.closeMenu}
            className="nf-nav__close nf-tap"
          >
            <UiIcon name="close" size="sm" />
          </button>
        )}
      </div>

      {signedIn && (
        /*
          THE USER BLOCK, per the drawer render: the avatar in a glowing ring,
          the name, the handle, and a "View profile" glass capsule. One link
          because it is one destination; the capsule is the visible affordance
          and the whole block is its tap target.
        */
        <Link href="/profile" onClick={onNavigate} className={drawer ? "nf-nav__who nf-nav__who--card" : "nf-nav__who"}>
          <span className="nf-nav__avatar" aria-hidden="true">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              userName.slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="nf-nav__whobody">
            <span className="nf-nav__whoname">{userName}</span>
            {drawer && userHandle && <span className="nf-nav__whohandle">@{userHandle}</span>}
            {drawer && (
              <span className="nf-nav__whocta">
                {t.nav.viewProfile}
                <UiIcon name="arrow-right" size={12} />
              </span>
            )}
          </span>
          {!drawer && <UiIcon name="chevron-right" size={12} className="nf-nav__whochev" />}
        </Link>
      )}

      <NavTree
        sections={sections}
        active={active}
        activeType={activeType}
        label={t.nav.primaryLabel}
        onNavigate={onNavigate}
      />

      {/*
        THE FOOT: the coin, then the theme row. The two controls in the
        navigation that change how the product looks rather than where you
        are, and the coin is the bigger question: it turns the whole app over
        to its other side. The drawer render makes it the star, a glass card
        with the coin in a lit ring; see `SideSwitch` and `SideFlip`.
      */}
      <div className="nf-nav__foot">
        <SideSwitch t={t} onNavigate={onNavigate} />
        <ThemeToggle variant="row" />
      </div>
    </aside>
  );
}
