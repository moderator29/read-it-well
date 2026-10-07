"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { DragToConfirm } from "@/components/ui/DragToConfirm";
import { NairaField } from "@/components/ui/NairaField";
import { SelectField, TextField } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import {
  cancelBalanceMovement,
  checkBalanceBankAccount,
  confirmBalanceMovement,
  listBalanceBanks,
  prepareWithdrawal,
  type Quote,
} from "@/lib/money/member-wallet-actions";
import type { MovementView } from "@/lib/money/member-wallet";
import { REFUSAL } from "@/lib/money/balance-copy";
import { lastFour } from "@/lib/money/funds";
import { Breakdown, WaitingRoom, useWatchedMovement } from "./balance-ui";
import { reach } from "./reach";

/**
 * WITHDRAW (Part B phase 8, the founder's fourteen steps; phase 9's check):
 *
 *   bank -> account number -> the provider names the account -> the member
 *   says it is theirs -> amount -> the provider sets its fee on a staged
 *   intent -> seven figures -> slide to confirm -> submitted -> waiting
 *   for the bank -> the webhook says done.
 *
 * Founder reference 95840448 (one question per block, the balance in view)
 * and 6AF37222 (the figure first). Nothing is guessed in the browser: the
 * name, the fee and every total come back from the server.
 */
type Step = "account" | "amount" | "review" | "otp" | "waiting";

export function WithdrawFlow({
  open,
  onOpenChange,
  locale,
  availableMinor,
  onMoved,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  locale: Locale;
  availableMinor: number;
  onMoved(): void;
}) {
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState<Step>("account");
  const [banks, setBanks] = useState<{ name: string; code: string }[] | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [movement, setMovement] = useState<MovementView | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bankName = banks?.find((b) => b.code === bankCode)?.name ?? "";

  useEffect(() => {
    if (!open || banks) return;
    let live = true;
    void reach(() => listBalanceBanks()).then((r) => {
      if (!live) return;
      if (r.ok) setBanks(r.data.banks);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [open, banks]);

  const close = (next: boolean) => {
    if (!next && quote && (step === "review" || step === "otp")) void reach(() => cancelBalanceMovement({ movementId: quote.movementId }));
    if (!next) {
      setStep("account");
      setAccountName(null);
      setQuote(null);
      setMovement(null);
      setOtp("");
      setError(null);
      setClientKey(crypto.randomUUID());
    }
    onOpenChange(next);
  };

  const check = async () => {
    setBusy(true);
    setError(null);
    const r = await reach(() => checkBalanceBankAccount({ bankCode, bankName, accountNumber }));
    setBusy(false);
    if (r.ok) setAccountName(r.data.accountName);
    else setError(r.error);
  };

  const prepare = async () => {
    setBusy(true);
    setError(null);
    const r = await reach(() => prepareWithdrawal({ clientKey, bankCode, bankName, accountNumber, shownAccountName: accountName ?? "", amount }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      /* A fresh key for a fresh attempt; the refused one moved nothing. */
      if (!r.unreached) setClientKey(crypto.randomUUID());
      return;
    }
    setQuote(r.data);
    setStep("review");
  };

  const submit = async (code?: string): Promise<boolean> => {
    if (!quote) return false;
    setError(null);
    const r = await reach(() => confirmBalanceMovement({ movementId: quote.movementId, ...(code ? { otp: code } : {}) }));
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    if (r.data.needsOtp) {
      setStep("otp");
      setError(r.data.message);
      return false;
    }
    setMovement(r.data.movement);
    setStep("waiting");
    onMoved();
    return true;
  };

  return (
    <Sheet open={open} onOpenChange={close} title="Withdraw" detents={[0.92]} testId="balance-withdraw">
      <div className="grid gap-block pb-block">
        {step === "account" ? (
          <>
            <p className="nf-body-sm text-[var(--nf-content-secondary)]">
              Available <Money minor={availableMinor} locale={locale} mode="full" />. Choose the bank account the money goes to. We check the name on it with the bank first.
            </p>
            <SelectField
              label="Bank"
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setAccountName(null);
              }}
              disabled={!banks}
            >
              <option value="">{banks ? "Choose your bank" : "Loading banks"}</option>
              {(banks ?? []).map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Account number"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, ""));
                setAccountName(null);
              }}
            />
            {accountName ? (
              <div className="nf-balance__verified" data-testid="balance-verified-account">
                <p className="nf-caption text-[var(--nf-content-secondary)]">The bank says this account belongs to</p>
                <p className="nf-h3 mt-xs text-[var(--nf-content-primary)]">{accountName}</p>
                <p className="nf-body-sm text-[var(--nf-content-secondary)]">
                  {bankName} •••• {lastFour(accountNumber)}
                </p>
                <div className="mt-row grid grid-cols-2 gap-sm">
                  <Button variant="secondary" onClick={() => setAccountName(null)}>
                    Not mine
                  </Button>
                  <Button variant="primary" onClick={() => setStep("amount")}>
                    Yes, it is mine
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" size="lg" loading={busy} disabled={!bankCode || accountNumber.length !== 10} onClick={check}>
                Check account
              </Button>
            )}
          </>
        ) : null}

        {step === "amount" ? (
          <>
            <p className="nf-body-sm text-[var(--nf-content-secondary)]">
              To {accountName}, {bankName} •••• {lastFour(accountNumber)}.
            </p>
            <NairaField
              label="Amount"
              value={amount}
              onValueChange={setAmount}
              hint="The smallest withdrawal is ₦1,000. The processing fee is shown before you confirm."
            />
            <div className="grid grid-cols-2 gap-sm">
              <Button variant="secondary" onClick={() => setStep("account")}>
                Back
              </Button>
              <Button variant="primary" loading={busy} disabled={!amount} onClick={prepare}>
                See the total
              </Button>
            </div>
          </>
        ) : null}

        {step === "review" && quote ? (
          <>
            <Breakdown
              breakdown={quote.breakdown}
              locale={locale}
              destination={{ label: "To", title: quote.destination.title, detail: quote.destination.detail }}
              receivedLabel="You'll receive"
            />
            <p className="nf-caption text-[var(--nf-content-muted)]">
              The processing fee is set by our escrow partner for this withdrawal and is what you will be charged. Reference {quote.reference}.
            </p>
            <DragToConfirm
              money
              label="Slide to withdraw"
              armedLabel="Press again to withdraw"
              keyboardLabel="Withdraw"
              confirmingLabel="Sending to your bank"
              confirmedLabel="Sent"
              errorLabel="Not sent. Nothing has moved."
              onConfirm={() => submit()}
            />
          </>
        ) : null}

        {step === "otp" ? (
          <>
            <TextField
              label="Code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              inputClassName="nf-balance__otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
            <Button
              variant="primary"
              size="lg"
              loading={busy}
              disabled={otp.length < 4}
              onClick={async () => {
                setBusy(true);
                await submit(otp);
                setBusy(false);
              }}
            >
              Confirm withdrawal
            </Button>
          </>
        ) : null}

        {step === "waiting" && movement ? <Watching movement={movement} locale={locale} onDone={() => close(false)} onSettled={onMoved} /> : null}

        {error ? (
          <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
            {error === REFUSAL.otpNeeded ? REFUSAL.otpNeeded : error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

export function Watching({
  movement,
  locale,
  onDone,
  onSettled,
  kind = "withdrawal",
}: {
  movement: MovementView;
  locale: Locale;
  onDone(): void;
  onSettled(): void;
  kind?: "withdrawal" | "deposit" | "send";
}) {
  const current = useWatchedMovement(movement, onSettled);
  return (
    <>
      <WaitingRoom movement={current} locale={locale} kind={kind} />
      <Button variant="secondary" size="lg" onClick={onDone}>
        {current.status === "completed" ? "Done" : "Close, keep checking"}
      </Button>
    </>
  );
}
