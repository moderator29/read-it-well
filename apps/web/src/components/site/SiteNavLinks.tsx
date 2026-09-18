"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

export type SiteNavLink = { href: string; label: string };

/**
 * The desktop rail: Home / Properties / Stays / AI / More.
 *
 * Client only for two reasons: `aria-current` needs the pathname, and More
 * is a disclosure. The menu is a plain popover, not a dialog: it closes on
 * Escape, on a click outside, and on choosing an entry, and it never traps
 * focus, because a five-item list under a nav link is not a modal moment.
 *
 * `extras` is where the theme and language controls live on desktop. The
 * render's bar carries the logo, five links, the search glyph, Sign In and
 * Get Started and nothing else, so the two display controls sit under More
 * (lead re-audit); they stay one click away and fully working.
 */
export function SiteNavLinks({
  links,
  more,
  moreLabel,
  extras,
}: {
  links: SiteNavLink[];
  more: SiteNavLink[];
  moreLabel: string;
  extras?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          prefetch
          aria-current={isCurrent(l.href) ? "page" : undefined}
          className="nf-site-nav-link"
        >
          {l.label}
        </Link>
      ))}
      <div ref={wrap} className="relative">
        <button
          type="button"
          className="nf-site-nav-link nf-site-nav-more"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          {moreLabel}
          <UiIcon name="chevron-down" size={16} aria-hidden />
        </button>
        {open && (
          <div id={menuId} role="menu" className="nf-site-nav-menu">
            {more.map((l) => (
              <Link key={l.href} href={l.href} role="menuitem" prefetch onClick={close}>
                {l.label}
              </Link>
            ))}
            {extras && <div className="nf-site-nav-menu-extras">{extras}</div>}
          </div>
        )}
      </div>
    </>
  );
}
