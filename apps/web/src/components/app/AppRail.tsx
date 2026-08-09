"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { buildNav } from "./nav-model";
import { NavTree } from "./NavTree";

/**
 * Personal Mode navigation.
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
  active = "/home",
  activeType = null,
  userName,
  avatarUrl = "",
  unreadNotifications = 0,
  isAgent = false,
  isAdmin = false,
  signedIn = false,
  variant = "rail",
  onNavigate,
}: {
  t: Dictionary;
  /** The current pathname, with no query on it. */
  active?: string;
  /** The current `type` search parameter, which is what separates the five. */
  activeType?: string | null;
  userName: string;
  avatarUrl?: string;
  unreadNotifications?: number;
  isAgent?: boolean;
  isAdmin?: boolean;
  signedIn?: boolean;
  /** `rail` is the sticky desktop column; `drawer` is the phone slide-in. */
  variant?: "rail" | "drawer";
  /** The drawer closes itself when a row is followed. */
  onNavigate?: () => void;
}) {
  const sections = useMemo(
    () => buildNav({ t, unreadNotifications, isAgent, isAdmin, signedIn }),
    [t, unreadNotifications, isAgent, isAdmin, signedIn],
  );
  return (
    <aside
      className={variant === "rail" ? "nf-nav nf-nav--rail" : "nf-nav nf-nav--drawer"}
      aria-label={t.nav.primaryLabel}
    >
      {/* The workspace header, which the reference leads with: who this is,
          and the control that closes the panel. The close button belongs to
          the drawer, which owns the open state. */}
      <div className="nf-nav__head">
        <Link href="/" aria-label={t.a11y.logoHome} className="nf-nav__brand">
          <Logo size={34} wordSize={17} responsive />
        </Link>
      </div>

      {signedIn && (
        <Link href="/profile" onClick={onNavigate} className="nf-nav__who">
          <span className="nf-nav__avatar" aria-hidden="true">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              userName.slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="nf-nav__whoname">{userName}</span>
          <UiIcon name="chevron-right" size={12} className="nf-nav__whochev" />
        </Link>
      )}

      <NavTree
        sections={sections}
        active={active}
        activeType={activeType}
        label={t.nav.primaryLabel}
        onNavigate={onNavigate}
      />
    </aside>
  );
}
