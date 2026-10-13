import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readRetention } from "@/lib/admin/desk-reads/retention-read";
import { adminUi } from "../_components/ui";
import { fill } from "../_components/copy";
import { PageHead, Panel, PanelEmpty, PanelUnavailable } from "../_components/panels";
import { DestroyRecords } from "./DestroyRecords";

export const metadata: Metadata = { title: "Money record retention", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The most one destroy call touches; the number the confirmation must match is capped the same way. */
const BATCH = 500;

/**
 * MONEY-RECORD RETENTION. A careful, staff-only tool.
 *
 * `destroy_expired_money_records` removes a purged account's bank and payout
 * details once their retention date passes, and nothing in the app or the
 * schedule runs it. This desk shows exactly what is past its date (a dry run
 * through `staff_money_retention_preview`, which returns counts and dates and
 * no names, numbers or ids) and lets a super admin destroy it after typing the
 * confirmation. Both functions are in the pending migration ac01; until it is
 * applied the page says so and offers nothing.
 */
export default async function RetentionPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const c = t.adminCoverage.retention;
  const common = t.adminCoverage.common;
  const ui = adminUi(t, locale);
  const read = await readRetention();

  if (read.state === "forbidden") {
    return (
      <div className="nf-admin-stack">
        <PageHead title={c.title} lede={common.noAccessBody} />
        <PanelEmpty title={common.noAccessTitle} body={common.noAccessBody} />
      </div>
    );
  }

  if (read.state === "not_installed") {
    return (
      <div className="nf-admin-stack" data-testid="retention">
        <PageHead title={c.title} lede={c.lede} />
        <Panel>
          <PanelEmpty title={c.notInstalledTitle} body={c.notInstalledBody} />
        </Panel>
      </div>
    );
  }

  if (read.state !== "ok") {
    return (
      <div className="nf-admin-stack" data-testid="retention">
        <PageHead title={c.title} lede={c.lede} />
        <Panel>
          <PanelUnavailable what={c.previewPanel} locale={locale} />
        </Panel>
      </div>
    );
  }

  const { preview, canDestroy } = read;
  const touching = Math.min(preview.due, BATCH);

  return (
    <div className="nf-admin-stack" data-testid="retention">
      <PageHead title={c.title} lede={c.lede} />
      <ui.StatRow>
        <ui.Stat label={c.dueLabel} value={String(preview.due)} hint={c.dueHint} tone={preview.due > 0 ? "warning" : "success"} />
        <ui.Stat label={c.keptLabel} value={String(preview.kept)} hint={c.keptHint} />
        <ui.Stat label={c.nextLabel} value={preview.nextDue ? ui.day(preview.nextDue) : c.nextNone} />
      </ui.StatRow>

      <Panel title={c.previewPanel} id="retention-preview" flush={preview.rows.length > 0}>
        {preview.rows.length === 0 ? (
          <PanelEmpty title={c.emptyTitle} body={c.emptyBody} />
        ) : (
          <>
            <p className="nf-body-sm px-card pt-card text-content-2">{c.previewHint}</p>
            <div className="nf-admin-dt-wrap" tabIndex={0} role="region" aria-label={fill(common.tableOf, { name: c.previewPanel })}>
              <table className="nf-admin-dt">
                <thead>
                  <tr>
                    <th scope="col">{c.columnAccount}</th>
                    <th scope="col">{c.columnDue}</th>
                    <th scope="col" className="text-right">
                      {c.columnBank}
                    </th>
                    <th scope="col" className="text-right">
                      {c.columnPayout}
                    </th>
                    <th scope="col" className="text-right">
                      {c.columnWallet}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.requestId}>
                      <td className="font-mono">{row.requestId.slice(0, 8)}</td>
                      <td>{ui.day(row.retainUntil)}</td>
                      <td className="text-right tabular-nums">{row.bankAccounts}</td>
                      <td className="text-right tabular-nums">
                        {row.payoutHeld ? <ui.StatusChip label={c.payoutHeld} tone="info" /> : row.payoutAccounts}
                      </td>
                      <td className="text-right tabular-nums">{row.walletEntries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.due > preview.rows.length && (
              <p className="nf-caption px-card pb-card">{fill(c.previewMore, { shown: preview.rows.length, total: preview.due })}</p>
            )}
          </>
        )}
      </Panel>

      {preview.due > 0 && (
        <Panel title={c.destroyTitle} id="retention-destroy">
          {canDestroy ? (
            <DestroyRecords
              expected={touching}
              totals={{ bank: preview.bankAccounts, payout: preview.payoutAccounts, wallet: preview.walletEntries }}
              copy={c}
              cancel={common.cancel}
            />
          ) : (
            <p className="nf-body-sm max-w-[68ch] text-content-2">{c.refused.forbidden}</p>
          )}
        </Panel>
      )}
    </div>
  );
}
