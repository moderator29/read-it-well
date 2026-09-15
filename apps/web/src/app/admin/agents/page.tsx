import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentApplications, type ApplicationView } from "@/lib/admin/queries";
import { getVerificationLadders, type AgentLadder } from "@/lib/admin/verification-queries";
import { VERIFICATION_ORDER } from "@/lib/trust/verification";
import { ApplicationDecision, VerificationRungDecision } from "../_components/AdminActions";
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
 *
 * Approval is the beginning of the ladder rather than the end of it. An
 * approved application grows a verification block underneath it: four rungs in
 * a fixed order, each one a decision a named person recorded, with the tier
 * computed in the database from the rungs that actually passed. A reviewer can
 * only ever offer the next rung, because a tier you can reach by skipping a
 * step is a tier that means nothing.
 */
function VerificationLadderPanel({
  ladder,
  copy,
  common,
  ui,
}: {
  ladder: AgentLadder;
  copy: AdminCopy["verification"];
  common: AdminCommon;
  ui: AdminUi;
}) {
  const tierNames = copy.tierName as Record<string, string>;

  return (
    <section className="mt-4" aria-label={copy.title}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
          {copy.title}
        </h4>
        <ui.StatusChip
          label={fill(copy.tierLine, {
            step: ladder.tier,
            name: tierNames[String(ladder.tier)] ?? "",
          })}
          tone={ladder.tier === 4 ? "brand" : ladder.tier === 0 ? "neutral" : "success"}
        />
      </div>

      <ol className="mt-2.5 space-y-2.5">
        {VERIFICATION_ORDER.map((rung) => {
          const decision = ladder.rungs[rung.kind];
          // Only the rung immediately above the current tier can be passed. The
          // database enforces the same thing when it computes the tier; this is
          // so a reviewer is never offered a button that cannot help.
          const blocked = rung.step > ladder.tier + 1;

          return (
            <li
              key={rung.kind}
              className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
                  {rung.step}
                </span>
                <span className="text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
                  {copy.rung[rung.kind]}
                </span>
                <ui.StatusChip
                  label={
                    decision
                      ? decision.status === "passed"
                        ? copy.passed
                        : copy.failed
                      : copy.undecided
                  }
                  tone={
                    decision
                      ? decision.status === "passed"
                        ? "success"
                        : "danger"
                      : "warning"
                  }
                />
              </div>

              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {rung.evidence}
              </p>

              {decision && (
                <p className="mt-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">
                  {fill(copy.decidedBy, {
                    who: decision.decidedByName ?? common.someone,
                    when: ui.when(decision.decidedAt),
                  })}
                  {decision.note ? ` ${decision.note}` : ""}
                </p>
              )}

              {blocked ? (
                <p className="mt-2 text-[0.75rem] text-[var(--nf-content-muted)]">
                  {copy.blockedBelow}
                </p>
              ) : (
                <VerificationRungDecision
                  agentId={ladder.agentId}
                  kind={rung.kind}
                  copy={copy}
                  common={common}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ApplicationCard({
  application,
  ladder,
  copy,
  verificationCopy,
  common,
  ui,
}: {
  application: ApplicationView;
  ladder: AgentLadder | null;
  copy: AdminCopy["applications"];
  verificationCopy: AdminCopy["verification"];
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
            application.documentCount === 0
              ? copy.documentsNone
              : application.documentCount === 1
                ? copy.documentsOne
                : fill(copy.documentsCount, { count: application.documentCount })
          }
        />
        {/* The whole point of a verification queue is seeing the document, so
            each one is a real link. The bucket is private and these signatures
            are short lived, so nothing here is a durable public URL. */}
        {application.documents.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2 px-4 pb-3">
            {application.documents.map((doc) => {
              const label =
                copy.documentKinds[doc.kind as keyof typeof copy.documentKinds] ?? doc.kind;
              return (
                <li key={doc.id}>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="nf-chip text-[0.75rem]"
                    >
                      {label}
                      <span className="text-[var(--nf-content-muted)]">{copy.documentOpen}</span>
                    </a>
                  ) : (
                    <span className="nf-chip text-[0.75rem] opacity-60">
                      {label}
                      <span className="text-[var(--nf-content-muted)]">
                        {copy.documentUnavailable}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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

      {ladder && (
        <VerificationLadderPanel
          ladder={ladder}
          copy={verificationCopy}
          common={common}
          ui={ui}
        />
      )}
    </li>
  );
}

export default async function AdminAgentsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.applications;
  const verificationCopy = t.admin.verification;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const applications = await getAgentApplications();

  if (applications.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title={copy.title} lede={copy.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { waiting, decided } = applications.data;

  // Only an approved application has an agent row, so only those can carry a
  // ladder. An unavailable read is a missing block rather than a broken page:
  // the queue's real job is the decision above it.
  const ladders = await getVerificationLadders(
    [...waiting, ...decided]
      .filter((application) => application.status === "APPROVED")
      .map((application) => application.id),
  );
  const ladderFor = (id: string): AgentLadder | null =>
    ladders.state === "ok" ? (ladders.data.get(id) ?? null) : null;
  // Changes requested sits with the applicant, not with us, so it stays visible
  // in the list but is not counted as work waiting on the console.
  const onUs = waiting.filter((item) => item.status !== "MORE_INFO_REQUIRED").length;

  return (
    <div className="nf-console">
      <ui.QueueHeader title={copy.title} lede={copy.lede} count={onUs} />

      {waiting.length === 0 ? (
        <ui.QueueEmpty title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <ul className="nf-queue-list">
          {waiting.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              ladder={ladderFor(application.id)}
              copy={copy}
              verificationCopy={verificationCopy}
              common={common}
              ui={ui}
            />
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">{common.recentlyDecided}</h2>
          <ul className="nf-queue-list">
            {decided.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                ladder={ladderFor(application.id)}
                copy={copy}
                verificationCopy={verificationCopy}
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
