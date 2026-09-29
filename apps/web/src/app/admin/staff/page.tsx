import type { Metadata } from "next";
import { STAFF_SCOPE_LABEL, STAFF_SCOPES } from "@/lib/admin/guard";
import { readStaffDesk, type StaffRow } from "@/lib/admin/staff-queries";
import { JOB_DESCRIPTIONS, STAFF_POSITIONS, positionTitle } from "@/lib/admin/staff-positions";
import { PageHead, Panel } from "../_components/panels";
import { GrantStaffForm, RevokeStaffForm } from "./StaffForms";
import { SupportTeam, type SupportMember } from "./SupportTeam";

export const metadata: Metadata = { title: "Staff", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) : "not yet";

/**
 * TRACK K: THE STAFF DESK. Only the founder's super admin account opens it,
 * and the database refuses a grant from anybody else whatever this page does.
 */
/** Everybody who can answer members: support grants, plus admins through their role. */
function supportMembers(rows: StaffRow[]): SupportMember[] {
  return rows
    .filter((r) => !r.revokedAt && (r.kind !== "staff" || r.scopes.includes("support")))
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      role: r.kind === "super_admin" ? "Super admin" : r.kind === "admin" ? "Admin" : (positionTitle(r.position) ?? "Staff"),
      alsoHolds: r.kind === "staff" ? r.scopes.filter((s) => s !== "support").map((s) => STAFF_SCOPE_LABEL[s]) : [],
      viaRole: r.kind !== "staff",
      lastActive: when(r.lastActiveAt),
      supportActions: r.supportActionsLast30,
      handbookAcknowledged: r.kind !== "staff" || r.handbookAcknowledgedAt !== null,
    }));
}

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
        <GrantStaffForm
          scopes={STAFF_SCOPES.map((s) => ({ value: s, label: STAFF_SCOPE_LABEL[s] }))}
          positions={STAFF_POSITIONS.map((p) => ({
            value: p,
            label: JOB_DESCRIPTIONS[p].title,
            summary: JOB_DESCRIPTIONS[p].summary,
            scopes: JOB_DESCRIPTIONS[p].scopes,
          }))}
        />
      </Panel>
      {desk.state === "ok" ? (
        <Panel title="Support team" id="support-team">
          <SupportTeam members={supportMembers(desk.rows)} />
        </Panel>
      ) : null}
      <Panel title="Everybody who can act in the console">
        {desk.state !== "ok" ? (
          <p className="nf-body">Staff could not be read just now. Refresh to try again.</p>
        ) : desk.rows.length === 0 ? (
          <p className="nf-body text-[var(--nf-content-secondary)]">Nobody holds staff access yet.</p>
        ) : (
          <ul className="nf-admin-queue">
            {desk.rows.map((row) => (
              <li key={row.userId} className="nf-admin-queue-row" data-revoked={row.revokedAt ? "true" : "false"}>
                <p className="font-semibold">
                  {row.name}
                  <span className="nf-caption text-[var(--nf-content-secondary)]">
                    {" · "}
                    {row.kind === "super_admin"
                      ? "Super admin"
                      : row.kind === "admin"
                        ? "Admin"
                        : (positionTitle(row.position) ?? "Staff")}
                  </span>
                </p>
                <p className="nf-body text-[var(--nf-content-secondary)]">
                  {row.kind === "staff" ? row.scopes.map((s) => STAFF_SCOPE_LABEL[s]).join(", ") : "Every desk"}
                  {row.grantedAt ? ` · given ${when(row.grantedAt)}` : ""}
                  {row.grantedBy ? ` by ${row.grantedBy}` : ""} · handbook {when(row.handbookAcknowledgedAt)} · last
                  active {when(row.lastActiveAt)} · {row.actionsLast30} actions in 30 days
                  {row.revokedAt
                    ? ` · ended ${when(row.revokedAt)}${row.revokedBy ? ` by ${row.revokedBy}` : ""}: ${row.revokeReason ?? ""}`
                    : ""}
                </p>
                {row.note ? <p className="nf-caption">{row.note}</p> : null}
                {row.kind === "staff" && !row.revokedAt ? <RevokeStaffForm userId={row.userId} /> : null}
                {row.kind !== "staff" ? (
                  <p className="nf-caption text-[var(--nf-content-secondary)]">
                    Admin roles change only through the founder&apos;s database runbook, never from this page.
                  </p>
                ) : null}
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
