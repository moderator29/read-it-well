import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import {
  ADDRESS_PROOF_MAX_AGE_DAYS,
  getKycQueue,
  type KycSubjectView,
} from "@/lib/admin/kyc-queries";
import { adminUi, type AdminUi } from "../_components/ui";
import {
  QueueFilters,
  readQueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { Constants } from "@/lib/supabase/database.types";
import type { StatusTone } from "@/components/ui/StatusPill";
import { DocumentDecision } from "../_components/MoneyDecisions";

export const metadata: Metadata = {
  title: "Verification",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/*
 * The document vocabulary, still English and still local.
 *
 * These are NOT the F2-060 fault. That finding is about surfaces printing a raw
 * column value at an operator; these are written words somebody chose, and both
 * lookups already fall back rather than printing the column. They do belong in
 * the dictionary, and the keys are listed in the sprint report with the rest,
 * but moving them is a `packages/i18n` change and not this owner's to make.
 */
const KIND_LABEL: Record<string, string> = {
  identity: "Government issued ID",
  address: "Proof of address",
  business: "Business document",
};

const SUBTYPE_LABEL: Record<string, string> = {
  passport: "International passport",
  drivers_licence: "Driver's licence",
  nin_card: "NIN card or slip",
  voters_card: "Permanent voter's card",
  utility_bill: "Utility bill",
  bank_statement: "Bank statement",
  tenancy_agreement: "Tenancy agreement",
  cac_certificate: "CAC certificate",
  tax_certificate: "Tax certificate",
  business_address_proof: "Proof of business address",
};

/**
 * One mapping for both a document's review status and a ladder rung's, because
 * they use the same three words for the same three meanings and two tables that
 * agreed today would drift.
 */
function toneForReview(status: string): StatusTone {
  if (status === "approved" || status === "passed") return "success";
  if (status === "rejected" || status === "failed") return "danger";
  return "warning";
}

const RUNG_LABEL: Record<string, string> = {
  identity: "Identity",
  address: "Address",
  payout: "Payout account",
  in_person: "Met in person",
};

/**
 * The verification review queue, grouped by person.
 *
 * Grouped rather than listed flat, because a reviewer's unit of work is a
 * PERSON and not a file. Approving somebody's passport while their proof of
 * address sits forty rows further down a chronological list is exactly how one
 * person ends up half verified for a week and nobody notices.
 *
 * WHAT THE REVIEWER IS SHOWN BESIDE EACH DOCUMENT, and why each of it earns
 * its place:
 *
 *   The ladder, including PENDING rungs. A pending rung means an automated
 *   check ran and produced something a human has to settle, and the note says
 *   what. The payout rung is the one that produces these: Paystack has told us
 *   what the bank calls the account and it does not quite match the identity
 *   name. That is a question, and this is where it gets asked.
 *
 *   Whether a proof of address is too old. The three month rule is stated on
 *   the uploader's screen and was enforceable nowhere, because "recent" cannot
 *   be judged from an upload timestamp. The document now carries its own issue
 *   date and this flags the ones that fail.
 *
 *   Whether this is a re-submission. A third attempt at the same document
 *   deserves more care than a first, in both directions.
 */
/** The chips, from `document_review_status`: pending, approved, rejected. */
function statusFilters(ui: AdminUi): readonly QueueStatusOption[] {
  return Constants.public.Enums.document_review_status.map((value) => ({
    value,
    label: ui.columnLabel("kycReview", value),
  }));
}

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  /* Status and date only, and NO SEARCH BOX, which is the honest answer here
     rather than a missing feature: the field a reviewer recognises a subject by
     is their name, and the name is not on the document row. The long version is
     on `getKycQueue`. */
  const params = await searchParams;
  const query = readQueueQuery(params);
  /* Not `queueNarrowed`, which counts `q`. There is no search box here, so a
     hand-typed `?q=` would light up the no-match panel while changing nothing
     about the rows. Only the three narrowings this queue actually applies. */
  const narrowed = Boolean(query.status || query.from || query.to);
  const read = await getKycQueue({
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader
          title="Verification"
          lede="Identity and business documents waiting on a decision."
        />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { waiting, decided, pendingCount } = read.data;

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Verification"
        lede="Identity, address and business documents. Sellers, landlords and agents verify; renters and buyers are never asked, and nothing here gates browsing or renting."
        count={pendingCount}
      />

      <QueueFilters
        base="/admin/kyc"
        query={query}
        common={common}
        searchable={false}
        statuses={statusFilters(ui)}
      />

      {waiting.length === 0 && decided.length === 0 && narrowed ? (
        <ui.QueueEmpty title={common.noMatchTitle} body={common.noMatchBody} />
      ) : waiting.length === 0 ? (
        /* Narrowed, this says nothing: "nothing is waiting" is false to
           somebody who has just asked to see the approved ones. */
        narrowed ? null : (
          <ui.QueueEmpty
            title="Nothing is waiting"
            body="Every document that has been uploaded has been decided. Somebody uploading one now appears here immediately."
          />
        )
      ) : (
        <ul className="space-y-md">
          {waiting.map((subject) => (
            <li key={subject.userId ?? subject.documents[0]?.id}>
              <SubjectCard subject={subject} ui={ui} decidable />
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="mt-xl">
          <h2 className="mb-xs text-[var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
            Recently decided
          </h2>
          <ul className="space-y-md">
            {decided.map((subject) => (
              <li key={subject.userId ?? subject.documents[0]?.id}>
                <SubjectCard subject={subject} ui={ui} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SubjectCard({
  subject,
  ui,
  decidable = false,
}: {
  subject: KycSubjectView;
  ui: AdminUi;
  decidable?: boolean;
}) {
  return (
    <article className="nf-card p-md sm:p-5">
      <div className="flex flex-wrap items-baseline gap-sm">
        <h3 className="text-[var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
          {subject.displayName ?? "No display name"}
        </h3>
        <span className="nf-badge nf-badge--brand nf-numeric">Tier {subject.tier}</span>
        {subject.applicationReference && (
          <span className="font-mono text-[0.6875rem] text-[var(--nf-content-muted)]">
            {subject.applicationReference}
          </span>
        )}
      </div>

      {subject.rungs.length > 0 && (
        <ul className="mt-xs flex flex-wrap gap-xs">
          {subject.rungs.map((rung) => (
            <li
              key={rung.kind}
              className="rounded-[var(--nf-radius-sm)] border border-[var(--nf-border-subtle)] px-xs py-2xs"
            >
              <span className="text-[var(--nf-text-overline)] font-medium text-[var(--nf-content-primary)]">
                {RUNG_LABEL[rung.kind] ?? rung.kind}
              </span>{" "}
              <ui.StatusChip
                label={rung.status}
                tone={toneForReview(rung.status)}
              />
              {rung.note && (
                <span className="mt-3xs block max-w-[52ch] text-[0.6875rem] leading-relaxed text-[var(--nf-content-muted)]">
                  {rung.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {subject.business && (
        <dl className="mt-sm">
          <ui.DetailRow label="Business" value={subject.business.name} />
          <ui.DetailRow label="RC number" value={subject.business.registrationNumber} />
          <ui.DetailRow label="Tax id" value={subject.business.taxId} />
          <ui.DetailRow label="Business email" value={subject.business.email} />
          <ui.DetailRow label="Business phone" value={subject.business.phone} />
          <ui.DetailRow label="Established" value={ui.day(subject.business.establishedOn)} />
          <ui.DetailRow label="Business address" value={subject.business.address} />
        </dl>
      )}

      <ul className="mt-sm space-y-sm">
        {subject.documents.map((doc) => (
          <li
            key={doc.id}
            className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-sm"
          >
            <div className="flex flex-wrap items-center gap-xs">
              <span className="text-[var(--nf-text-body-sm)] font-medium text-[var(--nf-content-primary)]">
                {KIND_LABEL[doc.kind] ?? doc.kind}
              </span>
              {doc.subtype && (
                <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-secondary)]">
                  {SUBTYPE_LABEL[doc.subtype] ?? doc.subtype}
                </span>
              )}
              {/* NOT `label={doc.reviewStatus}`, which printed raw lower-case
                  `pending`, `approved`, `rejected` at an operator. Not the
                  shared `statusLabel` either: its lower-case `pending` reads
                  "Awaiting reply", which is a support ticket's word and says
                  the wrong thing about a document nobody has looked at yet. */}
              <ui.StatusChip
                label={ui.columnLabel("kycReview", doc.reviewStatus)}
                tone={toneForReview(doc.reviewStatus)}
              />
              {doc.isResubmission && (
                <span className="nf-badge">Sent again after a rejection</span>
              )}
              {doc.tooOld && (
                <span className="nf-badge nf-badge--warning">
                  Older than {ADDRESS_PROOF_MAX_AGE_DAYS} days, or undated
                </span>
              )}
              <span className="ml-auto text-[0.6875rem] text-[var(--nf-content-muted)]">
                {ui.when(doc.uploadedAt)}
              </span>
            </div>

            <p className="mt-2xs text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              Issued {ui.day(doc.issuedOn)}
              {doc.reviewedAt
                ? ` · decided ${ui.when(doc.reviewedAt)}${doc.reviewedByName ? ` by ${doc.reviewedByName}` : ""}`
                : ""}
            </p>

            {doc.rejectionReason && (
              <p className="mt-2xs text-[var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-secondary)]">
                Sent back: {doc.rejectionReason}
              </p>
            )}

            {doc.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="mt-xs inline-block text-[var(--nf-text-caption)] font-medium underline"
              >
                Open the document
              </a>
            ) : (
              <p className="mt-xs text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                The file could not be reached just now. Reload to try again.
              </p>
            )}

            {decidable && doc.reviewStatus === "pending" && (
              <DocumentDecision documentId={doc.id} />
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
