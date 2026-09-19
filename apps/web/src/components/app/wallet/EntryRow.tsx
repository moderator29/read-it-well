import Link from "next/link";
import { formatDate, type Locale } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Amount } from "@/components/ui/Amount";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { TYPE } from "@/components/app/Screen";
import type { WalletEntry } from "@/lib/wallet/types";
import { KIND_ICON, type WalletWords } from "./kinds";

/**
 * One ledger movement as a row, the way the governing wallet render draws
 * it: the mark on its circle, the kind of movement, who or what it was with,
 * the date and the time, the signed amount, and the state as a word.
 *
 * Shared by the recent strip on the wallet home and the full statement, so
 * the same movement is drawn identically on both. Every value is the
 * ledger's own: the note is the counterparty the action wrote, the property
 * is resolved from the reference, the time is to the minute in Lagos.
 *
 * The state is always said in a word. COMPLETED takes the emerald
 * "Completed" badge the render shows on every row; anything else takes the
 * platform's one status vocabulary through `StatusPill`, so a pending
 * withdrawal is never mistaken for settled money.
 */
export function EntryRow({
  entry,
  locale,
  words,
  completedLabel,
}: {
  entry: WalletEntry;
  locale: Locale;
  words: WalletWords;
  completedLabel: string;
}) {
  const credit = entry.direction === "credit";
  const when = new Date(entry.createdAt);
  const day = formatDate(when, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
  const time = formatDate(when, locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
  const counterparty = entry.note ?? entry.property;

  return (
    <li>
      <Link href={`/wallet/transactions/${entry.id}`} className="nf-tx-row nf-tap">
        <span className="nf-tx-tile" aria-hidden="true">
          <BrandIcon name={KIND_ICON[entry.kind]} fill />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block ${TYPE.rowTitle}`}>{words.kind[entry.kind]}</span>
          {/* Wrapped, not truncated. "Transfer to Tunde Adebayo" became
              "Transfer to Tunde ..." at 390px, which cuts the one fact the
              row exists to carry: who the money went to. */}
          {counterparty && (
            <span className="nf-body-sm mt-3xs block text-[var(--nf-content-secondary)]">
              {counterparty}
            </span>
          )}
          <span className="nf-caption mt-3xs block">
            {day}
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {time}
          </span>
        </span>
        <span className="nf-numeric flex shrink-0 flex-col items-end gap-inline-tight text-right leading-tight">
          <span
            className={`nf-body font-semibold ${
              credit ? "text-[var(--nf-state-success)]" : "text-[var(--nf-content-primary)]"
            }`}
          >
            {credit ? "+ " : "- "}
            <Amount
              minorUnits={entry.amountMinor}
              locale={locale}
              showFraction
              secondaryClassName="text-[0.72em] font-medium opacity-70"
            />
          </span>
          {entry.status === "COMPLETED" ? (
            <StatusPill tone="success">{completedLabel}</StatusPill>
          ) : (
            <StatusPill tone={toneForStatus(entry.status)}>{words.status[entry.status]}</StatusPill>
          )}
        </span>
      </Link>
    </li>
  );
}
