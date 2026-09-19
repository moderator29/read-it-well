"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { Amount } from "@/components/ui/Amount";
import type { ActionResult } from "@/lib/actions/envelope";
import { getStatement, transferToUser, type TransferReceipt } from "@/lib/wallet/actions";
import { MAX_MOVE_KOBO, MIN_MOVE_KOBO, parseNairaToKobo } from "@/lib/wallet/schema";
import type { WalletEntry } from "@/lib/wallet/types";
import { Receipt } from "./Receipt";
import { RollingAmount } from "./RollingAmount";
import { canonicalNaira } from "./AmountField";
import { useMoneyWait, WaitNotice } from "./MoneyWait";
import { ErrorNotice } from "./ErrorNotice";
import { mintIdempotencyKey } from "./idempotency";
import { lookupRecipient, type RecipientLookup } from "@/app/(app)/wallet/send/recipient-action";
import {
  readRecentRecipients,
  recipientInitials,
  recipientShortName,
  rememberRecipient,
  writeRecentRecipients,
  type RecentRecipient,
} from "./recent-recipients";

/**
 * SEND, to its governing render (95840448).
 *
 *   compose   the balance strip; the recipient section with the address
 *             field and the people this device has sent to lately; the
 *             amount, rolling as it is typed, with the render's four
 *             presets; the bank section, which is the honest door to the
 *             one bank movement this wallet makes (a withdrawal to your own
 *             account); the note; Continue
 *   confirm   the amount is the headline, the recipient under it, and the
 *             one sentence that removes fear
 *   sending   the mark, the amount and the consequence line, every second
 *   sent      the ledger's own receipt, read back by reference
 *
 * THE ACTION IS UNTOUCHED. `transferToUser` takes the same three fields it
 * always did and returns the same receipt; this page changes what is around
 * it, never what it does. No client-side money arithmetic decides anything.
 *
 * THE RECIPIENT IS AN EMAIL, said plainly, AND IT IS CHECKED AS IT IS TYPED.
 * The moment the field holds a well-formed address, `lookupRecipient` asks
 * whether a Vallo account uses it and the name on that account is drawn
 * under the field, the way the withdraw sheet draws the name the bank
 * confirmed: a person sees who they are paying before Continue. The action
 * resolves the address again server-side at the moment of sending; the
 * lookup is the courtesy and never the guard. The recent chips are the
 * sends made from this device, kept in this browser only; see
 * `recent-recipients.ts` for why the ledger cannot supply them.
 */

type SendCopy = Dictionary["walletSend"];
type Step = "compose" | "confirm" | "sent";

const INITIAL: ActionResult<TransferReceipt | null> = { ok: false, error: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* The render's four presets, in integer kobo. */
const PRESETS_KOBO = [1_000_000, 2_500_000, 5_000_000, 10_000_000];
const NOTE_MAX = 140;

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
  const [hidden, setHidden] = useState(false);
  const [recent, setRecent] = useState<RecentRecipient[]>([]);
  const [idempotencyKey] = useState(mintIdempotencyKey);
  const [state, formAction, pending] = useActionState(transferToUser, INITIAL);
  const wait = useMoneyWait(pending);
  const [entry, setEntry] = useState<WalletEntry | null>(null);
  const lookedUp = useRef<string | null>(null);

  /* This device's recent recipients, read after mount so the server render
     and the first client render agree. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(readRecentRecipients());
  }, []);

  const kobo = parseNairaToKobo(amountText);
  const amountOk = kobo !== null && kobo >= MIN_MOVE_KOBO && kobo <= MAX_MOVE_KOBO;
  const after = balanceMinor - (kobo ?? 0);
  const enough = after >= 0;
  const address = email.trim().toLowerCase();
  const emailOk = EMAIL_RE.test(address);

  /*
   * THE LOOKUP, keyed on the address it answered for, so an answer about the
   * last address never sits under the next one. Debounced, because a person
   * correcting one letter is not asking four questions; the attempt counter
   * stops a slower earlier answer landing last.
   */
  const [lookup, setLookup] = useState<{ for: string; result: "checking" | RecipientLookup } | null>(null);
  const attempt = useRef(0);
  useEffect(() => {
    if (!EMAIL_RE.test(address)) return;
    const mine = ++attempt.current;
    const timer = window.setTimeout(() => {
      setLookup({ for: address, result: "checking" });
      void lookupRecipient(address).then((result) => {
        if (mine === attempt.current) setLookup({ for: address, result });
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [address]);
  const check = emailOk && lookup && lookup.for === address ? lookup.result : null;
  const recipientName = check !== null && check !== "checking" && check.state === "found" ? check.name : null;
  const refused = check !== null && check !== "checking" && (check.state === "none" || check.state === "self");
  const canContinue = emailOk && amountOk && enough && check !== "checking" && !refused;

  /*
   * THE RECEIPT IS THE LEDGER'S ROW, NOT THE ACTION'S SUMMARY. One read by
   * reference after success, and the page shows the same document
   * `/wallet/transactions/[id]` would. The recipient is remembered on this
   * device at the same moment, from the address typed and the name the
   * action confirmed.
   */
  useEffect(() => {
    if (!state.ok || !state.data) return;
    const reference = state.data.reference;
    if (lookedUp.current === reference) return;
    lookedUp.current = reference;
    const remembered = rememberRecipient(readRecentRecipients(), {
      email: email.trim(),
      name: state.data.recipientName,
    });
    writeRecentRecipients(remembered);
    router.refresh();
    void getStatement().then((result) => {
      if (!result.ok || !result.data) return;
      const found = result.data.entries.find((one) => one.reference === reference);
      if (found) setEntry(found);
    });
    // The email is read once, at the moment of success, deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="nf-card p-card text-center">
            <span className="nf-result-mark nf-result-mark--lit mx-auto block h-20 w-20">
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
          </div>
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
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <div className="nf-card p-card text-center">
          {/* While it is in flight the mark, the amount and the consequence
              line stay on screen together: the three things BRAND_MARKS
              section 7 found missing from every pending state. */}
          <span
            className={`nf-result-mark mx-auto block h-20 w-20 ${pending ? "" : "nf-result-mark--lit"}`}
          >
            <BrandIcon name={pending ? "seal-pending" : "transfer-arrow"} fill />
          </span>
          <p className={`mt-block ${TYPE.label}`}>{pending ? copy.sendingTitle : copy.confirmTitle}</p>
          <p className="mt-inline-tight">
            <Amount
              minorUnits={kobo}
              locale={locale}
              showFraction
              className="nf-h1 tracking-tight text-[var(--nf-content-primary)]"
            />
          </p>
          {recipientName ? (
            <>
              <p className={`mt-inline-tight ${TYPE.rowTitle}`}>{copy.to.replace("{email}", recipientName)}</p>
              <p className={`${TYPE.rowMeta} [overflow-wrap:anywhere]`}>{email.trim()}</p>
            </>
          ) : (
            <p className={`mt-inline-tight ${TYPE.rowTitle} [overflow-wrap:anywhere]`}>
              {copy.to.replace("{email}", email.trim())}
            </p>
          )}
          {note.trim() && <p className={`mt-inline-tight ${TYPE.rowMeta}`}>{note.trim()}</p>}

          <dl className="nf-cells nf-cells--pair mt-block text-left">
            <div className="pr-lg">
              <dt className={TYPE.label}>{copy.balanceNow}</dt>
              <dd className="nf-numeric mt-inline-tight nf-body font-semibold text-[var(--nf-content-primary)]">
                <Amount minorUnits={balanceMinor} locale={locale} showFraction />
              </dd>
            </div>
            <div className="pl-lg">
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
            <Button type="button" variant="ghost" full disabled={pending} onClick={() => setStep("compose")}>
              {copy.back}
            </Button>
          </div>

          <WaitNotice wait={wait} movement="transfer" onDone={() => router.push("/wallet")} />
          <ErrorNotice state={state} title={copy.failedTitle} />
        </div>
      </form>
    );
  }

  /* ------------------------------------------------------------- compose */
  return (
    <div data-testid="wallet-send-compose" className="space-y-group">
      {/* The balance strip: what can be sent, with the eye and a way back. */}
      <Link href="/wallet" className="nf-card nf-card--interactive nf-balance-strip">
        <span className="nf-balance-strip__mark block" aria-hidden="true">
          <BrandIcon name="wallet" fill />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-inline-tight">
            <span className={TYPE.label}>{copy.balanceLabel}</span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setHidden((h) => !h);
              }}
              aria-pressed={hidden}
              aria-label={hidden ? "Show balance" : "Hide balance"}
              className="nf-tap grid h-8 w-8 place-items-center rounded-[var(--nf-radius-sm)] text-[var(--nf-brand-secondary)]"
            >
              <UiIcon name={hidden ? "eye-off" : "eye"} size={18} />
            </button>
          </span>
          <span className="nf-h3 block text-[var(--nf-content-primary)]">
            {hidden ? (
              "₦••••••"
            ) : (
              <RollingAmount
                minor={balanceMinor}
                locale={locale}
                koboClassName="text-[0.7em] font-semibold text-[var(--nf-content-muted)]"
              />
            )}
          </span>
          <span className={`block ${TYPE.rowMeta}`}>{copy.availableFor}</span>
        </span>
        <span className="nf-icon-btn h-10 w-10" aria-hidden="true">
          <UiIcon name="chevron-right" size={20} />
        </span>
      </Link>

      {/* Recipient */}
      <section className="nf-card p-card-sm" aria-labelledby="nf-send-recipient">
        <SectionHead id="nf-send-recipient" icon="user" title={copy.recipientTitle} sub={copy.recipientSub} />
        <div className="mt-row">
          <TextField
            label={copy.recipientLabel}
            hideLabel
            hint={copy.recipientHint}
            name="recipientEmail"
            type="email"
            autoComplete="off"
            inputMode="email"
            leadingIcon="mail"
            placeholder={copy.recipientPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={
              fieldErrors?.recipientEmail ??
              (check !== null && check !== "checking" && check.state === "none"
                ? copy.recipientNone
                : check !== null && check !== "checking" && check.state === "self"
                  ? copy.recipientSelf
                  : undefined)
            }
          />
          {/* What the lookup said, in the register of the withdraw sheet's
              "Name on the account": the name is shown, never made editable,
              because it is the account's record and not ours to correct. */}
          {check === "checking" && (
            <p role="status" aria-live="polite" className={`mt-inline-tight ${TYPE.rowMeta}`}>
              {copy.recipientChecking}
            </p>
          )}
          {recipientName && (
            <p
              role="status"
              aria-live="polite"
              className="nf-recipient-found mt-inline-tight"
              data-testid="wallet-send-recipient-found"
            >
              <UiIcon name="verified" size={18} className="shrink-0 text-[var(--nf-state-success)]" />
              <span className="min-w-0">
                <span className={`block ${TYPE.label}`}>{copy.recipientFound}</span>
                <span className={`block truncate ${TYPE.rowTitle}`}>{recipientName}</span>
              </span>
            </p>
          )}
          {check !== null && check !== "checking" && check.state === "unknown" && check.reason.length > 0 && (
            <p role="status" className={`mt-inline-tight ${TYPE.rowMeta}`}>
              {check.reason}
            </p>
          )}
        </div>
        {recent.length > 0 && (
          <div className="mt-row">
            <div className="flex items-center justify-between gap-md">
              <p className={TYPE.label}>{copy.recentRecipients}</p>
              <button
                type="button"
                className="nf-tap text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
                onClick={() => {
                  writeRecentRecipients([]);
                  setRecent([]);
                }}
              >
                {copy.clearRecent}
              </button>
            </div>
            <div className="nf-recipients mt-inline-tight" role="group" aria-label={copy.recentRecipients}>
              {recent.map((person) => {
                const chosen = email.trim().toLowerCase() === person.email;
                return (
                  <button
                    key={person.email}
                    type="button"
                    className="nf-recipient nf-tap"
                    aria-pressed={chosen}
                    aria-label={`${person.name}, ${person.email}`}
                    onClick={() => setEmail(person.email)}
                  >
                    <span className="nf-recipient__avatar" aria-hidden="true">
                      {recipientInitials(person.name)}
                    </span>
                    <span className="block w-full truncate text-center">
                      {recipientShortName(person.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Amount */}
      <section className="nf-card p-card-sm" aria-labelledby="nf-send-amount">
        <SectionHead id="nf-send-amount" glyph="₦" title={copy.amountTitle} sub={copy.amountLabel} />
        <p className="mt-row text-center">
          <RollingAmount
            minor={kobo ?? 0}
            locale={locale}
            className="nf-h0 nf-odometer-figure tracking-tight"
            koboClassName="text-[0.5em] font-semibold text-[var(--nf-content-muted)]"
          />
        </p>
        <div className="mt-row">
          <TextField
            label={copy.amountLabel}
            hideLabel
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={copy.amountPlaceholder}
            trailing={<span className="nf-numeric font-semibold">{"₦"}</span>}
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            error={fieldErrors?.amount ?? (kobo !== null && !enough ? copy.notEnough : undefined)}
            clearable="Clear the amount"
            onClear={() => setAmountText("")}
          />
        </div>
        <ChipRow bleed={false} fadeEdges={false} snap={false} className="mt-inline">
          {PRESETS_KOBO.map((preset) => {
            const canonical = canonicalNaira(preset);
            return (
              <Chip
                key={preset}
                size="sm"
                selected={amountText === canonical}
                onSelectedChange={() => setAmountText(canonical)}
                className="flex-1"
              >
                {formatMoney(preset, locale)}
              </Chip>
            );
          })}
        </ChipRow>
        <dl className="nf-cells nf-cells--pair mt-row">
          <div className="pr-lg">
            <dt className={TYPE.label}>{copy.balanceNow}</dt>
            <dd className="mt-inline-tight nf-body font-semibold text-[var(--nf-content-primary)]">
              <RollingAmount minor={balanceMinor} locale={locale} />
            </dd>
          </div>
          <div className="pl-lg">
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
      </section>

      {/* Bank: the honest door. A send on Vallo lands in a wallet; the bank
          movement this product makes is a withdrawal to your own account. */}
      <section className="nf-card p-card-sm" aria-labelledby="nf-send-bank">
        <SectionHead id="nf-send-bank" icon="building-apartment" title={copy.bankTitle} sub={copy.bankSub} />
        <Link
          href="/wallet?action=withdraw"
          className="nf-tap mt-row flex min-h-12 items-center justify-between gap-md rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-row py-inline text-[var(--nf-content-primary)]"
        >
          <span className="nf-body font-semibold">{copy.bankAction}</span>
          <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
        </Link>
      </section>

      {/* Note */}
      <section className="nf-card p-card-sm" aria-labelledby="nf-send-note">
        <SectionHead id="nf-send-note" icon="chat-bubble" title={copy.noteTitle} sub={copy.noteSub} />
        <div className="mt-row">
          <TextField
            label={copy.noteLabel}
            hideLabel
            name="note"
            type="text"
            autoComplete="off"
            maxLength={NOTE_MAX}
            placeholder={copy.notePlaceholder}
            trailing={
              <span className="nf-numeric text-[length:var(--nf-text-caption)]">
                {note.length}/{NOTE_MAX}
              </span>
            }
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={fieldErrors?.note}
          />
        </div>
      </section>

      <p className={`px-2xs ${TYPE.rowMeta}`}>{copy.consequence}</p>

      <Button
        type="button"
        variant="primary"
        size="lg"
        full
        leadingIcon="arrow-right"
        disabled={!canContinue}
        onClick={() => setStep("confirm")}
      >
        {copy.continueLabel}
      </Button>
    </div>
  );
}

/** A section's head: the glyph on its plate, the title, the sub-line. */
function SectionHead({
  id,
  icon,
  glyph,
  title,
  sub,
}: {
  id: string;
  icon?: UiIconName;
  /** A single character where the set has no glyph, such as the naira sign. */
  glyph?: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="nf-money-sec__head">
      <span className="nf-glyph-tile" aria-hidden="true">
        {icon ? <UiIcon name={icon} size={22} /> : <span className="nf-body font-bold">{glyph}</span>}
      </span>
      <div className="min-w-0">
        <h2 id={id} className={TYPE.rowTitle}>
          {title}
        </h2>
        <p className={TYPE.rowMeta}>{sub}</p>
      </div>
    </div>
  );
}
