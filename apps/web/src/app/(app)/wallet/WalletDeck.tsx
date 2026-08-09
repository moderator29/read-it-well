"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Odometer } from "@/components/site/Odometer";
import { formatKoboExact } from "@/components/app/wallet/money";
import { Amount } from "@/components/ui/Amount";
import type { ActionResult } from "@/lib/actions/envelope";
import {
  fundWallet,
  transferToUser,
  withdraw,
  type FundStart,
  type TransferReceipt,
  type WithdrawReceipt,
} from "@/lib/wallet/actions";
import { WALLET_BANKS } from "@/lib/wallet/banks";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField, SelectField } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";

/**
 * Wallet action deck: Add money, Withdraw, Transfer.
 *
 * The same three glass tiles as always, each opening a full-page drawer
 * (Master Rule: full-page drawers, never partial) holding a real form wired
 * to the wallet server actions. Amounts are typed in naira and become integer
 * kobo on the server, once, inside the schema; the client never does money
 * arithmetic. Funding hands the browser to Paystack's hosted checkout;
 * withdrawals and transfers show their receipt and re-read the statement so
 * the balance card and history reflect the new truth immediately.
 */

type DeckKey = "fund" | "withdraw" | "transfer";

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
    icon: "wallet-secure",
    title: "Add money to your wallet",
    hint: "Fund your wallet by card or bank transfer through a secure Paystack window.",
  },
  {
    key: "withdraw",
    label: "Withdraw",
    icon: "shield-lock",
    title: "Withdraw to your bank",
    hint: "Send wallet funds to any Nigerian bank account in your name.",
  },
  {
    key: "transfer",
    label: "Transfer",
    icon: "user-check",
    title: "Transfer to another user",
    hint: "Send money to another RentMe user by email. It lands instantly.",
  },
];

export function WalletDeck({
  locale,
  balanceMinor,
  live,
}: {
  locale: Locale;
  balanceMinor: number;
  live: boolean;
}) {
  const [open, setOpen] = useState<DeckKey | null>(null);

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

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {TILES.slice(1).map((tile) => (
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

      {TILES.map((tile) => (
        <WalletDrawer
          key={tile.key}
          open={open === tile.key}
          title={tile.title}
          hint={tile.hint}
          icon={tile.icon}
          onClose={() => setOpen(null)}
        >
          {tile.key === "fund" && <FundForm locale={locale} />}
          {tile.key === "withdraw" && (
            <WithdrawForm locale={locale} balanceMinor={balanceMinor} live={live} />
          )}
          {tile.key === "transfer" && (
            <TransferForm locale={locale} balanceMinor={balanceMinor} live={live} />
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
  icon,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  hint: string;
  icon: BrandIconName;
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
        <div className="mb-5 flex items-start justify-between gap-4">
          <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            {hint}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="h-13 w-13">
              <BrandIcon name={icon} fill />
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="nf-icon-btn h-10 w-10"
            >
              <UiIcon name="close" size={20} />
            </button>
          </div>
        </div>

        <div className="nf-card p-4 sm:p-5">{children}</div>
      </div>
    </Sheet>
  );
}

/* ----------------------------------------------------------------- forms */

const FUND_INITIAL: ActionResult<FundStart | null> = { ok: false, error: "" };
const WITHDRAW_INITIAL: ActionResult<WithdrawReceipt | null> = { ok: false, error: "" };
const TRANSFER_INITIAL: ActionResult<TransferReceipt | null> = { ok: false, error: "" };

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
      <div role="status" aria-live="polite" className="py-4 text-center">
        <p className="text-[0.9375rem] font-semibold">Opening the secure payment window</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          You are on your way to Paystack to complete the payment. Your wallet updates the
          moment it lands.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      <AmountField error={fieldError(state, "amount")} quickAmounts locale={locale} />
      <Button type="submit" variant="primary" full className="mt-3" loading={pending}>
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
}: {
  locale: Locale;
  balanceMinor: number;
  live: boolean;
}) {
  const [state, formAction, pending] = useActionState(withdraw, WITHDRAW_INITIAL);
  const router = useRouter();

  // A successful hold changes the statement: re-read it behind the drawer.
  useEffect(() => {
    if (state.ok && state.data) router.refresh();
  }, [state, router]);

  if (state.ok && state.data) {
    return (
      <div role="status" aria-live="polite" className="py-2 text-center">
        <p>
          <Amount
            minorUnits={state.data.amountMinor}
            locale={locale}
            showFraction
            className="text-[1.4rem] font-bold tracking-tight"
          />
        </p>
        <p className="mt-1 text-[0.9375rem] font-semibold">
          On its way to {state.data.bankName} ****{state.data.accountLast4}
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          The withdrawal shows as pending until the bank confirms it, then your history
          updates on its own.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-3">
      {live && <BalanceLine balanceMinor={balanceMinor} locale={locale} />}
      <AmountField error={fieldError(state, "amount")} locale={locale} />
      <SelectField
        label="Bank"
        name="bankCode"
        defaultValue=""
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
        error={fieldError(state, "accountNumber")}
      />
      <TextField
        label="Name on the account"
        name="accountName"
        type="text"
        autoComplete="name"
        placeholder="As it appears at your bank"
        error={fieldError(state, "accountName")}
      />
      <Button type="submit" variant="primary" full className="mt-1" loading={pending}>
        Withdraw
      </Button>
      <ErrorNotice state={state} />
    </form>
  );
}

function TransferForm({
  locale,
  balanceMinor,
  live,
}: {
  locale: Locale;
  balanceMinor: number;
  live: boolean;
}) {
  const [state, formAction, pending] = useActionState(transferToUser, TRANSFER_INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.data) router.refresh();
  }, [state, router]);

  if (state.ok && state.data) {
    return (
      <div role="status" aria-live="polite" className="py-2 text-center">
        <p>
          <Amount
            minorUnits={state.data.amountMinor}
            locale={locale}
            showFraction
            className="text-[1.4rem] font-bold tracking-tight"
          />
        </p>
        <p className="mt-1 text-[0.9375rem] font-semibold">
          Sent to {state.data.recipientName}
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Their wallet has it already, and both sides of the movement are in your history.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-3">
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
      <Button type="submit" variant="primary" full className="mt-1" loading={pending}>
        Send transfer
      </Button>
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
        <ChipRow bleed={false} fadeEdges={false} snap={false} className="mt-2">
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
   * Was border-white/10 on bg-white/[0.04]. A white wash reads as a subtle
   * inset on a dark ground and as nothing at all on a light one, so in
   * daylight this line lost its container and floated loose in the form. The
   * inset surface and the subtle border are the two tokens that mean this in
   * both themes.
   */
  return (
    <p className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-3 py-2 text-[0.8125rem] text-[var(--nf-content-muted)]">
      Available balance{" "}
      <span className="nf-numeric font-semibold text-[var(--nf-content-primary)]">
        {"₦"}
        <Odometer value={wholeNaira} locale={locale} suffix={amount.kobo} />
      </span>
    </p>
  );
}

function fieldError<T>(state: ActionResult<T>, field: string): string | undefined {
  return state.ok ? undefined : state.fieldErrors?.[field];
}

function ErrorNotice<T>({ state }: { state: ActionResult<T> }) {
  if (state.ok || state.error.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] bg-[var(--nf-glass-fill)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
    >
      <p>{state.error}</p>
    </div>
  );
}
