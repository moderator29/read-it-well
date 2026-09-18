"use client";

import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Button } from "@/components/ui/Button";
import { TYPE } from "@/components/app/Screen";
import { MoneySheet } from "@/components/app/wallet/MoneySheet";
import { CryptoTopUpForm } from "@/components/app/wallet/CryptoTopUp";

/**
 * The one place the market surface touches the person's money: the way to
 * fund the naira wallet with crypto, through Yellow Card.
 *
 * `enabled` is decided on the server from whether the keys exist. Off, the
 * card stays and says so in plain words rather than vanishing, because the
 * wallet's fourth tile points here and a tile that lands on nothing is a
 * broken promise. On, the button opens the same form the wallet's quick
 * action opens, posting to `startCryptoDeposit` untouched.
 *
 * `#fund` in the address opens the sheet on arrival, which is how the
 * wallet's tile lands a person straight on the form.
 */
export function FundWithCrypto({
  enabled,
  locale,
  copy,
}: {
  enabled: boolean;
  locale: Locale;
  copy: Dictionary["crypto"];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (enabled && window.location.hash === "#fund") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, [enabled]);

  return (
    <section id="fund" className="nf-card nf-crypto-fund" aria-labelledby="nf-crypto-fund-title">
      <span className="nf-crypto-fund__mark" aria-hidden="true">
        <BrandIcon name="coin-naira" fill />
      </span>
      <div className="relative min-w-0 flex-1">
        <h2 id="nf-crypto-fund-title" className={TYPE.rowTitle}>
          {enabled ? copy.fundTitle : copy.fundOffTitle}
        </h2>
        <p className={`mt-3xs ${TYPE.rowMeta}`}>{enabled ? copy.fundBody : copy.fundOffBody}</p>
        {enabled && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="mt-row"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            {copy.fundAction}
          </Button>
        )}
      </div>
      {enabled && (
        <MoneySheet open={open} title={copy.fundTitle} hint={copy.fundBody} onClose={() => setOpen(false)}>
          <CryptoTopUpForm locale={locale} />
        </MoneySheet>
      )}
    </section>
  );
}
