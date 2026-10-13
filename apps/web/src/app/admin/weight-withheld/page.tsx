import type { Metadata } from "next";
import { formatNumber, getDictionary } from "@vallo/i18n";
import { fill } from "../_components/copy";
import { getLocale } from "@/lib/locale";
import { readWeightWithheld } from "@/lib/admin/desk-reads/weight-withheld";
import { adminUi } from "../_components/ui";
import { PageHead, Panel, PanelEmpty, PanelUnavailable } from "../_components/panels";
import { ClearStamp } from "./ClearStamp";

export const metadata: Metadata = { title: "Withheld weight", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * V-58: WITHHELD WEIGHT.
 *
 * Every review or report whose author shares a mailbox, a confirmed phone, a
 * card or a bank account with the lister is stamped and does not count. This
 * desk is where staff read those stamps and, when two accounts turn out to be
 * two people, clear one with a written reason. The register itself is closed
 * to the browser; both the read and the clear are admin-only database
 * functions (`weight_withheld_reasons`, `clear_weight_withheld`).
 */
export default async function WeightWithheldPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const c = t.adminCoverage.weightWithheld;
  const common = t.adminCoverage.common;
  const ui = adminUi(t, locale);
  const read = await readWeightWithheld();

  if (read.state === "forbidden") {
    return (
      <div className="nf-admin-stack">
        <PageHead title={c.title} lede={common.noAccessBody} />
        <PanelEmpty title={common.noAccessTitle} body={common.noAccessBody} />
      </div>
    );
  }

  const reasonLabels = c.reason as Record<string, string | undefined>;
  const kindLabels = c.kind as Record<string, string | undefined>;

  return (
    <div className="nf-admin-stack" data-testid="weight-withheld">
      <PageHead title={c.title} lede={c.lede} />
      {read.state === "ok" && (
        <ui.StatRow>
          <ui.Stat label={c.totalLabel} value={String(read.total)} hint={c.totalHint} />
          <ui.Stat label={c.reviewsLabel} value={String(read.rows.filter((r) => r.kind === "review").length)} />
          <ui.Stat label={c.reportsLabel} value={String(read.rows.filter((r) => r.kind === "report").length)} />
        </ui.StatRow>
      )}
      <Panel title={c.panel} id="weight-withheld-list" flush={read.state === "ok" && read.rows.length > 0}>
        {read.state !== "ok" ? (
          <PanelUnavailable what={c.panel} locale={locale} />
        ) : read.rows.length === 0 ? (
          <PanelEmpty title={c.emptyTitle} body={c.emptyBody} />
        ) : (
          <ul className="nf-rows nf-group" aria-label={c.panel}>
            {read.rows.map((row) => (
              <li key={`${row.kind}-${row.subjectId}`} className="nf-row flex-wrap items-start" data-testid="weight-row">
                <span className="min-w-[12rem] flex-1 basis-0">
                  <span className="nf-body block font-semibold text-content">
                    {kindLabels[row.kind] ?? row.kind}
                    {row.kind === "review" && row.rating !== null && row.listingTitle
                      ? `: ${fill(c.ratedOn, { rating: formatNumber(row.rating, locale), listing: row.listingTitle })}`
                      : row.kind === "report" && row.target
                        ? `: ${fill(c.reportAbout, { target: row.target })}`
                        : ""}
                  </span>
                  <span className="nf-caption block">
                    {row.gone ? c.unknownSubject : null}
                    {row.gone ? " · " : null}
                    <span className="font-mono">{row.subjectId.slice(0, 8)}</span>
                    {" · "}
                    {ui.when(row.stampedAt)}
                  </span>
                  <span className="mt-xs flex flex-wrap gap-xs">
                    {row.reasons.map((reason) => (
                      <ui.StatusChip key={reason} label={reasonLabels[reason] ?? reason} tone="warning" />
                    ))}
                  </span>
                </span>
                <ClearStamp kind={row.kind} subject={row.subjectId} copy={{ ...c, cancel: common.cancel }} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
