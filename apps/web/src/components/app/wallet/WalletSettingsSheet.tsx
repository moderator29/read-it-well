"use client";

import { useState } from "react";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Sheet } from "@/components/ui/Sheet";

/**
 * Wallet settings.
 *
 * The trust strip - bank-level encryption, kobo-exact ledger, PIN and 2FA -
 * used to sit as three tiles at the very bottom of the wallet, below the
 * transaction history. That is the wrong place for it twice over: it is the
 * last thing a user reaches on a screen whose whole point is the money above
 * it, and it is reference material rather than something you act on, so it was
 * competing for space with the ledger.
 *
 * It belongs in the wallet's own settings, reached from the top of the screen,
 * which is also where the rest of the wallet's controls will land: transaction
 * PIN, two-factor, payout account, statements. The sheet is the container for
 * all of that rather than a one-off panel for the trust copy.
 */

const PROTECTIONS: { icon: BrandIconName; title: string; body: string }[] = [
  {
    icon: "shield-lock",
    title: "Bank-level encryption",
    body: "Wallet writes happen only on our servers, never from a browser.",
  },
  {
    icon: "shield-check",
    title: "Ledger-recorded to the kobo",
    body: "Every movement lives in a permanent, kobo-exact ledger.",
  },
  {
    icon: "doc-shield",
    title: "PIN and 2FA at launch",
    body: "A transaction PIN and two-factor authentication ship with launch.",
  },
];

export function WalletSettingsSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Wallet settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="nf-icon-btn shrink-0"
      >
        <UiIcon name="settings-gear" size={20} />
      </button>

      <Sheet open={open} onOpenChange={setOpen} title="Wallet settings">
        <section aria-labelledby="wallet-protection-heading">
          <h3
            id="wallet-protection-heading"
            className="nf-overline"
          >
            How your money is protected
          </h3>
          <ul className="mt-3 space-y-2">
            {PROTECTIONS.map((p) => (
              <li key={p.title} className="nf-card flex items-start gap-3 p-3.5">
                <span className="h-11 w-11 shrink-0">
                  <BrandIcon name={p.icon} fill />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold leading-snug">
                    {p.title}
                  </span>
                  <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                    {p.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/*
          Deliberately says what is NOT here yet rather than showing disabled
          rows for a PIN screen and a payout account that do not exist. A
          settings sheet full of dead switches is worse than a short one.
        */}
        <p className="mt-5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Transaction PIN, two-factor authentication and payout accounts will
          appear here as they ship.
        </p>
      </Sheet>
    </>
  );
}
