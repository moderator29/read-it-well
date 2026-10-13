import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { listBlockedTerms } from "@/lib/admin/blocked-terms-actions";
import { requireAdmin } from "@/lib/admin/guard";
import { BLOCKED_TERM_ACTIONS, BLOCKED_TERM_CATEGORIES, BLOCKED_TERM_SEVERITIES } from "@/lib/admin/blocked-terms-rules";
import { adminUi } from "../_components/ui";
import { fill } from "../_components/copy";
import { PageHead, Panel, PanelEmpty, PanelUnavailable } from "../_components/panels";
import { RetireTerm, TermForm } from "./TermForms";

export const metadata: Metadata = { title: "Blocked terms", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * AR-11: THE BLOCKED-TERMS LIST.
 *
 * Three database functions had no screen: read every term, put one, retire
 * one (`staff_blocked_terms`, `staff_blocked_term_put`,
 * `staff_blocked_term_retire`, migration 20261006024044). Each checks the
 * moderation scope on `auth.uid()` and the two writes audit in the same
 * transaction, so the page only ever asks as the signed-in person.
 */
export default async function BlockedTermsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const c = t.adminCoverage.blockedTerms;
  const common = t.adminCoverage.common;
  const ui = adminUi(t, locale);

  const access = await requireAdmin("moderation");
  if (access.state !== "admin") {
    return (
      <div className="nf-admin-stack">
        <PageHead title={c.title} lede={common.noAccessBody} />
        <PanelEmpty title={common.noAccessTitle} body={common.noAccessBody} />
      </div>
    );
  }

  const read = await listBlockedTerms();
  const terms = read.ok ? read.data : [];
  const live = terms.filter((term) => !term.retired_at);
  const retired = terms.filter((term) => term.retired_at);
  const count = (action: string) => live.filter((term) => term.action === action).length;
  const categoryNames = c.category as Record<string, string | undefined>;
  const actionNames = c.action as Record<string, string | undefined>;
  const severityNames = c.severity as Record<string, string | undefined>;

  return (
    <div className="nf-admin-stack" data-testid="blocked-terms">
      <PageHead title={c.title} lede={c.lede} />
      {read.ok && (
        <ui.StatRow>
          <ui.Stat label={c.liveLabel} value={String(live.length)} hint={`${c.holdLabel} ${count("hold")} · ${c.flagLabel} ${count("flag")} · ${c.refuseLabel} ${count("refuse")}`} />
          <ui.Stat label={c.retiredLabel} value={String(retired.length)} />
        </ui.StatRow>
      )}

      <Panel title={c.addTitle} id="blocked-add">
        <p className="nf-body-sm mb-row max-w-[68ch] text-content-2">{c.addBody}</p>
        <TermForm
          copy={c}
          categories={BLOCKED_TERM_CATEGORIES.map((value) => ({ value, label: categoryNames[value] ?? value }))}
          actions={BLOCKED_TERM_ACTIONS.map((value) => ({ value, label: actionNames[value] ?? value }))}
          severities={BLOCKED_TERM_SEVERITIES.map((value) => ({ value, label: severityNames[value] ?? value }))}
        />
      </Panel>

      <Panel title={c.livePanel} id="blocked-live" flush={read.ok && live.length > 0}>
        {!read.ok ? (
          <PanelUnavailable what={c.livePanel} locale={locale} />
        ) : live.length === 0 ? (
          <PanelEmpty title={c.emptyTitle} body={c.emptyBody} />
        ) : (
          <ul className="nf-rows nf-group" aria-label={c.livePanel}>
            {live.map((term) => (
              <li key={term.term} className="nf-row flex-wrap items-start" data-testid="blocked-term">
                <span className="min-w-[12rem] flex-1 basis-0">
                  <span className="nf-body block font-semibold text-content">{term.term}</span>
                  <span className="nf-caption block">
                    {categoryNames[term.category] ?? term.category} · {actionNames[term.action] ?? term.action} ·{" "}
                    {severityNames[term.severity] ?? term.severity} · {fill(c.addedOn, { when: ui.day(term.created_at) })}
                  </span>
                  <span className="nf-body-sm block text-content-2">{term.reason}</span>
                </span>
                <ui.StatusChip label={actionNames[term.action] ?? term.action} tone={term.action === "refuse" ? "danger" : term.action === "hold" ? "warning" : "info"} />
                <RetireTerm term={term.term} copy={{ ...c, cancel: common.cancel }} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {read.ok && (
        <Panel title={c.retiredPanel} id="blocked-retired" flush={retired.length > 0}>
          {retired.length === 0 ? (
            <p className="nf-body-sm text-content-2">{c.emptyRetired}</p>
          ) : (
            <ul className="nf-rows nf-group" aria-label={c.retiredPanel}>
              {retired.map((term) => (
                <li key={`${term.term}-${term.retired_at}`} className="nf-row flex-wrap items-start">
                  <span className="min-w-[12rem] flex-1 basis-0">
                    <span className="nf-body block font-semibold text-content-2">{term.term}</span>
                    <span className="nf-caption block">
                      {fill(c.retiredOn, { when: ui.day(term.retired_at) })}
                      {term.retired_reason ? ` · ${term.retired_reason}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
