import type { Metadata } from "next";
import { getReports, type ReportView } from "@/lib/admin/queries";
import { ReportDecision } from "../_components/AdminActions";
import { QueueEmpty, QueueHeader, QueueUnavailable, StatusChip, formatWhen } from "../_components/ui";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Abuse and content reports raised by members.
 *
 * A report names what was reported and why, in the reporter's own words. The
 * three transitions are honest about effort: in review says somebody has it,
 * resolved says action was taken, dismissed says there was nothing to act on.
 */
function ReportCard({ report }: { report: ReportView }) {
  const closed = report.status === "resolved" || report.status === "dismissed";

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={report.status} />
        <StatusChip label={report.targetType} tone="neutral" />
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          {formatWhen(report.createdAt)}
        </span>
      </div>

      <p className="mt-2.5 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-[var(--nf-content-primary)]">
        {report.reason}
      </p>

      <p className="mt-2 break-words text-[0.75rem] text-[var(--nf-content-muted)]">
        Reported by {report.reporterName} against {report.targetType} {report.targetId}
      </p>

      {closed ? (
        <p className="mt-3 text-[0.75rem] text-[var(--nf-content-muted)]">
          Closed {formatWhen(report.resolvedAt)}. The decision is in the audit log.
        </p>
      ) : (
        <ReportDecision reportId={report.id} status={report.status} />
      )}
    </li>
  );
}

export default async function AdminReportsPage() {
  const reports = await getReports();

  if (reports.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <QueueHeader title="Reports" lede="Content and accounts members have reported to us." />
        <QueueUnavailable />
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
      <QueueHeader
        title="Reports"
        lede="What members told us was wrong: a listing, a review, a message or an account. The reporter sees their own report and nothing else, so this queue is where it actually gets answered."
        count={open.length}
      />

      {open.length === 0 ? (
        <QueueEmpty
          title="No open reports"
          body="Nothing is waiting on a decision. New reports arrive here as members raise them."
        />
      ) : (
        <ul className="space-y-3">
          {open.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">Recently closed</h2>
          <ul className="space-y-3">
            {closed.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
