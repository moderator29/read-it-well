import { getDictionary, type Locale } from "@vallo/i18n";
import type { StoreRun } from "@/lib/store/run";
import { summarise, type CheckState } from "@/lib/store/readiness";
import { Badge, CalmNote, Panel, PanelLink, type BadgeTone } from "../_components/panels";

/**
 * THE STORE PANEL (V-52): every check a reviewer will run, green or red, each
 * with what it saw and the one thing to fix.
 *
 * The word on each badge carries the state as well as its tone (colour is
 * never the only signal): Ready, Fix, or Not run. A check that could not run
 * is "Not run" in the neutral tone and never green; the summary counts it
 * apart from the ready ones.
 *
 * The checks run when this tab is opened, against the origin the request came
 * in on. "Run the checks again" is a link to the same tab, so the answer is
 * always this minute's.
 */

const TONE: Record<CheckState, BadgeTone> = { pass: "success", fail: "error", unknown: "pending" };

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

export function StorePanel({ run, locale }: { run: StoreRun | null; locale: Locale }) {
  const c = getDictionary(locale).frontDoor.store;

  if (run === null) {
    return (
      <Panel id="ops-store" title={c.title}>
        <CalmNote kind="error" title={c.title} fills={c.unavailable} action={{ href: "/admin/operations?tab=store", label: c.rerun }} />
      </Panel>
    );
  }

  const counts = summarise(run.checks);
  const word: Record<CheckState, string> = { pass: c.pass, fail: c.fail, unknown: c.unknown };

  return (
    <Panel
      id="ops-store"
      title={c.title}
      action={<PanelLink href="/admin/operations?tab=store">{c.rerun}</PanelLink>}
    >
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{c.lede}</p>
      <p className="mt-inline nf-body font-semibold text-[var(--nf-content-primary)]" data-testid="store-summary">
        {fill(c.summary, { pass: counts.pass, total: run.checks.length })}
        {counts.fail > 0 && ` · ${fill(c.summaryRed, { fail: counts.fail })}`}
        {counts.unknown > 0 && ` · ${fill(c.summaryUnknown, { unknown: counts.unknown })}`}
      </p>
      <p className="mt-inline-tight nf-caption text-[var(--nf-content-muted)]">
        {fill(c.ran, { origin: run.origin })}
      </p>

      <ul className="mt-group flex flex-col gap-row" data-testid="store-checks">
        {run.checks.map((check) => (
          <li
            key={check.key}
            className="nf-admin-store-check"
            data-state={check.state}
            data-testid={`store-check-${check.key}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-sm">
              <span className="nf-body font-semibold text-[var(--nf-content-primary)]">
                {c.checks[check.key].title}
              </span>
              <Badge tone={TONE[check.state]}>{word[check.state]}</Badge>
            </div>
            <p className="mt-inline-tight nf-body-sm text-[var(--nf-content-secondary)]">{check.detail}</p>
            {check.fix && (
              <p className="mt-inline-tight nf-body-sm text-[var(--nf-content-primary)]">
                <span className="font-semibold">{c.fixLabel}: </span>
                {check.fix}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
