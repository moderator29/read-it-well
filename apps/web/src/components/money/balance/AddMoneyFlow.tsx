"use client";

import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { AmountPad, type AmountChip } from "../AmountPad";
import { MoneyFigure } from "../kit";
import { confirmDepositPaid, prepareDeposit, type DepositStart } from "@/lib/money/member-wallet-actions";
import type { MovementView } from "@/lib/money/member-wallet";
import { Watching } from "./WithdrawFlow";
import { reach } from "./reach";

/**
 * ADD MONEY (Part B phase 7): the documented payment intent's hosted
 * collection. Never the retired virtual account, and never a Vallo bank
 * account: the page the member pays on is the partner's, opened from here,
 * and the deposit is Available only when the partner says so.
 */
type Step = "amount" | "pay" | "waiting";

/* Quick amounts for adding money: round figures to tap, not suggestions about anybody's money. */
const PRESETS: AmountChip[] = [
  { label: "₦10,000", naira: 10_000 },
  { label: "₦50,000", naira: 50_000 },
  { label: "₦100,000", naira: 100_000 },
];

const TEST_LABEL: Record<string, string> = {
  bankName: "Bank",
  accountNumber: "Account number",
  accountName: "Account name",
  amount: "Amount",
};

export function AddMoneyFlow({ open, onOpenChange, locale, onMoved }: { open: boolean; onOpenChange(open: boolean): void; locale: Locale; onMoved(): void }) {
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [start, setStart] = useState<DepositStart | null>(null);
  const [movement, setMovement] = useState<MovementView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = (next: boolean) => {
    /* Closing at the pay step leaves the deposit pending, never cancelled: the
       member may already have paid at their bank, and a cancelled movement can
       never be completed by the provider's word that follows. It settles or
       expires by that word, not by this sheet closing. */
    if (!next) {
      setStep("amount");
      setStart(null);
      setMovement(null);
      setError(null);
      setClientKey(crypto.randomUUID());
    }
    onOpenChange(next);
  };

  const begin = async () => {
    setBusy(true);
    setError(null);
    const r = await reach(() => prepareDeposit({ clientKey, amount }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      if (!r.unreached) setClientKey(crypto.randomUUID());
      return;
    }
    setStart(r.data);
    setStep("pay");
  };

  const paid = async () => {
    if (!start) return;
    setBusy(true);
    setError(null);
    const r = await reach(() => confirmDepositPaid({ movementId: start.movement.id }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (r.data.message) setError(r.data.message);
    if (r.data.movement.status !== "awaiting_payment") {
      setMovement(r.data.movement);
      setStep("waiting");
      onMoved();
    }
  };

  return (
    <Sheet open={open} onOpenChange={close} title="Add money" detents={[0.92]} testId="balance-add">
      <div className="grid gap-block pb-block">
        {step === "amount" ? (
          <>
            <AmountPad
              value={amount}
              onValueChange={setAmount}
              label="Amount to add"
              question="How much to add?"
              chips={PRESETS}
              hint="From your own bank or card. The smallest amount is ₦100."
              testId="add-pad"
            />
            <Button variant="primary" size="lg" loading={busy} disabled={!amount} onClick={begin}>
              Continue
            </Button>
          </>
        ) : null}

        {step === "pay" && start ? (
          <>
            <p className="text-center">
              <MoneyFigure minor={start.movement.amountMinor} locale={locale} size="hero" kobo="auto" />
            </p>
            {start.hosted.kind === "checkout_url" ? (
              <>
                <p className="nf-body-sm text-[var(--nf-content-secondary)]">
                  The payment page opens in a new tab. Come back here when you have paid; nothing is added until your bank confirms.
                </p>
                <Button variant="primary" size="lg" onClick={() => window.open(start.hosted.kind === "checkout_url" ? start.hosted.url : "", "_blank", "noopener")}>
                  Open the payment page
                </Button>
              </>
            ) : start.hosted.kind === "test_account" ? (
              <div className="nf-panel nf-panel--card grid gap-xs" data-testid="balance-test-account">
                <p className="nf-overline text-[var(--nf-content-muted)]">Test environment: pay into this test account</p>
                <dl className="nf-maths">
                  {Object.entries(start.hosted.details).map(([k, v]) => (
                    <div className="nf-maths__row" key={k}>
                      <dt>{TEST_LABEL[k] ?? k}</dt>
                      <dd className="font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            <Button variant="secondary" size="lg" loading={busy} onClick={paid}>
              I have paid
            </Button>
            <p className="nf-caption text-[var(--nf-content-muted)]">Reference {start.movement.reference}</p>
          </>
        ) : null}

        {step === "waiting" && movement ? <Watching kind="deposit" movement={movement} locale={locale} onDone={() => close(false)} onSettled={onMoved} /> : null}

        {error ? (
          <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
