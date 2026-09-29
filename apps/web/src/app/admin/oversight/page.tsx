import type { Metadata } from "next";
import Link from "next/link";
import { STAFF_SCOPE_LABEL } from "@/lib/admin/guard";
import { readOversight } from "@/lib/admin/oversight";
import { PageHead, Panel } from "../_components/panels";

export const metadata: Metadata = { title: "Team oversight", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) : "none";

function age(iso: string | null, now: number): string {
  if (!iso) return "nothing waiting";
  const hours = Math.max(0, Math.floor((now - Date.parse(iso)) / 3_600_000));
  return hours < 48 ? `${hours} h` : `${Math.floor(hours / 24)} days`;
}

/**
 * TEAM OVERSIGHT: what is waiting, for how long, and who has been deciding.
 * For admins and the operations scope. Both tables download as CSV.
 */
export default async function OversightPage() {
  const read = await readOversight();
  const now = requestTime();
  if (read.state === "forbidden") {
    return (
      <div className="nf-console">
        <PageHead title="Team oversight" lede="This desk is for admins and the operations team." />
      </div>
    );
  }
  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <PageHead title="Team oversight" lede="The figures could not be read just now. Refresh to try again." />
      </div>
    );
  }
  return (
    <div className="nf-console" data-testid="oversight">
      <PageHead
        title="Team oversight"
        lede="Every queue's backlog and its oldest item, and each staff member's work over the last 30 days, read from the records themselves."
      />
      <Panel title="Backlog by queue">
        <p className="nf-caption">
          <Link className="text-[var(--nf-content-link)] underline" href="/admin/oversight/export?kind=backlog">
            Download CSV
          </Link>
        </p>
        <table className="mt-xs w-full text-left nf-body">
          <thead>
            <tr>
              <th scope="col">Queue</th>
              <th scope="col">Desk</th>
              <th scope="col">Waiting</th>
              <th scope="col">Oldest waiting</th>
            </tr>
          </thead>
          <tbody>
            {read.backlog.map((row) => (
              <tr key={row.queue}>
                <td>
                  <Link className="text-[var(--nf-content-link)] hover:underline" href={row.href}>
                    {row.queue}
                  </Link>
                </td>
                <td>{STAFF_SCOPE_LABEL[row.scope]}</td>
                <td className="nf-numeric">{row.waiting}</td>
                <td>{age(row.oldestAt, now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Work by staff member, last 30 days">
        <p className="nf-caption">
          <Link className="text-[var(--nf-content-link)] underline" href="/admin/oversight/export?kind=throughput">
            Download CSV
          </Link>
        </p>
        {read.throughput.length === 0 ? (
          <p className="nf-body text-[var(--nf-content-secondary)]">No staff decisions in the last 30 days.</p>
        ) : (
          <table className="mt-xs w-full text-left nf-body">
            <thead>
              <tr>
                <th scope="col">Staff member</th>
                <th scope="col">Actions</th>
                <th scope="col">Most often</th>
                <th scope="col">Last action</th>
              </tr>
            </thead>
            <tbody>
              {read.throughput.map((row) => {
                const top = Object.entries(row.byAction)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([action, n]) => `${action} (${n})`)
                  .join(", ");
                return (
                  <tr key={row.actorId}>
                    <td>{row.name}</td>
                    <td className="nf-numeric">{row.total}</td>
                    <td>{top}</td>
                    <td>{when(row.lastAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/** The request's clock, read once so every age on the page agrees. */
function requestTime(): number {
  return Date.now();
}
