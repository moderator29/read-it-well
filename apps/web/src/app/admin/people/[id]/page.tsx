import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readPerson } from "@/lib/admin/person-queries";
import { adminUi } from "../../_components/ui";
import { UpholdControl } from "./UpholdControl";
import { ConsiderStr } from "../../_components/ConsiderStr";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Person file", robots: { index: false, follow: false } };
}

function when(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : formatDate(d, locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
}

const VIA: Record<string, string> = {
  device: "shares a device",
  mailbox: "shares a mailbox pattern",
  phone: "shares a phone number",
  payout: "shares a payout account",
  nin: "shares a NIN",
};

const LEDE =
  "One person across every desk: who they are, everything that happened, and the other accounts they share something with. Shared numbers are compared inside the database and never shown. Opening this file is recorded in the audit log.";

/**
 * /admin/people/[id]: V-90, THE PERSON FILE.
 *
 * Every fraud decision is a decision about a person, and until this page the
 * facts were spread over nine desks searched by name. The read is one definer
 * function that refuses anyone but staff and writes its own audit row, so the
 * rule that viewing a person's data is recorded (A2-036) holds however the
 * page is reached.
 */
export default async function PersonFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const ui = adminUi(getDictionary(locale), locale);
  const file = await readPerson(id);

  if (file.state !== "ready") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title="Person file" lede={LEDE} />
        {file.state === "failed" ? (
          <ui.QueueUnavailable />
        ) : (
          <p className="mt-row text-[var(--nf-content-secondary)]">No account has this id.</p>
        )}
      </div>
    );
  }

  const { person } = file;
  return (
    <div className="nf-console">
      <ui.QueueHeader title={person.name ?? "A person"} lede={LEDE} />
      {/* SCUML item 6: open an STR case about this person. */}
      <ConsiderStr from="person" id={id} />

      <section className="nf-panel nf-panel--card nf-admin-card p-card" aria-label="Who">
        <dl className="grid gap-xs text-[length:var(--nf-text-body-sm)] sm:grid-cols-2">
          {person.handle && (
            <div>
              <dt className="nf-caption text-[var(--nf-content-muted)]">Handle</dt>
              <dd>@{person.handle}</dd>
            </div>
          )}
          <div>
            <dt className="nf-caption text-[var(--nf-content-muted)]">Joined</dt>
            <dd>{when(person.joinedAt, locale)}</dd>
          </div>
          <div>
            <dt className="nf-caption text-[var(--nf-content-muted)]">Workspaces</dt>
            <dd>{person.roles.join(", ") || "member"}</dd>
          </div>
          {person.agent && (
            <div>
              <dt className="nf-caption text-[var(--nf-content-muted)]">As a lister</dt>
              <dd>
                {person.agent.name ?? "Agent"} · {ui.statusLabel(person.agent.status ?? "")} · verification tier {person.agent.tier}
              </dd>
            </div>
          )}
        </dl>
        {person.checks.length > 0 && (
          <ul className="mt-row space-y-inline-tight text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
            {person.checks.map((c, i) => (
              <li key={`${c.kind}-${i}`}>
                {c.kind}: {c.status}
                {c.decidedAt ? ` · ${when(c.decidedAt, locale)}` : ""}
              </li>
            ))}
          </ul>
        )}
        {person.stop && (
          <div className="mt-row border-t border-[var(--nf-divider)] pt-row" data-testid="person-stop">
            <p className="font-semibold text-[var(--nf-status-rejected)]">
              Stopped since {when(person.stop.since, locale)}
              {person.stop.fraudUpheldAt ? ` · upheld as fraud on ${when(person.stop.fraudUpheldAt, locale)}` : ""}
            </p>
            <p className="mt-inline-tight nf-body-sm text-[var(--nf-content-secondary)]">{person.stop.fraudNote ?? person.stop.reason}</p>
            {!person.stop.fraudUpheldAt && file.senior && <UpholdControl suspensionId={person.stop.id} userId={person.userId} />}
            {!person.stop.fraudUpheldAt && !file.senior && (
              <p className="mt-inline-tight nf-caption text-[var(--nf-content-muted)]">
                A senior reviewer can uphold this stop as fraud, which puts this person&apos;s identity keys on the deny-list.
              </p>
            )}
          </div>
        )}
      </section>

      {file.matches.length > 0 && (
        <section className="mt-section-tight nf-panel nf-panel--card nf-admin-card p-card" aria-label="Matches" data-testid="person-matches">
          <h2 className="nf-h4">Matches an upheld fraud stop</h2>
          <ul className="mt-row space-y-inline">
            {file.matches.map((m, i) => (
              <li key={i} className="nf-body-sm text-[var(--nf-status-rejected)]">
                The {m.kind === "nin" ? "NIN" : m.kind === "phone" ? "phone number" : "payout account"} {m.sentence}.
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-section-tight nf-panel nf-panel--card nf-admin-card p-card" aria-label="Linked accounts" data-testid="person-linked">
        <h2 className="nf-h4">Linked accounts</h2>
        {file.linked.length === 0 ? (
          <p className="mt-row nf-body-sm text-[var(--nf-content-muted)]">No other account shares a device, mailbox, phone or payout account.</p>
        ) : (
          <ul className="mt-row space-y-inline">
            {file.linked.map((l) => (
              <li key={`${l.userId}-${l.via}`} className="flex flex-wrap items-baseline gap-x-xs nf-body-sm">
                <Link href={`/admin/people/${l.userId}`} className="inline-flex min-h-11 items-center underline underline-offset-2">
                  {l.name}
                </Link>
                <span className="text-[var(--nf-content-secondary)]">{VIA[l.via]}</span>
                {l.stoppedOn && (
                  <span className="nf-caption text-[var(--nf-status-rejected)]">
                    stopped on {when(l.stoppedOn, locale)}
                    {l.fraudUpheld ? " for fraud" : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-section-tight nf-panel nf-panel--card nf-admin-card p-card" aria-label="Timeline" data-testid="person-timeline">
        <h2 className="nf-h4">Everything, newest first</h2>
        {file.timeline.length === 0 ? (
          <p className="mt-row nf-body-sm text-[var(--nf-content-muted)]">Nothing recorded yet.</p>
        ) : (
          <ol className="mt-row space-y-inline">
            {file.timeline.map((e, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-xs border-t border-[var(--nf-divider)] pt-inline nf-body-sm">
                <span className="nf-numeric nf-caption text-[var(--nf-content-muted)]">{when(e.at, locale)}</span>
                <span className="min-w-0 flex-1 break-words">{e.title}</span>
                <Link href={e.href} className="nf-caption inline-flex min-h-11 items-center text-[var(--nf-content-secondary)] underline underline-offset-2">
                  {e.desk}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
