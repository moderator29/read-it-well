"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Odometer } from "@/components/site/Odometer";
import { Amount } from "@/components/ui/Amount";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField, SelectField } from "@/components/ui/Field";
import { TYPE } from "@/components/app/Screen";
import type { ActionResult } from "@/lib/actions/envelope";
import {
  fundWallet,
  fundWalletWithSavedCard,
  lookupAccountName,
  withdraw,
  type FundStart,
  type WithdrawReceipt,
} from "@/lib/wallet/actions";
import { WALLET_BANKS } from "@/lib/wallet/banks";
import type { BalanceBreakdown, WalletEntry } from "@/lib/wallet/types";
import type { PaymentMethod } from "@/lib/payments/methods";
import { SavedCardPicker, preselectedCardId } from "@/components/app/payments/SavedCardPicker";
import { cardExpired } from "@/components/app/payments/format";
import { formatKoboExact } from "@/components/app/wallet/money";
import { fundingStep, verifyPath } from "@/components/app/wallet/funding-step";
import { weekChange } from "@/components/app/wallet/week-change";
import { BalanceBreakdownSheet } from "@/components/app/wallet/BalanceBreakdownSheet";
import { MoneySheet } from "@/components/app/wallet/MoneySheet";
import { AmountField } from "@/components/app/wallet/AmountField";
import { CryptoTopUpForm } from "@/components/app/wallet/CryptoTopUp";
import { ErrorNotice, fieldError } from "@/components/app/wallet/ErrorNotice";
import { mintIdempotencyKey } from "@/components/app/wallet/idempotency";
import { useMoneyWait, WaitNotice } from "@/components/app/wallet/MoneyWait";
import { useBalanceMask } from "@/components/app/wallet/balance-mask";
import { QuickPlate } from "@/components/app/wallet/QuickPlate";
import { WalletTiles } from "@/components/app/wallet/WalletTiles";

/**
 * The wallet home above the transactions, to its governing render
 * (6AF37222): the balance card carrying the label with its eye, the figure
 * with its kobo set smaller, the week's change when the ledger can say one,
 * the glass wallet object and the four tiles; then the Quick Actions row;
 * then the money sheets those controls open.
 *
 * NOTHING HERE IS A PICTURE OF A FEATURE. Send and Receive are pages, Add
 * money opens the funding sheet (a saved card or the hosted Paystack window),
 * History is the statement. The render's Swap, Buy Airtime and Pay Bills are
 * products Vallo does not sell and are not drawn; every refusal and
 * substitution is recorded where it is made and in the Session B ledger,
 * section 4. The withdraw sheet is still reachable by `?action=withdraw` and
 * is not drawn as a tile while bank payouts do not complete.
 *
 * The eye is remembered on this device (`balance-mask.ts`), and the send
 * page reads the same choice. Every money form posts to the wallet actions
 * untouched; this file changes what is around them, never what they do.
 */

type SheetKey = "fund" | "withdraw" | "crypto";
type HomeCopy = Dictionary["wallet"]["home"];

export function WalletDeck({
  locale,
  copy,
  balanceMinor,
  entries,
  breakdown,
  live,
  cards = [],
  cryptoEnabled = false,
  usdRate = null,
  initialAction = null,
  settings = null,
}: {
  locale: Locale;
  copy: HomeCopy;
  balanceMinor: number;
  entries: WalletEntry[];
  breakdown: BalanceBreakdown;
  live: boolean;
  /**
   * The wallet's settings control, drawn as the fourth Quick Actions card.
   * The governing render draws ONE header row and then the card, so the
   * control has no row of its own.
   */
  settings?: ReactNode;
  /** The viewer's saved cards, for the Top Up sheet. Empty when none or unreadable. */
  cards?: PaymentMethod[];
  /**
   * Whether the crypto on-ramp has keys. Resolved on the SERVER and passed
   * down, because the answer depends on environment variables a browser must
   * never see. False by default, so the control cannot appear by omission.
   */
  cryptoEnabled?: boolean;
  /** Naira per one US dollar, from configuration only; null hides the toggle. */
  usdRate?: number | null;
  /** A sheet to open on arrival, from `?action=`. The send page's bank link uses it. */
  initialAction?: SheetKey | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<SheetKey | null>(
    initialAction === "crypto" && !cryptoEnabled ? null : initialAction,
  );
  const [hidden, toggleHidden] = useBalanceMask();
  const [inUsd, setInUsd] = useState(false);

  const { whole, kobo } = formatKoboExact(balanceMinor, locale);
  /* Everything in front of the first digit is the locale's own lead: the
     sign, the symbol and whatever spacing it puts between them. The odometer
     rolls the magnitude behind it. Integer arithmetic throughout. */
  const digitAt = whole.search(/\d/);
  const lead = digitAt === -1 ? whole : whole.slice(0, digitAt);
  const absMinor = Math.abs(balanceMinor);
  const wholeNaira = (absMinor - (absMinor % 100)) / 100;

  const change = useMemo(() => weekChange(entries, balanceMinor), [entries, balanceMinor]);
  const anyHeld = breakdown.heldOutMinor > 0 || breakdown.heldInMinor > 0;

  /* A brief light pulse through the card the moment the balance moves:
     upward when money lands, downward when it leaves. */
  const prevBalance = useRef<number | null>(null);
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const prev = prevBalance.current;
    prevBalance.current = balanceMinor;
    if (prev === null || prev === balanceMinor) return;
    setPulse(balanceMinor > prev ? "up" : "down");
    const timer = setTimeout(() => setPulse(null), 1200);
    return () => clearTimeout(timer);
  }, [balanceMinor]);

  const close = () => setOpen(null);

  /* A saved card charged synchronously: nothing to redirect to, so the
     wallet's own verifier settles the credit under the same reference. */
  const onCharged = (reference: string) => {
    setOpen(null);
    router.push(verifyPath(reference));
  };

  return (
    <div>
      <section
        aria-labelledby="nf-wallet-balance-label"
        data-pulse={pulse ?? undefined}
        className="nf-wallet-hero nf-balance-pulse"
      >
        <span className="nf-wallet-hero__object" aria-hidden="true">
          <BrandIcon name="wallet-naira" fill priority />
        </span>

        <div className="relative">
          <div className="nf-wallet-hero__label">
            <p id="nf-wallet-balance-label">{copy.totalBalance}</p>
            <button
              type="button"
              onClick={toggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? copy.showBalance : copy.hideBalance}
              className="nf-wallet-eye nf-tap"
            >
              <UiIcon name={hidden ? "eye-off" : "eye"} size={20} />
            </button>
            {usdRate ? (
              <button
                type="button"
                onClick={() => setInUsd((v) => !v)}
                aria-pressed={inUsd}
                aria-label={inUsd ? "Show balance in naira" : "Show balance in US dollars"}
                className="nf-wallet-eye nf-tap font-bold"
              >
                {inUsd ? "$" : "₦"}
              </button>
            ) : null}
          </div>

          {/* The figure. Masked, it is six discs behind the locale's own
              symbol; in dollars it is a static Amount, because a change of
              display currency is not a change of balance and must not roll. */}
          <p
            className={`nf-wallet-figure nf-numeric ${
              whole.length + kobo.length > 12 ? "nf-wallet-figure--long" : ""
            }`}
          >
            {hidden ? (
              <span>
                {inUsd ? "$" : lead}
                {"••••••"}
              </span>
            ) : inUsd && usdRate ? (
              <Amount
                minorUnits={Math.round(balanceMinor / usdRate)}
                locale={locale}
                currency="USD"
                showFraction
                secondaryClassName="nf-money-kobo nf-money-kobo--hero"
              />
            ) : (
              <>
                {lead}
                <Odometer value={wholeNaira} locale={locale} className="nf-odometer-figure" />
                <span className="nf-money-kobo nf-money-kobo--hero">{kobo}</span>
              </>
            )}
          </p>

          {/* The week's change, only when the ledger can say one; otherwise
              the honest line about what this wallet is. */}
          {change && !hidden ? (
            <p className={`nf-wallet-change ${change.netMinor < 0 ? "nf-wallet-change--down" : ""}`}>
              <UiIcon name={change.netMinor < 0 ? "arrow-down" : "arrow-up"} size={16} />
              {change.percent !== null ? (
                <span className="nf-numeric">
                  {change.percent > 0 ? "+" : ""}
                  {formatNumber(change.percent, locale)}%
                </span>
              ) : (
                <span className="nf-numeric">
                  {change.netMinor > 0 ? "+" : "-"}
                  <Amount minorUnits={Math.abs(change.netMinor)} locale={locale} />
                </span>
              )}
              <span>{copy.thisWeek}</span>
            </p>
          ) : (
            <p className="nf-wallet-hero__note">
              {inUsd && usdRate
                ? `Converted at ₦${formatNumber(usdRate, locale)} to $1. Your wallet is held in naira.`
                : copy.nairaWallet}
            </p>
          )}

          {/* Where the rest of the money is, only when some of it is
              elsewhere or the answer could not be read. */}
          {(anyHeld || breakdown.readFailed) && (
            <div className="mt-inline">
              <BalanceBreakdownSheet breakdown={breakdown} locale={locale} hidden={hidden} />
            </div>
          )}

          <WalletTiles copy={copy} current="wallet" onAddMoney={() => setOpen("fund")} />
        </div>
      </section>

      {/*
        QUICK ACTIONS, FOUR REAL ONES IN THE RENDER'S FOUR SLOTS.
        6AF37222 draws Send Money, Buy Airtime, Pay Bills and Request Money.
        Airtime and bills are products Vallo does not sell and are refused.
        Send and Request are real as drawn; the other two slots carry real
        wallet destinations in the same anatomy: the saved cards and bank
        accounts (/settings/payments) and the wallet's settings sheet. The
        render's "See all" is refused too: all four are already on screen, so
        it would lead nowhere.
      */}
      <section aria-labelledby="nf-wallet-quick" className="nf-wallet-section">
        <div className="nf-wallet-section__head">
          <h2 id="nf-wallet-quick" className="nf-wallet-section__title">
            {copy.quickActions}
          </h2>
        </div>
        <div className="nf-wallet-quick">
          <QuickLink
            href="/wallet/send"
            art="send-plane-tile"
            title={copy.quickSend}
            sub={copy.quickSendSub}
          />
          <QuickLink
            href="/wallet/receive"
            art="person-card"
            title={copy.quickRequest}
            sub={copy.quickRequestSub}
          />
          <QuickLink
            href="/settings/payments"
            art="card-tile"
            title={copy.quickCards}
            sub={copy.quickCardsSub}
          />
          {settings}
        </div>
      </section>

      <MoneySheet open={open === "fund"} title={copy.topUpTitle} hint={copy.topUpHint} onClose={close}>
        <FundForm locale={locale} copy={copy} cards={cards} onCharged={onCharged} />
      </MoneySheet>
      <MoneySheet
        open={open === "withdraw"}
        title="Withdraw to your bank"
        hint="Send wallet funds to any Nigerian bank account in your name."
        onClose={close}
      >
        <WithdrawForm locale={locale} balanceMinor={balanceMinor} live={live} onDone={close} />
      </MoneySheet>
      {cryptoEnabled && (
        <MoneySheet
          open={open === "crypto"}
          title="Top up with crypto"
          hint="Pay in crypto and your wallet is credited in naira. Yellow Card handles the exchange and settles to us; nothing about a coin or a rate touches your balance."
          onClose={close}
        >
          <CryptoTopUpForm locale={locale} />
        </MoneySheet>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ quick cards */

/** A quick-action card: the plate, one title line, one sub line. */
function QuickLink({
  href,
  art,
  title,
  sub,
}: {
  href: string;
  art: BrandIconName;
  title: string;
  sub: string;
}) {
  return (
    <Link href={href} className="nf-wallet-quick__card">
      <QuickPlate art={art} />
      <span className="nf-wallet-quick__title">{title}</span>
      <span className="nf-wallet-quick__sub">{sub}</span>
    </Link>
  );
}

/* ----------------------------------------------------------------- forms */

const FUND_INITIAL: ActionResult<FundStart | null> = { ok: false, error: "" };
const WITHDRAW_INITIAL: ActionResult<WithdrawReceipt | null> = { ok: false, error: "" };

/**
 * Top Up.
 *
 * TWO DOORS, ONE FIELD. With a usable saved card the sheet opens on the
 * card list with the default preselected, posts to `fundWalletWithSavedCard`
 * and, when the processor charged the card there and then, hands the
 * reference to the wallet's verifier rather than assigning an empty URL.
 * When the bank insists on a challenge the action returns a hosted URL
 * under the same reference and the browser goes there, once. Without a
 * card, or by choice, the hosted Paystack window is the door, exactly as it
 * has been.
 *
 * ONE KEY PER MOUNT, on both forms, so a second tap is one movement once
 * the schema reads it.
 */
function FundForm({
  locale,
  copy,
  cards,
  onCharged,
}: {
  locale: Locale;
  copy: HomeCopy;
  cards: PaymentMethod[];
  onCharged: (reference: string) => void;
}) {
  const usable = useMemo(
    () => cards.filter((card) => card.reusable && !cardExpired(card.expMonth, card.expYear)),
    [cards],
  );
  const [mode, setMode] = useState<"saved" | "hosted">(usable.length > 0 ? "saved" : "hosted");
  const [cardId, setCardId] = useState<string | null>(() => preselectedCardId(cards));
  const [amount, setAmount] = useState("");
  const [idempotencyKey] = useState(mintIdempotencyKey);
  const [hosted, hostedAction, hostedPending] = useActionState(fundWallet, FUND_INITIAL);
  const [saved, savedAction, savedPending] = useActionState(fundWalletWithSavedCard, FUND_INITIAL);

  useEffect(() => {
    if (hosted.ok && hosted.data) window.location.assign(hosted.data.authorizationUrl);
  }, [hosted]);

  useEffect(() => {
    if (!saved.ok || !saved.data) return;
    /* The branch lives in `funding-step.ts` so it can be tested; an empty
       authorisation URL means the card was charged synchronously and the
       credit settles through the verifier, never through assigning "". */
    const step = fundingStep(saved.data);
    if (step.kind === "hosted") window.location.assign(step.url);
    else onCharged(step.reference);
    /* `onCharged` navigates; re-running on its identity would navigate twice. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  if (hosted.ok && hosted.data) {
    return (
      <div role="status" aria-live="polite" className="py-group text-center">
        <p className="nf-body font-semibold">{copy.opening}</p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
          {copy.openingBody}
        </p>
      </div>
    );
  }
  if (saved.ok && saved.data) {
    const hostedNext = fundingStep(saved.data).kind === "hosted";
    return (
      <div role="status" aria-live="polite" className="py-group text-center">
        <p className="nf-body font-semibold">{hostedNext ? copy.opening : copy.charged}</p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
          {hostedNext ? copy.openingBody : copy.chargedBody}
        </p>
      </div>
    );
  }

  const state = mode === "saved" ? saved : hosted;
  const pending = hostedPending || savedPending;

  return (
    <form action={mode === "saved" ? savedAction : hostedAction} noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {mode === "saved" && cardId && <input type="hidden" name="methodId" value={cardId} />}

      <AmountField
        value={amount}
        onChange={setAmount}
        error={fieldError(state, "amount")}
        quickAmounts
        locale={locale}
      />

      {mode === "saved" && (
        <div className="mt-row">
          <p className={`mb-inline ${TYPE.label}`}>{copy.savedCard}</p>
          <SavedCardPicker
            cards={cards}
            value={cardId}
            onChange={setCardId}
            disabled={pending}
            label={copy.savedCard}
          />
          {fieldError(state, "methodId") && (
            <p role="alert" className="nf-body-sm mt-inline text-[var(--nf-state-error)]">
              {fieldError(state, "methodId")}
            </p>
          )}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        full
        className="mt-row"
        loading={pending}
        disabled={mode === "saved" && !cardId}
      >
        {mode === "saved" ? copy.chargeCard : copy.continueToPayment}
      </Button>

      {usable.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          full
          className="mt-inline"
          disabled={pending}
          onClick={() => setMode((m) => (m === "saved" ? "hosted" : "saved"))}
        >
          {mode === "saved" ? copy.anotherWay : copy.backToSaved}
        </Button>
      )}
      <ErrorNotice state={state} />
    </form>
  );
}

function WithdrawForm({
  locale,
  balanceMinor,
  live,
  onDone,
}: {
  locale: Locale;
  balanceMinor: number;
  live: boolean;
  /** Closes the sheet onto the wallet, where the movement now sits. */
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(withdraw, WITHDRAW_INITIAL);
  const wait = useMoneyWait(pending);
  /* MON-01: one key per open sheet, so a second tap (or a retry after a
     dropped connection) replays the first answer instead of paying twice. */
  const [idempotencyKey] = useState(mintIdempotencyKey);
  const router = useRouter();
  const [amount, setAmount] = useState("");

  // A successful hold changes the statement: re-read it behind the sheet.
  useEffect(() => {
    if (state.ok && state.data) router.refresh();
  }, [state, router]);

  /*
   * THE NAME COMES FROM THE BANK. `lookupAccountName` asks the moment a bank
   * and ten digits are both present, and the answer is displayed rather than
   * made editable: it is the bank's record, not ours to let anyone correct.
   * `withdraw` resolves it again server-side; this is the courtesy, not the
   * guard. The attempt counter stops a slower earlier answer landing last.
   */
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holder, setHolder] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "found"; name: string }
    | { state: "missing"; reason: string }
  >({ state: "idle" });
  const attempt = useRef(0);

  const check = (nextBank: string, nextNumber: string) => {
    const digits = nextNumber.replace(/\D/g, "");
    if (nextBank.length === 0 || digits.length !== 10) {
      setHolder({ state: "idle" });
      return;
    }
    const mine = ++attempt.current;
    setHolder({ state: "checking" });
    void lookupAccountName(nextBank, digits).then((result) => {
      if (mine !== attempt.current) return;
      if (result.ok) setHolder({ state: "found", name: result.accountName });
      else setHolder({ state: "missing", reason: result.reason });
    });
  };

  if (state.ok && state.data) {
    return (
      <div role="status" aria-live="polite" className="py-inline text-center">
        <span className="mx-auto block h-16 w-16">
          <BrandIcon name="seal-pending" fill />
        </span>
        <p className="mt-row">
          <Amount
            minorUnits={state.data.amountMinor}
            locale={locale}
            showFraction
            className="nf-h1 tracking-tight"
          />
        </p>
        <p className="nf-body mt-inline-tight font-semibold">
          On its way to {state.data.bankName} ****{state.data.accountLast4}
        </p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
          The withdrawal shows as pending until the bank confirms it, then your history updates on
          its own.
        </p>
        <span className="mt-row block">
          <span className="nf-caption block text-[var(--nf-content-muted)]">Reference</span>
          <span className="nf-body-sm mt-3xs block font-mono font-semibold text-[var(--nf-content-primary)] [overflow-wrap:anywhere] [user-select:all] [font-variant-numeric:tabular-nums]">
            {state.data.reference}
          </span>
        </span>
        <div className="mt-block flex flex-col items-stretch gap-inline">
          <ButtonLink href="/wallet/transactions" variant="primary" full>
            See it in your history
          </ButtonLink>
          <Button type="button" variant="ghost" full onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-row">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {live && <BalanceLine balanceMinor={balanceMinor} locale={locale} />}
      <AmountField
        value={amount}
        onChange={setAmount}
        error={fieldError(state, "amount")}
        locale={locale}
      />
      <SelectField
        label="Bank"
        name="bankCode"
        value={bankCode}
        onChange={(event) => {
          setBankCode(event.target.value);
          check(event.target.value, accountNumber);
        }}
        error={fieldError(state, "bankCode")}
      >
        <option value="" disabled style={{ background: "var(--nf-surface-elevated)" }}>
          Choose your bank
        </option>
        {WALLET_BANKS.map((bank) => (
          <option key={bank.code} value={bank.code} style={{ background: "var(--nf-surface-elevated)" }}>
            {bank.name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Account number"
        name="accountNumber"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder="10-digit account number"
        value={accountNumber}
        onChange={(event) => {
          setAccountNumber(event.target.value);
          check(bankCode, event.target.value);
        }}
        error={fieldError(state, "accountNumber")}
      />

      {holder.state === "checking" && (
        <p role="status" aria-live="polite" className="nf-body-sm text-[var(--nf-content-muted)]">
          Checking the account
        </p>
      )}
      {holder.state === "found" && (
        <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-brand-edge)] bg-[var(--nf-surface-inset)] px-sm py-sm">
          <p className="nf-overline">Name on the account</p>
          <p className="nf-body mt-3xs font-semibold text-[var(--nf-content-primary)]">{holder.name}</p>
        </div>
      )}
      {holder.state === "missing" && holder.reason.length > 0 && (
        <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
          {holder.reason}
        </p>
      )}

      <Button type="submit" variant="primary" full className="mt-inline-tight" loading={pending}>
        Withdraw
      </Button>
      <WaitNotice wait={wait} movement="withdrawal" onDone={onDone} />
      <ErrorNotice state={state} />
    </form>
  );
}

function BalanceLine({ balanceMinor, locale }: { balanceMinor: number; locale: Locale }) {
  const amount = formatKoboExact(balanceMinor, locale);
  const absMinor = Math.abs(balanceMinor);
  const wholeNaira = (absMinor - (absMinor % 100)) / 100;
  const digitAt = amount.whole.search(/\d/);
  const lead = digitAt === -1 ? amount.whole : amount.whole.slice(0, digitAt);
  return (
    <p className="nf-body-sm rounded-[var(--nf-radius-md)] border border-[var(--nf-brand-edge)] bg-[var(--nf-surface-inset)] px-row py-inline text-[var(--nf-content-muted)]">
      Available balance{" "}
      <span className="nf-numeric font-semibold text-[var(--nf-content-primary)]">
        {lead}
        <Odometer value={wholeNaira} locale={locale} suffix={amount.kobo} />
      </span>
    </p>
  );
}
