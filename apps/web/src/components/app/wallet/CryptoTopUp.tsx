"use client";

import { useActionState, useEffect, useState } from "react";
import type { Locale } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/envelope";
import { startCryptoDeposit, type CryptoStart } from "@/lib/wallet/actions";
import { AmountField } from "./AmountField";
import { ErrorNotice } from "./ErrorNotice";
import { mintIdempotencyKey } from "./idempotency";

const CRYPTO_INITIAL: ActionResult<CryptoStart | null> = { ok: false, error: "" };

/**
 * The crypto top-up form, through Yellow Card.
 *
 * Deliberately the same shape as the card top-up: a naira amount, a submit,
 * a hand-off to a hosted page. The person is never asked for a coin, a
 * network or an address, and never shown a rate. They say how much naira
 * they want in their wallet; Yellow Card decides what that costs in crypto
 * at the moment they pay and carries the movement.
 *
 * Shared by the wallet home (quick action) and the Crypto surface (the
 * "fund with crypto" entry), and drawn on either only when the server says
 * the keys exist. The action refuses on its own if they do not.
 */
export function CryptoTopUpForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(startCryptoDeposit, CRYPTO_INITIAL);
  const [amount, setAmount] = useState("");
  /* One key per mounted form, so a double tap is one movement once the
     schema takes the field. Ignored until then. */
  const [idempotencyKey] = useState(mintIdempotencyKey);
  const redirecting = state.ok && state.data !== null;

  useEffect(() => {
    if (state.ok && state.data) window.location.assign(state.data.paymentUrl);
  }, [state]);

  if (redirecting) {
    return (
      <div role="status" aria-live="polite" className="py-group text-center">
        <p className="nf-body font-semibold">Opening the crypto payment window</p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
          You are on your way to Yellow Card to pay. Your wallet is credited in naira once the
          payment settles on the network, which is usually a few minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <AmountField
        value={amount}
        onChange={setAmount}
        error={state.ok ? undefined : state.fieldErrors?.amount}
        quickAmounts
        locale={locale}
      />
      {/* The one thing somebody topping up with crypto needs to know before
          they commit, said before the button rather than after the payment. */}
      <p className="nf-body-sm mt-row leading-relaxed text-[var(--nf-content-muted)]">
        You are topping up in naira. The crypto amount is worked out at the payment window, and
        this figure is what reaches your wallet.
      </p>
      <Button type="submit" variant="primary" full className="mt-row" loading={pending}>
        Continue to payment
      </Button>
      <ErrorNotice state={state} />
    </form>
  );
}
