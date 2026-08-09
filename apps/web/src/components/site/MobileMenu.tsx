"use client";

import { useCallback, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { SUPPORT_HREF, SUPPORT_IS_EMAIL } from "@/lib/support-email";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import type { Locale } from "@naijafinds/i18n";

/**
 * Marketing side navigation, for phones.
 *
 * SHORT. One grouped surface of rows, the display controls, and one button.
 *
 * What it was: a bare list where every row carried its own bottom border
 * INCLUDING the last one, so the stack ended on a hairline hanging under
 * nothing; an "Display" overline over two loose controls; a "Contact support"
 * line set as a third kind of thing again, at a third size; and the sign-up
 * button wearing `nf-breathe`, a permanent looping pulse on the one control in
 * the panel that did not need help being noticed. Four different row treatments
 * for what is, at most, six destinations.
 *
 * Now: the destinations live in a single glass surface with inset hairlines
 * between them and none at either end, which is the platform's grouped list and
 * the pattern the reference set uses for every panel it has. Support is a row
 * in that group rather than a separate species. The label sits OUTSIDE the
 * surface. The two display controls sit under their own label in the same
 * shape, and the only filled thing in the panel is the one action it is asking
 * for.
 *
 * The opener is the product's panel glyph rather than the three-line
 * hamburger it used to be. Two menus on one platform drawn differently is two
 * platforms as far as a thumb is concerned, and the product settled on this
 * mark; the marketing site had simply never been brought across.
 */
export function MobileMenu({
  links,
  locale,
  languageLabel,
  signIn,
  signUp,
  openLabel,
  closeLabel,
}: {
  links: { href: string; label: string }[];
  locale: Locale;
  languageLabel: string;
  signIn: string;
  signUp: string;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(false), []);
  /* This panel carried aria-modal and no Escape handler, so a keyboard could
     open it and not get out. One hook, the same contract everywhere. */
  useOverlay({ open, onClose: close, panelRef: panel });

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={openLabel}
        onClick={() => setOpen(true)}
        className="nf-icon-btn h-11 w-11"
      >
        <UiIcon name="panel-left" size={20} />
      </button>

      {/*
       * Portalled to <body>: the sticky header's backdrop-filter makes it the
       * containing block for fixed descendants, which trapped and clipped the
       * panel inside the 64px header bar. From the body it truly covers the
       * viewport and slides in like it should.
       */}
      {open &&
        createPortal(
        <div
          ref={panel}
          tabIndex={-1}
          className="fixed inset-0 z-[75] outline-none"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--nf-overlay-backdrop)] backdrop-blur-sm"
          />

          <div className="nf-rise absolute inset-0 flex flex-col overflow-y-auto bg-[var(--nf-surface-primary)] px-heading pb-block pt-heading">
            <div className="mb-block flex items-center justify-between">
              <Logo size={40} wordSize={19} />
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
                className="nf-icon-btn nf-press h-9 w-9"
              >
                <UiIcon name="close" size={16} />
              </button>
            </div>

            <nav className="flex-1">
              <span className="nf-group-label">Go to</span>
              {/*
                ONE SURFACE. The rows used to each carry their own bottom
                border, last one included, so the list ended on a rule hanging
                under nothing and read as five separate strips. Inset dividers,
                none at the ends, and the whole thing inside a single card: one
                object with parts.

                No `--inset` modifier: an inset divider exists to clear a
                leading glyph column, and these rows have no leading glyph. The
                card's own inline padding is what holds the rules off the
                corners here, which is the same job done by the surface instead
                of by the row.
              */}
              <ul className="nf-card nf-group nf-rows">
                {[
                  ...links,
                  { href: "/sign-in", label: signIn },
                  { href: SUPPORT_HREF, label: "Contact support" },
                ].map((l) =>
                  l.href === SUPPORT_HREF && SUPPORT_IS_EMAIL ? (
                    <li key={l.href}>
                      <a href={l.href} className="nf-row nf-row--tap justify-between">
                        <span className="nf-body font-semibold text-[var(--nf-content-primary)]">
                          {l.label}
                        </span>
                        <UiIcon
                          name="chevron-right"
                          size={16}
                          className="shrink-0 text-[var(--nf-content-muted)]"
                        />
                      </a>
                    </li>
                  ) : (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        prefetch
                        onClick={() => setOpen(false)}
                        className="nf-row nf-row--tap justify-between"
                      >
                        <span className="nf-body font-semibold text-[var(--nf-content-primary)]">
                          {l.label}
                        </span>
                        <UiIcon
                          name="chevron-right"
                          size={16}
                          className="shrink-0 text-[var(--nf-content-muted)]"
                        />
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="mt-block">
              {/*
                Theme and language, which are the two things a visitor may want
                to change before reading a word. Same shape as the group above,
                label outside, so the panel has two objects on it rather than
                four kinds of thing.
              */}
              <span className="nf-group-label">Display</span>
              <div className="nf-card flex items-center gap-inline px-group py-row">
                <ThemeToggle />
                <LanguageSwitcher current={locale} label={languageLabel} compact />
              </div>

              {/* The one filled control in the panel, and the reason the panel
                  exists. It used to wear `nf-breathe`, a permanent pulse loop:
                  the single most prominent thing on the surface, animated
                  forever to draw attention to itself. */}
              <ButtonLink
                href="/sign-up"
                onClick={() => setOpen(false)}
                variant="primary"
                size="lg"
                full
                className="mt-block"
              >
                {signUp}
              </ButtonLink>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
