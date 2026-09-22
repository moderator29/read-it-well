import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentApplications, type ApplicationView } from "@/lib/admin/queries";
import { getVerificationLadders, type AgentLadder } from "@/lib/admin/verification-queries";
import { VERIFICATION_ORDER } from "@/lib/trust/verification";
import { ApplicationDecision, VerificationRungDecision } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";
import { QueueTable, type QueueRowData } from "../_components/QueueTable";
import { DocumentViewer } from "../_components/DocumentViewer";
import {
  QueueFilters,
  queueNarrowed,
  readQueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { Constants } from "@/lib/supabase/database.types";

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
    <section className="mt-md" aria-label={copy.title}>
      <div className="flex flex-wrap items-center gap-xs">
        <h4 className="nf-overline text-[var(--nf-content-muted)]">
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

      <ol className="mt-xs space-y-xs">
        {VERIFICATION_ORDER.map((rung) => {
          const decision = ladder.rungs[rung.kind];
          // Only the rung immediately above the current tier can be passed. The
          // database enforces the same thing when it computes the tier; this is
          // so a reviewer is never offered a button that cannot help.
          const blocked = rung.step > ladder.tier + 1;

          return (
            <li
              key={rung.kind}
              className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-sm"
            >
              <div className="flex flex-wrap items-center gap-xs">
                <span className="nf-numeric text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                  {rung.step}
                </span>
                <span className="text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
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

              <p className="mt-2xs text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
                {rung.evidence}
              </p>

              {decision && (
                <p className="mt-2xs text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                  {fill(copy.decidedBy, {
                    who: decision.decidedByName ?? common.someone,
                    when: ui.when(decision.decidedAt),
                  })}
                  {decision.note ? ` ${decision.note}` : ""}
                </p>
              )}

              {blocked ? (
                <p className="mt-xs text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
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
    <li className="nf-card p-md sm:p-lg">
      <div className="flex flex-wrap items-center gap-xs">
        <ui.StatusChip status={application.status} />
        <ui.StatusChip
          label={application.type === "business" ? copy.business : copy.individual}
          tone="neutral"
        />
        <span className="nf-numeric text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {application.reference}
        </span>
      </div>

      <h3 className="mt-xs text-[var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
        {application.fullName ?? copy.nameMissing}
      </h3>
      <p className="mt-3xs text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
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
            each one opens. It used to open on `supabase.co`, in a new tab,
            behind a signed URL that sat in this page's DOM; it opens in a
            Vallo sheet now and no URL is handed out at all. */}
        {application.documents.length > 0 && (
          <ul className="mt-xs flex flex-wrap gap-xs px-md pb-sm">
            {application.documents.map((doc) => {
              const label =
                copy.documentKinds[doc.kind as keyof typeof copy.documentKinds] ?? doc.kind;
              return (
                <li key={doc.id}>
                  <DocumentViewer
                    documentId={doc.id}
                    media={doc.media}
                    label={`${label} ${copy.documentOpen}`}
                    title={label}
                    className="nf-chip text-[var(--nf-text-overline)]"
                  />
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
        <p className="mt-md text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
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

/**
 * The chips, from `agent_application_status`.
 *
 * Seven values including DRAFT, which no bucket on this screen holds. It is
 * offered anyway and returns nothing, because a chip list built from the enum
 * is a chip list that cannot go stale, and an operator who picks it learns
 * something true: drafts are not submitted and are not the console's business.
 */
function statusFilters(ui: AdminUi): readonly QueueStatusOption[] {
  return Constants.public.Enums.agent_application_status.map((value) => ({
    value,
    label: ui.statusLabel(value),
  }));
}

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.applications;
  const verificationCopy = t.admin.verification;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  /* The shared queue frame. This queue read the newest thirty waiting and ten
     decided and printed all of them, with no way to search a name, so an
     operator asked "what happened to Adaeze's application" had to scroll. No
     pager here on purpose: see the note on `getAgentApplications`. */
  const params = await searchParams;
  const query = readQueueQuery(params);
  const narrowed = queueNarrowed(query);
  const applications = await getAgentApplications({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });

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

      <QueueFilters
        base="/admin/agents"
        query={query}
        common={common}
        statuses={statusFilters(ui)}
        searchPlaceholder="Search by name or business"
      />

      {waiting.length === 0 && decided.length === 0 && narrowed ? (
        /* A SEARCH THAT MATCHED NOTHING IS NOT A CLEARANCE. This drew the
           emerald tick, so "all clear" was shown over a queue that may hold
           hundreds of rows, none of them matching. The third state says what
           this actually is: the result of the operator's own filter. */
        <ui.QueueEmpty
          title={common.noMatchTitle}
          body={common.noMatchBody}
          state="no-match"
        />
      ) : waiting.length === 0 ? (
        /* Narrowed, this section says nothing at all: "nothing is waiting" is
           false to somebody who has just asked to see the decided ones, and the
           one no-match panel above already answers for the screen. */
        narrowed ? null : (
          /* A TICK IS EARNED, AND HERE IT IS EARNED EXACTLY. An emerald tick on
             "nothing is waiting" means somebody cleared this queue. That is
             true when applications have been decided and it is a lie when none
             has ever arrived, which is the state this table is in today.
             `decided` answers it without another read. F2-056. */
          <ui.QueueEmpty
            title={copy.emptyTitle}
            body={copy.emptyBody}
            everHadRows={decided.length > 0}
          />
        )
      ) : (
        <QueueTable
          label="Agent applications"
          rows={waiting.map((application) => ({
            ...applicationRow(application, ui),
            children: (
              <ul className="nf-queue-list">
                <ApplicationCard
                  key={application.id}
                  application={application}
                  ladder={ladderFor(application.id)}
                  copy={copy}
                  verificationCopy={verificationCopy}
                  common={common}
                  ui={ui}
                />
              </ul>
            ),
          }))}
        />
      )}

      {decided.length > 0 && (
        <section className="mt-xl">
          <h2 className="nf-h3 mb-sm text-[var(--nf-text-body)]">{common.recentlyDecided}</h2>
          <QueueTable
          label="Agent applications"
          rows={decided.map((application) => ({
            ...applicationRow(application, ui),
            children: (
              <ul className="nf-queue-list">
                <ApplicationCard
                    key={application.id}
                    application={application}
                    ladder={ladderFor(application.id)}
                    copy={copy}
                    verificationCopy={verificationCopy}
                    common={common}
                    ui={ui}
                  />
              </ul>
            ),
          }))}
        />
        </section>
      )}
    </div>
  );
}

/** The dense row an application takes in the console table. */
function applicationRow(application: ApplicationView, ui: AdminUi): QueueRowData {
  return {
    id: application.id,
    reference: application.reference,
    type: "Agent",
    icon: "user",
    title: application.fullName ?? application.businessName ?? application.reference,
    place: [application.city, application.stateCode].filter(Boolean).join(", "),
    detail: application.type === "business" ? "Business agent" : "Individual agent",
    detailSub: application.email ?? undefined,
    status: application.status,
    statusLabel: ui.statusLabel(application.status),
    submitted: ui.when(application.submittedAt ?? application.createdAt),
  };
}
