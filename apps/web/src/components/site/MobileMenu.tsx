"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Marketing header menu for phones.
 *
 * The desktop nav links disappear below lg, so this puts them behind a
 * hamburger that opens a full glass sheet: nav stack, then sign in and sign
 * up. The sheet locks page scroll while open and closes on any navigation.
 * Pure client state, no portal needed because the header is already sticky
 * at the top of the stacking order.
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
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((v) => !v)}
        className="nf-icon-btn h-10 w-10"
      >
        {/* Two bars that fold into a cross. */}
        <span className="relative block h-3.5 w-4.5" aria-hidden="true">
          <span
            className={`absolute left-0 top-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-200 ${open ? "top-1/2 -translate-y-1/2 rotate-45" : ""}`}
          />
          <span
            className={`absolute bottom-0 left-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-200 ${open ? "bottom-1/2 translate-y-1/2 -rotate-45" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="nf-glass nf-rise fixed inset-x-0 bottom-0 top-[60px] z-40 overflow-y-auto">
          <nav className="nf-shell flex min-h-full flex-col gap-1 py-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--nf-radius-lg)] px-4 py-3.5 text-[1.05rem] font-semibold text-[var(--nf-content-primary)] transition-colors hover:bg-[var(--nf-glass-fill)]"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-auto grid gap-2.5 pb-6 pt-6">
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="nf-btn nf-btn--glass w-full py-3.5"
              >
                {signIn}
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setOpen(false)}
                className="nf-btn nf-btn--primary w-full py-3.5"
              >
                {signUp}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
