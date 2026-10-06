import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@vallo/i18n/core";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readAgreement } from "@/lib/agreements/queries";
import { readChangesSinceConfirmed } from "@/lib/agreements/changes-read";
import type { TermChange } from "@/lib/agreements/terms-diff";
import { AgreementChanges, type WordedChange } from "@/components/app/agreements/AgreementChanges";
import { AgreementVersions } from "@/components/app/agreements/AgreementVersions";
import { AgreementHistory } from "@/components/app/agreements/AgreementHistory";
import { AgreementTrackMotion } from "@/components/app/agreements/AgreementTrackMotion";
import { readAgreementRecord } from "@/components/app/agreements/record-read";
import { previousVersionDiff, versionRegister, type RecordEvent } from "@/components/app/agreements/version-register";
import { termDay, termValue } from "@/components/app/agreements/term-words";
import { PageHeader } from "@/components/app/PageHeader";
import { HeroBand } from "@/components/ui/HeroBand";
import { DecisionCard } from "@/components/app/confirm/DecisionCard";
import { ButtonLink } from "@/components/ui/Button";
import { SuccessFromFlag } from "@/components/ui/SuccessFromFlag";
import { readDone, type SuccessMomentId } from "@/lib/ui/success-moments";
import { agreementArrival } from "@/lib/ui/arrival-moments";
import { Section, TYPE } from "@/components/app/Screen";
import { AGREEMENT_STATUS_LABEL, CLAIM_STATUS_LABEL } from "@/components/app/agreements/status";
import { StatusTrack, type TrackStep } from "@/components/app/status/StatusTrack";
import { DocActions, DocHead, DocNote, DocRow, DocRows, DocState, DocumentSheet } from "@/components/app/money/DocumentSheet";
import { PrintDocumentTile } from "@/components/app/money/PrintDocumentTile";
import { agreementTrack, type AgreementStepKey } from "@/components/app/status/tracks";
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
export default async function AgreementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string | string[] }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const a = await readAgreement(id);
  if (!a) notFound();
  const done = readDone((await searchParams).done);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const now = requestTime();
  const windowOpen =
    a.claimWindow !== null && now >= Date.parse(a.claimWindow.opens) && now < Date.parse(a.claimWindow.closes);
  const claimedApproved = a.claims.reduce((sum, c) => sum + (c.approvedMinor ?? 0), 0);
  const cap = Math.max(0, a.amountMinor - claimedApproved);
  const payHref = a.kind === "rent" && a.inspectionId ? `/rent/pay/${a.inspectionId}` : a.bookingId ? `/checkout/${a.bookingId}` : null;
  const guaranteeBps = num(a.terms, "guarantee_bps");
  /* Staff read every agreement under RLS but are not a party to it: they see
     the record and none of the parties' controls. */
  const party = a.role !== null;
  /* The one pending decision this page can hold for its reader. */
  const awaitingYou = party && a.status === "awaiting_parties" && !a.youConfirmedCurrent;
  const lastEvent = a.events.length > 0 ? a.events[a.events.length - 1] : undefined;
  const lastEventAt = lastEvent
    ? new Date(lastEvent.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" })
    : null;

  /*
   * THE SUCCESS MOMENT ON ARRIVAL (docs/SUCCESS_MOMENTS.md). A flag from the
   * control that just acted, and each one checked against this agreement
   * before a sheet opens: the flag asks, the record answers. Approval is
   * written by the database into a notification, where no flag can ride, so
   * it opens from the status itself, once per device.
   */
  /* B9: what moved since this party last confirmed. Null (today's page)
     until the versions migration is applied, and whenever there is nothing
     to show. */
  const kit = getDictionary(locale).memberKit.agreementDiff;
  const words = getDictionary(locale).experienceMoney.agreements;
  const [since, record] = await Promise.all([
    party && (a.status === "awaiting_parties" || a.status === "rejected") && !a.youConfirmedCurrent
      ? readChangesSinceConfirmed({
          agreementId: a.id,
          currentVersion: a.termsVersion,
          currentTerms: a.terms,
          currentAmountMinor: a.amountMinor,
        })
      : Promise.resolve(null),
    readAgreementRecord(a.id),
  ]);
  const worded: WordedChange[] = (since?.changes ?? []).map((c: TermChange) => ({
    key: c.key,
    label: c.label,
    before: termValue(c, c.before, locale, kit.notStated),
    after: termValue(c, c.after, locale, kit.notStated),
  }));

  /*
   * M2: THE DOCUMENT'S VERSIONS AND ITS RECORD. The sided events (who did
   * what, on which version) and B9's kept snapshots, read under the
   * reader's own RLS. A party sees every kept version, the line-by-line
   * change from the one before, and which side confirmed which version;
   * when the snapshots cannot be read (a failed read, or staff, who are no
   * party) the sheet is the current version alone, as it was.
   */
  const names = { renter: a.renterName, owner: a.ownerName };
  const confirmedNow = {
    renter: a.role === "renter" ? a.youConfirmedCurrent : a.role === "owner" ? a.otherConfirmedCurrent : false,
    owner: a.role === "owner" ? a.youConfirmedCurrent : a.role === "renter" ? a.otherConfirmedCurrent : false,
  };
  const kept = party && record?.versions ? record.versions : null;
  const versionEntries = kept
    ? versionRegister({ current: a.termsVersion, stored: kept.map((v) => v.version), events: record?.events ?? [], confirmedNow })
    : [];
  const versionDiff = kept ? previousVersionDiff({ current: a.termsVersion, versions: kept }) : null;
  const history: RecordEvent[] =
    record?.events ?? a.events.map((e) => ({ at: e.at, action: e.action, note: e.note, side: null, version: null }));

  /* The approval state's one payoff: the pop on the approval node, only
     for a party, only when the record holds a dated approval and the
     agreement stands approved now (a later payment is its own moment; a
     send-back or a cancellation is not a payoff; staff reviewing the
     record are not being paid off). */
  const steps = agreementSteps(a.status, a.events);
  const approvedStep = steps.findIndex((step) => step.key === "approved");
  const popAt =
    party && a.status === "approved" && approvedStep >= 0 && steps[approvedStep]!.state === "done" && steps[approvedStep]!.when
      ? approvedStep + 1
      : null;

  const arrival = agreementArrival(a, done);
  const moment: SuccessMomentId | null = arrival && !arrival.seenOnce ? arrival.moment : null;
  const approvedMoment: SuccessMomentId | null = arrival?.seenOnce ? arrival.moment : null;

  return (
    <main className="nf-page nf-md" data-testid="agreement-page" data-status={a.status}>
      {/* Always rendered, here, with `show` deciding: it latches what it
          says, so stripping the flag cannot take the sheet away. */}
      <SuccessFromFlag
        copy={getDictionary(locale).success}
        show={(moment ?? approvedMoment) !== null}
        moment={moment ?? approvedMoment ?? "agreementDrawn"}
        seenKey={moment ? undefined : `agreement-approved:${a.id}`}
        details={[{ label: getDictionary(locale).success.detail.for, value: a.listingTitle }]}
        primary={
          !moment && approvedMoment && a.role === "renter" && payHref
            ? { label: `Pay ${formatMoney(a.amountMinor, locale)}`, href: payHref }
            : undefined
        }
        haptic={moment ? undefined : false}
      />
      <PageHeader title="Agreement" />
      {/* Where it stands, on the shared status track (spec section 14): drawn
          up, both confirmed, approved, paid, each dated from this agreement's
          own events. Sent back or cancelled stops the track where it stood.
          It opens the page on the hero band (plan item 21; spec section 16,
          Q2: the agreement's live-status header), the property named above
          the track with the kind and the status word under it. */}
      <HeroBand
        className="nf-status-band mt-inline"
        label="Live status"
        title={a.listingTitle}
        sub={
          <>
            {a.kind === "rent" ? "Rental" : "Stay"} ·{" "}
            <span data-testid="agreement-status">{AGREEMENT_STATUS_LABEL[a.status] ?? a.status}</span>
          </>
        }
      >
        <AgreementTrackMotion popAt={popAt} seenKey={`agreement-approved-track:${a.id}`}>
          <StatusTrack label="Agreement progress" steps={steps} testId="agreement-track" />
        </AgreementTrackMotion>
      </HeroBand>

      {/* AWAITING YOU (plan item 22; spec section 14, reference 36). Drawn
          only when this reader is a party and has not confirmed the current
          version: the one real decision on this page. Its lines and total are
          the terms' own; its controls are the page's own ConfirmTerms and
          CancelAgreement, moved here rather than repeated below. */}
      {awaitingYou ? (
        <DecisionCard
          className="mt-block"
          testId="agreement-awaiting-you"
          label="Awaiting you"
          when={lastEventAt ? `Since ${lastEventAt}` : undefined}
          title={`Confirm version ${a.termsVersion} of the terms`}
          lines={LINES.flatMap((line) => {
            const amount = num(a.terms, line.key);
            return amount ? [{ label: line.label, amount: formatMoney(amount, locale) }] : [];
          })}
          total={{ label: "Total", amount: formatMoney(a.amountMinor, locale) }}
          primary={
            <ConfirmTerms
              agreementId={a.id}
              version={a.termsVersion}
              changes={worded.length > 0 ? worded : undefined}
              changesLead={kit.confirmLead}
            />
          }
          secondary={[
            <ButtonLink key="terms" variant="secondary" href="#agreement-terms">
              Read the terms
            </ButtonLink>,
            <CancelAgreement key="cancel" agreementId={a.id} variant="secondary" />,
          ]}
        />
      ) : null}

      {a.status === "rejected" && a.decisionReason ? (
        <div className="nf-card mt-block p-card" role="note">
          <p className="font-semibold">Vallo sent this back</p>
          <p className={TYPE.body}>{a.decisionReason}</p>
          <p className={TYPE.rowMeta}>
            {a.kind === "rent"
              ? "Change the terms below and both of you confirm again."
              : "A stay's terms are its booking, so they cannot be changed here. Message the host about the reason, or cancel this agreement."}
          </p>
        </div>
      ) : null}

      {since ? (
        <AgreementChanges
          changes={worded}
          copy={kit}
          byLine={
            since.by && since.at
              ? kit.by
                  .replace("{who}", since.by === "you" ? kit.you : kit.other)
                  .replace("{date}", new Date(since.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))
              : kit.byUndated
          }
          versionsLine={kit.versions.replace("{from}", String(since.fromVersion)).replace("{to}", String(since.toVersion))}
        />
      ) : null}

      {/*
        THE TERMS, ON THE DOCUMENT SHEET (D28.1). The agreement is the record
        of exactly what both sides committed to, and it is what gets printed
        and taken to a lawyer, so it is drawn as paper on the member's own
        theme: who it is between, the dates, every line to the kobo, the total
        they add up to, and where each party stands on THIS version. The two
        confirmation rows are the record's own (`youConfirmedCurrent` and
        `otherConfirmedCurrent`, read against the current terms version), in
        the sentences this page already used, so a lapsed confirmation after
        an amendment reads as not confirmed rather than as a tick. Staff read
        the record without being a party, so they see no confirmation rows.
      */}
      <Section id="agreement-terms">
        <DocumentSheet printable aria-labelledby="agreement-terms-title" data-testid="agreement-terms">
          <DocHead label={a.listingTitle} title={`The terms (version ${a.termsVersion})`} id="agreement-terms-title" />
          <DocRows>
            <DocRow label="Between" variant="prose">
              {a.renterName} ({a.kind === "rent" ? "renter" : "guest"}) and {a.ownerName} (owner or agent)
            </DocRow>
            {str(a.terms, "move_in") ? (
              <>
                <DocRow label="Move in" numeric>
                  {termDay(str(a.terms, "move_in"), locale)}
                </DocRow>
                <DocRow label="Keys handed over" numeric>
                  {termDay(str(a.terms, "handover_on") ?? str(a.terms, "move_in"), locale)}
                </DocRow>
              </>
            ) : null}
            {str(a.terms, "check_in") ? (
              <DocRow label="Stay" numeric>
                {termDay(str(a.terms, "check_in"), locale)} to {termDay(str(a.terms, "check_out"), locale)}
              </DocRow>
            ) : null}
            {LINES.map((line) =>
              num(a.terms, line.key) ? (
                <DocRow key={line.key} label={line.label} numeric>
                  {formatMoney(num(a.terms, line.key)!, locale)}
                </DocRow>
              ) : null,
            )}
            <DocRow label="Inspection fee" variant="prose">
              {NO_INSPECTION_FEE}
            </DocRow>
            <DocRow label="Total" variant="total" numeric>
              {formatMoney(a.amountMinor, locale)}
            </DocRow>
            {str(a.terms, "notes") ? (
              <DocRow label="Also agreed" variant="prose">
                {str(a.terms, "notes")}
              </DocRow>
            ) : null}
            {party ? (
              <>
                <DocRow label={a.role === "renter" ? a.renterName : a.ownerName} variant="prose">
                  <DocState done={a.youConfirmedCurrent}>
                    {a.youConfirmedCurrent ? "You confirmed this version." : "You have not confirmed this version yet."}
                  </DocState>
                </DocRow>
                <DocRow label={a.role === "renter" ? a.ownerName : a.renterName} variant="prose">
                  <DocState done={a.otherConfirmedCurrent}>
                    {a.otherConfirmedCurrent ? "The other side confirmed it." : "The other side has not confirmed it yet."}
                  </DocState>
                </DocRow>
              </>
            ) : null}
          </DocRows>
          {versionDiff ? (
            <AgreementVersions
              diff={versionDiff}
              entries={versionEntries}
              names={names}
              locale={locale}
              copy={words}
              diffCopy={kit}
            />
          ) : null}
          <DocNote>
            {NO_CUSTODY_SENTENCE}
            {guaranteeBps !== null
              ? ` ${guaranteeBps / 100}% of the total goes to the Vallo Guarantee reserve from the same payment.`
              : ""}
          </DocNote>
        </DocumentSheet>
        <DocActions label="The terms">
          <PrintDocumentTile label={getDictionary(locale).afterTheGate.complaint.print} testId="agreement-print" />
        </DocActions>
      </Section>

      {party && (a.status === "awaiting_parties" || a.status === "rejected") ? (
        <Section title={a.status === "rejected" ? "What happens next" : "Confirm"}>
          {/* Where each side stands on this version is said once, on the
              terms sheet above, rather than repeated here. Confirming, when
              it is this reader's move, is the Awaiting you card at the top
              of the page. */}
          {a.kind === "rent" ? (
            <AmendTerms
              agreementId={a.id}
              moveIn={str(a.terms, "move_in") ?? today}
              handoverOn={str(a.terms, "handover_on") ?? today}
              notes={str(a.terms, "notes") ?? ""}
              minDate={today}
            />
          ) : null}
          {awaitingYou ? null : <CancelAgreement agreementId={a.id} />}
        </Section>
      ) : null}

      {a.status === "in_review" ? (
        <Section title="With Vallo">
          <p className={TYPE.body}>
            Both of you confirmed. A person at Vallo is reviewing the agreement. You will get an email and a notification
            the moment it is decided. Payment opens only after approval.
          </p>
          {party ? <CancelAgreement agreementId={a.id} /> : null}
        </Section>
      ) : null}

      {a.status === "approved" ? (
        <Section title="Payment is open">
          {a.role === "renter" && payHref ? (
            <Link href={payHref} className="nf-btn nf-btn--primary nf-btn--md nf-btn--full" data-testid="agreement-pay">
              Pay {formatMoney(a.amountMinor, locale)}
            </Link>
          ) : a.role === "owner" ? (
            <p className={TYPE.body} data-testid="agreement-awaiting-payment">
              Vallo approved the agreement. The {a.kind === "rent" ? "renter" : "guest"} can pay now, and your share
              settles straight to your bank account from the same payment.
            </p>
          ) : null}
          {party ? <CancelAgreement agreementId={a.id} /> : null}
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
          {!party ? null : windowOpen && cap > 0 && a.claims.some((c) => c.mine && c.status === "submitted") ? (
            <p className={TYPE.rowMeta} data-testid="claim-waiting">
              Your claim is with Vallo. You can make another once it is decided.
            </p>
          ) : windowOpen && cap > 0 ? (
            <ClaimForm agreementId={a.id} capNaira={(cap / 100).toLocaleString("en-NG")} />
          ) : null}
        </Section>
      ) : null}

      <Section title={words.historyTitle}>
        <AgreementHistory events={history} names={names} locale={locale} copy={words} />
      </Section>

      <p className={`${TYPE.rowMeta} mt-block`}>{OFF_PLATFORM_SENTENCE}</p>
    </main>
  );
}

const TRACK_LABEL: Record<AgreementStepKey, string> = {
  drawn: "Drawn up",
  confirmed: "Both confirmed",
  approved: "Vallo approved",
  paid: "Paid",
};

function agreementSteps(status: string, events: { at: string; action: string }[]): TrackStep[] {
  return agreementTrack({ status, events }).map((step) => ({
    key: step.key,
    label:
      step.state === "failed"
        ? status === "rejected"
          ? "Sent back by Vallo"
          : "Cancelled"
        : TRACK_LABEL[step.key],
    when: step.at
      ? new Date(step.at).toLocaleString("en-NG", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Lagos",
        })
      : null,
    state: step.state,
  }));
}

/** The request's clock, read once so every time on the page agrees. */
function requestTime(): number {
  return Date.now();
}
