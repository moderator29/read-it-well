import { formatNumber } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getFunnel, getReferralCounts } from "@/lib/admin/reads/front-door";
import { byLocale, conversion, DESK_LABELS, DESK_ORDER, totals } from "@/lib/funnel/summary";
import { PageHead, Panel } from "../_components/panels";

export const dynamic = "force-dynamic";

/**
 * A6. The Front door desk: how many visits reach each step of joining, over
 * 7 and 30 days, with the step-to-step conversion, split by language; and
 * (A5) confirmed sign-ups by invite code. First party only
 * (`public.funnel_events`, 90-day retention). Until the pending migrations
 * are applied the desk says so instead of printing zeros.
 */
export default async function FrontDoorDeskPage() {
  const locale = await getLocale();
  const [week, month, invites] = await Promise.all([getFunnel(7), getFunnel(30), getReferralCounts(30)]);
  const n = (value: number | undefined) => (value === undefined ? "–" : formatNumber(value, locale));

  const weekTotals = week.state === "ok" ? totals(week.data) : null;
  const monthTotals = month.state === "ok" ? totals(month.data) : null;

  return (
    <>
      <PageHead
        title="Front door"
        lede="How many visits reach each step of joining Vallo, first party and without trackers. Visits are counted once per step; accounts come from sign-in records."
      />
      <Panel title="The funnel" id="front-door-funnel" flush>
        {monthTotals === null ? (
          <p className="nf-body-sm nf-admin-panel__pad text-[var(--nf-content-secondary)]">
            The funnel is not recorded yet. It starts when the pending migration for the front door funnel is applied.
          </p>
        ) : (
          <div className="nf-admin-dt-wrap">
            <table className="nf-admin-dt">
              <thead>
                <tr>
                  <th scope="col">Step</th>
                  <th scope="col" className="text-right">7 days</th>
                  <th scope="col" className="text-right">From the step before</th>
                  <th scope="col" className="text-right">30 days</th>
                  <th scope="col" className="text-right">From the step before</th>
                </tr>
              </thead>
              <tbody>
                {DESK_ORDER.map((step, index) => {
                  const prev = index > 0 ? DESK_ORDER[index - 1] : undefined;
                  const w = conversion(prev ? weekTotals?.get(prev) : undefined, weekTotals?.get(step));
                  const m = conversion(prev ? monthTotals.get(prev) : undefined, monthTotals.get(step));
                  return (
                    <tr key={step}>
                      <th scope="row">{DESK_LABELS[step]}</th>
                      <td className="nf-numeric text-right">{n(weekTotals?.get(step) ?? 0)}</td>
                      <td className="nf-numeric text-right">{w === null ? "" : `${w}%`}</td>
                      <td className="nf-numeric text-right">{n(monthTotals.get(step) ?? 0)}</td>
                      <td className="nf-numeric text-right">{m === null ? "" : `${m}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {month.state === "ok" && (
        <Panel title="Landing views by language, 30 days" id="front-door-locale">
          <ul className="grid gap-xs">
            {byLocale(month.data, "landing_view").map(([code, visits]) => (
              <li key={code} className="flex justify-between">
                <span>{code.toUpperCase()}</span>
                <span className="nf-numeric">{n(visits)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Confirmed sign-ups by invite code, 30 days" id="front-door-invites">
        {invites.state !== "ok" ? (
          <p className="nf-body-sm text-[var(--nf-content-secondary)]">
            Invite codes are not recorded yet. They start when the pending migration for invite codes is applied.
          </p>
        ) : invites.data.length === 0 ? (
          <p className="nf-body-sm text-[var(--nf-content-secondary)]">No confirmed sign-up has used an invite code in the last 30 days.</p>
        ) : (
          <ul className="grid gap-xs">
            {invites.data.map((row) => (
              <li key={row.code} className="flex justify-between gap-md">
                <span>
                  <span className="nf-numeric font-semibold">{row.code}</span> {row.firstName ?? ""}
                </span>
                <span className="nf-numeric">{n(row.confirmed)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
