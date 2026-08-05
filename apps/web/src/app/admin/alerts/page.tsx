import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getRiskAlerts, type AlertView } from "@/lib/admin/queries";
import { AlertResolve } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";
import type { StatusTone } from "@/components/ui/StatusPill";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.alerts.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

const SEVERITY_TONE: Record<AlertView["severity"], StatusTone> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

/**
 * Risk alerts: the cases that outlive a single flag.
 *
 * An escalated message flag opens one, and anything else the platform judges
 * worth a human look lands here too. An alert stays open until somebody says
 * what was done about it, which is why resolving asks for a note.
 */
function AlertCard({
  alert,
  copy,
  common,
  ui,
}: {
  alert: AlertView;
  copy: AdminCopy["alerts"];
  common: AdminCommon;
  ui: AdminUi;
}) {
  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ui.StatusChip status={alert.status} />
        <ui.StatusChip
          label={fill(copy.severityChip, { level: copy.severity[alert.severity] })}
          tone={SEVERITY_TONE[alert.severity]}
        />
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          {ui.when(alert.createdAt)}
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
          {fill(copy.attachedTo, { type: alert.entityType, id: alert.entityId ?? "" }).trim()}
        </p>
      )}

      {alert.status === "open" ? (
        <AlertResolve alertId={alert.id} copy={copy} common={common} />
      ) : (
        <p className="mt-3 text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(copy.resolvedWhen, { when: ui.when(alert.resolvedAt) })} {common.noteInAuditLog}
        </p>
      )}
    </li>
  );
}

export default async function AdminAlertsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.alerts;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const alerts = await getRiskAlerts();

  if (alerts.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <ui.QueueHeader title={copy.title} lede={copy.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const open = alerts.data.filter((alert) => alert.status === "open");
  const resolved = alerts.data.filter((alert) => alert.status !== "open");

  return (
    <div className="mx-auto max-w-3xl">
      <ui.QueueHeader title={copy.title} lede={copy.lede} count={open.length} />

      {open.length === 0 ? (
        <ui.QueueEmpty title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <ul className="space-y-3">
          {open.map((alert) => (
            <AlertCard key={alert.id} alert={alert} copy={copy} common={common} ui={ui} />
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">{common.recentlyResolved}</h2>
          <ul className="space-y-3">
            {resolved.map((alert) => (
              <AlertCard key={alert.id} alert={alert} copy={copy} common={common} ui={ui} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
