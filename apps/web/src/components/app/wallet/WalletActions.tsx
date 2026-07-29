"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Locale } from "@naijafinds/i18n";
import { NIGERIAN_BANKS } from "@/lib/data/nigeria";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import {
  requestDeposit,
  requestTransfer,
  requestWithdrawal,
  type WalletActionField,
  type WalletActionResult,
} from "@/lib/wallet/actions";
import { formatKoboExact } from "./money";

/**
 * Wallet action deck: Add money, Withdraw, Transfer.
 *
 * Three square glass tiles, icon over label, each toggling an inline
 * disclosure panel (aria-expanded and aria-controls wired, focus moved into
 * the panel on open) holding a real form that posts to the wallet server
 * actions. Amounts are typed in naira and converted to integer kobo on the
 * server, once, at the input boundary; the client never does money
 * arithmetic. Results render verbatim from the server, including the honest
 * outcome that no money moves until the payment environment is connected.
 */

type PanelKey = "add" | "withdraw" | "transfer";

const EMPTY: WalletActionResult = { ok: false };

const PANELS: {
  key: PanelKey;
  label: string;
  icon: IconName;
  ramp: "emerald" | "sky" | "cyan";
  title: string;
  hint: string;
}[] = [
  {
    key: "add",
    label: "Add money",
    icon: "wallet",
    ramp: "emerald",
    title: "Add money to your wallet",
    hint: "Fund your wallet by card or bank transfer once payments are connected.",
  },
  {
    key: "withdraw",
    label: "Withdraw",
    icon: "secure",
    ramp: "sky",
    title: "Withdraw to your bank",
    hint: "Send wallet funds to any Nigerian bank account in your name.",
  },
  {
    key: "transfer",
    label: "Transfer",
    icon: "profile",
    ramp: "cyan",
    title: "Transfer to another user",
    hint: "Send money to any RentMe user by email or phone number.",
  },
];

export function WalletActions({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState<PanelKey | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Move focus to the panel heading when a panel opens, so keyboard and screen
  // reader users land where the disclosure took them.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const active = PANELS.find((p) => p.key === open);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Wallet actions">
        {PANELS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-expanded={open === p.key}
            aria-controls={`nf-wallet-panel-${p.key}`}
            onClick={() => setOpen(open === p.key ? null : p.key)}
            className={`nf-card nf-card--interactive flex flex-col items-center gap-2 px-2 py-4 text-[0.8125rem] font-semibold text-[var(--nf-content-primary)] ${
              open === p.key
                ? "shadow-[0_0_24px_rgb(0_102_255_/_0.45),inset_0_0_16px_rgb(0_102_255_/_0.12)]"
                : ""
            }`}
          >
            <span className="h-7 w-7">
              <Icon name={p.icon} fill ramp={p.ramp} />
            </span>
            {p.label}
          </button>
        ))}
      </div>

      {active && (
        <div
          id={`nf-wallet-panel-${active.key}`}
          ref={panelRef}
          tabIndex={-1}
          role="region"
          aria-labelledby={`nf-wallet-panel-${active.key}-title`}
          className="nf-card mt-3 p-4 outline-none sm:p-5"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0">
                <Icon name={active.icon} fill ramp={active.ramp} />
              </span>
              <div>
                <h2
                  id={`nf-wallet-panel-${active.key}-title`}
                  className="text-[0.9375rem] font-semibold"
                >
                  {active.title}
                </h2>
                <p className="mt-0.5 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
                  {active.hint}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="nf-btn nf-btn--ghost px-3 py-1.5 text-[0.8125rem]"
            >
              Close
            </button>
          </div>

          {active.key === "add" && <AddMoneyForm locale={locale} />}
          {active.key === "withdraw" && <WithdrawForm locale={locale} />}
          {active.key === "transfer" && <TransferForm locale={locale} />}
        </div>
      )}
    </div>
  );
}

function AddMoneyForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(requestDeposit, EMPTY);
  return (
    <form action={formAction} noValidate>
      <AmountField err={state.fieldErrors} quickAmounts />
      <SubmitRow pending={pending} label="Add money" />
      <ResultNotice state={state} locale={locale} />
    </form>
  );
}

function WithdrawForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(requestWithdrawal, EMPTY);
  return (
    <form action={formAction} noValidate className="space-y-3">
      <AmountField err={state.fieldErrors} />
      <div>
        <label htmlFor="nf-wallet-bank" className="nf-label">
          Bank
        </label>
        <select
          id="nf-wallet-bank"
          name="bankName"
          defaultValue=""
          aria-invalid={state.fieldErrors?.bankName ? true : undefined}
          className="nf-field"
        >
          <option value="" disabled style={{ background: "var(--nf-surface-elevated)" }}>
            Choose your bank
          </option>
          {NIGERIAN_BANKS.map((b) => (
            <option key={b} value={b} style={{ background: "var(--nf-surface-elevated)" }}>
              {b}
            </option>
          ))}
        </select>
        <FieldError message={state.fieldErrors?.bankName} />
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
          aria-invalid={state.fieldErrors?.accountNumber ? true : undefined}
          className="nf-field"
        />
        <FieldError message={state.fieldErrors?.accountNumber} />
      </div>
      <SubmitRow pending={pending} label="Request withdrawal" />
      <ResultNotice state={state} locale={locale} />
    </form>
  );
}

function TransferForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(requestTransfer, EMPTY);
  return (
    <form action={formAction} noValidate className="space-y-3">
      <AmountField err={state.fieldErrors} />
      <div>
        <label htmlFor="nf-wallet-recipient" className="nf-label">
          Recipient
        </label>
        <input
          id="nf-wallet-recipient"
          name="recipient"
          type="text"
          autoComplete="off"
          placeholder="Email or phone number"
          aria-invalid={state.fieldErrors?.recipient ? true : undefined}
          className="nf-field"
        />
        <FieldError message={state.fieldErrors?.recipient} />
      </div>
      <SubmitRow pending={pending} label="Send transfer" />
      <ResultNotice state={state} locale={locale} />
    </form>
  );
}

/** Naira presets the chips can type into the field. Display strings only. */
const QUICK_AMOUNTS = ["5,000", "20,000", "50,000"];

function AmountField({
  err,
  quickAmounts,
}: {
  err?: Partial<Record<WalletActionField, string>>;
  quickAmounts?: boolean;
}) {
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
        aria-invalid={err?.amount ? true : undefined}
        className="nf-field"
      />
      {quickAmounts && (
        <div className="mt-2 flex gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setValue(a)}
              aria-pressed={value === a}
              className={`nf-chip ${value === a ? "nf-chip--active" : ""}`}
            >
              ₦{a}
            </button>
          ))}
        </div>
      )}
      <FieldError message={err?.amount} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-[0.75rem] text-[var(--nf-state-error)]">
      {message}
    </p>
  );
}

function SubmitRow({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="nf-btn nf-btn--primary mt-3 w-full py-3 text-[0.875rem]"
    >
      {pending ? "Checking your request" : label}
    </button>
  );
}

function ResultNotice({ state, locale }: { state: WalletActionResult; locale: Locale }) {
  if (!state.message) return null;
  const amount =
    typeof state.amountMinor === "number" ? formatKoboExact(state.amountMinor, locale) : null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] bg-[var(--nf-glass-fill)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
    >
      {amount && (
        <p className="mb-1 font-semibold text-[var(--nf-content-primary)]">
          {amount.whole}
          {amount.kobo}
        </p>
      )}
      <p>{state.message}</p>
    </div>
  );
}
