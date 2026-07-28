"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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

      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="nf-rise absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col overflow-y-auto border-l border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-5 pb-6 pt-5 shadow-[var(--nf-shadow-float)]">
            <div className="mb-4 flex items-center justify-between">
              <Logo size={28} wordSize={15} />
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
                      className="flex items-center justify-between py-4 text-[1rem] font-semibold text-[var(--nf-content-primary)] transition-colors hover:text-[var(--nf-violet-300)]"
                    >
                      {l.label}
                      <UiIcon name="arrow-right" size={14} className="text-[var(--nf-content-muted)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-6">
              <p className="nf-overline mb-3">Community</p>
              <div className="mb-5 flex gap-2.5">
                <a
                  href="mailto:hello@naijafinds.com"
                  aria-label="Email NaijaFinds"
                  className="nf-icon-btn h-11 w-11"
                >
                  <UiIcon name="star" size={17} />
                </a>
                <Link href="/assistant" aria-label="NaijaFinds AI" className="nf-icon-btn h-11 w-11">
                  <UiIcon name="sparkle" size={17} />
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
        </div>
      )}
    </div>
  );
}
