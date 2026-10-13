import { formatDate, formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import type { FeeAcceptanceRead } from "@/lib/admin/desk-reads/fee-acceptance-read";
import { fill } from "../../_components/copy";
import { Panel } from "../../_review/parts";

/**
 * THE FEE TERMS THE LISTER ACCEPTED, on the review desk.
 *
 * `current_fee_acceptance` returns the lister's latest acceptance for this
 * listing: when, which terms version, and the figures they were shown. A
 * reviewer who is asked "did the lister agree to this fee?" can answer from
 * here instead of from SQL. It decides nothing.
 */
export function FeeAcceptancePanel({ read, locale }: { read: FeeAcceptanceRead; locale: Locale }) {
  if (read.state === "forbidden") return null;
  const c = getDictionary(locale).adminCoverage.feeAcceptance;
  const when = (iso: string) =>
    formatDate(new Date(iso), locale, { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

  if (read.state === "unavailable") {
    return (
      <Panel title={c.title}>
        <p className="nf-rv-msg" role="alert">
          {c.unavailable}
        </p>
      </Panel>
    );
  }
  const a = read.acceptance;
  if (!a) {
    return (
      <Panel title={c.title}>
        <p className="nf-rv-msg" data-testid="fee-acceptance-none">
          {c.none}
        </p>
      </Panel>
    );
  }
  return (
    <Panel title={c.title}>
      <p className="nf-rv-msg" data-testid="fee-acceptance">
        {fill(c.acceptedOn, { when: when(a.acceptedAt) })} · {fill(c.termsVersion, { version: a.termsVersion })}
        {a.policyVersion ? ` · ${fill(c.policyVersion, { version: a.policyVersion })}` : ""}
      </p>
      <dl className="mt-xs grid gap-2xs">
        <Line label={c.rent} value={formatMoney(a.rentMinor, locale)} />
        <Line label={c.commission} value={`${a.commissionBps / 100}%`} />
        <Line label={c.protection} value={`${a.protectionBps / 100}%`} />
        <Line label={c.fees} value={fill(c.range, { low: formatMoney(a.feeLowMinor, locale), high: formatMoney(a.feeHighMinor, locale) })} />
        <Line label={c.receive} value={fill(c.range, { low: formatMoney(a.receiveLowMinor, locale), high: formatMoney(a.receiveHighMinor, locale) })} />
      </dl>
    </Panel>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-inline">
      <dt className="nf-rv-msg">{label}</dt>
      <dd className="nf-rv-msg nf-numeric font-semibold">{value}</dd>
    </div>
  );
}
