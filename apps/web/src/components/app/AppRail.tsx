"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  buildNav,
  containsCurrent,
  isCurrent,
  type NavLeaf,
  type NavNode,
} from "./nav-model";

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

const OPEN_KEY = "nf_nav_open";

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

  /*
   * Which parents are open.
   *
   * Seeded from the current page so the group you are inside is already open,
   * then merged with whatever this device last opened by hand. The seed wins on
   * first render and the device's choice persists after that, which is the
   * behaviour somebody expects from a sidebar they have arranged once.
   */
  const seeded = useMemo(() => {
    const open = new Set<string>();
    for (const section of sections) {
      for (const item of section.items) {
        if (containsCurrent(item, active, activeType)) open.add(item.href);
      }
    }
    return open;
  }, [sections, active, activeType]);

  const [open, setOpen] = useState<Set<string>>(seeded);

  // The stored set arrives after mount so the server and the first client
  // render agree; a mismatch here would be a hydration error on every page.
  useEffect(() => {
    let stored: string[] = [];
    try {
      stored = JSON.parse(window.localStorage.getItem(OPEN_KEY) ?? "[]") as string[];
    } catch {
      stored = [];
    }
    setOpen(new Set([...seeded, ...(Array.isArray(stored) ? stored : [])]));
  }, [seeded]);

  const toggle = useCallback((href: string) => {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      try {
        window.localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
      } catch {
        // Private browsing. The set holds for this session and no longer.
      }
      return next;
    });
  }, []);

  const leaf = (item: NavLeaf, depth: 0 | 1) => {
    const current = isCurrent(item.href, active, activeType);
    return (
      <li key={`${item.href}-${item.label}`} className={depth === 1 ? "nf-nav__child" : undefined}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={current ? "page" : undefined}
          className={`nf-nav__row${current ? " nf-nav__row--on" : ""}`}
        >
          <span className="nf-nav__glyph" aria-hidden="true">
            <UiIcon name={item.icon} size={depth === 1 ? 14 : 16} filled={current} />
          </span>
          <span className="nf-nav__label">{item.label}</span>
          {item.badge ? (
            <span className="nf-nav__badge nf-numeric">{item.badge}</span>
          ) : null}
        </Link>
      </li>
    );
  };

  const node = (item: NavNode) => {
    if (!item.children) return leaf(item, 0);

    const expanded = open.has(item.href);
    const current = isCurrent(item.href, active, activeType);
    const panelId = `nav-${item.href.replace(/[^a-z0-9]/gi, "-")}`;

    return (
      <li key={item.href}>
        <div className={`nf-nav__row nf-nav__row--parent${current ? " nf-nav__row--on" : ""}`}>
          {/* The label navigates. */}
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={current ? "page" : undefined}
            className="nf-nav__parentlink"
          >
            <span className="nf-nav__glyph" aria-hidden="true">
              <UiIcon name={item.icon} size={16} filled={current} />
            </span>
            <span className="nf-nav__label">{item.label}</span>
          </Link>

          {/* Only the arrow expands, and it says what it will do. */}
          <button
            type="button"
            onClick={() => toggle(item.href)}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`${expanded ? t.a11y.collapse : t.a11y.expand} ${item.label}`}
            className="nf-nav__disclose nf-tap"
          >
            <UiIcon name="chevron-right" size={14} className={expanded ? "rotate-90" : ""} />
          </button>
        </div>

        {expanded && (
          <ul id={panelId} className="nf-nav__children">
            {item.children.map((child) => leaf(child, 1))}
          </ul>
        )}
      </li>
    );
  };

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
          <UiIcon name="chevron-right" size={13} className="nf-nav__whochev" />
        </Link>
      )}

      <nav aria-label={t.nav.primaryLabel} className="nf-nav__scroll">
        {sections.map((section, index) => (
          <div key={section.heading ?? `section-${index}`} className="nf-nav__section">
            {section.heading && <h2 className="nf-nav__heading">{section.heading}</h2>}
            <ul>{section.items.map(node)}</ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
