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
 * Marketing header menu for phones.
 *
 * A full-page panel: brand row with a close control, the nav stack as chevron
 * rows over hairline dividers, the two controls that decide how the page is
 * presented, and the primary call to action pinned at the foot. Locks page
 * scroll while open and closes on any navigation.
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

          <div className="nf-rise absolute inset-0 flex flex-col overflow-y-auto bg-[var(--nf-surface-primary)] px-5 pb-6 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <Logo size={40} wordSize={19} />
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
                className="nf-icon-btn h-9 w-9"
              >
                <span className="relative block h-3 w-3" aria-hidden="true">
                  <span className="absolute left-0 top-1/2 block h-[2px] w-full -translate-y-1/2 rotate-45 rounded-full bg-current" />
                  <span className="absolute left-0 top-1/2 block h-[2px] w-full -translate-y-1/2 -rotate-45 rounded-full bg-current" />
                </span>
              </button>
            </div>

            <nav className="flex-1">
              <ul>
                {[...links, { href: "/sign-in", label: signIn }].map((l) => (
                  <li key={l.href} className="border-b border-[var(--nf-border-subtle)]">
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between py-4 text-[1rem] font-semibold text-[var(--nf-content-primary)] transition-colors hover:text-[var(--nf-content-link)]"
                    >
                      {l.label}
                      <UiIcon name="arrow-right" size={16} className="text-[var(--nf-content-muted)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-6">
              {/*
                Theme and language, which are the two things a visitor may want
                to change before reading a word, and which lived only in the
                product and in the desktop header until now.
              */}
              <p className="nf-overline mb-3">Display</p>
              <div className="mb-5 flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher current={locale} label={languageLabel} compact />
              </div>

              {/*
                One way to reach a person, and it goes wherever the support
                module says it goes. This was `mailto:hello@rentme.ng`, a
                mailbox that does not exist, so every tap of it was a message
                sent nowhere. The RentMe AI link next to it pointed at
                `/assistant`, which is inside the product and now behind a
                session, so it was a link to a redirect.
              */}
              <a
                href={SUPPORT_HREF}
                {...(SUPPORT_IS_EMAIL ? {} : { onClick: () => setOpen(false) })}
                className="mb-5 flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-[var(--nf-content-secondary)] hover:text-[var(--nf-content-link)]"
              >
                <UiIcon name="chat-bubble" size={16} />
                Contact support
              </a>

              <ButtonLink
                href="/sign-up"
                onClick={() => setOpen(false)}
                variant="primary"
                full
                className="nf-breathe"
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
