"use client";

import { useState } from "react";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Sheet } from "@/components/ui/Sheet";
import { Row, RowList } from "@/components/app/Screen";
import { QuickPlate } from "./QuickPlate";

/**
 * Wallet settings.
 *
 * The wallet's protections (writes only on our servers, a kobo-exact ledger)
 * used to sit as three tiles at the very bottom of the wallet, below the
 * transaction history. That is the wrong place for it twice over: it is the
 * last thing a user reaches on a screen whose whole point is the money above
 * it, and it is reference material rather than something you act on, so it was
 * competing for space with the ledger.
 *
 * It belongs in the wallet's own settings. Only what is true today is said
 * here: the render-style claims ("bank-level encryption", a PIN "at launch")
 * were removed on 22 September under the rule that the images govern form and
 * never claims (docs/design/references/roles/README.md). What the wallet is
 * NOT is said plainly and points at the terms (lib/legal/terms.tsx, section 15)
 * rather than naming a regulator, which the founder's rule keeps off screens.
 */

const PROTECTIONS: { icon: BrandIconName; title: string; body: string }[] = [
  {
    icon: "shield-lock",
    title: "Moved only by our servers",
    body: "Wallet writes happen only on our servers, never from a browser.",
  },
  {
    icon: "shield-check",
    title: "Ledger-recorded to the kobo",
    body: "Every movement is a row in a kobo-exact ledger, and you can read every row in your history.",
  },
];

/**
 * `card` draws the trigger as a Quick Actions card on the wallet home (the
 * plate, one title line, one sub line), which is where it lives now.
 * Without it the trigger is the square icon button.
 */
export function WalletSettingsSheet({
  card,
  heading = "How your wallet record works",
}: {
  card?: { title: string; sub: string };
  /** The sheet's section heading, from `wallet.home.settingsHeading`. It
      names what the rows say (a record and who writes to it), not a
      promise of protection, which was a claim nobody could point at. */
  heading?: string;
} = {}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {card ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="nf-wallet-quick__card"
        >
          <QuickPlate art="shield-check-tile" glyph="shield-check" />
          <span className="nf-wallet-quick__title">{card.title}</span>
          <span className="nf-wallet-quick__sub">{card.sub}</span>
        </button>
      ) : (
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
      )}

      <Sheet open={open} onOpenChange={setOpen} title="Wallet settings">
        <section aria-labelledby="wallet-protection-heading">
          <h3
            id="wallet-protection-heading"
            className="nf-overline"
          >
            {heading}
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
          A Vallo wallet balance is a record in naira, not a bank deposit; the
          terms of service say what that means. There is no transaction PIN on
          the wallet today.
        </p>
      </Sheet>
    </>
  );
}
