"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Locale } from "@naijafinds/i18n";
import { NIGERIAN_BANKS } from "@/lib/data/nigeria";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import {
  requestDeposit,
  requestTransfer,
  requestWithdrawal,
  type WalletActionField,
  type WalletActionResult,
} from "@/lib/wallet/actions";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { TextField, SelectField } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";

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
  icon: BrandIconName;
  title: string;
  hint: string;
}[] = [
  {
    key: "add",
    label: "Add money",
    icon: "wallet-secure",
    title: "Add money to your wallet",
    hint: "Fund your wallet by card or bank transfer once payments are connected.",
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
      {/*
        The action row.

        This was three identical cards, each carrying a 48px 3D icon tile above
        its label - visually heavy, and giving the same weight to putting money
        in as to taking it out. Reference 8 pairs one solid primary against a
        quiet secondary, text only, sharing a row: the hierarchy tells you what
        the screen is for before you read a word.

        Adding money is the primary. Withdraw and Transfer are the quiet pair.
      */}
      <div className="flex items-center gap-2" role="group" aria-label="Wallet actions">
        {PANELS.map((p) => (
          <Button
            key={p.key}
            variant={p.key === "add" ? "primary" : "secondary"}
            className="flex-1"
            aria-expanded={open === p.key}
            aria-controls={`nf-wallet-panel-${p.key}`}
            onClick={() => setOpen(open === p.key ? null : p.key)}
          >
            {p.label}
          </Button>
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
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="h-12 w-12 shrink-0">
                <BrandIcon name={active.icon} fill />
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
            <Button variant="ghost" size="sm" onClick={() => setOpen(null)}>
              Close
            </Button>
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
      <SelectField
        label="Bank"
        name="bankName"
        defaultValue=""
        error={state.fieldErrors?.bankName}
      >
        <option value="" disabled style={{ background: "var(--nf-surface-elevated)" }}>
          Choose your bank
        </option>
        {NIGERIAN_BANKS.map((b) => (
          <option key={b} value={b} style={{ background: "var(--nf-surface-elevated)" }}>
            {b}
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
        error={state.fieldErrors?.accountNumber}
      />
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
      <TextField
        label="Recipient"
        name="recipient"
        type="text"
        autoComplete="off"
        placeholder="Email or phone number"
        error={state.fieldErrors?.recipient}
      />
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
      <TextField
        label="Amount (₦)"
        name="amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="e.g. 5,000"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={err?.amount}
        clearable="Clear the amount"
        onClear={() => setValue("")}
      />
      {quickAmounts && (
        /* Presets, not a filter: `filter` semantics (aria-pressed) rather than
           `choice`, because a radio group with nothing selected leaves every
           chip at tabIndex -1 and unreachable by keyboard. */
        <ChipRow bleed={false} fadeEdges={false} snap={false} className="mt-2">
          {QUICK_AMOUNTS.map((a) => (
            <Chip key={a} size="sm" selected={value === a} onSelectedChange={() => setValue(a)}>
              ₦{a}
            </Chip>
          ))}
        </ChipRow>
      )}
    </div>
  );
}

function SubmitRow({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" variant="primary" full className="mt-3" loading={pending}>
      {label}
    </Button>
  );
}

function ResultNotice({ state, locale }: { state: WalletActionResult; locale: Locale }) {
  if (!state.message) return null;
  const amountMinor = typeof state.amountMinor === "number" ? state.amountMinor : null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] bg-[var(--nf-glass-fill)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
    >
      {amountMinor !== null && (
        <p className="mb-1 font-semibold text-[var(--nf-content-primary)]">
          <Amount minorUnits={amountMinor} locale={locale} showFraction />
        </p>
      )}
      <p>{state.message}</p>
    </div>
  );
}
