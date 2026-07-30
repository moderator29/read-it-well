import type { Metadata } from "next";
import { getRiskAlerts, type AlertView } from "@/lib/admin/queries";
import { AlertResolve } from "../_components/AdminActions";
import {
  QueueEmpty,
  QueueHeader,
  QueueUnavailable,
  StatusChip,
  formatWhen,
  type Tone,
} from "../_components/ui";

export const metadata: Metadata = { title: "Risk alerts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SEVERITY_TONE: Record<AlertView["severity"], Tone> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

const SEVERITY_LABEL: Record<AlertView["severity"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/**
 * Risk alerts: the cases that outlive a single flag.
 *
 * An escalated message flag opens one, and anything else the platform judges
 * worth a human look lands here too. An alert stays open until somebody says
 * what was done about it, which is why resolving asks for a note.
 */
function AlertCard({ alert }: { alert: AlertView }) {
  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={alert.status} />
        <StatusChip label={`${SEVERITY_LABEL[alert.severity]} severity`} tone={SEVERITY_TONE[alert.severity]} />
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          {formatWhen(alert.createdAt)}
        </span>
      </div>

      <h3 className="mt-2.5 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
        {alert.title}
      </h3>
      {alert.description && (
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {alert.description}
        </p>
      )}

      {alert.entityType && (
        <p className="mt-2 break-words text-[0.75rem] text-[var(--nf-content-muted)]">
          Attached to {alert.entityType} {alert.entityId ?? ""}
        </p>
      )}

      {alert.status === "open" ? (
        <AlertResolve alertId={alert.id} />
      ) : (
        <p className="mt-3 text-[0.75rem] text-[var(--nf-content-muted)]">
          Resolved {formatWhen(alert.resolvedAt)}. The note is in the audit log.
        </p>
      )}
    </li>
  );
}

export default async function AdminAlertsPage() {
  const alerts = await getRiskAlerts();

  if (alerts.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <QueueHeader title="Risk alerts" lede="Cases raised for the operations team to work." />
        <QueueUnavailable />
      </div>
    );
  }

  const open = alerts.data.filter((alert) => alert.status === "open");
  const resolved = alerts.data.filter((alert) => alert.status !== "open");

  return (
    <div className="mx-auto max-w-3xl">
      <QueueHeader
        title="Risk alerts"
        lede="Cases that need a person, not a rule: escalated message flags and anything else the platform judged worth a second look. An alert stays open until somebody records what was done."
        count={open.length}
      />

      {open.length === 0 ? (
        <QueueEmpty
          title="No open alerts"
          body="Nothing is waiting. Escalating a message flag opens an alert here."
        />
      ) : (
        <ul className="space-y-3">
          {open.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">Recently resolved</h2>
          <ul className="space-y-3">
            {resolved.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
