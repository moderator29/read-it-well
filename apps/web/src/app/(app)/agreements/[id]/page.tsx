import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readAgreement } from "@/lib/agreements/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { Section, TYPE } from "@/components/app/Screen";
import { AGREEMENT_STATUS_LABEL, CLAIM_STATUS_LABEL } from "@/components/app/agreements/status";
import { AmendTerms, CancelAgreement, ClaimForm, ConfirmTerms } from "@/components/app/agreements/AgreementControls";
import {
  GUARANTEE_SCOPE,
  GUARANTEE_SENTENCE,
  NO_CUSTODY_SENTENCE,
  NO_INSPECTION_FEE,
  OFF_PLATFORM_SENTENCE,
} from "@/lib/money/copy";

export const metadata: Metadata = { title: "Agreement" };
export const dynamic = "force-dynamic";

const LINES: { key: string; label: string }[] = [
  { key: "rent_minor", label: "Rent" },
  { key: "caution_minor", label: "Caution deposit" },
  { key: "service_minor", label: "Service charge" },
  { key: "agency_minor", label: "Agency fee" },
  { key: "legal_minor", label: "Legal fee" },
  { key: "agreement_fee_minor", label: "Agreement fee" },
  { key: "price_per_night_minor", label: "Per night" },
  { key: "cleaning_fee_minor", label: "Cleaning" },
];

function str(terms: Record<string, unknown>, key: string): string | null {
  const v = terms[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function num(terms: Record<string, unknown>, key: string): number | null {
  const v = terms[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * ONE AGREEMENT: exactly what both sides committed to (Track A).
 *
 * The terms are drawn from the listing's own figures and the inspection
 * report, never typed as money by anybody. Both parties confirm the same
 * version; changing anything makes the version move and every confirmation
 * lapse. Vallo reviews the confirmed version before payment opens. Once paid,
 * the Vallo Guarantee is open for claims in the window after move-in or
 * check-in.
 */
export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const a = await readAgreement(id);
  if (!a) notFound();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const now = requestTime();
  const windowOpen =
    a.claimWindow !== null && now >= Date.parse(a.claimWindow.opens) && now < Date.parse(a.claimWindow.closes);
  const claimedApproved = a.claims.reduce((sum, c) => sum + (c.approvedMinor ?? 0), 0);
  const cap = Math.max(0, a.amountMinor - claimedApproved);
  const payHref = a.kind === "rent" && a.inspectionId ? `/rent/pay/${a.inspectionId}` : a.bookingId ? `/checkout/${a.bookingId}` : null;
  const guaranteeBps = num(a.terms, "guarantee_bps");

  return (
    <main className="nf-page nf-md" data-testid="agreement-page" data-status={a.status}>
      <PageHeader title="Agreement" />
      <p className={`${TYPE.body} mt-inline`}>
        <strong>{a.listingTitle}</strong> · {a.kind === "rent" ? "Rental" : "Stay"}
      </p>
      <p className={`${TYPE.rowMeta} mt-2xs`} data-testid="agreement-status">
        {AGREEMENT_STATUS_LABEL[a.status] ?? a.status}
      </p>

      {a.status === "rejected" && a.decisionReason ? (
        <div className="nf-card mt-block p-card" role="note">
          <p className="font-semibold">Vallo sent this back</p>
          <p className={TYPE.body}>{a.decisionReason}</p>
          <p className={TYPE.rowMeta}>Change the terms below and both of you confirm again.</p>
        </div>
      ) : null}

      <Section title={`The terms (version ${a.termsVersion})`}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-md gap-y-2xs">
          <dt className={TYPE.rowMeta}>Between</dt>
          <dd>
            {a.renterName} ({a.kind === "rent" ? "renter" : "guest"}) and {a.ownerName} (owner or agent)
          </dd>
          {str(a.terms, "move_in") ? (
            <>
              <dt className={TYPE.rowMeta}>Move in</dt>
              <dd>{str(a.terms, "move_in")}</dd>
              <dt className={TYPE.rowMeta}>Keys handed over</dt>
              <dd>{str(a.terms, "handover_on")}</dd>
            </>
          ) : null}
          {str(a.terms, "check_in") ? (
            <>
              <dt className={TYPE.rowMeta}>Stay</dt>
              <dd>
                {str(a.terms, "check_in")} to {str(a.terms, "check_out")}
              </dd>
            </>
          ) : null}
          {LINES.map((line) =>
            num(a.terms, line.key) ? (
              <FragmentLine key={line.key} label={line.label} value={formatMoney(num(a.terms, line.key)!, locale)} />
            ) : null,
          )}
          <dt className={TYPE.rowMeta}>Inspection fee</dt>
          <dd>{NO_INSPECTION_FEE}</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="font-semibold nf-numeric">{formatMoney(a.amountMinor, locale)}</dd>
          {str(a.terms, "notes") ? (
            <>
              <dt className={TYPE.rowMeta}>Also agreed</dt>
              <dd>{str(a.terms, "notes")}</dd>
            </>
          ) : null}
        </dl>
        <p className={`${TYPE.rowMeta} mt-block`}>
          {NO_CUSTODY_SENTENCE}
          {guaranteeBps !== null
            ? ` ${guaranteeBps / 100}% of the total goes to the Vallo Guarantee reserve from the same payment.`
            : ""}
        </p>
      </Section>

      {a.status === "awaiting_parties" || a.status === "rejected" ? (
        <Section title="Confirm">
          <p className={TYPE.body}>
            {a.youConfirmedCurrent ? "You confirmed this version." : "You have not confirmed this version yet."}{" "}
            {a.otherConfirmedCurrent ? "The other side confirmed it." : "The other side has not confirmed it yet."}
          </p>
          {a.status === "awaiting_parties" && !a.youConfirmedCurrent ? (
            <ConfirmTerms agreementId={a.id} version={a.termsVersion} />
          ) : null}
          {a.kind === "rent" ? (
            <AmendTerms
              agreementId={a.id}
              moveIn={str(a.terms, "move_in") ?? today}
              handoverOn={str(a.terms, "handover_on") ?? today}
              notes={str(a.terms, "notes") ?? ""}
              minDate={today}
            />
          ) : null}
          <CancelAgreement agreementId={a.id} />
        </Section>
      ) : null}

      {a.status === "in_review" ? (
        <Section title="With Vallo">
          <p className={TYPE.body}>
            Both of you confirmed. A person at Vallo is reviewing the agreement. You will get an email and a notification
            the moment it is decided. Payment opens only after approval.
          </p>
        </Section>
      ) : null}

      {a.status === "approved" && a.role === "renter" && payHref ? (
        <Section title="Payment is open">
          <Link href={payHref} className="nf-btn nf-btn--primary nf-btn--md nf-btn--full" data-testid="agreement-pay">
            Pay {formatMoney(a.amountMinor, locale)}
          </Link>
        </Section>
      ) : null}

      {a.status === "paid" ? (
        <Section title="The Vallo Guarantee">
          <p className={TYPE.body}>{GUARANTEE_SENTENCE}</p>
          <p className={TYPE.rowMeta}>{GUARANTEE_SCOPE}</p>
          {a.claimWindow ? (
            <p className={TYPE.rowMeta}>
              Claim window: {new Date(a.claimWindow.opens).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} to{" "}
              {new Date(a.claimWindow.closes).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}.
            </p>
          ) : null}
          {a.claims.length > 0 ? (
            <ul className="mt-block grid gap-2xs">
              {a.claims.map((c) => (
                <li key={c.id} className={TYPE.body}>
                  Claim for {formatMoney(c.requestedMinor, locale)}: {CLAIM_STATUS_LABEL[c.status] ?? c.status}
                  {c.approvedMinor ? ` (${formatMoney(c.approvedMinor, locale)})` : ""}
                  {c.reason ? `. ${c.reason}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {windowOpen && cap > 0 ? <ClaimForm agreementId={a.id} capNaira={(cap / 100).toLocaleString("en-NG")} /> : null}
        </Section>
      ) : null}

      <Section title="History">
        <ol className="grid gap-2xs">
          {a.events.map((e, i) => (
            <li key={`${e.at}-${i}`} className={TYPE.rowMeta}>
              {new Date(e.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}: {e.action}
              {e.note ? ` · ${e.note}` : ""}
            </li>
          ))}
        </ol>
      </Section>

      <p className={`${TYPE.rowMeta} mt-block`}>{OFF_PLATFORM_SENTENCE}</p>
    </main>
  );
}

function FragmentLine({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className={TYPE.rowMeta}>{label}</dt>
      <dd className="nf-numeric">{value}</dd>
    </>
  );
}

/** The request's clock, read once so every time on the page agrees. */
function requestTime(): number {
  return Date.now();
}
