import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { isSupportTab } from "@/lib/admin/support-workspace";
import { StaffFrame } from "@/app/admin/_components/StaffFrame";
import { Panel } from "@/app/admin/_components/panels";
import { SupportDesk } from "@/app/admin/support/SupportDesk";
import { SupportTeam } from "@/app/admin/staff/SupportTeam";
import { ConsoleFrame } from "../bd/ConsoleFrame";
import { detailFor, NOW, ROWS, STAFF } from "./fixtures";

/**
 * THE SUPPORT DESK AND THE SUPPORT TEAM PANEL, on fixtures. The real desk
 * sits behind the console's security key, which this sandbox cannot prove,
 * so the same components are drawn here around invented tickets. Only the
 * proof of the look; every button still calls the real server action, which
 * refuses without a session.
 *
 *   ?ticket=refund|safety|guest|none   which ticket is open
 *   ?tab=<lane>                         which lane
 *   ?installed=0                        the escalation migration not applied
 *   ?mode=escalated                     a money desk holder opening a hand-off
 *   ?queue=empty                        nobody waiting
 *   ?view=team                          the team console's Support panel
 *   ?as=admin                           inside the operator's rail
 */
export default async function SupportStaffPreview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const t = getDictionary("en");
  const pick = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const installed = pick("installed") !== "0";
  const mode = pick("mode") === "escalated" ? "escalated" : "support";

  if (pick("view") === "team") {
    return (
      <div className="px-gutter py-md">
        <StaffFrame staff={{ ...STAFF, isSuperAdmin: true, scopes: [], position: null }} name="Founder">
          <Panel title="Support team" id="support-team">
            <SupportTeam
              members={[
                { userId: "30000000-0000-4000-8000-000000000001", name: "Ifeoma Eze", role: "Support Agent", alsoHolds: [], viaRole: false, lastActive: "29 Sept 2026, 13:40", supportActions: 142, handbookAcknowledged: true },
                { userId: "30000000-0000-4000-8000-000000000002", name: "Kelechi Uba", role: "Operations Manager", alsoHolds: ["Agreement approval", "Operations"], viaRole: false, lastActive: "29 Sept 2026, 11:05", supportActions: 37, handbookAcknowledged: true },
                { userId: "30000000-0000-4000-8000-000000000003", name: "Zainab Musa", role: "Support Agent", alsoHolds: [], viaRole: false, lastActive: "not yet", supportActions: 0, handbookAcknowledged: false },
                { userId: "30000000-0000-4000-8000-000000000004", name: "Founder", role: "Super admin", alsoHolds: [], viaRole: true, lastActive: "29 Sept 2026, 13:58", supportActions: 4, handbookAcknowledged: true },
              ]}
            />
          </Panel>
        </StaffFrame>
      </div>
    );
  }

  const which = pick("ticket") || "refund";
  const id =
    which === "none"
      ? null
      : (ROWS.find((r) =>
          which === "safety" ? r.topic === "safety" : which === "guest" ? !r.hasAccount : r.reference === "NF-SUP-3M8D",
        )?.id ?? null);
  const rows = pick("queue") === "empty" ? [] : ROWS;
  const tab = isSupportTab(p.tab) ? p.tab : "open";
  const desk = (
    <SupportDesk
      now={NOW}
      tab={tab}
      q=""
      queue={mode === "escalated" ? { state: "none" } : { state: "ok", rows, escalationsInstalled: installed }}
      selected={id && rows.length ? detailFor(id, { escalationsInstalled: installed, mode }) : null}
      missing={null}
      copy={t.admin.support}
    />
  );

  if (pick("as") === "admin") return <ConsoleFrame t={t}>{desk}</ConsoleFrame>;
  return (
    <div className="px-gutter py-md">
      <StaffFrame
        staff={mode === "escalated" ? { ...STAFF, scopes: ["finance"], position: "finance_officer" } : STAFF}
        name={mode === "escalated" ? "Dayo Finance" : "Ifeoma Eze"}
      >
        {desk}
      </StaffFrame>
      <p className="mt-lg nf-caption text-[var(--nf-content-muted)]">
        Preview harness.{" "}
        <Link className="underline" href="/preview/support-staff?view=team">
          Support team panel
        </Link>
      </p>
    </div>
  );
}
