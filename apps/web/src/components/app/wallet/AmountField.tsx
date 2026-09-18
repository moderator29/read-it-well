"use client";

import { formatMoney, type Locale } from "@vallo/i18n";
import { TextField } from "@/components/ui/Field";
import { Chip, ChipRow } from "@/components/ui/Chip";

/**
 * The naira amount field, with its presets.
 *
 * The presets are integer kobo like every other figure on this platform. The
 * LABEL is localised through `formatMoney`, which is what a reader sees. The
 * VALUE written into the field stays canonical digits, because
 * `parseNairaToKobo` accepts `5000` and `5,000` and nothing else: a locale
 * whose grouping separator is not a comma would otherwise produce a string
 * its own validator rejects, after tapping a button the app offered.
 *
 * Controlled, so the form that owns the amount can post it through more than
 * one action (a hosted checkout and a saved-card charge share one field).
 */
export const QUICK_AMOUNTS_KOBO = [500_000, 2_000_000, 5_000_000];

/** Canonical digits for the field: no separators, no symbol, always parseable. */
export function canonicalNaira(kobo: number): string {
  return String(Math.round(kobo / 100));
}

export function AmountField({
  value,
  onChange,
  error,
  quickAmounts,
  presets = QUICK_AMOUNTS_KOBO,
  locale,
  label = "Amount (₦)",
  placeholder,
  clearLabel = "Clear the amount",
}: {
  value: string;
  onChange: (next: string) => void;
  error?: string;
  quickAmounts?: boolean;
  /** Integer kobo. */
  presets?: readonly number[];
  /** Formats what the reader sees. Never what the field holds. */
  locale: Locale;
  label?: string;
  placeholder?: string;
  clearLabel?: string;
}) {
  return (
    <div>
      <TextField
        label={label}
        name="amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder ?? formatMoney(presets[0] ?? 500_000, locale)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        clearable={clearLabel}
        onClear={() => onChange("")}
      />
      {quickAmounts && (
        /* Presets, not a filter: `filter` semantics (aria-pressed) rather than
           `choice`, because a radio group with nothing selected leaves every
           chip at tabIndex -1 and unreachable by keyboard. */
        <ChipRow bleed={false} fadeEdges={false} snap={false} className="mt-inline">
          {presets.map((kobo) => {
            const canonical = canonicalNaira(kobo);
            return (
              <Chip
                key={kobo}
                size="sm"
                selected={value === canonical}
                onSelectedChange={() => onChange(canonical)}
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
