import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { requireAdmin } from "@/lib/admin/guard";
import { readSanctionsDesk, strHref, type SanctionsDesk, type SanctionsHit } from "@/lib/compliance/sanctions/desk";
import { adminUi } from "../../_components/ui";
import { fill } from "../../_components/copy";
import type { ComplianceLane, ComplianceLaneProps } from "./lane";
import { SanctionsActivate, SanctionsDecision, SanctionsUpload } from "./SanctionsControls";

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
  /* A close match on common names only is still a hit, in its own lower group. */
  const openHits = desk.hits.filter((hit) => hit.status === "open" && !hit.commonName);
  const commonHits = desk.hits.filter((hit) => hit.status === "open" && hit.commonName);
  const confirmedHits = desk.hits.filter((hit) => hit.status === "confirmed");

  const openHit = (hit: SanctionsHit) => (
    <li key={hit.id} className="nf-panel nf-panel--card nf-admin-card p-card" data-testid="sanctions-hit">
      <p className="nf-body font-semibold text-content">
        {hit.kind === "exact" ? c.exact : fill(c.fuzzy, { score: hit.score.toFixed(2) })}
      </p>
      <p className="nf-body mt-inline">{fill(c.screenedAs, { name: hit.screenedName })}</p>
      <p className="nf-body">
        {fill(c.against, { name: hit.matchedName, reference: `${sourceName(hit.source)} ${hit.reference}` })}
      </p>
      <ListingFacts hit={hit} c={c} />
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
  );

  return (
    <div className="nf-admin-stack">
      <p className="nf-body text-content-2">{c.lede}</p>
      <p className="nf-caption">{c.scope}</p>

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
        {desk.waitingLists.length > 0 && (
          <div className="mt-group">
            <h3 className="nf-overline">{c.waitingTitle}</h3>
            <ul className="mt-inline">
              {desk.waitingLists.map((list) => (
                <li key={list.id} className="mt-row" data-testid="sanctions-waiting-list">
                  <p className="nf-body">{fill(c.waitingRow, { source: sourceName(list.source), count: list.entries, when: ui.when(list.loadedAt) })}</p>
                  {list.previousEntries !== null && list.entries < 0.9 * list.previousEntries && (
                    <p className="nf-caption" role="alert">{fill(c.shrunk, { previous: list.previousEntries })}</p>
                  )}
                  <SanctionsActivate copy={c} list={list} me={desk.me} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <SanctionsUpload copy={c} />
      </section>

      <section>
        <h2 className="nf-h4">{c.hitsTitle}</h2>
        {openHits.length === 0 && commonHits.length > 0 ? null : openHits.length === 0 ? (
          <ui.QueueEmpty title={c.hitsEmpty} body={c.hitsEmptyBody} everHadRows={desk.recent.length > 0} />
        ) : (
          <ul className="mt-row nf-admin-stack">
            {openHits.map(openHit)}
          </ul>
        )}
      </section>

      {commonHits.length > 0 && (
        <section data-testid="sanctions-common-group">
          <h2 className="nf-h4">{c.commonTitle}</h2>
          <p className="nf-caption">{c.commonLede}</p>
          <ul className="mt-row nf-admin-stack">{commonHits.map(openHit)}</ul>
        </section>
      )}

      {confirmedHits.length > 0 && (
        <section>
          <h2 className="nf-h4">{c.confirmedTitle}</h2>
          <ul className="mt-row nf-admin-stack">
            {confirmedHits.map((hit) => (
              <li key={hit.id} className="nf-panel nf-panel--card nf-admin-card p-card" data-testid="sanctions-confirmed">
                <p className="nf-body">{fill(c.screenedAs, { name: hit.screenedName })}</p>
                <p className="nf-body">
                  {fill(c.against, { name: hit.matchedName, reference: `${sourceName(hit.source)} ${hit.reference}` })}
                </p>
                <p className="nf-caption" role="status">
                  {hit.moneyHeld ? c.moneyHeld : c.moneyNotHeld}
                </p>
                {hit.claims.length === 0 ? (
                  <p className="nf-caption">{c.claimNone}</p>
                ) : (
                  <ul className="nf-caption">
                    {hit.claims.map((claim) => (
                      <li key={claim.owner}>
                        {fill(c.claimRow, {
                          owner: c.claimOwner[claim.owner as keyof Dictionary["compliance"]["sanctions"]["claimOwner"]] ?? claim.owner,
                          until: ui.when(claim.until),
                        })}
                      </li>
                    ))}
                  </ul>
                )}
                {hit.delisted && (
                  <p className="nf-caption" role="alert">
                    {c.delisted}
                  </p>
                )}
                <SanctionsDecision copy={c} hit={hit} me={desk.me} />
              </li>
            ))}
          </ul>
        </section>
      )}

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

/** What the list itself says about the listed person, to check against what we hold. */
function ListingFacts({ hit, c }: { hit: SanctionsHit; c: Dictionary["compliance"]["sanctions"] }) {
  if (hit.datesOfBirth.length === 0 && hit.nationalities.length === 0) return <p className="nf-caption mt-inline">{c.listedNone}</p>;
  return (
    <>
      {hit.datesOfBirth.length > 0 && <p className="nf-caption mt-inline">{fill(c.listedDob, { value: hit.datesOfBirth.join(", ") })}</p>}
      {hit.nationalities.length > 0 && <p className="nf-caption">{fill(c.listedNationality, { value: hit.nationalities.join(", ") })}</p>}
    </>
  );
}

export const sanctionsLane: ComplianceLane = {
  key: "sanctions",
  items: [8, 9],
  title: (t) => t.compliance.sanctions.tab,
  Lane: SanctionsLaneView,
};
