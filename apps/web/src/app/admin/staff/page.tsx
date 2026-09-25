import type { Metadata } from "next";
import { STAFF_SCOPE_LABEL, STAFF_SCOPES } from "@/lib/admin/guard";
import { readStaffDesk } from "@/lib/admin/staff-queries";
import { PageHead, Panel } from "../_components/panels";
import { GrantStaffForm, RevokeStaffForm } from "./StaffForms";

export const metadata: Metadata = { title: "Staff", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) : "not yet";

/**
 * TRACK K: THE STAFF DESK. Only the founder's super admin account opens it,
 * and the database refuses a grant from anybody else whatever this page does.
 */
export default async function StaffPage() {
  const desk = await readStaffDesk();
  if (desk.state === "forbidden") {
    return (
      <div className="nf-console">
        <PageHead title="Staff" lede="Only the founder's super admin account can see or change staff access." />
      </div>
    );
  }
  return (
    <div className="nf-console" data-testid="staff-desk">
      <PageHead
        title="Staff"
        lede="Give a person access to named desks only. They are told by email and in the app exactly what they were given, nothing unlocks until they acknowledge the handbook, and every action they take is in the audit log."
      />
      <Panel title="Give access">
        <GrantStaffForm scopes={STAFF_SCOPES.map((s) => ({ value: s, label: STAFF_SCOPE_LABEL[s] }))} />
      </Panel>
      <Panel title="Staff">
        {desk.state !== "ok" ? (
          <p className="nf-body">Staff could not be read just now. Refresh to try again.</p>
        ) : desk.rows.length === 0 ? (
          <p className="nf-body text-[var(--nf-content-secondary)]">Nobody holds staff access yet.</p>
        ) : (
          <ul className="nf-admin-queue">
            {desk.rows.map((row) => (
              <li key={row.userId} className="nf-admin-queue-row" data-revoked={row.revokedAt ? "true" : "false"}>
                <p className="font-semibold">{row.name}</p>
                <p className="nf-body text-[var(--nf-content-secondary)]">
                  {row.scopes.map((s) => STAFF_SCOPE_LABEL[s]).join(", ")} · given {when(row.grantedAt)} · handbook{" "}
                  {when(row.handbookAcknowledgedAt)} · {row.actionsLast30} actions in 30 days
                  {row.revokedAt ? ` · ended ${when(row.revokedAt)}: ${row.revokeReason ?? ""}` : ""}
                </p>
                {row.note ? <p className="nf-caption">{row.note}</p> : null}
                {!row.revokedAt ? <RevokeStaffForm userId={row.userId} /> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {desk.state === "ok" ? (
        <Panel title="What staff did, last 30 days">
          {desk.recent.length === 0 ? (
            <p className="nf-body text-[var(--nf-content-secondary)]">No staff actions yet.</p>
          ) : (
            <ul className="grid gap-2xs">
              {desk.recent.map((a, i) => (
                <li key={`${a.at}-${i}`} className="nf-body">
                  {when(a.at)} · {a.actor} · {a.action} · {a.entity}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
