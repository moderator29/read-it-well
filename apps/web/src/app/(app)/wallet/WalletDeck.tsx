"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, type Locale } from "@vallo/i18n";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { Odometer } from "@/components/site/Odometer";
import { formatKoboExact } from "@/components/app/wallet/money";
import { Amount } from "@/components/ui/Amount";
import type { ActionResult } from "@/lib/actions/envelope";
import {
  fundWallet,
  lookupAccountName,
  startCryptoDeposit,
  transferToUser,
  withdraw,
  type CryptoStart,
  type FundStart,
  type TransferReceipt,
  type WithdrawReceipt,
} from "@/lib/wallet/actions";
import { WALLET_BANKS } from "@/lib/wallet/banks";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField, SelectField } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";

/**
 * Wallet action deck: Add money, Withdraw, Transfer, and crypto when it is
 * configured.
 *
 * Each tile opens a full-page drawer
 * (Master Rule: full-page drawers, never partial) holding a real form wired
 * to the wallet server actions. Amounts are typed in naira and become integer
 * kobo on the server, once, inside the schema; the client never does money
 * arithmetic. Funding hands the browser to Paystack's hosted checkout;
 * withdrawals and transfers show their receipt and re-read the statement so
 * the balance card and history reflect the new truth immediately.
 */

type DeckKey = "fund" | "crypto" | "withdraw" | "transfer";

const TILES: {
  key: DeckKey;
  label: string;
  icon: BrandIconName;
  title: string;
  hint: string;
}[] = [
  {
    key: "fund",
    label: "Add money",
    icon: "wallet-plus",
    title: "Add money to your wallet",
    hint: "Fund your wallet by card or bank transfer through a secure Paystack window.",
  },
  {
    key: "withdraw",
    /* `shield-lock` is a padlock, and it meant "take your own money out". The
       four marks here are the four movements, and each one now draws the one
       it names: money in, money out, a coin exchange, a transfer between
       people. Two of them were the same mark before this. */
    label: "Withdraw",
    icon: "wallet-out",
    title: "Withdraw to your bank",
    hint: "Send wallet funds to any Nigerian bank account in your name.",
  },
  {
    key: "crypto",
    /* ONE WORD, because this label sits in a half-width grid cell beside
       "Withdraw" and `.nf-btn` is `white-space: nowrap`. "Top up with crypto"
       did not wrap - it ran straight out of its own button and was clipped by
       the screen edge, in both themes. The sheet it opens is titled "Top up
       with crypto", so nothing is lost by the button being short. */
    label: "Crypto",
    icon: "coin-naira",
    title: "Top up with crypto",
    hint: "Pay in crypto and your wallet is credited in naira. Yellow Card handles the exchange and settles to us; nothing about a coin or a rate touches your balance.",
  },
  {
    key: "transfer",
    label: "Transfer",
    icon: "transfer-arrow",
    title: "Transfer to another user",
    hint: "Send money to another Vallo user by email. It lands instantly.",
  },
];

export function WalletDeck({
  locale,
  balanceMinor,
  live,
  cryptoEnabled = false,
}: {
  locale: Locale;
  balanceMinor: number;
  live: boolean;
  /**
   * Whether the crypto on-ramp has keys.
   *
   * Resolved on the SERVER and passed down, because the answer depends on
   * environment variables a browser must never see. False by default, so the
   * control cannot appear by omission - which is the whole guarantee: a crypto
   * button that cannot take money is the same defect as a Reserve button on an
   * unbookable listing, and worse, because this one is about money.
   */
  cryptoEnabled?: boolean;
}) {
  const [open, setOpen] = useState<DeckKey | null>(null);
  const tiles = TILES.filter((tile) => tile.key !== "crypto" || cryptoEnabled);

  return (
    <div>
      {/*
        ONE PRIMARY ACTION, TWO QUIET ONES. IT WAS THREE OF EQUAL WEIGHT.

        This was a three column grid of identical cards, each a bordered and
        shadowed box wrapping a 48px object with a label under it. Two problems
        in one component.

        The boxes. A plate behind an object is the thing the owner has asked us
        to stop doing everywhere, and here there were three of them in a row,
        each adding an edge and a shadow around artwork that is already lit and
        already has its own edge.

        The equal weight. Adding money is what somebody comes to this screen to
        do, and it is the only one of the three that works on an empty wallet.
        Withdraw and Transfer both need a balance to act on, so presenting all
        three identically offers a person with zero naira two doors that lead
        straight to "you do not have enough". Add money is now the full width
        primary; the other two sit under it as quiet siblings, still one tap
        away, nothing hidden.

        No icons on the buttons at all. A label on a button is faster to read
        than a picture of a wallet, and three objects competing above three
        words was noise standing where a decision should be.
      */}
      <div role="group" aria-label="Wallet actions">
        <Button
          type="button"
          variant="primary"
          size="lg"
          full
          aria-haspopup="dialog"
          onClick={() => setOpen("fund")}
        >
          {TILES[0]!.label}
        </Button>

        {/*
          The column count follows the number of actions.

          It was a hard `grid-cols-2` holding whatever was left after the
          primary. With crypto switched on that is THREE, so Withdraw and
          Crypto shared a row and Transfer sat alone beside an empty cell -
          a hole in the middle of the wallet's controls. Two stays two.
        */}
        <div
          className={`mt-row grid gap-row ${
            tiles.length - 1 >= 3 ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          {tiles.slice(1).map((tile) => (
            <Button
              key={tile.key}
              type="button"
              variant="secondary"
              size="lg"
              aria-haspopup="dialog"
              onClick={() => setOpen(tile.key)}
            >
              {tile.label}
            </Button>
          ))}
        </div>
      </div>

      {tiles.map((tile) => (
        <WalletDrawer
          key={tile.key}
          open={open === tile.key}
          title={tile.title}
          hint={tile.hint}
          onClose={() => setOpen(null)}
        >
          {tile.key === "fund" && <FundForm locale={locale} />}
          {tile.key === "crypto" && <CryptoForm locale={locale} />}
          {tile.key === "withdraw" && (
            <WithdrawForm
              locale={locale}
              balanceMinor={balanceMinor}
              live={live}
              onDone={() => setOpen(null)}
            />
          )}
          {tile.key === "transfer" && (
            <TransferForm
              locale={locale}
              balanceMinor={balanceMinor}
              live={live}
              onDone={() => setOpen(null)}
            />
          )}
        </WalletDrawer>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- drawer */

function WalletDrawer({
  open,
  title,
  hint,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  hint: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // The portal, the focus trap, focus restoration, Escape, the backdrop and
  // the body scroll lock all belong to `<Sheet>`. The portal in particular is
  // not optional here: rendered in place, a `position: fixed` panel is only
  // ever fixed to the nearest ancestor that establishes a containing block (a
  // transform, a filter, a `will-change: transform`, any of which appear on
  // animated wrappers elsewhere on this page), not reliably to the viewport.
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="mb-heading flex items-start justify-between gap-md">
          <p className="nf-body-sm leading-relaxed text-[var(--nf-content-muted)]">
            {hint}
          </p>
          {/*
            THE CLOSE BUTTON HAS THE CORNER TO ITSELF.

            A 52px object sat immediately beside a 40px close button in one flex
            row. `BalanceCard`'s own comment records removing exactly this
            mistake two rows up: "Three things of one size in a line read as
            three controls, so the decoration was being scanned as a button that
            does not respond." On the one screen where somebody is about to move
            money, a decoy beside Close is the worst place in the product for
            it. The sheet already has a title; the object is not carrying a fact
            the title does not.
          */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="nf-icon-btn h-10 w-10 shrink-0"
          >
            <UiIcon name="close" size={20} />
          </button>
        </div>

        <div className="nf-card p-card-sm sm:p-card">{children}</div>
      </div>
    </Sheet>
  );
}

/* ----------------------------------------------------------------- forms */

const FUND_INITIAL: ActionResult<FundStart | null> = { ok: false, error: "" };
const WITHDRAW_INITIAL: ActionResult<WithdrawReceipt | null> = { ok: false, error: "" };
const TRANSFER_INITIAL: ActionResult<TransferReceipt | null> = { ok: false, error: "" };
const CRYPTO_INITIAL: ActionResult<CryptoStart | null> = { ok: false, error: "" };

/* ------------------------------------------------- the wait, and its end */

/**
 * WITHDRAW AND TRANSFER HAD NO TIMEOUT, AND THEY ARE THE TWO PATHS THAT MOVE
 * SOMEBODY'S OWN MONEY OUT.
 *
 * Both are `useActionState`, so the only thing a hanging action produced was a
 * spinner inside a disabled button for as long as the reader was willing to sit
 * there. No sentence, no statement about the balance, no route to the record.
 * On a Lagos network a request that never settles is ordinary rather than an
 * edge case, and the person watching it is the one who has just asked us to
 * send a quarter of a million naira to their bank. F2-018.
 *
 * The two intervals are the ones the card path already uses, named the same, so
 * the product waits for the same length of time everywhere money is moving.
 *
 * WHAT THE TERMINAL STATE MAY NOT DO IS OFFER A RETRY. `startCardCheckout`
 * mints an idempotency key per attempt and can safely say "try again";
 * `withdraw` and `transferToUser` take no key and generate their reference
 * server-side, so a second submit is a second movement. The action is also
 * still genuinely in flight - nothing here can cancel a server action - so the
 * honest terminal state says what is and is not known, sends the reader to the
 * one page that holds the answer, and tells them not to send it twice. If the
 * answer does arrive at forty seconds the receipt replaces this on its own.
 */
const SLOW_MS = 10_000;
const GIVE_UP_MS = 25_000;

type Wait = "quick" | "slow" | "stalled";

function useMoneyWait(pending: boolean): Wait {
  const [wait, setWait] = useState<Wait>("quick");
  const [watching, setWatching] = useState(pending);

  /* React's documented "adjust state when a prop changes" pattern rather than
     an effect, and the difference is visible. A second attempt after a stalled
     first one has to begin at "quick" before anything paints; resetting in an
     effect paints the old terminal panel over the new attempt for one frame,
     which on this screen reads as "it has failed again already". */
  if (watching !== pending) {
    setWatching(pending);
    setWait("quick");
  }

  useEffect(() => {
    if (!pending) return;
    const slow = window.setTimeout(() => setWait("slow"), SLOW_MS);
    const giveUp = window.setTimeout(() => setWait("stalled"), GIVE_UP_MS);
    return () => {
      window.clearTimeout(slow);
      window.clearTimeout(giveUp);
    };
  }, [pending]);

  /* Nothing is waiting when nothing is in flight, whatever the last attempt
     ended on. */
  return pending ? wait : "quick";
}

/**
 * What a long wait says, and then what a wait that has stopped being one says.
 *
 * Cyan rather than rose, because nothing has failed: `--nf-status-pending` is
 * the token this product reserves for "still going through" and that is exactly
 * what is true here. A stalled request painted as an error would be us telling
 * somebody their money did not move when we do not know that.
 */
function WaitNotice({
  wait,
  movement,
  onDone,
}: {
  wait: Wait;
  movement: "withdrawal" | "transfer";
  onDone: () => void;
}) {
  if (wait === "quick") return null;

  if (wait === "slow") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="nf-body-sm mt-row leading-relaxed text-[var(--nf-content-muted)]"
      >
        This is taking longer than usual. Nothing has left your wallet yet, and nothing has been
        sent twice. Stay here.
      </p>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="nf-body-sm mt-row rounded-[var(--nf-radius-lg)] border border-[color-mix(in_oklab,var(--nf-status-pending)_45%,transparent)] bg-[var(--nf-status-pending-surface)] p-row leading-relaxed text-[var(--nf-content-secondary)]"
    >
      <span className="flex items-start gap-inline">
        <UiIcon
          name="history"
          size="xs"
          className="mt-3xs shrink-0 text-[var(--nf-status-pending)]"
        />
        <span className="min-w-0">
          <span className="block font-semibold text-[var(--nf-status-pending)]">
            We have not heard back
          </span>
          <span className="mt-3xs block">
            {movement === "withdrawal"
              ? "Do not send this again. If the withdrawal started it is at the top of your history as pending, and if it did not, your balance is untouched."
              : "Do not send this again. If the transfer went through it is at the top of your history, and if it did not, your balance is untouched."}
          </span>
        </span>
      </span>
      <span className="mt-block flex flex-col items-stretch gap-inline">
        <ButtonLink href="/wallet/transactions" variant="primary" full>
          See your history
        </ButtonLink>
        <Button type="button" variant="ghost" full onClick={onDone}>
          Close
        </Button>
      </span>
    </div>
  );
}

/*
 * The locale prop is back on this one form.
 *
 * It was dropped when the balance figures moved to <Amount>, which resolves
 * the locale itself, and that was right for those. It is not right here:
 * `AmountField` still writes two things by hand, the placeholder and the
 * preset chips, and both read as English numerals without it. <Amount> cannot
 * help with either, because one is a hint and the others are labels on
 * buttons.
 */
function FundForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(fundWallet, FUND_INITIAL);
  const redirecting = state.ok && state.data !== null;

  // The action hands back the hosted checkout URL; the browser goes there.
  useEffect(() => {
    if (state.ok && state.data) window.location.assign(state.data.authorizationUrl);
  }, [state]);

  if (redirecting) {
    return (
      <div role="status" aria-live="polite" className="py-group text-center">
        <p className="nf-body font-semibold">Opening the secure payment window</p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
          You are on your way to Paystack to complete the payment. Your wallet updates the
          moment it lands.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      <AmountField error={fieldError(state, "amount")} quickAmounts locale={locale} />
      <Button type="submit" variant="primary" full className="mt-row" loading={pending}>
        Continue to payment
      </Button>
      <ErrorNotice state={state} />
    </form>
  );
}

/**
 * The crypto top-up.
 *
 * Deliberately the same shape as `FundForm`: a naira amount, a submit, a hand
 * off to a hosted page. The person is never asked for a coin, a network or an
 * address, and never shown a rate. They say how much naira they want in their
 * wallet; Yellow Card decides what that costs in crypto at the moment they pay
 * and carries the movement.
 *
 * This form only exists when `cryptoEnabled` is true, which is decided on the
 * server from whether the keys are set. It cannot appear before it works.
 */
function CryptoForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(startCryptoDeposit, CRYPTO_INITIAL);
  const redirecting = state.ok && state.data !== null;

  useEffect(() => {
    if (state.ok && state.data) window.location.assign(state.data.paymentUrl);
  }, [state]);

  if (redirecting) {
    return (
      <div role="status" aria-live="polite" className="py-group text-center">
        <p className="nf-body font-semibold">Opening the crypto payment window</p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
          You are on your way to Yellow Card to pay. Your wallet is credited in
          naira once the payment settles on the network, which is usually a few
          minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      <AmountField error={fieldError(state, "amount")} quickAmounts locale={locale} />
      {/* The one thing somebody topping up with crypto needs to know before
          they commit, said before the button rather than after the payment:
          the amount they type is what lands, and settlement is not instant. */}
      <p className="nf-body-sm mt-row leading-relaxed text-[var(--nf-content-muted)]">
        You are topping up in naira. The crypto amount is worked out at the
        payment window, and this figure is what reaches your wallet.
      </p>
      <Button type="submit" variant="primary" full className="mt-row" loading={pending}>
        Continue to payment
      </Button>
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
  /** Closes the drawer onto the wallet, where the movement now sits. */
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(withdraw, WITHDRAW_INITIAL);
  const wait = useMoneyWait(pending);
  const router = useRouter();

  // A successful hold changes the statement: re-read it behind the drawer.
  useEffect(() => {
    if (state.ok && state.data) router.refresh();
  }, [state, router]);

  /*
   * THE NAME COMES FROM THE BANK, AND THIS FORM WAS STILL ASKING FOR IT.
   *
   * The box read "Name on the account / As it appears at your bank", which is
   * the platform asking somebody to type a fact it can look up - and typing it
   * proves nothing, because whatever they type is not checked against the
   * account. A wrong digit in the account number was only discovered after the
   * tap.
   *
   * `lookupAccountName` asks the bank the moment a bank and ten digits are
   * both present, and the answer is displayed rather than made editable: it is
   * the bank's record, not ours to let anyone correct. `withdraw` resolves it
   * again server-side and that remains the source of truth for the payout, so
   * this is the courtesy, not the guard.
   *
   * THE ATTEMPT COUNTER IS NOT DECORATION. Typing the tenth digit and then
   * changing the bank fires two lookups; without it the slower first answer
   * can land last and show a name belonging to the account the reader has
   * already moved away from.
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
      /*
        IT USED TO END HERE, WITH NOWHERE TO GO.

        The copy is the best consequence line in the product and it was handed
        to a reader who then had only the X in the drawer's corner. A moment
        that stops with no next action is a bug, and this one stopped on the
        largest single movement most people will make on this platform.

        Two things were added and neither is decoration. THE REFERENCE, because
        a receipt with no reference cannot be traced by the person who has to
        ring their bank about it, and the action already returns one. And a way
        out that lands somewhere useful: closing the drawer puts the movement
        at the top of the history behind it.
      */
      <div role="status" aria-live="polite" className="py-inline text-center">
        <p>
          <Amount
            minorUnits={state.data.amountMinor}
            locale={locale}
            showFraction
            className="text-[1.4rem] font-bold tracking-tight"
          />
        </p>
        <p className="nf-body mt-inline-tight font-semibold">
          On its way to {state.data.bankName} ****{state.data.accountLast4}
        </p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
          The withdrawal shows as pending until the bank confirms it, then your history
          updates on its own.
        </p>
        <Reference value={state.data.reference} />
        <ReceiptActions onDone={onDone} />
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-row">
      {live && <BalanceLine balanceMinor={balanceMinor} locale={locale} />}
      <AmountField error={fieldError(state, "amount")} locale={locale} />
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
          <option
            key={bank.code}
            value={bank.code}
            style={{ background: "var(--nf-surface-elevated)" }}
          >
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

      {/*
        The answer, where the box used to be.

        Stated plainly rather than dressed as a success banner: it is a fact
        about the account and the reader's job is to read it and recognise it.
        Never editable, because it is the bank's answer and not ours.
      */}
      {holder.state === "checking" && (
        <p className="nf-body-sm text-[var(--nf-content-muted)]">Checking the account…</p>
      )}
      {holder.state === "found" && (
        <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-sunken)] px-sm py-sm">
          <p className="nf-overline">Name on the account</p>
          <p className="nf-body mt-3xs font-semibold text-[var(--nf-content-primary)]">
            {holder.name}
          </p>
        </div>
      )}
      {/* ROSE, NOT CYAN. `--nf-state-warning` resolves to `--nf-cyan-400`,
          which is the same token `--nf-status-pending` is defined as, so "we
          could not find that account" was drawn in the colour this product
          reserves for "still going through". A lookup that failed is a
          failure. */}
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

function TransferForm({
  locale,
  balanceMinor,
  live,
  onDone,
}: {
  locale: Locale;
  balanceMinor: number;
  live: boolean;
  /** Closes the drawer onto the wallet, where the movement now sits. */
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(transferToUser, TRANSFER_INITIAL);
  const wait = useMoneyWait(pending);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.data) router.refresh();
  }, [state, router]);

  if (state.ok && state.data) {
    return (
      <div role="status" aria-live="polite" className="py-inline text-center">
        <p>
          <Amount
            minorUnits={state.data.amountMinor}
            locale={locale}
            showFraction
            className="text-[1.4rem] font-bold tracking-tight"
          />
        </p>
        <p className="nf-body mt-inline-tight font-semibold">
          Sent to {state.data.recipientName}
        </p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
          Their wallet has it already, and both sides of the movement are in your history.
        </p>
        <Reference value={state.data.reference} />
        <ReceiptActions onDone={onDone} />
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-row">
      {live && <BalanceLine balanceMinor={balanceMinor} locale={locale} />}
      <TextField
        label="Recipient email"
        name="recipientEmail"
        type="email"
        autoComplete="off"
        placeholder="name@example.com"
        error={fieldError(state, "recipientEmail")}
      />
      <AmountField error={fieldError(state, "amount")} locale={locale} />
      <TextField
        label="Note"
        optionalText="(optional)"
        name="note"
        type="text"
        autoComplete="off"
        maxLength={140}
        placeholder="What is it for?"
        error={fieldError(state, "note")}
      />
      <Button type="submit" variant="primary" full className="mt-inline-tight" loading={pending}>
        Send transfer
      </Button>
      <WaitNotice wait={wait} movement="transfer" onDone={onDone} />
      <ErrorNotice state={state} />
    </form>
  );
}

/* ------------------------------------------------------------ small parts */

/** Naira presets the chips can type into the field. Display strings only. */
/**
 * The presets, in integer kobo like every other figure on this platform.
 *
 * They were three display strings, `"5,000"`, and the string was both the
 * label and the value typed into the field, so the chips read as English
 * numerals to a reader in any of the four languages.
 *
 * The split matters and is not cosmetic. The **label** is localised through
 * `Amount`, which is what a reader sees. The **value** written into the field
 * stays canonical digits, because `parseNairaToKobo` accepts `5000` and
 * `5,000` and nothing else: a locale whose grouping separator is not a comma
 * would produce a string its own validator rejects, and the person would be
 * told their amount was invalid after tapping a button the app offered them.
 */
const QUICK_AMOUNTS_KOBO = [500_000, 2_000_000, 5_000_000];

/** Canonical digits for the field: no separators, no symbol, always parseable. */
function canonicalNaira(kobo: number): string {
  return String(Math.round(kobo / 100));
}

function AmountField({
  error,
  quickAmounts,
  locale,
}: {
  error?: string;
  quickAmounts?: boolean;
  /** Formats what the reader sees. Never what the field holds. */
  locale: Locale;
}) {
  const [value, setValue] = useState("");
  return (
    <div>
      <TextField
        label="Amount (₦)"
        name="amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        /* The placeholder is the smallest preset, formatted the way the
           reader's own locale writes money, so the example and the buttons
           below it agree. */
        placeholder={formatMoney(QUICK_AMOUNTS_KOBO[0] ?? 500_000, locale)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error}
        clearable="Clear the amount"
        onClear={() => setValue("")}
      />
      {quickAmounts && (
        /* Presets, not a filter: `filter` semantics (aria-pressed) rather than
           `choice`, because a radio group with nothing selected leaves every
           chip at tabIndex -1 and unreachable by keyboard. */
        <ChipRow bleed={false} fadeEdges={false} snap={false} className="mt-inline">
          {QUICK_AMOUNTS_KOBO.map((kobo) => {
            const canonical = canonicalNaira(kobo);
            return (
              <Chip
                key={kobo}
                size="sm"
                selected={value === canonical}
                onSelectedChange={() => setValue(canonical)}
              >
                {formatMoney(kobo, locale)}
              </Chip>
            );
          })}
        </ChipRow>
      )}
    </div>
  );
}

function BalanceLine({ balanceMinor, locale }: { balanceMinor: number; locale: Locale }) {
  const amount = formatKoboExact(balanceMinor, locale);
  // Same integer-kobo split as the balance card, so the figure that reacts
  // to money on the wallet page also rolls into place here, inside the
  // drawer where the guest is about to spend or send it.
  const absMinor = Math.abs(balanceMinor);
  const koboRemainder = absMinor % 100;
  const wholeNaira = (absMinor - koboRemainder) / 100;

  /*
   * THE LAST HAND-WRITTEN NAIRA SIGN ON THE MONEY PATH, AND THE SIGN THAT WENT
   * WITH IT.
   *
   * This wrote `{"₦"}` in front of an odometer fed `Math.abs(balanceMinor)`,
   * which is the same pair of faults `BalanceCard` was carrying and fixed:
   * `ha-NG` emits "₦ 9,000,000" with a space, so the hero on the wallet page
   * and this line inside the drawer rendered the currency differently on a
   * Hausa phone; and an available balance below zero - which
   * `admin_payment_health` hunts for by name - was drawn as though it were
   * money the person had.
   *
   * `whole` from `formatKoboExact` already carries the minus, the symbol and
   * whatever spacing the locale puts between them. Everything before its first
   * digit is that lead, and the odometer rolls the magnitude behind it, exactly
   * as the card does it.
   */
  const digitAt = amount.whole.search(/\d/);
  const lead = digitAt === -1 ? amount.whole : amount.whole.slice(0, digitAt);

  /*
   * Was border-white/10 on bg-white/[0.04]. A white wash reads as a subtle
   * inset on a dark ground and as nothing at all on a light one, so in
   * daylight this line lost its container and floated loose in the form. The
   * inset surface and the subtle border are the two tokens that mean this in
   * both themes.
   */
  return (
    <p className="nf-body-sm rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-row py-inline text-[var(--nf-content-muted)]">
      Available balance{" "}
      <span className="nf-numeric font-semibold text-[var(--nf-content-primary)]">
        {lead}
        <Odometer value={wholeNaira} locale={locale} suffix={amount.kobo} />
      </span>
    </p>
  );
}

/**
 * The way out of a receipt, and it is two doors rather than one.
 *
 * ---------------------------------------------------------------------------
 * BOTH MONEY PATHS USED TO SUCCEED INTO A DEAD END.
 *
 * Withdraw and transfer each replaced the form with a receipt and offered no
 * action at all: the only way out was the X in the drawer's corner. A single
 * "Done" was added, which closed the drawer and was better than nothing, and it
 * still left the reader with no route to the record. On the largest single
 * movement most people will make on this platform, "it happened" is half the
 * answer and "here is where it is written down" is the other half.
 *
 * THE PRIMARY IS THE RECORD, NOT THE DISMISSAL. A person reading a receipt is
 * deciding whether to trust what just happened, and the useful next step is the
 * statement the movement now sits at the top of. Dismissal is the quiet one
 * because it is the thing they can always do anyway, including with the X.
 *
 * WHY THE HISTORY AND NOT THE RECEIPT PAGE. `/wallet/transactions/[id]` exists
 * and would be the better target, but it is keyed on the ledger entry's id and
 * both actions return a REFERENCE, which is a different string. Linking a
 * reference into an id-shaped route would produce "No such receipt" on the
 * happy path, which is worse than one hop through the statement. Making the
 * actions return the id belongs to `lib/wallet/actions.ts`, which is another
 * owner's file; it is written up rather than reached into.
 *
 * Stacked and both full width, which is the one empty-state and result action
 * treatment the rest of the product uses. Side by side at 390px puts two
 * targets under one thumb.
 */
function ReceiptActions({ onDone }: { onDone: () => void }) {
  return (
    <div className="mt-block flex flex-col items-stretch gap-inline">
      <ButtonLink href="/wallet/transactions" variant="primary" full>
        See it in your history
      </ButtonLink>
      <Button type="button" variant="ghost" full onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

/**
 * The string support traces a movement by.
 *
 * Full, selectable and never truncated, in tabular figures so a person reading
 * it down a phone line does not lose their place. `user-select: all` means one
 * tap selects the whole thing, which is the difference between a reference
 * somebody can send to their bank and one they have to transcribe.
 */
function Reference({ value }: { value: string }) {
  return (
    <span className="mt-row block">
      <span className="nf-caption block text-[var(--nf-content-muted)]">Reference</span>
      <span className="nf-body-sm mt-3xs block font-mono font-semibold text-[var(--nf-content-primary)] [overflow-wrap:anywhere] [user-select:all] [font-variant-numeric:tabular-nums]">
        {value}
      </span>
    </span>
  );
}

function fieldError<T>(state: ActionResult<T>, field: string): string | undefined {
  return state.ok ? undefined : state.fieldErrors?.[field];
}

/**
 * A refusal, drawn as a refusal.
 *
 * It was `role="status" aria-live="polite"`, secondary ink on the glass fill
 * with a subtle border: a failed withdrawal, a rejected transfer and a declined
 * funding all rendered in exactly the styling a neutral tip would use, and a
 * screen reader was told about them in the same tone of voice as a hint. A
 * person who has just tried to move money could not tell a failure from a note.
 *
 * `components/ui/Field.tsx` already gets this right for a field error, and the
 * treatment here is the same one: assertive, rose ink on the error surface, a
 * cross, and a verdict line above the message so the first thing read is what
 * happened rather than why.
 */
function ErrorNotice<T>({ state }: { state: ActionResult<T> }) {
  if (state.ok || state.error.length === 0) return null;
  return (
    <div
      role="alert"
      className="nf-body-sm mt-row flex items-start gap-inline rounded-[var(--nf-radius-lg)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] bg-[var(--nf-state-error-surface)] p-row leading-relaxed text-[var(--nf-content-secondary)]"
    >
      <UiIcon
        name="close"
        size="xs"
        className="mt-3xs shrink-0 text-[var(--nf-state-error)]"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-[var(--nf-state-error)]">
          That did not go through
        </span>
        <span className="mt-3xs block">{state.error}</span>
      </span>
    </div>
  );
}
