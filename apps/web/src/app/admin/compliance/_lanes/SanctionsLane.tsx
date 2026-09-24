import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { requireAdmin } from "@/lib/admin/guard";
import { readSanctionsDesk, strHref, type SanctionsDesk } from "@/lib/compliance/sanctions/desk";
import { adminUi } from "../../_components/ui";
import { fill } from "../../_components/copy";
import type { ComplianceLane, ComplianceLaneProps } from "./lane";
import { SanctionsDecision, SanctionsUpload } from "./SanctionsControls";

/**
 * THE SANCTIONS LANE. SCUML items 8 and 9.
 *
 * Lists in force, the file upload, matches waiting on a two-person decision
 * (exact first), and the latest screenings. Read through the staff-only
 * `sanctions_desk()` under the operator's session. A failed read says the
 * check could not run; it never shows an empty queue.
 */

async function load(): Promise<SanctionsDesk> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "forbidden" };
  try {
    const { data, error } = await (access.supabase as unknown as {
      rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }>;
    }).rpc("sanctions_desk");
    return readSanctionsDesk(data, error);
  } catch {
    return { state: "unreadable" };
  }
}

async function SanctionsLaneView({ t, locale }: ComplianceLaneProps) {
  const c = t.compliance.sanctions;
  const ui = adminUi(t, locale);
  const desk = await load();
  if (desk.state !== "ok") {
    /* A failed read is a failure, never an empty queue: nothing here means clear. */
    return <ui.QueueUnavailable />;
  }
  const sourceName = (s: "un" | "ng") => (s === "un" ? c.sourceUn : c.sourceNg);

  return (
    <div className="nf-admin-stack">
      <p className="nf-body text-content-2">{c.lede}</p>

      <section className="nf-panel nf-panel--card nf-admin-card p-card">
        <h2 className="nf-h4">{c.lists}</h2>
        {desk.lists.length === 0 ? (
          <p className="nf-body mt-row" role="alert">{c.listNone}</p>
        ) : (
          <ul className="mt-row">
            {desk.lists.map((list) => (
              <li key={list.source} className="nf-body">
                {fill(c.listRow, { source: sourceName(list.source), when: ui.when(list.activatedAt), count: list.entries })}
              </li>
            ))}
          </ul>
        )}
        <SanctionsUpload copy={c} />
      </section>

      <section>
        <h2 className="nf-h4">{c.hitsTitle}</h2>
        {desk.hits.length === 0 ? (
          <ui.QueueEmpty title={c.hitsEmpty} body={c.hitsEmptyBody} everHadRows={desk.recent.length > 0} />
        ) : (
          <ul className="mt-row nf-admin-stack">
            {desk.hits.map((hit) => (
              <li key={hit.id} className="nf-panel nf-panel--card nf-admin-card p-card" data-testid="sanctions-hit">
                <p className="nf-body font-semibold text-content">
                  {hit.kind === "exact" ? c.exact : fill(c.fuzzy, { score: hit.score.toFixed(2) })}
                </p>
                <p className="nf-body mt-inline">{fill(c.screenedAs, { name: hit.screenedName })}</p>
                <p className="nf-body">
                  {fill(c.against, { name: hit.matchedName, reference: `${sourceName(hit.source)} ${hit.reference}` })}
                </p>
                <p className="nf-caption mt-inline">
                  {fill(c.why, { trigger: c.trigger[hit.trigger as keyof Dictionary["compliance"]["sanctions"]["trigger"]] ?? hit.trigger })}{" "}
                  · {ui.when(hit.createdAt)}
                </p>
                <SanctionsDecision copy={c} hit={hit} me={desk.me} />
                <p className="nf-caption mt-row">
                  <Link href={strHref(hit)} className="text-[var(--nf-content-link)] underline underline-offset-2">
                    {c.strOffer}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="nf-h4">{c.recentTitle}</h2>
        {desk.recent.length === 0 ? (
          <p className="nf-body mt-row">{c.recentEmpty}</p>
        ) : (
          <ul className="mt-row">
            {desk.recent.map((r) => (
              <li key={r.id} className="nf-body-sm">
                {ui.when(r.at)} · {c.outcome[r.outcome as keyof Dictionary["compliance"]["sanctions"]["outcome"]] ?? r.outcome} ·{" "}
                {c.trigger[r.trigger as keyof Dictionary["compliance"]["sanctions"]["trigger"]] ?? r.trigger}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export const sanctionsLane: ComplianceLane = {
  key: "sanctions",
  items: [8, 9],
  title: (t) => t.compliance.sanctions.tab,
  Lane: SanctionsLaneView,
};
