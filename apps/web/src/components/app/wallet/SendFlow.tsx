"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatMoney,
  getDictionary,
  type Dictionary,
  type Locale,
} from "@vallo/i18n";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { Amount } from "@/components/ui/Amount";
import type { ActionResult } from "@/lib/actions/envelope";
import {
  getStatement,
  transferToUser,
  type TransferReceipt,
} from "@/lib/wallet/actions";
import {
  MAX_MOVE_KOBO,
  MIN_MOVE_KOBO,
  parseNairaToKobo,
} from "@/lib/wallet/schema";
import type { WalletEntry } from "@/lib/wallet/types";
import { Receipt } from "./Receipt";
import { useBalanceMask } from "./balance-mask";
import { LiveWallet } from "./LiveWallet";
import { MoneyGlyph } from "./MoneyGlyph";
import { WalletTiles } from "./WalletTiles";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { TierBadge } from "@/components/trust/TierBadge";
import { RollingAmount } from "./RollingAmount";
import { canonicalNaira } from "./AmountField";
import { useMoneyWait, WaitNotice } from "./MoneyWait";
import { ErrorNotice } from "./ErrorNotice";
import { mintIdempotencyKey } from "./idempotency";
import { createSubmitGuard } from "./submit-guard";
import { useLockRecovery, useMoneyStepUp } from "./MoneyStepUp";
import { intentFromForm } from "@/lib/security/money-intent";
import {
  lookupRecipient,
  type RecipientLookup,
} from "@/app/(app)/wallet/send/recipient-action";
import {
  readRecentRecipients,
  recipientInitials,
  recipientShortName,
  rememberRecipient,
  writeRecentRecipients,
  type RecentRecipient,
} from "./recent-recipients";
import { isRecipientInput } from "@/lib/wallet/recipient-input";
import { panelClass } from "@/components/ui/Panel";

/**
 * SEND, to its governing render (77A54EA3). Wallet to wallet only.
 *
 *   compose   the balance card and its tiles; the form panel with the
 *             recipient (a Vallo email, checked as it is typed), the amount
 *             with the render's four presets, and the note; the lit button
 *   (no bank send: sending to someone else's bank account was removed by
 *   the founder on 23 September as licensed activity; the one bank movement
 *   this wallet makes is a withdrawal to your OWN account, on the wallet
 *   home)
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
/* The render's four presets (77A54EA3), in integer kobo: 5,000, 10,000,
   20,000 and 50,000 naira. */
const PRESETS_KOBO = [500_000, 1_000_000, 2_000_000, 5_000_000];
const NOTE_MAX = 140;

export function SendFlow({
  balanceMinor,
  locale,
  copy,
  initialEmail = "",
  initialAmount = "",
  initialNote = "",
  lookup: lookupFn = lookupRecipient,
  homeCopy: homeCopyProp,
  userId = null,
}: {
  balanceMinor: number;
  locale: Locale;
  copy: SendCopy;
  /** The wallet home's words, for the balance card's eye and its tiles.
      Read from the locale's dictionary when a caller does not pass them. */
  homeCopy?: Dictionary["wallet"]["home"];
  /** The signed-in person, for the live refresh. */
  userId?: string | null;
  initialEmail?: string;
  initialAmount?: string;
  initialNote?: string;
  /**
   * The lookup, overridable BY THE SCREENSHOT HARNESS AND NOTHING ELSE.
   *
   * The real one is a server action against the accounts table, so in a
   * sandbox with no database it can only ever answer "unknown" and the
   * found state, which is the whole point of this field, cannot be
   * photographed. The default is the real action, so every shipped caller
   * gets the real lookup without saying anything; `app/(dev)/preview/e`
   * passes a fixture resolver to prove the look.
   */
  lookup?: (email: string) => Promise<RecipientLookup>;
}) {
  const router = useRouter();
  const homeCopy = homeCopyProp ?? getDictionary(locale).wallet.home;
  const [step, setStep] = useState<Step>("compose");
  const [email, setEmail] = useState(initialEmail);
  const [amountText, setAmountText] = useState(initialAmount);
  const [note, setNote] = useState(initialNote);
  const [hidden, toggleHidden] = useBalanceMask();
  const [recent, setRecent] = useState<RecentRecipient[]>([]);
  const [idempotencyKey] = useState(mintIdempotencyKey);
  const [state, formAction, pending] = useActionState(transferToUser, INITIAL);
  /* V-81: the phone lock on money, when this person has set one. */
  const moneyLock = useMoneyStepUp(locale, (form) => intentFromForm("send", form));
  useLockRecovery(moneyLock, state);
  const wait = useMoneyWait(pending);
  const [entry, setEntry] = useState<WalletEntry | null>(null);
  /* The double-tap latch and the button's own disabled state from the first
     press until the result returns. See submit-guard.ts: this narrows the
     double-send window and does not close it. */
  const guard = useRef(createSubmitGuard());
  const [pressed, setPressed] = useState(false);
  const [answered, setAnswered] = useState(state);
  if (answered !== state) {
    setAnswered(state);
    setPressed(false);
  }
  /* The result is back: the latch opens so a refusal can be corrected. */
  useEffect(() => {
    guard.current.release();
  }, [state]);
  const lookedUp = useRef<string | null>(null);

  /* This device's recent recipients, read after mount so the server render
     and the first client render agree. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(readRecentRecipients());
  }, []);

  const kobo = parseNairaToKobo(amountText);
  const amountOk =
    kobo !== null && kobo >= MIN_MOVE_KOBO && kobo <= MAX_MOVE_KOBO;
  const after = balanceMinor - (kobo ?? 0);
  const enough = after >= 0;
  const address = email.trim().toLowerCase();
  const emailOk = isRecipientInput(address);

  /*
   * THE LOOKUP, keyed on the address it answered for, so an answer about the
   * last address never sits under the next one. Debounced, because a person
   * correcting one letter is not asking four questions; the attempt counter
   * stops a slower earlier answer landing last.
   */
  const [lookup, setLookup] = useState<{
    for: string;
    result: "checking" | RecipientLookup;
  } | null>(null);
  const attempt = useRef(0);
  useEffect(() => {
    if (!isRecipientInput(address)) return;
    const mine = ++attempt.current;
    const timer = window.setTimeout(() => {
      setLookup({ for: address, result: "checking" });
      void lookupFn(address).then((result) => {
        if (mine === attempt.current) setLookup({ for: address, result });
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [address, lookupFn]);
  const check =
    emailOk && lookup && lookup.for === address ? lookup.result : null;
  const recipientName =
    check !== null && check !== "checking" && check.state === "found"
      ? check.name
      : null;
  const recipientTier =
    check !== null && check !== "checking" && check.state === "found"
      ? (check.tier ?? null)
      : null;
  const refused =
    check !== null &&
    check !== "checking" &&
    (check.state === "none" || check.state === "self");
  const canContinue =
    emailOk && amountOk && enough && check !== "checking" && !refused;

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
      const found = result.data.entries.find(
        (one) => one.reference === reference
      );
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

  /*
   * The frame every step sits in, to 77A54EA3: the balance card with its eye
   * and the four tiles, then the page's own head (title, the line under it,
   * and the Instant transfer chip). The balance is the server's figure, and
   * after a send the page is re-read, so the card shows the new balance.
   */
  const frame = (body: React.ReactNode) => (
    <>
      <section
        aria-labelledby="nf-send-balance-label"
        className="nf-wallet-hero"
      >
        <span className="nf-wallet-hero__object" aria-hidden="true">
          <BrandIcon name="wallet-naira" fill priority />
        </span>
        <div className="relative">
          <div className="nf-wallet-hero__label">
            <p id="nf-send-balance-label">{copy.availableBalance}</p>
            <button
              type="button"
              onClick={toggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? homeCopy.showBalance : homeCopy.hideBalance}
              className="nf-wallet-eye nf-tap"
            >
              <UiIcon name={hidden ? "eye-off" : "eye"} size={20} />
            </button>
          </div>
          <p className="nf-wallet-figure nf-numeric">
            {hidden ? (
              "₦••••••"
            ) : (
              <RollingAmount
                minor={balanceMinor}
                locale={locale}
                className="nf-odometer-figure"
                koboClassName="nf-money-kobo nf-money-kobo--hero"
              />
            )}
          </p>
          <p className="nf-send-balance-line">
            <MoneyGlyph name="card" size={20} />
            {copy.balanceLabel}
          </p>
          <WalletTiles copy={homeCopy} current="send" />
        </div>
      </section>

      <div className="nf-send-head">
        <div className="min-w-0">
          <h1 className="nf-send-head__title">{copy.title}</h1>
          <p className="nf-send-head__sub">{copy.sendSub}</p>
        </div>
        {/* True of every send this page makes: both legs are written in one
            database transaction (private.transfer_between_wallets). */}
        <p className="nf-send-chip-instant">
          <UiIcon name="bolt" size={16} />
          {copy.instantChip}
        </p>
      </div>

      {body}
      <LiveWallet userId={userId} />
    </>
  );

  /* ---------------------------------------------------------------- sent */
  if (shownStep === "sent" && state.ok && state.data) {
    const receipt = state.data;
    return frame(
      <div role="status" aria-live="polite" data-testid="wallet-send-sent">
        {entry ? (
          <Receipt entry={entry} locale={locale} />
        ) : (
          <div className={panelClass({ variant: "card", className: "p-card text-center" })}>
            <IconPlate size="lg" tone="success" className="mx-auto">
              <UiIcon name="arrow-up" size={ICON_PLATE_GLYPH.lg} />
            </IconPlate>
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
            <p className={`mx-auto mt-inline max-w-[42ch] ${TYPE.body}`}>
              {copy.sentBody}
            </p>
            <p className="mt-row">
              <span className="nf-caption block text-[var(--nf-content-muted)]">
                {copy.reference}
              </span>
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
    return frame(
      <form
        action={formAction}
        noValidate
        data-testid="wallet-send-confirm"
        onSubmit={(event) => {
          if (!moneyLock.pass(event)) return;
          if (!guard.current.tryEnter()) {
            event.preventDefault();
            return;
          }
          setPressed(true);
        }}
      >
        <input type="hidden" name="recipientEmail" value={email.trim()} />
        <input type="hidden" name="amount" value={amountText.trim()} />
        <input type="hidden" name="note" value={note.trim()} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="stepUp" value={moneyLock.token} />
        {moneyLock.sheet}

        <div className={panelClass({ variant: "card", className: "p-card text-center" })}>
          {/* While it is in flight the mark, the amount and the consequence
              line stay on screen together: the three things BRAND_MARKS
              section 7 found missing from every pending state. */}
          <IconPlate size="lg" tone={pending ? "pending" : "brand"} className="mx-auto">
            {pending ? (
              <UiIcon name="history" size={ICON_PLATE_GLYPH.lg} />
            ) : (
              <MoneyGlyph name="send-arrow" size={ICON_PLATE_GLYPH.lg} />
            )}
          </IconPlate>
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
          {recipientName ? (
            <>
              <p className={`mt-inline-tight ${TYPE.rowTitle}`}>
                {copy.to.replace("{email}", recipientName)}
              </p>
              <p className={`${TYPE.rowMeta} [overflow-wrap:anywhere]`}>
                {email.trim()}
              </p>
            </>
          ) : (
            <p
              className={`mt-inline-tight ${TYPE.rowTitle} [overflow-wrap:anywhere]`}
            >
              {copy.to.replace("{email}", email.trim())}
            </p>
          )}
          {note.trim() && (
            <p className={`mt-inline-tight ${TYPE.rowMeta}`}>{note.trim()}</p>
          )}

          <dl className="nf-cells nf-cells--pair mt-block text-left">
            <div className="pr-lg">
              <dt className={TYPE.label}>{copy.balanceNow}</dt>
              <dd className="nf-numeric mt-inline-tight nf-body font-semibold text-[var(--nf-content-primary)]">
                <Amount
                  minorUnits={balanceMinor}
                  locale={locale}
                  showFraction
                />
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
            <Button
              type="submit"
              variant="primary"
              size="lg"
              full
              loading={pending || pressed}
              disabled={pending || pressed}
            >
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

          <WaitNotice
            wait={wait}
            movement="transfer"
            onDone={() => router.push("/wallet")}
          />
          <ErrorNotice state={state} title={copy.failedTitle} />
        </div>
      </form>
    );
  }

  /* ------------------------------------------------------------- compose */
  const recipientError =
    fieldErrors?.recipientEmail ??
    (check !== null && check !== "checking" && check.state === "none"
      ? copy.recipientNone
      : check !== null && check !== "checking" && check.state === "self"
      ? copy.recipientSelf
      : undefined);
  const amountError =
    fieldErrors?.amount ??
    (kobo !== null && !enough ? copy.notEnough : undefined);

  return frame(
    <div data-testid="wallet-send-compose">
      {/*
        THE FORM PANEL, to 77A54EA3: one glass panel holding a row per field,
        each row a round glass plate, a label and the control. Recipient,
        Amount and Narration are the rows this product has. The render's Bank
        row is refused: sending to someone else's bank account is licensed
        activity in Nigeria and the founder removed it on 23 September; a send moves money between
        two Vallo
        wallets inside the ledger. The scan button is refused too (there is
        no scanner).
      */}
      <div className={panelClass({ variant: "card", className: "nf-send-form" })}>
            <div className="nf-send-row">
              <RowPlate art="plate-recipient" />
              <div className="nf-send-row__body">
                <label
                  htmlFor="nf-send-recipient"
                  className="nf-send-row__label"
                >
                  {copy.recipientTitle}
                </label>
                <input
                  id="nf-send-recipient"
                  className="nf-send-row__input"
                  name="recipientEmail"
                  type="text"
                  autoComplete="off"
                  inputMode="email"
                  placeholder={copy.recipientPlaceholder}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={recipientError ? true : undefined}
                  aria-describedby="nf-send-recipient-note"
                />
              </div>
            </div>
            <div id="nf-send-recipient-note" className="nf-send-row__notes">
              {recipientError ? (
                <p role="alert" className="nf-send-row__error">
                  {recipientError}
                </p>
              ) : check === "checking" ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="nf-send-row__hint"
                >
                  {copy.recipientChecking}
                </p>
              ) : recipientName ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="nf-recipient-found"
                  data-testid="wallet-send-recipient-found"
                >
                  <UiIcon
                    name="verified"
                    size={18}
                    className="shrink-0 text-[var(--nf-state-success)]"
                  />
                  <span className="min-w-0">
                    <span className="nf-send-row__label block">
                      {copy.recipientFound}
                    </span>
                    <span className="nf-send-found__name flex min-w-0 items-center gap-2xs">
                  <span className="truncate">{recipientName}</span>
                  {recipientTier ? <TierBadge tier={recipientTier} size={16} className="nf-send-name-tier" /> : null}
                </span>
                  </span>
                </p>
              ) : check !== null &&
                check.state === "unknown" &&
                check.reason.length > 0 ? (
                <p role="status" className="nf-send-row__hint">
                  {check.reason}
                </p>
              ) : (
                <p className="nf-send-row__hint">{copy.recipientHint}</p>
              )}
              {recent.length > 0 && (
                <div className="mt-inline-tight">
                  <div className="flex items-center justify-between gap-md">
                    <p className={TYPE.label}>{copy.recentRecipients}</p>
                    <button
                      type="button"
                      className="nf-wallet-link nf-tap"
                      onClick={() => {
                        writeRecentRecipients([]);
                        setRecent([]);
                      }}
                    >
                      {copy.clearRecent}
                    </button>
                  </div>
                  <div
                    className="nf-recipients"
                    role="group"
                    aria-label={copy.recentRecipients}
                  >
                    {recent.map((person) => {
                      const chosen =
                        email.trim().toLowerCase() === person.email;
                      return (
                        <button
                          key={person.email}
                          type="button"
                          className="nf-recipient nf-tap"
                          aria-pressed={chosen}
                          aria-label={`${person.name}, ${person.email}`}
                          onClick={() => setEmail(person.email)}
                        >
                          <span
                            className="nf-recipient__avatar"
                            aria-hidden="true"
                          >
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
            </div>

        <div className="nf-send-row nf-send-row--amount">
          <RowPlate art="plate-amount" />
          <div className="nf-send-row__body">
            <label htmlFor="nf-send-amount" className="nf-send-row__label">
              {copy.amountTitle}
            </label>
            <input
              id="nf-send-amount"
              className="nf-send-row__input nf-numeric"
              name="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={copy.amountPlaceholder}
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              aria-invalid={amountError ? true : undefined}
              aria-describedby="nf-send-amount-note"
            />
          </div>
          {/* The render's four amounts, as quick fills. Rounded rectangles. */}
          <div
            className="nf-send-chips"
            role="group"
            aria-label={copy.amountTitle}
          >
            {PRESETS_KOBO.map((preset) => {
              const canonical = canonicalNaira(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  className="nf-send-chip nf-numeric"
                  aria-pressed={amountText === canonical}
                  onClick={() => setAmountText(canonical)}
                >
                  {formatMoney(preset, locale)}
                </button>
              );
            })}
          </div>
        </div>
        <div id="nf-send-amount-note" className="nf-send-row__notes">
          {amountError ? (
            <p role="alert" className="nf-send-row__error">
              {amountError}
            </p>
          ) : kobo !== null ? (
            /* What the balance will be afterwards: not in the render, kept
               because a person about to move money should see the
               consequence before the confirm step (DESIGN_DRIFT_SURVEY
               part six, item 2). */
            <p className="nf-send-row__hint">
              {copy.balanceAfter}{" "}
              <span className="nf-numeric font-semibold text-[var(--nf-content-primary)]">
                {hidden ? (
                  "₦••••••"
                ) : (
                  <Amount minorUnits={after} locale={locale} showFraction />
                )}
              </span>
            </p>
          ) : null}
        </div>

        <div className="nf-send-row">
          <RowPlate art="plate-note" />
          <div className="nf-send-row__body">
            <label htmlFor="nf-send-note" className="nf-send-row__label">
              {copy.narrationLabel}
            </label>
            <input
              id="nf-send-note"
              className="nf-send-row__input"
              name="note"
              type="text"
              autoComplete="off"
              maxLength={NOTE_MAX}
              placeholder={copy.narrationPlaceholder}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={fieldErrors?.note ? true : undefined}
            />
          </div>
          <span className="nf-send-row__count nf-numeric" aria-live="off">
            {note.length}/{NOTE_MAX}
          </span>
        </div>
        {fieldErrors?.note && (
          <p role="alert" className="nf-send-row__notes nf-send-row__error">
            {fieldErrors.note}
          </p>
        )}

        {/*
          THE LIT BUTTON, to the render: gradient fill, a bright top rim, a
          bloom under it, a plane on its own darker plate at the left and an
          arrow at the right. It opens the confirm step, which is where the
          money is actually sent.
        */}
        <button
          type="button"
          className="nf-send-cta"
          disabled={!canContinue}
          onClick={() => setStep("confirm")}
        >
          <span className="nf-send-cta__plate" aria-hidden="true">
            <MoneyGlyph name="plane" size={20} />
          </span>
          <span className="nf-send-cta__label">{copy.sendCta}</span>
          <UiIcon name="arrow-right" size={20} className="nf-send-cta__arrow" />
        </button>

        {/*
          THE REASSURANCE CARD, in the render's anatomy and carrying only
          true statements, each checked against the code and the terms on
          22 September. The render's "NDIC INSURED" and "256 BIT ENCRYPTION"
          badges are refused: the first is false (lib/legal/terms.tsx section
          15 says in bold that a wallet balance is not NDIC insured) and the
          second is a claim a person cannot check or act on.
        */}
        <aside className="nf-send-trust" aria-labelledby="nf-send-trust-title">
          <RowPlate art="plate-shield" />
          <div className="min-w-0">
            <p id="nf-send-trust-title" className="nf-send-trust__title">
              {copy.trustTitle}
            </p>
            <ul className="nf-send-trust__facts">
              <li>{copy.trustHolds}</li>
              <li>{copy.trustFails}</li>
              <li>{copy.trustRecall}</li>
              <li>{copy.trustRefund}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * A row's round glass plate: the render's own plate, cropped from 77A54EA3
 * into `public/brand/session-b/send/` (see SOURCES.md there). Dark only: the
 * paper drawing went with light mode (founder item 2, 23 September).
 */
function RowPlate({ art }: { art: string }) {
  return (
    <span className="nf-send-plate" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="nf-send-plate__art"
        src={`/brand/session-b/send/${art}.webp`}
        alt=""
        width={34}
        height={34}
      />
    </span>
  );
}
