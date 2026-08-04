"use client";

import { useCallback, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Marketing header menu for phones.
 *
 * A three line hamburger opening a right hand slide-in panel: brand row with a
 * close control, the nav stack as chevron rows over hairline dividers, a
 * community strip, and the primary call to action pinned at the foot. Locks
 * page scroll while open and closes on any navigation.
 */
export function MobileMenu({
  links,
  signIn,
  signUp,
  openLabel,
  closeLabel,
}: {
  links: { href: string; label: string }[];
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
        className="nf-icon-btn h-10 w-10"
      >
        <span className="flex w-4 flex-col gap-[4px]" aria-hidden="true">
          <span className="h-[2px] w-full rounded-full bg-current" />
          <span className="h-[2px] w-full rounded-full bg-current" />
          <span className="h-[2px] w-full rounded-full bg-current" />
        </span>
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
                      className="flex items-center justify-between py-4 text-[1rem] font-semibold text-[var(--nf-content-primary)] transition-colors hover:text-[var(--nf-electric-300)]"
                    >
                      {l.label}
                      <UiIcon name="arrow-right" size={16} className="text-[var(--nf-content-muted)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-6">
              <p className="nf-overline mb-3">Community</p>
              <div className="mb-5 flex gap-3">
                <a
                  href="mailto:hello@rentme.ng"
                  aria-label="Email RentMe"
                  className="nf-icon-btn h-11 w-11"
                >
                  <UiIcon name="chat-bubble" size={16} />
                </a>
                <Link href="/assistant" aria-label="RentMe AI" className="nf-icon-btn h-11 w-11">
                  <UiIcon name="sparkle" size={16} />
                </Link>
              </div>

              <Link
                href="/sign-up"
                onClick={() => setOpen(false)}
                className="nf-btn nf-btn--primary nf-breathe w-full py-3.5 text-[0.9375rem]"
              >
                {signUp}
              </Link>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
