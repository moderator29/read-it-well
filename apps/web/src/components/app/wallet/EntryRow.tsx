import Link from "next/link";
import { formatDate, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Amount } from "@/components/ui/Amount";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import type { WalletEntry } from "@/lib/wallet/types";
import { KIND_ICON, type WalletWords } from "./kinds";
import { counterpartyLine } from "./counterparty";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";

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
  const counterparty = counterpartyLine(entry.note ?? entry.property);

  return (
    <li>
      <Link href={`/wallet/transactions/${entry.id}`} className="nf-tx-row nf-tap">
        <IconPlate size="sm" className="nf-tx-tile">
          <UiIcon name={KIND_ICON[entry.kind]} size={ICON_PLATE_GLYPH.sm} />
        </IconPlate>
        <span className="min-w-0 flex-1">
          <span className="nf-tx-row__title">{words.kind[entry.kind]}</span>
          {/* Wrapped, not truncated: the counterparty is the one fact the
              row exists to carry, and a real name is often longer than the
              render's. Blue, as the render sets it. */}
          {counterparty && <span className="nf-tx-row__party">{counterparty}</span>}
          <span className="nf-tx-row__when">
            {day}
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {time}
          </span>
        </span>
        <span className="nf-numeric flex shrink-0 flex-col items-end gap-inline-tight text-right">
          <span className={`nf-tx-row__amount ${credit ? "nf-tx-row__amount--in" : ""}`}>
            {credit ? "+ " : "- "}
            <Amount
              minorUnits={entry.amountMinor}
              locale={locale}
              showFraction
              secondaryClassName="nf-money-kobo"
            />
          </span>
          {entry.status === "COMPLETED" ? (
            <StatusPill tone="success" className="nf-tx-badge text-[length:0.6875rem]!">
              {completedLabel}
            </StatusPill>
          ) : (
            <StatusPill tone={toneForStatus(entry.status)} className="nf-tx-badge text-[length:0.6875rem]!">
              {words.status[entry.status]}
            </StatusPill>
          )}
        </span>
      </Link>
    </li>
  );
}
