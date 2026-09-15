import { formatDate, type Locale } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { TYPE } from "@/components/app/Screen";
import { KIND_ICON, KIND_LABEL } from "./kinds";
import type { WalletEntry } from "@/lib/wallet/types";
import { ReceiptActions } from "./ReceiptActions";

/**
 * The receipt for one movement of money.
 *
 * ---------------------------------------------------------------------------
 * WHY A RECEIPT IS NOT JUST THE STATEMENT ROW, BIGGER.
 *
 * The row in the history answers "what happened". A receipt answers "prove
 * it": it is the thing somebody screenshots and sends to a landlord, an agent
 * or their own bank when a payment is being disputed. That is the whole reason
 * Access, UBA and GTB all print one, and it is why every field here is the
 * ledger's own value rather than anything derived for display.
 *
 * So it carries, in this order, what a Nigerian bank receipt carries:
 *
 *   - the amount, big, with its direction stated in words and not only in a
 *     colour, because a screenshot loses colour to a monochrome printer and a
 *     minus sign is one pixel of difference on a phone;
 *   - the STATUS, unmissable, because a pending withdrawal that reads as
 *     settled is the single most expensive misreading this screen can cause;
 *   - the reference, in full and selectable, which is the only string support
 *     or the processor can trace it by;
 *   - the exact date AND time, to the minute;
 *   - who or what it was for.
 *
 * ---------------------------------------------------------------------------
 * THE PENDING LINE IS NOT DECORATION EITHER.
 *
 * A withdrawal sits PENDING until the bank confirms it, and during that window
 * the money has left the balance but has not arrived. Somebody reading this
 * receipt in that window is very often reading it BECAUSE the money has not
 * arrived. Saying so plainly, on the receipt, is the difference between a
 * person waiting and a person filing a dispute.
 */

export function Receipt({ entry, locale }: { entry: WalletEntry; locale: Locale }) {
  const credit = entry.direction === "credit";
  const settled = entry.status === "COMPLETED";

  const when = formatDate(new Date(entry.createdAt), locale, {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="nf-card overflow-hidden">
      {/*
        The head is the one place the brand appears, and it appears because a
        receipt travels: this image ends up in a WhatsApp thread with no
        surrounding app to say where it came from.
      */}
      <div className="flex items-center gap-inline border-b border-[var(--nf-border-subtle)] p-card">
        <span className="h-10 w-10 shrink-0">
          <BrandIcon name={KIND_ICON[entry.kind]} fill />
        </span>
        <div className="min-w-0 flex-1">
          <p className={TYPE.rowTitle}>{KIND_LABEL[entry.kind]}</p>
          <p className={TYPE.rowMeta}>Vallo wallet receipt</p>
        </div>
        <StatusPill tone={toneForStatus(entry.status)} className="shrink-0">
          {settled ? "Successful" : entry.status === "PENDING" ? "Pending" : entry.status}
        </StatusPill>
      </div>

      <div className="p-card text-center">
        {/* The direction in WORDS above the figure. A minus sign and a green
            tint are the only two things distinguishing money in from money out
            on the statement, and neither survives a screenshot read at arm's
            length by somebody anxious. */}
        <p className="nf-overline">{credit ? "Money in" : "Money out"}</p>
        <p className="mt-inline-tight">
          <Amount
            minorUnits={entry.amountMinor}
            locale={locale}
            showFraction
            className="nf-h1 tracking-tight text-[var(--nf-content-primary)]"
          />
        </p>

        {entry.status === "PENDING" && (
          <p className="nf-body-sm mx-auto mt-row max-w-[44ch] leading-relaxed text-[var(--nf-state-warning)]">
            This has left your balance and is with the bank. It is not confirmed
            yet, so keep this receipt until it settles.
          </p>
        )}
      </div>

      <dl className="border-t border-[var(--nf-border-subtle)] px-card pb-card">
        <Row label="Date" value={when} />
        {entry.note && <Row label="Details" value={entry.note} />}
        {entry.property && <Row label="Property" value={entry.property} />}
        <Row label="Status" value={settled ? "Successful" : entry.status} />
        {/*
          The reference, last and unabbreviated.

          `break-all` rather than a truncation: this is a 40-odd character
          string whose whole purpose is being read back to somebody, and an
          ellipsis in the middle of it makes the receipt useless for the one
          job it exists to do. `select-all` so a tap grabs the lot.
        */}
        <Row label="Reference" value={entry.reference} mono />
      </dl>

      <div className="border-t border-[var(--nf-border-subtle)] p-card">
        <ReceiptActions
          reference={entry.reference}
          summary={`${KIND_LABEL[entry.kind]} · ${when} · ${entry.reference}`}
        />
        <p className="nf-caption mt-row text-center">
          Generated by Vallo from your own ledger. Every movement in and out of
          your wallet is recorded permanently.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-inline-tight border-b border-[var(--nf-divider)] py-row last:border-b-0 sm:flex-row sm:items-baseline sm:gap-group">
      <dt className="nf-overline shrink-0 sm:w-32">{label}</dt>
      <dd
        className={`min-w-0 flex-1 text-[var(--nf-content-primary)] ${
          mono ? "nf-numeric select-all break-all text-[0.8125rem]" : "nf-body"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
