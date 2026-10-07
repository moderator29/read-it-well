"use client";

import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { NairaField } from "@/components/ui/NairaField";
import { Money } from "@/components/ui/Money";
import { confirmDepositPaid, prepareDeposit, cancelBalanceMovement, type DepositStart } from "@/lib/money/member-wallet-actions";
import type { MovementView } from "@/lib/money/member-wallet";
import { Watching } from "./WithdrawFlow";

/**
 * ADD MONEY (Part B phase 7): the documented payment intent's hosted
 * collection. Never the retired virtual account, and never a Vallo bank
 * account: the page the member pays on is the partner's, opened from here,
 * and the deposit is Available only when the partner says so.
 */
type Step = "amount" | "pay" | "waiting";

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
    if (!next && start && step === "pay") void cancelBalanceMovement({ movementId: start.movement.id });
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
    const r = await prepareDeposit({ clientKey, amount });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setClientKey(crypto.randomUUID());
      return;
    }
    setStart(r.data);
    setStep("pay");
  };

  const paid = async () => {
    if (!start) return;
    setBusy(true);
    setError(null);
    const r = await confirmDepositPaid({ movementId: start.movement.id });
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
            <p className="nf-body-sm text-[var(--nf-content-secondary)]">
              You pay from your own bank or card on our escrow partner&apos;s secure page. The money is added once your bank confirms it.
            </p>
            <NairaField label="Amount" value={amount} onValueChange={setAmount} hint="The smallest amount is ₦100." />
            <Button variant="primary" size="lg" loading={busy} disabled={!amount} onClick={begin}>
              Continue
            </Button>
          </>
        ) : null}

        {step === "pay" && start ? (
          <>
            <p className="nf-h1 tabular-nums">
              <Money minor={start.movement.amountMinor} locale={locale} mode="full" />
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
