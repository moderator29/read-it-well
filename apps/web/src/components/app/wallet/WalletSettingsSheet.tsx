"use client";

import { useState } from "react";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Sheet } from "@/components/ui/Sheet";
import { Row, RowList } from "@/components/app/Screen";

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
          {/*
            THREE PROMISES ARE ONE OBJECT WITH THREE PARTS, NOT THREE CARDS.

            Each protection had its own `nf-card`: three borders, three blurs,
            three radii and three corner blooms stacked down a sheet, for one
            idea. `RowList boxed` is the platform's answer and it is already
            what the breakdown sheet next door uses - one surface, hairlines
            between the parts, the heading outside it. The type comes up with
            the change: the titles were 15px, which is a size the scale does not
            hold, and the bodies 13px.
          */}
          <RowList boxed className="mt-heading">
            {PROTECTIONS.map((p) => (
              <Row key={p.title} className="items-start gap-row">
                <span className="block h-11 w-11 shrink-0">
                  <BrandIcon name={p.icon} fill />
                </span>
                <span className="min-w-0">
                  <span className="nf-body block font-semibold leading-snug">{p.title}</span>
                  <span className="nf-body-sm mt-inline-tight block leading-relaxed text-[var(--nf-content-muted)]">
                    {p.body}
                  </span>
                </span>
              </Row>
            ))}
          </RowList>
        </section>

        {/*
          Deliberately says what is NOT here yet rather than showing disabled
          rows for a PIN screen and a payout account that do not exist. A
          settings sheet full of dead switches is worse than a short one.
        */}
        <p className="nf-body-sm mt-block leading-relaxed text-[var(--nf-content-muted)]">
          Transaction PIN, two-factor authentication and payout accounts will
          appear here as they ship.
        </p>
      </Sheet>
    </>
  );
}
