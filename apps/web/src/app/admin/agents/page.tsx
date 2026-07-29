import type { Metadata } from "next";
import { getAgentApplications, type ApplicationView } from "@/lib/admin/queries";
import { ApplicationDecision } from "../_components/AdminActions";
import {
  DetailRow,
  DetailSection,
  QueueEmpty,
  QueueHeader,
  QueueUnavailable,
  StatusChip,
  formatWhen,
} from "../_components/ui";

export const metadata: Metadata = {
  title: "Agent applications",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Agent applications, with the whole six step form on the page.
 *
 * A reviewer should never have to open a second screen to make this decision,
 * so every step the applicant filled in is here: personal, identity, business,
 * documents, payout and the review step they agreed to. Approving creates their
 * agent profile, grants the agent role and tells them, all in one action.
 */
function ApplicationCard({ application }: { application: ApplicationView }) {
  const decidable =
    application.status === "SUBMITTED" ||
    application.status === "UNDER_REVIEW" ||
    application.status === "MORE_INFO_REQUIRED";

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={application.status} />
        <StatusChip
          label={application.type === "business" ? "Business" : "Individual"}
          tone="neutral"
        />
        <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
          {application.reference}
        </span>
      </div>

      <h3 className="mt-2.5 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
        {application.fullName ?? "Name not given"}
      </h3>
      <p className="mt-0.5 text-[0.75rem] text-[var(--nf-content-muted)]">
        Submitted {formatWhen(application.submittedAt)}
      </p>

      <DetailSection title="1. Personal">
        <DetailRow label="Full name" value={application.fullName} />
        <DetailRow label="Phone" value={application.phone} />
        <DetailRow label="Email" value={application.email} />
        <DetailRow label="Address" value={application.address} />
        <DetailRow
          label="Location"
          value={[application.city, application.stateCode].filter(Boolean).join(", ")}
        />
      </DetailSection>

      <DetailSection title="2. Identity">
        <DetailRow label="Document type" value={application.idType} />
        <DetailRow label="Document number" value={application.idNumber} />
      </DetailSection>

      <DetailSection title="3. Business">
        {application.type === "business" ? (
          <>
            <DetailRow label="Business name" value={application.businessName} />
            <DetailRow label="RC number" value={application.businessRc} />
          </>
        ) : (
          <DetailRow label="Business" value="Applying as an individual" />
        )}
      </DetailSection>

      <DetailSection title="4. Documents">
        <DetailRow
          label="Uploaded"
          value={
            application.documentCount === 1
              ? "1 document"
              : `${application.documentCount} documents`
          }
        />
      </DetailSection>

      <DetailSection title="5. Payout">
        <DetailRow label="Bank" value={application.bankName} />
        <DetailRow label="Account number" value={application.accountNumber} />
        <DetailRow label="Account name" value={application.accountName} />
      </DetailSection>

      <DetailSection title="6. Review">
        <DetailRow
          label="Terms"
          value={application.agreedTerms ? "Agreed to the platform terms" : "Not agreed"}
        />
        <DetailRow label="Applied" value={formatWhen(application.createdAt)} />
        {application.reviewNotes && (
          <DetailRow label="Last reviewer note" value={application.reviewNotes} />
        )}
        {application.reviewedAt && (
          <DetailRow label="Last reviewed" value={formatWhen(application.reviewedAt)} />
        )}
      </DetailSection>

      {decidable ? (
        <ApplicationDecision
          applicationId={application.id}
          applicantName={application.fullName ?? "this applicant"}
        />
      ) : (
        <p className="mt-4 text-[0.75rem] text-[var(--nf-content-muted)]">
          Decided {formatWhen(application.reviewedAt)}. The decision is in the audit log.
        </p>
      )}
    </li>
  );
}

export default async function AdminAgentsPage() {
  const applications = await getAgentApplications();

  if (applications.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <QueueHeader
          title="Agent applications"
          lede="People waiting on a decision to start listing."
        />
        <QueueUnavailable />
      </div>
    );
  }

  const { waiting, decided } = applications.data;
  // Changes requested sits with the applicant, not with us, so it stays visible
  // in the list but is not counted as work waiting on the console.
  const onUs = waiting.filter((item) => item.status !== "MORE_INFO_REQUIRED").length;

  return (
    <div className="mx-auto max-w-3xl">
      <QueueHeader
        title="Agent applications"
        lede="Approving creates the agent profile, grants the agent role so Agent Mode opens, and tells the applicant on the platform. Sending one back asks for exactly what is missing."
        count={onUs}
      />

      {waiting.length === 0 ? (
        <QueueEmpty
          title="No applications waiting"
          body="Everyone who applied has had an answer. New applications arrive here the moment they are submitted."
        />
      ) : (
        <ul className="space-y-3">
          {waiting.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">Recently decided</h2>
          <ul className="space-y-3">
            {decided.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
