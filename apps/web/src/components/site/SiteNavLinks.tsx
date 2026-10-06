"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

export type SiteNavLink = { href: string; label: string };

/** One door in the public menu: a line glyph, its name, one line on what is behind it. */
export type MegaItem = SiteNavLink & { description: string; icon: UiIconName };
export type MegaGroup = { id: string; label: string; items: MegaItem[] };

/**
 * The desktop rail: Home / Properties / Stays / AI / More.
 *
 * MORE OPENS THE PUBLIC MENU (reference 7086, Session 3): the doors that are
 * not in the rail, in three labelled columns, each door a line glyph on a
 * plate, its name, and one line saying what is behind it, so a stranger can
 * choose without opening four pages to find out. It is a disclosure of
 * links, not an ARIA menu: Tab moves through it in reading order, Escape and
 * a click outside close it, and choosing a door closes it. It arrives on
 * `land` 240ms, the columns 60ms apart (landing.css, "the public menu"), and
 * under reduced motion, Calm and Off it is simply there.
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
  mega,
}: {
  links: SiteNavLink[];
  more: SiteNavLink[];
  moreLabel: string;
  extras?: ReactNode;
  /** The grouped public menu. When given, More opens it instead of the list. */
  mega?: MegaGroup[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /*
   * THE MENU TAKES THE READER'S THEME BACK. The site bar is a night island in
   * both themes (the navy top block, `SiteHeader.tsx`), and this popover is
   * inside it, so in light it opened navy over a white page, the language
   * select with it. Read from the root when it opens, because "system" is
   * only resolved in the browser; `tokens.css` redeclares the light palette
   * on a `[data-theme="light"]` nested in a light root, so the popover paints
   * as the page does while staying in the DOM order after its button.
   */
  const [readerTheme, setReaderTheme] = useState<"light" | undefined>(undefined);
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
      <div ref={wrap} className={mega ? "nf-site-nav-more-wrap" : "relative"}>
        <button
          type="button"
          className="nf-site-nav-link nf-site-nav-more"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup={mega ? undefined : "menu"}
          onClick={() => {
            setReaderTheme(document.documentElement.dataset.theme === "light" ? "light" : undefined);
            setOpen((v) => !v);
          }}
        >
          {moreLabel}
          <UiIcon name="chevron-down" size={16} aria-hidden />
        </button>
        {open && mega ? (
          <div id={menuId} className="nf-site-mega" data-theme={readerTheme}>
            {mega.map((group) => (
              <div key={group.id} className="nf-site-mega__group" role="group" aria-labelledby={`${menuId}-${group.id}`}>
                <p id={`${menuId}-${group.id}`} className="nf-section-label nf-site-mega__label">
                  {group.label}
                </p>
                <ul className="nf-site-mega__list">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        aria-current={isCurrent(item.href) ? "page" : undefined}
                        className="nf-site-mega__item"
                        onClick={close}
                      >
                        <span className="nf-site-mega__glyph" aria-hidden="true">
                          <UiIcon name={item.icon} size={20} />
                        </span>
                        <span className="nf-site-mega__text">
                          <span className="nf-site-mega__title">{item.label}</span>
                          <span className="nf-site-mega__desc">{item.description}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {extras && <div className="nf-site-nav-menu-extras">{extras}</div>}
          </div>
        ) : null}
        {open && !mega ? (
          <div id={menuId} role="menu" className="nf-site-nav-menu" data-theme={readerTheme}>
            {more.map((l) => (
              <Link key={l.href} href={l.href} role="menuitem" prefetch onClick={close}>
                {l.label}
              </Link>
            ))}
            {extras && <div className="nf-site-nav-menu-extras">{extras}</div>}
          </div>
        ) : null}
      </div>
    </>
  );
}
