"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Surface, TYPE } from "@/components/app/Screen";
import { Amount } from "@/components/ui/Amount";
import type { ActionResult } from "@/lib/actions/envelope";
import { getStatement, transferToUser, type TransferReceipt } from "@/lib/wallet/actions";
import { MAX_MOVE_KOBO, MIN_MOVE_KOBO, parseNairaToKobo } from "@/lib/wallet/schema";
import type { WalletEntry } from "@/lib/wallet/types";
import { Receipt } from "./Receipt";
import { RollingAmount } from "./RollingAmount";
import { useMoneyWait, WaitNotice } from "./MoneyWait";

/**
 * SEND, AS A WHOLE PAGE.
 *
 * The transfer used to be a form inside a bottom sheet: email, amount, note,
 * a button, and then a receipt in the same sheet. It worked and it was the
 * smallest surface on the platform for the second largest movement of money.
 * This is the withdraw sheet's gold standard (BRAND_MARKS section 7) given
 * the room it deserves:
 *
 *   compose   the amount rolls as it is typed and the balance after the send
 *             settles beside it, so the cost is felt before it is confirmed
 *   confirm   the amount is the headline, the recipient under it, and the one
 *             sentence that removes fear: it leaves the moment you confirm and
 *             cannot be recalled
 *   sending   the mark, the amount and the consequence line, every second of
 *             the wait, with the shared slow and stalled notices
 *   sent      the ledger's own receipt, read back from the statement by
 *             reference, so the document on screen is the row that was written
 *
 * THE ACTION IS UNTOUCHED. `transferToUser` takes the same three form fields
 * it always did and returns the same receipt; this page changes what is around
 * it, never what it does. No client-side money arithmetic decides anything:
 * the kobo shown here is a courtesy, and the server parses the amount again.
 *
 * NO RECIPIENT LOOKUP EXISTS, and this page does not fake one. The action
 * resolves the email server-side at the moment of sending and refuses an
 * unknown one with a field error, so what is shown back before confirming is
 * the address as typed. A `lookupRecipient(email)` returning the display name
 * is the seam for the backend owner; when it lands, the confirm step shows the
 * name above the address.
 */

type SendCopy = Dictionary["walletSend"];
type Step = "compose" | "confirm" | "sent";

const INITIAL: ActionResult<TransferReceipt | null> = { ok: false, error: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendFlow({
  balanceMinor,
  locale,
  copy,
  initialEmail = "",
  initialAmount = "",
  initialNote = "",
}: {
  balanceMinor: number;
  locale: Locale;
  copy: SendCopy;
  initialEmail?: string;
  initialAmount?: string;
  initialNote?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("compose");
  const [email, setEmail] = useState(initialEmail);
  const [amountText, setAmountText] = useState(initialAmount);
  const [note, setNote] = useState(initialNote);
  const [state, formAction, pending] = useActionState(transferToUser, INITIAL);
  const wait = useMoneyWait(pending);
  const [entry, setEntry] = useState<WalletEntry | null>(null);
  const lookedUp = useRef<string | null>(null);

  const kobo = parseNairaToKobo(amountText);
  const amountOk = kobo !== null && kobo >= MIN_MOVE_KOBO && kobo <= MAX_MOVE_KOBO;
  const after = balanceMinor - (kobo ?? 0);
  const enough = after >= 0;
  const emailOk = EMAIL_RE.test(email.trim());
  const canContinue = emailOk && amountOk && enough;

  /*
   * THE RECEIPT IS THE LEDGER'S ROW, NOT THE ACTION'S SUMMARY.
   *
   * The action returns amount, recipient and reference. The statement holds
   * the row that was actually written, and `Receipt` is built for that row.
   * One read by reference after success, and the page shows the same document
   * `/wallet/transactions/[id]` would. If the read misses (a slow replica, a
   * refused statement) the action's own facts are shown instead, with the
   * reference, which is still a true receipt and never a blank.
   */
  useEffect(() => {
    if (!state.ok || !state.data) return;
    const reference = state.data.reference;
    if (lookedUp.current === reference) return;
    lookedUp.current = reference;
    router.refresh();
    void getStatement().then((result) => {
      if (!result.ok || !result.data) return;
      const found = result.data.entries.find((one) => one.reference === reference);
      if (found) setEntry(found);
    });
  }, [state, router]);

  /* A refusal with field errors sends the person back to the field. */
  const fieldErrors = state.ok ? undefined : state.fieldErrors;
  const [seenError, setSeenError] = useState<typeof state | null>(null);
  if (!state.ok && state.error.length > 0 && seenError !== state) {
    setSeenError(state);
    if (fieldErrors && Object.keys(fieldErrors).length > 0) setStep("compose");
  }

  const sent = state.ok && state.data !== null;
  const shownStep: Step = sent ? "sent" : step;

  /* ---------------------------------------------------------------- sent */
  if (shownStep === "sent" && state.ok && state.data) {
    const receipt = state.data;
    return (
      <div role="status" aria-live="polite" data-testid="wallet-send-sent">
        {entry ? (
          <Receipt entry={entry} locale={locale} />
        ) : (
          <Surface className="text-center">
            <span className="mx-auto block h-20 w-20">
              <BrandIcon name="payment-sent" fill />
            </span>
            <p className={`mt-block ${TYPE.sectionTitle}`}>{copy.sentTitle}</p>
            <p className="mt-row">
              <Amount
                minorUnits={receipt.amountMinor}
                locale={locale}
                showFraction
                className="nf-h1 tracking-tight text-[var(--nf-content-primary)]"
              />
            </p>
            <p className={`mt-inline-tight ${TYPE.rowTitle}`}>
              {copy.sentTo.replace("{name}", receipt.recipientName)}
            </p>
            <p className={`mx-auto mt-inline max-w-[42ch] ${TYPE.body}`}>{copy.sentBody}</p>
            <p className="mt-row">
              <span className="nf-caption block text-[var(--nf-content-muted)]">{copy.reference}</span>
              <span className="nf-body-sm mt-3xs block font-mono font-semibold text-[var(--nf-content-primary)] [overflow-wrap:anywhere] [user-select:all] [font-variant-numeric:tabular-nums]">
                {receipt.reference}
              </span>
            </p>
            <div className="mt-block flex flex-col items-stretch gap-inline">
              <ButtonLink href="/wallet/transactions" variant="primary" full>
                {copy.seeHistory}
              </ButtonLink>
              <ButtonLink href="/wallet" variant="ghost" full>
                {copy.backToWallet}
              </ButtonLink>
            </div>
          </Surface>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------- confirm */
  if (shownStep === "confirm" && kobo !== null) {
    return (
      <form action={formAction} noValidate data-testid="wallet-send-confirm">
        <input type="hidden" name="recipientEmail" value={email.trim()} />
        <input type="hidden" name="amount" value={amountText.trim()} />
        <input type="hidden" name="note" value={note.trim()} />

        <Surface className="text-center">
          {/* While it is in flight the mark, the amount and the consequence
              line stay on screen together: the three things BRAND_MARKS
              section 7 found missing from every pending state. */}
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name={pending ? "seal-pending" : "transfer-arrow"} fill />
          </span>
          <p className={`mt-block ${TYPE.label}`}>
            {pending ? copy.sendingTitle : copy.confirmTitle}
          </p>
          <p className="mt-inline-tight">
            <Amount
              minorUnits={kobo}
              locale={locale}
              showFraction
              className="nf-h1 tracking-tight text-[var(--nf-content-primary)]"
            />
          </p>
          <p className={`mt-inline-tight ${TYPE.rowTitle} [overflow-wrap:anywhere]`}>
            {copy.to.replace("{email}", email.trim())}
          </p>
          {note.trim() && <p className={`mt-inline-tight ${TYPE.rowMeta}`}>{note.trim()}</p>}

          <dl className="mt-block grid grid-cols-2 gap-x-lg text-left">
            <div>
              <dt className={TYPE.label}>{copy.balanceNow}</dt>
              <dd className="nf-numeric mt-inline-tight nf-body font-semibold text-[var(--nf-content-primary)]">
                <Amount minorUnits={balanceMinor} locale={locale} showFraction />
              </dd>
            </div>
            <div>
              <dt className={TYPE.label}>{copy.balanceAfter}</dt>
              <dd className="nf-numeric mt-inline-tight nf-body font-semibold text-[var(--nf-content-primary)]">
                <Amount minorUnits={after} locale={locale} showFraction />
              </dd>
            </div>
          </dl>

          <p
            role={pending ? "status" : undefined}
            aria-live={pending ? "polite" : undefined}
            className={`mx-auto mt-block max-w-[38ch] ${TYPE.body}`}
          >
            {pending ? copy.sendingBody : copy.consequence}
          </p>

          <div className="mt-block flex flex-col items-stretch gap-inline">
            <Button type="submit" variant="primary" size="lg" full loading={pending}>
              {copy.send}
            </Button>
            <Button
              type="button"
              variant="ghost"
              full
              disabled={pending}
              onClick={() => setStep("compose")}
            >
              {copy.back}
            </Button>
          </div>

          <WaitNotice wait={wait} movement="transfer" onDone={() => router.push("/wallet")} />
          {!state.ok && state.error.length > 0 && (
            <div
              role="alert"
              className="nf-body-sm mt-row flex items-start gap-inline rounded-[var(--nf-radius-lg)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] bg-[var(--nf-state-error-surface)] p-row text-left leading-relaxed text-[var(--nf-content-secondary)]"
            >
              <UiIcon name="close" size="xs" className="mt-3xs shrink-0 text-[var(--nf-state-error)]" />
              <span className="min-w-0">
                <span className="block font-semibold text-[var(--nf-state-error)]">{copy.failedTitle}</span>
                <span className="mt-3xs block">{state.error}</span>
              </span>
            </div>
          )}
        </Surface>
      </form>
    );
  }

  /* ------------------------------------------------------------- compose */
  return (
    <div data-testid="wallet-send-compose">
      {/* The figure being typed, rolling. It is the answer to "how much" and
          it sits above the fields the way the balance sits above the wallet. */}
      <p className="text-center">
        <RollingAmount
          minor={kobo ?? 0}
          locale={locale}
          className="nf-h0 nf-odometer-figure tracking-tight"
          koboClassName="text-[0.5em] font-semibold text-[var(--nf-content-muted)]"
        />
      </p>

      <Surface className="mt-block">
        <div className="space-y-row">
          <TextField
            label={copy.recipientLabel}
            hint={copy.recipientHint}
            name="recipientEmail"
            type="email"
            autoComplete="off"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors?.recipientEmail}
          />
          <TextField
            label={copy.amountLabel}
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            error={fieldErrors?.amount ?? (kobo !== null && !enough ? copy.notEnough : undefined)}
            clearable="Clear the amount"
            onClear={() => setAmountText("")}
          />
          <TextField
            label={copy.noteLabel}
            optionalText={copy.noteOptional}
            name="note"
            type="text"
            autoComplete="off"
            maxLength={140}
            placeholder={copy.notePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={fieldErrors?.note}
          />
        </div>

        <dl className="mt-block grid grid-cols-2 gap-x-lg border-t border-[var(--nf-border-subtle)] pt-row">
          <div>
            <dt className={TYPE.label}>{copy.balanceNow}</dt>
            <dd className="mt-inline-tight nf-body font-semibold text-[var(--nf-content-primary)]">
              <RollingAmount minor={balanceMinor} locale={locale} />
            </dd>
          </div>
          <div>
            <dt className={TYPE.label}>{copy.balanceAfter}</dt>
            <dd
              className={`mt-inline-tight nf-body font-semibold ${
                enough ? "text-[var(--nf-content-primary)]" : "text-[var(--nf-state-error)]"
              }`}
            >
              <RollingAmount minor={after} locale={locale} />
            </dd>
          </div>
        </dl>
      </Surface>

      <p className={`mt-row px-2xs ${TYPE.rowMeta}`}>{copy.consequence}</p>

      <Button
        type="button"
        variant="primary"
        size="lg"
        full
        className="mt-block"
        disabled={!canContinue}
        onClick={() => setStep("confirm")}
      >
        {copy.continueLabel}
      </Button>
    </div>
  );
}
