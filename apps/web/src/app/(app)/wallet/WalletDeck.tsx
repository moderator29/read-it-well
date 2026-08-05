"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@naijafinds/i18n";
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
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Wallet actions">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(tile.key)}
            className="nf-card nf-card--interactive flex flex-col items-center gap-2 px-2 py-4 text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]"
          >
            <span className="h-12 w-12">
              <BrandIcon name={tile.icon} fill />
            </span>
            {tile.label}
          </button>
        ))}
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
              <UiIcon name="close" size={18} />
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
      <AmountField error={fieldError(state, "amount")} quickAmounts />
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
      <AmountField error={fieldError(state, "amount")} />
      <div>
        <label htmlFor="nf-wallet-bank" className="nf-label">
          Bank
        </label>
        <select
          id="nf-wallet-bank"
          name="bankCode"
          defaultValue=""
          aria-invalid={fieldError(state, "bankCode") ? true : undefined}
          className="nf-field"
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
        </select>
        <FieldMessage message={fieldError(state, "bankCode")} />
      </div>
      <div>
        <label htmlFor="nf-wallet-account" className="nf-label">
          Account number
        </label>
        <input
          id="nf-wallet-account"
          name="accountNumber"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="10-digit account number"
          aria-invalid={fieldError(state, "accountNumber") ? true : undefined}
          className="nf-field"
        />
        <FieldMessage message={fieldError(state, "accountNumber")} />
      </div>
      <div>
        <label htmlFor="nf-wallet-account-name" className="nf-label">
          Name on the account
        </label>
        <input
          id="nf-wallet-account-name"
          name="accountName"
          type="text"
          autoComplete="name"
          placeholder="As it appears at your bank"
          aria-invalid={fieldError(state, "accountName") ? true : undefined}
          className="nf-field"
        />
        <FieldMessage message={fieldError(state, "accountName")} />
      </div>
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
      <div>
        <label htmlFor="nf-wallet-recipient" className="nf-label">
          Recipient email
        </label>
        <input
          id="nf-wallet-recipient"
          name="recipientEmail"
          type="email"
          autoComplete="off"
          placeholder="name@example.com"
          aria-invalid={fieldError(state, "recipientEmail") ? true : undefined}
          className="nf-field"
        />
        <FieldMessage message={fieldError(state, "recipientEmail")} />
      </div>
      <AmountField error={fieldError(state, "amount")} />
      <div>
        <label htmlFor="nf-wallet-note" className="nf-label">
          Note (optional)
        </label>
        <input
          id="nf-wallet-note"
          name="note"
          type="text"
          autoComplete="off"
          maxLength={140}
          placeholder="What is it for?"
          aria-invalid={fieldError(state, "note") ? true : undefined}
          className="nf-field"
        />
        <FieldMessage message={fieldError(state, "note")} />
      </div>
      <Button type="submit" variant="primary" full className="mt-1" loading={pending}>
        Send transfer
      </Button>
      <ErrorNotice state={state} />
    </form>
  );
}

/* ------------------------------------------------------------ small parts */

/** Naira presets the chips can type into the field. Display strings only. */
const QUICK_AMOUNTS = ["5,000", "20,000", "50,000"];

function AmountField({ error, quickAmounts }: { error?: string; quickAmounts?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <div>
      <label htmlFor="nf-wallet-amount" className="nf-label">
        Amount (₦)
      </label>
      <input
        id="nf-wallet-amount"
        name="amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="e.g. 5,000"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        className="nf-field"
      />
      {quickAmounts && (
        <div className="mt-2 flex gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setValue(amount)}
              aria-pressed={value === amount}
              className={`nf-chip ${value === amount ? "nf-chip--active" : ""}`}
            >
              ₦{amount}
            </button>
          ))}
        </div>
      )}
      <FieldMessage message={error} />
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
  return (
    <p className="rounded-[var(--nf-radius-md)] border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.78rem] text-[var(--nf-content-muted)]">
      Available balance{" "}
      <span className="nf-numeric font-semibold text-[var(--nf-content-primary)]">
        {"₦"}
        <Odometer value={wholeNaira} suffix={amount.kobo} />
      </span>
    </p>
  );
}

function FieldMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-[0.75rem] text-[var(--nf-state-error)]">
      {message}
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
