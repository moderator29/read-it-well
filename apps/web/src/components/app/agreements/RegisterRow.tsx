import Link from "next/link";
import { formatDate, formatMoney, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { AgreementSummary } from "@/lib/agreements/queries";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AGREEMENT_STATUS_LABEL, agreementStatusTone } from "./status";
import { versionIndex } from "./version-register";
import "./agreements.css";

type Copy = Dictionary["experienceMoney"]["agreements"];

/**
 * M2: ONE AGREEMENT IN THE REGISTER, DRAWN AS A DOCUMENT.
 *
 * The row keeps everything the list said before (the place, the kind, the
 * total, your side, the status as word, shape and colour) and gains what
 * makes it a register of documents rather than a list of links: a small
 * paper sheet, one sheet per kept version up to three, and the version the
 * terms stand at with how many earlier versions are kept and when the record
 * last moved.
 *
 * `kept` is B9's kept version numbers for this agreement, or null when the
 * read failed or the reader is not a party (staff): then no version line is
 * drawn rather than a guessed one, and the stack is a single sheet.
 */
export function RegisterRow({
  row,
  kept,
  locale,
  copy,
}: {
  row: AgreementSummary;
  kept: readonly number[] | null;
  locale: Locale;
  copy: Copy;
}) {
  const index = kept ? versionIndex(kept) : null;
  const sheets = Math.min(3, Math.max(1, kept?.length ?? 1));
  const updated = new Date(row.updatedAt);
  const updatedLine = Number.isNaN(updated.getTime()) ? null : copy.updated.replace("{date}", formatDate(updated, locale));
  const versionLine = index
    ? [
        copy.version.replace("{n}", String(index.current)),
        index.earlierKept > 0 ? plural(index.earlierKept, copy.earlier, locale) : null,
        updatedLine,
      ]
        .filter(Boolean)
        .join(" · ")
    : updatedLine;
  return (
    <Link
      href={`/agreements/${row.id}`}
      className="nf-card nf-card--interactive nf-agr-row p-card"
      data-status={row.status}
      data-testid={`agreement-row-${row.id}`}
    >
      <span className="nf-agr-stack" aria-hidden="true">
        {Array.from({ length: sheets }, (_, i) => sheets - 1 - i).map((depth) => (
          <span key={depth} className="nf-agr-stack__sheet" data-depth={depth} />
        ))}
      </span>
      <span className="min-w-0">
        <span className="nf-agr-row__title block">{row.listingTitle}</span>
        <span className="nf-agr-row__meta block">
          {row.kind === "rent" ? "Rental" : "Stay"} · <span className="nf-numeric">{formatMoney(row.amountMinor, locale)}</span>
          {row.role === null
            ? ""
            : ` · you are the ${row.role === "renter" ? (row.kind === "rent" ? "renter" : "guest") : "owner or agent"}`}
        </span>
        {versionLine ? <span className="nf-agr-row__version block">{versionLine}</span> : null}
        {/* The status is its own pill (word, shape and colour together,
            never colour alone), so the register can be scanned for the one
            that needs you. */}
        <StatusPill tone={agreementStatusTone(row.status)} size="sm" className="mt-xs">
          {AGREEMENT_STATUS_LABEL[row.status] ?? row.status}
        </StatusPill>
      </span>
      <UiIcon name="chevron-right" size={18} className="nf-agr-row__chevron" />
    </Link>
  );
}
