import Link from "next/link";
import { formatDate, getDictionary, type Locale } from "@vallo/i18n";
import { readActingForRecord } from "@/lib/compliance/beneficial-ownership-queries";
import {
  ACTING_FOR_KINDS,
  type ActingForKind,
  type ActingForMandate,
} from "@/lib/compliance/beneficial-ownership";
import { fill } from "./copy";

/**
 * SCUML item 17: ACTING FOR. Given a transaction, booking, rent payment or
 * listing, who the lister was acting for, the mandate, and its dates.
 *
 * Staff only: `acting_for` checks staff itself and writes an audit row for
 * every lookup. The principal's number is shown as its last four digits, which
 * is enough to match a call log and not enough to go round the lister.
 *
 * Three states besides the answer: not tied to a listing, could not read
 * (which never reads as "no mandate"), and the answer itself.
 */
export async function ActingFor({ kind, id, locale }: { kind: ActingForKind; id: string; locale: Locale }) {
  const copy = getDictionary(locale).complianceBeneficialOwnership.actingFor;
  const read = await readActingForRecord(kind, id);
  const day = (iso: string | null) =>
    iso ? formatDate(new Date(iso), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : copy.notGiven;

  return (
    <section
      className="nf-panel nf-panel--card nf-admin-card mt-md p-md sm:p-lg"
      data-testid="acting-for"
      data-state={read.state === "ok" ? read.acting : read.state}
      aria-labelledby={`acting-for-${id}`}
    >
      <h2 className="nf-h3" id={`acting-for-${id}`}>
        {copy.title} <span className="nf-caption text-[var(--nf-content-muted)]">{copy.item}</span>
      </h2>
      {read.state === "failed" ? (
        <p className="nf-body-sm mt-xs" role="alert" style={{ color: "var(--nf-state-error)" }}>
          {copy.failed}
        </p>
      ) : read.state === "no_listing" ? (
        <p className="nf-body-sm mt-xs">{copy.noListing}</p>
      ) : (
        <>
          <p className="nf-body-sm mt-xs font-medium">
            {read.acting === "themselves"
              ? copy.themselves
              : read.acting === "example"
                ? copy.example
                : read.acting === "principal"
                  ? fill(copy.principal, {
                      name: read.mandates.find((m) => m.status === "approved")?.principalName ?? "",
                    })
                  : copy.unconfirmed}
          </p>
          <p className="nf-body-sm mt-2xs text-[var(--nf-content-secondary)]">
            {copy.listing}:{" "}
            <Link className="text-[var(--nf-content-link)]" href={`/admin/listings/${read.listing.id}`}>
              {read.listing.reference ?? read.listing.title}
            </Link>
            {read.lister.name ? (
              <>
                {" · "}
                {copy.lister}:{" "}
                {read.lister.userId ? (
                  <Link className="text-[var(--nf-content-link)]" href={`/admin/people/${read.lister.userId}`}>
                    {read.lister.name}
                  </Link>
                ) : (
                  read.lister.name
                )}
              </>
            ) : null}
          </p>
          {read.acting !== "themselves" && read.acting !== "example" && (
            read.mandates.length === 0 ? (
              <p className="nf-body-sm mt-xs">{copy.noMandates}</p>
            ) : (
              <ul className="mt-sm grid gap-sm">
                {read.mandates.map((m) => (
                  <MandateLine key={m.id} m={m} copy={copy} day={day} />
                ))}
              </ul>
            )
          )}
        </>
      )}
    </section>
  );
}

type Copy = ReturnType<typeof getDictionary>["complianceBeneficialOwnership"]["actingFor"];

function MandateLine({ m, copy, day }: { m: ActingForMandate; copy: Copy; day: (iso: string | null) => string }) {
  const kind = copy.kinds[m.kind as keyof typeof copy.kinds] ?? m.kind;
  return (
    <li className="rounded-[var(--nf-container-radius)] border border-[var(--nf-border-subtle)] p-sm nf-body-sm" data-testid="acting-for-mandate">
      <p className="font-medium">
        {copy.principalLabel}: {m.principalName} (
        {m.principalPhoneLast4 ? fill(copy.phoneEnds, { last4: m.principalPhoneLast4 }) : copy.noPhone}) ·{" "}
        {copy.status[m.status]}
      </p>
      <p>
        {copy.relationship}: {m.relationship ? copy.relationships[m.relationship] : copy.notGiven} · {copy.kind}: {kind}
      </p>
      <p>
        {fill(copy.dates, { signed: day(m.signedOn), expires: m.expiresOn ? day(m.expiresOn) : copy.open })} ·{" "}
        {fill(copy.filed, { date: day(m.filedAt) })}
      </p>
      <p>
        {m.verifiedHow && m.verifiedAt
          ? fill(copy.verified, { how: copy.how[m.verifiedHow], date: day(m.verifiedAt), who: m.verifiedByName ?? copy.someone })
          : copy.notVerified}
      </p>
      <p>
        {m.idDocumentKind && m.idDocumentRef
          ? fill(copy.idDocument, { kind: copy.idKinds[m.idDocumentKind], ref: m.idDocumentRef })
          : copy.noIdDocument}
      </p>
      {m.status === "rejected" && m.rejectionReason && (
        <p style={{ color: "var(--nf-state-error)" }}>{fill(copy.refused, { reason: m.rejectionReason })}</p>
      )}
      <p className="nf-caption text-[var(--nf-content-muted)]">
        {m.retainedUntil ? fill(copy.retained, { date: day(m.retainedUntil) }) : copy.retainedOpen}
      </p>
    </li>
  );
}

/**
 * The lookup form: a GET, so the answer is a URL a colleague can open. Used on
 * the payments desk (transactions) and in the compliance lane (any record).
 */
export function ActingForLookup({
  action,
  kind,
  id,
  locale,
  extra = {},
}: {
  action: string;
  kind: ActingForKind;
  id: string;
  locale: Locale;
  /** Other query params the page needs kept, such as `tab`. */
  extra?: Record<string, string>;
}) {
  const copy = getDictionary(locale).complianceBeneficialOwnership.lane;
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-row" data-testid="acting-for-lookup">
      {Object.entries(extra).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label>
        <span className="nf-label">{copy.kindLabel}</span>
        <select name="actingKind" defaultValue={kind} className="nf-field mt-inline-tight">
          {ACTING_FOR_KINDS.map((k) => (
            <option key={k} value={k}>
              {copy.kinds[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 flex-1">
        <span className="nf-label">{copy.idLabel}</span>
        <input
          type="search"
          name="actingId"
          defaultValue={id}
          className="nf-field mt-inline-tight w-full"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <button type="submit" className="nf-chip nf-chip--active shrink-0">
        {copy.find}
      </button>
    </form>
  );
}
