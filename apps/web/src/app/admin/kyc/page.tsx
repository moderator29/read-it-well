import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import {
  ADDRESS_PROOF_MAX_AGE_DAYS,
  getKycQueue,
  type KycSubjectView,
} from "@/lib/admin/kyc-queries";
import { adminUi, type AdminUi } from "../_components/ui";
import type { StatusTone } from "@/components/ui/StatusPill";
import { DocumentDecision } from "../_components/MoneyDecisions";

export const metadata: Metadata = {
  title: "Verification",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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
export default async function AdminKycPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const read = await getKycQueue();

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

      {waiting.length === 0 ? (
        <ui.QueueEmpty
          title="Nothing is waiting"
          body="Every document that has been uploaded has been decided. Somebody uploading one now appears here immediately."
        />
      ) : (
        <ul className="space-y-4">
          {waiting.map((subject) => (
            <li key={subject.userId ?? subject.documents[0]?.id}>
              <SubjectCard subject={subject} ui={ui} decidable />
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
            Recently decided
          </h2>
          <ul className="space-y-4">
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
    <article className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
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
        <ul className="mt-2 flex flex-wrap gap-2">
          {subject.rungs.map((rung) => (
            <li
              key={rung.kind}
              className="rounded-[var(--nf-radius-sm)] border border-[var(--nf-border-subtle)] px-2 py-1"
            >
              <span className="text-[0.75rem] font-medium text-[var(--nf-content-primary)]">
                {RUNG_LABEL[rung.kind] ?? rung.kind}
              </span>{" "}
              <ui.StatusChip
                label={rung.status}
                tone={toneForReview(rung.status)}
              />
              {rung.note && (
                <span className="mt-0.5 block max-w-[52ch] text-[0.6875rem] leading-relaxed text-[var(--nf-content-muted)]">
                  {rung.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {subject.business && (
        <dl className="mt-3">
          <ui.DetailRow label="Business" value={subject.business.name} />
          <ui.DetailRow label="RC number" value={subject.business.registrationNumber} />
          <ui.DetailRow label="Tax id" value={subject.business.taxId} />
          <ui.DetailRow label="Business email" value={subject.business.email} />
          <ui.DetailRow label="Business phone" value={subject.business.phone} />
          <ui.DetailRow label="Established" value={ui.day(subject.business.establishedOn)} />
          <ui.DetailRow label="Business address" value={subject.business.address} />
        </dl>
      )}

      <ul className="mt-3 space-y-3">
        {subject.documents.map((doc) => (
          <li
            key={doc.id}
            className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.875rem] font-medium text-[var(--nf-content-primary)]">
                {KIND_LABEL[doc.kind] ?? doc.kind}
              </span>
              {doc.subtype && (
                <span className="text-[0.75rem] text-[var(--nf-content-secondary)]">
                  {SUBTYPE_LABEL[doc.subtype] ?? doc.subtype}
                </span>
              )}
              <ui.StatusChip label={doc.reviewStatus} tone={toneForReview(doc.reviewStatus)} />
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

            <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
              Issued {ui.day(doc.issuedOn)}
              {doc.reviewedAt
                ? ` · decided ${ui.when(doc.reviewedAt)}${doc.reviewedByName ? ` by ${doc.reviewedByName}` : ""}`
                : ""}
            </p>

            {doc.rejectionReason && (
              <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Sent back: {doc.rejectionReason}
              </p>
            )}

            {doc.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[0.8125rem] font-medium underline"
              >
                Open the document
              </a>
            ) : (
              <p className="mt-2 text-[0.75rem] text-[var(--nf-content-muted)]">
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
