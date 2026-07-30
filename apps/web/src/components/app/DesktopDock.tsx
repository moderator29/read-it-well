"use client";

import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The desktop dock.
 *
 * A small floating pill fixed to the bottom centre of the screen, `lg` and
 * up only: the rail carries full navigation, so this is quick reach for the
 * handful of destinations worth one click from anywhere, not a second nav.
 * Mirrors the mobile tab bar's own visibility rule (hidden on the immersive
 * assistant/thread surfaces, which own the bottom edge themselves).
 */
type DockItem = { href: string; label: string; icon: UiIconName };

export function DesktopDock({ t, active }: { t: Dictionary; active: string }) {
  const items: DockItem[] = [
    { href: "/notifications", label: "Notifications", icon: "bell" },
    { href: "/messages", label: t.nav.messages, icon: "chat-bubble" },
    { href: "/settings", label: t.nav.settings, icon: "settings-gear" },
  ];

  return (
    <nav
      aria-label="Quick access"
      className="nf-dock fixed inset-x-0 bottom-6 z-40 mx-auto hidden w-fit lg:flex"
    >
      {items.map((item) => {
        const isActive = active === item.href || active.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            title={item.label}
            className="nf-dock__btn"
          >
            <UiIcon name={item.icon} size={19} strokeWidth={isActive ? 2 : 1.8} />
          </Link>
        );
      })}
    </nav>
  );
}
