"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import { NIGERIAN_BANKS } from "@/lib/data/nigeria";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import {
  lookupAccountName,
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

        AND THE QUIET PAIR IS NOW ACTUALLY QUIET. `secondary` is a filled
        surface with its own border, so the row read as three solid buttons in
        three shades rather than as one action and two alternatives: the
        hierarchy the note above describes was stated in the code and not
        visible on the screen. `ghost` draws the label and nothing else, which
        is what "quiet" was always supposed to mean, and it lets the one filled
        control in the row carry all of the weight.
      */}
      <div className="flex items-center gap-2" role="group" aria-label="Wallet actions">
        {PANELS.map((p) => (
          <Button
            key={p.key}
            variant={p.key === "add" ? "primary" : "ghost"}
            /* A hairline on the two ghosts, and nothing behind them. Fully
               borderless in a row beside a filled control reads as two words
               floating next to a button rather than as three peers; the rule
               is enough to say "this is pressable" without putting a surface
               back. */
            className={
              p.key === "add"
                ? "flex-1"
                : "flex-1 border border-[var(--nf-border-subtle)]"
            }
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
      <AmountField err={state.fieldErrors} quickAmounts locale={locale} />
      <SubmitRow pending={pending} label="Add money" />
      <ResultNotice state={state} locale={locale} />
    </form>
  );
}

function WithdrawForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(requestWithdrawal, EMPTY);

  /*
   * THE NAME ON THE ACCOUNT, SHOWN BEFORE THE TAP.
   *
   * The withdrawal already resolves this against the bank and refuses on a
   * mismatch, so the money was never at risk. What it could not do is tell
   * somebody EARLY: a wrong digit came back as a rejection after the sheet was
   * full and the amount was in. This asks the same question as soon as a bank
   * and ten digits exist, and puts the answer under the field.
   *
   * `null` is "we have not asked or the pair is incomplete", which draws
   * nothing at all. A form that says "checking" over every keystroke, or that
   * shows an error while somebody is halfway through typing an account number,
   * is worse than one that waits.
   */
  const [holder, setHolder] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "found"; name: string }
    | { state: "missing"; reason: string }
  >({ state: "idle" });
  const [bankName, setBankName] = useState("");

  const [accountNumber, setAccountNumber] = useState("");

  /* The request that was in flight when the inputs last changed. A slow reply
     for an account number the reader has already edited must not overwrite the
     answer for the one now on screen. */
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
      else if (result.reason.length > 0) setHolder({ state: "missing", reason: result.reason });
      else setHolder({ state: "idle" });
    });
  };

  return (
    <form action={formAction} noValidate className="space-y-3">
      <AmountField err={state.fieldErrors} locale={locale} />
      <SelectField
        label="Bank"
        name="bankName"
        defaultValue=""
        onChange={(event) => {
          setBankName(event.target.value);
          check(event.target.value, accountNumber);
        }}
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
        onChange={(event) => {
          setAccountNumber(event.target.value);
          check(bankName, event.target.value);
        }}
        error={state.fieldErrors?.accountNumber}
      />

      {/*
        The answer, in the one place it is useful. A found name is stated
        plainly rather than dressed as a success banner: it is a fact about the
        account, and the reader's job is to read it and recognise it. It is
        never editable, because it is the bank's answer and not ours.
      */}
      {holder.state === "checking" ? (
        <p className="nf-body-sm text-[var(--nf-content-muted)]">Checking the account…</p>
      ) : holder.state === "found" ? (
        <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">
          {holder.name}
        </p>
      ) : holder.state === "missing" ? (
        <p className="nf-body-sm text-[var(--nf-state-warning)]">{holder.reason}</p>
      ) : null}

      <SubmitRow pending={pending} label="Request withdrawal" />
      <ResultNotice state={state} locale={locale} />
    </form>
  );
}

function TransferForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(requestTransfer, EMPTY);
  return (
    <form action={formAction} noValidate className="space-y-3">
      <AmountField err={state.fieldErrors} locale={locale} />
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
/**
 * The presets, in integer kobo, matching `WalletDeck`.
 *
 * They were three display strings that were both the label and the value typed
 * into the field, so the chips read as English numerals to a reader in any of
 * the four languages. The label is localised through `formatMoney`; the value
 * stays canonical digits, because `parseNairaToKobo` accepts `5000` and
 * `5,000` and nothing else, and a locale whose grouping separator is not a
 * comma would produce a string its own validator rejects.
 */
const QUICK_AMOUNTS_KOBO = [500_000, 2_000_000, 5_000_000];

/** Canonical digits for the field: no separators, no symbol, always parseable. */
function canonicalNaira(kobo: number): string {
  return String(Math.round(kobo / 100));
}

function AmountField({
  err,
  quickAmounts,
  locale,
}: {
  err?: Partial<Record<WalletActionField, string>>;
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
        /* The smallest preset, written the way the reader's locale writes
           money, so the example and the chips below it agree. */
        placeholder={formatMoney(QUICK_AMOUNTS_KOBO[0] ?? 500_000, locale)}
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
