"use client";

import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { DragToConfirm } from "@/components/ui/DragToConfirm";
import { AmountPad, shareChips } from "../AmountPad";
import { TextField } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { cancelBalanceMovement, confirmBalanceMovement, findBalanceRecipient, prepareSend, type Quote } from "@/lib/money/member-wallet-actions";
import type { MovementView } from "@/lib/money/member-wallet";
import { Breakdown } from "./balance-ui";
import { reach } from "./reach";
import { Watching } from "./WithdrawFlow";

/**
 * SEND MONEY (Part B phase 10; 13-provider-must-not-leak section 14 calls it
 * "Send Money", never "wallet transfer"): recipient, amount, reason, review,
 * confirm, processing, done. Founder reference 95840448.
 *
 * The recipient is a Vallo member found by their phone, shown as first name
 * and initial so the sender can recognise them without learning more. A
 * double tap, a retried post and a replay all land on the same row
 * (`clientKey`); a blocked or unopened recipient is refused before anything
 * is staged.
 */
type Step = "who" | "amount" | "review" | "otp" | "waiting";

export function SendFlow({
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
  const [step, setStep] = useState<Step>("who");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [otp, setOtp] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [movement, setMovement] = useState<MovementView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = (next: boolean) => {
    if (!next && quote && (step === "review" || step === "otp")) void reach(() => cancelBalanceMovement({ movementId: quote.movementId }));
    if (!next) {
      setStep("who");
      setName(null);
      setQuote(null);
      setOtp("");
      setMovement(null);
      setError(null);
      setClientKey(crypto.randomUUID());
    }
    onOpenChange(next);
  };

  const find = async () => {
    setBusy(true);
    setError(null);
    const r = await reach(() => findBalanceRecipient({ phone }));
    setBusy(false);
    if (r.ok) setName(r.data.name);
    else setError(r.error);
  };

  const prepare = async () => {
    setBusy(true);
    setError(null);
    const r = await reach(() => prepareSend({ clientKey, phone, amount, ...(note.trim() ? { note: note.trim() } : {}) }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
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
    <Sheet open={open} onOpenChange={close} title="Send money" detents={[0.92]} testId="balance-send">
      <div className="grid gap-block pb-block">
        {step === "who" ? (
          <>
            <p className="nf-body-sm text-[var(--nf-content-secondary)]">
              Send to another Vallo member by their phone number. It goes from your balance to theirs.
            </p>
            <TextField
              label="Their phone number"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setName(null);
              }}
            />
            {name ? (
              <div className="nf-balance__verified" data-testid="balance-recipient">
                <p className="nf-caption text-[var(--nf-content-secondary)]">This number belongs to</p>
                <p className="nf-h3 mt-xs text-[var(--nf-content-primary)]">{name}</p>
                <div className="mt-row grid grid-cols-2 gap-sm">
                  <Button variant="secondary" onClick={() => setName(null)}>
                    Not them
                  </Button>
                  <Button variant="primary" onClick={() => setStep("amount")}>
                    Yes, send to {name.split(" ")[0]}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" size="lg" loading={busy} disabled={phone.replace(/\D/g, "").length < 10} onClick={find}>
                Find member
              </Button>
            )}
          </>
        ) : null}

        {step === "amount" ? (
          <>
            <AmountPad
              value={amount}
              onValueChange={setAmount}
              label={`Amount to send to ${name ?? "this member"}`}
              question={`How much to send to ${(name ?? "them").split(" ")[0]}?`}
              chips={shareChips(availableMinor)}
              hint={
                <>
                  Available <Money minor={availableMinor} locale={locale} mode="full" />. The smallest amount is ₦100.
                </>
              }
              testId="send-pad"
            />
            <TextField label="What is it for?" value={note} maxLength={100} showCount optionalText="Optional" onChange={(e) => setNote(e.target.value)} />
            <div className="grid grid-cols-2 gap-sm">
              <Button variant="secondary" onClick={() => setStep("who")}>
                Back
              </Button>
              <Button variant="primary" loading={busy} disabled={!amount} onClick={prepare}>
                Review
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
              receivedLabel="They receive"
            />
            <p className="nf-caption text-[var(--nf-content-muted)]">A send cannot be taken back once it is confirmed. Reference {quote.reference}.</p>
            <DragToConfirm
              money
              label="Slide to send"
              armedLabel="Press again to send"
              keyboardLabel="Send"
              confirmingLabel="Sending"
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
              Confirm send
            </Button>
          </>
        ) : null}

        {step === "waiting" && movement ? <Watching kind="send" movement={movement} locale={locale} onDone={() => close(false)} onSettled={onMoved} /> : null}

        {error ? (
          <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
