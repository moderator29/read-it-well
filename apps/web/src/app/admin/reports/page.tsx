import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getReports, type ReportView } from "@/lib/admin/queries";
import { ReportDecision } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.reports.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * Abuse and content reports raised by members.
 *
 * A report names what was reported and why, in the reporter's own words. The
 * three transitions are honest about effort: in review says somebody has it,
 * resolved says action was taken, dismissed says there was nothing to act on.
 */
function ReportCard({
  report,
  copy,
  common,
  ui,
}: {
  report: ReportView;
  copy: AdminCopy["reports"];
  common: AdminCommon;
  ui: AdminUi;
}) {
  const closed = report.status === "resolved" || report.status === "dismissed";

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ui.StatusChip status={report.status} />
        <ui.StatusChip label={report.targetType} tone="neutral" />
        {/* The category is what a reviewer triages on, so it sits with the
            status rather than being buried in the body. Rows filed before
            categories existed simply do not carry one. */}
        {report.category && (
          <ui.StatusChip label={report.category.replace(/_/g, " ")} tone="info" />
        )}
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          {ui.when(report.createdAt)}
        </span>
      </div>

      <p className="mt-2.5 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-[var(--nf-content-primary)]">
        {report.reason}
      </p>

      <p className="mt-2 break-words text-[0.75rem] text-[var(--nf-content-muted)]">
        {fill(copy.reportedBy, {
          reporter: report.reporterName,
          type: report.targetType,
          id: report.targetId,
        })}
      </p>

      {closed ? (
        <p className="mt-3 text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(copy.closedWhen, { when: ui.when(report.resolvedAt) })} {common.inAuditLog}
        </p>
      ) : (
        <ReportDecision
          reportId={report.id}
          status={report.status}
          copy={copy}
          common={common}
        />
      )}
    </li>
  );
}

export default async function AdminReportsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.reports;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const reports = await getReports();

  if (reports.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <ui.QueueHeader title={copy.title} lede={copy.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const open = reports.data.filter(
    (report) => report.status === "open" || report.status === "reviewing",
  );
  const closed = reports.data.filter(
    (report) => report.status === "resolved" || report.status === "dismissed",
  );

  return (
    <div className="mx-auto max-w-3xl">
      <ui.QueueHeader title={copy.title} lede={copy.lede} count={open.length} />

      {open.length === 0 ? (
        <ui.QueueEmpty title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <ul className="space-y-3">
          {open.map((report) => (
            <ReportCard key={report.id} report={report} copy={copy} common={common} ui={ui} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">{common.recentlyClosed}</h2>
          <ul className="space-y-3">
            {closed.map((report) => (
              <ReportCard key={report.id} report={report} copy={copy} common={common} ui={ui} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
