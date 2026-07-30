import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentApplications, type ApplicationView } from "@/lib/admin/queries";
import { ApplicationDecision } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.applications.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * Agent applications, with the whole six step form on the page.
 *
 * A reviewer should never have to open a second screen to make this decision,
 * so every step the applicant filled in is here: personal, identity, business,
 * documents, payout and the review step they agreed to. Approving creates their
 * agent profile, grants the agent role and tells them, all in one action.
 */
function ApplicationCard({
  application,
  copy,
  common,
  ui,
}: {
  application: ApplicationView;
  copy: AdminCopy["applications"];
  common: AdminCommon;
  ui: AdminUi;
}) {
  const decidable =
    application.status === "SUBMITTED" ||
    application.status === "UNDER_REVIEW" ||
    application.status === "MORE_INFO_REQUIRED";
  const f = copy.fields;

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ui.StatusChip status={application.status} />
        <ui.StatusChip
          label={application.type === "business" ? copy.business : copy.individual}
          tone="neutral"
        />
        <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
          {application.reference}
        </span>
      </div>

      <h3 className="mt-2.5 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
        {application.fullName ?? copy.nameMissing}
      </h3>
      <p className="mt-0.5 text-[0.75rem] text-[var(--nf-content-muted)]">
        {fill(copy.submittedWhen, { when: ui.when(application.submittedAt) })}
      </p>

      <ui.DetailSection title={copy.sections.personal}>
        <ui.DetailRow label={f.fullName} value={application.fullName} />
        <ui.DetailRow label={f.phone} value={application.phone} />
        <ui.DetailRow label={f.email} value={application.email} />
        <ui.DetailRow label={f.address} value={application.address} />
        <ui.DetailRow
          label={f.location}
          value={[application.city, application.stateCode].filter(Boolean).join(", ")}
        />
      </ui.DetailSection>

      <ui.DetailSection title={copy.sections.identity}>
        <ui.DetailRow label={f.documentType} value={application.idType} />
        <ui.DetailRow label={f.documentNumber} value={application.idNumber} />
      </ui.DetailSection>

      <ui.DetailSection title={copy.sections.business}>
        {application.type === "business" ? (
          <>
            <ui.DetailRow label={f.businessName} value={application.businessName} />
            <ui.DetailRow label={f.rcNumber} value={application.businessRc} />
          </>
        ) : (
          <ui.DetailRow label={f.business} value={copy.asIndividual} />
        )}
      </ui.DetailSection>

      <ui.DetailSection title={copy.sections.documents}>
        <ui.DetailRow
          label={f.uploaded}
          value={
            application.documentCount === 1
              ? copy.documentsOne
              : fill(copy.documentsCount, { count: application.documentCount })
          }
        />
      </ui.DetailSection>

      <ui.DetailSection title={copy.sections.payout}>
        <ui.DetailRow label={f.bank} value={application.bankName} />
        <ui.DetailRow label={f.accountNumber} value={application.accountNumber} />
        <ui.DetailRow label={f.accountName} value={application.accountName} />
      </ui.DetailSection>

      <ui.DetailSection title={copy.sections.review}>
        <ui.DetailRow
          label={f.terms}
          value={application.agreedTerms ? copy.termsAgreed : copy.termsNotAgreed}
        />
        <ui.DetailRow label={f.applied} value={ui.when(application.createdAt)} />
        {application.reviewNotes && (
          <ui.DetailRow label={f.lastNote} value={application.reviewNotes} />
        )}
        {application.reviewedAt && (
          <ui.DetailRow label={f.lastReviewed} value={ui.when(application.reviewedAt)} />
        )}
      </ui.DetailSection>

      {decidable ? (
        <ApplicationDecision
          applicationId={application.id}
          applicantName={application.fullName ?? copy.thisApplicant}
          copy={copy}
          common={common}
        />
      ) : (
        <p className="mt-4 text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(copy.decidedWhen, { when: ui.when(application.reviewedAt) })} {common.inAuditLog}
        </p>
      )}
    </li>
  );
}

export default async function AdminAgentsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.applications;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const applications = await getAgentApplications();

  if (applications.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <ui.QueueHeader title={copy.title} lede={copy.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { waiting, decided } = applications.data;
  // Changes requested sits with the applicant, not with us, so it stays visible
  // in the list but is not counted as work waiting on the console.
  const onUs = waiting.filter((item) => item.status !== "MORE_INFO_REQUIRED").length;

  return (
    <div className="mx-auto max-w-3xl">
      <ui.QueueHeader title={copy.title} lede={copy.lede} count={onUs} />

      {waiting.length === 0 ? (
        <ui.QueueEmpty title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <ul className="space-y-3">
          {waiting.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              copy={copy}
              common={common}
              ui={ui}
            />
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">{common.recentlyDecided}</h2>
          <ul className="space-y-3">
            {decided.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                copy={copy}
                common={common}
                ui={ui}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
